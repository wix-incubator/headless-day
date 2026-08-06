// src/game/overrun/sim.ts
/**
 * stepShooter — THE Overrun reducer. Pure: (world, intents, dt) → world.
 * Fixed phase order (each numbered block below); every random draw is a
 * coordinate-hash off the world-carried seed. Players iterate in sorted-id
 * order, enemies in spawn (array) order — byte-reproducible on any peer.
 *
 * Order: picks → upkeep/move → fire(+kills/drops/xp) → enemies(+contact/downed)
 * → revive → wipe-check (revive-before-wipe) → pickups → waves/spawning → caps.
 */

import {
  EVENT_TTL_TICKS, INTERMISSION_S, MAX_ENEMIES, MAX_EVENTS, OVERRUN_FIELD_M,
  PLAYER_RADIUS_M, PLAYER_SPEED_MS, REVIVE_HEALTH, REVIVE_RANGE_M, REVIVE_S,
  MEDKIT_HEAL, SPAWNS_PER_TICK, SWAP_GUARD_S, WAVE1_SPEED_MULT,
  ENEMY_SEPARATION_M, ENEMY_LEAD_TICKS, ENEMY_LEAD_MAX_M, ENEMY_ATTACK_FREEZE_S,
  ENEMY_CONTACT_SLACK_M, COMIC_INTERSTITIAL_S, BURN_DPS,
  RUSH_COOLDOWN_S, RUSH_HIT_RADIUS_M, RUSH_HIT_FRACTION,
  SPIT_COOLDOWN_S, SPIT_HAZARD_TELEGRAPH_S, SPIT_HAZARD_DURATION_S, SPIT_HAZARD_RADIUS_M, SPIT_DPS,
  EXPLODER_FUSE_S, EXPLODER_BLAST_RADIUS_M, EXPLODER_BLAST_DAMAGE,
  HIVE_SPAWN_INTERVAL_S, HIVE_BROOD_RING_M, ELITE_MIN_STAGE, ELITE_CHANCE, KRAKEN_ATTACK_INTERVAL_S,
  ROCKET_BLAST_RADIUS_M, ROCKET_BLAST_DAMAGE, MAX_PROJECTILES,
} from "./constants";
import { ENEMIES, eliteMods, krakenHp, nearestAlive, stageHealthMult, stepEnemy, stepHive, stepKraken, stepSpitter, stepTank } from "./enemies";
import { hazardActive, stepHazard } from "./hazards";
import { hash01 } from "./rng";
import { fireTick, tickAmmo, tryStartReload } from "./firing";
import { effectiveStats, rollOffer, xpToNext } from "./perks";
import { rollDrop } from "./drops";
import { droppableGuns } from "./weaponTiers";
import { composeWave, spawnPos } from "./waves";
import { CAMPAIGN_WAVES, stageForWave } from "./stages";
import { resetPartyForStage } from "./match";
import { freshAmmo, GUNS } from "./weapons";
import type { Enemy, Hazard, Pickup, PlayerId, Projectile, ShooterEvent, ShooterIntent, ShooterPhase, ShooterPlayer, ShooterWorld } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The telegraphed blast an exploder leaves when it dies (a burst hazard — one-shot on fuse end). */
const deathBlast = (e: Enemy, tick: number): Hazard => ({
  id: `hz:${e.id}:${tick}`, kind: "blast", pos: { x: e.pos.x, y: e.pos.y }, radius: EXPLODER_BLAST_RADIUS_M,
  telegraph: EXPLODER_FUSE_S, duration: 0, dps: 0, burst: EXPLODER_BLAST_DAMAGE,
});

export function stepShooter(
  world: ShooterWorld,
  intents: Record<PlayerId, ShooterIntent>,
  dt: number,
): ShooterWorld {
  if (world.phase === "ended" || world.phase === "victory") return world; // 1. frozen for the scoreboard

  const tick = world.tick + 1;
  const seed = world.seed;
  const mode = world.mode;
  const ids = Object.keys(world.players).sort();
  const events: ShooterEvent[] = world.events.filter((e) => e.tick > tick - EVENT_TTL_TICKS); // 2.
  const players: Record<PlayerId, ShooterPlayer> = { ...world.players };
  let enemies: Enemy[] = world.enemies;
  let pickups: Pickup[] = [...world.pickups];
  let hazards: Hazard[] = [...(world.hazards ?? [])];
  // Telegraphed blasts left by exploders that die this tick (from any source). Spawned into `hazards`
  // in block 6b so they can't detonate on their birth tick.
  const deathBlasts: Hazard[] = [];
  let { score, pity, spawnSeq, wave, partySize, intermission } = world;
  let pending = world.pending;
  let stageIntroRemaining = world.stageIntroRemaining ?? 0;
  // Rockets launched this tick (from block 5's fireTick), advanced in block 5c.
  const newProjectiles: Projectile[] = [];

  /**
   * Resolve one enemy's death: XP + kill-stat to `killerId` (when attributable), always party score,
   * a kill event, an exploder's death blast, and a drop roll. Shared by the rocket explosion (5c).
   */
  const awardKill = (e: Enemy, killerId: PlayerId | null): void => {
    const def = ENEMIES[e.kind];
    if (killerId && players[killerId]) {
      const kp = players[killerId]!;
      let xp = kp.xp + def.xp;
      let level = kp.level;
      let offers = kp.offers;
      while (xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level += 1;
        offers = [...offers, rollOffer(seed, tick, kp.id, level)];
        events.push({ tick, kind: "levelup", playerId: kp.id });
      }
      players[killerId] = { ...kp, xp, level, offers, stats: { ...kp.stats, kills: kp.stats.kills + 1 } };
    }
    score += def.scoreValue * wave;
    events.push({ tick, kind: "kill", pos: { x: e.pos.x, y: e.pos.y }, enemy: e.kind });
    if (e.kind === "exploder") deathBlasts.push(deathBlast(e, tick));
    const drop = rollDrop(seed, tick, e, pickups.length, pity, droppableGuns(mode, wave));
    pity = drop.pity;
    if (drop.pickup) pickups.push(drop.pickup);
  };

  // 3. perk picks
  for (const id of ids) {
    const pick = intents[id]?.perkPick ?? null;
    const p = players[id]!;
    if (pick !== null && p.offers.length > 0) {
      const [head, ...rest] = p.offers;
      players[id] = { ...p, perks: [...p.perks, head!.choices[pick]], offers: rest };
    }
  }

  // 4. upkeep + movement
  for (const id of ids) {
    const intent = intents[id];
    let p = players[id]!;
    const eff = effectiveStats(p.perks);
    p = tickAmmo(p, dt, eff);
    p = { ...p, swapGuard: Math.max(0, p.swapGuard - dt) };
    if (p.status === "alive" && intent) {
      if (intent.aim !== undefined && Number.isFinite(intent.aim)) p = { ...p, aim: intent.aim };
      const mx = (intent.move.right ? 1 : 0) - (intent.move.left ? 1 : 0);
      const my = (intent.move.down ? 1 : 0) - (intent.move.up ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        const n = Math.hypot(mx, my);
        const v = PLAYER_SPEED_MS * eff.moveSpeedMult * dt;
        p = {
          ...p,
          pos: {
            x: clamp(p.pos.x + (mx / n) * v, PLAYER_RADIUS_M, OVERRUN_FIELD_M - PLAYER_RADIUS_M),
            y: clamp(p.pos.y + (my / n) * v, PLAYER_RADIUS_M, OVERRUN_FIELD_M - PLAYER_RADIUS_M),
          },
        };
      }
      if (intent.reload) p = tryStartReload(p, eff);
    }
    players[id] = p;
  }

  // 5. firing + kill attribution (sequential per player so the killer is unambiguous)
  for (const id of ids) {
    const intent = intents[id];
    let p = players[id]!;
    const eff = effectiveStats(p.perks);
    const res = fireTick(p, enemies, intent?.fire ?? false, seed, tick, eff);
    p = res.player;
    events.push(...res.events);
    if (res.spawned) newProjectiles.push(...res.spawned);
    const survivors: Enemy[] = [];
    for (const e of res.enemies) {
      if (e.health > 0) {
        survivors.push(e);
        continue;
      }
      const def = ENEMIES[e.kind];
      // xp + level-ups
      let xp = p.xp + def.xp;
      let level = p.level;
      let offers = p.offers;
      while (xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level += 1;
        offers = [...offers, rollOffer(seed, tick, p.id, level)];
        events.push({ tick, kind: "levelup", playerId: p.id });
      }
      p = { ...p, xp, level, offers, stats: { ...p.stats, kills: p.stats.kills + 1 } };
      score += def.scoreValue * wave;
      events.push({ tick, kind: "kill", pos: { x: e.pos.x, y: e.pos.y }, enemy: e.kind });
      if (e.kind === "exploder") deathBlasts.push(deathBlast(e, tick));
      const drop = rollDrop(seed, tick, e, pickups.length, pity, droppableGuns(mode, wave));
      pity = drop.pity;
      if (drop.pickup) pickups.push(drop.pickup);
    }
    enemies = survivors;
    players[id] = p;
  }

  // 5b. burn-over-time (flamethrower): tick fire damage on lit enemies. Environmental kills award
  // party score + a drop + a kill event, but no per-player XP (the flamer's XP comes from direct hits).
  if (enemies.some((e) => (e.burning ?? 0) > 0)) {
    const survivors: Enemy[] = [];
    for (const e of enemies) {
      const burn = e.burning ?? 0;
      if (burn <= 0) {
        survivors.push(e);
        continue;
      }
      const health = e.health - BURN_DPS * dt;
      if (health > 0) {
        survivors.push({ ...e, health, burning: Math.max(0, burn - dt) });
        continue;
      }
      const def = ENEMIES[e.kind];
      score += def.scoreValue * wave;
      events.push({ tick, kind: "kill", pos: { x: e.pos.x, y: e.pos.y }, enemy: e.kind });
      if (e.kind === "exploder") deathBlasts.push(deathBlast(e, tick));
      const drop = rollDrop(seed, tick, e, pickups.length, pity, droppableGuns(mode, wave));
      pity = drop.pity;
      if (drop.pickup) pickups.push(drop.pickup);
    }
    enemies = survivors;
  }

  // 5c. rockets: advance each in-flight projectile; it detonates on the first enemy struck, at range
  // end, or at the field edge — an AoE burst hitting every enemy within ROCKET_BLAST_RADIUS_M (kills go
  // to the owner). Rockets launched this tick join here; the whole set is capped for wire/CPU safety.
  let projectiles = [...(world.projectiles ?? []), ...newProjectiles].slice(0, MAX_PROJECTILES);
  if (projectiles.length > 0) {
    const flying: Projectile[] = [];
    for (const pj of projectiles) {
      const stepM = Math.min(pj.speed * dt, pj.remaining);
      const nx = clamp(pj.pos.x + pj.dir.x * stepM, 0, OVERRUN_FIELD_M);
      const ny = clamp(pj.pos.y + pj.dir.y * stepM, 0, OVERRUN_FIELD_M);
      const remaining = pj.remaining - stepM;
      const struck = enemies.some((e) => e.health > 0 && Math.hypot(e.pos.x - nx, e.pos.y - ny) <= ENEMIES[e.kind].hitRadius);
      const edge = nx <= 0 || nx >= OVERRUN_FIELD_M || ny <= 0 || ny >= OVERRUN_FIELD_M;
      if (!struck && remaining > 0 && !edge) {
        flying.push({ ...pj, pos: { x: nx, y: ny }, remaining });
        continue;
      }
      // Airburst at (nx, ny): one hit to every enemy in the blast radius; kills credit the owner.
      events.push({ tick, kind: "blast", pos: { x: nx, y: ny }, radius: ROCKET_BLAST_RADIUS_M });
      const survivors: Enemy[] = [];
      for (const e of enemies) {
        if (Math.hypot(e.pos.x - nx, e.pos.y - ny) > ROCKET_BLAST_RADIUS_M) {
          survivors.push(e);
          continue;
        }
        const health = e.health - ROCKET_BLAST_DAMAGE;
        if (health > 0) survivors.push({ ...e, health });
        else awardKill(e, pj.ownerId);
      }
      enemies = survivors;
    }
    projectiles = flying;
  }

  // 6. enemies: chase (with separation + intercept lead) + contact damage
  const aliveSorted = () => ids.map((i) => players[i]!).filter((p) => p.status === "alive");
  // Snapshot who's alive BEFORE contact resolves: a teammate downed by an enemy
  // this same tick still counts as having helped revive (actions within a tick
  // are conceptually simultaneous — see the "revive-before-wipe, same tick" case).
  const preCombatAliveIds = new Set(aliveSorted().map((p) => p.id));
  const speedMult = wave === 1 ? WAVE1_SPEED_MULT : 1;
  // Per-player velocity this tick (players already moved in step 5) — enemies lead it to intercept.
  const playerVel: Record<PlayerId, { x: number; y: number }> = {};
  for (const id of ids) {
    playerVel[id] = { x: players[id]!.pos.x - world.players[id]!.pos.x, y: players[id]!.pos.y - world.players[id]!.pos.y };
  }
  // Separation reads every enemy's position from THIS frame's input (crowd), so the push is
  // order-independent and deterministic regardless of map iteration order.
  const crowd = enemies;
  // Acid pools emitted by spitters this tick (spawned after the map, so they don't hurt on their birth tick).
  const spitLandings: Hazard[] = [];
  // Swarmling broods requested by hives this tick (birthed after the map, using spawnSeq for ids/positions).
  const broodRequests: { pos: { x: number; y: number }; count: number }[] = [];
  // Tentacle slams emitted by the Kraken this tick (spawned into hazards in block 6b like spit pools).
  const bossStrikes: Hazard[] = [];
  enemies = enemies.map((e) => {
    const target = nearestAlive(e.pos, aliveSorted());

    // Intercept: aim where the target is heading, not where it is (capped so strafing can't fling it).
    let aimPos: { x: number; y: number } | null = null;
    if (target) {
      const v = playerVel[target.id] ?? { x: 0, y: 0 };
      let leadX = v.x * ENEMY_LEAD_TICKS;
      let leadY = v.y * ENEMY_LEAD_TICKS;
      const leadLen = Math.hypot(leadX, leadY);
      if (leadLen > ENEMY_LEAD_MAX_M) {
        leadX = (leadX / leadLen) * ENEMY_LEAD_MAX_M;
        leadY = (leadY / leadLen) * ENEMY_LEAD_MAX_M;
      }
      aimPos = { x: target.pos.x + leadX, y: target.pos.y + leadY };
    }

    // Separation: sum of inverse-distance pushes away from nearby enemies, capped to a unit vector.
    let sepX = 0;
    let sepY = 0;
    for (const o of crowd) {
      if (o.id === e.id) continue;
      const ox = e.pos.x - o.pos.x;
      const oy = e.pos.y - o.pos.y;
      const d = Math.hypot(ox, oy);
      if (d > 1e-6 && d < ENEMY_SEPARATION_M) {
        const push = (1 - d / ENEMY_SEPARATION_M) / d;
        sepX += ox * push;
        sepY += oy * push;
      }
    }
    const sepLen = Math.hypot(sepX, sepY);
    const separation = sepLen > 1 ? { x: sepX / sepLen, y: sepY / sepLen } : { x: sepX, y: sepY };

    // Frenzied elites move faster: fold the elite speed mult into this tick's base (wave-1 slowdown) mult.
    const eSpeedMult = speedMult * (e.elite ? eliteMods(e.kind).speedMult : 1);

    // Tanks run the Rush state machine (charge to a locked point); spitters kite + lob acid pools;
    // hives crawl + spawn broods; everything else chases.
    let stepped: Enemy;
    let rushLanded = false;
    if (e.kind === "tank") {
      const r = stepTank(e, aimPos, target ? target.pos : null, dt, eSpeedMult, separation);
      stepped = r.enemy;
      rushLanded = r.landed;
    } else if (e.kind === "spitter") {
      const r = stepSpitter(e, target ? target.pos : null, dt, eSpeedMult, separation);
      stepped = r.enemy;
      if (r.spit) {
        spitLandings.push({
          id: `hz:${e.id}:${tick}`, kind: "spit", pos: { ...r.spit }, radius: SPIT_HAZARD_RADIUS_M,
          telegraph: SPIT_HAZARD_TELEGRAPH_S, duration: SPIT_HAZARD_DURATION_S, dps: SPIT_DPS,
        });
      }
    } else if (e.kind === "hive") {
      const r = stepHive(e, aimPos, dt, eSpeedMult, separation);
      stepped = r.enemy;
      if (r.spawn > 0) broodRequests.push({ pos: { x: stepped.pos.x, y: stepped.pos.y }, count: r.spawn });
    } else if (e.kind === "kraken") {
      const r = stepKraken(e, aliveSorted(), dt, seed, tick);
      stepped = r.enemy;
      bossStrikes.push(...r.strikes);
    } else {
      stepped = stepEnemy(e, aimPos, dt, eSpeedMult, separation);
    }
    const rushing = (stepped.special ?? "none") !== "none";

    // Rush landing: a 50%-max-HP area hit to every alive player near the charge's endpoint.
    if (rushLanded) {
      for (const p of aliveSorted()) {
        if (Math.hypot(p.pos.x - stepped.pos.x, p.pos.y - stepped.pos.y) > RUSH_HIT_RADIUS_M) continue;
        const health = Math.max(0, p.health - effectiveStats(p.perks).maxHealth * RUSH_HIT_FRACTION);
        players[p.id] = health === 0 ? { ...p, health: 0, status: "downed", reviveProgress: 0 } : { ...p, health };
        events.push(health === 0 ? { tick, kind: "downed", playerId: p.id } : { tick, kind: "playerHit", playerId: p.id });
      }
    }

    // Normal contact damage — keyed off the REAL target position (lead is only for movement). Skipped
    // while a tank is mid-Rush; its landing hit stands in for contact during the charge.
    if (target && !rushing) {
      const def = ENEMIES[e.kind];
      const d = Math.hypot(target.pos.x - stepped.pos.x, target.pos.y - stepped.pos.y);
      if (d <= def.radius + PLAYER_RADIUS_M + ENEMY_CONTACT_SLACK_M && stepped.attackCooldown === 0 && stepped.stunRemaining <= 0) {
        const t = players[target.id]!;
        const dmg = Math.round(def.damage * (stepped.elite ? eliteMods(stepped.kind).damageMult : 1));
        const health = Math.max(0, t.health - dmg);
        players[target.id] =
          health === 0
            ? { ...t, health: 0, status: "downed", reviveProgress: 0 }
            : { ...t, health };
        if (health === 0) events.push({ tick, kind: "downed", playerId: t.id });
        else events.push({ tick, kind: "playerHit", playerId: t.id });
        // Freeze briefly after attacking so the player gets a beat to peel away.
        stepped = { ...stepped, attackCooldown: def.attackInterval, stunRemaining: Math.max(stepped.stunRemaining, ENEMY_ATTACK_FREEZE_S) };
      }
    }
    return stepped;
  });

  // 6b. hazards: add this tick's fresh spit pools + exploder death blasts, advance each hazard's lifecycle.
  // A BURST detonating this tick deals its one-shot to players in radius; an ACTIVE POOL drains dps/sec.
  // Runs before revive so a hazard-downed player still gets same-tick revive-before-wipe treatment.
  const damageArea = (center: { x: number; y: number }, radius: number, amount: number) => {
    if (amount <= 0) return;
    for (const p of aliveSorted()) {
      if (Math.hypot(p.pos.x - center.x, p.pos.y - center.y) > radius) continue;
      const health = Math.max(0, p.health - amount);
      players[p.id] = health === 0 ? { ...p, health: 0, status: "downed", reviveProgress: 0 } : { ...p, health };
      events.push(health === 0 ? { tick, kind: "downed", playerId: p.id } : { tick, kind: "playerHit", playerId: p.id });
    }
  };
  const survivingHazards: Hazard[] = [];
  for (const h of [...hazards, ...deathBlasts, ...spitLandings, ...bossStrikes]) {
    const { hazard, detonated } = stepHazard(h, dt);
    if (detonated) damageArea(h.pos, h.radius, h.burst ?? 0);
    if (hazard) survivingHazards.push(hazard);
  }
  hazards = survivingHazards;
  for (const h of hazards) {
    if (hazardActive(h) && h.dps > 0) damageArea(h.pos, h.radius, h.dps * dt);
  }

  // 6c. hive broods: birth requested swarmlings on a deterministic ring around each hive (no RNG). New
  // swarmlings are appended so they don't act until next tick. spawnSeq keys their ids (and shifts later
  // wave-spawn draws identically on every peer).
  if (broodRequests.length > 0) {
    const swR = ENEMIES.swarmling.radius;
    // Brood swarmlings inherit the campaign stage's HP scaling (hives only appear in the stage-6 pool),
    // so they're as tough as the wave's other spawns. Not elite.
    const broodHealth = Math.round(ENEMIES.swarmling.health * (mode === "campaign" ? stageHealthMult(stageForWave(wave).stage) : 1));
    const brood: Enemy[] = [];
    for (const req of broodRequests) {
      for (let k = 0; k < req.count && enemies.length + brood.length < MAX_ENEMIES; k++) {
        const ang = (k / req.count) * Math.PI * 2;
        brood.push({
          id: `e${spawnSeq}`, kind: "swarmling",
          pos: {
            x: clamp(req.pos.x + Math.cos(ang) * HIVE_BROOD_RING_M, swR, OVERRUN_FIELD_M - swR),
            y: clamp(req.pos.y + Math.sin(ang) * HIVE_BROOD_RING_M, swR, OVERRUN_FIELD_M - swR),
          },
          health: broodHealth, attackCooldown: 0, stunRemaining: 0,
        });
        spawnSeq += 1;
      }
    }
    enemies = [...enemies, ...brood];
  }

  // 7. revive (proximity)
  for (const id of ids) {
    const p = players[id]!;
    if (p.status !== "downed") continue;
    const helper = ids.some(
      (qid) =>
        qid !== id &&
        preCombatAliveIds.has(qid) &&
        Math.hypot(players[qid]!.pos.x - p.pos.x, players[qid]!.pos.y - p.pos.y) <= REVIVE_RANGE_M,
    );
    if (!helper) {
      if (p.reviveProgress !== 0) players[id] = { ...p, reviveProgress: 0 };
      continue;
    }
    const progress = p.reviveProgress + dt;
    if (progress >= REVIVE_S) {
      const eff = effectiveStats(p.perks);
      players[id] = { ...p, status: "alive", health: Math.min(REVIVE_HEALTH, eff.maxHealth), reviveProgress: 0 };
      events.push({ tick, kind: "revived", playerId: id });
    } else {
      players[id] = { ...p, reviveProgress: progress };
    }
  }

  // 8. wipe check (after revive — revive-before-wipe)
  // Explicit annotation: control-flow narrowing on the early `phase === "ended"`
  // return above would otherwise infer `phase` as the literal "playing" here,
  // rejecting the "ended" assignment two lines down.
  let phase: ShooterPhase = world.phase;
  if (!ids.some((id) => players[id]!.status === "alive")) phase = "ended";

  // 9. pickups: expiry + collection
  pickups = pickups.map((k) => ({ ...k, ttl: k.ttl - dt })).filter((k) => k.ttl > 0);
  for (const id of ids) {
    let p = players[id]!;
    if (p.status !== "alive") continue;
    const eff = effectiveStats(p.perks);
    const remaining: Pickup[] = [];
    for (const k of pickups) {
      const inRange = Math.hypot(k.pos.x - p.pos.x, k.pos.y - p.pos.y) <= eff.pickupRadius;
      if (!inRange) {
        remaining.push(k);
        continue;
      }
      if (k.kind === "medkit") {
        p = { ...p, health: Math.min(eff.maxHealth, p.health + MEDKIT_HEAL) };
      } else if (p.swapGuard > 0) {
        remaining.push(k);
        continue;
      } else if (k.kind === p.gun) {
        p = { ...p, ammo: { ...p.ammo, reserve: GUNS[p.gun].reserveMax ?? 0 } };
      } else {
        p = { ...p, gun: k.kind, ammo: freshAmmo(k.kind), swapGuard: SWAP_GUARD_S };
      }
      events.push({ tick, kind: "pickup", pos: { x: k.pos.x, y: k.pos.y }, item: k.kind });
    }
    pickups = remaining;
    players[id] = p;
  }

  // 10. waves + spawning
  const partyCount = () => ids.filter((id) => players[id]!.status !== "dead").length;
  if (phase === "playing") {
    if (stageIntroRemaining > 0) {
      // Between-stage comic beat: hold (no spawning) until it elapses, then compose the held wave.
      stageIntroRemaining = Math.max(0, stageIntroRemaining - dt);
      if (stageIntroRemaining === 0) {
        partySize = partyCount();
        pending = composeWave(seed, wave, partySize, { campaign: mode === "campaign" });
      }
    } else if (wave === 0) {
      wave = 1;
      partySize = partyCount();
      pending = composeWave(seed, wave, partySize, { campaign: mode === "campaign" });
    } else if (pending.length === 0 && enemies.length === 0 && intermission === 0) {
      intermission = INTERMISSION_S;
      for (const id of ids) {
        const p = players[id]!;
        if (p.status === "downed") {
          const eff = effectiveStats(p.perks);
          players[id] = { ...p, status: "alive", health: Math.min(REVIVE_HEALTH, eff.maxHealth), reviveProgress: 0 };
          events.push({ tick, kind: "revived", playerId: id });
        }
      }
    } else if (intermission > 0) {
      intermission = Math.max(0, intermission - dt);
      if (intermission === 0) {
        if (mode === "campaign" && wave >= CAMPAIGN_WAVES) {
          // Final stage's last wave cleared — the campaign is won. Survival never hits this.
          phase = "victory";
        } else {
          const fromStage = stageForWave(wave).stage;
          wave += 1;
          const crossedStage = mode === "campaign" && stageForWave(wave).stage > fromStage;
          if (crossedStage) {
            // Stage cleared → reset the party (fresh level 1 + pistol) and play the synced comic beat.
            // Spawning is held until `stageIntroRemaining` elapses (the branch above composes the wave).
            for (const [id, p] of Object.entries(resetPartyForStage(players))) players[id] = p;
            stageIntroRemaining = COMIC_INTERSTITIAL_S;
          } else {
            partySize = partyCount();
            pending = composeWave(seed, wave, partySize, { campaign: mode === "campaign" });
          }
        }
      }
    }
    if (pending.length > 0) {
      const spawned: Enemy[] = [];
      let queue = pending;
      while (spawned.length < SPAWNS_PER_TICK && queue.length > 0 && enemies.length + spawned.length < MAX_ENEMIES) {
        const kind = queue[0]!;
        queue = queue.slice(1);
        // Campaign: roll elite (frenzied rusher / armored tank) from ELITE_MIN_STAGE, and bake the
        // per-stage + elite HP multiplier into spawn health. Survival keeps flat base HP, no elites.
        const stage = mode === "campaign" ? stageForWave(wave).stage : 0;
        const elite =
          mode === "campaign" && stage >= ELITE_MIN_STAGE && (kind === "rusher" || kind === "tank") &&
          hash01(seed, "elite", spawnSeq) < ELITE_CHANCE;
        const hMult = mode === "campaign" ? stageHealthMult(stage) * (elite ? eliteMods(kind).healthMult : 1) : 1;
        // The Kraken's HP is party-scaled (never per-stage/elite scaled); everything else uses hMult.
        const health = kind === "kraken" ? krakenHp(partySize) : Math.round(ENEMIES[kind].health * hMult);
        const base: Enemy = {
          id: `e${spawnSeq}`, kind, pos: spawnPos(seed, spawnSeq),
          health, attackCooldown: 0, stunRemaining: 0,
          ...(elite ? { elite: true } : {}),
        };
        // Tanks carry the Rush state machine; spitters the spit cooldown; hives the brood timer; the
        // Kraken its attack timer. All start in `none`. Rushers/swarmlings/exploders are plain chasers.
        const withSpecial =
          kind === "tank" ? { ...base, special: "none" as const, specialRemaining: RUSH_COOLDOWN_S, rushTo: null }
          : kind === "spitter" ? { ...base, special: "none" as const, specialRemaining: SPIT_COOLDOWN_S, rushTo: null }
          : kind === "hive" ? { ...base, special: "none" as const, specialRemaining: HIVE_SPAWN_INTERVAL_S, rushTo: null }
          : kind === "kraken" ? { ...base, special: "none" as const, specialRemaining: KRAKEN_ATTACK_INTERVAL_S, rushTo: null }
          : base;
        spawned.push(withSpecial);
        spawnSeq += 1;
      }
      pending = queue;
      enemies = [...enemies, ...spawned];
    }
  }

  // 11. caps
  const cappedEvents = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

  return {
    tick, phase, mode, seed, wave, partySize, pending, intermission, stageIntroRemaining,
    players, enemies, pickups, hazards, projectiles, events: cappedEvents, score, spawnSeq, pity,
  };
}
