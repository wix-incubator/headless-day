/**
 * Pure circle-vs-wall movement resolution for labyrinth arenas (P9 / F6).
 *
 * Given a player's intended move `from → to` (a circle of `radius`), return the furthest point that
 * doesn't push the circle through any wall. Resolution is axis-separated (try full move, then X-only,
 * then Y-only) so a player moving diagonally into a wall SLIDES along it instead of sticking. No
 * clock/RNG — deterministic, so host and clients resolve movement identically. Walls come from the
 * seeded `generateMaze` output; the field's outer edge is handled separately by the sim's clamp.
 */

import type { Vec2 } from "./types";
import type { WallSeg } from "./maze";

/** Shortest distance from point (px,py) to a segment. */
function distToSeg(px: number, py: number, w: WallSeg): number {
  const dx = w.x2 - w.x1;
  const dy = w.y2 - w.y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - w.x1) * dx + (py - w.y1) * dy) / len2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return Math.hypot(px - (w.x1 + t * dx), py - (w.y1 + t * dy));
}

/** Would a circle of `radius` centred at `p` overlap any wall? */
function overlaps(p: Vec2, radius: number, walls: WallSeg[]): boolean {
  for (const w of walls) if (distToSeg(p.x, p.y, w) < radius) return true;
  return false;
}

/** Resolve a move `from → to` for a circle of `radius` against `walls`, sliding along blocked axes. */
export function slideAgainstWalls(from: Vec2, to: Vec2, radius: number, walls: WallSeg[]): Vec2 {
  if (walls.length === 0 || !overlaps(to, radius, walls)) return to;
  const xOnly: Vec2 = { x: to.x, y: from.y };
  const yOnly: Vec2 = { x: from.x, y: to.y };
  const xOk = !overlaps(xOnly, radius, walls);
  const yOk = !overlaps(yOnly, radius, walls);
  if (xOk && !yOk) return xOnly;
  if (yOk && !xOk) return yOnly;
  // Both single-axis moves clear but the diagonal doesn't (grazing a corner) → keep the larger slide.
  if (xOk && yOk) return Math.abs(to.x - from.x) >= Math.abs(to.y - from.y) ? xOnly : yOnly;
  return from; // boxed in on both axes
}
