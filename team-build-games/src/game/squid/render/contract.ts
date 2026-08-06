/** Shared contract between the squid renderer scene and whatever drives the round. */

import type { PlayerId, RawSquidInput, RoundResult, SquidWorld } from "../types";

export interface SquidPlayerMeta {
  name: string;
  colorIndex: number;
}

export interface SquidFramePacket {
  world: SquidWorld;
  countdown: number;
}

export interface SquidDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawSquidInput): SquidFramePacket;
  getMeta(id: PlayerId): SquidPlayerMeta;
}

export interface SquidHudState {
  countdown: number;
  timeMs: number;
  /** The local player's held leg index, or null. */
  myLeg: number | null;
  result: RoundResult;
}

export type SquidEvent =
  | { type: "tik"; n: number }
  | { type: "go" }
  | { type: "grab" }
  | { type: "finish" }
  | { type: "fall" };

export interface SquidConfig {
  driver: SquidDriver;
  onHud: (h: SquidHudState) => void;
  onEvent: (e: SquidEvent) => void;
  onEnd: (result: "finished" | "failed", timeMs: number) => void;
}
