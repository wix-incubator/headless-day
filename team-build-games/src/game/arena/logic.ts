/**
 * Pure arena math — no Phaser, no DOM, no clocks/RNG. All units are world METERS / seconds.
 * Shared types live in ./types; this module re-exports Vec2/InputState for convenience.
 *
 * Screen coordinate convention: +x is right, +y is DOWN (so "up" is -y).
 */

import type { Direction, InputState, Vec2 } from "./types";

export type { Direction, InputState, Vec2 } from "./types";

/** Euclidean distance between two points. */
export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Convert held keys into a unit direction vector. Opposite keys cancel, and
 * diagonals are normalized so moving diagonally is not faster than cardinal.
 * Returns {0,0} when there is no net input.
 */
export function directionFromInput(input: InputState): Vec2 {
  const x = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const y = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

/** Unit vector for a 4-way facing (y is down). */
export function directionVector(dir: Direction): Vec2 {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

/** Radians for a 4-way facing (y is down: right=0, down=+π/2, up=-π/2, left=π). */
export function directionAngle(dir: Direction): number {
  const v = directionVector(dir);
  return Math.atan2(v.y, v.x);
}

/** Unit vector for an aim angle in radians (the free-aim analogue of directionVector). */
export function aimVector(angle: number): Vec2 {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/**
 * Integrate one movement step: pos + dir * speed * dt.
 * `dt` is in seconds, `speed` in meters/second.
 */
export function stepPosition(
  pos: Vec2,
  input: InputState,
  dt: number,
  speed: number,
): Vec2 {
  const dir = directionFromInput(input);
  return {
    x: pos.x + dir.x * speed * dt,
    y: pos.y + dir.y * speed * dt,
  };
}

/** Clamp a position so a figure of the given radius stays fully inside the field. */
export function clampToField(pos: Vec2, fieldM: number, radiusM: number): Vec2 {
  const min = radiusM;
  const max = fieldM - radiusM;
  return {
    x: Math.min(max, Math.max(min, pos.x)),
    y: Math.min(max, Math.max(min, pos.y)),
  };
}

/** True when two points are within `rangeM` meters (inclusive), center-to-center. */
export function withinRange(a: Vec2, b: Vec2, rangeM: number): boolean {
  return distance(a, b) <= rangeM;
}

/** @deprecated proximity helper kept for the prototype scene; use {@link withinRange}. */
export function isNearNPC(player: Vec2, npc: Vec2, rangeM: number): boolean {
  return withinRange(player, npc, rangeM);
}
