/**
 * Pure input → Intent mapping. No engine/DOM/clock.
 *
 * Encodes two rules from the spec:
 *  - facing = the last-moved direction (horizontal takes precedence; kept when idle)
 *  - dash, attack, and block are EDGE-triggered: one action per press, not per held frame.
 */

import type {
  Direction,
  InputState,
  Intent,
  InputMemory,
  RawInput,
} from "./types";

/** Derive the new facing from movement keys, falling back to the previous facing. */
export function nextFacing(input: InputState, prev: Direction): Direction {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx !== 0) return dx > 0 ? "right" : "left";
  if (dy !== 0) return dy > 0 ? "down" : "up";
  return prev;
}

/** Fresh per-player input memory (defaults to facing down, no keys held). */
export function initialMemory(facing: Direction = "down"): InputMemory {
  return { facing, dashHeld: false, attackHeld: false, blockHeld: false };
}

/**
 * Map one frame of raw input + the player's prior memory into a serializable Intent
 * plus the updated memory to carry into the next frame.
 */
export function inputToIntent(
  raw: RawInput,
  mem: InputMemory,
): { intent: Intent; memory: InputMemory } {
  const move: InputState = {
    up: raw.up,
    down: raw.down,
    left: raw.left,
    right: raw.right,
  };
  const facing = nextFacing(move, mem.facing);
  const dash = raw.dash && !mem.dashHeld;
  const attack = raw.attack && !mem.attackHeld;
  const block = raw.block && !mem.blockHeld;
  return {
    intent: { move, facing, aim: raw.aim, dash, attack, block },
    memory: {
      facing,
      dashHeld: raw.dash,
      attackHeld: raw.attack,
      blockHeld: raw.block,
    },
  };
}
