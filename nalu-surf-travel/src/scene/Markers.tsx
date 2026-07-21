import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Quaternion, type BufferAttribute, type Group, type Mesh, type MeshBasicMaterial } from 'three';
import { DESTINATIONS, type Destination } from '../data/destinations';
import { VIGNETTES } from '../data/vignettes';
import { useGame } from '../game/store';
import { latLngToVec3 } from './geo';
import { getToonGradientMap } from './toonGradient';
import { easeOutQuad, easeInOutSine } from './ease';
import { heightAt } from './terrain';
import { createFlagTexture } from './flags';

const INK = '#14353E';

// Per-destination surfboard pin colors (art-direction §5a table).
const PIN_COLORS: Record<string, { board: string; stripe: string }> = {
  oahu: { board: '#FF7E6B', stripe: '#FFFDF7' },
  bali: { board: '#FFD166', stripe: '#14353E' },
  ericeira: { board: '#7FC9DC', stripe: '#FFFDF7' },
  taghazout: { board: '#F2D8A7', stripe: '#E85F4C' },
  nosara: { board: '#8ED081', stripe: '#FFFDF7' },
  jbay: { board: '#FFFDF7', stripe: '#14353E' },
};

const RING_PERIOD_S = 1.4;
const BOB_HZ = 1.2;

/** A destination's surfboard pin (art-direction §5a): planted nose-up in the sand along
 * the surface normal, with a per-destination handmade off-normal tilt (direction cycles
 * by `index * 2.4rad` around the normal so no two pins lean the same way). The active
 * pin bobs and pulses a sand ring in place of the old yellow head-swell highlight. */
function SurfboardPin({ destId, index, active, animate }: { destId: string; index: number; active: boolean; animate: boolean }) {
  const bobRef = useRef<Group>(null);
  const ringRef = useRef<Mesh>(null);
  const clock = useRef((index * 1.7) % RING_PERIOD_S); // desync each pin's loop phase

  const colors = PIN_COLORS[destId] ?? PIN_COLORS.oahu;
  const leanDirection = index * 2.4; // rad, around the surface normal
  const leanMagnitude = ((6 + (index % 4) * 1.3) * Math.PI) / 180; // 6-10deg, varies per pin

  useFrame((_, dt) => {
    clock.current += dt;
    if (bobRef.current) {
      bobRef.current.position.z = active && animate
        ? -0.015 + Math.sin(clock.current * 2 * Math.PI * BOB_HZ) * 0.008
        : -0.015;
    }
    if (ringRef.current) {
      const mat = ringRef.current.material as MeshBasicMaterial;
      if (!active) {
        ringRef.current.visible = false;
      } else if (!animate) {
        ringRef.current.visible = true;
        ringRef.current.scale.setScalar(1);
        mat.opacity = 0.4;
      } else {
        ringRef.current.visible = true;
        const cyc = (clock.current % RING_PERIOD_S) / RING_PERIOD_S;
        const e = easeOutQuad(cyc);
        ringRef.current.scale.setScalar(1 + 0.5 * e);
        mat.opacity = 0.55 * (1 - e);
      }
    }
  });

  return (
    <group rotation={[0, 0, leanDirection]}>
      <group rotation={[leanMagnitude, 0, 0]}>
        {/* board's long axis (0.10 total length, "nose-up") runs along local Z — outward,
         * away from the globe center after this group's parent `lookAt`. Buried 0.015,
         * 0.085 shows: the sphere's semi-axis is half the *total* length (0.05), centered
         * so its span is exactly [-0.085 (nose, outward), +0.015 (buried tip)]. */}
        <group ref={bobRef} position={[0, 0, -0.035]}>
          <mesh scale={[0.032, 0.008, 0.05]}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshToonMaterial color={colors.board} gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0, 0.0075, 0]} scale={[0.006, 0.009, 0.09]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshToonMaterial color={colors.stripe} gradientMap={getToonGradientMap()} />
          </mesh>
        </group>
      </group>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.003]} visible={false}>
        <torusGeometry args={[0.045, 0.004, 8, 20]} />
        <meshBasicMaterial color="#FFD166" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </group>
  );
}

const PEEL_PERIOD_S = 2.8;
const PEEL_TRAVEL = 0.045;
const PEEL_FADE_START = 0.8; // fraction of the cycle where the fade-out begins

// The touchdown camera framing centers tightly on the destination, and Nalu's own
// silhouette is large relative to the §5d table's literal 2-3.5deg offsets (they'd sit
// almost entirely behind the bird) — scaled up for rendering only so the wave/landmark
// clear Nalu and read as distinct background elements; §5d's own numbers stay the
// source of truth for touchdown coords (store.ts) and stay untouched.
const RENDER_OFFSET_SCALE = 3;

/** Breaking wave (art-direction §5b) — a lighter water band with a foam crescent that
 * peels along it and loops. This is the product itself, visible from the sky. */
function BreakingWave({ dest, animate }: { dest: Destination; animate: boolean }) {
  const v = VIGNETTES[dest.id];
  const lat = dest.lat + v.waveOffset.dLat * RENDER_OFFSET_SCALE;
  const lng = dest.lng + v.waveOffset.dLng * RENDER_OFFSET_SCALE;
  // sits on the same displaced surface as everything else (terrain addendum) — in practice
  // this is open water, so heightAt is 0 and the wave sits exactly at the ocean radius.
  const pos = latLngToVec3(lat, lng, 1 + heightAt(lat, lng));
  const crescentRef = useRef<Group>(null);
  const matRef = useRef<MeshBasicMaterial>(null);
  const clock = useRef(Math.random() * PEEL_PERIOD_S);

  useFrame((_, dt) => {
    if (!crescentRef.current) return;
    if (!animate) {
      crescentRef.current.position.x = 0; // static, mid-band
      if (matRef.current) matRef.current.opacity = 1;
      return;
    }
    clock.current += dt;
    const cyc = (clock.current % PEEL_PERIOD_S) / PEEL_PERIOD_S;
    const peel = easeInOutSine(cyc);
    crescentRef.current.position.x = -PEEL_TRAVEL / 2 + PEEL_TRAVEL * peel;
    const opacity = cyc > PEEL_FADE_START ? 1 - (cyc - PEEL_FADE_START) / (1 - PEEL_FADE_START) : 1;
    if (matRef.current) matRef.current.opacity = opacity;
  });

  return (
    <group position={pos} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      <mesh scale={[0.09, 0.05, 0.006]} position={[0, 0, -0.009]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color="#58D3C7" gradientMap={getToonGradientMap()} />
      </mesh>
      <group ref={crescentRef} position={[0, 0, -0.012]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.05, 0.006, 6, 16, Math.PI * 0.55]} />
          <meshBasicMaterial ref={matRef} color="#FFFDF7" transparent opacity={1} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

const TILT_DEG: Record<string, number> = {
  oahu: 3, bali: -2.5, ericeira: 2, taghazout: -3.5, nosara: 2.8, jbay: -2,
};

/** ≤3-primitive destination landmark (art-direction §5c), brief's exact list. */
function landmarkParts(destId: string) {
  switch (destId) {
    case 'oahu': // Diamond Head
      return (
        <>
          <mesh position={[0, 0, -0.025]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.02, 0.045, 0.05, 10]} />
            <meshToonMaterial color="#8FD07E" gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0, 0, -0.051]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.02, 12]} />
            <meshToonMaterial color="#F2D8A7" gradientMap={getToonGradientMap()} />
          </mesh>
        </>
      );
    case 'bali': // Uluwatu split gate
      return (
        <>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.016, 0, -0.025]} rotation={[-Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.014, 0.014, 0.05]} />
              <meshToonMaterial color="#F2D8A7" gradientMap={getToonGradientMap()} />
            </mesh>
          ))}
          {[-1, 1].map((s) => (
            <mesh key={`cap${s}`} position={[s * 0.016, 0, -0.052]} rotation={[-Math.PI / 2, 0, 0]}>
              <boxGeometry args={[0.018, 0.018, 0.006]} />
              <meshToonMaterial color="#14353E" gradientMap={getToonGradientMap()} />
            </mesh>
          ))}
        </>
      );
    case 'ericeira': // chapel
      return (
        <>
          <mesh position={[0, 0, -0.015]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.028, 0.028, 0.03]} />
            <meshToonMaterial color="#FFFDF7" gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0, 0, -0.041]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.02, 0.022, 4]} />
            <meshToonMaterial color="#E85F4C" gradientMap={getToonGradientMap()} />
          </mesh>
        </>
      );
    case 'taghazout': // rock arch — a half-torus, planted upright
      return (
        <mesh rotation={[0, Math.PI / 2, 0]} position={[0, 0, -0.03]}>
          <torusGeometry args={[0.03, 0.009, 8, 16, Math.PI]} />
          <meshToonMaterial color="#F2D8A7" gradientMap={getToonGradientMap()} />
        </mesh>
      );
    case 'nosara': // jungle tree
      return (
        <>
          <mesh position={[0, 0, -0.0175]} rotation={[-Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.035, 6]} />
            <meshToonMaterial color="#9C8B72" gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0, 0, -0.04]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshToonMaterial color="#5FB56E" gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0.012, 0.008, -0.045]}>
            <sphereGeometry args={[0.013, 8, 6]} />
            <meshToonMaterial color="#8FD07E" gradientMap={getToonGradientMap()} />
          </mesh>
        </>
      );
    case 'jbay': // the point — a long sand wedge with an extra-long peeling foam wall
      return (
        <>
          <mesh position={[0, 0, -0.004]} rotation={[-Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.02, 0.09, 0.008]} />
            <meshToonMaterial color="#F2D8A7" gradientMap={getToonGradientMap()} />
          </mesh>
          <mesh position={[0.014, 0, -0.005]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.09, 0.005, 6, 24, Math.PI * 0.4]} />
            <meshBasicMaterial color="#FFFDF7" transparent opacity={0.85} depthWrite={false} />
          </mesh>
        </>
      );
    default:
      return null;
  }
}

// A literal §5c-scale landmark (built from ~0.02-0.05-unit primitives) reads as a
// featureless blob at the distance the touchdown framing views it from — bumped up so
// its silhouette (e.g. Diamond Head's cone + crater disc) is actually legible, still
// tiny next to the globe.
const LANDMARK_SCALE = 1.8;

function Landmark({ dest }: { dest: Destination }) {
  const v = VIGNETTES[dest.id];
  const lat = dest.lat + v.landmarkOffset.dLat * RENDER_OFFSET_SCALE;
  const lng = dest.lng + v.landmarkOffset.dLng * RENDER_OFFSET_SCALE;
  const pos = latLngToVec3(lat, lng, 1 + heightAt(lat, lng));
  const tilt = (TILT_DEG[dest.id] ?? 3) * (Math.PI / 180);
  return (
    <group position={pos} onUpdate={(g) => g.lookAt(0, 0, 0)}>
      <group rotation={[0, 0, tilt]} scale={LANDMARK_SCALE}>{landmarkParts(dest.id)}</group>
    </group>
  );
}

// Owner request 2026-07-12 (addendum): a flagpole + waving flag beside every destination's
// existing surfboard pin. Sized to read at whole-globe zoom, well inside the spec's
// 0.06-0.09 globe-radius flag-height range once the pole's own standoff is included.
const POLE_HEIGHT = 0.085;
const POLE_RADIUS = 0.0025;
const FLAG_W = 0.06;
const FLAG_H = 0.03; // matches the 128x64 texture's 2:1 aspect ratio
const FLAG_WAVE_HZ = 1.6;
const FLAG_WAVE_AMP = 0.006;
const FLAG_WAVE_K = 90; // spatial frequency along the flag's length, away from the pole

/** Flagpole + waving flag for one destination. Planted a little clear of the surfboard pin
 * (offset applied by the caller) so the two don't overlap.
 *
 * The flag mesh is billboarded (its world rotation is forced to identity every frame,
 * facing the scene's always-fixed camera dead-on) rather than inheriting the marker's own
 * `lookAt`-derived orientation, which can leave a flat plane close to edge-on to the camera
 * for some destinations once the globe settles at their touchdown framing. Billboarding
 * sidesteps that entirely and costs one quaternion read+invert per flag per frame. The pole
 * itself keeps the natural tangent-frame orientation — a thin cylinder reads fine as
 * "planted, standing up" from any angle. */
function Flagpole({ destId, active, animate }: { destId: string; active: boolean; animate: boolean }) {
  const texture = useMemo(() => createFlagTexture(destId), [destId]);
  useEffect(() => () => texture.dispose(), [texture]);
  const flagMesh = useRef<Mesh>(null);
  const baseY = useRef<Float32Array | null>(null);
  const clock = useRef(Math.random() * 10); // desync each flag's flutter phase
  const poleGroup = useRef<Group>(null);
  const scale = useRef(1);
  const parentWorldQuat = useMemo(() => new Quaternion(), []);

  useFrame((_, dt) => {
    clock.current += dt;
    if (flagMesh.current?.parent) {
      flagMesh.current.parent.getWorldQuaternion(parentWorldQuat);
      flagMesh.current.quaternion.copy(parentWorldQuat).invert();
    }
    // Per-vertex sine flutter, written straight into the plane geometry's own (already
    // allocated) position buffer — no per-frame allocation, reduced motion = untouched/flat.
    // `baseY` is captured once (the plane's original, undistorted per-vertex height) so each
    // frame *adds* the ripple on top of it instead of overwriting it — overwriting collapsed
    // every vertex at a given x to the same y, flattening the whole flag into a zero-height
    // line regardless of geometry (the actual bug behind an early "invisible flag" debug session).
    if (flagMesh.current) {
      const posAttr = flagMesh.current.geometry.attributes.position as BufferAttribute;
      const arr = posAttr.array as Float32Array;
      if (!baseY.current) {
        baseY.current = new Float32Array(arr.length / 3);
        for (let i = 0; i < arr.length; i += 3) baseY.current[i / 3] = arr[i + 1];
      }
      if (animate) {
        for (let i = 0; i < arr.length; i += 3) {
          const t = (arr[i] + FLAG_W / 2) / FLAG_W; // 0 at the pole edge -> 1 at the far edge
          arr[i + 1] = baseY.current[i / 3]
            + FLAG_WAVE_AMP * t * Math.sin(clock.current * FLAG_WAVE_HZ * Math.PI * 2 + arr[i] * FLAG_WAVE_K);
        }
        posAttr.needsUpdate = true;
      }
    }
    if (poleGroup.current) {
      const target = active ? 1.18 : 1;
      const k = animate ? Math.min(1, dt * 6) : 1; // reduced motion: snap, no continuous tween
      scale.current += (target - scale.current) * k;
      poleGroup.current.scale.setScalar(scale.current);
    }
  });

  return (
    <group ref={poleGroup}>
      <mesh position={[0, 0, -POLE_HEIGHT / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[POLE_RADIUS, POLE_RADIUS, POLE_HEIGHT, 6]} />
        <meshToonMaterial color={INK} gradientMap={getToonGradientMap()} />
      </mesh>
      <mesh
        ref={flagMesh}
        position={[FLAG_W / 2 + POLE_RADIUS, 0, -(POLE_HEIGHT - FLAG_H / 2 - 0.004)]}
      >
        <planeGeometry args={[FLAG_W, FLAG_H, 10, 6]} />
        <meshBasicMaterial map={texture} side={DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Markers({ animate }: { animate: boolean }) {
  const activeDestId = useGame((g) => g.activeDestId);
  return (
    <group>
      {DESTINATIONS.map((d, index) => (
        <group
          key={d.id}
          position={latLngToVec3(d.lat, d.lng, 1 + heightAt(d.lat, d.lng))}
          onUpdate={(g) => g.lookAt(0, 0, 0)}
        >
          <SurfboardPin destId={d.id} index={index} active={d.id === activeDestId} animate={animate} />
          {/* Planted well clear of the pin (and, when landed, of Nalu's own body+board
           * sitting almost exactly on top of the marker) so the flag reads as its own
           * distinct element instead of hiding under the bird. */}
          <group position={[0.095, 0.07, 0]}>
            <Flagpole destId={d.id} active={d.id === activeDestId} animate={animate} />
          </group>
        </group>
      ))}
      {DESTINATIONS.map((d) => <BreakingWave key={d.id} dest={d} animate={animate} />)}
      {DESTINATIONS.map((d) => <Landmark key={d.id} dest={d} />)}
    </group>
  );
}
