import { describe, expect, it } from "vitest";
import { slideAgainstWalls } from "./collideWalls";
import type { WallSeg } from "./maze";

const vWall: WallSeg = { x1: 3, y1: 0, x2: 3, y2: 3 }; // vertical wall at x=3

describe("slideAgainstWalls (circle vs wall segments — movement resolution)", () => {
  it("moves freely when there are no walls", () => {
    expect(slideAgainstWalls({ x: 1, y: 1 }, { x: 2, y: 2 }, 0.5, [])).toEqual({ x: 2, y: 2 });
  });

  it("moves freely when the path stays clear of walls", () => {
    expect(slideAgainstWalls({ x: 1, y: 1 }, { x: 1, y: 2.5 }, 0.5, [vWall])).toEqual({ x: 1, y: 2.5 });
  });

  it("blocks head-on movement into a wall — the circle never overlaps it", () => {
    const r = 0.5;
    const res = slideAgainstWalls({ x: 2.4, y: 1 }, { x: 2.9, y: 1 }, r, [vWall]);
    expect(res.x).toBeLessThan(2.9); // didn't reach the target
    expect(res.x + r).toBeLessThanOrEqual(3 + 1e-9); // stays on the near side of the wall
  });

  it("slides along a wall — the blocked axis stops, the free axis advances", () => {
    const r = 0.5;
    const res = slideAgainstWalls({ x: 2.4, y: 1 }, { x: 2.9, y: 2 }, r, [vWall]);
    expect(res.y).toBeCloseTo(2, 5); // slid down the wall
    expect(res.x + r).toBeLessThanOrEqual(3 + 1e-9); // still not through it
  });
});
