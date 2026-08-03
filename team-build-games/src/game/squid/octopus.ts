/**
 * Octopus rig: one head hub point + LEG_COUNT rope legs of LEG_JOINTS chained points each.
 * Constraint topology is static and deterministic, so it is a module const and
 * never rides the wire — snapshots only carry point positions + leg state.
 *
 * Anchors are indices INTO leg.pts (chain positions), not into world.points. They sit at
 * the same fractions of the leg as the old 3-joint rig's root/mid/tip, so motors and the
 * stance spring attach exactly where they used to and the feel carries over.
 */

import { BODY_HEIGHT_M, HEAD_START_X_M, LEG_COUNT, LEG_JOINTS, LEG_SEGMENT_M } from "./constants";
import type { DistCon, Leg, VPoint } from "./types";

export const HEAD = 0;
export const POINT_COUNT = 1 + LEG_COUNT * LEG_JOINTS;

/** Chain-position anchors (indices into leg.pts). */
export const TIP = LEG_JOINTS - 1;
export const ROOT_ANCHOR = Math.round(LEG_JOINTS / 3) - 1; // ≈1/3 down the chain — the old "root"
export const MID_ANCHOR = Math.round((2 * LEG_JOINTS) / 3) - 1; // ≈2/3 — the old "mid"

const at = (x: number, y: number): VPoint => ({ pos: { x, y }, prev: { x, y } });

/** Leg k's point indices, root→tip. */
const legPts = (k: number): number[] => Array.from({ length: LEG_JOINTS }, (_, j) => 1 + k * LEG_JOINTS + j);

/** Tip x-offset from the head for leg k: fanned from -0.9 m (behind) to +0.9 m (ahead). */
const tipOffset = (k: number): number => ((k - (LEG_COUNT - 1) / 2) / ((LEG_COUNT - 1) / 2)) * 0.9;

export function buildPoints(): VPoint[] {
  const pts: VPoint[] = [at(HEAD_START_X_M, BODY_HEIGHT_M)];
  for (let k = 0; k < LEG_COUNT; k++) {
    const tipX = HEAD_START_X_M + tipOffset(k);
    // points interpolated from head to tip; the solver settles exact lengths in a few ticks
    for (let j = 0; j < LEG_JOINTS; j++) {
      const f = (j + 1) / LEG_JOINTS;
      pts.push(at(HEAD_START_X_M + (tipX - HEAD_START_X_M) * f, BODY_HEIGHT_M * (1 - f)));
    }
  }
  return pts;
}

export function buildLegs(): Leg[] {
  return Array.from({ length: LEG_COUNT }, (_, k) => ({
    pts: legPts(k),
    planted: true,
    lifted: false,
  }));
}

export const RIG_CONSTRAINTS: DistCon[] = Array.from({ length: LEG_COUNT }, (_, k) => {
  const p = legPts(k);
  const cons: DistCon[] = [{ a: HEAD, b: p[0]!, len: LEG_SEGMENT_M }];
  for (let j = 0; j + 1 < LEG_JOINTS; j++) cons.push({ a: p[j]!, b: p[j + 1]!, len: LEG_SEGMENT_M });
  return cons;
}).flat();
