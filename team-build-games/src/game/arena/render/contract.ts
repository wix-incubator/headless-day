/** Shared contract between the renderer scene and whatever drives the match (solo or net). */

import type { PlayerId, RawInput, World } from "../types";
import type { Shape } from "../cosmetic";

export interface PlayerMeta {
  name: string;
  shape: Shape;
  /** Signed-in member's photo (render-only), drawn over the illustrated fighter's head. */
  avatarUrl?: string | null;
}

/** What the renderer needs each frame: the world to draw + the current countdown number. */
export interface FramePacket {
  world: World;
  countdown: number;
}

/** A match driver advances the sim (locally with bots, or over the network) and labels players. */
export interface MatchDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawInput): FramePacket;
  getMeta(id: PlayerId): PlayerMeta;
}

export interface HudState {
  countdown: number;
  health: number;
  dashFraction: number;
  attackFraction: number;
  blockFraction: number;
  alive: boolean;
}

export type ArenaEvent =
  | { type: "tik"; n: number }
  | { type: "go" }
  | { type: "dash" }
  | { type: "attack" }
  | { type: "block" }
  | { type: "shoot" }
  | { type: "hit"; local: boolean }
  | { type: "death"; local: boolean };
