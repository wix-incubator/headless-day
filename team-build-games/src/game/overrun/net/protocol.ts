/**
 * Overrun-owned wire protocol. NETCODE IS PER GAME: the shared `src/game/net/protocol.ts` carries
 * only lobby/presence traffic (hello/roster/kick/host) plus the arena's game messages; Overrun's
 * game messages live here so the two games' wire formats can evolve independently. Both use the
 * same versioned JSON envelope, so an Overrun room and its lobby traffic share one Transport
 * without ambiguity (message tags are disjoint — Overrun's all start with "o").
 *
 * Payloads for `oInput`/`oSnap`/`oDelta` stay `unknown` here — `src/game/overrun/net/codec.ts` owns
 * their concrete (quantized) shape; this file only owns the envelope + the tag union.
 */

import { PROTOCOL_VERSION } from "../../net/protocol";
import type { PlayerId } from "../types";

export type OverrunNetMessage =
  | { t: "oHello"; name: string; hostId?: PlayerId | null }
  // Host → peers: play the campaign intro comic in the room before the match starts.
  | { t: "oIntro" }
  | { t: "oStart"; countdownMs: number; seed: number; mode?: "campaign" | "survival"; players: { id: PlayerId; name: string }[] }
  | { t: "oInput"; intent: unknown }
  | { t: "oSnap"; w: unknown }
  | { t: "oDelta"; d: unknown };

export function encode(m: OverrunNetMessage): string {
  return JSON.stringify({ v: PROTOCOL_VERSION, m });
}

/** Parse a wire string as an Overrun message; null on garbage, version mismatch, or non-Overrun traffic. */
export function decode(s: string): OverrunNetMessage | null {
  try {
    const o = JSON.parse(s) as { v?: number; m?: { t?: unknown } };
    if (o && o.v === PROTOCOL_VERSION && o.m && typeof o.m.t === "string" && o.m.t.startsWith("o")) {
      return o.m as OverrunNetMessage;
    }
  } catch {
    /* fall through */
  }
  return null;
}
