/**
 * Pure enemy spawn geometry (P-A3). Survival creatures appear just OUTSIDE the square field at a
 * wave-chosen angle, then crawl toward the party in the centre. Placing on a circle beyond the far
 * corner (radius = half-diagonal + margin) guarantees the point is outside the field for any angle.
 * Deterministic — the angle comes from the seeded wave plan.
 */

import type { Vec2 } from "../types";

export function enemySpawnPoint(angle: number, fieldM: number, margin = 2): Vec2 {
  const c = fieldM / 2;
  const r = c * Math.SQRT2 + margin; // past the farthest corner ⇒ outside the field at every angle
  return { x: c + Math.cos(angle) * r, y: c + Math.sin(angle) * r };
}
