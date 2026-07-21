import type { GameStateName } from '../game/machine';

export interface CameraPose {
  position: readonly [number, number, number];
  lookAt: readonly [number, number, number];
}

const DIORAMA_STATES = new Set<GameStateName>(['landed', 'booking', 'confirmed']);

// FAR (thesis §2A): exactly today's whole-globe framing, camera on the +Z axis looking
// straight at the origin — unchanged from the pre-existing CAMERA_Z_FAR/CameraZoom
// behavior, kept pixel-identical.
export const CAMERA_POSE_FAR: CameraPose = {
  position: [0, 0, 3.2],
  lookAt: [0, 0, 0],
};

// --- DIORAMA derivation (thesis §2A, the descend-from-orbit flagship) -----------------
// The Rig always rotates whichever destination is active to face world +Z, so the
// touchdown point's own surface normal is always exactly (0,0,1) regardless of which of
// the 12 spots is active — the diorama is therefore one fixed vantage, not per-destination.
// `VIGNETTE_PIVOT` approximates the center of the landed cluster around that axis (heli
// LANDED_Y=0.02/LANDED_Z=1.13 from choreography.ts, flag/landmark sitting a little further
// out and to the side per vignettes.ts's dLat/dLng offsets) — exported only so the unit
// test below can check the derivation's geometry, not read anywhere else at runtime.
export const VIGNETTE_PIVOT: readonly [number, number, number] = [0, 0.1, 1.08];
// Angle off the touchdown normal (0,0,1) — inside the brief's 45-55deg band.
const TILT_OFF_NORMAL_DEG = 50;
// Distance from the pivot along that tilted direction: close enough that the globe's own
// limb reads as a nearby horizon rather than a distant disc. The heli/cloud layer already
// live at 1.13-1.2R; a camera hovering far above that (the way the old on-axis NEAR dolly
// sat at z=2.4) would just keep showing the whole disc, not a horizon.
const DIORAMA_DISTANCE = 1.25;

function computeDioramaPosition(): [number, number, number] {
  const tilt = (TILT_OFF_NORMAL_DEG * Math.PI) / 180;
  // Lean south (-Y) off the normal — an arbitrary but fixed azimuth choice; the on-screen
  // left/right framing bias is a separate concern, handled by the lookAt offset below.
  const dir: [number, number, number] = [0, -Math.sin(tilt), Math.cos(tilt)];
  return [
    VIGNETTE_PIVOT[0] + dir[0] * DIORAMA_DISTANCE,
    VIGNETTE_PIVOT[1] + dir[1] * DIORAMA_DISTANCE,
    VIGNETTE_PIVOT[2] + dir[2] * DIORAMA_DISTANCE,
  ];
}

// lookAt is offset right/up of `VIGNETTE_PIVOT` (not centered on it) so the subject renders
// left-of-center on screen, clearing the right third of the viewport where the DOM info
// card docks (`.bb-info { right: 3%; width: min(360px, 31vw) }` in game.css). Hand-tuned
// alongside the derivation above against headless screenshots at oahu/teahupoo/jbay (see
// .superpowers/sdd/diorama-*.png + the task report).
export const CAMERA_POSE_DIORAMA: CameraPose = {
  position: computeDioramaPosition(),
  lookAt: [0.24, 0.16, 0.98],
};

/** Single source of truth for "which states use the diorama framing" — shared by the
 * camera pose above and the flag-orientation blend (Markers.tsx), which needs the same
 * landed/booking/confirmed split to fade flags from camera-billboarded toward
 * tangent-to-surface once the camera leaves the +Z axis (thesis §4). */
export function isDioramaState(state: GameStateName): boolean {
  return DIORAMA_STATES.has(state);
}

export function selectCameraPose(state: GameStateName): CameraPose {
  return isDioramaState(state) ? CAMERA_POSE_DIORAMA : CAMERA_POSE_FAR;
}
