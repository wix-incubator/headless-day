// The 3D game stage: attract-mode menu, physics dice roll, and the joke itself
// materializing as 3D text with a setup → punchline beat. DOM is HUD-only.
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Sparkles, Stars, Text } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type ScenePhase = "idle" | "rolling" | "revealed";

export interface JokeDisplay {
  text: string;
  category: string;
  authorHandle: string;
  /** joke is flag-tagged and not yet revealed → show the warning curtain instead of text */
  curtained: boolean;
}

interface SceneProps {
  phase: ScenePhase;
  onDiceSettled: () => void;
  /** bumps every time a joke is accepted → launches a star into the constellation */
  launchCount: number;
  /** bumps on a 😂 reaction → confetti burst */
  confettiCount: number;
  lowMotion: boolean;
  joke: JokeDisplay | null;
}

const GOLD = "#e8b84b";
const GOLD_BRIGHT = "#ffd98a";
const STAGE = "#1b1730";
const INK = "#f4f0e6";
const FLOOR_Y = 0;

/* ---------- helpers ---------- */

const easeOutBack = (t: number) => {
  const c1 = 1.20158;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/** Split a joke into setup + punchline at the last sentence boundary. */
export function splitJoke(text: string): { setup: string; punchline: string } {
  const trimmed = text.trim();
  const m = [...trimmed.matchAll(/[.!?…]+["')\]]?\s+/g)];
  if (trimmed.length < 70 || m.length === 0) return { setup: "", punchline: trimmed };
  const last = m[m.length - 1];
  const idx = (last.index ?? 0) + last[0].length;
  if (idx > trimmed.length - 3) return { setup: "", punchline: trimmed };
  return { setup: trimmed.slice(0, idx).trim(), punchline: trimmed.slice(idx).trim() };
}

function fontSizeFor(text: string): number {
  const len = text.length;
  if (len < 60) return 0.44;
  if (len < 140) return 0.36;
  if (len < 280) return 0.29;
  return 0.23;
}

/* ---------- stage & lights ---------- */

function Stage() {
  return (
    <group>
      <mesh position={[0, FLOOR_Y - 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[5.2, 5.8, 0.6, 64]} />
        <meshStandardMaterial color={STAGE} roughness={0.35} metalness={0.55} />
      </mesh>
      {/* golden rim — flat on the stage */}
      <mesh position={[0, FLOOR_Y + 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[5.2, 0.05, 16, 128]} />
        <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.7} roughness={0.2} metalness={1} />
      </mesh>
    </group>
  );
}

function Lights({ phase }: { phase: ScenePhase }) {
  const spot = useRef<THREE.SpotLight>(null);
  const flash = useRef(0);
  useEffect(() => {
    if (phase === "revealed") flash.current = 1; // spotlight surge on reveal
  }, [phase]);
  useFrame(({ clock }, dt) => {
    if (!spot.current) return;
    flash.current = Math.max(0, flash.current - dt * 1.4);
    const base = phase === "revealed" ? 300 : 190;
    spot.current.intensity = base + flash.current * 260 + Math.sin(clock.elapsedTime * 1.4) * 20;
  });
  return (
    <>
      <ambientLight intensity={0.32} />
      <spotLight
        ref={spot}
        position={[0, 9, 3]}
        angle={0.55}
        penumbra={0.7}
        intensity={190}
        color="#ffe9c4"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-6, 3, -4]} intensity={16} color="#7a5cff" />
      <pointLight position={[6, 2.5, -3]} intensity={12} color="#ff5c8a" />
    </>
  );
}

/* ---------- responsive scale (mobile) ---------- */

/** Portrait/narrow screens can't fit the full-width 3D text — scale it down.
 *  Desktop (aspect ≥ 1) is untouched. */
function useResponsiveScale(): number {
  const aspect = useThree((s) => s.size.width / s.size.height);
  return Math.min(1, aspect);
}

/** Joke-text layout for the current screen. Desktop (aspect ≥ 1) is exactly {1, 8}.
 *  Narrow screens: shrink moderately (stay readable) AND narrow the wrap width so the
 *  scaled text truly fits the visible width (≈ 6.76 * aspect world units at the stage plane). */
function useJokeLayout(): { scale: number; maxW: number } {
  const aspect = useThree((s) => s.size.width / s.size.height);
  if (aspect >= 1) return { scale: 1, maxW: 8 };
  const scale = Math.max(0.62, 0.75 * aspect + 0.25); // readable floor
  const maxW = Math.min(8, (6.76 * aspect * 0.94) / scale); // wrap so scaled width fits
  return { scale, maxW };
}

/* ---------- 3D title (attract mode) ---------- */

function Title3D({ visible, lowMotion }: { visible: boolean; lowMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const scale = useResponsiveScale();
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.position.y = 2.75 + (lowMotion ? 0 : Math.sin(t * 0.8) * 0.09);
    group.current.rotation.y = lowMotion ? 0 : Math.sin(t * 0.22) * 0.05;
  });
  if (!visible) return null;
  return (
    <group ref={group} position={[0, 2.75, 0]} scale={scale}>
      {/* billboard: stay readable while the attract-mode camera orbits */}
      <Billboard follow>
        <Text fontSize={0.92} letterSpacing={0.04} anchorX="center" anchorY="middle" color={INK}
          outlineWidth={0.012} outlineColor={GOLD} outlineOpacity={0.55}>
          joke·exchange
        </Text>
        <Text position={[0, -0.78, 0]} fontSize={0.24} letterSpacing={0.3} anchorX="center" anchorY="middle"
          color={GOLD_BRIGHT} fillOpacity={0.85}>
          LEAVE A JOKE — TAKE A JOKE
        </Text>
      </Billboard>
    </group>
  );
}

/* ---------- 3D joke text: fly-in + zoom + fade, setup → punchline beat ---------- */

function FlyInText({
  children,
  delay,
  fontSize,
  color,
  position,
  maxWidth = 8,
  lowMotion,
  outline,
}: {
  children: string;
  delay: number;
  fontSize: number;
  color: string;
  position: [number, number, number];
  maxWidth?: number;
  lowMotion: boolean;
  outline?: boolean;
}) {
  const ref = useRef<any>(null);
  const start = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (start.current === null) start.current = clock.elapsedTime + delay;
    const t = clock.elapsedTime - start.current;
    if (lowMotion) {
      // accessibility path: quick opacity fade only, no motion
      const p = THREE.MathUtils.clamp(t / 0.25, 0, 1);
      ref.current.fillOpacity = p;
      ref.current.position.set(...position);
      return;
    }
    const p = THREE.MathUtils.clamp(t / 0.9, 0, 1);
    if (p <= 0) {
      ref.current.fillOpacity = 0;
      return;
    }
    const e = easeOutBack(p);
    const zoom = easeOutCubic(p);
    // fly in from deep stage toward the camera, scaling up, fading in
    ref.current.position.set(position[0], position[1] + (1 - e) * 0.9, position[2] - (1 - zoom) * 7);
    ref.current.scale.setScalar(0.55 + 0.45 * e);
    ref.current.fillOpacity = Math.min(1, p * 1.6);
    if (ref.current.outlineOpacity !== undefined) ref.current.outlineOpacity = 0.5 * p;
  });
  return (
    <Text
      ref={ref}
      fontSize={fontSize}
      maxWidth={maxWidth}
      lineHeight={1.45}
      textAlign="center"
      anchorX="center"
      anchorY="middle"
      color={color}
      fillOpacity={0}
      position={position}
      outlineWidth={outline ? 0.01 : 0}
      outlineColor={GOLD}
      outlineOpacity={0}
    >
      {children}
    </Text>
  );
}

function JokeText3D({ joke, lowMotion }: { joke: JokeDisplay; lowMotion: boolean }) {
  const { setup, punchline } = useMemo(() => splitJoke(joke.text), [joke.text]);
  const size = fontSizeFor(joke.text);
  const { scale, maxW } = useJokeLayout();
  // narrower wrap → more lines → spread the blocks further apart vertically
  const spread = maxW < 8 ? (8 - maxW) * 0.22 : 0;

  if (joke.curtained) {
    return (
      <group scale={scale} position={[0, 2.9 * (1 - scale), 0]}>
        <FlyInText delay={0.1} fontSize={0.42} color="#ff9d6b" position={[0, 3.7 + spread, 0]} maxWidth={maxW} lowMotion={lowMotion}>
          ⚠ CAUTION: TAGGED MATERIAL
        </FlyInText>
        <FlyInText delay={0.5} fontSize={0.24} color={INK} position={[0, 2.75, 0]} maxWidth={maxW} lowMotion={lowMotion}>
          This joke carries a content tag. Reveal it below — you were warned.
        </FlyInText>
      </group>
    );
  }

  const punchDelay = setup ? 1.15 : 0.15;
  return (
    // scale down on narrow screens; nudge up so scaled text stays clear of the HUD bar
    <group scale={scale} position={[0, 2.9 * (1 - scale), 0]}>
      {setup && (
        <FlyInText delay={0.1} fontSize={size} color={INK} position={[0, 3.55 + spread, 0]} maxWidth={maxW} lowMotion={lowMotion}>
          {setup}
        </FlyInText>
      )}
      <FlyInText
        delay={punchDelay}
        fontSize={setup ? size * 1.12 : size}
        color={GOLD_BRIGHT}
        position={[0, setup ? 2.2 : 2.9, 0]}
        maxWidth={maxW}
        lowMotion={lowMotion}
        outline
      >
        {punchline}
      </FlyInText>
      <FlyInText
        delay={punchDelay + 0.7}
        fontSize={0.19}
        color="#b8b2c8"
        position={[0, (setup ? 1.35 : 2.05) - spread, 0]}
        maxWidth={maxW}
        lowMotion={lowMotion}
      >
        {`—   ${joke.authorHandle}`}
      </FlyInText>
    </group>
  );
}

/* ---------- dice (scripted keyframe animation — deterministic, smooth at any FPS) ---------- */

/** Canvas-drawn die faces: ivory with soft rounded border + dark pips, one texture per value 1–6. */
function makeDiceMaterials(): THREE.MeshStandardMaterial[] {
  const PIPS: Record<number, [number, number][]> = {
    1: [[0.5, 0.5]],
    2: [[0.28, 0.28], [0.72, 0.72]],
    3: [[0.25, 0.25], [0.5, 0.5], [0.75, 0.75]],
    4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
    5: [[0.25, 0.25], [0.75, 0.25], [0.5, 0.5], [0.25, 0.75], [0.75, 0.75]],
    6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.5], [0.72, 0.5], [0.28, 0.78], [0.72, 0.78]],
  };
  // box face order: +x, -x, +y, -y, +z, -z → classic die layout (opposite faces sum to 7)
  const faceValues = [1, 6, 2, 5, 3, 4];
  return faceValues.map((v) => {
    const S = 128;
    const c = document.createElement("canvas");
    c.width = c.height = S;
    const g = c.getContext("2d")!;
    // ivory face with a soft rounded-edge vignette (fakes bevel)
    g.fillStyle = "#f5eee1";
    g.fillRect(0, 0, S, S);
    g.strokeStyle = "rgba(120,100,60,0.35)";
    g.lineWidth = 10;
    g.beginPath();
    (g as any).roundRect ? (g as any).roundRect(5, 5, S - 10, S - 10, 22) : g.rect(5, 5, S - 10, S - 10);
    g.stroke();
    // pips
    g.fillStyle = "#241a05";
    for (const [px, py] of PIPS[v]) {
      g.beginPath();
      g.arc(px * S, py * S, S * 0.085, 0, Math.PI * 2);
      g.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.3, metalness: 0.1 });
  });
}

const DIE_REST_Y = 0.37;

/** y-position over time: fall, two damped bounces, rest. Pure function of t — FPS-proof. */
function dieY(t: number): number {
  if (t <= 0) return 5.2;
  if (t < 0.75) {
    const s = t / 0.75;
    return 5.2 + (DIE_REST_Y - 5.2) * s * s; // accelerating fall
  }
  if (t < 1.25) {
    const s = (t - 0.75) / 0.5;
    return DIE_REST_Y + 1.15 * 4 * s * (1 - s); // first bounce
  }
  if (t < 1.55) {
    const s = (t - 1.25) / 0.3;
    return DIE_REST_Y + 0.3 * 4 * s * (1 - s); // second, smaller bounce
  }
  return DIE_REST_Y;
}

const DIE_DURATION = 1.6;

function Die({
  index,
  rollId,
  materials,
  onSettle,
}: {
  index: number;
  rollId: number;
  materials: THREE.MeshStandardMaterial[];
  onSettle: (i: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const startAt = useRef<number | null>(null);
  const done = useRef(false);
  const cfg = useMemo(() => {
    const jitter = (n: number) => (Math.random() - 0.5) * n;
    return {
      delay: index * 0.22 + Math.random() * 0.08,
      land: new THREE.Vector3((-1 + index) * 1.2 + jitter(0.3), DIE_REST_Y, -0.55 + jitter(0.5)),
      from: new THREE.Vector3((-1 + index) * 1.9 + jitter(0.6), 5.2, 2.4 + jitter(0.6)),
      axis: new THREE.Vector3(jitter(2), jitter(2), jitter(2)).normalize(),
      spins: 2 + index, // whole turns → ends exactly face-up
      restYaw: jitter(1.2),
    };
  }, [index, rollId]); // fresh trajectory per roll — stable through the reveal

  useEffect(() => {
    startAt.current = null;
    done.current = false;
  }, [rollId]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    if (startAt.current === null) startAt.current = clock.elapsedTime + cfg.delay;
    const t = clock.elapsedTime - startAt.current;
    const u = THREE.MathUtils.clamp(t / DIE_DURATION, 0, 1);
    // horizontal approach eases out; vertical follows the bounce curve
    const e = 1 - (1 - u) * (1 - u);
    group.current.position.set(
      THREE.MathUtils.lerp(cfg.from.x, cfg.land.x, e),
      dieY(t),
      THREE.MathUtils.lerp(cfg.from.z, cfg.land.z, e),
    );
    // tumble: whole revolutions around a fixed axis, decelerating → lands exactly flat
    const spin = cfg.spins * Math.PI * 2 * (1 - (1 - u) * (1 - u) * (1 - u));
    group.current.quaternion.setFromAxisAngle(cfg.axis, spin);
    group.current.rotateY(cfg.restYaw * u); // slight final yaw so the trio doesn't look cloned
    if (t >= DIE_DURATION && !done.current) {
      done.current = true;
      onSettle(index);
    }
  });

  return (
    <group ref={group} position={[cfg.from.x, 5.2, cfg.from.z]}>
      <mesh castShadow material={materials}>
        <boxGeometry args={[0.72, 0.72, 0.72]} />
      </mesh>
    </group>
  );
}

function DiceRoll({ phase, onDiceSettled }: { phase: ScenePhase; onDiceSettled: () => void }) {
  const settledCount = useRef(0);
  const fired = useRef(false);
  const rolling = phase === "rolling";
  const [rollId, setRollId] = useState(0);

  useEffect(() => {
    if (rolling) {
      settledCount.current = 0;
      fired.current = false;
      setRollId((n) => n + 1); // new trajectories for this roll
    }
  }, [rolling]);

  useEffect(() => {
    if (!rolling) return;
    const t = setTimeout(() => {
      if (!fired.current) {
        fired.current = true;
        onDiceSettled();
      }
    }, 3400);
    return () => clearTimeout(t);
  }, [rolling, onDiceSettled]);

  const onSettle = () => {
    settledCount.current += 1;
    if (settledCount.current >= 3 && !fired.current) {
      fired.current = true;
      setTimeout(onDiceSettled, 450);
    }
  };

  const materials = useMemo(() => makeDiceMaterials(), []);

  if (phase === "idle") return null;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Die key={i} index={i} rollId={rollId} materials={materials} onSettle={onSettle} />
      ))}
    </>
  );
}

/* ---------- effects ---------- */

const CONFETTI_N = 120;
function ConfettiBurst({ trigger }: { trigger: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(
    () =>
      Array.from({ length: CONFETTI_N }, (_, i) => ({
        dir: new THREE.Vector3().setFromSphericalCoords(
          1,
          Math.acos(2 * ((i * 37) % 100) / 100 - 1) * 0.55, // bias upward
          ((i * 61) % 100) / 100 * Math.PI * 2,
        ),
        speed: 3.5 + ((i * 13) % 30) / 10,
        spin: ((i * 7) % 10) / 10 + 0.4,
        color: new THREE.Color([GOLD_BRIGHT, "#ff5c8a", "#7a5cff", INK][i % 4]),
      })),
    [],
  );
  const life = useRef(1e9);

  useEffect(() => {
    if (trigger > 0) life.current = 0;
  }, [trigger]);

  useEffect(() => {
    if (!mesh.current) return;
    data.forEach((d, i) => mesh.current!.setColorAt(i, d.color));
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [data]);

  useFrame((_, dt) => {
    if (!mesh.current) return;
    life.current += dt;
    const t = life.current;
    const dead = t > 1.6;
    mesh.current.visible = !dead;
    if (dead) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    data.forEach((d, i) => {
      const x = d.dir.x * d.speed * t;
      const y = 1.4 + d.dir.y * d.speed * t - 4.2 * t * t; // gravity
      const z = d.dir.z * d.speed * t;
      e.set(t * d.spin * 7, t * d.spin * 9, 0);
      q.setFromEuler(e);
      const s = Math.max(0.001, 0.09 * (1 - t / 1.6));
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, s, s * 0.25));
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CONFETTI_N]} visible={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

function LaunchStar({ trigger }: { trigger: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const progress = useRef(1);
  const target = useRef(new THREE.Vector3());
  const from = useMemo(() => new THREE.Vector3(0, 0.5, 0), []);

  useEffect(() => {
    if (trigger === 0) return;
    progress.current = 0;
    target.current.set((Math.random() - 0.5) * 24, 8 + Math.random() * 6, -10 - Math.random() * 8);
  }, [trigger]);

  useFrame((_, dt) => {
    if (!ref.current || progress.current >= 1) {
      if (ref.current) ref.current.visible = false;
      return;
    }
    progress.current = Math.min(progress.current + dt * 0.55, 1);
    const p = progress.current;
    ref.current.visible = true;
    ref.current.position.lerpVectors(from, target.current, 1 - (1 - p) * (1 - p));
    ref.current.scale.setScalar(0.22 * (1 - p * 0.6));
  });

  return (
    <mesh ref={ref} visible={false}>
      <sphereGeometry args={[1, 16, 16]} />
      <meshBasicMaterial color={GOLD} toneMapped={false} />
    </mesh>
  );
}

/* ---------- camera: attract-mode orbit ⇄ front view ---------- */

function CameraRig({ phase, lowMotion }: { phase: ScenePhase; lowMotion: boolean }) {
  const { camera } = useThree();
  const angle = useRef(0);
  useFrame(({ pointer }, dt) => {
    let tx: number, ty: number, tz: number;
    if (phase === "idle" && !lowMotion) {
      angle.current += dt * 0.08; // slow menu orbit
      tx = Math.sin(angle.current) * 9.4;
      ty = 3.4;
      tz = Math.cos(angle.current) * 9.4;
    } else {
      tx = lowMotion ? 0 : pointer.x * 0.55;
      ty = 3.1 + (lowMotion ? 0 : pointer.y * 0.3);
      tz = 8.8;
    }
    const k = lowMotion ? 1 : Math.min(1, dt * 2.2);
    camera.position.x += (tx - camera.position.x) * k;
    camera.position.y += (ty - camera.position.y) * k;
    camera.position.z += (tz - camera.position.z) * k;
    camera.lookAt(0, 1.6, 0);
  });
  return null;
}

/* ---------- root ---------- */

export default function Scene({ phase, onDiceSettled, launchCount, confettiCount, lowMotion, joke }: SceneProps) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.75]);
  useEffect(() => {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) setDpr([1, 1.25]);
  }, []);

  return (
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [0, 3.4, 9.4], fov: 42 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      <color attach="background" args={["#0a0818"]} />
      <fog attach="fog" args={["#0a0818", 15, 32]} />
      <Suspense fallback={null}>
        <Lights phase={phase} />
        <Stage />
        <Title3D visible={phase === "idle"} lowMotion={lowMotion} />
        <DiceRoll phase={phase} onDiceSettled={onDiceSettled} />
        {phase === "revealed" && joke && <JokeText3D joke={joke} lowMotion={lowMotion} />}
        <ConfettiBurst trigger={confettiCount} />
        <LaunchStar trigger={launchCount} />
        <Stars radius={60} depth={40} count={2400} factor={3.2} saturation={0.35} fade speed={lowMotion ? 0 : 0.6} />
        <Sparkles count={lowMotion ? 0 : 70} scale={[11, 6, 11]} position={[0, 2.5, 0]} size={2.2} speed={0.28} color="#ffd98a" />
        <CameraRig phase={phase} lowMotion={lowMotion} />
      </Suspense>
    </Canvas>
  );
}
