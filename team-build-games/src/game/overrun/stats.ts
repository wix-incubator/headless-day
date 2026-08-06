/**
 * Run-stat derivations + the merch-print payload (fed through the existing
 * sanitizePayload/buildShopUrl funnel by the island — this stays pure strings).
 */

import type { PlayerId, ShooterStats, ShooterWorld } from "./types";

/** Landed trigger-pulls over total, in [0,1]; 0 when no shots fired. */
export function accuracy(s: ShooterStats): number {
  return s.shots === 0 ? 0 : s.hits / s.shots;
}

/** Scorecard line for the trophy shop: title ≤24 chars, sub ≤36 (print.ts clamps anyway). */
export function buildOverrunPrintPayload(world: ShooterWorld, id: PlayerId): { title: string; sub: string } {
  const p = world.players[id];
  const kills = p?.stats.kills ?? 0;
  const acc = Math.round(accuracy(p?.stats ?? { shots: 0, hits: 0, kills: 0 }) * 100);
  const level = p?.level ?? 0;
  return {
    title: `OVERRUN · WAVE ${world.wave}`,
    sub: `${kills} KILLS · ${acc}% ACC · LVL ${level}`,
  };
}
