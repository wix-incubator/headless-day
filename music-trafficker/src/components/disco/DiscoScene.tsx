import * as THREE from "three";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  Sparkles,
} from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import type { VideoItem } from "./types";
import {
  buildMotionAtlas,
  makeMotionPresentation,
  makeStoryboardPresentation,
  makeThumbPresentation,
  type TilePresentation,
} from "./presentations";

export interface SceneApi {
  flyBack: () => void;
}

interface DiscoSceneProps {
  videos: VideoItem[];
  interactive: boolean;
  apiRef: React.MutableRefObject<SceneApi | null>;
  onTakeoff: (video: VideoItem) => void;
  onArrived: () => void;
  onLanded: () => void;
}

import { CROP_REPEAT_X, THUMB_ASPECT, WINDOW_H, WINDOW_W } from "./presentations";

const BALL_RADIUS = 2;
const SPIN_SPEED = 0.14;
const FLY_OUT_SECONDS = 1.05;
const FLY_BACK_SECONDS = 0.8;
const FLYER_DISTANCE = 1.25;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sphericalPos(latDeg: number, lonDeg: number, radius: number) {
  const lat = THREE.MathUtils.degToRad(latDeg);
  const lon = THREE.MathUtils.degToRad(lonDeg);
  const c = radius * Math.cos(lat);
  return new THREE.Vector3(
    c * Math.sin(lon),
    radius * Math.sin(lat),
    c * Math.cos(lon),
  );
}

interface WindowSlot {
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  videoIndex: number;
}

function buildWindowSlots(videoCount: number): WindowSlot[] {
  const rng = mulberry32(1337);
  const dummy = new THREE.Object3D();
  const slots: Omit<WindowSlot, "videoIndex">[] = [];
  const bands = [-48, -32, -16, 0, 16, 32, 48];
  for (const lat of bands) {
    const count = Math.max(
      6,
      Math.round(14 * Math.cos(THREE.MathUtils.degToRad(lat))),
    );
    const stagger = rng() * 360;
    for (let i = 0; i < count; i++) {
      const lon = (i / count) * 360 + stagger;
      const position = sphericalPos(lat, lon, BALL_RADIUS + 0.03);
      dummy.position.copy(position);
      dummy.lookAt(0, 0, 0);
      dummy.rotateY(Math.PI); // flip the plane's +Z to point outward
      slots.push({ position, quaternion: dummy.quaternion.clone() });
    }
  }
  // Shuffle, then deal videos round-robin so each video appears 2-3 times,
  // scattered around the ball.
  const shuffled = [...slots];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((slot, i) => ({
    ...slot,
    videoIndex: videoCount > 0 ? i % videoCount : 0,
  }));
}

function buildMirrorMatrices(windowSlots: WindowSlot[]): THREE.Matrix4[] {
  const rng = mulberry32(4242);
  const dummy = new THREE.Object3D();
  const matrices: THREE.Matrix4[] = [];
  const tile = 0.21;
  for (let lat = -84; lat <= 84; lat += 6) {
    const circumference =
      2 * Math.PI * BALL_RADIUS * Math.cos(THREE.MathUtils.degToRad(lat));
    const count = Math.max(4, Math.round(circumference / (tile * 1.12)));
    const stagger = rng() * 360;
    for (let i = 0; i < count; i++) {
      const lon = (i / count) * 360 + stagger;
      // Keep every mirror (center + tilted corners) strictly below the video
      // windows (R+0.03) and their backing faces (R-0.01 + half depth), so no
      // facet can ever poke through a video tile.
      const jitter = 0.9875 + rng() * 0.0075;
      dummy.position.copy(sphericalPos(lat, lon, BALL_RADIUS * jitter));
      dummy.lookAt(0, 0, 0);
      dummy.rotateY(Math.PI);
      dummy.rotateZ((rng() - 0.5) * 0.12);
      dummy.rotateX((rng() - 0.5) * 0.08);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      matrices.push(dummy.matrix.clone());
    }
  }
  return matrices;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const TIER_RANK = { thumb: 0, storyboard: 1, motion: 2 } as const;

interface FlightState {
  mode: "idle" | "out" | "hold" | "back";
  t: number;
  video: VideoItem | null;
  fromPos: THREE.Vector3;
  fromQuat: THREE.Quaternion;
}

function VideoWindow({
  slot,
  video,
  material,
  hidden,
  onActivate,
}: {
  slot: WindowSlot;
  video: VideoItem;
  material: THREE.Material;
  hidden: boolean;
  onActivate: (video: VideoItem, mesh: THREE.Mesh) => void;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const hover = useRef(0);

  // The material is shared by every window of the same video. Assign it
  // imperatively: mounting one object through multiple <primitive> elements
  // corrupts R3F's attach bookkeeping and leaves some windows on a stale
  // material.
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (mesh) mesh.material = material;
  }, [material]);

  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const target = hover.current;
    const current = (mesh.userData.h as number) ?? 0;
    const next = THREE.MathUtils.damp(current, target, 10, delta);
    mesh.userData.h = next;
    const s = 1 + next * 0.09;
    mesh.scale.set(WINDOW_W * s, WINDOW_H * s, 1);
  });

  return (
    <mesh
      ref={ref}
      visible={!hidden}
      position={slot.position}
      quaternion={slot.quaternion}
      scale={[WINDOW_W, WINDOW_H, 1]}
      onClick={(e) => {
        e.stopPropagation();
        if (ref.current) onActivate(video, ref.current);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        hover.current = 1;
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        hover.current = 0;
        document.body.style.cursor = "auto";
      }}
    >
      <planeGeometry args={[1, 1]} />
    </mesh>
  );
}

export default function DiscoScene({
  videos,
  interactive,
  apiRef,
  onTakeoff,
  onArrived,
  onLanded,
}: DiscoSceneProps) {
  const spinRef = useRef<THREE.Group>(null);
  const bobRef = useRef<THREE.Group>(null);
  const flyerRef = useRef<THREE.Mesh>(null);
  const mirrorsRef = useRef<THREE.InstancedMesh>(null);
  const backingRef = useRef<THREE.InstancedMesh>(null);
  const spot1 = useRef<THREE.SpotLight>(null);
  const spot2 = useRef<THREE.SpotLight>(null);
  const spot3 = useRef<THREE.SpotLight>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const fillRef = useRef<THREE.PointLight>(null);
  const speedRef = useRef(SPIN_SPEED);
  const introRef = useRef(0);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;

  const flight = useRef<FlightState>({
    mode: "idle",
    t: 0,
    video: null,
    fromPos: new THREE.Vector3(),
    fromQuat: new THREE.Quaternion(),
  });
  const activeWindowRef = useRef<THREE.Mesh | null>(null);
  const hiResRequestRef = useRef<string | null>(null);

  // Textures are managed imperatively (not via useLoader/Suspense) so the
  // video list can be hot-swapped by the feed poller without unmounting the
  // scene: existing textures stay live while new ones stream in.
  const thumbsRef = useRef(
    new Map<string, { base: THREE.Texture; cropped: THREE.Texture }>(),
  );
  const presentationsRef = useRef(new Map<string, TilePresentation>());
  const loadingRef = useRef(new Set<string>());
  const [, setTextureVersion] = useState(0);
  const bumpTextures = () => setTextureVersion((v) => v + 1);

  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const wanted = new Set(videos.map((v) => v.id));

    // Drop resources of videos that left the feed.
    for (const [id, entry] of thumbsRef.current) {
      if (!wanted.has(id)) {
        entry.base.dispose();
        entry.cropped.dispose();
        thumbsRef.current.delete(id);
      }
    }
    for (const [id, pres] of presentationsRef.current) {
      if (!wanted.has(id)) {
        pres.dispose();
        presentationsRef.current.delete(id);
      }
    }

    const setPresentation = (id: string, next: TilePresentation) => {
      const current = presentationsRef.current.get(id);
      if (current && TIER_RANK[current.tier] >= TIER_RANK[next.tier]) {
        next.dispose();
        return;
      }
      current?.dispose();
      presentationsRef.current.set(id, next);
      bumpTextures();
    };

    const upgradeToStoryboard = (video: VideoItem) => {
      const sb = video.storyboard;
      const key = `sb:${video.id}`;
      const current = presentationsRef.current.get(video.id);
      if (!sb || loadingRef.current.has(key)) return;
      if (current && TIER_RANK[current.tier] >= TIER_RANK.storyboard) return;
      loadingRef.current.add(key);
      loader.load(
        `/api/storyboard-image?v=${video.id}`,
        (tex) => {
          loadingRef.current.delete(key);
          tex.colorSpace = THREE.SRGBColorSpace;
          // No mipmaps: atlas cells would bleed into each other at glancing angles.
          tex.generateMipmaps = false;
          tex.minFilter = THREE.LinearFilter;
          setPresentation(video.id, makeStoryboardPresentation(tex, sb));
        },
        undefined,
        () => loadingRef.current.delete(key),
      );
    };

    const upgradeToMotion = async (video: VideoItem) => {
      const key = `motion:${video.id}`;
      if (loadingRef.current.has(key)) return;
      const current = presentationsRef.current.get(video.id);
      if (current && TIER_RANK[current.tier] >= TIER_RANK.motion) return;
      loadingRef.current.add(key);
      const atlas = await buildMotionAtlas(video.id);
      loadingRef.current.delete(key);
      if (atlas) {
        setPresentation(video.id, makeMotionPresentation(atlas.grid, atlas.fps));
      } else {
        loadingRef.current.add(key); // don't retry a failed/unsupported build
        upgradeToStoryboard(video);
      }
    };

    for (const video of videos) {
      // Static thumbnail (initial window look + flyer source).
      const thumbKey = `thumb:${video.id}`;
      if (!thumbsRef.current.has(video.id) && !loadingRef.current.has(thumbKey)) {
        loadingRef.current.add(thumbKey);
        loader.load(
          `https://i.ytimg.com/vi/${video.id}/mqdefault.jpg`,
          (base) => {
            loadingRef.current.delete(thumbKey);
            base.colorSpace = THREE.SRGBColorSpace;
            base.anisotropy = 4;
            const cropped = base.clone();
            cropped.repeat.set(CROP_REPEAT_X, 1);
            cropped.offset.set((1 - CROP_REPEAT_X) / 2, 0);
            cropped.needsUpdate = true;
            thumbsRef.current.set(video.id, { base, cropped });
            if (!presentationsRef.current.has(video.id)) {
              presentationsRef.current.set(
                video.id,
                makeThumbPresentation(cropped),
              );
            }
            bumpTextures();
          },
          undefined,
          () => loadingRef.current.delete(thumbKey),
        );
      }

      // Upgrade path: real-motion preview where available, else crossfading
      // storyboard frames.
      if (video.motionPreview) upgradeToMotion(video);
      else upgradeToStoryboard(video);
    }
  }, [videos]);

  useEffect(
    () => () => {
      for (const entry of thumbsRef.current.values()) {
        entry.base.dispose();
        entry.cropped.dispose();
      }
      for (const pres of presentationsRef.current.values()) pres.dispose();
      thumbsRef.current.clear();
      presentationsRef.current.clear();
    },
    [],
  );

  // The flyer gets a fresh texture object per flight (and per hi-res upgrade):
  // resizing an already-uploaded texture's image in place triggers GL errors.
  const flyerMatRef = useRef<THREE.MeshBasicMaterial>(null);
  const flyerTexRef = useRef<THREE.Texture | null>(null);
  const setFlyerTexture = (tex: THREE.Texture) => {
    const old = flyerTexRef.current;
    flyerTexRef.current = tex;
    const mat = flyerMatRef.current;
    if (mat) {
      mat.map = tex;
      mat.needsUpdate = true;
    }
    if (old && old !== tex) old.dispose();
  };

  const windowSlots = useMemo(
    () => buildWindowSlots(videos.length),
    [videos.length],
  );
  const mirrorMatrices = useMemo(
    () => buildMirrorMatrices(windowSlots),
    [windowSlots],
  );

  useEffect(() => {
    const mirrors = mirrorsRef.current;
    if (!mirrors) return;
    mirrorMatrices.forEach((m, i) => mirrors.setMatrixAt(i, m));
    mirrors.instanceMatrix.needsUpdate = true;
  }, [mirrorMatrices]);

  useEffect(() => {
    const backing = backingRef.current;
    if (!backing) return;
    const dummy = new THREE.Object3D();
    windowSlots.forEach((slot, i) => {
      // Keep the backing's front face just below the window plane.
      dummy.position.copy(slot.position).setLength(BALL_RADIUS - 0.01);
      dummy.quaternion.copy(slot.quaternion);
      dummy.updateMatrix();
      backing.setMatrixAt(i, dummy.matrix);
    });
    backing.instanceMatrix.needsUpdate = true;
  }, [windowSlots]);

  const startFlight = (video: VideoItem, mesh: THREE.Mesh) => {
    if (flight.current.mode !== "idle") return;
    const f = flight.current;
    mesh.getWorldPosition(f.fromPos);
    mesh.getWorldQuaternion(f.fromQuat);
    f.video = video;
    f.t = 0;
    f.mode = "out";
    activeWindowRef.current = mesh;

    const base = thumbsRef.current.get(video.id)?.base;
    if (base) {
      const tex = base.clone();
      tex.needsUpdate = true;
      setFlyerTexture(tex);
    }
    // Upgrade the flyer to a hi-res thumbnail if one exists.
    hiResRequestRef.current = video.id;
    new THREE.TextureLoader().load(
      `https://i.ytimg.com/vi/${video.id}/maxresdefault.jpg`,
      (hi) => {
        if (hiResRequestRef.current !== video.id) return;
        if ((hi.image?.width ?? 0) < 320) return; // 120x90 gray placeholder
        hi.colorSpace = THREE.SRGBColorSpace;
        setFlyerTexture(hi);
      },
    );
    onTakeoff(video);
  };

  useEffect(() => {
    apiRef.current = {
      flyBack: () => {
        if (flight.current.mode === "hold" || flight.current.mode === "out") {
          flight.current.mode = "back";
          flight.current.t = 0;
        }
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  const scratch = useMemo(
    () => ({
      dir: new THREE.Vector3(),
      targetPos: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      quat: new THREE.Quaternion(),
      scale: new THREE.Vector3(),
      fromScale: new THREE.Vector3(WINDOW_W, WINDOW_H, 1),
    }),
    [],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const f = flight.current;

    // Ball spin — eases to a stop when a video takes off.
    const targetSpeed = f.mode === "idle" ? SPIN_SPEED : 0;
    speedRef.current = THREE.MathUtils.damp(
      speedRef.current,
      targetSpeed,
      3,
      delta,
    );
    if (spinRef.current) spinRef.current.rotation.y += speedRef.current * delta;
    if (bobRef.current) bobRef.current.position.y = Math.sin(t * 0.6) * 0.05;

    // Intro dolly + responsive framing: keep the whole ball in view on any aspect.
    introRef.current = Math.min(1, introRef.current + delta / 1.9);
    const aspect = state.size.width / state.size.height;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const fitZ = Math.max(6.0, (BALL_RADIUS * 1.18) / (Math.tan(halfFov) * aspect));
    const introZ = THREE.MathUtils.lerp(
      fitZ + 4.5,
      fitZ,
      easeInOutCubic(introRef.current),
    );
    const currentLen = camera.position.length();
    if (!Number.isFinite(currentLen) || currentLen < 3.2 || currentLen > 80) {
      // Self-heal: a resize/interaction race left the camera in a bad spot
      // (inside the ball, absurdly far, or NaN) — snap back to a sane pose.
      camera.up.set(0, 1, 0);
      camera.position.set(0, 0.15, fitZ);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.setLength(
        THREE.MathUtils.damp(currentLen, introZ, 4, delta),
      );
    }
    if (camera.aspect !== aspect) {
      // R3F updates this on resize, but guard against a missed event.
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }

    // Narrow viewports push the camera far out, which reads dim (smaller
    // bloom footprint, lights fixed near the ball) — compensate with exposure
    // and fill light proportional to the extra distance.
    const farFactor = THREE.MathUtils.clamp((fitZ - 6) / 8, 0, 1);
    state.gl.toneMappingExposure = 1 + farFactor * 0.4;
    if (ambientRef.current) ambientRef.current.intensity = 0.15 + farFactor * 0.25;
    if (fillRef.current) fillRef.current.intensity = 0.4 + farFactor * 0.5;

    // Advance every tile's preview (real motion or crossfading storyboard).
    for (const pres of presentationsRef.current.values()) pres.update(delta);

    // Orbiting club lights.
    spot1.current?.position.set(Math.cos(t * 0.45) * 7, 4, Math.sin(t * 0.45) * 7);
    spot2.current?.position.set(Math.cos(-t * 0.6 + 2) * 7, -3, Math.sin(-t * 0.6 + 2) * 7);
    spot3.current?.position.set(Math.cos(t * 0.3 + 4) * 6, 1.5, Math.sin(t * 0.3 + 4) * 6);

    // Flight animation (time-based, framerate-independent).
    const flyer = flyerRef.current;
    if (!flyer) return;
    if (f.mode === "idle") {
      flyer.visible = false;
      return;
    }
    flyer.visible = true;

    const duration = f.mode === "back" ? FLY_BACK_SECONDS : FLY_OUT_SECONDS;
    if (f.mode === "out" || f.mode === "back") {
      f.t = Math.min(1, f.t + delta / duration);
    }
    const raw = f.mode === "back" ? 1 - f.t : f.mode === "hold" ? 1 : f.t;
    const k = easeInOutCubic(raw);

    // Target: a 16:9 rect "fit" inside the viewport, facing the camera —
    // it matches the frame the fullscreen player letterboxes the video into.
    camera.getWorldDirection(scratch.dir);
    scratch.targetPos
      .copy(camera.position)
      .addScaledVector(scratch.dir, FLYER_DISTANCE);
    const visH = 2 * FLYER_DISTANCE * Math.tan(halfFov);
    const visW = visH * aspect;
    const fitW = Math.min(visW, visH * THUMB_ASPECT) * 0.995;

    flyer.position.lerpVectors(f.fromPos, scratch.targetPos, k);
    flyer.quaternion.slerpQuaternions(f.fromQuat, camera.quaternion, k);
    flyer.scale.set(
      THREE.MathUtils.lerp(WINDOW_W, fitW, k),
      THREE.MathUtils.lerp(WINDOW_H, fitW / THUMB_ASPECT, k),
      1,
    );
    // Un-crop the thumbnail as it flies out (window crop -> full 16:9 frame).
    const flyerTex = flyerTexRef.current;
    if (flyerTex) {
      const repeatX = THREE.MathUtils.lerp(CROP_REPEAT_X, 1, k);
      flyerTex.repeat.set(repeatX, 1);
      flyerTex.offset.set((1 - repeatX) / 2, 0);
    }

    if (f.t >= 1 && f.mode === "out") {
      f.mode = "hold";
      onArrived();
    } else if (f.t >= 1 && f.mode === "back") {
      f.mode = "idle";
      f.video = null;
      flyer.visible = false;
      activeWindowRef.current = null;
      hiResRequestRef.current = null;
      onLanded();
    }
  });

  const spotTarget = useMemo(() => new THREE.Object3D(), []);

  return (
    <>
      <color attach="background" args={["#070310"]} />
      <fog attach="fog" args={["#070310", 9, 20]} />
      <ambientLight ref={ambientRef} intensity={0.15} />
      <pointLight ref={fillRef} position={[0, 1, 6]} intensity={0.4} decay={0} color="#8fb0ff" />
      <primitive object={spotTarget} position={[0, 0, 0]} />
      <spotLight ref={spot1} color="#ff2d95" intensity={5} angle={0.5} penumbra={0.7} decay={0} target={spotTarget} />
      <spotLight ref={spot2} color="#2da8ff" intensity={4.5} angle={0.5} penumbra={0.7} decay={0} target={spotTarget} />
      <spotLight ref={spot3} color="#b26bff" intensity={4} angle={0.55} penumbra={0.8} decay={0} target={spotTarget} />

      <group ref={bobRef}>
        {/* suspension rod */}
        <mesh position={[0, BALL_RADIUS + 2, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.022, 0.022, 4, 8]} />
          <meshStandardMaterial color="#1a1a24" metalness={0.9} roughness={0.35} />
        </mesh>
        <mesh position={[0, BALL_RADIUS + 0.02, 0]} raycast={() => null}>
          <sphereGeometry args={[0.09, 16, 12]} />
          <meshStandardMaterial color="#2a2a38" metalness={0.95} roughness={0.25} />
        </mesh>

        <group ref={spinRef}>
          {/* dark core so gaps between tiles read as depth, not holes */}
          <mesh raycast={() => null}>
            <sphereGeometry args={[BALL_RADIUS * 0.985, 48, 32]} />
            <meshStandardMaterial color="#0b0b14" metalness={0.4} roughness={0.7} />
          </mesh>
          <instancedMesh
            ref={mirrorsRef}
            args={[undefined, undefined, mirrorMatrices.length]}
            raycast={() => null}
          >
            <boxGeometry args={[0.185, 0.185, 0.022]} />
            <meshStandardMaterial
              color="#cdd5e8"
              metalness={1}
              roughness={0.08}
              envMapIntensity={1.7}
            />
          </instancedMesh>
          <instancedMesh
            ref={backingRef}
            args={[undefined, undefined, windowSlots.length]}
            raycast={() => null}
          >
            <boxGeometry args={[WINDOW_W + 0.05, WINDOW_H + 0.05, 0.04]} />
            <meshStandardMaterial color="#05050c" metalness={0.6} roughness={0.5} />
          </instancedMesh>
          {windowSlots.map((slot, i) => {
            const video = videos[slot.videoIndex];
            if (!video) return null;
            const material = presentationsRef.current.get(video.id)?.material;
            if (!material) return null;
            return (
              <VideoWindow
                key={i}
                slot={slot}
                video={video}
                material={material}
                hidden={false}
                onActivate={startFlight}
              />
            );
          })}
        </group>
      </group>

      {/* the tile that flies out to fullscreen */}
      <mesh ref={flyerRef} visible={false} renderOrder={10} raycast={() => null}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={flyerMatRef} />
      </mesh>

      <Sparkles
        count={240}
        scale={[15, 9, 10]}
        size={2.4}
        speed={0.35}
        opacity={0.5}
        color="#9fc4ff"
      />
      <Sparkles
        count={130}
        scale={[10, 7, 8]}
        size={3.2}
        speed={0.2}
        opacity={0.35}
        color="#ff9fd0"
      />

      <Environment resolution={128}>
        <Lightformer intensity={5} color="#ff4fa8" position={[4, 2, 4]} scale={[2, 5, 1]} />
        <Lightformer intensity={5} color="#3fa8ff" position={[-4, -1, 3]} scale={[2, 5, 1]} />
        <Lightformer intensity={4} color="#9b5bff" position={[0, 4, -4]} scale={[5, 2, 1]} />
        <Lightformer intensity={2.5} color="#ffffff" position={[0, 6, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[3, 3, 1]} />
        <Lightformer intensity={3} color="#ff8f3f" position={[3, -4, -2]} scale={[2, 2, 1]} />
      </Environment>

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.45}
        enableDamping
        dampingFactor={0.08}
        enabled={interactive}
        minPolarAngle={0.7}
        maxPolarAngle={Math.PI - 0.7}
      />

      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={0.75} luminanceThreshold={0.6} luminanceSmoothing={0.25} />
        <Vignette eskil={false} offset={0.18} darkness={0.82} />
      </EffectComposer>
    </>
  );
}
