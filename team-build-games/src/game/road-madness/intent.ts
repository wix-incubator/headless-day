import type { DriveIntent, RawDriveInput } from "./types";

const clampUnit = (value: number): number => Math.max(-1, Math.min(1, value));

export const IDLE_DRIVE_INTENT: DriveIntent = {
  throttle: 0,
  steer: 0,
  handbrake: false,
  boost: false,
};

export function inputToDriveIntent(raw: RawDriveInput): DriveIntent {
  return {
    throttle: (raw.up ? 1 : 0) - (raw.down ? 1 : 0),
    steer: (raw.right ? 1 : 0) - (raw.left ? 1 : 0),
    handbrake: raw.handbrake,
    boost: raw.boost,
  };
}

/** Host trust boundary: discard everything except finite, clamped driving controls. */
export function coerceDriveIntent(raw: unknown): DriveIntent {
  const value = (raw ?? {}) as Partial<DriveIntent>;
  const throttle = Number.isFinite(value.throttle) ? clampUnit(value.throttle as number) : 0;
  const steer = Number.isFinite(value.steer) ? clampUnit(value.steer as number) : 0;
  return {
    throttle,
    steer,
    handbrake: value.handbrake === true,
    boost: value.boost === true,
  };
}

