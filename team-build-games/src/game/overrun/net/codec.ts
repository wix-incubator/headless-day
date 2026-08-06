// src/game/overrun/net/codec.ts
/**
 * Quantized wire codec (the absorbed P-A0): positions → int cm, times → int cs,
 * aim → int mrad; enemies/pickups/events as tuples; players as short-key objects
 * (≤8 of them). Deltas diff QUANTIZED forms so a client applying a delta lands
 * exactly on unq(q(hostWorld)) — no drift between keyframes.
 *
 * Keyframes carry EVERYTHING (seed, spawnSeq, pity, pending, offers…) so a
 * migrating host resumes bit-compatibly from its last received snapshot.
 */

import type { PlayerId, Vec2 } from "../types";
import { EVENT_TTL_TICKS, MAX_EVENTS } from "../constants";
import { ENEMY_KINDS } from "../enemies";
import { GUN_IDS } from "../weapons";
import { PERK_IDS } from "../perks";
import type {
  Enemy, EnemyKind, EnemySpecial, Hazard, HazardKind, PerkId, PerkOffer, Pickup, PickupKind, Projectile, ShooterEvent,
  ShooterPhase, ShooterPlayer, ShooterStatus, ShooterWorld,
} from "../types";

const cm = (m: number) => Math.round(m * 100);
const m = (cmv: number) => cmv / 100;
const cs = (s: number) => Math.round(s * 100);
const s = (csv: number) => csv / 100;
const mrad = (rad: number) => Math.round(rad * 1000);
const rad = (mr: number) => mr / 1000;

const STATUS = ["alive", "downed", "dead"] as const satisfies readonly ShooterStatus[];
type AssertAllStatus = ShooterStatus extends (typeof STATUS)[number] ? true : never;
const _assertAllStatus: AssertAllStatus = true;

// Append-only — index is the wire encoding; never renumber existing entries.
const PICKUP_KINDS = ["shotgun", "rifle", "medkit", "autorifle", "smg", "dmr", "flamethrower", "rocket"] as const satisfies readonly PickupKind[];
type AssertAllPickupKind = PickupKind extends (typeof PICKUP_KINDS)[number] ? true : never;
const _assertAllPickupKind: AssertAllPickupKind = true;

const EVENT_KINDS = ["shot", "kill", "pickup", "levelup", "downed", "revived", "hit", "playerHit", "blast"] as const satisfies readonly ShooterEvent["kind"][];
type AssertAllEventKind = ShooterEvent["kind"] extends (typeof EVENT_KINDS)[number] ? true : never;
const _assertAllEventKind: AssertAllEventKind = true;

// Tank Rush state ↔ int (append-only). Index 0 = "none" so untagged enemies decode to normal chase.
const SPECIALS = ["none", "rushCharge", "rushRun", "rushRecover", "spitCharge"] as const satisfies readonly EnemySpecial[];
type AssertAllSpecial = EnemySpecial extends (typeof SPECIALS)[number] ? true : never;
const _assertAllSpecial: AssertAllSpecial = true;

// Hazard kind ↔ int (append-only — wire index).
const HAZARD_KINDS = ["spit", "blast", "strike"] as const satisfies readonly HazardKind[];
type AssertAllHazardKind = HazardKind extends (typeof HAZARD_KINDS)[number] ? true : never;
const _assertAllHazardKind: AssertAllHazardKind = true;

// players: short-key object (readable, only 8 of them)
interface QPlayer {
  i: PlayerId; x: number; y: number; a: number; h: number; st: number; g: number;
  am: [number, number, number, number]; // mag, reserve, reloadCs, fireCdCs
  xp: number; lv: number; pk: string; of: number[][]; sh: [number, number, number]; // shots,hits,kills
  rv: number; gd: number;
}
// id, kind, xcm, ycm, health, cdCs, stunCs, special, spRemCs, rushToXcm, rushToYcm (rushTo -1,-1 = null), burnCs, elite(0/1)
// `elite` is immutable after spawn, so it rides only the full tuple (adds/keyframes); delta UPDATES omit
// it — applyDelta's `{...e, …}` spread preserves the flag already on the client.
type QEnemy = [string, number, number, number, number, number, number, number, number, number, number, number, number];
type QPickup = [string, number, number, number, number]; // id, kind, xcm, ycm, ttlCs
// id, kind, xcm, ycm, radiusCm, telegraphCs, durationCs, dps, burst (0 = pool/no burst)
type QHazard = [string, number, number, number, number, number, number, number, number];
// id, xcm, ycm, dirAngleMrad, speedCmS, remainingCm, ownerId
type QProjectile = [string, number, number, number, number, number, string];
type QEvent = (number | string)[]; // [tick, kindIdx, ...payload]

export interface QWorld {
  t: number; ph: number; md: number; sd: number; wv: number; ps: number; pd: string; im: number;
  pl: QPlayer[]; en: QEnemy[]; pk: QPickup[]; ev: QEvent[];
  sc: number; sq: number; py: number;
  /** stageIntroRemaining in cs (between-stage comic hold; 0/absent = none). */
  sir?: number;
  /** Active ground hazards (spit pools; boss strikes). Absent/omitted = none. */
  hz?: QHazard[];
  /** Rockets in flight. Absent/omitted = none. */
  pr?: QProjectile[];
}

// phase ↔ int: 0 playing, 1 ended, 2 victory
const phaseToInt = (p: ShooterPhase): number => (p === "ended" ? 1 : p === "victory" ? 2 : 0);
const intToPhase = (n: number): ShooterPhase => (n === 1 ? "ended" : n === 2 ? "victory" : "playing");

export interface ODelta {
  /** Base tick this delta applies to (client must hold exactly this world). */
  b: number;
  t: number;
  ph: number;
  pl: QPlayer[]; // players always ship in full (≤8)
  // add / update(id,x,y,h,cd,stun,sp,spRemCs,rtx,rty,burnCs) / delete
  en: { a: QEnemy[]; u: [string, number, number, number, number, number, number, number, number, number, number][]; d: string[] };
  pk: QPickup[]; // full pickup list (≤24 small tuples — ttls tick every step, diffing buys nothing)
  hz?: QHazard[]; // full hazard list (timers tick every step, like pickups — diffing buys nothing)
  pr?: QProjectile[]; // full projectile list (moves every step — diffing buys nothing)
  ev: QEvent[]; // events newer than the base tick
  s: [number, number, number, number, number, number]; // wave, partySize, intermissionCs, score, pity, stageIntroCs
  sq: number;
  pd?: string; // pending — full digit-string, only on a non-drain change (e.g. wave start)
  pdo?: number; // pending drained by N from the front (draining is the only in-wave mutation) — cheap alternative to `pd`
}

const qVec = (v: Vec2): [number, number] => [cm(v.x), cm(v.y)];

function qPlayer(p: ShooterPlayer): QPlayer {
  return {
    i: p.id, x: cm(p.pos.x), y: cm(p.pos.y), a: mrad(p.aim), h: Math.round(p.health),
    st: STATUS.indexOf(p.status), g: GUN_IDS.indexOf(p.gun),
    am: [p.ammo.mag, p.ammo.reserve, cs(p.ammo.reloadRemaining), cs(p.ammo.fireCooldown)],
    xp: p.xp, lv: p.level,
    pk: p.perks.map((k) => PERK_IDS.indexOf(k)).join(""),
    of: p.offers.map((o) => o.choices.map((c) => PERK_IDS.indexOf(c))),
    sh: [p.stats.shots, p.stats.hits, p.stats.kills],
    rv: cs(p.reviveProgress), gd: cs(p.swapGuard),
  };
}

function unqPlayer(q: QPlayer): ShooterPlayer {
  return {
    id: q.i, pos: { x: m(q.x), y: m(q.y) }, aim: rad(q.a), health: q.h,
    status: STATUS[q.st]!, gun: GUN_IDS[q.g]!,
    ammo: { mag: q.am[0], reserve: q.am[1], reloadRemaining: s(q.am[2]), fireCooldown: s(q.am[3]) },
    xp: q.xp, level: q.lv,
    perks: [...q.pk].map((c) => PERK_IDS[Number(c)]!) as PerkId[],
    offers: q.of.map((o) => ({ choices: o.map((n) => PERK_IDS[n]!) as PerkOffer["choices"] })),
    stats: { shots: q.sh[0], hits: q.sh[1], kills: q.sh[2] },
    reviveProgress: s(q.rv), swapGuard: s(q.gd),
  };
}

const qEnemy = (e: Enemy): QEnemy => [
  e.id, ENEMY_KINDS.indexOf(e.kind), cm(e.pos.x), cm(e.pos.y), Math.round(e.health), cs(e.attackCooldown), cs(e.stunRemaining),
  SPECIALS.indexOf(e.special ?? "none"), cs(e.specialRemaining ?? 0),
  e.rushTo ? cm(e.rushTo.x) : -1, e.rushTo ? cm(e.rushTo.y) : -1, cs(e.burning ?? 0), e.elite ? 1 : 0,
];
const unqEnemy = (q: QEnemy): Enemy => {
  const e: Enemy = {
    id: q[0], kind: ENEMY_KINDS[q[1]]!, pos: { x: m(q[2]), y: m(q[3]) }, health: q[4], attackCooldown: s(q[5]), stunRemaining: s(q[6]),
    special: SPECIALS[q[7]] ?? "none", specialRemaining: s(q[8]), rushTo: q[9] < 0 ? null : { x: m(q[9]), y: m(q[10]) }, burning: s(q[11]),
  };
  if (q[12] === 1) e.elite = true;
  return e;
};
const qPickup = (k: Pickup): QPickup => [k.id, PICKUP_KINDS.indexOf(k.kind), cm(k.pos.x), cm(k.pos.y), cs(k.ttl)];
const unqPickup = (q: QPickup): Pickup => ({ id: q[0], kind: PICKUP_KINDS[q[1]]!, pos: { x: m(q[2]), y: m(q[3]) }, ttl: s(q[4]) });
const qHazard = (h: Hazard): QHazard => [h.id, HAZARD_KINDS.indexOf(h.kind), cm(h.pos.x), cm(h.pos.y), cm(h.radius), cs(h.telegraph), cs(h.duration), Math.round(h.dps), Math.round(h.burst ?? 0)];
const unqHazard = (q: QHazard): Hazard => {
  const h: Hazard = { id: q[0], kind: HAZARD_KINDS[q[1]]!, pos: { x: m(q[2]), y: m(q[3]) }, radius: m(q[4]), telegraph: s(q[5]), duration: s(q[6]), dps: q[7] };
  if (q[8] > 0) h.burst = q[8];
  return h;
};
const qProjectile = (p: Projectile): QProjectile => [p.id, cm(p.pos.x), cm(p.pos.y), mrad(Math.atan2(p.dir.y, p.dir.x)), Math.round(p.speed * 100), cm(p.remaining), p.ownerId];
const unqProjectile = (q: QProjectile): Projectile => {
  const a = rad(q[3]);
  return { id: q[0], pos: { x: m(q[1]), y: m(q[2]) }, dir: { x: Math.cos(a), y: Math.sin(a) }, speed: q[4] / 100, remaining: m(q[5]), ownerId: q[6] };
};

function qEvent(e: ShooterEvent): QEvent {
  const k = EVENT_KINDS.indexOf(e.kind);
  if (e.kind === "shot") return [e.tick, k, GUN_IDS.indexOf(e.gun), ...qVec(e.from), ...qVec(e.to)];
  if (e.kind === "kill") return [e.tick, k, ENEMY_KINDS.indexOf(e.enemy), ...qVec(e.pos)];
  if (e.kind === "pickup") return [e.tick, k, PICKUP_KINDS.indexOf(e.item), ...qVec(e.pos)];
  if (e.kind === "hit") return [e.tick, k, ...qVec(e.pos)];
  if (e.kind === "blast") return [e.tick, k, ...qVec(e.pos), cm(e.radius)];
  return [e.tick, k, e.playerId];
}

function unqEvent(q: QEvent): ShooterEvent {
  const tick = q[0] as number;
  const kind = EVENT_KINDS[q[1] as number]!;
  if (kind === "shot") return { tick, kind, gun: GUN_IDS[q[2] as number]!, from: { x: m(q[3] as number), y: m(q[4] as number) }, to: { x: m(q[5] as number), y: m(q[6] as number) } };
  if (kind === "kill") return { tick, kind, enemy: ENEMY_KINDS[q[2] as number]!, pos: { x: m(q[3] as number), y: m(q[4] as number) } };
  if (kind === "pickup") return { tick, kind, item: PICKUP_KINDS[q[2] as number]!, pos: { x: m(q[3] as number), y: m(q[4] as number) } };
  if (kind === "hit") return { tick, kind, pos: { x: m(q[2] as number), y: m(q[3] as number) } };
  if (kind === "blast") return { tick, kind, pos: { x: m(q[2] as number), y: m(q[3] as number) }, radius: m(q[4] as number) };
  return { tick, kind, playerId: q[2] as string };
}

const qPending = (pd: EnemyKind[]): string => pd.map((k) => ENEMY_KINDS.indexOf(k)).join("");
const unqPending = (str: string): EnemyKind[] => [...str].map((c) => ENEMY_KINDS[Number(c)]!);

export function qWorld(w: ShooterWorld): QWorld {
  return {
    t: w.tick, ph: phaseToInt(w.phase), md: w.mode === "campaign" ? 1 : 0, sd: w.seed, wv: w.wave, ps: w.partySize,
    pd: qPending(w.pending), im: cs(w.intermission),
    pl: Object.keys(w.players).sort().map((id) => qPlayer(w.players[id]!)),
    en: w.enemies.map(qEnemy), pk: w.pickups.map(qPickup), ev: w.events.map(qEvent),
    sc: w.score, sq: w.spawnSeq, py: w.pity, sir: cs(w.stageIntroRemaining ?? 0),
    hz: (w.hazards ?? []).map(qHazard),
    pr: (w.projectiles ?? []).map(qProjectile),
  };
}

export function unqWorld(q: QWorld): ShooterWorld {
  const players: Record<PlayerId, ShooterPlayer> = {};
  for (const p of q.pl) players[p.i] = unqPlayer(p);
  return {
    tick: q.t, phase: intToPhase(q.ph), mode: q.md === 1 ? "campaign" : "survival", seed: q.sd,
    wave: q.wv, partySize: q.ps, pending: unqPending(q.pd), intermission: s(q.im),
    players, enemies: q.en.map(unqEnemy), pickups: q.pk.map(unqPickup), events: q.ev.map(unqEvent),
    score: q.sc, spawnSeq: q.sq, pity: q.py, stageIntroRemaining: s(q.sir ?? 0),
    hazards: (q.hz ?? []).map(unqHazard),
    projectiles: (q.pr ?? []).map(unqProjectile),
  };
}

/** Diff two QUANTIZED worlds (host: qWorld(lastSent) vs qWorld(current)). */
export function diffWorld(prevQ: QWorld, curQ: QWorld): ODelta {
  const prevEn = new Map(prevQ.en.map((e) => [e[0], e]));
  const curEnIds = new Set(curQ.en.map((e) => e[0]));
  const en: ODelta["en"] = { a: [], u: [], d: [] };
  for (const e of curQ.en) {
    const p = prevEn.get(e[0]);
    if (!p) en.a.push(e);
    else if (p.slice(2).some((v, k) => v !== e[k + 2]))
      en.u.push([e[0], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[10], e[11]]);
  }
  for (const e of prevQ.en) if (!curEnIds.has(e[0])) en.d.push(e[0]);

  const d: ODelta = {
    b: prevQ.t, t: curQ.t, ph: curQ.ph, pl: curQ.pl, en, pk: curQ.pk,
    hz: curQ.hz ?? [],
    pr: curQ.pr ?? [],
    ev: curQ.ev.filter((e) => (e[0] as number) > prevQ.t),
    s: [curQ.wv, curQ.ps, curQ.im, curQ.sc, curQ.py, curQ.sir ?? 0], sq: curQ.sq,
  };
  if (curQ.pd !== prevQ.pd) {
    // Draining (spawning from the front of the queue) is the only in-wave mutation
    // `pending` ever undergoes, and it always leaves curQ.pd as a strict SUFFIX of
    // prevQ.pd. Ship just the drop count then — a wave-50/8-player queue at
    // MAX_PENDING would otherwise re-ship its full digit-string on every delta.
    const dropCount = prevQ.pd.length - curQ.pd.length;
    if (dropCount > 0 && prevQ.pd.slice(dropCount) === curQ.pd) {
      d.pdo = dropCount;
    } else {
      d.pd = curQ.pd; // any other change (wave start: queue replaced wholesale)
    }
  }
  return d;
}

/** Apply a delta to the client's held world. Wrong base → return prev (wait for keyframe). */
export function applyDelta(prev: ShooterWorld, d: ODelta): ShooterWorld {
  if (prev.tick !== d.b) return prev;
  const players: Record<PlayerId, ShooterPlayer> = {};
  for (const p of d.pl) players[p.i] = unqPlayer(p);

  const removed = new Set(d.en.d);
  const updated = new Map(d.en.u.map((u) => [u[0], u]));
  const enemies: Enemy[] = [];
  for (const e of prev.enemies) {
    if (removed.has(e.id)) continue;
    const u = updated.get(e.id);
    enemies.push(
      u
        ? {
            ...e,
            pos: { x: m(u[1]), y: m(u[2]) }, health: u[3], attackCooldown: s(u[4]), stunRemaining: s(u[5]),
            special: SPECIALS[u[6]] ?? "none", specialRemaining: s(u[7]), rushTo: u[8] < 0 ? null : { x: m(u[8]), y: m(u[9]) }, burning: s(u[10]),
          }
        : e,
    );
  }
  enemies.push(...d.en.a.map(unqEnemy));

  const pickups = d.pk.map(unqPickup);
  const hazards = (d.hz ?? []).map(unqHazard);
  const projectiles = (d.pr ?? []).map(unqProjectile);

  // Rebuild events exactly as the sim would hold them: kept-window ∪ new, capped to newest.
  const kept = prev.events.filter((e) => e.tick > d.t - EVENT_TTL_TICKS);
  const events = [...kept, ...d.ev.map(unqEvent)];
  const capped = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

  return {
    tick: d.t, phase: intToPhase(d.ph), mode: prev.mode, seed: prev.seed,
    wave: d.s[0], partySize: d.s[1], intermission: s(d.s[2]),
    pending:
      d.pdo !== undefined ? prev.pending.slice(d.pdo) : d.pd !== undefined ? unqPending(d.pd) : prev.pending,
    players, enemies, pickups, hazards, projectiles, events: capped, score: d.s[3], spawnSeq: d.sq, pity: d.s[4],
    stageIntroRemaining: s(d.s[5]),
  };
}
