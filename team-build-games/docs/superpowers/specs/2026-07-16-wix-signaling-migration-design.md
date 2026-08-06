# WebRTC signaling over Wix Realtime (replacing public Nostr relays)

**Date:** 2026-07-16
**Status:** Implemented & verified on preview (2026-07-17): two tabs on `/games/arena?room=…` reached "Battle party · 2/8" via `/api/signal` (0 errors, 0 Nostr requests, ~24 signal POSTs per join+announce cycle). Production release pending user approval.
**Context:** Realtime Lab measured Wix Realtime as perfect for low-rate signaling (100% delivery, ~600 ms e2e, quota ~70 msg/s site-wide) and unusable as the 20 Hz game transport. Game data stays on WebRTC DataChannels + TURN; only matchmaking/signaling moves off third-party Nostr relays.

## Approach

Trystero 0.25 moved its engine to `@trystero-p2p/core`, which publicly exports **`createTopicStrategy`** — the seam all official strategies (mqtt/firebase/supabase) are built on. We implement a Wix "medium": subscribe to topics via `@wix/realtime`, publish via a guarded backend route. The battle-tested core keeps handling discovery, offer pooling, glare, encryption, and reconnection.

Facts from the core that make this safe on Wix Realtime:

- Announces repeat every **5,333 ms** (+ warmup bursts at 233/533/1333 ms) → discovery never depends on message replay, which Wix doesn't provide to new subscribers.
- Signals (SDPs) are **E2E-encrypted** (key derived from appId+roomId+password) → the default-readable channel leaks nothing useful.
- Topics are sha1 digests serialized as **unpadded per-byte base36** (20–40 chars, `[0-9a-z]` — see core `utils.mjs` `sha1`; NOT hex, which cost us a round of 400s in verification) → satisfies channel-name charset and the 140-char `name+resourceId` cap.

## Components

1. **`src/lib/signal/protocol.ts`** (pure, shared client/route): `isSignalTopic` (40-hex), `parseSignalBody` (validates `{topic, msg}`, enforces ≤ 10,240 B wrapped payload — the measured publish cap), `unwrapSignalPayload` (`{m: string}` → string).
2. **`src/pages/api/signal.ts`**: POST `{topic, msg}` → validate via protocol helpers → `auth.elevate(publisher.publish)({name: "signal", resourceId: topic}, {m: msg})`. Structured errors like `/api/rt-publish`. Publishing stays backend-only by platform design; the topic-format guard keeps this route single-purpose.
3. **`src/game/net/wixSignal.ts`**: `makeWixTopicAdapter(deps)` — dependency-injected (subscribe/unsubscribe/post) and unit-tested:
   - `subscribeTopic` resolves only after the subscription's `onSubscribed` fires (so the core's first announce isn't published into the void), with a 15 s ready-timeout; returns a cleanup that unsubscribes.
   - Non-recoverable subscription errors before ready reject (surfaces via `joinRoom`'s `onJoinError`).
   - `publishTopic` POSTs `{topic, msg}`; non-ok responses throw.
   - Default export wires real `@wix/realtime` subscriber + `fetch` into `createTopicStrategy`.
4. **`src/game/net/rtc.ts`**: strategy switch — `https:` origins use the Wix strategy; `http:` (local `wix dev`) keeps Nostr, because the duplexer is TLS-only and unreachable from http pages. Public `createRtcTransport` surface unchanged (Arena/Squid/Overrun untouched).
5. `@trystero-p2p/core` added as an explicit dependency (currently only transitive via `trystero/nostr`).

## Risks / accepted trade-offs

- **Cut-over incompatibility**: Wix-signaled and Nostr-signaled clients can't discover each other; an open old tab won't match a new one. Acceptable for this site.
- **SDP size vs 10 KB cap**: typical encrypted offers are ~3–6 KB; if an exotic network produces a larger one, the route rejects it and that peer fails to connect. Route returns a distinct "payload too large" message so it's diagnosable.
- **Dev over http uses Nostr** — prod signaling path isn't exercised locally; the lab page (`/rt-lab`) remains the prod probe.

## Verification

- Unit: protocol helpers + adapter behavior (ready-await, cleanup, unwrap discipline, error propagation) — vitest, `rtlab`-style project entry.
- Live: deploy, open two browser tabs on an Arena room on `www.teambuildgames.net`, confirm the roster shows both peers, `/api/signal` POSTs appear, a duplexer socket is open, and **no `nostr` relay sockets** exist. Game input flows over the DataChannel as before.
