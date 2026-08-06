# Realtime Lab — measuring Wix Realtime as a game comms channel

**Date:** 2026-07-16
**Status:** Approved (design presented in-session; user approved with two changes: payload probe capped at 100 KB; added dual-room ramp scenario)

## Purpose

Empirically measure whether Wix Realtime (`@wix/realtime`) can replace:

1. **Waiting-room communications** — lobby presence/chat/roster (~0.5–2 msg/s, latency tolerance ~1s).
2. **The WebRTC+TURN game-data path at proper tick** — host snapshots at `TICK_HZ = 20` with ~2 KB payloads (latency tolerance ~100 ms).

Wix Realtime only allows **backend publish**, so every message travels: client → `POST /api/rt-publish` → `elevate(publisher.publish)` → Wix fan-out → subscribers. The lab measures that whole path on the deployed production site, plus where its ceilings are.

## Non-goals

- Not building the actual signaling/lobby migration — measurement only.
- No reconnect/offline chaos testing in v1 (noted as follow-up).
- No binary protocol work; JSON payloads like the real wire protocol.

## Components

### `src/pages/api/rt-publish.ts`
`POST {channel, resourceId?, payload}` → `auth.elevate(publisher.publish)` (`@wix/essentials` pattern, same as `src/lib/wix/wixData.ts`). Returns `{ok: true, publishMs, serverTs}`. Errors return structured `{ok: false, status, code, message}` — throttle (429) distinguishable from payload rejection and auth failure. **Guard:** channel name must start with `rtlab-` (public endpoint on a live site; the prefix stops it being a general publish proxy).

### `src/pages/rt-lab.astro` + `src/components/rtlab/RtLab.tsx`
Unlisted page (no nav links) with a React client island. Configured via query params (`role=pub|sub|both`, `room`, `stages`, `dur`, `size`, `hz`…). The island:

- Subscribes via `subscriber.subscribe()` from `@wix/realtime` (auto-bound browser visitor client provided by `@wix/astro`'s injected browser runtime).
- As publisher, pumps seq-numbered, stage-tagged, timestamp-stamped, padded JSON payloads through the route (fire-and-forget `fetch`, HTTP/2 multiplexed).
- Records per-message metrics; renders a live table + final results as JSON in a `<pre id="results">` for Playwright scraping.

All test tabs run on one machine → shared clock → `recvTs − sentTs` is valid end-to-end latency.

### `src/lib/rtlab/stats.ts`, `src/lib/rtlab/runner.ts`
Pure, vitest-covered helpers: percentiles (p50/p95/p99), seq-gap & reorder detection, stage plan generation/classification.

## Scenarios

| # | Scenario | Setup | Load | Measures |
|---|----------|-------|------|----------|
| 1 | Lobby sim | 2 tabs, both pub+sub, one resource | presence /2s + chat /5s, 60s | delivery rate (expect 100%), e2e p50/p95, subscribe time |
| 2 | Tick ramp | 1 pub + 2 subs, one resource | 2 KB, stages 5→10→20→40→80 msg/s × 30s | per-stage e2e p50/p95/p99, drop %, reorders, POST RTT vs `publishMs`, first 429 (quota ceiling) |
| 3 | Dual-room ramp | 2 pubs (roomA/roomB), 2 subs per pub (6 tabs) | 2 KB, stages 5→10→20→40 msg/s **per publisher** × 30s (aggregate 10→80) | same as #2 per room + cross-room interference, shared-quota behavior |
| 4 | Payload probe | 1 pub + 1 sub | 1 msg/s; sizes 1 → 10 → 50 → **100 KB (max)** | max accepted payload, latency vs size |

Stages abort early if error rate > 50%. All events land in an in-page log so partial runs still yield data.

## Execution flow

1. **Checkpoint zero** on `wix dev`: does headless subscribe connect, does elevated publish succeed at all? (Docs carry a TODO on headless publisher relevance — if this fails, that is finding #1; stop and reassess.)
2. Deploy: `wix build` then `wix release`.
3. Drive deployed site with Playwright tabs per scenario; scrape results JSON.
4. Synthesize findings report: verdict per use case, ceilings, latency tables. Save durable conclusions to memory.

## Error handling

Route never throws raw; runner counts errors by class (throttle / payload / auth / network) and continues. Subscriber logs subscription errors with `errorCode`/`recoverable`.

## Risks / accepted trade-offs

- Stage 5 of ramps may briefly 429 other backend routes on the live site — **explicitly accepted by user** ("full ramp to ceiling").
- Realtime limits are officially undocumented (docs TODOs) — findings are empirical, may change.
- `rt-lab` page stays deployed until user decides keep/delete.

## Success criteria

A findings table answering: viable for waiting room? viable at 20 Hz per room? max sustainable msg/s (single + dual room), max payload, latency percentiles at each stage, and the observed throttling ceiling with its error semantics.
