/**
 * Pure attack resolution. No engine/DOM/clock/RNG.
 *
 * An attack reaches SWORD_REACH_M meters in the attacker's (locked) facing direction,
 * inside a forward cone (ATTACK_CONE_HALF_ANGLE). Each hit is a -1 health event;
 * damage is resolved once, on the tick the swing is initiated.
 */

import type { PlayerId, PlayerState, Projectile, Vec2 } from "./types";
import { aimVector } from "./logic";
import { WEAPONS } from "./weapons";
import {
  ATTACK_COOLDOWN_S,
  BLOCK_COOLDOWN_S,
  BLOCK_WIDTH_MULT,
  FIGURE_HIT_HEIGHT_M,
  FIGURE_RADIUS_M,
  MELEE_BODY_SAMPLE_M,
} from "../constants";

export interface DamageEvent {
  fromId: PlayerId;
  targetId: PlayerId;
}

/**
 * Anything an attack can land on — a player OR a survival enemy. Only id/pos/status are needed to
 * resolve a hit, so the same cone/line geometry serves both modes (players-vs-players in versus,
 * players-vs-enemies in survival). `PlayerState` and `EnemyState` are both structurally `Hittable`.
 */
export interface Hittable {
  id: PlayerId;
  pos: Vec2;
  status: "alive" | "dead";
  /**
   * Footprint radius (metres) — the capsule's width. Defaults to the player figure radius; survival
   * enemies pass their per-kind radius (a bat is small, the dino large) so the zone matches the sprite.
   */
  hitRadius?: number;
  /**
   * Drawn body height (metres, world-y) above the footprint — the capsule's vertical extent. The
   * hit test sweeps the footprint circle from the foot up to this height, so a swing aimed anywhere
   * up the tall 2.5D silhouette (foot→head) connects. Defaults to the player figure height; a flat
   * target passes 0 for a plain disc.
   */
  hitHeight?: number;
}

/** Attack recharge progress in [0,1]: 0 just after a swing → 1 when ready (UI sweep). */
export function attackCooldownFraction(
  remainingS: number,
  total = ATTACK_COOLDOWN_S,
): number {
  return Math.max(0, Math.min(1, 1 - remainingS / total));
}

/** Block recharge progress in [0,1]: 0 on use → 1 after one second. */
export function blockCooldownFraction(remainingS: number): number {
  return Math.max(0, Math.min(1, 1 - remainingS / BLOCK_COOLDOWN_S));
}

/**
 * Whether a blocking defender is covering the direction of `source`. The guard uses the
 * defender's weapon arc, widened by 20%; thrust and ranged weapons receive the sword-sized
 * baseline so every loadout has a usable defensive stance.
 */
export function blockCoversSource(
  defender: PlayerState,
  source: Vec2,
): boolean {
  if (defender.status !== "alive" || !defender.block) return false;
  const weapon = WEAPONS[defender.weapon];
  const baseHalfAngle = Math.max(Math.PI / 4, weapon.coneHalfAngle);
  return inAttackCone(
    defender.pos,
    defender.block.aim,
    source,
    Number.POSITIVE_INFINITY,
    baseHalfAngle * BLOCK_WIDTH_MULT,
  );
}

/** A melee strike is intercepted when its attacker is inside the active front guard. */
export function blocksMeleeAttack(
  defender: PlayerState,
  attacker: PlayerState,
): boolean {
  return blockCoversSource(defender, attacker.pos);
}

/** An arrow is intercepted when it is travelling into the active front guard. */
export function blocksProjectile(
  defender: PlayerState,
  projectile: Projectile,
): boolean {
  const speed = Math.hypot(projectile.vel.x, projectile.vel.y);
  if (speed === 0) return false;
  return blockCoversSource(defender, {
    x: defender.pos.x - projectile.vel.x / speed,
    y: defender.pos.y - projectile.vel.y / speed,
  });
}

/**
 * True when `target` is within `reach` of `origin` and inside the forward cone of
 * half-angle `halfAngle` around the aim angle `aim` (radians). A point-blank target
 * (same position) always hits.
 */
export function inAttackCone(
  origin: Vec2,
  aim: number,
  target: Vec2,
  reach: number,
  halfAngle: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return true; // point-blank
  if (dist > reach) return false;
  const f = aimVector(aim);
  const cos = (dx * f.x + dy * f.y) / dist;
  // Inclusive cone edge: tolerate floating-point error at exactly the half-angle.
  return cos >= Math.cos(halfAngle) - 1e-9;
}

/**
 * True when `target` lies in a straight forward BAND along `aim` (a thrust, e.g. the spear):
 * within `reach` ahead of `origin` and no more than `halfWidth` to either side of the aim ray.
 * Unlike a cone, the band does not widen with distance.
 */
export function inAttackLine(
  origin: Vec2,
  aim: number,
  target: Vec2,
  reach: number,
  halfWidth: number,
): boolean {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const f = aimVector(aim);
  const along = dx * f.x + dy * f.y; // forward projection onto the aim ray
  if (along < 0 || along > reach) return false;
  const perp = Math.abs(dx * -f.y + dy * f.x); // distance to the aim ray
  return perp <= halfWidth + 1e-9;
}

/**
 * Points sampled up a target's body capsule, from the foot (`foot`) toward its head (−y, the 2.5D
 * "up") over `height` metres. Spacing is ≤ MELEE_BODY_SAMPLE_M so no gap exceeds a body, and the
 * foot + head are always included. A zero-height (flat) target yields just the foot → a plain disc.
 */
function bodySamples(foot: Vec2, height: number): Vec2[] {
  if (height <= 0) return [foot];
  const steps = Math.max(1, Math.ceil(height / MELEE_BODY_SAMPLE_M));
  const points: Vec2[] = [];
  for (let i = 0; i <= steps; i++) points.push({ x: foot.x, y: foot.y - (height * i) / steps });
  return points;
}

/**
 * Resolve one attacker's melee swing against candidate targets, emitting a damage event per alive,
 * non-self target hit. The hit shape comes from the attacker's weapon: a widening cone (sword/knife)
 * or a straight forward band (thrust weapons, e.g. spear), tested against each target's vertical body
 * capsule (foot→head). Self is skipped.
 */
export function resolveAttack(
  attacker: PlayerState,
  candidates: readonly Hittable[],
): DamageEvent[] {
  const stats = WEAPONS[attacker.weapon];
  const events: DamageEvent[] = [];
  for (const t of candidates) {
    if (t.id === attacker.id) continue;
    if (t.status !== "alive") continue;
    const bodyRadius = t.hitRadius ?? FIGURE_RADIUS_M;
    const reach = stats.reach + bodyRadius;
    // The target's body is a vertical capsule: its footprint circle swept from the foot (t.pos) up
    // its drawn height (toward −y, the 2.5D "up"). A swing connects if it reaches ANY point up that
    // silhouette — so aiming at a tall creature's head/torso lands, not only its foot.
    const hit = bodySamples(t.pos, t.hitHeight ?? FIGURE_HIT_HEIGHT_M).some((point) =>
      stats.thrust
        ? inAttackLine(attacker.pos, attacker.aim, point, reach, stats.thrust.halfWidth + bodyRadius)
        : inAttackCone(attacker.pos, attacker.aim, point, reach, stats.coneHalfAngle),
    );
    if (hit) events.push({ fromId: attacker.id, targetId: t.id });
  }
  return events;
}
