import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, Euler, Group, Mesh, MeshBasicMaterial, Quaternion, Vector3 } from 'three';
import { useGame } from '../game/store';
import { shortestAngleDeg, type FlightInput } from '../game/flight';
import { rad } from './geo';
import { getToonGradientMap } from './toonGradient';
import { BurstFX, type BurstFXHandle } from './BurstFX';
import { easeOutQuad } from './ease';
import { heightAt } from './terrain';
import { VIGNETTES } from '../data/vignettes';
import {
  landingPose, takeoffPose, dustPuffSpecs, sandKickSpecs,
  celebrationGroundedPose, celebrationAirbornePose, spraySpecs,
  LANDING_DURATION, LANDING_DURATION_REDUCED, TAKEOFF_DURATION, TAKEOFF_DURATION_REDUCED,
  TOUCHDOWN_FX_T, SAND_KICK_FX_T, FLIGHT_Y, FLIGHT_Z, LANDED_Y, LANDED_Z,
  CELEBRATION_AIRBORNE_DURATION, CELEBRATION_AIRBORNE_DURATION_REDUCED,
  SPRAY_FX_T_GROUNDED, SPRAY_FX_T_AIRBORNE,
  HERO_POS, HERO_SCALE_MULT, heroExitBlend,
} from './choreography';

// Toy-helicopter palette (owner decision 2026-07-12) — same brand tokens the rest of the
// scene already uses (coral/cream/ink/sun).
const CORAL = '#FF7E6B';
const CREAM = '#FFFDF7';
const INK = '#14353E';
const SUN = '#FFD166';
// The heli root group's overall scale — §4a/§4b's squash/stretch `pose.scale` values are
// multipliers around 1, applied on top of this, never a replacement for it.
const BASE_SCALE = 0.09;
// The model's own "up" axis (rotor/canopy side) — `gravityAlignRef` realigns this to the
// live outward radial every frame (owner decision 2026-07-13, gravity-referenced top-down view).
const UP_AXIS = new Vector3(0, 1, 0);

function lerpN(a: number, b: number, t: number): number { return a + (b - a) * t; }

// Intro hero close-up (owner decision 2026-07-13): a fixed "studio" orientation, blended
// with the normal gravity-referenced alignment via `heroBlend` below. `HERO_TILT_X` sits
// partway between pure side-profile (0°, only the X-Y silhouette shows) and the flying
// pose's pure top-down read (90°, canopy/rotor face the camera dead-on) so both the cute
// cockpit-face and a bit of the fuselage/tail profile are visible — a three-quarter angle,
// not either extreme. `HERO_YAW_Y` (applied to `yawRef`, see below) turns the nose partway
// toward the camera on top of that so it reads as facing/addressing the viewer rather than
// posing in dead-on screen-right profile.
const HERO_TILT_X = rad(38);
const HERO_YAW_Y = rad(-26);
const HERO_QUAT = new Quaternion().setFromEuler(new Euler(HERO_TILT_X, 0, 0));

// Every destination's touchdown height, computed once at module load (a dozen destinations,
// terrain addendum) — the heli's landed/landing/takeoff pose adds this so Nalu settles onto
// the actual displaced surface instead of the old flat-sphere radius.
const GROUND_HEIGHT_BY_DEST: Record<string, number> = Object.fromEntries(
  Object.entries(VIGNETTES).map(([id, v]) => [id, heightAt(v.touchdown.lat, v.touchdown.lng)]),
);

/** Two rounded paddle blades on a hub, spun by the parent's `rotation.y` (see `rotorRef`
 * below) — the airframe's real vertical axis. `gravityAlignRef` (the outer group wrapping
 * the whole heli) realigns local +Y to the outward radial every frame, which is also
 * ~toward the camera at this heli's near-globe-surface position — so spinning here about Y
 * reads as a flat top-down pinwheel exactly like a real rotor disc, no profile-camera
 * workaround needed anymore. Y is also the one local axis heading yaw (also rotation.y, one
 * level up) can never perturb — a rotation can't move a vector lying on its own axis — so
 * the disc stays camera-facing at every heading, not just some. */
function RotorBlades({ scale }: { scale: number }) {
  return (
    <>
      {[1, -1].map((s) => (
        <mesh key={s} position={[s * 0.68 * scale, 0, 0]} scale={[0.62 * scale, 0.07 * scale, 0.17 * scale]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshToonMaterial color={SUN} gradientMap={getToonGradientMap()} />
        </mesh>
      ))}
    </>
  );
}

type Mode = 'none' | 'landing' | 'takeoff' | 'celebrateGrounded' | 'celebrateAirborne';

const ROTOR_FLYING_SPEED = 40; // rad/s
const ROTOR_IDLE_SPEED = 1.3; // rad/s
const ROTOR_DISC_MAX_OPACITY = 0.22;

export function Bird({ getInput, animate }: { getInput: () => FlightInput; animate: boolean }) {
  const ref = useRef<Group>(null); // position/scale only — the choreography timelines own these
  // rotation (quaternion) = gravity-referenced tilt, realigning local +Y to the live outward
  // radial every frame — see the useFrame block below. Wraps yawRef, i.e. it's the outermost
  // orientation transform, applied after heading/bank are resolved in the model's own local
  // frame.
  const gravityAlignRef = useRef<Group>(null);
  const yawRef = useRef<Group>(null); // rotation.y = heading yaw (the pre-tilt "up" axis)
  const bodyRef = useRef<Group>(null); // rotation.x = bank/roll + pitch, both folded onto the same (longitudinal) axis — see below
  const rotorRef = useRef<Group>(null);
  const tailRotorRef = useRef<Group>(null);
  const rotorDiscRef = useRef<Mesh>(null);
  const shadowRef = useRef<Mesh>(null);
  const burstRef = useRef<BurstFXHandle>(null);
  const splashRef = useRef<Mesh>(null);
  const splashAge = useRef(-1); // -1 = inactive

  const t = useRef(0);
  const prevState = useRef(useGame.getState().state);
  const wiggleT = useRef(-1); // -1 = not wiggling
  const rollWiggle = useRef(0);
  const baseRoll = useRef(0);
  const basePitch = useRef(0);
  // brief nose-dip on entering 'approaching' (was a separate head-tilt group on the old
  // bird; folded into the whole-airframe pitch since a heli has no separate head).
  const approachDip = useRef(0);
  // smoothed on-screen heading (deg) the nose currently points toward; chases
  // flight.headingDeg via shortestAngleDeg so a 350°->10° reversal turns the short way
  // instead of spinning the long way around.
  const displayedHeadingDeg = useRef(useGame.getState().flight.headingDeg);
  const rotorAngle = useRef(0);
  const tailRotorAngle = useRef(0);
  const rotorSpeed = useRef(0);
  // fraction (0..1) of how "landed" the current pose is — drives how much of the active
  // destination's terrain height gets added to the heli's z (terrain addendum); see the
  // groundHeight block below for the derivation.
  const groundBlendRef = useRef(0);

  // choreography timeline (art-direction §4/§7): 'none' outside a scripted run
  const mode = useRef<Mode>('none');
  const modeT = useRef(0);
  const firedTouchdownFX = useRef(false);
  const firedSandKickFX = useRef(false);
  const firedSprayFX = useRef(false);

  // Intro hero close-up: seconds elapsed since the `intro -> flying` exit fired, or `null`
  // when not currently blending (either still in `intro`, or long since settled).
  const heroExitT = useRef<number | null>(null);
  // reused each frame to avoid allocating a Quaternion whenever the hero blend is active.
  const tmpFlyQuat = useRef(new Quaternion());

  // reused each frame for three things that all boil down to "the live outward radial at
  // the heli's current position": the gravity-align tilt, the shadow's surface projection,
  // and the splash ring's surface projection.
  const outwardDir = useRef(new Vector3());

  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current += dt;
    const input = getInput();
    const { state, bookingReturnTo, activeDestId, flight } = useGame.getState();
    const flying = state === 'flying' || state === 'approaching';
    const grounded = state === 'landed' ||
      ((state === 'booking' || state === 'confirmed') && bookingReturnTo === 'landed');
    // terrain addendum: how much taller the active destination's ground is than the plain
    // sphere radius the choreography's FLIGHT_Z/LANDED_Z constants were tuned against.
    const groundHeight = activeDestId ? (GROUND_HEIGHT_BY_DEST[activeDestId] ?? 0) : 0;

    // choreography triggers, read against the *previous* frame's state before it's overwritten below
    const landingTrigger = prevState.current === 'approaching' && state === 'landed';
    // Leaving 'confirmed' can land on 'flying' OR skip straight to 'approaching' — the
    // rig's own tick() (a separate component's useFrame) can synchronously re-enter range
    // of the same destination Nalu just celebrated at before this frame ever observes
    // 'flying', since Nalu is still parked right on top of it. Either is "just took off".
    // `intro -> flying` is NOT a takeoff (owner decision 2026-07-13): the intro hero
    // close-up handles its own exit (the blend below), instead of replaying the
    // ground-takeoff timeline the way it used to.
    const takeoffTrigger = prevState.current === 'landed' && state === 'flying'
      || (prevState.current === 'confirmed' && (state === 'flying' || state === 'approaching'));
    const celebrationTrigger = prevState.current === 'booking' && state === 'confirmed';
    const introExitTrigger = prevState.current === 'intro' && state === 'flying';
    if (prevState.current === 'flying' && state === 'approaching' && animate) wiggleT.current = 0;
    prevState.current = state;

    if (landingTrigger) { mode.current = 'landing'; modeT.current = 0; firedTouchdownFX.current = false; }
    if (takeoffTrigger) {
      mode.current = 'takeoff'; modeT.current = 0; firedSandKickFX.current = false;
    }
    if (celebrationTrigger) {
      mode.current = grounded ? 'celebrateGrounded' : 'celebrateAirborne';
      modeT.current = 0;
      firedSprayFX.current = false;
    }
    if (introExitTrigger) heroExitT.current = 0;

    // Intro hero close-up (owner decision 2026-07-13): 0 = fully the fixed hero studio pose,
    // 1 = fully the normal gravity-referenced flying pose. Stays 0 for the whole `intro`
    // state, then eases to 1 over `heroExitBlend`'s ~0.7s once intro ends, so the settle
    // into gameplay reads as one smooth motion instead of a pop.
    let heroBlend = 1;
    if (state === 'intro') {
      heroBlend = 0;
    } else if (heroExitT.current !== null) {
      heroBlend = heroExitBlend(heroExitT.current, !animate);
      heroExitT.current += dt;
      if (heroBlend >= 1) heroExitT.current = null;
    }

    if (wiggleT.current >= 0) {
      wiggleT.current += dt;
      rollWiggle.current = wiggleT.current <= 0.5
        ? 0.14 * Math.sin(2 * Math.PI * 4 * wiggleT.current)
        : 0;
      if (wiggleT.current > 0.5) wiggleT.current = -1;
    }
    approachDip.current = animate && state === 'approaching' ? -0.12 : 0;

    // Heading yaw: nose points where it flies. `flight.headingDeg` is a compass bearing
    // (0=north, 90=east, matching stepFlight's atan2(dx,dy)); the rig's own rotations put
    // north on screen-up (+Y) and east on screen-right (+X) at the fixed spot Nalu sits
    // (verified by composing the Rig's Rx(lat)*Ry(-lng) with latLngToVec3's tangent
    // vectors — both reduce to the identity screen mapping regardless of lat/lng). The
    // model is built nose-first along local +X, "up" (rotor/canopy) along local +Y;
    // `gravityAlignRef` (outer, below) tilts local +Y to the outward radial so the camera
    // looks down on the rotor instead of the old side profile. Spinning the nose about
    // local +Y *here*, before that outer tilt is applied, is still the flat "spin the icon
    // in the screen plane" rotation it always was — Y only becomes the camera-facing axis
    // one level up, and a rotation can't bend the very axis it's rotating about, so pointing
    // +X at screen-up still needs a +90° turn and at screen-right still needs 0°: same
    // rotation.y = 90° - heading math as a 2D icon spin, just on Y instead of the old Z now
    // that "up" (not depth) is what the outer tilt aims at the camera.
    // Intro hero close-up overrides this with its own fixed `HERO_YAW_Y` (blended via
    // `heroBlend`) instead of the heading-derived value — it's a fixed studio pose, not a
    // flight-heading read, and heading itself never changes during `intro` anyway (`tick()`
    // no-ops outside `flying`/`approaching`).
    const kYaw = Math.min(1, dt * 6);
    displayedHeadingDeg.current += shortestAngleDeg(displayedHeadingDeg.current, flight.headingDeg) * kYaw;
    const normalYaw = Math.PI / 2 - rad(displayedHeadingDeg.current);
    if (yawRef.current) yawRef.current.rotation.y = heroBlend >= 1 ? normalYaw : lerpN(HERO_YAW_Y, normalYaw, heroBlend);

    // Banking-roll lives *inside* the yaw group, rotating the body's own (unyawed) local X —
    // its longitudinal/nose-tail axis — so a bank always tips around whichever way the nose
    // currently points, not around the model's original build orientation. Pitch is folded
    // onto that *same* X axis (added, not a separate rotation on whichever axis yaw itself
    // uses): yawRef's own axis one level up is rotation.y (was rotation.z before the
    // gravity-referenced top-down rework) — putting pitch there instead would double up with
    // heading exactly the way an earlier version's rotation.z did, silently corrupting it by
    // up to ~0.35rad every time the pilot pushed up/down (rotating about the same axis on
    // nested groups just sums the angles), confirmed by an in-flight screenshot where "due
    // north" came out rotated. X stays clear of whichever axis yaw currently owns, so this
    // composition is safe regardless of which one that is.
    const targetRoll = flying ? -input.dx * 0.65 : 0;
    const k = Math.min(1, dt * 6);
    baseRoll.current += (targetRoll - baseRoll.current) * k;
    const bank = baseRoll.current + (animate ? rollWiggle.current : 0);

    if (mode.current !== 'none') {
      // landing/takeoff/celebration timeline owns position, pitch and scale this frame.
      // `autoRevert` is false for the grounded celebration: it holds the celebration pose
      // indefinitely (art-direction §7) until DONE fires the takeoff trigger above.
      const reduced = !animate;
      let duration: number;
      let autoRevert = true;
      let pose;
      switch (mode.current) {
        case 'landing':
          duration = reduced ? LANDING_DURATION_REDUCED : LANDING_DURATION;
          pose = landingPose(modeT.current, reduced);
          break;
        case 'takeoff':
          duration = reduced ? TAKEOFF_DURATION_REDUCED : TAKEOFF_DURATION;
          pose = takeoffPose(modeT.current, reduced);
          break;
        case 'celebrateGrounded':
          duration = Infinity;
          autoRevert = false;
          pose = celebrationGroundedPose(modeT.current, reduced);
          break;
        default: // celebrateAirborne
          duration = reduced ? CELEBRATION_AIRBORNE_DURATION_REDUCED : CELEBRATION_AIRBORNE_DURATION;
          pose = celebrationAirbornePose(modeT.current, reduced);
      }

      // pose.z ranges between FLIGHT_Z (flying) and LANDED_Z (grounded) across every one of
      // these timelines — this ratio is how "landed" the current instant is, independent of
      // which mode/phase produced it, so terrain height blends in smoothly during the
      // landing descent / takeoff climb instead of popping.
      const groundBlend = Math.min(1, Math.max(0, (pose.z - FLIGHT_Z) / (LANDED_Z - FLIGHT_Z)));
      groundBlendRef.current = groundBlend;

      ref.current.position.y = pose.y;
      ref.current.position.z = pose.z + groundHeight * groundBlend;
      if (bodyRef.current) bodyRef.current.rotation.x = bank + pose.pitch;
      ref.current.scale.set(BASE_SCALE * pose.scale[0], BASE_SCALE * pose.scale[1], BASE_SCALE * pose.scale[2]);

      // one-shot FX: full-motion only — reduced motion is explicitly particle-free (§4a/§4b/§7)
      if (!reduced && mode.current === 'landing' && !firedTouchdownFX.current && modeT.current >= TOUCHDOWN_FX_T) {
        firedTouchdownFX.current = true;
        const p = ref.current.position;
        burstRef.current?.spawn(dustPuffSpecs([p.x, p.y, p.z]));
        splashAge.current = 0;
      }
      if (!reduced && mode.current === 'takeoff' && !firedSandKickFX.current && modeT.current >= SAND_KICK_FX_T) {
        firedSandKickFX.current = true;
        const p = ref.current.position;
        burstRef.current?.spawn(sandKickSpecs([p.x, p.y, p.z]));
      }
      if (!reduced && !firedSprayFX.current) {
        const sprayT = mode.current === 'celebrateGrounded' ? SPRAY_FX_T_GROUNDED
          : mode.current === 'celebrateAirborne' ? SPRAY_FX_T_AIRBORNE : null;
        if (sprayT !== null && modeT.current >= sprayT) {
          firedSprayFX.current = true;
          const p = ref.current.position;
          burstRef.current?.spawn(spraySpecs([p.x, p.y, p.z]));
        }
      }

      modeT.current += dt;
      if (autoRevert && modeT.current >= duration) mode.current = 'none';
    } else {
      // steady state: rest pose for the current (non-transitioning) game state
      groundBlendRef.current = grounded ? 1 : 0;
      const bob = animate && (flying || state === 'intro') ? Math.sin(t.current * 3) * 0.02 : 0;
      const normalY = (grounded ? LANDED_Y : FLIGHT_Y) + bob;
      const normalZ = grounded ? LANDED_Z + groundHeight : FLIGHT_Z;
      if (heroBlend < 1) {
        // Hero close-up (intro + its settle-out): blend position/scale from the fixed
        // camera-ready pose toward the normal flying one, instead of switching outright, so
        // `intro -> flying` reads as one continuous motion rather than a pop.
        ref.current.position.x = lerpN(HERO_POS[0], 0, heroBlend);
        ref.current.position.y = lerpN(HERO_POS[1] + bob * 0.5, normalY, heroBlend);
        ref.current.position.z = lerpN(HERO_POS[2], normalZ, heroBlend);
        const scaleMult = lerpN(HERO_SCALE_MULT, 1, heroBlend);
        ref.current.scale.set(BASE_SCALE * scaleMult, BASE_SCALE * scaleMult, BASE_SCALE * scaleMult);
      } else {
        ref.current.position.x = 0;
        ref.current.position.y = normalY;
        ref.current.position.z = normalZ;
        ref.current.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);
      }
      const targetPitch = flying ? input.dy * 0.3 : 0;
      basePitch.current += (targetPitch - basePitch.current) * k;
      if (bodyRef.current) bodyRef.current.rotation.x = bank + basePitch.current + approachDip.current;
    }

    // Gravity-referenced orientation (owner decision 2026-07-13): tilt the whole heli
    // assembly so its local +Y (the model's own "up," rotor/canopy side) points along the
    // *live* outward radial at the heli's current position — opposite gravity, belly toward
    // the globe's center. Derived from the actual position vector every frame (not a
    // hardcoded direction) so it stays correct through the bob/landing/takeoff altitude
    // changes above. That outward radial is ~toward the fixed camera here (the heli sits
    // just off the globe's camera-facing surface), so this is what makes the camera look
    // down onto the rotor/cabin roof — a top-down toy-globe view — instead of the old side
    // profile, with no change to the camera or globe framing.
    outwardDir.current.copy(ref.current.position).normalize();
    if (gravityAlignRef.current) {
      if (heroBlend >= 1) {
        gravityAlignRef.current.quaternion.setFromUnitVectors(UP_AXIS, outwardDir.current);
      } else {
        // Hero close-up: slerp from the fixed studio orientation to the normal
        // gravity-referenced one as `heroBlend` goes 0->1, so orientation settles smoothly
        // alongside position/scale instead of popping once the blend finishes.
        tmpFlyQuat.current.setFromUnitVectors(UP_AXIS, outwardDir.current);
        gravityAlignRef.current.quaternion.slerpQuaternions(HERO_QUAT, tmpFlyQuat.current, heroBlend);
      }
    }

    // Main + tail rotor spin: fast whenever airborne (or mid landing/takeoff), a slow idle
    // tick while parked, frozen solid under reduced motion (no "nothing moves continuously"
    // exception for the rotor). Reusing the same smoothed speed to drive the blur-disc's
    // opacity means the disc fades in/out in lockstep with the blades actually speeding up,
    // instead of being a second, independently-tuned knob.
    const rotorFast = flying || mode.current === 'landing' || mode.current === 'takeoff';
    if (!animate) {
      rotorSpeed.current = 0;
    } else {
      const targetSpeed = rotorFast ? ROTOR_FLYING_SPEED : ROTOR_IDLE_SPEED;
      rotorSpeed.current += (targetSpeed - rotorSpeed.current) * Math.min(1, dt * 3);
    }
    rotorAngle.current += rotorSpeed.current * dt;
    tailRotorAngle.current += rotorSpeed.current * dt * 1.7;
    if (rotorRef.current) rotorRef.current.rotation.y = rotorAngle.current;
    // Tail rotor stays on Z: unlike the main rotor it's rigidly bolted to the tail boom (not
    // gravity-stabilized), so it's meant to turn with the airframe's own yaw/bank — exactly
    // what leaving it on the model's local Z (perpendicular to the boom) already gives.
    if (tailRotorRef.current) tailRotorRef.current.rotation.z = tailRotorAngle.current;
    if (rotorDiscRef.current) {
      const mat = rotorDiscRef.current.material as MeshBasicMaterial;
      mat.opacity = Math.min(1, rotorSpeed.current / ROTOR_FLYING_SPEED) * ROTOR_DISC_MAX_OPACITY;
    }

    // altitude shadow: world-space, radially projected onto the (possibly terrain-raised)
    // globe surface below the heli.
    const surfaceRadius = 1 + groundHeight * groundBlendRef.current;
    if (shadowRef.current) {
      shadowRef.current.position.copy(outwardDir.current).multiplyScalar(surfaceRadius + 0.002);
      shadowRef.current.lookAt(0, 0, 0);
      const altitude = Math.max(0.001, ref.current.position.y);
      const factor = Math.min(1.6, Math.max(0.8, 0.18 / altitude));
      shadowRef.current.scale.setScalar(0.055 * factor);
    }

    // splash ring: one-shot expanding foam ring fired alongside the touchdown dust puff
    if (splashAge.current >= 0 && splashRef.current) {
      splashAge.current += dt;
      const life = 0.5;
      if (splashAge.current >= life) {
        splashAge.current = -1;
        splashRef.current.visible = false;
      } else {
        const e = easeOutQuad(splashAge.current / life);
        splashRef.current.visible = true;
        splashRef.current.position.copy(outwardDir.current).multiplyScalar(surfaceRadius + 0.002);
        splashRef.current.lookAt(0, 0, 0);
        splashRef.current.scale.setScalar(0.04 + (0.12 - 0.04) * e);
        (splashRef.current.material as MeshBasicMaterial).opacity = 0.5 * (1 - e);
      }
    }
  });

  return (
    <>
      <group ref={ref} position={[0, 0.18, 1.25]} scale={BASE_SCALE}>
        <group ref={gravityAlignRef}>
          <group ref={yawRef}>
            <group ref={bodyRef}>
              {/* Cabin — plump rounded body, coral with a cream belly (§ "cabin ≈ 65% of the
               * mass"). +X is the nose. */}
              <mesh scale={[1.05, 0.95, 1]}>
                <sphereGeometry args={[1, 16, 14]} />
                <meshToonMaterial color={CORAL} gradientMap={getToonGradientMap()} />
              </mesh>
              <mesh position={[0.05, -0.5, 0]} scale={[0.85, 0.5, 0.78]}>
                <sphereGeometry args={[1, 14, 12]} />
                <meshToonMaterial color={CREAM} gradientMap={getToonGradientMap()} />
              </mesh>
              {/* Bubble nose — a rounded chin under the canopy. */}
              <mesh position={[0.95, -0.12, 0]} scale={[0.5, 0.42, 0.48]}>
                <sphereGeometry args={[1, 14, 12]} />
                <meshToonMaterial color={CORAL} gradientMap={getToonGradientMap()} />
              </mesh>
              {/* Cockpit face — the oversized ink glass canopy, this is where the cuteness
               * lives, plus two white highlight dots reading as a friendly glint/eyes. */}
              <mesh position={[0.55, 0.25, 0]} scale={[0.68, 0.6, 0.62]}>
                <sphereGeometry args={[1, 16, 14]} />
                <meshToonMaterial color={INK} gradientMap={getToonGradientMap()} />
              </mesh>
              {/* Positioned just outside the canopy sphere's own surface (not merely inside
               * its volume) so the highlight actually pokes through instead of being buried
               * and occluded by the canopy's own near face — confirmed by an early screenshot
               * where the dots were invisible at a smaller, more "centered" offset. */}
              {[1, -1].map((s) => (
                <mesh key={s} position={[0.95, 0.5, s * 0.44]} scale={[0.11, 0.11, 0.08]}>
                  <sphereGeometry args={[1, 8, 6]} />
                  <meshBasicMaterial color={CREAM} />
                </mesh>
              ))}

              {/* Main rotor — mast, sun-yellow hub, two paddle blades that spin fast in
               * flight / idle slow landed / freeze under reduced motion, plus a faint blur
               * disc that fades in with speed. */}
              <mesh position={[0, 1.05, 0]}>
                <cylinderGeometry args={[0.055, 0.06, 0.5, 8]} />
                <meshToonMaterial color={INK} gradientMap={getToonGradientMap()} />
              </mesh>
              <group ref={rotorRef} position={[0, 1.32, 0]}>
                <mesh scale={[0.2, 0.15, 0.2]}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshToonMaterial color={SUN} gradientMap={getToonGradientMap()} />
                </mesh>
                <RotorBlades scale={1} />
                {/* circleGeometry's default normal is local +Z; rotated here to +Y so it
                 * faces the same axis the blades above now spin about (see RotorBlades doc). */}
                <mesh ref={rotorDiscRef} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
                  <circleGeometry args={[1.05, 28]} />
                  <meshBasicMaterial color={SUN} transparent opacity={0} depthWrite={false} side={DoubleSide} />
                </mesh>
              </group>

              {/* Tail — a rounded taper flowing off the cabin (two overlapping spheres,
               * same overlap technique as the nose bubble above) so the boom reads as
               * one continuous chunky shape instead of a separate protruding stick,
               * plus a small fin/rotor accent tucked at the tip and kept subordinate
               * to the main rotor (owner note: the previous long boom + tall fin read
               * busy/spiky in silhouette at the near-edge-on intro camera angle). */}
              <mesh position={[-0.6, 0.08, 0]} scale={[0.4, 0.24, 0.24]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshToonMaterial color={CORAL} gradientMap={getToonGradientMap()} />
              </mesh>
              <mesh position={[-0.92, 0.08, 0]} scale={[0.22, 0.16, 0.16]}>
                <sphereGeometry args={[1, 10, 8]} />
                <meshToonMaterial color={CORAL} gradientMap={getToonGradientMap()} />
              </mesh>
              <mesh position={[-1, 0.2, 0]} rotation={[0, 0, 0.15]} scale={[0.11, 0.16, 0.11]}>
                <coneGeometry args={[1, 1, 8]} />
                <meshToonMaterial color={CORAL} gradientMap={getToonGradientMap()} />
              </mesh>
              <group ref={tailRotorRef} position={[-1, 0.08, 0.16]}>
                <mesh scale={0.07}>
                  <sphereGeometry args={[1, 8, 6]} />
                  <meshToonMaterial color={SUN} gradientMap={getToonGradientMap()} />
                </mesh>
                <RotorBlades scale={0.22} />
              </group>

              {/* Floats — two cream pontoons on short ink struts, for the coastal water
               * landings, tucked on the belly side (hidden from this top-down camera by
               * the cabin above them, same as on a real helicopter). */}
              {[1, -1].map((s) => (
                <group key={s}>
                  <mesh position={[0.02, -0.85, s * 0.4]} scale={[0.82, 0.16, 0.17]}>
                    <sphereGeometry args={[1, 12, 8]} />
                    <meshToonMaterial color={CREAM} gradientMap={getToonGradientMap()} />
                  </mesh>
                  <mesh position={[0.02, -0.68, s * 0.4]}>
                    <cylinderGeometry args={[0.035, 0.035, 0.3, 6]} />
                    <meshToonMaterial color={INK} gradientMap={getToonGradientMap()} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        </group>
      </group>
      {/* Drawn after (on top of) the heli: from this near-axial camera, the shadow's world
       * position sits almost directly behind the heli's own body in screen space, so normal
       * depth testing hid it completely behind its much-larger caster (confirmed with a
       * bright debug material). depthTest is disabled so the disc still reads as "shadow
       * peeking out from underneath" instead of vanishing; DoubleSide guards against the
       * lookAt-orientation ending up back-face-out toward the camera. */}
      <mesh ref={shadowRef} renderOrder={1}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial
          color={INK} transparent opacity={0.16}
          depthWrite={false} depthTest={false} side={DoubleSide}
        />
      </mesh>
      {/* Touchdown dust + sand-kick particles (art-direction §4a/§4b), pooled per §0 budget. */}
      <BurstFX ref={burstRef} />
      {/* Touchdown splash ring (§4a) — coastal foam expanding seaward of the contact point. */}
      <mesh ref={splashRef} visible={false} renderOrder={1}>
        <ringGeometry args={[0.9, 1, 24]} />
        <meshBasicMaterial
          color={CREAM} transparent opacity={0}
          depthWrite={false} depthTest={false} side={DoubleSide}
        />
      </mesh>
    </>
  );
}
