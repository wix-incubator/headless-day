# Achievements Engine — Design Spec

**Date:** 2026-07-16
**Project:** Nalu Surf Travel (repo `birdie-breaks`, branch `main`)
**Status:** Approved design, pending implementation plan

## 1. Overview

Add a **secret achievements engine** to the surf-globe game: players discover badges by playing, plus a set of **8 hidden collectible coins** scattered across the globe. Everything is **secret and hidden** — no progress bars, no counters, no hints, no coin HUD. The only reveal is a toast the moment you earn something. An Achievements panel in the side menu is a trophy shelf of what you've *already* unlocked.

### Goals / success criteria
- Playing the game surfaces surprise unlocks (a toast) with zero prior hints.
- Earned badges persist across reloads (localStorage); unearned ones are never revealed (not their name, description, or count).
- Coins are collected by flying near them (same feel as landing-range detection); collecting all 8 unlocks a badge.
- Clean separation: a dedicated, unit-tested engine that doesn't bloat the game store.

### Decisions log
| Decision | Choice |
|---|---|
| Reward type | **Badges only** — no cosmetic/gameplay unlocks |
| Coins | **8 hidden** coins (treasure hunt), fly-near to collect, no counter |
| Achievement set | ~8, small & curated (explorer + secret + funnel) |
| Visibility | **All secret; fully hidden until earned.** No progress shown anywhere |
| Locked appearance | Not shown at all — panel lists only earned badges + a "keep exploring" line |
| Persistence | `localStorage` key `nalu.achievements.v1`, safe-parse (same pattern as `myBooking`) |

## 2. The achievement set (8, all secret)

Each: `id`, `title`, `earnedHint` (a short past-tense "how you earned it", shown only after unlock), `emoji`.

| id | title | emoji | unlock condition |
|---|---|---|---|
| `first-landing` | First Landing | 🛬 | Land at your first break |
| `globetrotter` | Globetrotter | 🌍 | Land at all 12 destinations (across the whole session history) |
| `around-the-world` | Around the World | 🧭 | Fly a full lap — accumulate 360° of longitude travel |
| `first-coin` | First Coin | 🪙 | Collect your first hidden coin |
| `treasure-hunter` | Treasure Hunter | 💰 | Collect all 8 hidden coins |
| `top-of-the-world` | Top of the World | 🏔️ | Reach a pole (latitude hits the ±80° clamp) |
| `booked-it` | Booked It | 🤙 | Book your first trip (game reaches `confirmed`) |
| `just-chillin` | Just Chillin' | 😎 | Hover idle (no steering input) for ~30s while flying |

## 3. Coins

- `src/data/coins.ts`: `COINS: { id: string; lat: number; lng: number }[]` — 8 coins placed in out-of-the-way spots (open ocean between destinations, high latitudes near the poles, the antimeridian) so they feel like a treasure hunt, and NOT within landing range of any of the 12 destinations (so a coin and a "press Space to land" prompt never collide). `COIN_COLLECT_RANGE_DEG` (≈ 7 — smaller than `LANDING_RANGE_DEG` 14, so you fly closer to grab one).
- Scene component `src/scene/Coins.tsx`, rendered inside the Rig (rotates with the globe): each uncollected coin is a small spinning gold coin (a thin cylinder / short torus, sun-yellow `#FFD166` with an ink rim), floating just above the surface, gently bobbing + spinning. Collected coins are not rendered. Reduced-motion: no spin/bob.
- Collection: a per-frame proximity check (reuse `angularDistanceDeg` from `flight.ts`) against the live flight position; within range and not already collected → collect it. On collect: a brief sparkle/pop FX at the coin (reuse the existing `BurstFX` if practical), then it disappears. No counter, no HUD.

## 4. Architecture

### `useAchievements` store (`src/game/achievements.ts`)
A dedicated zustand store, separate from `useGame`, persisted to `localStorage` `nalu.achievements.v1`.

Persisted state:
- `unlocked: string[]` — earned achievement ids (in unlock order).
- `coins: string[]` — collected coin ids.
- `visitedSpots: string[]` — destination ids ever landed at.
- `lngTravelledDeg: number` — cumulative absolute longitude travelled (for Around the World).
- `polesReached: boolean` — sticky, once true.

Transient (not persisted):
- `idleMs: number` — resets on any steering input.
- `toastQueue: string[]` — achievement ids to announce.

Actions (recorders — called by the sync layer / Coins component):
- `recordLanding(destId)` → add to `visitedSpots`, then `evaluate()`.
- `collectCoin(coinId)` → add to `coins`, `evaluate()`. Returns whether it was newly collected.
- `recordFlight({ dLngAbs, atPole })` → accumulate `lngTravelledDeg`, set `polesReached`, `evaluate()`. Called from the flight tick.
- `recordIdle(dtMs, moving)` → advance/reset `idleMs`, `evaluate()`.
- `recordBooked()` → `evaluate()`.
- `evaluate()` → run every not-yet-unlocked achievement's pure rule against current state; newly-true ones get appended to `unlocked` + `toastQueue`; persist.
- `dismissToast()` / `reset()` (test + debug).

### Rules (`src/data/achievements.ts`)
`ACHIEVEMENTS: Achievement[]` where each has `{ id, title, earnedHint, emoji, isUnlocked(state): boolean }` — `isUnlocked` is a **pure function** of the persisted state (e.g. `globetrotter: state.visitedSpots covers all DESTINATIONS ids`; `treasure-hunter: state.coins.length === COINS.length`; `around-the-world: state.lngTravelledDeg >= 360`; `top-of-the-world: state.polesReached`; `just-chillin: state.idleMs >= 30000`). Pure + unit-testable, no store/UI access.

### Sync layer (`src/hooks/useAchievementsSync.ts`)
A hook mounted once (in `App` or `GlobeScene`) that wires game → engine WITHOUT touching the game store's internals:
- Subscribe to `useGame`: on transition into `landed` with an `activeDestId` → `recordLanding`; into `confirmed` → `recordBooked`.
- A frame hook (or reuse the Rig's frame) reads `useGame.getState().flight` each tick → compute `dLngAbs` since last frame + `atPole` (|lat| ≥ 80) → `recordFlight`; and idle (input zero) → `recordIdle`.
- Coin collection lives in `Coins.tsx` (it already runs per-frame with flight access) → `collectCoin`.

Keeping the game store (`useGame`) untouched preserves the existing 156 tests and separation of concerns.

## 5. Surfacing

- **Unlock toast** (`src/ui/AchievementToast.tsx`): reads `toastQueue`; shows one badge at a time — emoji + "Achievement unlocked · {title}" in Nalu's voice — auto-dismiss ~4s, then next in queue. Positioned so it doesn't fight the bottom controls chip or the info card (e.g. top-center). Reduced-motion: no slide, just fade/instant.
- **Achievements panel** — a new section in the existing `SideNav` drawer, sentence-case heading "Achievements": lists **only earned** badges (emoji + title + `earnedHint`). If none earned: a friendly empty line. Always a closing line "Keep exploring — there are secrets to find." (reveals neither which nor how many remain).
- **No** coin counter, **no** progress bars, **no** locked/"???" slots anywhere.

## 6. Craft / edge cases
- `localStorage` safe-parse + shape-validate on load; corrupt/missing → empty state (like `myBooking`). Writes wrapped in try/catch (private mode safe).
- Idempotent: re-collecting a coin or re-landing a visited spot never re-fires a toast (unlocked set + coins set dedupe).
- Reduced-motion (`prefers-reduced-motion`) degrades coin spin/bob/sparkle and toast animation.
- Copy is sentence-case; no ALL-CAPS (studio-expert checklist). Titles have no trailing periods; `earnedHint` is body copy.
- Coins never overlap the 12 destinations' landing ranges.

## 7. Testing
- **Unit:** every achievement `isUnlocked` rule (true/false cases); coin proximity collection (in-range collects, out-of-range doesn't, already-collected is a no-op); `useAchievements` evaluate → unlock + toast-queue + dedupe; localStorage round-trip + safe-parse of garbage.
- **Component (RTL):** panel renders only earned badges + the explore line (and nothing about locked ones); toast shows and advances the queue.
- **Manual/headless:** collect a coin (sparkle, disappears), land first spot → toast, open panel → earned list; verify no counters/progress anywhere.

## 8. Out of scope (v1)
Cosmetic/gameplay unlocks; leaderboards; share-a-badge; sound; achievement notifications outside the session; server persistence (localStorage only, no member login).
