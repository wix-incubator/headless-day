/**
 * Road Madness-owned wire envelope. Shared networking supplies transport,
 * election, and the protocol version; every Road gameplay tag is namespaced
 * with `r` so it cannot be mistaken for Arena, Overrun, or lobby traffic.
 *
 * Snapshot and delta payloads remain unknown at this boundary. `codec.ts`
 * owns their compact shape, while `coerceDriveIntent` is the host's input
 * trust boundary.
 */

import { PROTOCOL_VERSION } from "../../net/protocol";
import type {
  PlayerId,
  RoadMode,
  RoadRoundEndReason,
  RoadRules,
  VehicleClass,
} from "../types";

export interface RoadStartPlayer {
  id: PlayerId;
  name: string;
  vehicle: VehicleClass;
  colorIndex: number;
  isBot: boolean;
}

export type RoadModeEvent =
  | { kind: "countdown"; seconds: number }
  | {
      kind: "round-ended";
      winnerId: PlayerId | null;
      reason: RoadRoundEndReason;
    }
  | { kind: "match-ended"; winnerId: PlayerId | null }
  | { kind: "return-room" };

export type RoadNetMessage =
  | {
      t: "rHello";
      name: string;
      vehicle: VehicleClass;
      colorIndex: number;
      hostId?: PlayerId | null;
    }
  | {
      t: "rStart";
      countdownMs: number;
      seed: number;
      mode: RoadMode;
      mapId: string;
      rules: RoadRules;
      players: RoadStartPlayer[];
    }
  | { t: "rInput"; tick: number; intent: unknown }
  | { t: "rSnap"; w: unknown }
  | { t: "rDelta"; d: unknown }
  | { t: "rEvent"; tick: number; event: RoadModeEvent };

const ROAD_TAGS = new Set<RoadNetMessage["t"]>([
  "rHello",
  "rStart",
  "rInput",
  "rSnap",
  "rDelta",
  "rEvent",
]);

export function encodeRoadMessage(message: RoadNetMessage): string {
  return JSON.stringify({ v: PROTOCOL_VERSION, m: message });
}

/** Reject garbage, version mismatches, other games, and unknown `r*` tags. */
export function decodeRoadMessage(wire: string): RoadNetMessage | null {
  try {
    const envelope = JSON.parse(wire) as {
      v?: unknown;
      m?: { t?: unknown };
    };
    if (
      envelope?.v === PROTOCOL_VERSION &&
      envelope.m &&
      typeof envelope.m.t === "string" &&
      ROAD_TAGS.has(envelope.m.t as RoadNetMessage["t"])
    ) {
      return envelope.m as RoadNetMessage;
    }
  } catch {
    // Malformed peer traffic is ignored by design.
  }
  return null;
}
