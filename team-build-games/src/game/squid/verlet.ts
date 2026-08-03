/**
 * Minimal fixed-iteration verlet solver — the squid's whole physics engine.
 * Pure: both entry points clone their inputs and return new arrays. Determinism
 * comes from fixed iteration counts and fixed array order (no RNG, no clock).
 */

import { DAMPING, GRAVITY_MPS2, GROUND_FRICTION, SOLVER_ITERATIONS, X_MAX_M, X_MIN_M } from "./constants";
import type { DistCon, VPoint } from "./types";

const clone = (points: VPoint[]): VPoint[] =>
  points.map((p) => ({ pos: { ...p.pos }, prev: { ...p.prev } }));

/** Verlet integration: inertia + gravity + damping. Pure. */
export function integrate(points: VPoint[], dt: number): VPoint[] {
  return points.map((p) => {
    const vx = (p.pos.x - p.prev.x) * DAMPING;
    const vy = (p.pos.y - p.prev.y) * DAMPING;
    return {
      prev: { ...p.pos },
      pos: { x: p.pos.x + vx, y: p.pos.y + vy - GRAVITY_MPS2 * dt * dt },
    };
  });
}

/**
 * Relax distance constraints (SOLVER_ITERATIONS passes) with pinned points immovable,
 * colliding against the ground profile after each pass. Pure.
 */
export function solve(
  points: VPoint[],
  constraints: DistCon[],
  pinned: boolean[],
  groundAt: (x: number) => number | null,
): VPoint[] {
  const pts = clone(points);

  for (let it = 0; it < SOLVER_ITERATIONS; it++) {
    for (const c of constraints) {
      const a = pts[c.a]!;
      const b = pts[c.b]!;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const diff = (d - c.len) / d;
      const aPin = pinned[c.a] === true;
      const bPin = pinned[c.b] === true;
      if (aPin && bPin) continue;
      const wa = aPin ? 0 : bPin ? 1 : 0.5;
      const wb = aPin ? 1 : bPin ? 0 : 0.5;
      a.pos.x += dx * diff * wa;
      a.pos.y += dy * diff * wa;
      b.pos.x -= dx * diff * wb;
      b.pos.y -= dy * diff * wb;
    }

    for (let i = 0; i < pts.length; i++) {
      if (pinned[i] === true) continue;
      const p = pts[i]!;
      p.pos.x = Math.min(X_MAX_M, Math.max(X_MIN_M, p.pos.x));
      const g = groundAt(p.pos.x);
      if (g !== null && p.pos.y < g) {
        p.pos.y = g;
        // ground friction: bleed horizontal velocity while touching
        p.prev.x = p.pos.x - (p.pos.x - p.prev.x) * (1 - GROUND_FRICTION);
      }
    }
  }
  return pts;
}
