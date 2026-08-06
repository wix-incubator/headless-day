import { describe, expect, it } from "vitest";
import { generateMaze } from "./maze";
import { cellAt, findPath, nextStepToward } from "./mazePath";

describe("maze pathfinding (BFS through open passages — maze-aware bots)", () => {
  const m = generateMaze(42, 10, 10, 3);

  it("cellAt maps metres → grid cell (clamped to the grid)", () => {
    expect(cellAt({ x: 1.5, y: 1.5 }, m)).toEqual({ c: 0, r: 0 });
    expect(cellAt({ x: 7.9, y: 4.1 }, m)).toEqual({ c: 2, r: 1 });
    expect(cellAt({ x: 100, y: -5 }, m)).toEqual({ c: 9, r: 0 }); // clamped into range
  });

  it("path to self is a single cell", () => {
    expect(findPath(m, { c: 3, r: 3 }, { c: 3, r: 3 })).toEqual([{ c: 3, r: 3 }]);
  });

  it("finds a valid connected path between any two cells (perfect maze ⇒ always exists)", () => {
    const path = findPath(m, { c: 0, r: 0 }, { c: 9, r: 9 });
    expect(path.length).toBeGreaterThan(1);
    expect(path[0]).toEqual({ c: 0, r: 0 });
    expect(path[path.length - 1]).toEqual({ c: 9, r: 9 });
    for (let i = 1; i < path.length; i++) {
      const md = Math.abs(path[i]!.c - path[i - 1]!.c) + Math.abs(path[i]!.r - path[i - 1]!.r);
      expect(md).toBe(1); // consecutive cells are grid-adjacent
    }
  });

  it("nextStepToward returns the first step (or null once at the target)", () => {
    const from = { c: 0, r: 0 };
    const to = { c: 9, r: 9 };
    const step = nextStepToward(m, from, to)!;
    expect(step).not.toBeNull();
    expect(Math.abs(step.c - from.c) + Math.abs(step.r - from.r)).toBe(1);
    expect(nextStepToward(m, to, to)).toBeNull();
  });
});
