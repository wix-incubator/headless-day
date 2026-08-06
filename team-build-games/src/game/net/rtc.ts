/**
 * Trystero-backed Transport (browser-only). Game data flows directly peer-to-peer over
 * WebRTC DataChannels; only matchmaking/signaling rides a medium:
 *
 * - **https (production)**: Wix Realtime via our topic adapter (./wixSignal) — subscribe over
 *   `@wix/realtime`, publish through `/api/signal`. Signals are E2E-encrypted by Trystero, so
 *   the default-readable channel and our relay never see plaintext SDP. Measured in the
 *   Realtime Lab: ~600 ms per signal hop, well within the ~70 msg/s site quota at signaling rates.
 * - **http (local `wix dev`)**: public Nostr relays, because the Wix duplexer is TLS-only and
 *   unreachable from http pages. Prod signaling is exercised via the deployed site.
 *
 * Import ONLY from client-side code (it touches RTCPeerConnection) — never during SSR.
 * The sync engine talks to this purely through the Transport interface, so everything that
 * runs against LocalHub in tests runs unchanged here.
 */

import { createTopicStrategy, selfId } from "@trystero-p2p/core";
import { joinRoom as joinNostrRoom } from "trystero/nostr";
import { subscriber } from "@wix/realtime";
import { SIGNAL_CHANNEL } from "../../lib/signal/protocol";
import { makeWixTopicAdapter, type WixSignalDeps } from "./wixSignal";
import type { MessageHandler, PeerHandler, PeerId, Transport } from "./transport";

const APP_ID = "team-build-arena";

export interface RtcOptions {
  roomId: string;
  /** STUN + TURN servers. TURN is required for the ~10–20% behind strict NAT. */
  iceServers?: RTCIceServer[];
  /** Nostr fallback only: how many relays to use for resilient matchmaking (default 4). */
  relayRedundancy?: number;
}

/** Real I/O for the Wix topic adapter: @wix/realtime subscription + /api/signal publishes. */
const wixDeps: WixSignalDeps = {
  subscribe: (topic, handlers) =>
    subscriber.subscribe(
      { name: SIGNAL_CHANNEL, resourceId: topic },
      (message) => handlers.onPayload(message.payload),
      {
        onSubscribed: () => handlers.onReady(),
        onSubscriptionError: (error) =>
          handlers.onError({ recoverable: error.recoverable, message: error.message }),
      },
    ),
  unsubscribe: (subscriptionId) => void subscriber.unsubscribe({ subscriptionId }),
  post: async (body) => {
    try {
      const res = await fetch("/api/signal", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; status?: number | null; message?: string };
      return { ok: res.ok && data.ok === true, status: data.status ?? res.status, message: data.message };
    } catch (e) {
      return { ok: false, status: null, message: (e as Error)?.message ?? String(e) };
    }
  },
};

const joinWixRoom = createTopicStrategy(makeWixTopicAdapter(wixDeps));

/** The Wix duplexer is TLS-only; http pages (local dev) must keep the Nostr medium. */
const useWixSignaling = () => typeof location !== "undefined" && location.protocol === "https:";

export function createRtcTransport(opts: RtcOptions): Transport {
  const config = {
    appId: APP_ID,
    ...(opts.iceServers ? { rtcConfig: { iceServers: opts.iceServers } } : {}),
  };
  const room = useWixSignaling()
    ? joinWixRoom(config, opts.roomId)
    : joinNostrRoom({ ...config, relayConfig: { redundancy: opts.relayRedundancy ?? 4 } }, opts.roomId);

  const action = room.makeAction<string>("msg");
  const msgCbs: MessageHandler[] = [];
  const joinCbs: PeerHandler[] = [];
  const leaveCbs: PeerHandler[] = [];

  action.onMessage = (data, ctx) => {
    for (const cb of msgCbs) cb(String(data), ctx.peerId);
  };
  room.onPeerJoin = (id) => {
    for (const cb of joinCbs) cb(id);
  };
  room.onPeerLeave = (id) => {
    for (const cb of leaveCbs) cb(id);
  };

  return {
    selfId,
    send(data: string, to?: PeerId) {
      void action.send(data, to !== undefined ? { target: to } : undefined);
    },
    onMessage(cb) {
      msgCbs.push(cb);
    },
    onPeerJoin(cb) {
      joinCbs.push(cb);
    },
    onPeerLeave(cb) {
      leaveCbs.push(cb);
    },
    getPeers() {
      return Object.keys(room.getPeers());
    },
    close() {
      void room.leave();
    },
  };
}
