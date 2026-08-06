/**
 * Pure squid sim types. No engine/net/DOM imports — mirrors the arena core's discipline.
 * Self-contained: Squid owns its primitives so the two games share no code (structurally identical
 * to Arena's, but not imported from it — keeps the games fully independent).
 */

import type { StageId } from "./stage";

/** Opaque player identifier (a Trystero peer id). */
export type PlayerId = string;
/** 2D vector in metres. */
export interface Vec2 {
  x: number;
  y: number;
}

export type { StageId };

/** A verlet point: position + previous position (velocity is pos - prev). */
export interface VPoint {
  pos: Vec2;
  prev: Vec2;
}

/** Distance constraint between point indices a and b. */
export interface DistCon {
  a: number;
  b: number;
  len: number;
}

/** One octopus leg: point indices into world.points, root-nearest-head → tip (length LEG_JOINTS). */
export interface Leg {
  pts: number[];
  /** Tip pinned to the ground (provides support + propulsion leverage). */
  planted: boolean;
  /** Lift key held — tip raised and unpinned. */
  lifted: boolean;
}

export type SquidPhase = "playing" | "ended";
export type RoundResult = "finished" | "failed" | null;

export interface SquidWorld {
  phase: SquidPhase;
  tick: number;
  stage: StageId;
  /** [0] = head hub; then legs' points in leg order (LEG_JOINTS points per leg, root-nearest-head → tip). */
  points: VPoint[];
  legs: Leg[];
  /** Controlling player per leg index (null = unheld). */
  control: (PlayerId | null)[];
  /** Sorted participant ids (deterministic intent iteration + meta lookups). */
  playerIds: PlayerId[];
  /** Seconds spent in "playing" before a result was set (accumulated from injected dt — stepping rate is NOT fixed). */
  elapsedS: number;
  result: RoundResult;
}

/** What a player may express per tick (sanitized by coerceSquidIntent on the host). */
export interface SquidIntent {
  swing: -1 | 0 | 1;
  lift: boolean;
  /** Edge-triggered: release current leg, claim the next unheld one. */
  cycle: boolean;
  /** Edge-triggered: claim this leg index (from clicking a leg). */
  grabLeg?: number;
}

/** Raw per-frame input from the renderer (keyboard + pointer). */
export interface RawSquidInput {
  left: boolean;
  right: boolean;
  lift: boolean;
  cycle: boolean;
  grabLeg: number | null;
}
