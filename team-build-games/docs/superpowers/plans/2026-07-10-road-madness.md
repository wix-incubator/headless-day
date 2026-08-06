# Road Madness — Implementation Plan

**Goal:** ship a 1–8 player Phaser 4 arcade-driving game with four modes—Race, Last Madman
Standing, Carnage, and Bomb Tag—starting with a playable local demolition-derby vertical slice.

**Product spec:** `docs/superpowers/specs/2026-07-10-road-madness-design.md`

**Architecture:** pure deterministic `src/game/road-madness/` simulation; a Phaser scene consumes a
small driver contract; React owns setup/HUD/results; a road-specific host-authoritative session later
reuses the shared Transport/room/election utilities without importing another game's domain types.

**Dependencies:** existing Astro, React, Phaser 4, Trystero, vitest. Add no package dependency.

## Global constraints

- Simulation coordinates are meters, `+x` right, `+y` down; render code owns meter/pixel projection.
- The sim reads only `(world, intents, dt)` and contains no Phaser, DOM, network, time, or random calls.
- Fixed 30 Hz canonical tick. Sort player/entity ids anywhere iteration order affects results.
- Network clients eventually send only input. The host owns positions, impacts, damage, mode state,
  AI, destruction, score, and timers.
- Game-specific wire tags must be namespaced (`rHello`, `rStart`, `rInput`, `rSnap`, etc.).
- Race's two perspectives are render projections of one flat sim—never two physics implementations.
- Procedural placeholder visuals are preferred until handling and readability survive playtest.
- Preserve unrelated user work already present in the working tree.

## Phase 1 — playable Last Madman vertical slice (this change)

### Task 1: Pure domain and input boundary

- [x] Add `types.ts` with modes, vehicle classes, intent, car/world/event plain-data types.
- [x] Add `constants.ts` and `vehicles.ts` with fixed tick, arena, body, handling, health, and mass data.
- [x] Add `intent.ts`: raw held keys → normalized throttle/steer/handbrake; sanitize unknown wire input.
- [x] Unit-test input normalization and hostile/malformed input.

### Task 2: Collision and vehicle simulation

- [x] Add `collision.ts`: bumper classification and pure speed/angle/mass damage calculation.
- [x] Add `match.ts`: stable spawns and world factory.
- [x] Add `bots.ts`: deterministic nearest-target chase expressed as ordinary drive intents.
- [x] Add `sim.ts`: handling, walls, pair separation/impulse, impact cooldown, damage, wreck, winner.
- [x] Unit-test bumper zones, damage scaling, side/no-speed hits, movement, damage, and match end.

### Task 3: Phaser presentation and React shell

- [x] Add a solo driver using a fixed-step accumulator and the same driver contract online play will use.
- [x] Add keyboard adapter and angled top-down Phaser scene with procedural arena/car textures.
- [x] Render health bars, wreck state, impact feedback, car labels, HUD, controls, and result overlay.
- [x] Let the player choose Derby or Monster and start/rematch against three deterministic bots.
- [x] Checkpoint local matches in session storage so Vite HMR/browser refresh restores the active
  simulation instead of remounting at the garage; validate and expire checkpoints safely.

### Task 4: Site and verification

- [x] Add `/games/road-madness`, controls/copy, like button, and game switcher.
- [x] Register the playable alpha cabinet without claiming that multiplayer is already complete.
- [x] Add a Road Madness vitest project/script.
- [x] Run Road Madness tests and the production build; fix owned regressions.
- [x] Browser-smoke garage → Start → countdown → active Phaser sim; send steering/throttle input and
  verify canvas, HUD, advancing world tick, moving local car, and zero runtime exceptions.
- [ ] Re-run the whole-repo test/typecheck gates after the unrelated Arena Survival worktree errors
  are resolved (`arena/survival/step.test.ts` assertion and `step.ts` EnemyState typing).
- [ ] Human feel playtest both vehicles and record the first handling/damage/bot tuning follow-ups.

## Phase 2 — finish competitive derby locally

### Task 5: Handling and juice

- [x] Add canonical nitro meter/recharge, bot usage, HUD feedback, and a host-controlled enable flag.
- [x] Add five-second wreck linger/removal, 75/50/25% damage stages, smoke/fire, impact sparks,
  skid/nitro trails, camera shake, and synthesized impact/boost/wreck SFX.
- [ ] Add reduced-shake/reduced-flash options and player number/icon markers.
- [ ] Tune vehicle values from timed playtests; keep numbers in `vehicles.ts` only.

### Task 6: Full Last Madman lifecycle

- [x] Add best-of 1/3/5 rounds, round standings, match results, and simultaneous-wreck draw rules.
- [x] Add 75-second sudden death, contracting safe bounds, progressive impact damage, and a
  120-second health-then-damage timeout tie-break.
- [x] Add Rookie/Mad/Maniac bot profiles while keeping bots deterministic and input-driven.
- [x] Test round transitions, match thresholds, timeout, shrink, escalating damage, exact ties,
  simultaneous wrecks, bot profiles, and wreck-expiry cases.
- [ ] Add disconnect lifecycle coverage with the multiplayer session in Task 8.

## Phase 3 — multiplayer foundation

### Task 7: Road protocol and codec

- [x] Define/coerce namespaced presence, start, input, snapshot, delta, and mode-event messages.
- [x] Quantize car position/velocity/heading/health/timers; keyframe + sequence-safe delta snapshots.
- [x] Add byte-budget tests for eight cars plus the largest transient event set.

### Task 8: Host-authoritative road sync

- [ ] Add adapter/session over shared `Transport`, election, room-link, and ICE utilities.
- [ ] Run host sim at 30 Hz, collect latest normalized input, snapshot at 10–15 Hz.
- [ ] Interpolate remote cars; add conservative local prediction/reconciliation after baseline playtest.
- [ ] Resume from the last canonical snapshot on host migration.
- [ ] LocalHub tests: 8-peer convergence, client tamper, host leave, packet gap, late spectator.

### Task 9: Warm-up room

- [ ] Nickname/color/vehicle selection; party list; invite copy; kick/make-host; bot count.
- [ ] Host mode/map/settings controls with mode-specific minimum-player and allowed-class validation.
- [ ] Broadcast immutable start config and synchronized countdown; support rematch/back-to-room.
- [ ] Show connection/relay failure clearly without freezing the rest of the page.

## Phase 4 — Race

### Task 10: Race core

- [ ] Track format: boundary/collision shapes, ordered checkpoints, start grid, racing line, boost pads.
- [ ] Lap validation, 1/3/5 setting, placement/progress, finish order, grace timer, DNF/disconnect.
- [ ] Sport tuning and non-damaging contact; deterministic racing-line bot controller.

### Task 11: Race rendering

- [ ] Implement pseudo-3D rear chase projection with road edges, barriers, props, opponents, speed cues.
- [ ] Implement cabin/hood projection and instant C-key switch over the same world.
- [ ] Add minimap, position/lap/checkpoint HUD, wrong-way warning, finish sequence.
- [ ] Build and validate the first loop track; multiplayer/camera browser playtest.

## Phase 5 — Carnage

### Task 12: City/destruction core

- [ ] City format with non-destructible building shell and destructible prop definitions/states.
- [ ] Spatial grid, active-set/caps, car-vs-prop impulse, destruction scoring, combo/diminishing returns.
- [ ] Two-minute timer, wreck/three-second respawn, team and per-player results.

### Task 13: Traffic and zombies

- [ ] Deterministic lane graph, junction reservation, traffic car controller, avoidance/recovery.
- [ ] Monster-zombie chase/knockback/slime state with no human pedestrian representation.
- [ ] Snapshot codec/deltas for active traffic/zombies/props; maximum-load performance and byte tests.
- [ ] Build the four-block map and tune score distribution so moving around beats farming one corner.

## Phase 6 — Bomb Tag

### Task 14: Bomb rules and presentation

- [ ] Deterministic initial/new carrier, 25-second tick fuse, bumper-hit transfer, one-second return immunity.
- [ ] Explosion elimination, reset, last-alive winner, carrier disconnect, two-player arena contraction.
- [ ] Carrier/fuse HUD, off-screen direction, escalating beep/music, glow/trail/explosion effects.
- [ ] Equalized Street cars and no ordinary ram damage; multiplayer transfer-latency playtest.

## Phase 7 — harden and ship

### Task 15: Quality and content

- [ ] Gamepad, settings persistence, accessibility pass, art/audio replacement, loading/perf budgets.
- [ ] More arenas/tracks/cities only after every mode passes its readability and timing targets.
- [ ] Chrome/Firefox/Safari, real-device, TURN, host-migration, background-tab, reconnect tests.
- [ ] Production Wix build/deploy, monitoring, residual malicious-host risk, docs/roadmap closeout.

## Verification commands

```sh
npm run test:road
npm test
npm run astro -- check
npm run build
```

Manual first-slice check: open `/games/road-madness`, choose both car classes, focus the canvas,
accelerate/reverse/steer/handbrake, hit cars from front/rear/side at different speeds, get wrecked,
win as last car, rematch, resize the page, and confirm no console errors.
