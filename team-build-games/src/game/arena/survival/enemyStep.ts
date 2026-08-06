/**
 * Pure survival enemy AI step (P-A3 piece): every alive enemy chases the nearest alive ally, nudges
 * apart from crowding neighbours, ticks its contact cooldown, and emits a contact when it reaches a
 * player and is off cooldown. No World, no clock, no RNG — operates on EnemyState[] + a read-only
 * player list, iterated in SORTED-ID order so replication can't fork. The step reducer applies the
 * emitted contacts (player damage) and folds these enemies back into the World.
 */

import type { Direction } from "../types";
import type { EnemyState } from "./enemy";
import { ENEMY_STATS } from "./enemy";
import { nearestPlayer, separation, stepToward } from "./steering";

export interface EnemyTarget {
  id: string;
  pos: { x: number; y: number };
  status: "alive" | "dead";
}

export interface Contact {
  enemyId: string;
  playerId: string;
  damage: number;
}

export interface EnemyStepResult {
  enemies: EnemyState[];
  contacts: Contact[];
}

const CONTACT_PAD = 0.5; // ≈ player body radius, added to the enemy radius for the touch test
const SEPARATION_STRENGTH = 0.5;

/** 4-way facing from an aim angle (y grows downward, matching the sim). */
function facingFromAngle(a: number): Direction {
  const deg = (((a * 180) / Math.PI) % 360 + 360) % 360;
  if (deg >= 45 && deg < 135) return "down";
  if (deg >= 135 && deg < 225) return "left";
  if (deg >= 225 && deg < 315) return "up";
  return "right";
}

export function stepEnemies(
  enemies: EnemyState[],
  players: EnemyTarget[],
  dt: number,
  opts: { separationDist?: number; frozen?: boolean } = {},
): EnemyStepResult {
  const alivePositions = enemies.filter((e) => e.status === "alive").map((e) => ({ id: e.id, pos: e.pos }));
  const sorted = [...enemies].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  const out: EnemyState[] = [];
  const contacts: Contact[] = [];

  for (const e of sorted) {
    if (e.status !== "alive") {
      out.push(e);
      continue;
    }
    const stats = ENEMY_STATS[e.kind];
    const cooldown = Math.max(0, e.hitCooldownRemaining - dt);

    // Hold position — no chase, no bite — when frozen (dev sandbox) OR mid hit-stagger. A struck
    // monster keeps the position it was shoved to (applied by the step reducer on the hit) while its
    // stun ticks down; a frozen one simply stands there (but still staggers + knocks back on a hit).
    if (opts.frozen || e.hitStunRemaining > 0) {
      out.push({ ...e, hitCooldownRemaining: cooldown, hitStunRemaining: Math.max(0, e.hitStunRemaining - dt) });
      continue;
    }

    const target = nearestPlayer(e.pos, players);
    if (!target) {
      out.push({ ...e, hitCooldownRemaining: cooldown });
      continue;
    }

    const toward = stepToward(e.pos, target.pos, stats.speed * dt);
    const others = alivePositions.filter((o) => o.id !== e.id).map((o) => o.pos);
    const sep = separation(e.pos, others, opts.separationDist ?? stats.radius * 2);
    const pos = { x: toward.x + sep.x * SEPARATION_STRENGTH, y: toward.y + sep.y * SEPARATION_STRENGTH };

    const aim = Math.atan2(target.pos.y - e.pos.y, target.pos.x - e.pos.x);
    const dist = Math.hypot(target.pos.x - pos.x, target.pos.y - pos.y);
    let hitCooldownRemaining = cooldown;
    if (dist <= stats.radius + CONTACT_PAD && cooldown <= 0) {
      contacts.push({ enemyId: e.id, playerId: target.id, damage: stats.contactDamage });
      hitCooldownRemaining = stats.hitCooldown;
    }

    out.push({ ...e, pos, aim, facing: facingFromAngle(aim), hitCooldownRemaining });
  }

  return { enemies: out, contacts };
}
