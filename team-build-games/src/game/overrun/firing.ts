/**
 * Hitscan firing + the reload state machine. Bullets resolve on the fire tick —
 * they never exist as world state, so they never serialize. Rays query ENEMIES
 * ONLY: no friendly fire is possible by construction.
 *
 * Every random draw (pellet spread) is hash01(seed, tick, playerId, pellet) —
 * stable coordinates, no cursor.
 */

import { hash01 } from "./rng";
import { ENEMIES } from "./enemies";
import { ENEMY_HIT_KNOCKBACK_M, ENEMY_HIT_STUN_S, FLAME_BURN_S, FLAME_CONE_RAD, OVERRUN_FIELD_M, ROCKET_MUZZLE_M, ROCKET_SPEED_MS } from "./constants";
import type { EffectiveStats } from "./perks";
import { freshAmmo, GUNS, hasReserve } from "./weapons";
import type { Enemy, Projectile, ShooterEvent, ShooterPlayer } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Advance cooldowns/reload by dt; a finished reload fills the mag from reserve. */
export function tickAmmo(p: ShooterPlayer, dt: number, _eff: EffectiveStats): ShooterPlayer {
  const def = GUNS[p.gun];
  const fireCooldown = Math.max(0, p.ammo.fireCooldown - dt);
  let { mag, reserve, reloadRemaining } = p.ammo;
  if (reloadRemaining > 0) {
    reloadRemaining = Math.max(0, reloadRemaining - dt);
    if (reloadRemaining === 0) {
      const want = def.magSize - mag;
      const take = def.reserveMax === null ? want : Math.min(want, reserve);
      mag += take;
      if (def.reserveMax !== null) reserve -= take;
    }
  }
  return { ...p, ammo: { mag, reserve, reloadRemaining, fireCooldown } };
}

/** Start a reload if it would do something (blocks firing, not movement). */
export function tryStartReload(p: ShooterPlayer, eff: EffectiveStats): ShooterPlayer {
  const def = GUNS[p.gun];
  if (p.ammo.reloadRemaining > 0 || p.ammo.mag >= def.magSize || !hasReserve(p.gun, p.ammo)) return p;
  return { ...p, ammo: { ...p.ammo, reloadRemaining: def.reloadS * eff.reloadMult } };
}

/** One player's firing resolution for this tick. Damaged enemies return with reduced health. */
export function fireTick(
  p: ShooterPlayer,
  enemies: Enemy[],
  fire: boolean,
  seed: number,
  tick: number,
  eff: EffectiveStats,
): { player: ShooterPlayer; enemies: Enemy[]; events: ShooterEvent[]; spawned?: Projectile[] } {
  if (!fire || p.status !== "alive" || p.ammo.reloadRemaining > 0 || p.ammo.fireCooldown > 0) {
    return { player: p, enemies, events: [] };
  }
  const def = GUNS[p.gun];
  if (p.ammo.mag <= 0) {
    if (hasReserve(p.gun, p.ammo)) return { player: tryStartReload(p, eff), enemies, events: [] };
    // both empty → the infinite-pistol fallback
    return { player: { ...p, gun: "pistol", ammo: freshAmmo("pistol") }, enemies, events: [] };
  }

  const out = enemies.map((e) => ({ ...e }));
  const events: ShooterEvent[] = [];
  let landed = false;
  let spawned: Projectile[] | undefined;
  const spreadRad = (def.spreadDeg * Math.PI) / 180;
  // Dedupe knockback per enemy per fireTick call: a shotgun blast must knock an
  // enemy back once (0.5m), not once per pellet that lands on it (up to 8×0.5m).
  const knockedBack = new Set<string>();

  // Rocket: launches a TRAVELLING projectile (the sim advances it + detonates the AoE). The "shot"
  // event with to == muzzle drives the launch flash + recoil; no immediate hit resolves here.
  if (p.gun === "rocket") {
    const dir = { x: Math.cos(p.aim), y: Math.sin(p.aim) };
    const from = { x: p.pos.x + dir.x * ROCKET_MUZZLE_M, y: p.pos.y + dir.y * ROCKET_MUZZLE_M };
    spawned = [{ id: `pj:${p.id}:${tick}`, pos: from, dir, speed: ROCKET_SPEED_MS, remaining: def.range, ownerId: p.id }];
    events.push({ tick, kind: "shot", gun: p.gun, from: { x: p.pos.x, y: p.pos.y }, to: from });
  } else
  // Flamethrower: a continuous CONE — every enemy within range and ±FLAME_CONE_RAD of the aim takes
  // the per-tick direct hit and is set alight (burn-over-time ticks in the sim). No pellets/pierce.
  if (p.gun === "flamethrower") {
    const aimX = Math.cos(p.aim);
    const aimY = Math.sin(p.aim);
    const cosHalf = Math.cos(FLAME_CONE_RAD);
    for (const e of out) {
      if (e.health <= 0) continue;
      const rx = e.pos.x - p.pos.x;
      const ry = e.pos.y - p.pos.y;
      const dist = Math.hypot(rx, ry);
      if (dist < 1e-6 || dist > def.range + ENEMIES[e.kind].hitRadius) continue;
      if ((rx * aimX + ry * aimY) / dist < cosHalf) continue; // outside the cone half-angle
      e.health -= def.damage * eff.damageMult;
      e.burning = FLAME_BURN_S; // ignite / refresh the burn timer
      landed = true;
      events.push({ tick, kind: "hit", pos: { x: e.pos.x, y: e.pos.y } });
    }
    events.push({
      tick, kind: "shot", gun: p.gun,
      from: { x: p.pos.x, y: p.pos.y },
      to: { x: p.pos.x + aimX * def.range, y: p.pos.y + aimY * def.range },
    });
  } else
  for (let pellet = 0; pellet < def.pellets; pellet++) {
    const a = p.aim + (hash01(seed, tick, p.id, "spread", pellet) * 2 - 1) * spreadRad;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    // Collect ray hits against the visible sprite radius, not the smaller physical
    // contact radius that keeps movement and melee spacing comfortable.
    const hits: { idx: number; t: number }[] = [];
    out.forEach((e, idx) => {
      if (e.health <= 0) return; // already dead from an earlier pellet
      const rx = e.pos.x - p.pos.x;
      const ry = e.pos.y - p.pos.y;
      const t = rx * dir.x + ry * dir.y;
      if (t < 0 || t > def.range) return;
      const perp = Math.hypot(rx - t * dir.x, ry - t * dir.y);
      if (perp <= ENEMIES[e.kind].hitRadius) hits.push({ idx, t });
    });
    hits.sort((h1, h2) => h1.t - h2.t || (out[h1.idx]!.id < out[h2.idx]!.id ? -1 : 1));
    const taken = hits.slice(0, def.pierce + 1);
    for (const h of taken) {
      const hitEnemy = out[h.idx]!;
      hitEnemy.health -= def.damage * eff.damageMult;
      landed = true;
      const kindDef = ENEMIES[hitEnemy.kind];
      // Heavy units (tank) shrug off bullets: no stun, no knockback — they keep advancing.
      if (kindDef.stagger) hitEnemy.stunRemaining = ENEMY_HIT_STUN_S;
      if (!knockedBack.has(hitEnemy.id)) {
        knockedBack.add(hitEnemy.id);
        if (kindDef.stagger) {
          hitEnemy.pos = {
            x: clamp(hitEnemy.pos.x + dir.x * ENEMY_HIT_KNOCKBACK_M, kindDef.radius, OVERRUN_FIELD_M - kindDef.radius),
            y: clamp(hitEnemy.pos.y + dir.y * ENEMY_HIT_KNOCKBACK_M, kindDef.radius, OVERRUN_FIELD_M - kindDef.radius),
          };
        }
        events.push({ tick, kind: "hit", pos: { x: hitEnemy.pos.x, y: hitEnemy.pos.y } });
      }
    }
    const endT = taken.length > 0 ? taken[taken.length - 1]!.t : def.range;
    events.push({
      tick, kind: "shot", gun: p.gun,
      from: { x: p.pos.x, y: p.pos.y },
      to: { x: p.pos.x + dir.x * endT, y: p.pos.y + dir.y * endT },
    });
  }

  const player: ShooterPlayer = {
    ...p,
    ammo: { ...p.ammo, mag: p.ammo.mag - 1, fireCooldown: 60 / (def.rpm * eff.fireRateMult) },
    stats: { ...p.stats, shots: p.stats.shots + 1, hits: p.stats.hits + (landed ? 1 : 0) },
  };
  return { player, enemies: out, events, spawned };
}
