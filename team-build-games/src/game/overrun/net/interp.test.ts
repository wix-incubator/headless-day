// src/game/overrun/net/interp.test.ts
import { describe, expect, it } from "vitest";
import { lerpAngle, lerpWorlds } from "./interp";
import { createShooterWorld } from "../match";

describe("lerpAngle", () => {
  it("takes the shortest arc, including across ±π", () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1); // wraps through π, not through 0
  });
});

describe("lerpWorlds", () => {
  it("lerps player + enemy positions between snapshots; everything else comes from b", () => {
    const a = createShooterWorld(["p"], 1);
    a.players.p = { ...a.players.p!, pos: { x: 10, y: 10 }, aim: 0 };
    a.enemies = [{ id: "e0", kind: "rusher", pos: { x: 0, y: 0 }, health: 20, attackCooldown: 0, stunRemaining: 0 }];
    const b = { ...a, tick: a.tick + 3, score: 50 };
    b.players = { p: { ...a.players.p!, pos: { x: 12, y: 10 }, aim: 1 } };
    b.enemies = [{ id: "e0", kind: "rusher", pos: { x: 2, y: 0 }, health: 15, attackCooldown: 0, stunRemaining: 0 }];
    const out = lerpWorlds(a, b, 0.5);
    expect(out.players.p!.pos.x).toBeCloseTo(11);
    expect(out.players.p!.aim).toBeCloseTo(0.5);
    expect(out.enemies[0]!.pos.x).toBeCloseTo(1);
    expect(out.enemies[0]!.health).toBe(15); // non-positional fields from b
    expect(out.score).toBe(50);
  });

  it("entities new in b (no counterpart in a) render at b's position", () => {
    const a = createShooterWorld(["p"], 1);
    const b = { ...a, tick: a.tick + 3, enemies: [{ id: "e9", kind: "tank" as const, pos: { x: 5, y: 5 }, health: 120, attackCooldown: 0, stunRemaining: 0 }] };
    expect(lerpWorlds(a, b, 0.2).enemies[0]!.pos).toEqual({ x: 5, y: 5 });
  });

  it("null or stale base returns b as-is", () => {
    const b = createShooterWorld(["p"], 1);
    expect(lerpWorlds(null, b, 0.5)).toBe(b);
    expect(lerpWorlds({ ...b, tick: b.tick + 9 }, b, 0.5)).toBe(b);
  });
});
