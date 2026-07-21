import { useRef, type CSSProperties } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { NoToneMapping, Vector3, type Group } from 'three';
import { useGame } from '../game/store';
import { useAchievements } from '../game/achievements';
import { shortestAngleDeg, type FlightInput } from '../game/flight';
import { rad } from './geo';
import { selectCameraPose } from './cameraPose';
import { Globe } from './Globe';
import { Markers } from './Markers';
import { Coins } from './Coins';
import { SwellTrains } from './SwellTrains';
import { Bird } from './Bird';
import { SunDisc } from './SunDisc';

// Tiny epsilon (deg) below which a frame's lat/lng delta counts as "not moving" —
// guards the idle-time recorder against float jitter from stepFlight/wrapLng
// round-tripping an already-stationary value, not a meaningful movement threshold.
const IDLE_EPS_DEG = 1e-6;
// Matches flight.ts's MAX_LAT clamp (80) with a hair of slack so the pole achievement
// fires reliably right at the clamp instead of needing an exact float match.
const POLE_LAT_DEG = 79.5;

/** Wires the flight tick to the secret achievements engine, without touching `useGame`
 * itself (art-direction: keep the game store's existing logic/tests untouched). Reads
 * `flight` every frame it's actually moving-relevant (`flying`/`approaching`) and derives
 * the same longitude-delta the Rig already uses for its own display smoothing, plus a
 * pole check and an idle/moving flag, then hands them to `useAchievements`'s recorders. */
function AchievementsFrame() {
  const prevLat = useRef<number | null>(null);
  const prevLng = useRef<number | null>(null);

  useFrame((_, rawDt) => {
    if (document.hidden) return;
    const { state, flight } = useGame.getState();
    if (state !== 'flying' && state !== 'approaching') {
      prevLat.current = null;
      prevLng.current = null;
      return;
    }
    const { lat, lng } = flight;
    if (prevLat.current === null || prevLng.current === null) {
      prevLat.current = lat;
      prevLng.current = lng;
      return;
    }
    const dt = Math.min(rawDt, 0.1);
    const dLngAbs = Math.abs(shortestAngleDeg(prevLng.current, lng));
    const dLatAbs = Math.abs(lat - prevLat.current);
    const moving = dLngAbs > IDLE_EPS_DEG || dLatAbs > IDLE_EPS_DEG;
    const pole = lat >= POLE_LAT_DEG ? 'north' : lat <= -POLE_LAT_DEG ? 'south' : null;
    const { recordFlight, recordIdle } = useAchievements.getState();
    recordFlight({ dLngAbs, pole });
    recordIdle(dt * 1000, moving);
    prevLat.current = lat;
    prevLng.current = lng;
  });

  return null;
}

// Sibling to Rig (not folded into it): Rig owns globe *rotation*, this owns the camera —
// distinct concerns reading from the same store, kept separate per the "don't touch the
// globe-rotation rig" boundary. useThree (not a prop) for the live camera instance.
//
// Descend-from-orbit landing camera (thesis §2A): tweens BOTH position and lookAt between
// two poses (`cameraPose.ts`) — FAR (today's unchanged whole-globe top-down) and DIORAMA
// (landed/booking/confirmed: off-axis, tilted ~50° off the touchdown surface normal, close
// enough that the globe's own limb reads as a horizon). This used to be a straight-in dolly
// on `camera.position.z` alone (a scale change); now the camera actually leaves the +Z axis,
// so landing reads as a perspective change instead of a zoom.
//
// `targetPos`/`targetLookAt` are re-set from the pose every frame (allocation-free — pose
// objects are module-level constants, `.set` just copies their tuple into an already-live
// Vector3); `currentLookAt` persists across frames so it — like `camera.position` itself —
// can be lerped toward whichever pose is active rather than snapping, and is fed to
// `camera.lookAt` every frame while a tween is in flight, per the brief.
function CameraZoom({ animate }: { animate: boolean }) {
  const { camera } = useThree();
  const targetPos = useRef(new Vector3());
  const targetLookAt = useRef(new Vector3());
  const currentLookAt = useRef(new Vector3(0, 0, 0));

  useFrame((_, rawDt) => {
    if (document.hidden) return;
    const pose = selectCameraPose(useGame.getState().state);
    targetPos.current.set(...pose.position);
    targetLookAt.current.set(...pose.lookAt);

    if (!animate) {
      camera.position.copy(targetPos.current);
      currentLookAt.current.copy(targetLookAt.current);
      camera.lookAt(currentLookAt.current);
      return;
    }

    const dt = Math.min(rawDt, 0.1);
    const k = Math.min(1, dt * 3);
    camera.position.lerp(targetPos.current, k);
    currentLookAt.current.lerp(targetLookAt.current, k);
    camera.lookAt(currentLookAt.current);
  });
  return null;
}

function Rig({ getInput, children }: { getInput: () => FlightInput; children: React.ReactNode }) {
  const outer = useRef<Group>(null); // rotation.x = rad(lat)
  const inner = useRef<Group>(null); // rotation.y = rad(-lng)
  const shown = useRef({ lat: 8, lng: -140 });

  useFrame((_, rawDt) => {
    if (document.hidden) return;
    const dt = Math.min(rawDt, 0.1);
    useGame.getState().tick(getInput(), dt);
    const { flight } = useGame.getState();
    const s = shown.current;
    const k = Math.min(1, dt * 5);
    s.lat += (flight.lat - s.lat) * k;
    s.lng += shortestAngleDeg(s.lng, flight.lng) * k;
    if (outer.current) outer.current.rotation.x = rad(s.lat);
    if (inner.current) inner.current.rotation.y = rad(-s.lng);
  });

  return (
    <group ref={outer}>
      <group ref={inner}>{children}</group>
    </group>
  );
}

// Cheapest possible sky: a CSS gradient on the container div behind an alpha canvas
// (art-direction §2a) instead of a `<color attach="background">` fill.
const SKY_STYLE: CSSProperties = {
  position: 'fixed', inset: 0,
  background: 'linear-gradient(180deg, #9ADBE8 0%, #C8E6DC 55%, #FFE3C2 100%)',
};

export function GlobeScene({ getInput, animate }: { getInput: () => FlightInput; animate: boolean }) {
  return (
    <div style={SKY_STYLE}>
      <Canvas
        dpr={[1, 2]}
        // Flat/toon brief, not filmic: ACES tone mapping (r3f's default) desaturates
        // the exact palette hexes (esp. warm yellows) — this is an illustration, not
        // a simulator, so colors should render as specified without a cinematic curve.
        gl={{ alpha: true, toneMapping: NoToneMapping }}
        camera={{ position: [0, 0, 3.2], fov: 50 }}
        style={{ position: 'fixed', inset: 0 }}
        aria-hidden
      >
        <ambientLight color="#CFEAE4" intensity={0.85} />
        <directionalLight position={[-3, 2.2, 2]} color="#FFDFAE" intensity={1.55} />
        <directionalLight position={[1.5, 0.2, -3]} color="#FFC98A" intensity={0.5} />
        <SunDisc />
        <CameraZoom animate={animate} />
        <AchievementsFrame />
        <Rig getInput={getInput}>
          <Globe animateClouds={animate} />
          <SwellTrains animate={animate} />
          <Markers animate={animate} />
          <Coins animate={animate} />
        </Rig>
        <Bird getInput={getInput} animate={animate} />
      </Canvas>
    </div>
  );
}
