import { describe, expect, it } from "vitest";
import { coerceEnemy, createEnemy, ENEMY_STATS } from "./enemy";

describe("survival enemy model", () => {
  it("createEnemy seeds health + stats from the kind table", () => {
    const e = createEnemy("e1-0", "crawler", { x: 5, y: 6 }, 10);
    expect(e.kind).toBe("crawler");
    expect(e.health).toBe(ENEMY_STATS.crawler.maxHealth);
    expect(e.maxHealth).toBe(ENEMY_STATS.crawler.maxHealth);
    expect(e.status).toBe("alive");
    expect(e.pos).toEqual({ x: 5, y: 6 });
    expect(e.spawnTick).toBe(10);
    expect(e.hitCooldownRemaining).toBe(0);
  });

  it("coerceEnemy rebuilds a trusted enemy from wire data (unknown kind → default; clamps health/cooldown)", () => {
    const e = coerceEnemy({
      id: "e1-2",
      kind: "bogus",
      pos: { x: 3, y: 4 },
      health: 99,
      status: "alive",
      hitCooldownRemaining: -5,
      spawnTick: 7,
      facing: "left",
      aim: 1.2,
    });
    expect(e.kind).toBe("crawler"); // unknown kind → default
    expect(e.id).toBe("e1-2");
    expect(e.pos).toEqual({ x: 3, y: 4 });
    expect(e.health).toBe(ENEMY_STATS.crawler.maxHealth); // clamped to maxHealth
    expect(e.hitCooldownRemaining).toBe(0); // negative clamped
    expect(e.facing).toBe("left");
  });

  it("coerceEnemy turns garbage into a safe dead enemy (no-op in the sim)", () => {
    const e = coerceEnemy({});
    expect(e.status).toBe("dead");
    expect(e.health).toBe(0);
    expect(e.pos).toEqual({ x: 0, y: 0 });
  });
});
