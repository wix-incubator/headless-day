/**
 * The pure simulation heart: a deterministic per-tick reducer.
 *
 *   stepWorld(world, intentsById, dt) -> world
 *
 * No engine/DOM/clock/RNG — `dt` is injected so the same inputs always produce the
 * same output (host runs it authoritatively; tests run it under a LocalTransport).
 * Composes movement + dash + combat + death + win.
 */

import type {
  Intent,
  PlayerState,
  PlayerStats,
  Projectile,
  Vec2,
  World,
} from "./types";
import {
  aimVector,
  clampToField,
  directionAngle,
  directionFromInput,
  directionVector,
} from "./logic";
import {
  consumeDashDistance,
  dashSpeedMultiplier,
  tickDashCooldown,
  tryStartDash,
} from "./dash";
import { blockCoversSource, blocksMeleeAttack, blocksProjectile, resolveAttack } from "./combat";
import {
  advanceProjectile,
  projectileTargets,
  spawnArrow,
  spawnCrushingWave,
  spawnSolarWave,
} from "./projectile";
import { soleSurvivor } from "./match";
import { stepSurvivalWorld } from "./survival/step";
import { WEAPONS } from "./weapons";
import {
  ATTACK_TTL_S,
  BLOCK_COOLDOWN_S,
  BLOCK_TTL_S,
  FIELD_M,
  FIGURE_RADIUS_M,
  RUN_SPEED_MS,
} from "../constants";

const NO_INPUT = { up: false, down: false, left: false, right: false } as const;

/** Advance the world by one tick. Only simulates while phase === "playing". */
export function stepWorld(
  world: World,
  intentsById: Record<string, Intent>,
  dt: number,
): World {
  // Coop Survival runs its own reducer (players-vs-enemies) via a thin World adapter.
  if (world.survival) return stepSurvivalWorld(world, intentsById, dt);
  if (world.phase !== "playing") return world;

  // 1) Per-player movement, dash, facing, and attack-state update.
  const players: Record<string, PlayerState> = {};
  const attackedThisTick: string[] = [];
  const newProjectiles: Projectile[] = [];
  // Cosmetic per-player tallies, seeded from the running totals and applied at the end of the tick.
  const stats: Record<string, PlayerStats> = {};
  for (const p of Object.values(world.players)) stats[p.id] = { ...p.stats };

  for (const p of Object.values(world.players)) {
    if (p.status !== "alive") {
      players[p.id] = p;
      continue;
    }
    const intent: Intent = intentsById[p.id] ?? {
      move: { ...NO_INPUT },
      facing: p.facing,
      dash: false,
      attack: false,
      block: false,
    };

    const facing = intent.facing;
    // Free-aim angle drives the weapon + attack cone; without a mouse it falls back to facing.
    const aim = intent.aim ?? directionAngle(facing);

    // Dash: recharge first, then maybe start a new burst this tick.
    let dash = tickDashCooldown(p.dash, dt);
    if (intent.dash) dash = tryStartDash(dash);

    // Movement (dash multiplies speed; a keyless dash carries you forward).
    let moveDir = directionFromInput(intent.move);
    if (dash.dashing && moveDir.x === 0 && moveDir.y === 0)
      moveDir = directionVector(facing);
    const speed = RUN_SPEED_MS * dashSpeedMultiplier(dash);
    // While dashing, cap the step to the remaining 2 m budget (exact, dt-independent burst)
    // and charge the budget the INTENDED distance — so a wall can't freeze the dash.
    const stepLen = speed * dt;
    const moveLen = dash.dashing
      ? Math.min(stepLen, dash.distRemaining)
      : stepLen;
    const rawPos: Vec2 = {
      x: p.pos.x + moveDir.x * moveLen,
      y: p.pos.y + moveDir.y * moveLen,
    };
    const pos = clampToField(rawPos, FIELD_M, FIGURE_RADIUS_M);
    stats[p.id]!.distance += Math.hypot(pos.x - p.pos.x, pos.y - p.pos.y); // actual metres moved (post-clamp)
    dash = consumeDashDistance(dash, moveLen);

    // Action windows and cooldown clocks. Block takes precedence if both actions are pressed,
    // and neither action can begin while the other's 0.2s weapon pose is active.
    let attackCooldownRemaining = Math.max(0, p.attackCooldownRemaining - dt);
    let attack = p.attack
      ? p.attack.ttl - dt > 0
        ? { ...p.attack, ttl: p.attack.ttl - dt }
        : null
      : null;
    let blockCooldownRemaining = Math.max(0, p.blockCooldownRemaining - dt);
    let block = p.block
      ? p.block.ttl - dt > 0
        ? { ...p.block, ttl: p.block.ttl - dt }
        : null
      : null;

    if (intent.block && blockCooldownRemaining <= 0 && !attack) {
      block = { aim, ttl: BLOCK_TTL_S };
      blockCooldownRemaining = BLOCK_COOLDOWN_S;
    }

    if (intent.attack && attackCooldownRemaining <= 0 && !block) {
      const weap = WEAPONS[p.weapon];
      attack = { aim, ttl: ATTACK_TTL_S };
      attackCooldownRemaining = weap.cooldown;
      if (weap.special?.kind === "crushing-wave") {
        newProjectiles.push(
          spawnCrushingWave({
            ownerId: p.id,
            pos,
            aim,
            tick: world.tick,
            speed: weap.special.speed,
            range: weap.special.range,
            radius: weap.special.radius,
            damage: 1,
            knockback: weap.knockback,
          }),
        );
      } else if (weap.special?.kind === "solar-wave") {
        newProjectiles.push(
          spawnSolarWave({
            ownerId: p.id,
            pos,
            tick: world.tick,
            speed: weap.special.speed,
            radius: weap.special.radius,
            damage: 1,
            knockback: weap.knockback,
          }),
        );
      } else if (weap.ranged) {
        // Ranged weapon (bow): loose an arrow along the aim instead of a melee hit.
        newProjectiles.push(
          spawnArrow({
            ownerId: p.id,
            pos,
            aim,
            tick: world.tick,
            speed: weap.ranged.speed,
            range: weap.ranged.range,
            damage: 1,
            knockback: weap.knockback,
          }),
        );
      } else {
        attackedThisTick.push(p.id);
      }
    }

    players[p.id] = {
      ...p,
      pos,
      facing,
      aim,
      dash,
      attack,
      attackCooldownRemaining,
      block,
      blockCooldownRemaining,
    };
  }

  // 2) Resolve combat against post-movement positions; accumulate damage + knockback
  //    (each hit pushes the victim KNOCKBACK_M away, along the attacker's aim).
  const candidates = Object.values(players);
  const damageByTarget: Record<string, number> = {};
  const knockByTarget: Record<string, Vec2> = {};
  for (const attackerId of attackedThisTick) {
    const attacker = players[attackerId]!;
    const weap = WEAPONS[attacker.weapon];
    const push = aimVector(attacker.aim);
    const events = resolveAttack(attacker, candidates);
    let landed = false;
    for (const ev of events) {
      const defender = players[ev.targetId]!;
      if (blocksMeleeAttack(defender, attacker)) {
        players[ev.targetId] = {
          ...defender,
          blockImpactSeq: defender.blockImpactSeq + 1,
        };
        continue;
      }
      landed = true;
      damageByTarget[ev.targetId] = (damageByTarget[ev.targetId] ?? 0) + 1;
      const k = knockByTarget[ev.targetId] ?? { x: 0, y: 0 };
      knockByTarget[ev.targetId] = {
        x: k.x + push.x * weap.knockback,
        y: k.y + push.y * weap.knockback,
      };
    }
    if (landed) stats[attackerId]!.hits += 1;
    else stats[attackerId]!.misses += 1;
  }

  // 2.5) Advance arrows and signature waves. Arrows are consumed by their first body; waves keep
  //      traveling/expanding and remember every target crossed so they can pierce without repeat hits.
  const projectiles: Projectile[] = [];
  for (const proj of [...world.projectiles, ...newProjectiles]) {
    const moved = advanceProjectile(proj, dt);
    const kind = moved.kind ?? "arrow";
    const wave = kind !== "arrow";
    const hitIds = projectileTargets(moved, candidates);
    const crossed = [...(moved.hitIds ?? [])];
    let connected = moved.connected ?? false;
    let consumed = false;
    for (const hitId of hitIds) {
      const defender = players[hitId]!;
      if (wave) crossed.push(hitId);
      const blocked =
        kind === "solar-wave"
          ? blockCoversSource(defender, moved.pos)
          : blocksProjectile(defender, moved);
      if (blocked) {
        players[hitId] = {
          ...defender,
          blockImpactSeq: defender.blockImpactSeq + 1,
        };
        if (!wave) {
          if (stats[moved.ownerId]) stats[moved.ownerId]!.misses += 1;
          consumed = true;
          break;
        }
        continue;
      }
      if (!connected && stats[moved.ownerId]) stats[moved.ownerId]!.hits += 1;
      connected = true;
      damageByTarget[hitId] = (damageByTarget[hitId] ?? 0) + moved.damage;
      let pushX = moved.vel.x;
      let pushY = moved.vel.y;
      if (kind === "solar-wave") {
        pushX = defender.pos.x - moved.pos.x;
        pushY = defender.pos.y - moved.pos.y;
        if (pushX === 0 && pushY === 0) {
          const ownerAim = aimVector(players[moved.ownerId]?.aim ?? 0);
          pushX = ownerAim.x;
          pushY = ownerAim.y;
        }
      }
      const spd = Math.hypot(pushX, pushY) || 1;
      const k = knockByTarget[hitId] ?? { x: 0, y: 0 };
      knockByTarget[hitId] = {
        x: k.x + (pushX / spd) * moved.knockback,
        y: k.y + (pushY / spd) * moved.knockback,
      };
      if (!wave) {
        consumed = true;
        break;
      }
    }
    if (consumed) continue;
    if (moved.distRemaining <= 0) {
      if (!connected && stats[moved.ownerId]) stats[moved.ownerId]!.misses += 1;
      continue;
    }
    if (
      moved.pos.x < 0 ||
      moved.pos.x > FIELD_M ||
      moved.pos.y < 0 ||
      moved.pos.y > FIELD_M
    ) {
      if (!connected && stats[moved.ownerId]) stats[moved.ownerId]!.misses += 1;
      continue;
    }
    projectiles.push(wave ? { ...moved, hitIds: crossed, connected } : moved);
  }

  // 3) Apply damage, knockback, and deaths.
  for (const [id, dmg] of Object.entries(damageByTarget)) {
    const p = players[id]!;
    const health = Math.max(0, p.health - dmg);
    const k = knockByTarget[id]!;
    const pos = clampToField(
      { x: p.pos.x + k.x, y: p.pos.y + k.y },
      FIELD_M,
      FIGURE_RADIUS_M,
    );
    players[id] =
      health <= 0
        ? { ...p, pos, health: 0, status: "dead", attack: null, block: null }
        : { ...p, pos, health };
  }

  // 3.5) Fold this tick's stat tallies back onto every player.
  for (const id of Object.keys(players))
    players[id] = { ...players[id]!, stats: stats[id] ?? players[id]!.stats };

  // 4) Win condition: one (or zero) left → match ends. The dev sandbox never auto-ends.
  const next: World = { ...world, players, projectiles, tick: world.tick + 1 };
  const aliveIds = Object.values(players).filter((p) => p.status === "alive");
  if (aliveIds.length <= 1 && !world.sandbox) {
    next.phase = "ended";
    next.winnerId = soleSurvivor(next);
  }
  return next;
}
