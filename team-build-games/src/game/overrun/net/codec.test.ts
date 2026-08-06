// src/game/overrun/net/codec.test.ts
import { describe, expect, it } from "vitest";
import { applyDelta, diffWorld, qWorld, unqWorld } from "./codec";
import { createShooterWorld } from "../match";
import { stepShooter } from "../sim";
import { SHOOTER_DT, MAX_ENEMIES, MAX_PICKUPS, MAX_EVENTS } from "../constants";
import { MAX_PENDING } from "../waves";
import { ENEMY_KINDS } from "../enemies";
import { PERK_IDS } from "../perks";
import type { EnemyKind, ShooterIntent, ShooterWorld } from "../types";

describe("digit-string wire encoding guard", () => {
  it("PERK_IDS and ENEMY_KINDS each stay under 10 entries (qPlayer's `pk` and qWorld's `pd` encode indices as single decimal DIGITS via join(''); a 10th entry would silently corrupt the wire)", () => {
    expect(PERK_IDS.length).toBeLessThan(10);
    expect(ENEMY_KINDS.length).toBeLessThan(10);
  });
});

const IDLE: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const idle = (w: ShooterWorld) => Object.fromEntries(Object.keys(w.players).map((id) => [id, IDLE]));

describe("elite flag sync", () => {
  it("round-trips an enemy's elite flag through the keyframe codec (and omits it for normals)", () => {
    const elite: ShooterWorld = {
      ...createShooterWorld(["a"], 1),
      enemies: [{ id: "e0", kind: "rusher", pos: { x: 5, y: 5 }, health: 26, attackCooldown: 0, stunRemaining: 0, elite: true }],
    };
    expect(unqWorld(qWorld(elite)).enemies[0]!.elite).toBe(true);

    const normal: ShooterWorld = {
      ...createShooterWorld(["a"], 1),
      enemies: [{ id: "e0", kind: "rusher", pos: { x: 5, y: 5 }, health: 20, attackCooldown: 0, stunRemaining: 0 }],
    };
    expect(unqWorld(qWorld(normal)).enemies[0]!.elite).toBeUndefined();
  });
});

describe("hazard sync", () => {
  const withHazards = (): ShooterWorld => ({
    ...createShooterWorld(["a"], 1),
    hazards: [
      { id: "hz:sp:5", kind: "spit", pos: { x: 12.34, y: 5.67 }, radius: 2, telegraph: 0.8, duration: 2.5, dps: 22 },
      { id: "hz:sp:9", kind: "spit", pos: { x: 20, y: 20 }, radius: 2, telegraph: 0, duration: 1.2, dps: 22 },
    ],
  });

  it("round-trips hazards through the keyframe codec (within quantization)", () => {
    const r = unqWorld(qWorld(withHazards()));
    expect(r.hazards).toHaveLength(2);
    expect(r.hazards![0]!).toMatchObject({ id: "hz:sp:5", kind: "spit", radius: 2, dps: 22 });
    expect(r.hazards![0]!.pos.x).toBeCloseTo(12.34, 2);
    expect(r.hazards![0]!.telegraph).toBeCloseTo(0.8, 2);
    expect(r.hazards![1]!.telegraph).toBe(0);
    expect(r.hazards![1]!.duration).toBeCloseTo(1.2, 2);
    expect(r.hazards![0]!.burst).toBeUndefined(); // pools carry no burst
  });

  it("round-trips a Kraken strike hazard (kind + burst)", () => {
    const w: ShooterWorld = {
      ...createShooterWorld(["a"], 1),
      hazards: [{ id: "hz:K:9:0", kind: "strike", pos: { x: 8, y: 8 }, radius: 2.2, telegraph: 0.8, duration: 0, dps: 0, burst: 40 }],
    };
    const r = unqWorld(qWorld(w));
    expect(r.hazards![0]!).toMatchObject({ kind: "strike", burst: 40 });
  });

  it("round-trips a blast's one-shot burst field", () => {
    const w: ShooterWorld = {
      ...createShooterWorld(["a"], 1),
      hazards: [{ id: "hz:x:1", kind: "blast", pos: { x: 10, y: 10 }, radius: 3, telegraph: 0.5, duration: 0, dps: 0, burst: 35 }],
    };
    const r = unqWorld(qWorld(w));
    expect(r.hazards![0]!).toMatchObject({ kind: "blast", burst: 35 });
  });

  it("a world with no hazards decodes to an empty list", () => {
    expect(unqWorld(qWorld(createShooterWorld(["a"], 1))).hazards).toEqual([]);
  });

  it("ships hazards through a delta (full list, like pickups)", () => {
    const prev = createShooterWorld(["a"], 1);
    const cur = withHazards();
    const applied = applyDelta(prev, diffWorld(qWorld(prev), qWorld({ ...cur, tick: prev.tick + 1 })));
    expect(applied.hazards).toHaveLength(2);
    expect(applied.hazards![1]!.pos.x).toBeCloseTo(20, 2);
  });
});

describe("campaign mode + victory phase round-trip", () => {
  it("preserves mode and the victory phase through the quantized codec", () => {
    const w: ShooterWorld = { ...createShooterWorld(["a", "b"], 7, "campaign"), phase: "victory" };
    const r = unqWorld(qWorld(w));
    expect(r.mode).toBe("campaign");
    expect(r.phase).toBe("victory");
  });

  it("survival + playing is the default round-trip", () => {
    const r = unqWorld(qWorld(createShooterWorld(["a"], 1)));
    expect(r.mode).toBe("survival");
    expect(r.phase).toBe("playing");
  });
});

/** A worst-case world: 8 players, full enemy/pickup/event load. */
function fatWorld(): ShooterWorld {
  let w = createShooterWorld(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"], 777);
  w = stepShooter(w, idle(w), SHOOTER_DT);
  const enemies = Array.from({ length: MAX_ENEMIES }, (_, i) => ({
    id: `e${i}`, kind: i % 4 === 0 ? ("tank" as const) : ("rusher" as const),
    pos: { x: (i % 30) + 0.123, y: Math.floor(i / 3) + 0.456 }, health: 20 + i, attackCooldown: 0.25, stunRemaining: 0.1,
  }));
  const pickups = Array.from({ length: MAX_PICKUPS }, (_, i) => ({
    id: `pk:e${i}`, kind: (["shotgun", "rifle", "medkit"] as const)[i % 3]!,
    pos: { x: i + 0.5, y: i + 0.25 }, ttl: 7.5,
  }));
  const events = Array.from({ length: MAX_EVENTS }, (_, i) => ({
    tick: w.tick, kind: "shot" as const, gun: "rifle" as const,
    from: { x: 1.11, y: 2.22 }, to: { x: 20.5, y: 15.25 },
  }));
  return { ...w, enemies, pickups, events, wave: 12, score: 34567, pity: 7, spawnSeq: 480 };
}

describe("quantized round-trip", () => {
  it("unq(q(w)) preserves structure within quantization error and is idempotent", () => {
    const w = fatWorld();
    const r = unqWorld(qWorld(w));
    expect(Object.keys(r.players)).toEqual(Object.keys(w.players));
    expect(r.enemies.length).toBe(w.enemies.length);
    expect(r.enemies[3]!.pos.x).toBeCloseTo(w.enemies[3]!.pos.x, 2); // cm precision
    expect(r.players.p1!.aim).toBeCloseTo(w.players.p1!.aim, 2);
    expect(r).toMatchObject({ tick: w.tick, seed: w.seed, wave: 12, score: 34567, pity: 7, spawnSeq: 480, partySize: w.partySize, phase: w.phase });
    expect(r.pending).toEqual(w.pending);
    // idempotent: quantizing an already-quantized world is lossless
    expect(unqWorld(qWorld(r))).toEqual(r);
  });

  it("round-trips the hit and playerHit event kinds", () => {
    const w = fatWorld();
    const withEvents: ShooterWorld = {
      ...w,
      events: [
        ...w.events,
        { tick: w.tick, kind: "hit", pos: { x: 4.5, y: 6.25 } },
        { tick: w.tick, kind: "playerHit", playerId: "p2" },
      ],
    };
    const r = unqWorld(qWorld(withEvents));
    const hit = r.events.find((e) => e.kind === "hit");
    const playerHit = r.events.find((e) => e.kind === "playerHit");
    expect(hit).toMatchObject({ kind: "hit", pos: { x: 4.5, y: 6.25 } });
    expect(playerHit).toMatchObject({ kind: "playerHit", playerId: "p2" });
  });

  it("preserves an enemy's stunRemaining through a quantized round-trip and a delta update", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const stunnedEnemy = { ...prev.enemies[0]!, stunRemaining: 0.2 };
    const cur: ShooterWorld = { ...prev, tick: prev.tick + 1, enemies: [stunnedEnemy, ...prev.enemies.slice(1)] };
    const rebuilt = applyDelta(prev, diffWorld(qWorld(prev), qWorld(cur)));
    expect(rebuilt.enemies[0]!.stunRemaining).toBeCloseTo(0.2, 2);
  });

  it("preserves an enemy's flamethrower burn timer through a round-trip and a delta update", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const litEnemy = { ...prev.enemies[0]!, burning: 0.9 };
    const cur: ShooterWorld = { ...prev, tick: prev.tick + 1, enemies: [litEnemy, ...prev.enemies.slice(1)] };
    const rebuilt = applyDelta(prev, diffWorld(qWorld(prev), qWorld(cur)));
    expect(rebuilt.enemies[0]!.burning).toBeCloseTo(0.9, 2);
  });

  it("round-trips a rocket projectile (pos, heading, range, owner) and a delta update", () => {
    const base = unqWorld(qWorld(fatWorld()));
    const pj = { id: "pj:a:3", pos: { x: 12.5, y: 8.25 }, dir: { x: 1, y: 0 }, speed: 20, remaining: 22.5, ownerId: "a" };
    const prev: ShooterWorld = { ...base, projectiles: [pj] };
    const r = unqWorld(qWorld(prev));
    expect(r.projectiles).toHaveLength(1);
    expect(r.projectiles![0]!.pos.x).toBeCloseTo(12.5, 2);
    expect(r.projectiles![0]!.dir.x).toBeCloseTo(1, 2);
    expect(r.projectiles![0]!.remaining).toBeCloseTo(22.5, 2);
    expect(r.projectiles![0]!.ownerId).toBe("a");
    // delta path: projectile advanced, still round-trips
    const cur: ShooterWorld = { ...prev, tick: prev.tick + 1, projectiles: [{ ...pj, pos: { x: 13.1, y: 8.25 }, remaining: 21.9 }] };
    const rebuilt = applyDelta(prev, diffWorld(qWorld(prev), qWorld(cur)));
    expect(rebuilt.projectiles![0]!.pos.x).toBeCloseTo(13.1, 2);
  });

  it("round-trips a blast (rocket airburst) event", () => {
    const base = unqWorld(qWorld(fatWorld()));
    const w: ShooterWorld = { ...base, events: [{ tick: base.tick, kind: "blast", pos: { x: 3, y: 4 }, radius: 3.2 }] };
    const b = unqWorld(qWorld(w)).events.find((e) => e.kind === "blast");
    expect(b && b.kind === "blast" && b.radius).toBeCloseTo(3.2, 2);
  });

  it("preserves perks/offers/stats/ammo exactly (migration needs them)", () => {
    const w = fatWorld();
    w.players.p1 = {
      ...w.players.p1!, gun: "rifle", perks: ["power", "magnet"],
      offers: [{ choices: ["trigger", "hands", "sprint"] }],
      stats: { shots: 440, hits: 343, kills: 342 }, xp: 17, level: 9,
      ammo: { mag: 7, reserve: 41, reloadRemaining: 0.8, fireCooldown: 0.1 },
    };
    const r = unqWorld(qWorld(w));
    expect(r.players.p1!).toMatchObject({
      gun: "rifle", perks: ["power", "magnet"],
      offers: [{ choices: ["trigger", "hands", "sprint"] }],
      stats: { shots: 440, hits: 343, kills: 342 }, xp: 17, level: 9,
    });
    expect(r.players.p1!.ammo.mag).toBe(7);
    expect(r.players.p1!.ammo.reloadRemaining).toBeCloseTo(0.8, 2);
  });
});

describe("delta encode/apply", () => {
  it("apply(prev, diff(prev, cur)) reproduces the quantized current world exactly", () => {
    let w = createShooterWorld(["a", "b"], 42);
    for (let t = 0; t < 30; t++) w = stepShooter(w, idle(w), SHOOTER_DT);
    const prev = unqWorld(qWorld(w));
    let cur = w;
    for (let t = 0; t < 3; t++) cur = stepShooter(cur, idle(cur), SHOOTER_DT);
    const rebuilt = applyDelta(prev, diffWorld(qWorld(w), qWorld(cur)));
    expect(rebuilt).toEqual(unqWorld(qWorld(cur)));
  });

  it("handles enemy adds, removals, and pickup changes", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const cur: ShooterWorld = {
      ...prev, tick: prev.tick + 3,
      enemies: [...prev.enemies.slice(2), { id: "e999", kind: "tank", pos: { x: 1, y: 2 }, health: 120, attackCooldown: 0, stunRemaining: 0 }],
      pickups: prev.pickups.slice(1),
    };
    const rebuilt = applyDelta(prev, diffWorld(qWorld(prev), qWorld(cur)));
    expect(rebuilt).toEqual(unqWorld(qWorld(cur)));
  });

  it("a delta against the wrong base is ignored (wait for the next keyframe)", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const cur = { ...prev, tick: prev.tick + 3, score: prev.score + 100 };
    const d = diffWorld(qWorld(prev), qWorld(cur));
    const stale = { ...prev, tick: prev.tick - 3 };
    expect(applyDelta(stale, d)).toBe(stale);
  });

  it("a draining pending queue delta-encodes as a drop count (pdo), not the full digit-string", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const prevPending: EnemyKind[] = ["rusher", "rusher", "tank", "rusher", "rusher"];
    const prevWithPending: ShooterWorld = { ...prev, pending: prevPending };
    const curWithPending: ShooterWorld = { ...prevWithPending, tick: prev.tick + 1, pending: prevPending.slice(2) };
    const d = diffWorld(qWorld(prevWithPending), qWorld(curWithPending));
    expect(d.pdo).toBe(2);
    expect(d.pd).toBeUndefined();
    const rebuilt = applyDelta(prevWithPending, d);
    expect(rebuilt).toEqual(unqWorld(qWorld(curWithPending)));
  });

  it("a non-drain pending change (wave start: queue replaced wholesale) still ships the full pd string", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const prevWithPending: ShooterWorld = { ...prev, pending: ["rusher"] as EnemyKind[] };
    const curWithPending: ShooterWorld = {
      ...prevWithPending, tick: prev.tick + 1,
      pending: ["tank", "rusher", "tank"] as EnemyKind[], // NOT a suffix of prev's queue
    };
    const d = diffWorld(qWorld(prevWithPending), qWorld(curWithPending));
    expect(d.pd).toBeDefined();
    expect(d.pdo).toBeUndefined();
    const rebuilt = applyDelta(prevWithPending, d);
    expect(rebuilt).toEqual(unqWorld(qWorld(curWithPending)));
  });

  it("an unchanged pending queue ships neither pd nor pdo", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const cur: ShooterWorld = { ...prev, tick: prev.tick + 1 };
    const d = diffWorld(qWorld(prev), qWorld(cur));
    expect(d.pd).toBeUndefined();
    expect(d.pdo).toBeUndefined();
    expect(applyDelta(prev, d)).toEqual(unqWorld(qWorld(cur)));
  });
});

describe("byte budget (the P-A0 guarantee)", () => {
  it("worst-case keyframe ≤ 6144 bytes; worst-case delta ≤ 4096", () => {
    // Worst case = every cap maxed simultaneously. Steady-state real traffic is far
    // smaller; this pins the ceiling so cap changes that blow the wire fail loudly.
    const w = fatWorld();
    const key = JSON.stringify({ v: 1, m: { t: "oSnap", w: qWorld(w) } });
    expect(key.length).toBeLessThanOrEqual(6144);
    let cur = w;
    for (let t = 0; t < 3; t++) cur = stepShooter(cur, idle(cur), SHOOTER_DT);
    const delta = JSON.stringify({ v: 1, m: { t: "oDelta", d: diffWorld(qWorld(w), qWorld(cur)) } });
    expect(delta.length).toBeLessThanOrEqual(4096);
  });

  it("endless-run high-stress: pending at MAX_PENDING + 60 enemies + 8 players — keyframe ≤ 6144, draining delta ≤ 4096", () => {
    const bigPending: EnemyKind[] = Array.from({ length: MAX_PENDING }, (_, i) => (i % 4 === 0 ? "tank" : "rusher"));
    const w: ShooterWorld = { ...fatWorld(), pending: bigPending };
    const key = JSON.stringify({ v: 1, m: { t: "oSnap", w: qWorld(w) } });
    expect(key.length).toBeLessThanOrEqual(6144);

    const drained: ShooterWorld = { ...w, tick: w.tick + 1, pending: bigPending.slice(3) };
    const delta = JSON.stringify({ v: 1, m: { t: "oDelta", d: diffWorld(qWorld(w), qWorld(drained)) } });
    expect(delta.length).toBeLessThanOrEqual(4096);
  });
});
