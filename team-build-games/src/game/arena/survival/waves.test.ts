import { describe, expect, it } from "vitest";
import { enemyKindForSpawn, MAX_CONCURRENT_ENEMIES, waveEnemyCount, wavePlan } from "./waves";

describe("Survival wave planning", () => {
  it("is deterministic for the same seed and wave coordinates", () => {
    expect(wavePlan(1234, 2, 3, 4)).toEqual(wavePlan(1234, 2, 3, 4));
  });

  it("scales with progression and frozen party size", () => {
    expect(waveEnemyCount(2, 1, 1)).toBeGreaterThan(waveEnemyCount(1, 1, 1));
    expect(waveEnemyCount(1, 2, 1)).toBeGreaterThan(waveEnemyCount(1, 1, 1));
    expect(waveEnemyCount(1, 1, 8)).toBeGreaterThan(waveEnemyCount(1, 1, 1));
    expect(waveEnemyCount(999, 999, 8)).toBe(MAX_CONCURRENT_ENEMIES);
  });

  it("creates unique, monotonic, perimeter-oriented spawn entries", () => {
    const plan = wavePlan(77, 1, 1, 3);
    expect(new Set(plan.spawns.map((spawn) => spawn.id)).size).toBe(plan.spawns.length);
    for (let i = 0; i < plan.spawns.length; i++) {
      const spawn = plan.spawns[i]!;
      expect(spawn.angle).toBeGreaterThanOrEqual(0);
      expect(spawn.angle).toBeLessThan(Math.PI * 2);
      if (i > 0) expect(spawn.atTick).toBeGreaterThan(plan.spawns[i - 1]!.atTick);
    }
  });

  it("unlocks the fantasy roster across campaign levels", () => {
    const kinds = new Set(
      Array.from({ length: 500 }, (_, index) =>
        enemyKindForSpawn(77, 5, 3, index, `enemy-${index}`),
      ),
    );
    expect(kinds).toEqual(new Set(["ant", "zombie", "bat", "clawed", "dino"]));
    expect(enemyKindForSpawn(77, 1, 1, 0, "early")).not.toMatch(/bat|clawed|dino/);
  });
});
