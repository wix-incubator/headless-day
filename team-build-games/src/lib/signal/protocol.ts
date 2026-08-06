/**
 * Shared wire contract for WebRTC signaling over Wix Realtime
 * (see docs/superpowers/specs/2026-07-16-wix-signaling-migration-design.md).
 * Used by both the /api/signal publish route and the browser topic adapter.
 */

/** Measured Wix Realtime publish cap (payload JSON bytes) — see the Realtime Lab findings. */
export const MAX_SIGNAL_BYTES = 10_240;

/** Realtime channel that carries all signaling; topics ride in `resourceId`. */
export const SIGNAL_CHANNEL = "signal";

export type ParsedSignalBody = { ok: true; topic: string; msg: string } | { ok: false; error: string };

/**
 * Trystero topics are sha1 digests with each byte `.toString(36)` UNPADDED and joined —
 * base36 alphabet, 20–40 chars (see @trystero-p2p/core utils.mjs `sha1`).
 */
const TOPIC_RE = /^[0-9a-z]{20,40}$/;

export function isSignalTopic(s: string): boolean {
  return TOPIC_RE.test(s);
}

/** Validate a /api/signal request body: `{topic, msg}` with the wrapped payload under the publish cap. */
export function parseSignalBody(body: unknown): ParsedSignalBody {
  if (body === null || typeof body !== "object") return { ok: false, error: "invalid body" };
  const { topic, msg } = body as { topic?: unknown; msg?: unknown };
  if (typeof topic !== "string" || !isSignalTopic(topic)) return { ok: false, error: "invalid topic" };
  if (typeof msg !== "string" || msg === "") return { ok: false, error: "invalid msg" };
  if (JSON.stringify({ m: msg }).length > MAX_SIGNAL_BYTES) return { ok: false, error: "payload too large" };
  return { ok: true, topic, msg };
}

/** Extract the signal string from a received realtime payload (`{m: string}`), or null. */
export function unwrapSignalPayload(payload: unknown): string | null {
  if (payload === null || typeof payload !== "object") return null;
  const m = (payload as { m?: unknown }).m;
  return typeof m === "string" && m !== "" ? m : null;
}
