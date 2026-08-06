/**
 * Ground-hazard lifecycle (pure; no RNG/clock). A hazard warns for `telegraph` seconds, then deals
 * `dps` to players within `radius` for `duration` seconds, then despawns. Damage application lives in
 * the sim (it needs the player set); this module owns only the per-hazard time evolution.
 */

import type { Hazard } from "./types";

/** A hazard deals damage only after its telegraph has fully elapsed. */
export function hazardActive(h: Hazard): boolean {
  return h.telegraph <= 0;
}

/**
 * Advance one hazard by dt. The telegraph burns down FIRST (any dt overshoot past 0 is dropped, not
 * charged to the active window — the full damage window is always honoured). Then it diverges by shape:
 *  - BURST (burst set): the tick its telegraph reaches 0 it DETONATES (`detonated: true`) and is spent
 *    (`hazard: null`) — it never enters an active-duration phase; the caller applies `burst` on that tick.
 *  - POOL (dps): once active, `duration` burns down; returns null when the window is spent.
 * Returns { hazard: null } when the hazard is gone (spent burst, or drained pool).
 */
export function stepHazard(h: Hazard, dt: number): { hazard: Hazard | null; detonated: boolean } {
  if (h.telegraph > 0) {
    const telegraph = Math.max(0, h.telegraph - dt);
    if (telegraph <= 0 && h.burst) return { hazard: null, detonated: true };
    return { hazard: { ...h, telegraph }, detonated: false };
  }
  const duration = h.duration - dt;
  return { hazard: duration > 0 ? { ...h, duration } : null, detonated: false };
}
