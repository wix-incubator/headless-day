import { easeInOutCubic, easeInQuad, easeOutBack, easeOutCubic, easeInOutSine, phase } from './ease';
import type { ParticleSpec } from './BurstFX';

export type Vec3 = [number, number, number];

export interface ChoreoPose {
  y: number;
  z: number;
  pitch: number;
  scale: Vec3;
  wingAngle: number;
  wingStretchZ: number;
}

export const FLIGHT_Y = 0.18;
export const FLIGHT_Z = 1.25;
export const LANDED_Y = 0.02;
export const LANDED_Z = 1.13;
export const GLIDE_WING_ANGLE = -0.07;
export const FOLDED_WING_ANGLE = 0.9;

export const LANDING_DURATION = 1.6;
export const LANDING_DURATION_REDUCED = 0.3;
export const TAKEOFF_DURATION = 1.1;
export const TAKEOFF_DURATION_REDUCED = 0.3;

// t at which the touchdown FX (dust puff + splash ring) fires, full-motion landing only.
export const TOUCHDOWN_FX_T = 0.9;
// t at which the sand-kick FX fires, full-motion takeoff only.
export const SAND_KICK_FX_T = 0.18;

/** 6 cream/buff feathers kicking up from the contact point (art-direction §4a touchdown FX). */
export function dustPuffSpecs(origin: Vec3): ParticleSpec[] {
  const colors = ['#F5E2B8', '#F5E2B8', '#F5E2B8', '#F5E2B8', '#FFFDF7', '#FFFDF7'];
  return colors.map((color, i) => {
    const angle = (i / colors.length) * Math.PI * 2;
    return {
      position: [origin[0], origin[1], origin[2]],
      velocity: [Math.cos(angle) * 0.25, 0.15, Math.sin(angle) * 0.25],
      gravity: 0.4, life: 0.45, color, size: 0.008 + (i % 3) * 0.004,
    };
  });
}

/** 4 sand specks kicked backward at the leap (art-direction §4b). */
export function sandKickSpecs(origin: Vec3): ParticleSpec[] {
  return Array.from({ length: 4 }, (_, i) => {
    const angle = Math.PI + (i - 1.5) * 0.3; // backward-ish fan
    return {
      position: [origin[0], origin[1], origin[2]],
      velocity: [Math.cos(angle) * 0.2, 0.1, Math.sin(angle) * 0.2],
      gravity: 0.5, life: 0.35, color: '#F2D8A7', size: 0.008,
    };
  });
}

// Sea-spray palette (art-direction §7) — explicitly not rainbow confetti.
const SPRAY_COLORS = ['#FFFDF7', '#FFFDF7', '#FFFDF7', '#FFFDF7', '#FFFDF7', '#FFFDF7', '#FFD166', '#FFD166', '#FFD166', '#FF7E6B'];

/** 10-particle celebration spray, arcing up/outward from the hop apex (or, airborne, from
 * the bird itself) — art-direction §7. */
export function spraySpecs(origin: Vec3): ParticleSpec[] {
  return SPRAY_COLORS.map((color, i) => {
    const angle = (i / SPRAY_COLORS.length) * Math.PI * 2;
    return {
      position: [origin[0], origin[1], origin[2]],
      velocity: [Math.cos(angle) * 0.35, 0.3 + (i % 3) * 0.05, Math.sin(angle) * 0.35],
      gravity: 0.5, life: 0.6, color, size: 0.006 + (i % 3) * 0.002,
    };
  });
}

function lerp(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerp3(a: Vec3, b: Vec3, t: number): Vec3 { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }

const RESTING_FLIGHT_POSE: ChoreoPose = {
  y: FLIGHT_Y, z: FLIGHT_Z, pitch: 0, scale: [1, 1, 1],
  wingAngle: GLIDE_WING_ANGLE, wingStretchZ: 1,
};

const RESTING_LANDED_POSE: ChoreoPose = {
  y: LANDED_Y, z: LANDED_Z, pitch: 0, scale: [1, 1, 1],
  wingAngle: FOLDED_WING_ANGLE, wingStretchZ: 1,
};

/** Landing choreography (art-direction §4a): bank & descend -> touchdown squash -> settle. */
export function landingPose(t: number, reduced: boolean): ChoreoPose {
  if (t >= (reduced ? LANDING_DURATION_REDUCED : LANDING_DURATION)) return RESTING_LANDED_POSE;

  if (reduced) {
    const e = easeOutCubic(phase(t, 0, LANDING_DURATION_REDUCED));
    return {
      y: lerp(FLIGHT_Y, LANDED_Y, e), z: lerp(FLIGHT_Z, LANDED_Z, e), pitch: 0, scale: [1, 1, 1],
      wingAngle: lerp(GLIDE_WING_ANGLE, FOLDED_WING_ANGLE, e), wingStretchZ: 1,
    };
  }

  if (t < 0.9) {
    // A — bank & descend
    const posE = easeInOutCubic(phase(t, 0, 0.9));
    const pitch = t < 0.55
      ? lerp(0, 0.21, easeOutCubic(phase(t, 0, 0.55)))
      : lerp(0.21, -0.31, easeOutCubic(phase(t, 0.55, 0.9)));
    return {
      y: lerp(FLIGHT_Y, LANDED_Y, posE), z: lerp(FLIGHT_Z, LANDED_Z, posE), pitch, scale: [1, 1, 1],
      wingAngle: lerp(GLIDE_WING_ANGLE, 0.02, easeOutCubic(phase(t, 0, 0.9))),
      wingStretchZ: lerp(1, 1.15, easeOutCubic(phase(t, 0, 0.9))),
    };
  }

  if (t < 1.05) {
    // B — touchdown squash
    const scale: Vec3 = t < 0.96
      ? lerp3([1, 1, 1], [1.15, 0.72, 1.15], easeInQuad(phase(t, 0.9, 0.96)))
      : lerp3([1.15, 0.72, 1.15], [0.97, 1.06, 0.97], easeOutBack(phase(t, 0.96, 1.05)));
    return {
      y: LANDED_Y, z: LANDED_Z, pitch: -0.31, scale,
      wingAngle: lerp(0.02, FOLDED_WING_ANGLE, easeOutCubic(phase(t, 0.9, 1.05))), wingStretchZ: 1,
    };
  }

  // C — settle
  const e = easeOutCubic(phase(t, 1.05, 1.6));
  return {
    y: LANDED_Y, z: LANDED_Z,
    pitch: lerp(-0.31, 0, e),
    scale: lerp3([0.97, 1.06, 0.97], [1, 1, 1], e),
    wingAngle: FOLDED_WING_ANGLE, wingStretchZ: 1,
  };
}

/** Takeoff choreography (art-direction §4b): crouch -> leap -> climb-out. */
export function takeoffPose(t: number, reduced: boolean): ChoreoPose {
  if (t >= (reduced ? TAKEOFF_DURATION_REDUCED : TAKEOFF_DURATION)) return RESTING_FLIGHT_POSE;

  if (reduced) {
    const e = easeOutCubic(phase(t, 0, TAKEOFF_DURATION_REDUCED));
    return {
      y: lerp(LANDED_Y, FLIGHT_Y, e), z: lerp(LANDED_Z, FLIGHT_Z, e), pitch: 0, scale: [1, 1, 1],
      wingAngle: lerp(FOLDED_WING_ANGLE, GLIDE_WING_ANGLE, e), wingStretchZ: 1,
    };
  }

  // z reveals smoothly across the whole takeoff, independent of y's overshoot-then-settle arc
  const z = lerp(LANDED_Z, FLIGHT_Z, easeInOutSine(phase(t, 0, TAKEOFF_DURATION)));

  if (t < 0.18) {
    // A — crouch
    const e = easeInQuad(phase(t, 0, 0.18));
    return {
      y: LANDED_Y, z, pitch: lerp(0, -0.35, e), scale: lerp3([1, 1, 1], [1.08, 0.8, 1.08], e),
      wingAngle: FOLDED_WING_ANGLE, wingStretchZ: 1,
    };
  }

  if (t < 0.55) {
    // B — leap, with a 1.5x downstroke completing at t=0.35
    const e = easeOutCubic(phase(t, 0.18, 0.55));
    const downstroke = GLIDE_WING_ANGLE + 1.5 * 0.55 * Math.sin(Math.PI * phase(t, 0.18, 0.35));
    return {
      y: lerp(LANDED_Y, 0.24, e), z, pitch: -0.35, scale: lerp3([1.08, 0.8, 1.08], [0.95, 1.15, 0.95], e),
      wingAngle: downstroke, wingStretchZ: 1,
    };
  }

  // C — climb-out
  const e = easeInOutSine(phase(t, 0.55, 1.1));
  return {
    y: lerp(0.24, FLIGHT_Y, e), z, pitch: lerp(-0.35, 0, e), scale: lerp3([0.95, 1.15, 0.95], [1, 1, 1], e),
    wingAngle: GLIDE_WING_ANGLE, wingStretchZ: 1,
  };
}

// --- Confirmation celebration (art-direction §7) ---------------------------------------

const HOP_DURATION = 0.45; // each of the two hops
// owner decision 2026-07-13 (surfboard removed): the celebration no longer raises a board
// overhead first — hopping starts immediately at t=0.
export const CELEBRATION_HOPS_END = 2 * HOP_DURATION; // 0.9
export const CELEBRATION_AIRBORNE_DURATION = 0.6;
export const CELEBRATION_AIRBORNE_DURATION_REDUCED = 0.15;
// spray fires at the first hop's apex (grounded) or shortly after the flare (airborne)
export const SPRAY_FX_T_GROUNDED = HOP_DURATION / 2; // 0.225
export const SPRAY_FX_T_AIRBORNE = 0.2;

const HOP_HEIGHT = 0.05;
const SQUASH_WINDOW = 0.08; // seconds of squash right at each landing
const HALF_SPREAD_WING_ANGLE = (FOLDED_WING_ANGLE + GLIDE_WING_ANGLE) / 2;
const FLARE_WING_ANGLE = -0.35;

/** Grounded confirmation celebration: two happy hops (art-direction §7). Holds the settled
 * ground pose past `CELEBRATION_HOPS_END` — the caller keeps calling this (never falls back
 * to a resting pose on its own) until takeoff's own trigger fires on DONE. Reduced motion
 * skips the hops entirely (no continuous motion) and sits at the same settled ground pose. */
export function celebrationGroundedPose(t: number, reduced: boolean): ChoreoPose {
  if (reduced || t >= CELEBRATION_HOPS_END) return RESTING_LANDED_POSE;

  const localT = t % HOP_DURATION;
  const half = HOP_DURATION / 2;
  const rising = localT < half;
  let y: number;
  let scale: Vec3 = [1, 1, 1];
  if (rising) {
    y = LANDED_Y + HOP_HEIGHT * easeOutCubic(phase(localT, 0, half));
  } else {
    y = LANDED_Y + HOP_HEIGHT * (1 - easeInQuad(phase(localT, half, HOP_DURATION)));
    const toLanding = HOP_DURATION - localT;
    if (toLanding < SQUASH_WINDOW) {
      scale = lerp3([1, 1, 1], [1.1, 0.85, 1.1], 1 - toLanding / SQUASH_WINDOW);
    }
  }
  return {
    y, z: LANDED_Z, pitch: 0, scale,
    wingAngle: HALF_SPREAD_WING_ANGLE, wingStretchZ: 1,
  };
}

/** Airborne confirmation celebration: no hops — just a brief wing flare (art-direction §7
 * "if airborne ... skip hops; wings flare + spray burst only"). */
export function celebrationAirbornePose(t: number, reduced: boolean): ChoreoPose {
  const duration = reduced ? CELEBRATION_AIRBORNE_DURATION_REDUCED : CELEBRATION_AIRBORNE_DURATION;
  const e = t >= duration ? 0 : Math.sin(Math.PI * phase(t, 0, duration));
  return {
    y: FLIGHT_Y, z: FLIGHT_Z, pitch: 0, scale: [1, 1, 1],
    wingAngle: lerp(GLIDE_WING_ANGLE, FLARE_WING_ANGLE, e), wingStretchZ: 1,
  };
}

// --- Intro hero close-up (owner decision 2026-07-13) -----------------------------------
// While `state === 'intro'`, Nalu poses front-and-center for the camera instead of sitting
// in the top-down gravity-referenced flying pose, so the fixed speech bubble reads as
// addressing a character instead of narrating a background prop. Position/scale share the
// bird's own world-space units (same frame as FLIGHT_Y/FLIGHT_Z); the three-quarter facing
// orientation itself is a fixed studio-style quaternion built in `Bird.tsx` (not derived
// from gravity/heading the way the normal flying alignment is), so it lives there instead
// of here.
export const HERO_POS: Vec3 = [-0.2, 0.16, 1.7];
export const HERO_SCALE_MULT = 1.5; // multiplier over BASE_SCALE, on top of (not replacing) it
export const HERO_EXIT_DURATION = 0.7; // owner spec: ~0.7s ease-out settle back into flying

/** Blend factor for the `intro -> flying` exit, `t` seconds after it fired: 0 = still fully
 * in the hero pose, 1 = fully settled into the normal flying pose. Reduced motion snaps
 * straight to 1 (no continuous motion). */
export function heroExitBlend(t: number, reduced: boolean): number {
  if (reduced || t >= HERO_EXIT_DURATION) return 1;
  return easeOutCubic(phase(t, 0, HERO_EXIT_DURATION));
}
