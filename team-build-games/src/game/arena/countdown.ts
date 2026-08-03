/**
 * Pure pre-match countdown model. No engine/DOM/clock — `dt` is injected.
 * The UI fires the tik-tok / GO audio off `countdownNumber` transitions.
 */

import { COUNTDOWN_S } from "../constants";

export interface Countdown {
  /** Seconds remaining until the match starts. */
  remaining: number;
}

export function startCountdown(seconds = COUNTDOWN_S): Countdown {
  return { remaining: seconds };
}

export function tickCountdown(c: Countdown, dt: number): Countdown {
  return { remaining: Math.max(0, c.remaining - dt) };
}

/** The number to show: 3, 2, 1, then 0 ("GO"). */
export function countdownNumber(c: Countdown): number {
  return Math.ceil(c.remaining);
}

export function isCountdownDone(c: Countdown): boolean {
  return c.remaining <= 0;
}
