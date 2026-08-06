/**
 * Pure ranged-projectile helpers (bow arrows now; the foundation the shooter's guns build on).
 * No engine/DOM/clock/RNG — the host advances projectiles in `stepWorld` and broadcasts them in the
 * snapshot, so every peer sees identical flight. Ids are `${ownerId}#${tick}` (fire rate is
 * cooldown-gated → unique per shot), which keeps spawning deterministic without a mutable counter.
 */

import type { PlayerId, Projectile, Vec2 } from "./types";
import type { Hittable } from "./combat";
import { aimVector } from "./logic";
import { FIGURE_RADIUS_M, PROJECTILE_RADIUS_M } from "../constants";

export interface SpawnArrowSpec {
  ownerId: PlayerId;
  pos: Vec2;
  aim: number;
  tick: number;
  speed: number;
  range: number;
  damage: number;
  knockback: number;
}

export interface SpawnCrushingWaveSpec extends SpawnArrowSpec {
  radius: number;
}

export interface SpawnSolarWaveSpec {
  ownerId: PlayerId;
  pos: Vec2;
  tick: number;
  radius: number;
  speed: number;
  damage: number;
  knockback: number;
}

/** Launch an arrow from `pos` along `aim` at `speed`; travels `range` meters before expiring. */
export function spawnArrow(s: SpawnArrowSpec): Projectile {
  const v = aimVector(s.aim);
  return {
    id: `${s.ownerId}#${s.tick}`,
    ownerId: s.ownerId,
    kind: "arrow",
    pos: { x: s.pos.x, y: s.pos.y },
    vel: { x: v.x * s.speed, y: v.y * s.speed },
    distRemaining: s.range,
    damage: s.damage,
    knockback: s.knockback,
  };
}

/** Launch Neon Ronin's 1 m-diameter, piercing crushing wave. */
export function spawnCrushingWave(s: SpawnCrushingWaveSpec): Projectile {
  return {
    ...spawnArrow(s),
    kind: "crushing-wave",
    radius: s.radius,
    hitIds: [],
    connected: false,
  };
}

/** Start Solar Warden's stationary ground ring, expanding from zero to `radius`. */
export function spawnSolarWave(s: SpawnSolarWaveSpec): Projectile {
  return {
    id: `${s.ownerId}#${s.tick}`,
    ownerId: s.ownerId,
    kind: "solar-wave",
    pos: { ...s.pos },
    vel: { x: 0, y: 0 },
    distRemaining: s.radius,
    damage: s.damage,
    knockback: s.knockback,
    radius: 0,
    expansionSpeed: s.speed,
    hitIds: [],
    connected: false,
  };
}

/** Advance a projectile one tick, spending range by the distance travelled. */
export function advanceProjectile(p: Projectile, dt: number): Projectile {
  if (p.kind === "solar-wave") {
    const growth = Math.min(p.distRemaining, (p.expansionSpeed ?? 0) * dt);
    return {
      ...p,
      radius: (p.radius ?? 0) + growth,
      distRemaining: p.distRemaining - growth,
    };
  }
  const step = Math.hypot(p.vel.x, p.vel.y) * dt;
  return {
    ...p,
    pos: { x: p.pos.x + p.vel.x * dt, y: p.pos.y + p.vel.y * dt },
    distRemaining: p.distRemaining - step,
  };
}

/**
 * The nearest alive, non-owner target whose body the projectile overlaps, or null. Resolves against
 * any `Hittable` (id/pos/status) so an arrow lands on other players in versus AND on enemies in
 * survival. (Team-agnostic for now — versus is FFA; a team check slots in here for co-op.)
 */
export function projectileTarget(p: Projectile, targets: readonly Hittable[]): PlayerId | null {
  return projectileTargets(p, targets)[0] ?? null;
}

/** Every overlapping target, nearest first. Waves use this to pierce without damaging twice. */
export function projectileTargets(p: Projectile, targets: readonly Hittable[]): PlayerId[] {
  const projRadius = p.radius ?? PROJECTILE_RADIUS_M;
  const ignored = new Set(p.hitIds ?? []);
  const hits: Array<{ id: PlayerId; distance: number }> = [];
  for (const t of targets) {
    if (t.id === p.ownerId || t.status !== "alive" || ignored.has(t.id)) continue;
    // Each target's own body radius (defaults to the player figure) so the overlap matches its sprite.
    const reach = (t.hitRadius ?? FIGURE_RADIUS_M) + projRadius;
    const d = Math.hypot(t.pos.x - p.pos.x, t.pos.y - p.pos.y);
    if (d <= reach) hits.push({ id: t.id, distance: d });
  }
  hits.sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id));
  return hits.map((hit) => hit.id);
}
