/**
 * Pure dash state machine. No engine/DOM/clock — `dt` and distance are injected.
 *
 * Spec: dash = 4× run speed over a 2 m burst, then a 3 s cooldown. The cooldown
 * clock starts the instant the dash begins; the burst ends once 2 m are travelled.
 */

import type { DashState } from "./types";
import { DASH_COOLDOWN_S, DASH_DIST_M, DASH_MULT } from "../constants";

/** Fresh, ready-to-use dash state. */
export function initialDash(): DashState {
  return { cooldownRemaining: 0, dashing: false, distRemaining: 0 };
}

/** Begin a dash if off cooldown and not already dashing; otherwise return unchanged. */
export function tryStartDash(d: DashState): DashState {
  if (d.cooldownRemaining > 0 || d.dashing) return d;
  return {
    cooldownRemaining: DASH_COOLDOWN_S,
    dashing: true,
    distRemaining: DASH_DIST_M,
  };
}

/** Advance the cooldown clock by `dt` seconds (floored at 0). Always runs. */
export function tickDashCooldown(d: DashState, dt: number): DashState {
  if (d.cooldownRemaining <= 0) return d;
  return { ...d, cooldownRemaining: Math.max(0, d.cooldownRemaining - dt) };
}

/** Consume `dist` meters of the dash burst; end the dash once it's spent. */
export function consumeDashDistance(d: DashState, dist: number): DashState {
  if (!d.dashing) return d;
  const remaining = d.distRemaining - dist;
  if (remaining <= 0) return { ...d, dashing: false, distRemaining: 0 };
  return { ...d, distRemaining: remaining };
}

/** Run-speed multiplier for this tick (DASH_MULT while dashing, else 1). */
export function dashSpeedMultiplier(d: DashState): number {
  return d.dashing ? DASH_MULT : 1;
}

/** Recharge progress in [0,1]: 0 right after use → 1 when fully recharged (UI sweep). */
export function dashCooldownFraction(d: DashState): number {
  const f = 1 - d.cooldownRemaining / DASH_COOLDOWN_S;
  return Math.max(0, Math.min(1, f));
}
