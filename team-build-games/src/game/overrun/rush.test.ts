import { describe, it, expect } from "vitest";
import { stepTank } from "./enemies";
import { createShooterWorld } from "./match";
import { stepShooter } from "./sim";
import { RUSH_COOLDOWN_S, RUSH_RUN_MAX_S } from "./constants";
import type { Enemy, ShooterIntent, ShooterWorld } from "./types";

const idle: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const intents = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, idle]));

const tank = (over: Partial<Enemy> = {}): Enemy => ({
  id: "t",
  kind: "tank",
  pos: { x: 10, y: 10 },
  health: 120,
  attackCooldown: 0,
  stunRemaining: 0,
  special: "none",
  specialRemaining: RUSH_COOLDOWN_S,
  rushTo: null,
  ...over,
});

describe("stepTank — Rush state machine (deterministic)", () => {
  it("telegraphs a Rush when the cooldown elapses, freezing + locking the target's ground position", () => {
    const target = { x: 20, y: 10 };
    const r = stepTank(tank({ specialRemaining: 0.02 }), target, target, 0.1, 1, { x: 0, y: 0 });
    expect(r.enemy.special).toBe("rushCharge");
    expect(r.enemy.rushTo).toEqual(target);
    expect(r.enemy.pos).toEqual({ x: 10, y: 10 }); // frozen during the telegraph
    expect(r.landed).toBe(false);
  });

  it("charges toward the lock at ~9 m/s while running", () => {
    const t = tank({ special: "rushRun", specialRemaining: RUSH_RUN_MAX_S, rushTo: { x: 30, y: 10 } });
    const r = stepTank(t, null, null, 0.1, 1, { x: 0, y: 0 }); // 9 * 0.1 = 0.9 m
    expect(r.landed).toBe(false);
    expect(r.enemy.special).toBe("rushRun");
    expect(r.enemy.pos.x).toBeCloseTo(10.9, 5);
  });

  it("lands on arrival → recover + landed flag", () => {
    const t = tank({ special: "rushRun", specialRemaining: RUSH_RUN_MAX_S, rushTo: { x: 10.5, y: 10 } });
    const r = stepTank(t, null, null, 0.1, 1, { x: 0, y: 0 }); // 0.5 m ≤ 0.9 m step → arrives
    expect(r.landed).toBe(true);
    expect(r.enemy.special).toBe("rushRecover");
    expect(r.enemy.pos).toEqual({ x: 10.5, y: 10 });
  });

  it("recovers then returns to chase (cooldown re-armed, lock cleared)", () => {
    const r = stepTank(tank({ special: "rushRecover", specialRemaining: 0.02, rushTo: { x: 1, y: 1 } }), null, null, 0.1, 1, { x: 0, y: 0 });
    expect(r.enemy.special).toBe("none");
    expect(r.enemy.specialRemaining).toBe(RUSH_COOLDOWN_S);
    expect(r.enemy.rushTo).toBeNull();
  });

  it("chases + ticks the cooldown when not rushing", () => {
    const r = stepTank(tank({ special: "none", specialRemaining: 2 }), { x: 20, y: 10 }, { x: 20, y: 10 }, 0.1, 1, { x: 0, y: 0 });
    expect(r.enemy.special).toBe("none");
    expect(r.enemy.specialRemaining).toBeCloseTo(1.9, 5);
    expect(r.enemy.pos.x).toBeGreaterThan(10); // moved toward the target
  });
});

describe("Rush landing hit (in stepShooter)", () => {
  it("deals 50% of max HP to a player caught at the charge's endpoint", () => {
    const w = createShooterWorld(["p1"], 7, "survival");
    const player = { ...w.players.p1!, pos: { x: 15, y: 15 }, health: 100 };
    const charging: Enemy = {
      id: "e0", kind: "tank", pos: { x: 14.6, y: 15 }, health: 120, attackCooldown: 0, stunRemaining: 0,
      special: "rushRun", specialRemaining: RUSH_RUN_MAX_S, rushTo: { x: 15, y: 15 },
    };
    const world: ShooterWorld = { ...w, wave: 3, players: { p1: player }, enemies: [charging] };
    const next = stepShooter(world, intents(["p1"]), 0.1); // tank reaches (15,15) → lands on the player
    expect(next.players.p1!.health).toBe(50);
  });
});
