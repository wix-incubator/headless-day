import { describe, expect, it } from "vitest";
import { createEnemy } from "./enemy";
import { stepEnemies, type EnemyTarget } from "./enemyStep";

const alive = (id: string, x: number, y: number): EnemyTarget => ({ id, pos: { x, y }, status: "alive" });

describe("stepEnemies (pure enemy AI: chase nearest ally, separate, contact)", () => {
  it("crawls the enemy toward the nearest alive player", () => {
    const e = createEnemy("e1-0", "crawler", { x: 0, y: 5 }, 0);
    const { enemies, contacts } = stepEnemies([e], [alive("p", 10, 5)], 0.1);
    expect(enemies[0]!.pos.x).toBeGreaterThan(0); // moved toward the player (+x)
    expect(contacts).toHaveLength(0); // too far to touch
  });

  it("holds position and never bites when frozen (dev sandbox), even adjacent to a player", () => {
    const e = createEnemy("e1-0", "crawler", { x: 1, y: 0 }, 0);
    const { enemies, contacts } = stepEnemies([e], [alive("p", 0, 0)], 0.1, { frozen: true });
    expect(enemies[0]!.pos).toEqual({ x: 1, y: 0 }); // did not chase
    expect(contacts).toEqual([]); // did not bite
  });

  it("a staggered enemy reels in place — no chase, no bite — and ticks its stun down", () => {
    // Adjacent to the player (would normally bite), but freshly hit → reeling.
    const e = { ...createEnemy("e1-0", "crawler", { x: 1, y: 0 }, 0), hitStunRemaining: 0.2 };
    const { enemies, contacts } = stepEnemies([e], [alive("p", 0, 0)], 0.1);
    expect(enemies[0]!.pos).toEqual({ x: 1, y: 0 }); // did not advance on the player
    expect(enemies[0]!.hitStunRemaining).toBeCloseTo(0.1); // stun ticked down by dt
    expect(contacts).toEqual([]); // can't bite while reeling
  });

  it("leaves dead enemies and no-players ticks in place (cooldown still ticks)", () => {
    const dead = { ...createEnemy("e1-1", "crawler", { x: 2, y: 2 }, 0), status: "dead" as const };
    const lonely = { ...createEnemy("e1-2", "crawler", { x: 2, y: 2 }, 0), hitCooldownRemaining: 0.5 };
    const { enemies } = stepEnemies([dead, lonely], [{ id: "p", pos: { x: 0, y: 0 }, status: "dead" }], 0.1);
    expect(enemies.find((e) => e.id === "e1-1")!.pos).toEqual({ x: 2, y: 2 }); // dead unchanged
    const l = enemies.find((e) => e.id === "e1-2")!;
    expect(l.pos).toEqual({ x: 2, y: 2 }); // no alive target → stays
    expect(l.hitCooldownRemaining).toBeCloseTo(0.4, 5); // cooldown decremented
  });

  it("emits a contact + resets cooldown when touching a player; none while on cooldown", () => {
    const e = createEnemy("e1-0", "crawler", { x: 5, y: 5 }, 0);
    const first = stepEnemies([e], [alive("p", 5.5, 5)], 0.1);
    expect(first.contacts).toEqual([{ enemyId: "e1-0", playerId: "p", damage: 1 }]);
    expect(first.enemies[0]!.hitCooldownRemaining).toBeGreaterThan(0); // now on cooldown
    const second = stepEnemies(first.enemies, [alive("p", 5.5, 5)], 0.1);
    expect(second.contacts).toHaveLength(0); // still cooling down → no repeat hit
  });

  it("is order-independent (sorted-id iteration ⇒ identical output)", () => {
    const a = createEnemy("e1-0", "crawler", { x: 0, y: 0 }, 0);
    const b = createEnemy("e1-1", "crawler", { x: 1, y: 0 }, 0);
    const players = [alive("p", 5, 0)];
    expect(stepEnemies([a, b], players, 0.1).enemies).toEqual(stepEnemies([b, a], players, 0.1).enemies);
  });

  it("pushes stacked enemies apart (separation)", () => {
    const a = createEnemy("e1-0", "crawler", { x: 5, y: 5 }, 0);
    const b = createEnemy("e1-1", "crawler", { x: 5.1, y: 5 }, 0);
    const { enemies } = stepEnemies([a, b], [alive("p", 5, 20)], 0.1);
    const ea = enemies.find((e) => e.id === "e1-0")!;
    const eb = enemies.find((e) => e.id === "e1-1")!;
    expect(Math.abs(ea.pos.x - eb.pos.x)).toBeGreaterThan(0); // not perfectly overlapping
  });
});
