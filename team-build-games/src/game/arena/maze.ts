/**
 * Pure, deterministic maze generator for labyrinth arenas (P9 / F6).
 *
 * A randomized-DFS (recursive-backtracker) carves a PERFECT maze — a spanning tree over the cell
 * grid, so there's exactly one path between any two cells and every cell is reachable. Randomness
 * comes from a seeded PRNG (`mulberry32`), never a clock/`Math.random()`, so the host can broadcast
 * just the seed in `start` and every peer rebuilds the identical maze (determinism invariant).
 *
 * Output carries both the per-cell wall grids (for connectivity/pathfinding + collision queries) and
 * ready-to-draw interior wall segments in METRES. The outer boundary is the field edge, already
 * enforced by the sim's clamp, so it isn't emitted here.
 */

import type { Vec2 } from "./types";

export interface WallSeg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Maze {
  cols: number;
  rows: number;
  cellM: number;
  /** wallRight[c][r] — wall on the EAST edge of cell (c,r). c=cols-1 is the field boundary. */
  wallRight: boolean[][];
  /** wallDown[c][r] — wall on the SOUTH edge of cell (c,r). r=rows-1 is the field boundary. */
  wallDown: boolean[][];
  /** Interior wall segments in metres (excludes the field boundary). */
  walls: WallSeg[];
}

/** Deterministic PRNG (mulberry32) — pure + seeded, returns floats in [0, 1). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Centre of a grid cell, in metres — for placing spawns in open cells. */
export function mazeCellCenter(col: number, row: number, cellM: number): Vec2 {
  return { x: (col + 0.5) * cellM, y: (row + 0.5) * cellM };
}

export function generateMaze(seed: number, cols: number, rows: number, cellM: number): Maze {
  const rng = mulberry32(seed);
  const boolGrid = (v: boolean): boolean[][] =>
    Array.from({ length: cols }, () => Array.from({ length: rows }, () => v));
  const wallRight = boolGrid(true);
  const wallDown = boolGrid(true);
  const visited = boolGrid(false);

  // Iterative randomized DFS from (0,0): pick a random unvisited neighbour, knock down the wall
  // between, recurse; backtrack when boxed in. Carves exactly cols*rows-1 passages (a spanning tree).
  const stack: [number, number][] = [[0, 0]];
  visited[0]![0] = true;
  while (stack.length > 0) {
    const [c, r] = stack[stack.length - 1]!;
    const nbrs: [number, number, "E" | "W" | "S" | "N"][] = [];
    if (c < cols - 1 && !visited[c + 1]![r]) nbrs.push([c + 1, r, "E"]);
    if (c > 0 && !visited[c - 1]![r]) nbrs.push([c - 1, r, "W"]);
    if (r < rows - 1 && !visited[c]![r + 1]) nbrs.push([c, r + 1, "S"]);
    if (r > 0 && !visited[c]![r - 1]) nbrs.push([c, r - 1, "N"]);
    if (nbrs.length === 0) {
      stack.pop();
      continue;
    }
    const [nc, nr, dir] = nbrs[Math.floor(rng() * nbrs.length)]!;
    if (dir === "E") wallRight[c]![r] = false;
    else if (dir === "W") wallRight[c - 1]![r] = false;
    else if (dir === "S") wallDown[c]![r] = false;
    else wallDown[c]![r - 1] = false;
    visited[nc]![nr] = true;
    stack.push([nc, nr]);
  }

  const walls: WallSeg[] = [];
  for (let c = 0; c < cols - 1; c++) {
    for (let r = 0; r < rows; r++) {
      if (wallRight[c]![r]) {
        const x = (c + 1) * cellM;
        walls.push({ x1: x, y1: r * cellM, x2: x, y2: (r + 1) * cellM });
      }
    }
  }
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows - 1; r++) {
      if (wallDown[c]![r]) {
        const y = (r + 1) * cellM;
        walls.push({ x1: c * cellM, y1: y, x2: (c + 1) * cellM, y2: y });
      }
    }
  }

  return { cols, rows, cellM, wallRight, wallDown, walls };
}
