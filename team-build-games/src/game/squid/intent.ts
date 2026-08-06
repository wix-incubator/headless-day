/**
 * RawSquidInput (held keys, per render frame) → SquidIntent (per sim tick), with
 * edge detection for cycle. `coerceSquidIntent` is the host's anti-cheat boundary:
 * peers can only ever express well-formed intent bits, never leg ownership or positions.
 */

import { LEG_COUNT } from "./constants";
import type { RawSquidInput, SquidIntent } from "./types";

export interface SquidInputMemory {
  prevCycle: boolean;
}

export const initialSquidMemory = (): SquidInputMemory => ({ prevCycle: false });

export function squidInputToIntent(
  raw: RawSquidInput,
  mem: SquidInputMemory,
): { intent: SquidIntent; memory: SquidInputMemory } {
  const swing: SquidIntent["swing"] = raw.left === raw.right ? 0 : raw.left ? -1 : 1;
  return {
    intent: {
      swing,
      lift: raw.lift,
      cycle: raw.cycle && !mem.prevCycle,
      grabLeg: raw.grabLeg ?? undefined,
    },
    memory: { prevCycle: raw.cycle },
  };
}

/** Sanitize an untrusted wire intent (host trust boundary). */
export function coerceSquidIntent(raw: unknown): SquidIntent {
  const i = (raw ?? {}) as Partial<SquidIntent>;
  const swingNum = Number(i.swing);
  const swing: SquidIntent["swing"] = swingNum > 0 ? 1 : swingNum < 0 ? -1 : 0;
  const grabOk = Number.isInteger(i.grabLeg) && (i.grabLeg as number) >= 0 && (i.grabLeg as number) < LEG_COUNT;
  return {
    swing,
    lift: !!i.lift,
    cycle: !!i.cycle,
    grabLeg: grabOk ? (i.grabLeg as number) : undefined,
  };
}
