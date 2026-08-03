/**
 * Pure steering helpers for survival enemies (P-A2): pick a target, crawl toward it, and push apart
 * from crowding neighbours. No clock/RNG — the host applies these deterministically each tick, in
 * sorted-id order, so every peer reproduces identical enemy motion.
 */

import type { Vec2 } from "../types";

export interface Steerable {
  id: string;
  pos: Vec2;
  status: "alive" | "dead";
}

/** The nearest ALIVE player to `from` (enemies chase the closest ally), or null if none are alive. */
export function nearestPlayer(from: Vec2, players: Steerable[]): { id: string; pos: Vec2 } | null {
  let best: { id: string; pos: Vec2 } | null = null;
  let bestD = Infinity;
  for (const p of players) {
    if (p.status !== "alive") continue;
    const d = (p.pos.x - from.x) ** 2 + (p.pos.y - from.y) ** 2;
    if (d < bestD) {
      bestD = d;
      best = { id: p.id, pos: p.pos };
    }
  }
  return best;
}

/** Move `dist` metres from `from` toward `target`, snapping to it if within one step. */
export function stepToward(from: Vec2, target: Vec2, dist: number): Vec2 {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len === 0 || len <= dist) return { x: target.x, y: target.y };
  return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist };
}

/** A push vector away from any neighbour closer than `minDist` (0,0 when the area is clear). */
export function separation(self: Vec2, others: Vec2[], minDist: number): Vec2 {
  let px = 0;
  let py = 0;
  for (const o of others) {
    const dx = self.x - o.x;
    const dy = self.y - o.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < minDist) {
      const strength = (minDist - d) / minDist;
      px += (dx / d) * strength;
      py += (dy / d) * strength;
    }
  }
  return { x: px, y: py };
}
