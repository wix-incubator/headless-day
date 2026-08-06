/**
 * Coop Survival step reducer (P-A3 integration): the pure, deterministic per-tick heart of the
 * survival mode, assembling the isolated cores — player kinematics (shared with versus), Hittable
 * combat (players attack enemies), enemy AI (chase + contact), wave spawning, and the campaign state
 * machine. No engine/DOM/clock/RNG; `dt` is injected and all iteration is sorted-id, so the host
 * runs it authoritatively and every peer reconstructs the same world from a snapshot.
 *
 * Kept OFF the shared versus `World`/`stepWorld` on purpose: survival owns its own `SurvivalWorld`
 * (players + enemies + run) so this whole feature stays independently testable. The `stepWorld`
 * mode-branch + snapshot wiring is a later, separate slice.
 */

import type { Intent, PlayerId, PlayerState, Projectile, Vec2, World } from "../types";
import type { GameMode } from "../modes";
import { aimVector, clampToField, directionAngle, directionFromInput, directionVector } from "../logic";
import { consumeDashDistance, dashSpeedMultiplier, tickDashCooldown, tryStartDash } from "../dash";
import { resolveAttack } from "../combat";
import { advanceProjectile, projectileTarget, spawnArrow } from "../projectile";
import { createPlayer } from "../match";
import { WEAPONS } from "../weapons";
import { ATTACK_TTL_S, FIELD_M, FIGURE_RADIUS_M, RUN_SPEED_MS, START_HEALTH } from "../../constants";
import { createEnemy, ENEMY_HIT_PUSHBACK_M, ENEMY_HIT_STUN_S, ENEMY_STATS, type EnemyState } from "./enemy";
import { stepEnemies, type EnemyTarget } from "./enemyStep";
import { enemySpawnPoint } from "./spawn";
import { wavePlan } from "./waves";
import { clearWave, createRun, wipe, type SurvivalRun } from "./campaign";

export type SurvivalOutcome = "won" | "lost" | null;

export interface SurvivalWorld {
  phase: "playing" | "ended";
  /** Set when phase === "ended": how the run finished. */
  outcome: SurvivalOutcome;
  tick: number;
  /** Deterministic RNG seed shared by every peer (drives the wave plans). */
  seed: number;
  fieldM: number;
  players: Record<PlayerId, PlayerState>;
  enemies: EnemyState[];
  run: SurvivalRun;
  /**
   * Party size the CURRENT wave's spawn count is scaled to — frozen at wave start (allies alive
   * then) so a mid-wave leave/death can't change the horde size and fork replication/migration.
   */
  partySizeThisWave: number;
  /** Tick at which the current wave began emitting spawns. */
  waveStartTick: number;
  /** How many of the current wave plan's spawns have been emitted so far. */
  spawnCursor: number;
  /** In-flight projectiles (bow arrows), host-owned — shared shape with versus. */
  projectiles: Projectile[];
  /** Dev sandbox: enemies stand still (no chase/bite) but still stagger + knock back when hit. */
  frozen?: boolean;
  /** Dev sandbox: no wave spawning and no wave/level/wipe progression — the run never auto-ends. */
  sandbox?: boolean;
}

const NO_INPUT = { up: false, down: false, left: false, right: false } as const;

export interface SurvivalOpts {
  seed?: number;
  fieldM?: number;
  wavesPerLevel?: number;
  campaignLevels?: number;
  endless?: boolean;
}

/** Deterministic cluster of allies near the field centre (they defend the middle). */
function centerSpawns(ids: PlayerId[], fieldM: number): Record<PlayerId, PlayerState> {
  const c = fieldM / 2;
  const radius = ids.length > 1 ? 2 : 0;
  const players: Record<PlayerId, PlayerState> = {};
  ids.forEach((id, i) => {
    const angle = (i / Math.max(1, ids.length)) * Math.PI * 2;
    players[id] = createPlayer(id, { x: c + radius * Math.cos(angle), y: c + radius * Math.sin(angle) });
  });
  return players;
}

/** A fresh survival run: full party at the centre, no enemies, campaign at level 1 / wave 1. */
export function createSurvivalWorld(ids: PlayerId[], opts: SurvivalOpts = {}): SurvivalWorld {
  const fieldM = opts.fieldM ?? FIELD_M;
  return {
    phase: "playing",
    outcome: null,
    tick: 0,
    seed: opts.seed ?? 1,
    fieldM,
    players: centerSpawns(ids, fieldM),
    enemies: [],
    run: createRun(opts),
    partySizeThisWave: Math.max(1, ids.length),
    waveStartTick: 0,
    spawnCursor: 0,
    projectiles: [],
  };
}

interface MovedPlayer {
  player: PlayerState;
  /** True when the player initiated a melee swing this tick (resolve against enemies). */
  swung: boolean;
  /** An arrow loosed this tick by a ranged weapon, if any. */
  projectile: Projectile | null;
}

/**
 * Player kinematics for one tick — movement, dash, facing/aim, and attack-state update. Mirrors the
 * versus mover (same feel), but a swing is reported for the caller to resolve against enemies rather
 * than other players.
 */
function stepPlayer(p: PlayerState, intent: Intent | undefined, dt: number, tick: number): MovedPlayer {
  const it: Intent = intent ?? {
    move: { ...NO_INPUT },
    facing: p.facing,
    dash: false,
    attack: false,
    block: false,
  };
  const facing = it.facing;
  const aim = it.aim ?? directionAngle(facing);

  let dash = tickDashCooldown(p.dash, dt);
  if (it.dash) dash = tryStartDash(dash);

  let moveDir = directionFromInput(it.move);
  if (dash.dashing && moveDir.x === 0 && moveDir.y === 0) moveDir = directionVector(facing);
  const speed = RUN_SPEED_MS * dashSpeedMultiplier(dash);
  const stepLen = speed * dt;
  const moveLen = dash.dashing ? Math.min(stepLen, dash.distRemaining) : stepLen;
  const rawPos: Vec2 = { x: p.pos.x + moveDir.x * moveLen, y: p.pos.y + moveDir.y * moveLen };
  const pos = clampToField(rawPos, FIELD_M, FIGURE_RADIUS_M);
  const distance = p.stats.distance + Math.hypot(pos.x - p.pos.x, pos.y - p.pos.y);
  dash = consumeDashDistance(dash, moveLen);

  let attackCooldownRemaining = Math.max(0, p.attackCooldownRemaining - dt);
  let attack = p.attack;
  let swung = false;
  let projectile: Projectile | null = null;
  if (it.attack && attackCooldownRemaining <= 0) {
    const weap = WEAPONS[p.weapon];
    attack = { aim, ttl: ATTACK_TTL_S };
    attackCooldownRemaining = weap.cooldown;
    if (weap.ranged) {
      projectile = spawnArrow({
        ownerId: p.id,
        pos,
        aim,
        tick,
        speed: weap.ranged.speed,
        range: weap.ranged.range,
        damage: 1,
        knockback: weap.knockback,
      });
    } else {
      swung = true;
    }
  } else if (attack) {
    const ttl = attack.ttl - dt;
    attack = ttl > 0 ? { ...attack, ttl } : null;
  }

  return {
    player: { ...p, pos, facing, aim, dash, attack, attackCooldownRemaining, stats: { ...p.stats, distance } },
    swung,
    projectile,
  };
}

/** Emit any planned spawns of the current wave whose relative atTick has elapsed. */
function spawnDueEnemies(world: SurvivalWorld): { enemies: EnemyState[]; spawnCursor: number } {
  const plan = wavePlan(world.seed, world.run.level, world.run.wave, world.partySizeThisWave);
  const relTick = world.tick - world.waveStartTick;
  const enemies = [...world.enemies];
  let cursor = world.spawnCursor;
  while (cursor < plan.spawns.length && plan.spawns[cursor]!.atTick <= relTick) {
    const s = plan.spawns[cursor]!;
    enemies.push(createEnemy(s.id, s.kind, enemySpawnPoint(s.angle, world.fieldM), world.tick));
    cursor++;
  }
  return { enemies, spawnCursor: cursor };
}

/** Advance a survival world by one tick. Only simulates while phase === "playing". */
export function stepSurvival(world: SurvivalWorld, intentsById: Record<string, Intent>, dt: number): SurvivalWorld {
  if (world.phase !== "playing") return world;

  // 1) Move players; collect melee swings + any arrows.
  const players: Record<PlayerId, PlayerState> = {};
  const swungIds: PlayerId[] = [];
  const newProjectiles: Projectile[] = [];
  for (const p of Object.values(world.players)) {
    if (p.status !== "alive") {
      players[p.id] = p;
      continue;
    }
    const moved = stepPlayer(p, intentsById[p.id], dt, world.tick);
    players[p.id] = moved.player;
    if (moved.swung) swungIds.push(p.id);
    if (moved.projectile) newProjectiles.push(moved.projectile);
  }

  // 2) Spawn any due enemies (post-movement positions are what combat resolves against).
  // Sandbox freezes the roster: no new spawns (targets are pre-placed and stay put).
  const spawned = world.sandbox
    ? { enemies: [...world.enemies], spawnCursor: world.spawnCursor }
    : spawnDueEnemies({ ...world, players });
  let enemies = spawned.enemies;

  // 3) Resolve player attacks (melee cones + arrows) against enemies → damage per enemy.
  //    Each enemy is hit at its OWN per-kind body radius so the zone matches its sprite (a bat is
  //    small, the dino large) rather than the default player figure.
  const enemyHitTargets = enemies.map((e) => ({
    id: e.id,
    pos: e.pos,
    status: e.status,
    hitRadius: ENEMY_STATS[e.kind].radius,
    hitHeight: ENEMY_STATS[e.kind].hitHeight,
  }));
  // Damage + a hit "shove" direction per enemy (melee → along the attacker's aim; arrow → its heading).
  const dmgByEnemy: Record<string, number> = {};
  const pushByEnemy: Record<string, Vec2> = {};
  const addPush = (id: string, dir: Vec2) => {
    const p = pushByEnemy[id] ?? { x: 0, y: 0 };
    pushByEnemy[id] = { x: p.x + dir.x, y: p.y + dir.y };
  };
  for (const id of swungIds) {
    const dir = aimVector(players[id]!.aim);
    for (const ev of resolveAttack(players[id]!, enemyHitTargets)) {
      dmgByEnemy[ev.targetId] = (dmgByEnemy[ev.targetId] ?? 0) + 1;
      addPush(ev.targetId, dir);
    }
  }
  const projectiles: Projectile[] = [];
  for (const proj of [...world.projectiles, ...newProjectiles]) {
    const moved = advanceProjectile(proj, dt);
    const hitId = projectileTarget(moved, enemyHitTargets);
    if (hitId) {
      dmgByEnemy[hitId] = (dmgByEnemy[hitId] ?? 0) + moved.damage;
      const spd = Math.hypot(moved.vel.x, moved.vel.y) || 1;
      addPush(hitId, { x: moved.vel.x / spd, y: moved.vel.y / spd });
      continue;
    }
    if (moved.distRemaining <= 0) continue;
    if (moved.pos.x < 0 || moved.pos.x > world.fieldM || moved.pos.y < 0 || moved.pos.y > world.fieldM) continue;
    projectiles.push(moved);
  }
  if (Object.keys(dmgByEnemy).length > 0) {
    enemies = enemies.map((e) => {
      const dmg = dmgByEnemy[e.id];
      if (!dmg || e.status !== "alive") return e;
      const health = Math.max(0, e.health - dmg);
      if (health <= 0) return { ...e, health: 0, status: "dead" };
      // Survivor: stagger it and shove it ENEMY_HIT_PUSHBACK_M away from the hit direction.
      const push = pushByEnemy[e.id] ?? { x: 0, y: 0 };
      const mag = Math.hypot(push.x, push.y) || 1;
      const pos = {
        x: e.pos.x + (push.x / mag) * ENEMY_HIT_PUSHBACK_M,
        y: e.pos.y + (push.y / mag) * ENEMY_HIT_PUSHBACK_M,
      };
      return { ...e, health, pos, hitStunRemaining: ENEMY_HIT_STUN_S };
    });
  }

  // 4) Enemy AI: chase the nearest ally, emit contacts; apply contact damage → player deaths.
  //    In the sandbox, enemies are frozen (they hold position but still stagger/knock back on a hit).
  const targets: EnemyTarget[] = Object.values(players).map((p) => ({ id: p.id, pos: p.pos, status: p.status }));
  const enemyStep = stepEnemies(enemies, targets, dt, { frozen: world.frozen });
  enemies = enemyStep.enemies;
  const dmgByPlayer: Record<string, number> = {};
  for (const c of enemyStep.contacts) dmgByPlayer[c.playerId] = (dmgByPlayer[c.playerId] ?? 0) + c.damage;
  for (const [id, dmg] of Object.entries(dmgByPlayer)) {
    const p = players[id]!;
    const health = Math.max(0, p.health - dmg);
    players[id] = health <= 0 ? { ...p, health: 0, status: "dead", attack: null } : { ...p, health };
  }

  // 5) Progression. Resolve the wave/level machine and revive downed allies on a level clear FIRST,
  //    THEN test for a wipe — so the last ally downed on the same tick the last enemy dies is revived
  //    rather than losing the run (a level clear beats a same-tick wipe).
  let run = world.run;
  let waveStartTick = world.waveStartTick;
  let spawnCursor = spawned.spawnCursor;
  let partySizeThisWave = world.partySizeThisWave;
  let outcome: SurvivalOutcome = null;
  let phase: SurvivalWorld["phase"] = "playing";

  // The sandbox has no waves, level-ups, wins, or wipes — it never auto-ends (stays "playing").
  if (!world.sandbox) {
    const planLen = wavePlan(world.seed, run.level, run.wave, partySizeThisWave).spawns.length;
    const waveCleared = spawnCursor >= planLen && !enemies.some((e) => e.status === "alive");
    if (waveCleared) {
      const cleared = clearWave(run);
      run = cleared.run;
      waveStartTick = world.tick + 1;
      spawnCursor = 0;
      enemies = [];
      if (cleared.leveled) {
        for (const id of Object.keys(players)) {
          players[id] = { ...players[id]!, health: START_HEALTH, status: "alive", attack: null };
        }
      }
      // Freeze the next wave's party size to the allies alive at its start (rides snapshots + migration).
      partySizeThisWave = Math.max(1, Object.values(players).filter((p) => p.status === "alive").length);
      if (run.phase === "won") {
        phase = "ended";
        outcome = "won";
      }
    }

    if (phase === "playing" && !Object.values(players).some((p) => p.status === "alive")) {
      run = wipe(run);
      phase = "ended";
      outcome = "lost";
    }
  }

  return {
    ...world,
    phase,
    outcome,
    players,
    enemies,
    projectiles,
    run,
    partySizeThisWave,
    waveStartTick,
    spawnCursor,
    tick: world.tick + 1,
  };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────
// Integration with the shared World / SyncEngine.
//
// The netcode's engine is typed to `World` and calls `stepWorld`. Rather than fork the engine or
// duplicate the World shape, survival rides on `World` via two additive optional fields — `enemies`
// and `survival` (this block) — and `stepWorld` branches to `stepSurvivalWorld` when `world.survival`
// is present. The adapters below are the ONLY bridge; `stepSurvival` above stays pure and unaware.
// ───────────────────────────────────────────────────────────────────────────────────────────────

/** The survival-only slice carried on a `World` (absent in versus modes). */
export interface SurvivalState {
  seed: number;
  fieldM: number;
  run: SurvivalRun;
  partySizeThisWave: number;
  waveStartTick: number;
  spawnCursor: number;
  outcome: SurvivalOutcome;
  /** Dev sandbox: freeze enemies (no chase/bite). Toggled live by the sandbox controls. */
  frozen?: boolean;
  /** Dev sandbox: no waves / progression / auto-end. */
  sandbox?: boolean;
}

/** The `winnerId` sentinel a survival World carries when the co-op party wins the campaign. */
export const SURVIVAL_PARTY_WINNER = "party";

function worldToSurvivalWorld(w: World): SurvivalWorld {
  const s = w.survival!;
  return {
    phase: w.phase === "ended" ? "ended" : "playing",
    outcome: s.outcome,
    tick: w.tick,
    seed: s.seed,
    fieldM: s.fieldM,
    players: w.players,
    enemies: w.enemies ?? [],
    run: s.run,
    partySizeThisWave: s.partySizeThisWave,
    waveStartTick: s.waveStartTick,
    spawnCursor: s.spawnCursor,
    projectiles: w.projectiles,
    frozen: s.frozen,
    sandbox: s.sandbox,
  };
}

function survivalWorldToWorld(sw: SurvivalWorld, mode: GameMode): World {
  return {
    mode,
    players: sw.players,
    projectiles: sw.projectiles,
    phase: sw.phase,
    tick: sw.tick,
    winnerId: sw.outcome === "won" ? SURVIVAL_PARTY_WINNER : null,
    enemies: sw.enemies,
    survival: {
      seed: sw.seed,
      fieldM: sw.fieldM,
      run: sw.run,
      partySizeThisWave: sw.partySizeThisWave,
      waveStartTick: sw.waveStartTick,
      spawnCursor: sw.spawnCursor,
      outcome: sw.outcome,
      frozen: sw.frozen,
      sandbox: sw.sandbox,
    },
  };
}

/** Build a survival match as a shared `World` (host seeds; clients get the real state via snapshot). */
export function createSurvivalMatchWorld(
  ids: PlayerId[],
  mode: GameMode,
  opts: SurvivalOpts = {},
): World {
  return survivalWorldToWorld(createSurvivalWorld(ids, opts), mode);
}

/** `stepWorld`'s survival branch: unwrap → step the pure reducer → re-wrap onto the World. */
export function stepSurvivalWorld(world: World, intents: Record<string, Intent>, dt: number): World {
  return survivalWorldToWorld(stepSurvival(worldToSurvivalWorld(world), intents, dt), world.mode);
}
