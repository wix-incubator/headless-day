import { describe, expect, it } from "vitest";
import { ENEMIES, ENEMY_KINDS, eliteMods, krakenHp, nearestAlive, stageHealthMult, stepEnemy, stepHive, stepKraken, stepSpitter } from "./enemies";
import { createShooterWorld, alivePlayers } from "./match";
import { HIVE_BROOD_SIZE, HIVE_SPAWN_INTERVAL_S, KRAKEN_ATTACK_INTERVAL_S, SPIT_CHARGE_S, SPIT_COOLDOWN_S, SPITTER_RANGE_M } from "./constants";
import type { Enemy } from "./types";

const enemy = (over: Partial<Enemy> = {}): Enemy => ({ id: "e0", kind: "rusher", pos: { x: 5, y: 5 }, health: 20, attackCooldown: 0, stunRemaining: 0, ...over });

describe("enemy defs", () => {
  it("defines rusher (fast/fragile) and tank (slow/beefy) with wave gating", () => {
    expect(ENEMY_KINDS).toEqual(["rusher", "tank", "swarmling", "spitter", "exploder", "hive", "kraken"]); // append-only (wire index)
    expect(ENEMIES.rusher).toMatchObject({ radius: 0.4, hitRadius: 8 / 7, speed: 4.5, health: 20, damage: 5, attackInterval: 0.5, xp: 2, cost: 1, scoreValue: 10, minWave: 1 });
    expect(ENEMIES.tank).toMatchObject({ radius: 0.7, hitRadius: 9 / 7, speed: 1.8, health: 120, damage: 20, attackInterval: 0.8, xp: 8, cost: 4, scoreValue: 40, minWave: 3 });
    expect(ENEMIES.swarmling).toMatchObject({ speed: 6, health: 6, cost: 0.5, minWave: 1 });
    expect(ENEMIES.spitter).toMatchObject({ radius: 0.5, speed: 3, health: 45, cost: 2.5, scoreValue: 25 });
    expect(ENEMIES.exploder).toMatchObject({ radius: 0.55, speed: 2.5, health: 60, cost: 3, scoreValue: 30 });
    expect(ENEMIES.hive).toMatchObject({ radius: 0.8, speed: 1, health: 160, cost: 5, scoreValue: 60 });
    expect(ENEMIES.rusher.stagger).toBe(true);
    expect(ENEMIES.tank.stagger).toBe(false);
    expect(ENEMIES.hive.stagger).toBe(false); // beefy priority target — shrugs off bullet stagger
    expect(ENEMIES.kraken).toMatchObject({ stagger: false }); // boss is stun/knockback-immune
  });
});

describe("Kraken mega-boss", () => {
  const boss = (over: Partial<Enemy> = {}): Enemy => ({ id: "K", kind: "kraken", pos: { x: 15, y: 15 }, health: 2000, attackCooldown: 0, stunRemaining: 0, special: "none", specialRemaining: KRAKEN_ATTACK_INTERVAL_S, ...over });
  const party = (n: number) => alivePlayers({ ...createShooterWorld(Array.from({ length: n }, (_, i) => `p${i}`), 1) });

  it("scales its HP with the party size", () => {
    expect(krakenHp(4)).toBeGreaterThan(krakenHp(1));
    expect(krakenHp(1)).toBeGreaterThan(1000);
  });

  it("crawls slowly toward the target and does not strike mid-cooldown", () => {
    const players = party(1).map((p) => ({ ...p, pos: { x: 25, y: 15 } }));
    const { enemy, strikes } = stepKraken(boss({ specialRemaining: 2 }), players, 0.1, 7, 5);
    expect(enemy.pos.x).toBeGreaterThan(15); // advancing toward +x
    expect(enemy.pos.x).toBeLessThan(15.2); // ...but slowly (speed 1.2 m/s)
    expect(strikes).toHaveLength(0);
    expect(enemy.specialRemaining).toBeCloseTo(1.9, 5);
  });

  it("unleashes a telegraphed tentacle volley when the timer elapses, then resets", () => {
    const players = party(2).map((p, i) => ({ ...p, pos: { x: 20 + i * 3, y: 15 } }));
    const { enemy, strikes } = stepKraken(boss({ specialRemaining: 0.05 }), players, 0.1, 7, 42);
    expect(strikes.length).toBeGreaterThanOrEqual(1);
    expect(strikes.every((h) => h.kind === "strike")).toBe(true);
    expect(strikes.every((h) => h.telegraph > 0 && (h.burst ?? 0) > 0)).toBe(true); // all still warning, all one-shot
    expect(enemy.specialRemaining).toBeCloseTo(KRAKEN_ATTACK_INTERVAL_S, 5);
  });

  it("produces both point-strike and sweep volleys across successive attacks", () => {
    const players = party(3).map((p, i) => ({ ...p, pos: { x: 20, y: 8 + i * 2 } }));
    const counts = new Set<number>();
    for (let t = 0; t < 60; t++) counts.add(stepKraken(boss({ specialRemaining: 0 }), players, 0.1, 7, t).strikes.length);
    expect(counts.size).toBeGreaterThan(1); // volley size varies → not just one attack shape
  });
});

describe("elite mods + per-stage scaling", () => {
  it("makes rushers FRENZIED (faster) and tanks ARMORED (much beefier)", () => {
    expect(eliteMods("rusher").speedMult).toBeGreaterThan(1); // frenzied = fast
    expect(eliteMods("rusher").healthMult).toBeGreaterThan(1);
    expect(eliteMods("tank").healthMult).toBeGreaterThanOrEqual(2); // armored = wall of HP
    expect(eliteMods("tank").damageMult).toBeGreaterThan(1);
  });

  it("scales enemy HP up per campaign stage (stage 1 = baseline)", () => {
    expect(stageHealthMult(1)).toBe(1);
    expect(stageHealthMult(6)).toBeGreaterThan(stageHealthMult(3));
    expect(stageHealthMult(3)).toBeGreaterThan(1);
  });
});

describe("stepHive (spawner)", () => {
  const hive = (over: Partial<Enemy> = {}): Enemy => ({ id: "h0", kind: "hive", pos: { x: 5, y: 5 }, health: 160, attackCooldown: 0, stunRemaining: 0, special: "none", specialRemaining: HIVE_SPAWN_INTERVAL_S, ...over });

  it("crawls toward the target while its brood timer is still counting down", () => {
    const { enemy, spawn } = stepHive(hive(), { x: 25, y: 5 }, 0.1, 1, { x: 0, y: 0 });
    expect(enemy.pos.x).toBeGreaterThan(5); // slow chase toward +x
    expect(spawn).toBe(0);
    expect(enemy.specialRemaining).toBeCloseTo(HIVE_SPAWN_INTERVAL_S - 0.1, 5);
  });

  it("births a brood and resets its timer when the interval elapses", () => {
    const { spawn, enemy } = stepHive(hive({ specialRemaining: 0 }), { x: 25, y: 5 }, 0.1, 1, { x: 0, y: 0 });
    expect(spawn).toBe(HIVE_BROOD_SIZE);
    expect(enemy.specialRemaining).toBeCloseTo(HIVE_SPAWN_INTERVAL_S, 5);
  });

  it("holds its brood while stunned (no spawn under bullet-stun)", () => {
    const { spawn } = stepHive(hive({ specialRemaining: 0, stunRemaining: 0.2 }), { x: 25, y: 5 }, 0.1, 1, { x: 0, y: 0 });
    expect(spawn).toBe(0);
  });
});

describe("stepSpitter (ranged kiter)", () => {
  const spitter = (over: Partial<Enemy> = {}): Enemy => ({ id: "s0", kind: "spitter", pos: { x: 5, y: 5 }, health: 45, attackCooldown: 0, stunRemaining: 0, special: "none", specialRemaining: SPIT_COOLDOWN_S, rushTo: null, ...over });

  it("backs away when the target is closer than its preferred range", () => {
    const target = { x: 5 + SPITTER_RANGE_M / 2, y: 5 }; // half the range → too close
    const { enemy, spit } = stepSpitter(spitter(), target, 0.1, 1, { x: 0, y: 0 });
    expect(enemy.pos.x).toBeLessThan(5); // retreats along -x, away from the target
    expect(spit).toBe(null);
  });

  it("closes in when the target is farther than its preferred range", () => {
    const target = { x: 5 + SPITTER_RANGE_M * 2, y: 5 }; // double the range → too far
    const { enemy } = stepSpitter(spitter(), target, 0.1, 1, { x: 0, y: 0 });
    expect(enemy.pos.x).toBeGreaterThan(5); // advances toward the target
  });

  it("telegraphs a spit (freezes + locks the target) when the cooldown elapses", () => {
    const target = { x: 13, y: 5 }; // within band of range 8
    const { enemy, spit } = stepSpitter(spitter({ specialRemaining: 0 }), target, 0.1, 1, { x: 0, y: 0 });
    expect(enemy.special).toBe("spitCharge");
    expect(enemy.pos).toEqual({ x: 5, y: 5 }); // frozen while charging
    expect(enemy.rushTo).toEqual(target); // locked ground position
    expect(spit).toBe(null); // not fired yet — still telegraphing
  });

  it("fires the spit at the locked position when the charge ends, then resets to cooldown", () => {
    const locked = { x: 13, y: 5 };
    const charging = spitter({ special: "spitCharge", specialRemaining: 0, rushTo: locked });
    const { enemy, spit } = stepSpitter(charging, { x: 20, y: 20 }, 0.1, 1, { x: 0, y: 0 });
    expect(spit).toEqual(locked); // emitted at the locked point, NOT the target's new position
    expect(enemy.special).toBe("none");
    expect(enemy.specialRemaining).toBeCloseTo(SPIT_COOLDOWN_S, 5);
    expect(enemy.rushTo).toBe(null);
  });

  it("stays frozen and only ticks its charge timer mid-telegraph", () => {
    const charging = spitter({ special: "spitCharge", specialRemaining: SPIT_CHARGE_S, rushTo: { x: 13, y: 5 } });
    const { enemy, spit } = stepSpitter(charging, { x: 20, y: 20 }, 0.1, 1, { x: 0, y: 0 });
    expect(enemy.pos).toEqual({ x: 5, y: 5 });
    expect(enemy.specialRemaining).toBeCloseTo(SPIT_CHARGE_S - 0.1, 5);
    expect(spit).toBe(null);
  });
});

describe("nearestAlive", () => {
  it("chases the closest living player; equal distances break to the lowest id", () => {
    const w = createShooterWorld(["a", "b"], 1);
    w.players.a = { ...w.players.a!, pos: { x: 10, y: 15 } };
    w.players.b = { ...w.players.b!, pos: { x: 20, y: 15 } };
    const sorted = alivePlayers(w).sort((p, q) => (p.id < q.id ? -1 : 1));
    expect(nearestAlive({ x: 12, y: 15 }, sorted)?.id).toBe("a");
    expect(nearestAlive({ x: 15, y: 15 }, sorted)?.id).toBe("a"); // tie → lowest id
    expect(nearestAlive({ x: 5, y: 5 }, [])).toBe(null);
  });
});

describe("stepEnemy", () => {
  it("moves toward the target at kind speed", () => {
    const e = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1);
    expect(e.pos.x).toBeCloseTo(5.45, 5); // 4.5 m/s × 0.1 s
    expect(e.pos.y).toBeCloseTo(5, 5);
  });

  it("stops at contact range instead of overlapping the player", () => {
    const e = stepEnemy(enemy({ pos: { x: 14, y: 5 } }), { x: 15, y: 5 }, 1);
    // rusher radius 0.4 + player 0.75 = 1.15 contact distance
    expect(15 - e.pos.x).toBeCloseTo(1.15, 5);
  });

  it("ticks down the attack cooldown and idles with no target", () => {
    const e = stepEnemy(enemy({ attackCooldown: 0.5 }), null, 0.1);
    expect(e.attackCooldown).toBeCloseTo(0.4, 5);
    expect(e.pos).toEqual({ x: 5, y: 5 });
  });

  it("scales speed by the optional speedMult (wave-1 slowdown)", () => {
    const full = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1);
    const slowed = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1, 0.85);
    expect(slowed.pos.x - 5).toBeCloseTo((full.pos.x - 5) * 0.85, 5);
  });

  it("a stunned enemy does not move but still ticks stunRemaining and attackCooldown down", () => {
    const e = stepEnemy(enemy({ attackCooldown: 0.5, stunRemaining: 0.3 }), { x: 15, y: 5 }, 0.1);
    expect(e.pos).toEqual({ x: 5, y: 5 }); // no movement while stunned
    expect(e.stunRemaining).toBeCloseTo(0.2, 5);
    expect(e.attackCooldown).toBeCloseTo(0.4, 5); // cooldown still ticks while stunned
  });

  it("applies a separation nudge on top of the chase (declusters the horde)", () => {
    const chased = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1); // no separation
    const pushed = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1, 1, { x: 0, y: 1 });
    expect(pushed.pos.x).toBeCloseTo(chased.pos.x, 5); // same chase toward +x
    expect(pushed.pos.y).toBeGreaterThan(chased.pos.y); // but shoved along the separation vector
  });

  it("stunRemaining floors at 0 and never goes negative", () => {
    const e = stepEnemy(enemy({ stunRemaining: 0.05 }), { x: 15, y: 5 }, 0.1);
    expect(e.stunRemaining).toBe(0);
  });
});
