/**
 * Pure BFS pathfinding across a maze's open passages (P9 / F6) — so bots navigate corridors instead
 * of wall-hugging a straight-line chase. Deterministic (no clock/RNG); operates on the seeded
 * `generateMaze` output, so every peer computes identical routes.
 */

import type { Vec2 } from "./types";
import type { Maze } from "./maze";

export interface Cell {
  c: number;
  r: number;
}

const clamp = (v: number, max: number): number => (v < 0 ? 0 : v > max ? max : v);

/** Which grid cell a world position (metres) falls in, clamped into the grid. */
export function cellAt(pos: Vec2, maze: Maze): Cell {
  return {
    c: clamp(Math.floor(pos.x / maze.cellM), maze.cols - 1),
    r: clamp(Math.floor(pos.y / maze.cellM), maze.rows - 1),
  };
}

/** Grid neighbours of (c,r) reachable through an OPEN passage (no wall between). */
function openNeighbors(m: Maze, c: number, r: number): Cell[] {
  const out: Cell[] = [];
  if (c < m.cols - 1 && !m.wallRight[c]![r]) out.push({ c: c + 1, r });
  if (c > 0 && !m.wallRight[c - 1]![r]) out.push({ c: c - 1, r });
  if (r < m.rows - 1 && !m.wallDown[c]![r]) out.push({ c, r: r + 1 });
  if (r > 0 && !m.wallDown[c]![r - 1]) out.push({ c, r: r - 1 });
  return out;
}

/** Shortest cell path `from → to` (inclusive) through open passages, or [] if unreachable. */
export function findPath(maze: Maze, from: Cell, to: Cell): Cell[] {
  if (from.c === to.c && from.r === to.r) return [{ c: from.c, r: from.r }];
  const key = (c: number, r: number) => `${c},${r}`;
  const prev = new Map<string, Cell>();
  const seen = new Set<string>([key(from.c, from.r)]);
  const queue: Cell[] = [{ c: from.c, r: from.r }];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const n of openNeighbors(maze, cur.c, cur.r)) {
      const k = key(n.c, n.r);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, cur);
      if (n.c === to.c && n.r === to.r) {
        const path: Cell[] = [n];
        let p: Cell | undefined = cur;
        while (p && !(p.c === from.c && p.r === from.r)) {
          path.unshift(p);
          p = prev.get(key(p.c, p.r));
        }
        path.unshift({ c: from.c, r: from.r });
        return path;
      }
      queue.push(n);
    }
  }
  return [];
}

/** The next cell to move toward along the shortest path, or null when already at the target. */
export function nextStepToward(maze: Maze, from: Cell, to: Cell): Cell | null {
  const path = findPath(maze, from, to);
  return path.length >= 2 ? path[1]! : null;
}
