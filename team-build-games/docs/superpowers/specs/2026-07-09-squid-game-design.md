# Squid — co-op octopus walker · Design

**Date:** 2026-07-09 · **Status:** approved by user (mechanics, physics=verlet, scoring, stages)

## Summary

A second playable game alongside Arena: **Squid** — 1–8 players cooperatively walk an octopus
to a finish line by each controlling one leg at a time. A round is timed; finishing records the
team's time on a persistent per-stage **highscore dashboard shown in the game's waiting room**.

Two stages at launch:

1. **Stage 1 — "Boardwalk":** flat straight 5 m course, arched finish line at 5 m.
2. **Stage 2 — "The Gap":** same course with a **0.5 m hole spanning 3.0–3.5 m**. If the
   octopus head drops into the hole, the round is over (game over, no score).

## Decisions locked (user, 2026-07-09)

- **Locomotion:** QWOP-style physics. The body moves **using planted legs as its base** —
  swinging a planted leg drags the body; a leg swung in mid-air moves only itself.
- **Physics model:** **A — verlet soft-body** (pure fixed-step points + constraints; no
  physics-engine dependency; deterministic). Rejected: kinematic fakery (B), matter.js/planck (C —
  determinism + purity + toolchain risk).
- **Team identity on the dashboard:** the **player-name roster** of the finishing team
  (e.g. "Kyrylo, Dana — 0:42.3"). Persistent (Wix Data), no login required.
- **Player count:** **solo allowed** (1–8). Space cycles through unheld legs.
- **Stage structure:** **stage select in the lobby** (host picks); **per-stage highscore lists**.
  A round = one attempt at the selected stage.

## Architecture

Follows the project spine (see `docs/ROADMAP.md` "Architecture spine"): a pure,
engine/transport-free, deterministic sim core at 20 Hz (`TICK_HZ`); Phaser renderer, Trystero
netcode, and React shell all depend inward on it. `dt` injected; **no clocks or `Math.random()`
in the core**. New game module lands as a sibling of the arena, mirroring the Overrun plan.

### Module map

```
src/game/squid/                     # pure core (unit-tested, vitest)
  types.ts        SquidWorld, LegState, SquidIntent, StageId, RoundResult
  verlet.ts       fixed-substep verlet: points, distance constraints, pins, ground collision
  octopus.ts      rig builder: head cluster + 8 legs × 3 segments in a ring under the head
  stage.ts        data-only stage defs + groundYAt(x, stage) (null inside the hole)
  control.ts      leg-claim reducer: grab-by-click, Space-cycle, auto-release on leave
  sim.ts          stepSquid(world, intentsById, dt): intents → verlet → plant/fail/finish
  match.ts        createSquidWorld(stage, playerIds), round phases, elapsed ticks → timeMs
  render/scene.ts Phaser side-view renderer (impure adapter)
src/components/game/Squid.tsx       # React island phase shell (mirror Arena.tsx)
src/components/game/lobby/…         # squid WarmupRoom variant (stage select + dashboard)
src/pages/games/squid.astro         # page (mirror arena.astro)
src/pages/api/squid-result.ts       # trusted POST — host reports a finished round
src/pages/api/squid-scores.ts       # GET top-10 per stage for the dashboard
src/lib/members/games.ts            # + { id: "squid", … } registry entry
src/pages/index.astro               # + Squid cabinet card
```

### Physics core (verlet)

- **Rig:** head = small point-mass cluster (2–3 points, constrained rigid-ish) with a visual
  radius; **8 legs**, each a chain of 3 verlet points (segments ~0.4 m) hanging from attachment
  points on a ring under the head. World units are **meters** (as in the arena); course length 5 m.
- **Integration:** fixed sub-steps per 20 Hz tick, fixed constraint-iteration count ⇒
  byte-identical results for identical inputs (required for host-authoritative sync + tests).
- **Ground:** collision clamps points to `groundYAt(x)`; inside the hole span there is no
  support, so unsupported points fall through.
- **Planting:** a leg tip touching ground while its lift key is not held becomes a **pin**.
  Pinned tips anchor the constraint network; gravity on the head is resisted only through
  planted legs — lift too many and the body sags (over the hole: falls).
- **Propulsion:** each leg has a shoulder-angle motor target driven by its controller's
  ←/→ input. For a **planted** leg the tip can't move, so satisfying the leg's constraints
  displaces the **body** (the user's "legs as base" requirement — emergent, not scripted).
  For a lifted leg the same motor swings the leg through the air, repositioning it for the
  next plant.
- **Fail:** round fails when the head-cluster center drops below ground level inside the hole
  span (stage 2 only — stage 1 has no fail state).
- **Finish:** head center crosses `x ≥ 5 m` (under the arch) ⇒ round finished;
  `timeMs = elapsedTicks / TICK_HZ × 1000`.

### Controls & leg ownership

- **Grab:** click a leg (renderer maps the pointer to the nearest leg and passes `grabLeg: n`
  in the intent) — succeeds only if unheld. **Space:** release the current leg and claim the
  next unheld leg (stable leg-index order); when holding none, claim the first unheld leg. One player holds at most one leg; enforced in the
  host-side reducer (`control.ts`), never trusted from the wire.
- **Move:** hold **↑** to lift the tip (unplant), **←/→** to swing the shoulder,
  release **↑** to plant where it touches ground.
- **SquidIntent:** `{ swing: -1|0|1, lift: boolean, cycle: boolean (edge), grabLeg?: number }`,
  sanitized by `coerceSquidIntent` at the host trust boundary (same pattern as `coerceIntent`).
- A disconnecting player's leg is auto-released so remaining players can claim it.

### Networking

Reuses the whole net layer unchanged in spirit: Trystero `Transport`, host election
(lowest connected id), `SyncEngine` host-authoritative loop (clients send intents only, host
steps the sim and broadcasts snapshots), lobby roster/`hello` handshake, `?room=` links, kick.
The session/sync layer gets the **light generic parameterization by world type** the roadmap
already earmarked for Overrun (Open decision, Track D) — squid is the first consumer; the
arena path stays behaviorally unchanged (existing tests must stay green). The squid snapshot
carries the full `SquidWorld` (~30 points + leg/control state — small; plain JSON like the
arena's snapshot is fine at this size). Host migration works as in the arena: any peer can
rebuild from the last snapshot.

### Waiting room & UI

- **Squid WarmupRoom variant:** name + color (reuse), party list + kick + copyable join link
  (reuse), **stage selector** (host-only: Stage 1 | Stage 2), **highscore dashboard** (top-10
  fastest per stage, "names — m:ss.t", fetched from `/api/squid-scores`; refreshed on entry and
  after each round), **Start** enabled at ≥1 player. No bots.
- **In-round:** side-view Phaser scene — procedural octopus (no binary assets): head + 8
  segmented legs, each leg **tinted the controlling player's color** (grey = unheld), the local
  player's leg highlighted; ground, the hole (stage 2), arched finish line; live round timer;
  key legend.
- **Result overlay:** finished → time + roster (+ "new record!" if it tops the stage list);
  failed → "The octopus fell! Game over."; both → back-to-room (dashboard re-fetches).
- **Site chrome:** new cabinet card on `index.astro` (status: play, href `/games/squid`);
  `squid` registered in `src/lib/members/games.ts` (unlocks per-game avatars for free via B1b —
  cosmetic-only, out of scope for round 1 rendering).

### Score persistence

- **Collection `GameScores`** (auto-created on first elevated write, same as `suggest-game`):
  `{ _id, gameId: "squid", stageId: "stage1"|"stage2", timeMs: number, playerNames: string,
  playedAt: Date }`.
- **Writer:** only `POST /api/squid-result` (elevated app creds, Astro server route). The
  **host** posts on finish: `{ stageId, timeMs, playerNames }`. Server validates: stage
  allowlisted, `timeMs` within sanity bounds (≥ 3 000 ms, ≤ 30 min), names length-capped.
  Cheating-host risk accepted for casual play (same posture as Track B `match-result`).
- **Reader:** `GET /api/squid-scores?stage=…` → top 10 ascending `timeMs`.
- **Failure handling:** if the POST fails, the result overlay still shows the time with a
  "couldn't save score" note; no retry queue in round 1.

## Error handling summary

- Head in hole ⇒ round failed, overlay, no score write.
- Peer drop mid-round ⇒ their leg auto-releases; round continues (solo-able by design).
- Host drop ⇒ standard host migration from last snapshot; timer continues (elapsed ticks live
  in the world, so migration keeps the clock honest).
- Score POST failure ⇒ non-blocking UI note.
- Dashboard fetch failure ⇒ empty-state message in the waiting room, game still playable.

## Testing

Vitest, colocated, pure-core first (TDD):

- `verlet.test.ts` — integration + constraints + pins + ground; **determinism**: same seedless
  inputs stepped twice ⇒ deep-equal worlds; sag when unsupported.
- `octopus.test.ts` — rig shape invariants (8 legs, segment lengths).
- `stage.test.ts` — `groundYAt` flat / hole-span / finish-x data.
- `control.test.ts` — grab/cycle/release rules; one-leg-per-player; leave releases.
- `sim.test.ts` — planted-leg swing moves the body forward; mid-air swing doesn't; lift-all ⇒
  sag; stage-2 head-in-hole ⇒ failed; crossing 5 m ⇒ finished with correct `timeMs`.
- `protocol`/session tests — `coerceSquidIntent` bounds; LocalHub multi-peer round
  (lobby → start → play → finish) incl. a mid-round peer drop.
- API routes: pure validation helpers unit-tested (bounds, allowlist, name capping).

## Out of scope (round 1)

- More stages, obstacles, or moving hazards; per-member stats (Track B `PlayerStats`);
  member avatars rendered on the octopus; SFX polish beyond basic (reuse `sfx.ts` tones);
  touch controls; spectators; bots.
