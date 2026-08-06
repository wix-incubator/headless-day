// src/game/overrun/sim.test.ts
import { describe, expect, it } from "vitest";
import { stepShooter } from "./sim";
import { createShooterWorld } from "./match";
import { ENEMIES, krakenHp, stageHealthMult } from "./enemies";
import { INTERMISSION_S, REVIVE_HEALTH, REVIVE_S, SHOOTER_DT, WAVE1_SPEED_MULT, SPIT_DPS, SPIT_HAZARD_RADIUS_M, EXPLODER_BLAST_DAMAGE, EXPLODER_BLAST_RADIUS_M, EXPLODER_FUSE_S, HIVE_BROOD_SIZE, ROCKET_SPEED_MS } from "./constants";
import { waveBudget } from "./waves";
import { CAMPAIGN_WAVES } from "./stages";
import { xpToNext } from "./perks";
import type { Enemy, ShooterIntent, ShooterWorld } from "./types";

const IDLE: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const intents = (w: ShooterWorld, over: Record<string, Partial<ShooterIntent>> = {}) =>
  Object.fromEntries(Object.keys(w.players).map((id) => [id, { ...IDLE, ...over[id] }]));
const step = (w: ShooterWorld, over: Record<string, Partial<ShooterIntent>> = {}) =>
  stepShooter(w, intents(w, over), SHOOTER_DT);
const enemyAt = (id: string, x: number, y: number, over: Partial<Enemy> = {}): Enemy =>
  ({ id, kind: "rusher", pos: { x, y }, health: 20, attackCooldown: 0, stunRemaining: 0, ...over });

describe("determinism", () => {
  it("same seed + same intent script → identical worlds over 600 ticks", () => {
    const script = (w: ShooterWorld, t: number) =>
      intents(w, { a: { move: { up: t % 7 < 3, down: false, left: t % 5 < 2, right: false }, fire: t % 3 === 0, aim: (t % 62) / 10 } });
    let w1 = createShooterWorld(["a", "b"], 1234);
    let w2 = createShooterWorld(["a", "b"], 1234);
    for (let t = 0; t < 600; t++) {
      w1 = stepShooter(w1, script(w1, t), SHOOTER_DT);
      w2 = stepShooter(w2, script(w2, t), SHOOTER_DT);
    }
    expect(w2).toEqual(w1);
    expect(w1.wave).toBeGreaterThanOrEqual(1);
  });
});

describe("flamethrower burn-over-time", () => {
  it("burning enemies lose health each tick and award party score when the burn kills them", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, enemies: [enemyAt("e", 25, 25, { health: 8, burning: 1.5 })] };
    const before = w.score;
    for (let i = 0; i < 40 && w.enemies.some((x) => x.id === "e"); i++) w = step(w);
    expect(w.enemies.some((x) => x.id === "e")).toBe(false); // burned to death (wave spawns may add others)
    expect(w.score).toBeGreaterThan(before);
  });

  it("the burn timer expires and stops dealing damage", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, enemies: [enemyAt("e", 25, 25, { health: 200, burning: 0.1 })] };
    for (let i = 0; i < 10; i++) w = step(w); // 0.1s burn (~3 ticks) is long gone
    const e = w.enemies.find((x) => x.id === "e")!;
    expect(e.burning ?? 0).toBe(0);
    const health = e.health;
    for (let i = 0; i < 10; i++) w = step(w);
    expect(w.enemies.find((x) => x.id === "e")!.health).toBe(health); // no further burn damage
  });
});

describe("spit hazards", () => {
  const pool = (x: number, y: number, over = {}) =>
    ({ id: "hz0", kind: "spit" as const, pos: { x, y }, radius: SPIT_HAZARD_RADIUS_M, telegraph: 0, duration: 2.5, dps: SPIT_DPS, ...over });

  it("an active pool drains the health of a player standing in it", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } }, hazards: [pool(15, 15)] };
    w = step(w);
    expect(w.players.a!.health).toBeCloseTo(100 - SPIT_DPS * SHOOTER_DT, 3);
  });

  it("a telegraphing pool deals no damage yet (the warning window is safe)", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } }, hazards: [pool(15, 15, { telegraph: 0.8 })] };
    w = step(w);
    expect(w.players.a!.health).toBe(100);
  });

  it("does not touch a player standing outside the pool radius", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } }, hazards: [pool(15 + SPIT_HAZARD_RADIUS_M + 1, 15)] };
    w = step(w);
    expect(w.players.a!.health).toBe(100);
  });

  it("despawns the pool once its active duration is spent", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, players: { a: { ...w.players.a!, pos: { x: 1, y: 1 } } }, hazards: [pool(28, 28, { duration: 0.2 })] };
    for (let i = 0; i < 10; i++) w = step(w);
    expect(w.hazards ?? []).toHaveLength(0);
  });

  it("a spitter emits an acid pool at its locked position when its charge lands", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 25, y: 25 } } },
      enemies: [enemyAt("sp", 5, 5, { kind: "spitter", health: 45, special: "spitCharge", specialRemaining: SHOOTER_DT / 2, rushTo: { x: 25, y: 25 } })],
    };
    w = step(w);
    const hazards = w.hazards ?? [];
    expect(hazards).toHaveLength(1);
    expect(hazards[0]!.kind).toBe("spit");
    expect(hazards[0]!.pos).toEqual({ x: 25, y: 25 });
  });
});

describe("exploder death blast", () => {
  it("leaves a telegraphed blast on death that detonates on players in radius after the fuse", () => {
    let w = createShooterWorld(["a"], 1);
    // Player next to a near-dead exploder; a rifle shot finishes it → blast spawns, fuses, then detonates.
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 15, y: 15 }, gun: "rifle", aim: 0 } },
      enemies: [enemyAt("x", 16.2, 15, { kind: "exploder", health: 1 })],
    };
    w = step(w, { a: { fire: true } }); // kill it → blast (burst) now telegraphing
    expect((w.hazards ?? []).some((h) => h.kind === "blast")).toBe(true);
    expect(w.players.a!.health).toBe(100); // fuse still warning — no damage yet
    for (let i = 0; i < Math.ceil(EXPLODER_FUSE_S / SHOOTER_DT) + 1; i++) w = step(w);
    expect(w.players.a!.health).toBeCloseTo(100 - EXPLODER_BLAST_DAMAGE, 3); // one-shot burst landed
    expect((w.hazards ?? []).some((h) => h.kind === "blast")).toBe(false); // spent after detonating
  });

  it("the blast spares a player who leaves its radius before the fuse ends", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } },
      enemies: [],
      hazards: [{ id: "hz:x:1", kind: "blast", pos: { x: 15 + EXPLODER_BLAST_RADIUS_M + 2, y: 15 }, radius: EXPLODER_BLAST_RADIUS_M, telegraph: EXPLODER_FUSE_S, duration: 0, dps: 0, burst: EXPLODER_BLAST_DAMAGE }],
    };
    for (let i = 0; i < Math.ceil(EXPLODER_FUSE_S / SHOOTER_DT) + 1; i++) w = step(w);
    expect(w.players.a!.health).toBe(100); // out of range at detonation → untouched
  });
});

describe("hive spawner", () => {
  it("births a swarmling brood when its interval elapses", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 25, y: 25 } } },
      enemies: [enemyAt("hv", 5, 5, { kind: "hive", health: 160, special: "none", specialRemaining: SHOOTER_DT / 2, rushTo: null })],
    };
    const before = w.enemies.filter((e) => e.kind === "swarmling").length;
    w = step(w);
    const after = w.enemies.filter((e) => e.kind === "swarmling").length;
    expect(after - before).toBe(HIVE_BROOD_SIZE);
  });
});

describe("elites + per-stage scaling", () => {
  it("a frenzied (elite) rusher advances farther per tick than a normal one", () => {
    const run = (elite: boolean) => {
      let w = createShooterWorld(["a"], 1);
      w = { ...w, wave: 2, players: { a: { ...w.players.a!, pos: { x: 25, y: 5 } } }, enemies: [enemyAt("r", 5, 5, { elite })] };
      return step(w).enemies.find((e) => e.id === "r")!;
    };
    expect(run(true).pos.x).toBeGreaterThan(run(false).pos.x);
  });

  it("an armored/elite enemy deals more contact damage than a normal one", () => {
    const run = (elite: boolean) => {
      let w = createShooterWorld(["a"], 1);
      w = { ...w, wave: 2, players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } }, enemies: [enemyAt("r", 15.5, 15, { elite })] };
      return 100 - step(w).players.a!.health;
    };
    expect(run(true)).toBeGreaterThan(run(false));
  });

  it("campaign spawns scale enemy HP by stage; survival stays at base HP", () => {
    // Campaign stage 6 (global wave 24): a spawned rusher is beefier than its 20-HP base.
    let camp: ShooterWorld = { ...createShooterWorld(["a"], 1, "campaign"), wave: 24, partySize: 1, pending: ["rusher", "rusher"], enemies: [] };
    camp = step(camp);
    const spawned = camp.enemies.filter((e) => e.kind === "rusher");
    expect(spawned.length).toBeGreaterThan(0);
    for (const e of spawned) expect(e.health).toBeGreaterThanOrEqual(Math.round(20 * stageHealthMult(6)));

    // Survival: no stage scaling — rushers spawn at exactly their base HP.
    let surv: ShooterWorld = { ...createShooterWorld(["a"], 1), wave: 5, partySize: 1, pending: ["rusher"], enemies: [] };
    surv = step(surv);
    for (const e of surv.enemies.filter((x) => x.kind === "rusher")) expect(e.health).toBe(20);
  });
});

describe("Kraken boss", () => {
  it("spawns the boss wave with party-scaled HP (not per-stage/elite scaled)", () => {
    let w: ShooterWorld = { ...createShooterWorld(["a", "b", "c"], 1, "campaign"), wave: 23, partySize: 3, pending: ["kraken"], enemies: [] };
    w = step(w);
    const boss = w.enemies.find((e) => e.kind === "kraken");
    expect(boss).toBeTruthy();
    expect(boss!.health).toBe(krakenHp(3));
  });

  it("emits telegraphed strike hazards when its attack timer fires", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 18, y: 15 } } },
      enemies: [enemyAt("K", 15, 15, { kind: "kraken", health: 2000, special: "none", specialRemaining: SHOOTER_DT / 2, rushTo: null })],
    };
    w = step(w);
    const strikes = (w.hazards ?? []).filter((h) => h.kind === "strike");
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    expect(strikes.every((h) => h.telegraph > 0)).toBe(true); // still warning on the tick they appear
  });
});

describe("rocket projectiles", () => {
  it("a rocket flies, detonates on an enemy, and its AoE burst clears the cluster (crediting the owner)", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 10, y: 15 } } },
      enemies: [enemyAt("t1", 18, 15, { health: 20 }), enemyAt("t2", 18.8, 15, { health: 20 })],
      projectiles: [{ id: "pj:a:0", pos: { x: 16, y: 15 }, dir: { x: 1, y: 0 }, speed: ROCKET_SPEED_MS, remaining: 40, ownerId: "a" }],
    };
    const beforeKills = w.players.a!.stats.kills;
    for (let i = 0; i < 20 && (w.projectiles ?? []).length > 0; i++) w = step(w);
    expect(w.projectiles ?? []).toHaveLength(0); // detonated
    expect(w.enemies.some((e) => e.id === "t1")).toBe(false); // both in the blast
    expect(w.enemies.some((e) => e.id === "t2")).toBe(false);
    expect(w.players.a!.stats.kills).toBeGreaterThan(beforeKills); // owner credited
  });

  it("a rocket that hits nothing detonates at the end of its range", () => {
    let w = createShooterWorld(["a"], 1);
    w = {
      ...w,
      players: { a: { ...w.players.a!, pos: { x: 15, y: 28 } } },
      enemies: [],
      projectiles: [{ id: "pj:a:0", pos: { x: 15, y: 15 }, dir: { x: 0, y: -1 }, speed: ROCKET_SPEED_MS, remaining: 1, ownerId: "a" }],
    };
    w = step(w); // remaining 1m < one 0.67m step ×2 → detonates within a tick or two
    for (let i = 0; i < 5 && (w.projectiles ?? []).length > 0; i++) w = step(w);
    expect(w.projectiles ?? []).toHaveLength(0);
  });
});

describe("enemy attack freeze", () => {
  it("an enemy that lands an attack holds still briefly (escape window)", () => {
    let w = createShooterWorld(["a"], 1);
    w = { ...w, players: { a: { ...w.players.a!, pos: { x: 15, y: 15 } } }, enemies: [enemyAt("e", 15.5, 15)] };
    const after = step(w);
    expect(after.players.a!.health).toBeLessThan(100); // the attack landed
    const e = after.enemies.find((x) => x.id === "e")!;
    expect(e.stunRemaining).toBeGreaterThan(0); // frozen right after attacking
    // and it does not advance while frozen
    const next = step(after);
    const e2 = next.enemies.find((x) => x.id === "e")!;
    expect(e2.pos).toEqual(e.pos);
  });
});

describe("campaign vs survival", () => {
  // Set up "final wave cleared, breather about to elapse" and let one step resolve it.
  const atFinalBreather = (mode: "campaign" | "survival"): ShooterWorld => ({
    ...createShooterWorld(["a"], 1, mode),
    wave: CAMPAIGN_WAVES,
    intermission: SHOOTER_DT / 2,
    pending: [],
    enemies: [],
  });

  it("campaign ends in victory after clearing the final wave", () => {
    expect(step(atFinalBreather("campaign")).phase).toBe("victory");
  });

  it("survival never wins — clearing that wave just advances to the next", () => {
    const w1 = step(atFinalBreather("survival"));
    expect(w1.phase).toBe("playing");
    expect(w1.wave).toBe(CAMPAIGN_WAVES + 1);
  });

  it("a victory world is frozen (further steps are no-ops)", () => {
    const won = step(atFinalBreather("campaign"));
    expect(step(won)).toBe(won);
  });
});

describe("movement", () => {
  it("moves alive players (diagonal normalized) and clamps to the field", () => {
    const w0 = createShooterWorld(["a"], 1);
    const w1 = step(w0, { a: { move: { up: false, down: true, left: false, right: true } } });
    const d = Math.hypot(w1.players.a!.pos.x - w0.players.a!.pos.x, w1.players.a!.pos.y - w0.players.a!.pos.y);
    expect(d).toBeCloseTo(4 * SHOOTER_DT, 5);
  });

  it("downed players don't move or fire", () => {
    const w0 = createShooterWorld(["a", "b"], 1);
    w0.players.a = { ...w0.players.a!, status: "downed", health: 0 };
    const w1 = step(w0, { a: { move: { up: true, down: false, left: false, right: false }, fire: true } });
    expect(w1.players.a!.pos).toEqual(w0.players.a!.pos);
    expect(w1.players.a!.stats.shots).toBe(0);
  });
});

describe("waves", () => {
  it("wave 1 starts on the first tick with the frozen party budget", () => {
    const w1 = step(createShooterWorld(["a", "b", "c"], 5));
    expect(w1.wave).toBe(1);
    expect(w1.partySize).toBe(3);
    expect(w1.pending.length + w1.enemies.length).toBe(
      // budget spent entirely on rushers at wave 1 (cost 1 each)
      waveBudget(1, 3),
    );
  });

  it("drains pending spawns gradually and increments spawnSeq", () => {
    const w1 = step(createShooterWorld(["a"], 5));
    const w2 = step(w1);
    expect(w2.enemies.length).toBeGreaterThan(w1.enemies.length);
    expect(w2.spawnSeq).toBe(w2.enemies.length);
    expect(w2.enemies.every((e, i) => e.id === `e${i}`)).toBe(true);
  });

  it("wave clear → intermission (+ wave-clear revive) → next wave with a re-frozen party", () => {
    let w = step(createShooterWorld(["a", "b"], 5));
    w = { ...w, pending: [], enemies: [], players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    const cleared = step(w);
    expect(cleared.intermission).toBeCloseTo(INTERMISSION_S, 5);
    expect(cleared.players.b!.status).toBe("alive"); // wave-clear auto-revive
    expect(cleared.players.b!.health).toBe(REVIVE_HEALTH);
    let next = cleared;
    for (let t = 0; t < Math.ceil(INTERMISSION_S / SHOOTER_DT) + 1; t++) next = step(next);
    expect(next.wave).toBe(2);
    expect(next.partySize).toBe(2);
  });
});

describe("combat + kills", () => {
  it("firing kills award xp/score/kill-stat to the shooter and roll drops", () => {
    let w = step(createShooterWorld(["a"], 7));
    w = { ...w, pending: [], enemies: [enemyAt("e0", w.players.a!.pos.x + 2, w.players.a!.pos.y, { health: 1 })] };
    const after = step(w, { a: { fire: true, aim: 0 } });
    expect(after.enemies).toEqual([]);
    expect(after.players.a!.stats.kills).toBe(1);
    expect(after.players.a!.xp).toBe(ENEMIES.rusher.xp);
    expect(after.score).toBe(ENEMIES.rusher.scoreValue * after.wave);
    expect(after.events.some((e) => e.kind === "kill")).toBe(true);
  });

  it("enemy contact damages on its attack interval and downs at 0 HP", () => {
    let w = step(createShooterWorld(["a"], 7));
    const p = w.players.a!;
    w = { ...w, pending: [], enemies: [enemyAt("e0", p.pos.x + 1.0, p.pos.y, { health: 1000 })] };
    const hit = step(w);
    expect(hit.players.a!.health).toBe(p.health - ENEMIES.rusher.damage);
    expect(hit.enemies[0]!.attackCooldown).toBeCloseTo(ENEMIES.rusher.attackInterval, 5);
    // surviving contact damage emits playerHit (not downed)
    expect(hit.events.some((e) => e.kind === "playerHit" && e.playerId === "a")).toBe(true);
    expect(hit.events.some((e) => e.kind === "downed")).toBe(false);
    // burn the player down → downed, not dead
    let burn = { ...w, players: { ...w.players, a: { ...p, health: ENEMIES.rusher.damage } } };
    const downed = step(burn);
    expect(downed.players.a!.status).toBe("downed");
    expect(downed.events.some((e) => e.kind === "downed")).toBe(true);
    // the downed case does NOT also emit playerHit (it has its own event)
    expect(downed.events.some((e) => e.kind === "playerHit")).toBe(false);
  });

  it("a stunned enemy in contact range cannot attack", () => {
    let w = step(createShooterWorld(["a"], 7));
    const p = w.players.a!;
    w = { ...w, pending: [], enemies: [enemyAt("e0", p.pos.x + 1.0, p.pos.y, { health: 1000, stunRemaining: 0.3 })] };
    const out = step(w);
    expect(out.players.a!.health).toBe(p.health); // no contact damage while stunned
    expect(out.events.some((e) => e.kind === "playerHit")).toBe(false);
    expect(out.events.some((e) => e.kind === "downed")).toBe(false);
  });
});

describe("wave-1 slowdown", () => {
  it("a wave-1 enemy covers 0.85x the distance of the same enemy at a later wave, per tick", () => {
    const base = createShooterWorld(["a"], 9);
    const p = base.players.a!;
    const enemy = enemyAt("e0", p.pos.x + 10, p.pos.y, { health: 1000 });
    const wave1 = stepShooter({ ...base, wave: 1, enemies: [enemy] }, intents(base), SHOOTER_DT);
    const wave2 = stepShooter({ ...base, wave: 2, enemies: [enemy] }, intents(base), SHOOTER_DT);
    const d1 = Math.abs(wave1.enemies[0]!.pos.x - enemy.pos.x);
    const d2 = Math.abs(wave2.enemies[0]!.pos.x - enemy.pos.x);
    expect(d1).toBeGreaterThan(0);
    expect(d1).toBeCloseTo(d2 * WAVE1_SPEED_MULT, 5);
  });
});

describe("downed / revive / wipe", () => {
  const setup = (): ShooterWorld => {
    let w = step(createShooterWorld(["a", "b"], 3));
    w = { ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })] }; // keep the wave alive
    const a = w.players.a!;
    const b = w.players.b!;
    return { ...w, players: { ...w.players, a: { ...a, status: "downed" as const, health: 0, pos: { x: 10, y: 10 } }, b: { ...b, pos: { x: 11, y: 10 } } } };
  };

  it("teammate proximity accumulates revive progress to completion", () => {
    let w = setup();
    // +1: repeated `progress += SHOOTER_DT` accumulates to just under REVIVE_S
    // (2.999999999999999) by tick 90 due to floating-point summation error —
    // same fp-tolerance buffer the wave-clear test above already uses.
    const ticks = Math.ceil(REVIVE_S / SHOOTER_DT) + 1;
    for (let t = 0; t < ticks; t++) w = step(w);
    expect(w.players.a!.status).toBe("alive");
    expect(w.players.a!.health).toBe(REVIVE_HEALTH);
  });

  it("progress resets when the teammate walks away", () => {
    let w = setup();
    w = step(w);
    expect(w.players.a!.reviveProgress).toBeGreaterThan(0);
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, pos: { x: 25, y: 25 } } } };
    w = step(w);
    expect(w.players.a!.reviveProgress).toBe(0);
  });

  it("all players downed → ended; a revive completing the same tick prevents the wipe", () => {
    // both downed → wipe
    let w = setup();
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    expect(step(w).phase).toBe("ended");
    // b alive and reviving a: when b is downed on the SAME tick a's revive completes, no wipe
    let w2 = setup();
    w2 = { ...w2, players: { ...w2.players, a: { ...w2.players.a!, reviveProgress: REVIVE_S - SHOOTER_DT / 2 } } };
    const enemyOnB = enemyAt("kb", w2.players.b!.pos.x + 1, w2.players.b!.pos.y, { health: 1000 });
    w2 = { ...w2, enemies: [...w2.enemies, enemyOnB], players: { ...w2.players, b: { ...w2.players.b!, health: ENEMIES.rusher.damage } } };
    const out = step(w2);
    expect(out.players.a!.status).toBe("alive"); // revive landed
    expect(out.players.b!.status).toBe("downed");
    expect(out.phase).toBe("playing"); // revive-before-wipe
  });

  it("a frozen ended world stays frozen", () => {
    let w = setup();
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    const ended = step(w);
    expect(step(ended)).toEqual(ended);
  });
});

describe("perks flow", () => {
  it("level-up enqueues a 3-choice offer; perkPick consumes the head", () => {
    let w = step(createShooterWorld(["a"], 11));
    const need = xpToNext(0);
    const kills = Math.ceil(need / ENEMIES.rusher.xp);
    const p = w.players.a!;
    // Spawn distance 15 (not 1.5): all `kills` enemies share one coordinate, so
    // they converge to the exact same contact distance on the exact same tick
    // and volley-fire in lockstep — at 1.5m that alpha strike (up to 45 dmg/tick)
    // downs the solo 100-HP player well before all 10 kills land. 15m keeps the
    // whole stack out of contact range (and within pistol range 20m) for the
    // ~64 ticks this test needs, isolating the perk-offer/pick flow under test.
    w = { ...w, pending: [], enemies: Array.from({ length: kills }, (_, i) => enemyAt(`k${i}`, p.pos.x + 15, p.pos.y, { health: 1 })) };
    // rifle-less: pistol kills them over several ticks
    for (let t = 0; t < 200 && w.players.a!.level === 0; t++) w = step(w, { a: { fire: true, aim: 0 } });
    expect(w.players.a!.level).toBe(1);
    expect(w.players.a!.offers.length).toBe(1);
    const choice = w.players.a!.offers[0]!.choices[2];
    const picked = step(w, { a: { perkPick: 2 } });
    expect(picked.players.a!.perks).toEqual([choice]);
    expect(picked.players.a!.offers).toEqual([]);
    // pick with no pending offer is a no-op
    expect(step(picked, { a: { perkPick: 0 } }).players.a!.perks).toEqual([choice]);
  });
});

describe("pickups", () => {
  it("medkits heal capped at max; weapon pickups swap with a fresh mag + swap guard; same-gun tops up reserve", () => {
    let w = step(createShooterWorld(["a"], 13));
    const p = w.players.a!;
    w = {
      ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })],
      pickups: [{ id: "pk:1", kind: "medkit", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }],
      players: { ...w.players, a: { ...p, health: 90 } },
    };
    let out = step(w);
    expect(out.players.a!.health).toBe(100); // capped
    expect(out.pickups).toEqual([]);
    // weapon swap
    out = { ...out, pickups: [{ id: "pk:2", kind: "rifle", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }] };
    out = step(out);
    expect(out.players.a!.gun).toBe("rifle");
    expect(out.players.a!.ammo.mag).toBe(10);
    expect(out.players.a!.swapGuard).toBeGreaterThan(0);
    // guard blocks an immediate re-swap
    out = { ...out, pickups: [{ id: "pk:3", kind: "shotgun", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }] };
    out = step(out);
    expect(out.players.a!.gun).toBe("rifle");
    expect(out.pickups.length).toBe(1);
    // same gun tops up reserve once the guard expires
    out = { ...out, pickups: [{ id: "pk:4", kind: "rifle", pos: { x: p.pos.x, y: p.pos.y }, ttl: 9 }], players: { ...out.players, a: { ...out.players.a!, swapGuard: 0, ammo: { ...out.players.a!.ammo, reserve: 3 } } } };
    out = step(out);
    expect(out.players.a!.ammo.reserve).toBe(60);
  });

  it("pickups expire by ttl", () => {
    let w = step(createShooterWorld(["a"], 13));
    w = { ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })], pickups: [{ id: "pk:1", kind: "medkit", pos: { x: 1, y: 1 }, ttl: SHOOTER_DT / 2 }] };
    expect(step(w).pickups).toEqual([]);
  });
});
