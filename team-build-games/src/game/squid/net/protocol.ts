/**
 * Squid-owned wire protocol. NETCODE IS PER GAME: the shared `src/game/net/protocol.ts`
 * carries only lobby/presence traffic (hello/roster/kick/host) plus the arena's game
 * messages; squid's game messages live here so the two games' wire formats can evolve
 * independently. Both use the same versioned JSON envelope, so a squid room and its
 * lobby traffic share one Transport without ambiguity (message tags are disjoint).
 */

import { PROTOCOL_VERSION } from "../../net/protocol";
import type { PlayerId, SquidIntent, SquidWorld, StageId } from "../types";

/** A participant in a starting squid round (no weapons/shapes — cosmetics are color+name). */
export interface SquidStartPlayer {
  id: PlayerId;
  name: string;
  iconColor: number;
  avatarUrl?: string | null;
}

export type SquidNetMessage =
  | { t: "squidStart"; countdownMs: number; stage: StageId; players: SquidStartPlayer[] }
  | { t: "squidInput"; tick: number; intent: SquidIntent }
  | { t: "squidSnapshot"; world: SquidWorld };

export function encodeSquid(m: SquidNetMessage): string {
  return JSON.stringify({ v: PROTOCOL_VERSION, m });
}

/** Parse a wire string as a squid message; null on garbage, version mismatch, or non-squid traffic. */
export function decodeSquid(s: string): SquidNetMessage | null {
  try {
    const o = JSON.parse(s) as { v?: number; m?: { t?: unknown } };
    if (o && o.v === PROTOCOL_VERSION && o.m && typeof o.m.t === "string" && o.m.t.startsWith("squid")) {
      return o.m as SquidNetMessage;
    }
  } catch {
    /* fall through */
  }
  return null;
}
