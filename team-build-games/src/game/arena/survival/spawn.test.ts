import { describe, expect, it } from "vitest";
import { enemySpawnPoint } from "./spawn";

const FIELD = 30;
const outside = (x: number, y: number) => x < 0 || x > FIELD || y < 0 || y > FIELD;

describe("enemySpawnPoint (enemies enter from OUTSIDE the field, then crawl inward)", () => {
  it("places the spawn outside the field for every angle", () => {
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const p = enemySpawnPoint(a, FIELD, 2);
      expect(outside(p.x, p.y)).toBe(true);
    }
  });

  it("is deterministic and finite", () => {
    const p = enemySpawnPoint(1.234, FIELD, 2);
    expect(p).toEqual(enemySpawnPoint(1.234, FIELD, 2));
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
  });

  it("angle 0 spawns due east of centre", () => {
    const p = enemySpawnPoint(0, FIELD, 2);
    expect(p.x).toBeGreaterThan(FIELD); // east, beyond the edge
    expect(p.y).toBeCloseTo(FIELD / 2, 5); // level with centre
  });
});
