/**
 * Trystero topic adapter over Wix Realtime (see
 * docs/superpowers/specs/2026-07-16-wix-signaling-migration-design.md).
 *
 * Pure plumbing with injected I/O so it runs under vitest: `subscribe`/`unsubscribe`
 * wrap `@wix/realtime`, `post` wraps a fetch to /api/signal (publish is backend-only
 * on Wix). The real wiring lives in ./rtc, which feeds this into `createTopicStrategy`
 * from @trystero-p2p/core.
 */

import { unwrapSignalPayload } from "../../lib/signal/protocol";

export interface SignalSubscribeHandlers {
  onPayload: (payload: unknown) => void;
  onReady: () => void;
  onError: (err: { recoverable?: boolean; message: string }) => void;
}

export interface WixSignalDeps {
  /** Subscribe to a topic; returns a subscription id. */
  subscribe: (topic: string, handlers: SignalSubscribeHandlers) => string;
  unsubscribe: (subscriptionId: string) => void;
  /** POST a signal to the backend publish relay. */
  post: (body: { topic: string; msg: string }) => Promise<{ ok: boolean; status: number | null; message?: string }>;
  /** How long to wait for the subscription to become live (default 15s). */
  readyTimeoutMs?: number;
}

/** Message payload type matching @trystero-p2p/core's StrategyMessage. */
type StrategyMessage = string | Record<string, unknown>;

export function makeWixTopicAdapter(deps: WixSignalDeps) {
  const readyTimeoutMs = deps.readyTimeoutMs ?? 15_000;
  return {
    // The "relay" is a dummy — deps close over all real I/O.
    init: (_config: unknown): object => ({}),

    /**
     * Resolves with a cleanup fn only once the subscription is live, so the core's
     * first announce isn't published before we can hear replies. Recoverable errors
     * are left to the SDK's auto-retry; non-recoverable ones before ready reject
     * (surfacing through joinRoom's onJoinError).
     */
    subscribeTopic: (_relay: object, topic: string, onMessage: (topic: string, msg: string) => void) =>
      new Promise<() => void>((resolve, reject) => {
        let ready = false;
        let closed = false;
        let subscriptionId = "";
        const cleanup = () => {
          if (closed) return;
          closed = true;
          deps.unsubscribe(subscriptionId);
        };
        const timer = setTimeout(() => {
          if (ready || closed) return;
          cleanup();
          reject(new Error(`signal subscription to ${topic} timed out after ${readyTimeoutMs}ms`));
        }, readyTimeoutMs);
        subscriptionId = deps.subscribe(topic, {
          onPayload: (payload) => {
            if (closed) return;
            const msg = unwrapSignalPayload(payload);
            if (msg !== null) onMessage(topic, msg);
          },
          onReady: () => {
            if (ready || closed) return;
            ready = true;
            clearTimeout(timer);
            resolve(cleanup);
          },
          onError: (err) => {
            if (ready || closed || err.recoverable) return;
            clearTimeout(timer);
            cleanup();
            reject(new Error(err.message));
          },
        });
      }),

    publishTopic: async (_relay: object, topic: string, msg: StrategyMessage): Promise<void> => {
      const s = typeof msg === "string" ? msg : JSON.stringify(msg);
      const res = await deps.post({ topic, msg: s });
      if (!res.ok) throw new Error(res.message ?? `signal publish failed (${res.status})`);
    },
  };
}
