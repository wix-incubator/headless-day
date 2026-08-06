import { describe, expect, it } from "vitest";
import { generateMaze, mazeCellCenter, type Maze } from "./maze";

/** Flood-fill through open passages from (0,0); returns how many cells are reachable. */
function reachableCount(m: Maze): number {
  const seen = new Set<string>();
  const stack: [number, number][] = [[0, 0]];
  seen.add("0,0");
  while (stack.length) {
    const [c, r] = stack.pop()!;
    const nbrs: [number, number][] = [];
    if (c < m.cols - 1 && !m.wallRight[c]![r]) nbrs.push([c + 1, r]);
    if (c > 0 && !m.wallRight[c - 1]![r]) nbrs.push([c - 1, r]);
    if (r < m.rows - 1 && !m.wallDown[c]![r]) nbrs.push([c, r + 1]);
    if (r > 0 && !m.wallDown[c]![r - 1]) nbrs.push([c, r - 1]);
    for (const [nc, nr] of nbrs) {
      const k = `${nc},${nr}`;
      if (!seen.has(k)) {
        seen.add(k);
        stack.push([nc, nr]);
      }
    }
  }
  return seen.size;
}

describe("generateMaze (deterministic recursive-backtracker perfect maze)", () => {
  it("is fully deterministic — same seed + size ⇒ identical maze", () => {
    const a = generateMaze(1234, 10, 10, 3);
    const b = generateMaze(1234, 10, 10, 3);
    expect(a).toEqual(b);
  });

  it("different seeds produce different mazes", () => {
    const a = generateMaze(1, 10, 10, 3);
    const b = generateMaze(2, 10, 10, 3);
    expect(a.walls).not.toEqual(b.walls);
  });

  it("is a PERFECT maze — every cell reachable from (0,0)", () => {
    const m = generateMaze(7, 10, 10, 3);
    expect(reachableCount(m)).toBe(10 * 10);
  });

  it("has exactly (interior edges − passages) interior walls (spanning-tree invariant)", () => {
    const cols = 10;
    const rows = 10;
    const m = generateMaze(99, cols, rows, 3);
    const interiorEdges = (cols - 1) * rows + cols * (rows - 1); // 180 for 10x10
    const passages = cols * rows - 1; // a perfect maze is a spanning tree: 99 carved
    expect(m.walls.length).toBe(interiorEdges - passages); // 81
  });

  it("reports its dimensions and emits wall segments in metres within the field", () => {
    const m = generateMaze(3, 10, 10, 3);
    expect({ cols: m.cols, rows: m.rows, cellM: m.cellM }).toEqual({ cols: 10, rows: 10, cellM: 3 });
    for (const w of m.walls) {
      expect(w.x1).toBeGreaterThanOrEqual(0);
      expect(w.x2).toBeLessThanOrEqual(30);
      expect(w.y1).toBeGreaterThanOrEqual(0);
      expect(w.y2).toBeLessThanOrEqual(30);
    }
  });

  it("mazeCellCenter returns the centre of a cell in metres", () => {
    expect(mazeCellCenter(0, 0, 3)).toEqual({ x: 1.5, y: 1.5 });
    expect(mazeCellCenter(2, 4, 3)).toEqual({ x: 7.5, y: 13.5 });
  });
});
