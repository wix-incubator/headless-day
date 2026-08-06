# TeamBuildGames — Product Roadmap

A living doc to track progress and high-level implementation details for the game pack,
anchored on the **Arena** P2P realtime game. Tick the `[ ]` boxes as work lands.

**Status:** Arena 2D single-player prototype shipped & deployed (Phaser 4 React island in Astro,
on Wix static hosting). Next: Arena → 8-player P2P last-man-standing 2.5D arena, then Wix
persistence, then the turn-based game #2.

## Decisions locked

- **Engine:** keep **Phaser 4** (already installed). "2.5D" is a *look* — faked with per-sprite
  y-sort, a tilted/scaled field, soft shadows, and a death "jump" tween — **not** a 3D engine.
- **Networking:** **Trystero** (zero-backend signaling: Nostr default + BitTorrent fallback) in a
  **host-authoritative star on a WebRTC mesh**; clients send inputs only, the host runs the sim.
- **Audio:** raw **Web Audio** oscillator SFX (no binary assets).
- **Scope:** Arena incl. **versus + Survival** modes (Track A) + Wix backend (Track B) + turn-based #2 deferred (Track C) + **Overrun** co-op horde shooter (Track D) + **sprite-sheet art pipeline** (Track E).
- **Musa art:** use distinct full-color fighter sprites with separately animated weapon images. Player-color tinting has been removed.
- **Horde determinism/netcode (locked 2026-07-08):** enemies/projectiles/pickups/waves are **host-owned**, seeded from `start`, drawn via a **coordinate-hash RNG** `hash(seed,tick,entityId,salt)` (not a shared cursor); snapshots carry **all** host state and are **capped + quantized/delta-encoded @10 Hz** with client interpolation. No `Math.random`/clock in any sim core.

---

## Architecture spine (applies to all tracks)

A pure, **engine/transport-free sim CORE** that depends on nothing; the Phaser renderer, the
Trystero netcode, the Web Audio layer, and the React HUD all depend **inward** on the core, never
vice-versa. **Inject `dt`/`now`/RNG** into the core — never read clocks or `Math.random()` inside it
— so ticks are deterministic, replayable, and unit-testable. Netcode hides behind a `Transport`
interface so the whole sim runs under a `LocalTransport` mock in tests and `RtcTransport` (Trystero)
in production. This preserves the prototype's proven pattern: pure `src/game/arena/logic.ts` +
colocated `logic.test.ts`, with the engine only *consuming* the sim.

### Recommended stack

| Concern | Choice | Why |
|---|---|---|
| Engine/renderer | **Phaser 4** + fake-2.5D (y-sort by world-Y, tilted field, ellipse shadows) | Already installed; flat game needs no 3D; bundles input/tween/timer/audio |
| P2P + signaling | **Trystero** (Nostr + BitTorrent, `redundancy` on), behind a `Transport` iface | Only zero-backend option that works from static Wix hosting; binary channels, stable peer ids |
| Topology/authority | **Host-authoritative star on mesh**; host = lowest **alive** peer id; inputs-only @20 Hz | Single source of truth (anti-cheat for client tampering) + deterministic migration |
| NAT traversal | **STUN + a free TURN** (Metered Open Relay → Cloudflare Realtime TURN at scale) | ~10–20% behind strict NAT/CGNAT can't connect without TURN |
| Audio | **Web Audio** oscillators: one shared `AudioContext` + `playTone()` + note-sequence | Zero assets/bundle; chiptune = oscillators; resume on first gesture |
| Persistence (Track B) | **Astro server API routes** + `@wix/data` with elevated app creds | `output:"server"` already runs trusted req/res endpoints on Wix infra (see `api/checkout.ts`) |
| Test/build | zero-config **vitest** (`vitest run`); Astro 5.8 + `@wix/astro`; **vite pinned 6.4.3** | Pure core unit-tested; new deps must build under the pinned toolchain |

---

## Track A — Arena (P2P realtime arena)

Each phase is a testable, demoable increment; the riskiest unknown (P2P + authority + migration)
is tackled **before** lobby polish and juice.

### P0 — Pure-core foundation · `dependsOn: none`
Goal: lift the sim into a deterministic, engine/transport-free core encoding facing, dash, combat,
health, death, and win — fully unit-tested before any renderer/network.

- New pure modules under `src/game/arena/`: `types.ts` (PlayerState, Direction, MatchState, Intent…),
  `intent.ts` (facing = last-moved dir; attack dir locked at initiation), `dash.ts` (4× over 2 m,
  3 s cooldown, `dashCooldownFraction→0..1`), `combat.ts` (1 m reach in facing, −1 health),
  `sim.ts` (`stepWorld(world, intentsById, dt)`), `match.ts` + `countdown.ts`.
- Generalize `isNearNPC → withinRange`; centralize `Vec2`/`InputState` in `types.ts`; extend
  `constants.ts` (`SWORD_REACH_M`, `DASH_*`, `MAX_PLAYERS=8`, `START_HEALTH=3`, `TICK_HZ=20`).

Tracking:
- [x] `types.ts` created; `Vec2`/`InputState` centralized and re-exported from `logic.ts`
- [x] `logic.ts`: `isNearNPC` → `withinRange` (+ `directionVector`); existing tests still green
- [x] `constants.ts` extended (combat/dash/health/tick)
- [x] `intent.ts` + tests (facing-from-last-move, attack-dir lock, edge-triggered)
- [x] `dash.ts` + tests (4× over 2 m, 3 s cooldown, `dashCooldownFraction` 0..1)
- [x] `combat.ts` + tests (1 m reach, facing cone, −1 health, multi-hit)
- [x] `sim.ts` `stepWorld` + tests (movement + dash + combat + death + win); dash-burst & wall bugs fixed
- [x] `match.ts` + `countdown.ts` + tests
- [x] `vitest run` green (61 tests); **no engine/DOM/net imports, no internal clock/RNG** in the core
- [x] adversarial review pass: 2 dash bugs fixed (TDD), 6 coverage gaps closed; #5 (cooldown 3 s + 1 tick) accepted as a benign quantization artifact

### P1 — Single-player render rewrite (Phaser 4, 2.5D look, HUD, audio) · `dependsOn: P0`
Goal: replace the NPC prototype scene with a sim-driven renderer that plays the full mechanics solo.

- `input/keyboard.ts` (WASD/arrows + Shift + Space → InputState); `render/` Phaser scene (tilted
  field, **tinted musa sprites**, ellipse shadows, per-frame `setDepth(worldY)`, facing, ~1 m sword
  on attack, dash FX, death "jump" tween) — owns all px math.
- React HUD overlays: `Hearts.tsx`, `DashIndicator.tsx` (grey→clockwise-fill from `dashCooldownFraction`),
  `Countdown.tsx`; `audio/sfx.ts` (shared `AudioContext`, resume on first gesture, 5 SFX).
- Rework `Arena.tsx` into a phase-driven shell (lobby|countdown|playing|spectate|ended), keeping the
  mount/teardown + dev handle. Delete shopkeeper/ambient/Press-E paths.

Tracking:
- [x] `input/keyboard.ts` input adapter (WASD/arrows + Shift + Space)
- [x] `render/scene.ts` Phaser scene: illustrated terrain/fighters + shadows + y-sort + facing
- [x] ~1 m sword sprite renders on attack in locked facing direction
- [x] dash visual + death "jump and disappear" tween
- [x] fighter and weapon PNG assets loaded separately so combat animations remain independent
- [x] `Hearts` / `DashIndicator` / `Countdown` HUD overlays bound to state
- [x] `audio/sfx.ts`: shared `AudioContext` + `playTone`/noise + tik/go/dash/attack/hit/gameover/win; resume-on-first-gesture
- [x] `Arena.tsx` phase-driven shell (menu → countdown → playing → ended); **solo slice playable** (move/face/dash/attack/hit/die/win)
- [x] `bot.ts` deterministic enemy AI (added) so the solo slice is fightable; unit-tested
- [x] `arena.astro` + `Arena.tsx` copy updated (dropped shopkeeper/prototype blurb); old `ArenaScene.ts` removed
- [x] verified live in-browser (keyboard→sim→render: move ~4 m/s, facing, dash cooldown, locked-direction attack, death/win), 0 console errors; build green; 66 tests

### P2 — P2P transport + protocol + host-authoritative sync (**riskiest**) · `dependsOn: P1`
Goal: 2+ real peers see each other move/dash/attack/die from one source of truth.

- `net/transport.ts` (+ `LocalTransport` mock), `net/protocol.ts` (versioned, binary-packed:
  hello/roster/kick/start/input/snapshot/event/ping/leave — unit-tested), `net/rtc.ts` (Trystero
  joinRoom, STUN+**TURN**, redundancy + BitTorrent fallback), `net/sync.ts` (host 20 Hz authoritative
  loop; clients input-only @20 Hz; **client-side prediction** for own avatar + **~100 ms interpolation**
  for others; ping/pong clock sync).
- Deterministic **host migration** (host = lowest **alive** id; recompute on `onPeerLeave`, seed from
  last snapshot; dead spectators excluded). Host-side input validation (speed cap, dash cooldown,
  reach, rate-limit).

Tracking:
- [x] `net/transport.ts` interface + in-memory `LocalHub` mock; sim runs multi-"peer" in tests
- [x] `net/protocol.ts` message types + JSON serialize/deserialize unit-tested (round-trip) + `coerceIntent`
- [x] `net/rtc.ts`: Trystero room join (Nostr default; BitTorrent via import path), STUN+TURN via `iceServers`, relay redundancy — typechecks + builds
- [x] `net/sync.ts`: host-authoritative loop, clients send input-only; tick-driven (caller sets the 20 Hz cadence)
- [x] host election (lowest alive id) + deterministic migration on host leave — unit-tested
- [x] dead/spectating players excluded from host election — unit-tested
- [x] host-side input validation: inputs-only design (no positions/health on the wire) + `coerceIntent` + one-input-per-tick overwrite
- [ ] **client-side prediction + ~100 ms interpolation** — deferred to scene integration (P3), to be felt/tuned
- [ ] **wire `SyncEngine` into the Arena scene** (replace local bot loop) — needs the lobby (P4) to gather peers; engine is ready behind `Transport`
- [ ] **2+ real browsers synced; Chrome/Firefox/Safari** — pending MANUAL cross-browser (headless harness can't drive live Nostr/TURN signaling)

### P3 — Networked combat, death, spectate, last-man-standing · `dependsOn: P2`
- Authoritative hit resolution (host owns health); `event` msgs (hit|death|gameover|win) drive
  heart-hollow, death jump + game-over sting, spectate transition, win overlay.
- Spectate (dead player watches, sends no input, can't host); rejoin-by-roomId; reconnect policy.

Tracking:
- [x] host-authoritative hit resolution; health decrements only host-side (host runs `stepWorld`)
- [x] hit/death/gameover/win rendered consistently — each peer derives them by diffing host snapshots (no separate event msgs needed)
- [x] death "jump and disappear" + game-over sting fire on elimination
- [x] spectate mode: dead player keeps rendering snapshots, sends no effective input, can't host
- [x] last-man-standing win detection + result overlay (win/out/draw)
- [x] peer-drop → host marks that player dead so the match resolves; host migration excludes dead/disconnected (unit-tested)
- [x] rejoin-by-roomId: re-opening the link rejoins the room (mid-match → spectator via host's authoritative world)
- [ ] **deeper reconnect edge cases** (host-eliminated-mid-tick desync window, ICE restart) — needs live multi-peer; P5 hardening

### P4 — Warm-up room, party list, join link, synchronized countdown · `dependsOn: P3`
- `lobby.ts` (pure room model: id, players[name,fighter,isHost], max 8, add/remove/kick, host
  election — unit-tested), `roomLink.ts` (`?room=<id>` build/parse — unit-tested),
  `lobby/WarmupRoom.tsx` (name input, fighter picker, right-side party list + per-player kick,
  copyable join link, host **Start**).
- hello/roster handshake; authoritative roster re-broadcast on join/leave/kick; opening a link joins
  the party; Start → synchronized 3 s **tik-tok** countdown → match on all peers.

Tracking:
- [x] `lobby.ts` reducers (room, players, max-8, add/remove/kick, host election) unit-tested
- [x] `roomLink.ts` build/parse/mint unit-tested
- [x] `WarmupRoom.tsx`: name input + fighter picker + party list + kick + copy link + Start
- [x] presence handshake: `hello` on join + reply-on-first-sight so rosters converge (any join order) — unit-tested
- [x] opening a join link joins the party (`?room=`); max-8 enforced in `lobby.upsert`
- [x] kick removes a player (host) and they leave the room
- [x] host Start → `start` payload (ordered players + bots) → synchronized 3 s tik-tok countdown → match on all peers (unit-tested via LocalHub)
- [x] bonus: `Practice vs bots` (SoloDriver) for single-browser play; host can add bots to a real match

### P5 — Juice, hardening, cross-browser, ship · `dependsOn: P4`
- Final juice (dash sweep, heart fill, sword arc, interpolation tuning); resilience (TURN-path
  verification, relay-flakiness UI, host-migration stress, reconnection); cross-browser; bundle/build
  check under vite 6.4.3 + `@wix/astro`; document residual malicious-host risk; update site copy.

Tracking:
- [ ] dash sweep / heart fill / sword / death juice finalized
- [ ] TURN verified for a symmetric-NAT/CGNAT client; player can join
- [ ] relay-flakiness handling (redundancy + fallback + "connecting…" UI) verified
- [ ] host-migration stress + reconnection edge cases pass
- [ ] verified on Chrome, Firefox, Safari (gameplay + audio autoplay)
- [ ] builds + deploys on Wix static (vite 6.4.3 + Astro 5.8 + Wix adapter)
- [ ] residual malicious-host risk documented
- [ ] `index.astro` / `arena.astro` copy updated to "live multiplayer"

---

## Track A — post-ship expansion (feel · customization · modes · arenas · mutators)

Net-new content on top of the shipped arena. Ordered by risk/dependency; all assume a working
multiplayer base (P3+/P4). **Invariant carried from P0:** the sim core stays engine/transport-free
and **deterministic** — any new randomness (maze layout, powerup spawns) is produced on the **host**
from a **seed broadcast in `start`** and injected into the core, never read from a clock/`Math.random()`
inside it. Player customization (shape, avatar image) is **cosmetic only** and must **not** enter the
sim core. (Each feature has a stable id `F1…F7` for cross-referencing.)

**Canonical Arena modes:**
- **Free For All** — open-field last-player-standing; live.
- **Labyrinth** — last-player-standing in a generated maze; planned.
- **Coop Survival** — allied players against escalating creature waves; in development.
- **Team Versus** — waiting-room team selection and team combat; future.

### P6 — Lobby feel & death juice · `dependsOn: P4 (lobby), P1 (death tween)`
Goal: cheap, high-value feel wins — audible lobby presence and a readable death moment.

- **F1 — connect sound:** add a `"join"` `SfxName` to `audio/sfx.ts` (short rising two-tone via the
  existing `tone()`), fired from `Arena.tsx` when a **new remote** peer appears. The host already
  detects newcomers in `session.ts onMessage` `"hello"` (`isNew`, session.ts:177) — surface it as a new
  `ArenaEvent` (`{ type: "join" }` in `render/contract.ts`) or diff roster length on `onChange`. Don't
  play for your own join or bots. `resume()` unlocks audio on the Start click today; a join sound heard
  *in the lobby* needs an earlier unlock (first lobby gesture).
- **F2 — death animation:** the death "jump and disappear" tween already exists (P1/P3) — this *enhances*
  it, not net-new. Add a pop/spin on death then a **phase-out** (alpha fade + scale-down), driven by the
  `status: "alive"→"dead"` transition each peer already derives from snapshots. Render-only, lives entirely
  in `render/scene.ts`; reuse the existing `{ type: "death" }` event + gameover sting.

Tracking:
- [x] `joinedIds(prev,next,self)` pure helper in `lobby.ts` (excludes self; bots aren't in the lobby roster) — unit-tested (4 tests)
- [x] `"join"` SFX in `sfx.ts` (two-note rise); `Arena.tsx` roster-diff effect plays it once per new remote
- [x] lobby audio-unlock: first `pointerdown`/`keydown` calls `sfx.resume()` so the chime is audible pre-match
- [x] death tween upgraded (recoil pop → spin-up + alpha phase-out) in `scene.ts:playDeath`, render-only & per-peer
- [ ] **live playtest** the chime + death animation in-browser (audio/visual — not covered by unit tests)
- known nuance (deferred): a newcomer hears one chime per existing peer as the roster converges; refine to suppress the initial-population burst if it feels noisy

### P7 — Player customization: shapes & uploaded avatars · `dependsOn: P4`
Goal: let a player select a fighter and optionally overlay an uploaded face photo, visible to every peer.
**Cosmetic only — never enters the sim core** (determinism preserved).

- **F3 — shape selection:** extend `PlayerMeta` (`render/contract.ts`) with `shape` and carry it on the
  wire — add `shape` to `hello` + `StartPlayer`/`RosterEntry` in `protocol.ts`, thread through
  `session.ts` (`profile`/`meta`/roster) and `lobby.ts`. The legacy shape ids select one of four fighter
  illustrations in `WarmupRoom.tsx`; `render/scene.ts` loads the corresponding body asset.
- **F4 — custom image avatar → MOVED to Track B (2026-07-08).** Uploaded member photos are now part of the
  **members area**: Wix Members auth (**B0**) + avatar upload/store + render (**B1**). Shape (F3) remains the
  anonymous/free cosmetic; the member photo layers on top for signed-in players. See Track B.

Tracking:
- [x] new pure `arena/cosmetic.ts` (`Shape`, `SHAPES`, `DEFAULT_SHAPE`, `coerceShape` wire-boundary) — unit-tested; leaf module, no inward-dep violation
- [x] `PlayerMeta` + protocol (`hello`/`start`/`roster`) carry `shape`; `lobby.ts`/`session.ts`/`soloDriver.ts` thread it (bots default; `coerceShape` on receive)
- [x] shape picker in `WarmupRoom` (4 shapes: circle/square/triangle/diamond) + per-shape procedural body textures in `render/scene.ts`
- [ ] **live playtest** shapes render + sync across peers
- **F4 (avatars) → moved to Track B (B0 auth + B1 avatar upload)** and expanded into the members area (2026-07-08). Shapes (F3) stay here as the anonymous/free cosmetic; the uploaded member photo layers on top per Track B.

### P8 — Rounds & podium scoreboard · `dependsOn: P3`
Goal: best-of-N matches with a between-rounds reset and a final 1-2-3 podium.

- **F5 — rounds:** round-count selector in `WarmupRoom.tsx` (like the bots `<select>`); carry `rounds` in
  the `start` message so all peers agree. **Host-authoritative lifecycle:** track per-player round wins;
  on a round's last-man-standing, host records the winner and — if rounds remain — re-spawns via
  `createWorld(evenSpawns(...))` and re-runs the 3 s countdown (reuse `match.ts`/`countdown.ts`); after the
  final round, end. **Tie-break:** if the final standings tie for a **podium place** (esp. 1st), play
  **sudden-death extra round(s)** among the tied players until that place is decided. Extend `MatchPhase`
  with `"intermission"` (between rounds) and `"scoreboard"`, and
  carry a host-owned `standings`/`roundIndex` in `snapshot` (or an `event`) so every peer agrees.
  **Podium UI:** a React `Podium.tsx` over the canvas — 1st/2nd/3rd pedestals, each winner's tinted musa
  (with their shape/avatar) on the step and their **nickname above** (reuse `getMeta`); ties / fewer-than-3
  handled gracefully.

Tracking:
- [ ] round-count selector in `WarmupRoom`; `rounds` carried in `start` (protocol done: `start` now has `rounds`/`roundNumber`/`tiebreak`; `standings` message added)
- [ ] host tallies round wins; between-round reset + re-countdown; match ends after final round
- [ ] standings synced to all peers; session phase extended (`intermission`/`scoreboard`)
- [ ] `Podium` overlay: 1st/2nd/3rd pedestals, musa per place, nickname above; ties handled
- [x] tie-for-podium → sudden-death extra round(s) among the tied players — **pure core done + unit-tested**
- [x] **sim-core round logic (win tally, standings, end-after-N, tie-break) — `arena/rounds.ts`, pure/no-clock/no-RNG, 7 tests.** Reduces to today's single-match behaviour at `rounds=1`.

**Integration plan (remaining, needs live multiplayer playtest):** reuse `start` per round (host re-broadcasts `start` with the round's players — full set for a regular round, the tied subset for a sudden-death decider — so all peers `beginMatch` identically). Host owns the authoritative `RoundsState`; on each round's `world.phase==="ended"` it records the win (`recordRoundWin`/`recordTiebreakWin`), then `nextRound()`: `play`→intermission then next `start`; `tiebreak`→intermission then `start` with the tied subset; `done`→broadcast `{t:"standings",phase:"scoreboard",podium}`. Clients mirror via the `standings` broadcast (tally + podium) and the per-round `start`. Session phase gains `intermission`/`scoreboard`; a `Podium.tsx` overlay renders places from `getMeta` (shape/avatar + nickname).

### P9 — Arena types: auto-generated labyrinth · `dependsOn: P3`
Goal: an arena-type selector; first type is an auto-generated maze with 3 m-wide, fully-interconnected
corridors.

- **F6 — labyrinth:** arena-type selector in `WarmupRoom.tsx` (`open` | `labyrinth`); carry `arena` + a
  maze **seed** in `start`. **Generation (host, deterministic):** host runs a ready perfect-maze
  algorithm — **recursive backtracker (randomized DFS)** or randomized Prim's — yielding a fully-connected
  maze (a path between any two cells); broadcast the **seed** (and/or the wall grid) so every peer rebuilds
  the identical maze with no in-core RNG. Grid sized to the 30 m field at **3 m cells** (~10×10), walls as
  thin segments between cells; optionally knock out a few extra walls for loops. **Sim:** today `sim.ts`
  only clamps to field bounds — add **wall collision** (segment/AABB vs. `FIGURE_RADIUS_M`) so movement
  *and the dash burst* respect corridors; walls live as pure data in the `World` (or a static `Arena`
  passed alongside). Spawns must land in open cells (adjust `evenSpawns`). **Render & bots:**
  `render/scene.ts` draws the walls (2.5D look); `bot.ts` needs maze-aware navigation (BFS/A* through open
  cells) instead of straight-line chase.

Tracking:
- [ ] arena-type selector in `WarmupRoom`; `arena` + `seed` in `start`
- [ ] seeded maze generator (recursive-backtracker/Prim's), 3 m cells over the 30 m field — pure + unit-tested (same seed → same maze; connectivity assertion)
- [ ] walls in `World`/`Arena` data; `sim.ts` wall collision for movement + dash (radius-aware) — unit-tested
- [ ] spawns placed in open cells; walls drawn in `render/scene.ts` (2.5D)
- [ ] `bot.ts` maze-aware pathfinding (BFS/A*) so bots don't wall-hug

### P10 — Mutators: haste powerups · `dependsOn: P3`
Goal: opt-in gameplay modifiers toggled in the lobby; first mutator spawns powerups that double a
picker's action rate.

- **F7 — powerup mutator:** mutator **checkbox list** in `WarmupRoom.tsx`; carry the enabled `mutators`
  set in `start`. When enabled, the **host** spawns powerup pickups at **seeded** positions/times (seed in
  `start`, same pattern as the maze). Model pickups as pure data in the `World`
  (`powerups: { id, pos, … }[]`). In `sim.ts`, on overlap (player radius vs. pickup) grant a **"haste"
  buff** — halve the player's **attack** and **dash** cooldowns (`ATTACK_COOLDOWN_S` / `DASH_COOLDOWN_S`
  × 0.5) so both fire **twice as often**; add `buffs`/`hasteRemaining` to `PlayerState` and apply the
  multiplier where cooldowns are set in `combat.ts`/`dash.ts`/`sim.ts`. Timed-vs-permanent is an Open
  decision. **Render:** an **animated** powerup object (bob/spin/glow, procedural) + a buff indicator on
  the buffed musa; new pickup SFX in `sfx.ts`. (This is the first of an open-ended mutator set.)

Tracking:
- [ ] mutator checkboxes in `WarmupRoom`; enabled `mutators` carried in `start`
- [ ] `World.powerups` + seeded host spawns (seed in `start`); pickup overlap in `sim.ts` — pure + unit-tested
- [ ] haste buff: per-player attack + dash cooldown ×0.5 (`PlayerState.buffs`/`hasteRemaining`); duration decided — unit-tested
- [ ] animated powerup + buff indicator in `render/scene.ts`; pickup SFX in `sfx.ts`

### P11 — Free-aim combat (mouse aim) · `dependsOn: P3`
Goal: decouple aim from movement — **keys move, the mouse aims the weapon** — so you can run one way
and strike another. (Foundational for P12 weapons.)

- **F8 — mouse aim.** Today facing is **4-way**, derived from the last-moved direction
  (`intent.ts nextFacing`) and combat fires a cone around that cardinal (`combat.ts inAttackCone` via
  `directionVector`). Replace the *attack/weapon* aim with a **continuous angle**: add `aim` (radians or a
  unit `Vec2`) to `RawInput` + `Intent`; `coerceIntent` (`protocol.ts`) clamps it to a finite, normalized
  value (host trust boundary — same place `facing` is sanitized). Generalize `inAttackCone`/`resolveAttack`
  to take an **aim vector** instead of a cardinal `Direction`.
- **Input adapter:** the renderer knows each player's screen position, so it computes the angle from the
  local player to the pointer and feeds it into `RawInput` (new `input/mouse.ts`, alongside
  `input/keyboard.ts`). The musa **body** can still snap to the nearest cardinal `Direction` for the sprite
  while the **weapon** rotates freely to `aim`.
- **Render:** weapon rotates to the aim angle, projected through `Y_SCALE` (same fix as the sword). No-mouse
  / touch fallback is an Open decision.

Tracking:
- [x] `aim?` added to `RawInput`/`Intent` (optional → falls back to facing); `PlayerState.aim` + `AttackState.aim`; `coerceIntent` finite-checks it (host trust boundary) — unit-tested
- [x] `directionAngle`/`aimVector` geometry helpers in `logic.ts` — unit-tested
- [x] `combat.ts` cone generalized from cardinal `Direction` → aim angle; `sim.ts` locks aim into the swing + knockback along aim — unit-tested (off-axis hit/miss + full-step off-axis attack)
- [x] `input/mouse.ts`: pure `screenDeltaToWorldAngle` (un-projects the y-squash) — unit-tested; `scene.ts` injects pointer aim into `RawInput` each frame
- [x] `render/scene.ts` sweeps the weapon around `attack.aim` (Y-projected); body still faces movement; cooldown/feel preserved
- [x] no-mouse fallback: aim defaults to the movement-facing angle (keyboard-only still attacks where you face) — Open decision #11
- [x] `bot.ts` aims at its target so bot attacks land under aim-based combat
- [ ] **live playtest**: mouse aim feels right across the 2.5D field; aim syncs to other peers via snapshot
- [ ] richer touch/twin-stick fallback (deferred — basic facing fallback ships now)

### P12 — Weapon types: sword · spear · knife · bow · `dependsOn: P11`
Goal: pick a weapon in the lobby; each trades reach / arc / speed — and the **bow** trades melee for
**ranged** fire.

- **F9 — weapons.** Add a `weapon` to player identity (loadout): extend `PlayerMeta` + carry on the wire
  (`hello`/`StartPlayer`), thread `session.ts`/`lobby.ts`; weapon picker in `WarmupRoom.tsx`. Define
  per-weapon stats in `constants.ts`. **Melee (cone):** **sword** (today: reach 2 m, 90° cone, 1 s),
  **spear** (longer reach ~3–3.5 m, narrow cone, slower cooldown, bigger knockback), **knife** (short ~1 m,
  fast cooldown, small knockback) — `combat.ts resolveAttack` already accepts `reach`/`halfAngle`, so extend
  it to read the attacker's weapon stats (incl. per-weapon cooldown/knockback).
- **Ranged — bow (the first non-melee weapon):** instead of an instant cone, it **fires an arrow projectile**
  along the `aim` (pairs directly with P11 free-aim). This needs a **projectile system in the sim core** —
  add `projectiles: { id, ownerId, pos, vel, … }[]` to the `World` (pure data), step them in `sim.ts` each
  tick (advance by `vel·dt`, expire on range/wall, resolve a hit = −1 health on first overlap with an *enemy*
  body), all deterministic. Reuses the team check from co-op (P13) for friendly fire. `PlayerState` carries
  the equipped weapon.
- **Render:** distinct (procedural) weapon sprites drawn/animated along the aim, **plus in-flight arrow
  sprites for the bow**; weapon-specific SFX in `sfx.ts` (bow draw / release / impact). A balance pass is
  expected (Open decision).

Tracking:
- [x] new pure `arena/weapons.ts` (`Weapon`, `WEAPONS` stats, `coerceWeapon`); sword references legacy constants so it's byte-identical to today — unit-tested
- [x] `PlayerState.weapon` (sim-relevant) + `SpawnSpec`/`createPlayer`; threaded through `lobby`/protocol (`hello`/`start`/`roster`)/`session` (incl. `beginMatch` zips weapon into spawns); picker in `WarmupRoom` (melee)
- [x] `sim.ts` uses the attacker's weapon stats (reach/cone/cooldown/knockback) — unit-tested (spear reaches 3 m, knife can't); `render/scene.ts` blade length/arc per weapon
- [x] new pure `arena/projectile.ts` (`spawnArrow`/`advanceProjectile`/`projectileTarget`) + `World.projectiles` (types); `sim.ts` spawns arrows for ranged weapons and steps/expires/hits them (deterministic id `owner#tick`, no RNG) — unit-tested (6 projectile + 3 sim); snapshot carries `projectiles` (`protocol`/`sync`/`worldFromSnapshot`)
- [x] bow added to the `WarmupRoom` picker; held-bow sprite + in-flight arrow sprites in `render/scene.ts`; bow-release `"shoot"` SFX; impact reuses `"hit"`
- [ ] **live playtest** + balance pass (sword/spear/knife feel; then bow). _Team-aware friendly-fire lands with co-op (P13); versus is FFA today._

### P13 — Co-op mode: players vs bots · `dependsOn: P3 (+ rounds P8 optional)`
Goal: a cooperative mode — all humans are **allies** versus a **team of bots** that fight together;
players spawn together in the middle.

- **F10 — co-op.** Add a `mode` (`ffa` | `coop`) selector in `WarmupRoom.tsx`, carried in `start`.
  Introduce a **team** concept — add `team` to `PlayerState` (humans vs. bots in co-op; FFA keeps everyone
  solo). **No friendly fire:** `combat.ts resolveAttack` skips same-team targets. **Win/lose is
  team-based:** `match.ts` win detection becomes mode-aware — players win when all bots die, lose when all
  players die (replaces the FFA `soleSurvivor` rule). **Spawns:** players cluster at field center, bots ring
  the edge (new spawn spec alongside `evenSpawns`).
- **Bot AI:** `bot.ts` targets the nearest **enemy** (player) and the bot team pressures together;
  difficulty scaling is an Open decision. Pairs naturally with **rounds (P8)** as survival waves.

Tracking:
- [ ] `mode` (`ffa`|`coop`) selector in `WarmupRoom`; carried in `start`
- [ ] `team` on `PlayerState`; `combat.ts` skips same-team targets (no friendly fire) — unit-tested
- [ ] mode-aware win/lose in `match.ts` (players-vs-bots) — unit-tested (FFA path unchanged)
- [ ] center-cluster player spawns + edge bot spawns (new spawn spec)
- [ ] `bot.ts` enemy-targeting + team coordination; difficulty scaling decided

---

## Track A — Arena · Survival mode (co-op PvE) · `dependsOn: A/P12 (projectiles), A/P3 (net)`

Goal: a second Arena **mode** alongside the renamed **versus** (FFA): 1–8 allies spawn in the CENTER and
defend against escalating creature waves that spawn OUTSIDE the field and crawl inward. A **finite
campaign of escalating levels** with a **downed/revive** model (revive at wave/level clear; full-party
wipe ends the run) and an **endless** mode after the campaign clears. Reuses the deterministic sim core,
free-aim/melee combat, and host-authoritative netcode; the enemy engine is **independent** per locked
decision #1. **Invariant:** all wave/spawn/drop randomness is host-seeded from `start` and injected —
never a clock/`Math.random()` in the core.

### P-A0 — Snapshot bandwidth + determinism substrate (cross-cutting foundation) · `dependsOn: A/P12`
Goal: make the netcode survive hordes BEFORE any enemy ships — entity caps, compact/delta snapshots, and
the coordinate-hash RNG. A **launch blocker, not a later optimization** (per critique); shared by Survival
and Overrun (Track D).

- [ ] Hard **concurrent-entity caps** in `constants.ts`: `MAX_LIVE_ENEMIES` (~40–60 total, scale spawn RATE not standing population), `MAX_PROJECTILES`; prune `status:'dead'` entities same-tick
- [ ] **Quantized entity encoding** in `protocol.ts`: Int16 positions (cm), Uint8 kind/status/health, Uint8 brad angle — Trystero data channels are binary-capable; keep JSON for lobby/control msgs
- [ ] **Delta snapshots**: full keyframe on join + every N ticks; per-tick diffs otherwise; `sync.ts` sends a keyframe to a newly-joined/promoted peer
- [ ] **Entity snapshot rate = 10 Hz** with client-side position interpolation; inputs stay 20 Hz — measured, tunable
- [x] **Coordinate-hash RNG** `src/game/arena/survival/rng.ts`: `hash(seed, tick, entityId, salt)` — replaces any shared advancing cursor so draw-order can't fork; colocated `rng.test.ts` (same input → same output, distribution sanity)
- [ ] `worldFromSnapshot` extended to reconstruct EVERYTHING host-mutated (see P-A3); **guard test**: hydrate a fresh engine from ONE snapshot on a different localId, step both, assert byte-identical for many ticks
- [ ] **RISK gate**: measure real snapshot bytes at 8 players + full horde; assert under the data-channel budget before P-A5

### P-A1 — Named mode plumbing (zero behavior change) · `dependsOn: P-A0`
Goal: carry the player-facing `GameMode` end-to-end so future reducers have a safe discriminator.
Only **Free For All** is startable until each other mode owns its rules; existing FFA tests stay green.

- [x] `modes.ts`: canonical `Free For All | Labyrinth | Coop Survival | Team Versus` registry, rule/arena metadata, availability, and wire coercion — unit-tested
- [x] `mode: GameMode` on `World` (`types.ts`); `createWorld` defaults to `'ffa'`; existing `sim.test.ts` passes unchanged
- [x] `protocol.ts`: additive optional `mode` on `start` and snapshots; `worldFromSnapshot` defaults old payloads to FFA
- [x] `session.ts`: host validates availability, carries mode through rounds/start, clients coerce it, and unavailable modes fall back to FFA rather than running the wrong rules
- [ ] `session.ts start()`: host generates `seed` ONCE (`Math.random` outside the core), broadcasts in `start`, threads into `beginMatch`
- [ ] `match.ts`: extract `resolveEnd(world)` (versus path = current `soleSurvivor`); `sim.ts` calls it instead of the inline check — versus tests unchanged

### P-A2 — Enemy model + wave plan + one archetype end-to-end (pure, TDD) · `dependsOn: P-A1`
Goal: prove the whole pipeline (data-on-World → host sim → snapshot → client render) with ONE kind
(giant ant / swarmer) before adding variety.

- [ ] `src/game/arena/survival/enemy.ts`: `EnemyState{id,kind,pos,facing,aim,health,maxHealth,status,speed,contactDamage,hitCooldownRemaining,target,spawnTick}` + `coerceEnemy` wire-trust boundary; `enemies` on World with **deterministic ids** `e{level}-{seq}` (seq lives IN world, never a host-local counter)
- [ ] `enemyKinds.ts`: per-kind stat table (pure data) `ant|zombie|bat|dino|clawed`
- [ ] `steering.ts`: `nearestPlayer` (generalize `bot.ts nearestEnemy`), `stepToward`, separation + one-way boundary clamp (enemies exempt until they enter the field); colocated tests
- [x] `waves.ts`: pure capped `wavePlan(seed,level,wave,partySize)` with sub-linear frozen-party scaling, deterministic ids/angles/timing, and monotonic-escalation tests
- [ ] `spawnsDueAt(level,tick,seed,partySize)` consumes the plan once enemy/world state exists
- [ ] `centerSpawns(ids)` in `match.ts` (cluster near center) + `createSurvivalWorld(spawns,seed,{endless})`; colocated tests
- [ ] **Sorted-id iteration** mandated for every per-enemy loop; tie-breaks by lowest EnemyId; test two insertion orders → identical stepped output
- [ ] Enemy contact damage reuses the −1-health + knockback model, gated by per-kind `hitCooldown`; render enemy as a procedural placeholder (real art = Track E), y-sorted, death tween

### P-A3 — Survival step reducer + net wiring (host-authoritative) · `dependsOn: P-A2`
Goal: the survival branch of `stepWorld`, the level/wave/revive state machine, and full snapshot
replication of all host-owned state.

- [ ] `survival/step.ts` `stepSurvival(world,intentsById,dt)`: reuse the shared per-player movement/dash/attack block (factored out of `sim.ts`, pure move, existing tests first), then players-vs-enemies (generalize `combat.ts` to a structural `Hittable{id,pos,status}`), then enemy step, then damage/downed/revive, then the wave/level machine
- [ ] `sim.ts`: `if world.mode==='survival' return stepSurvival(...)` else existing path; **no friendly fire** structurally (player-vs-player hit test simply not run)
- [ ] **worldFromSnapshot rebuilds ALL host-mutated state**: `enemies`, `projectiles`, `pickups`, the full `survival` block INCLUDING `spawnSeq` and any pity counter, plus `seed`; forbid host-local mutable counters
- [ ] **playerCount frozen per wave**: `survival.partySizeThisWave` computed once at wave-start (recommend alive-at-wave-start), carried in world so it rides snapshots + migration; test 1 and 8 with a mid-wave leave → spawns don't jump
- [ ] `session.ts`: `createSurvivalWorld` in `beginMatch` when survival; `hostExtraIntents` returns `{}` (enemies are host-simulated in the reducer, not via intents)
- [ ] **Migration determinism test** (phase gate): step host to tick T across a wave boundary + a drop roll, hydrate a fresh engine from that snapshot on a different id, assert byte-identical for many ticks
- [ ] **Spatial grid** broad-phase baked into enemy contact/separation from the first slice (retrofit risks changing iteration order/determinism); steering strictly O(1)/enemy

### P-A4 — Behavior archetypes + creature roster + run lifecycle · `dependsOn: P-A3`
Goal: five archetypes mapped to creatures, and the full campaign→endless run with downed/revive.

- [ ] `behaviors.ts` (pure): swarmer=ant, chaser=zombie (slow relentless), flyer=bat (seeded weave/dip-in via coordinate-hash, altitude cosmetic), bruiser=clawed (lunge reusing `dash.ts`), heavy/boss=dinosaur (telegraphed `inAttackCone` slam); each unit-tested for signature motion
- [ ] `PlayerStatus` gains `'downed'`: health≤0 in survival → downed (rendered, no effective input), not dead
- [ ] **Revive-vs-wipe ordering (tested)**: resolve enemy deaths → wave-clear → revive downed BEFORE evaluating party-wipe, so the last player downed on the same tick the last enemy dies survives
- [ ] Level clear (budget exhausted AND all enemies dead) → revive all downed to partial HP + intermission breather → next level; final campaign level cleared → win (winnerId `'party'` sentinel); full-party-down → lose
- [ ] **Endless**: `endlessLevel(index)` continues the difficulty formula past the campaign until wipe
- [ ] `election.ts`: **`'downed'` counts as a valid host candidate** (still connected/simulating) so host doesn't thrash on alive↔downed flips
- [ ] Enemy-death seeded drops → `World.powerups` (reuse P10 model); drop rate/table scale gently with level

### P-A5 — Survival UX: WarmupRoom, HUD, revive/pause, art + SFX, playtest · `dependsOn: P-A4, E/AP3`
Goal: mode picker, mode-aware shell/HUD, revive UX, and the real sprite-sheet enemies wired in.

- [x] `WarmupRoom.tsx`: four-mode selector with Live / In development / Future statuses; only available modes can start; host choice carries through `onStart`
- [ ] Enable Coop Survival after P-A2/P-A3; hide bots, show Campaign|Endless + player-count note; `canStart` in survival = ≥1 player; `onStart` carries endless
- [ ] `Arena.tsx` + HudState: mode-aware result copy ("Campaign cleared!" / "Wiped out — reached Level X"); new `SurvivalHud` (level/wave, enemies remaining, per-ally downed + revive indicator); "Spectating…" → "Downed — revive at wave clear"
- [ ] Enemy rendering via Track E atlases (per-kind idle/walk/attack/die), y-sorted; boss HP bar + screen-shake on slam; procedural fallback still active
- [ ] `audio/sfx.ts`: enemy spawn/hit/death (oscillator, asset-free); boss slam sting
- [ ] Live cross-browser playtest: determinism across 2+ browsers (identical waves), revive-on-clear, wipe→lose, campaign→win, endless rollover; balance pass on wave curve + enemy stats

**Open decisions (Survival)**
- Flyer (bat) altitude: **cosmetic render-lift** (recommended) vs a sim rule where bats are only hittable while dipping in.
- Revive model: **revive-only-at-clear** (locked baseline) vs a mid-level stand-near-ally rescue / bleed-out timer; partial-HP amount on revive — settle in playtest.
- playerCount scaling input: **alive-at-wave-start, frozen per wave** (recommended); linear (×N) vs **sub-linear (×N^0.8)** count scaling so 8-player coop isn't a wall.
- Campaign length: TOTAL_LEVELS / WAVES_PER_LEVEL and where dinosaur mini-bosses sit — tune in playtest.
- Ship Survival against **melee-only** if the P12 bow slips (recommended: yes — melee is sufficient for the loop).
- Endless score / highest-level persistence — ties to Track B; out of core scope.

**Risks (Survival)**
- Snapshot size / host CPU with hundreds of bodies at 8 players — mitigated by P-A0 caps + quantized/delta snapshots + spatial grid; primary lever is the concurrent-enemy cap.
- Determinism drift on host migration — closed by snapshot-carries-everything + coordinate-hash RNG + no host-local counters + the P-A3 migration test.
- Enemy iteration order over a `Record` — mandated sorted-id iteration + lowest-id tie-breaks.
- Revive-vs-wipe same-tick edge — resolve deaths/revive before wipe check (tested).
- Enemies-outside-bounds vs the field clamp — explicit inside/outside state + one-way clamp, tested.
- Art pipeline is net-new (Track E) — procedural fallback keeps P-A2…P-A4 unblocked.

---

## Track B — Members area & backend (auth · avatars · progress · freemium) · `dependsOn: A/P3+`

Goal: a **Wix Members** area that gives players a durable identity to which their **avatar, saved progress,
and (later) a paid membership** attach — all written through **trusted Astro server API routes** (run on Wix
infra with elevated app creds), since P2P clients can't be trusted writers. **Sign-in is OPTIONAL** (anonymous
P2P play with fighter selection is preserved); member-only features are always **shown but LOCKED with an unlock
hint** (decided 2026-07-08). This track supersedes the old W0/W1/W2 stub and **absorbs F4 (avatars)**.

**Capability model (drives every "locked" hint):**
- **Anonymous** — plays any mode with a selected fighter, joins via link. Avatar → *"Sign in to use a photo"*; progress → *"Sign in to save"*; (later) sees ads.
- **Signed-in (free)** — custom avatar + saved progress. Premium perks → *"Upgrade to unlock"*; (later) still sees ads.
- **Paid member** — ads off + premium perks.

Two lock kinds — **sign-in-to-unlock** (avatar, progress) and **upgrade-to-unlock** (ads-off, premium) — both
rendered by a reusable `<LockedFeature hint=…>` badge/overlay.

### B0 — Auth foundation (Wix Members) · `dependsOn: none`
Goal: optional Wix-managed login (email + Google + social) on the headless Astro app, current-member available
client + server, a members-area shell, and the locked-feature primitive. Anonymous play untouched.

- [x] login/logout wiring — Wix Astro integration's built-in `/api/auth/login` + `/api/auth/logout` (`returnUrl` supported); linked from the account page + `<LockedFeature>` (no OAuth/client code needed)
- [x] **members-area shell** `src/pages/account.astro` (SSR: profile name/avatar + sign out, or a sign-in CTA) + "Account" entry on the home page
- [x] pure capability model `src/lib/members/capability.ts` (`capabilityOf`/`meetsCapability`/`defaultLockHint`) — unit-tested (3); `<LockedFeature>` overlay + `useCapability()` hook + `/api/me` route
- [x] anonymous P2P play unchanged (no login gate added; anonymous is the current state)
- [ ] **BLOCKED — live member read** (`src/lib/wix/members.ts` stubbed to anonymous): needs `npm install @wix/members` (this env has no Wix-registry access) + swap in the inline real `members.getCurrentMember()` code
- [ ] **BLOCKED — owner Wix-dashboard config:** install the **Members Area** app; add allowed **authorization redirect URIs** (deployed host + localhost); enable email + Google + social login; leave the Headless Settings login-URL field empty

### B1 — Avatar upload (first member feature; Arena) · `dependsOn: B0` — **absorbs F4**
Goal: a signed-in member uploads one character photo; it's resized, stored, and shown on their character to
every peer. **Two tiers (DECIDED 2026-07-09): a global profile photo + optional per-game overrides.**

**B1a — global avatar (SHIPPED 2026-07-08):**
- [x] Avatar control (Account settings): file input **jpg/jpeg/png** → client-side **resize + center-crop to a square** (256×256) via an offscreen `<canvas>` (`AvatarUploader.tsx` + `avatarCrop.ts`, unit-tested)
- [x] **Trusted `/api/avatar` server route** uploads the image to **Wix Media** (elevated app creds; clients never write directly) and stores the **CDN URL** as the member **profile photo** — surfaced everywhere via `getSessionMember()`
- [x] **cosmetic-only** (never enters the sim); payload capped; type/size validated server-side

**B1b — per-game avatars (SHIPPED 2026-07-09):** separate avatar per game, set in the Arena lobby *or* Account → Player. Resolution: **per-game (`PlayerAvatars`) → global profile photo → fighter artwork**.
- [x] `PlayerAvatars` collection `{ memberId, gameId, url }` (ADMIN writes; keyed by a deterministic `<gameSlug>-<memberId>` id for O(1) elevated get/upsert) — first slice of the B2 data model
- [x] Extend `/api/avatar` with optional `gameId`: present → upsert a `PlayerAvatars` row; absent → the global profile photo (B1a behaviour). `gameId` allowlisted via `lib/members/games.ts`
- [x] Pure `resolveGameAvatar(perGame, global)` (per-game → global → null) — unit-tested (4)
- [x] Per-game avatar control in **Account → Player** (per game, SSR-resolved) and the **Arena lobby** (member-gated inline hint for anonymous)
- [x] Arena attaches the resolved avatar **URL** to its roster entry → carried on the wire (`hello`/`start`, sanitized by `coerceAvatarUrl`) → `render/scene.ts` composites a **circular face photo** over the fighter's head and keeps the fighter artwork on absent/load-error/CORS-taint

### B2 — Progress & stats persistence · `dependsOn: B0`
Goal: per-member game data, written only by a trusted server route.

**Data model (DECIDED 2026-07-09) — data-type collections keyed by `(memberId, gameId)`, server-authoritative (elevated PRIVILEGED writes).** One collection *per data type*, not per game: a new game is just a new `gameId` value — no new collections, permissions, or write code. Rationale: Wix Data can't sort/filter nested object/JSON fields, so anything ever leaderboarded must be a **top-level column**; leaderboards are almost always *per-game single-metric* sorts, which this shape serves without a collection-per-game explosion. Escape hatch: split one game into its own collection later only if its schema diverges hard.
- **`PlayerAvatars` `{ memberId, gameId, url }`** — per-game avatar override (built in B1, see below). Uniform across games.
- **`PlayerStats` `{ memberId, gameId, score, wins, losses, matches, stats(object) }`** — shared leaderboard metrics (`score`/`wins`/`losses`/`matches`) are **first-class indexed columns** → a per-game leaderboard is `filter(gameId).descending("score").limit(N)`. Game-specific *display-only* extras live in the `stats` object blob (no schema churn).
- **`PlayerProgress` `{ memberId, gameId, data(object) }`** — read-whole "save" blob for levels/items (built when needed).
- **Indexes:** `memberId`, `gameId`, and the leaderboard sort columns (`score`, `wins`). Leaderboards themselves are a **future** option — the columns exist so we don't hit a JSON dead-end.

- [ ] Create `PlayerStats` + `PlayerProgress` collections (PRIVILEGED writes) — `PlayerAvatars` lands earlier with B1
- [ ] `POST /api/match-result` — the **host reports the result**, server validates (sanity bounds) and upserts the `(memberId, gameId)` `PlayerStats` row (wins, matches played, best survival level, favorite weapon…) — the only writer
- [ ] Members area shows a player's stats; anonymous runs aren't saved (locked hint *"Sign in to save your progress"*)
- **Open risk:** a cheating host can mis-report — acceptable for casual play; add server sanity checks.

### B3 — Freemium / payments (later) · `dependsOn: B0`
Goal: a paid membership tier.

- [ ] `@wix/pricing-plans` subscription plan(s); checkout via the existing `@wix/ecom` path; billing state in the members area
- [ ] `useCapability()` returns `paid` for an active plan; premium perks gated behind it
- [ ] Decide the premium perk list (ads-off + e.g. cosmetic unlocks / extra loadout slots)

### B4 — Ads + ads-disablement (later) · `dependsOn: B3`
Goal: unobtrusive ads for free users, hidden for paid members. (There are NO ads today — this adds them.)

- [ ] House-banner placeholder in **non-gameplay** surfaces only (menu / between-match / results — never in-match)
- [ ] Hidden when `useCapability() === 'paid'`
- [ ] Real ad-network integration is a later decision (network, CSP/allowed-host, placement)

**Open decisions (Track B)**
- Wix-dashboard config steps for headless Members auth + social providers + Pricing Plans — **owner action, potential blocker for B0/B3**.
- ~~Avatar store location~~ **DECIDED 2026-07-09:** global avatar = member **profile photo** (B1a); per-game overrides = a **`PlayerAvatars`** row keyed by `(memberId, gameId)` (B1b). See the B2 data model.
- Avatar size/format: **256×256 square, jpg/jpeg/png, one per member** (recommended); re-crop on re-upload.
- Ad network + premium-perk list — deferred to B3/B4.
- Mapping member identity → the in-game P2P peer id (the member's avatar/stats attach to their current session's roster entry).

---

## Track C — Turn-based game #2 (Tactics) · `dependsOn: A/P0` — **DEFERRED / reframed**

Status: **superseded as the pack's second playable game by Track D (Overrun).** The "Tactics — Coming soon"
card on `index.astro` is reclaimed by Overrun; Tactics remains a *future* turn-based title with its own slug
and is not removed — it simply no longer owns the index card slot. Revisit after Overrun ships. The original
turn-based rationale (no tick-rate/latency pressure; tolerant of the flaky-relay window) still stands.

- **T0 — Concept lock (later):** pick the turn-based game (brainstorm) and define its pure rules core.
- **T1 — Build (later):** pure rules + `LocalTransport` tests → Phaser/React render → Trystero turn exchange
  (reuse the lobby/room/join-link/kick infra from Track A, generalized) → ship on its own slug.

Tracking:
- [ ] (deferred) game chosen + rules core unit-tested
- [ ] (deferred) networked turns over Trystero (reusing lobby infra)
- [ ] (deferred) live on the start page under its own card

---

## Track D — Overrun (twin-stick co-op horde shooter, Crimsonland-style) · `dependsOn: A/P12 (projectiles), A/P-A0` — **supersedes the Track C "Tactics" placeholder**

Status: **thin vertical slice SHIPPED (2026-07-10, branch `game/overrun-slice`)** — pistol/shotgun/rifle
(all hitscan), rusher + tank, endless proportional waves, weapon/medkit drops (+pity/caps), downed/revive
(revive-before-wipe), XP + global perk pool with NON-BLOCKING overlay picks (1/2/3), per-player run stats →
end-screen scorecard → merch print funnel, procedural art, 1–8 co-op over quantized keyframe+delta @10 Hz
(fixed 30 Hz sim) on Overrun's own `SyncAdapter`/`SyncEngine` under `src/game/overrun/net/` (per the
per-game netcode convention; shared `net/` stays arena's). **Decoupled from Track A** (P-A0 absorbed as
game-agnostic net infra) and **fully separated from Arena** (own primitives/lobby wire/renderer/HUD; zero
`src/game/arena/**` imports, enforced by a recursive purity test). Widen-later: 5-level campaign, the other
6 guns (auto-rifle/SMG/gauss/rocket/flame/MG+heat), crawler/swarm/spitter, sprite atlases (Track E), Track B
highscore persistence, touch/gamepad.

Goal: a SEPARATE game (`src/game/overrun/`) reusing the whole spine (pure `stepWorld`, host-authoritative
SyncEngine, Trystero mesh cap 8, fake-2.5D renderer, free-aim input). 1–8 humans (a tactical-camo figure)
spawn together; WASD moves the body, mouse aims, hold-to-fire spawns synced projectiles. Enemies pour from
the edges in escalating waves; kills drop weapons. **No friendly fire.** Enemy count scales proportionally
with **live** player count. Run structure mirrors Survival (finite campaign + downed/revive + wipe=over,
then endless) so the horde modes are siblings — but its enemy/wave engine is **independent** (decision #1).
Replaces the Track C turn-based card on `index.astro` (Tactics can return later as a distinct game).

### P-D0 — Overrun sim core (pure, deterministic, TDD) · `dependsOn: A/P12, A/P-A0`
Goal: stand up `src/game/overrun/` with its own world + reducer: players (WASD + free-aim), the
World-carried seeded RNG, projectiles, and firing (auto/semi via edge-detect). No enemies yet — prove
movement, cadence, bullet flight, no-friendly-fire, determinism.

- [ ] `types.ts`: `ShooterWorld{players,projectiles,enemies,pickups,wave,level,phase,score,seed}`, `ShooterPlayer{pos,aim,health,status:'alive'|'downed'|'dead',weapon,ammo:{mag,reserve,reloadRemaining,heat,fireCooldownRemaining},reviveProgress,team}`
- [ ] `rng.ts`: coordinate-hash `hash(seed,tick,ownerId,shotIndex,salt)` (NOT a shared advancing cursor) so spread/pellet/crit/drop draws can't fork under migration; colocated test
- [ ] `weapons.ts`: `WEAPONS` table pistol/shotgun/rifle/autoRifle/smg/gauss/rocket/flamethrower/mg (fireRate/pellets/spread/damage/pierce/aoe/ammo/auto/knockback/heat) + `coerceWeapon`; all 9 tuned (start table in Open decisions)
- [ ] `intent.ts`: reuse rising-edge pattern — semi = edge, auto = held; `reload`; `coerceIntent` shooter variant sanitizes `{move,aim,fire,reload}` only (never positions/health/enemies); **aim is host-consumed-only, never a determinism input**
- [ ] `projectile.ts`: `Projectile{id,ownerId,team,kind,pos,vel,damage,rangeRemaining,pierceRemaining,aoeRadius,ttl,hitscan,spawnTick}`; **hitscan guns resolve on the spawn tick and never serialize as travelling state** (only rocket/flame travel on the wire); ordering test
- [ ] `sim.ts`: move → fire(spread from coordinate-hash) → projectile flight → (enemy collisions in P-D2); **bullet-vs-player never tested** (no friendly fire, structural); infinite-pistol fallback when both mag+reserve empty; MG heat ramps spread on sustained fire
- [ ] Tests: fire cadence, semi-vs-auto, pellet-spread determinism, ammo depletion, pistol fallback, seed reproducibility, RPM>tick-rate accumulator (multi-shot/tick or documented ceiling)

### P-D1 — Enemy + wave engine (INDEPENDENT of Survival, pure) · `dependsOn: P-D0`
Goal: the horde — enemy kinds with distinct AI, edge-spawn crawl-in, wave/level escalation, proportional
budgeting, contact damage, and weapon-drop rolls.

- [ ] `enemies.ts`: `Enemy{id,kind,pos,vel,health,behavior}`; kinds (crawler/rusher/swarm-flyer/tank/spitter) chase-nearest-alive; **sorted-id iteration + lowest-id tie-breaks** (own copy, not shared with Survival)
- [ ] `waves.ts`: pure `budget(level,wave) × playerScale(aliveCount)`; spawn positions on the perimeter from coordinate-hash; concurrent-enemy cap; **playerCount frozen per wave** in the world; test at 1 and 8 players + mid-wave churn
- [ ] `drops.ts`: tier-weighted weapon-drop table + pity/anti-flood counter (in world, not host-local); `WeaponPickup{id,gun,pos,ammoBonus,ttl}`; reproducibility test
- [ ] `sim.ts`: enemy AI step, enemy-vs-player contact damage, projectile-vs-enemy (pierce/AoE for rocket/flame — **AoE queries enemies only**, players excluded by construction, enemy knockback clamped to field), on-death drop roll, pickup→replace-weapon (fresh full mag)
- [ ] Downed/revive: 0 HP → downed; teammate-proximity revive OR wave-clear auto-revive; full-party-down → ended (lose); **revive-before-wipe ordering tested**
- [ ] Level clear → next level or Endless unlock; score accrual (kills × wave); spatial-grid broad-phase from the first slice
- [ ] Tests: budget scales with alive count, wipe=game over, wave-clear revive, drop determinism, AoE multi-hit, per-kind behaviors

### P-D2 — Net wiring: SyncEngine + Overrun session · `dependsOn: P-D1`
Goal: run the shooter world over the existing host-authoritative stack; host simulates enemies/waves;
clients send inputs-only; migration reproduces via snapshot-carried seed + all entity state.

- [ ] `protocol.ts`: shooter snapshot carries `{players,projectiles,enemies,pickups,wave,level,score,seed,spawnSeq,pity}` using the P-A0 quantized/delta encoding; **worldFromSnapshot rebuilds all of it**
- [ ] Reuse `SyncEngine`: host steps the shooter `stepWorld`; enemies host-owned (no per-peer intent); **clients render ONLY host-authored entities — never locally spawn, roll drops, or advance wave RNG**; test a client fed only snapshots produces zero enemies/drops of its own
- [ ] `shooterSession.ts` (or light generic parameterization of `session.ts` by World type): roster/host-election/start-with-seed/countdown, MatchDriver for the shooter renderer
- [ ] LocalHub tests: 8-peer start, snapshot convergence, **host-migration mid-wave keeps enemies+seed+spawnSeq+pity consistent** (byte-identical), downed/revive syncs, proportional budget with joins/leaves, no-friendly-fire end-to-end

### P-D3 — Gun + weapon-drop economy polish · `dependsOn: P-D2, P-D1`
Goal: finalize the 9-gun arsenal mechanics, ammo/reload/heat, and the drop economy as data-driven, host-authoritative.

- [ ] `firing.ts`: pure `fireGun(gun,ammoState,aim,rng)->{projectiles,ammoState}`; per-weapon tests (pellet count, spread bounds, mag decrement, RPM gating); shotgun=N pellets, gauss=one-tick piercing line, rocket=travelling AoE, flamethrower=short-ttl cone particles (capped), MG=heat-ramp
- [ ] `tryReload`/`tickReload` state machine (blocks firing, not movement); empty-both → infinite pistol (tested)
- [ ] Drop table + weights colocated with `WEAPONS` (rare gauss/rocket low weight); ttl expiry culls stale pickups; concurrent-pickup cap + pity suppression; auto-pickup with a brief re-swap guard
- [ ] **RNG draw independence**: every draw is a coordinate-hash of stable coords (spread=hash(seed,tick,playerId,shotIndex); drop=hash(seed,tick,enemyId)); test an extra/missing upstream draw cannot shift downstream values

### P-D4 — Renderer (fake-2.5D, rotate-to-aim) + twin-stick input · `dependsOn: P-D2, E/AP4`
Goal: render the shooter with Arena's 2.5D conventions and real camo-soldier + monster atlases; reuse free-aim.

- [ ] `render/scene.ts`: y-sorted soldier body + layered aim-rotated weapon sprite + enemies + projectiles + pickups; muzzle flash + tracers; per-weapon projectile visuals (bullet tracer, rocket+explosion, flame cone, gauss beam)
- [ ] Reuse `input/mouse.ts screenDeltaToWorldAngle` verbatim for aim; hold-LMB fire, R reload, WASD move; **no client-side projectile prediction** (render snapshot positions; rockets get light extrapolation)
- [ ] Enemy hurt/death anims + edge-spawn crawl-in visual; downed-player + revive-ring visual; object pooling for bullets/enemies under the cap
- [ ] `audio/sfx.ts`: per-weapon oscillator gunshots/reload/explosions (asset-free); flame particle count capped

### P-D5 — React island, page, lobby/loadout, HUD, index card · `dependsOn: P-D4, P-D3`
Goal: wire it into the site.

- [ ] `src/pages/games/overrun.astro` mounts the React island (mirror `arena.astro`)
- [ ] `src/components/game/overrun/Overrun.tsx` phase shell (lobby→countdown→playing→ended, mirror `Arena.tsx`)
- [ ] Overrun `WarmupRoom` variant: name/color, party list + kick, room link, Campaign|Endless pick, Start (coop up to 8); **NO weapon pick in lobby** (pistol start, scavenge in-run)
- [ ] shooter HUD: HealthBar, WeaponAmmo (mag/reserve + reload progress + MG heat bar), WaveLevel, Score, DownedPrompt, TeammateStrip
- [ ] Win screen (campaign cleared → Endless unlock) + lose screen (party wipe) + score summary; rematch/back-to-room
- [ ] `index.astro`: **replace the Tactics "Coming soon" card with Overrun** (Realtime co-op horde shooter, status: play, href `/games/overrun`)

### P-D6 — Balance, perf, cross-browser playtest · `dependsOn: P-D5`
Goal: tune numbers, validate the entity cap holds framerate with 8 players + heavy hordes, verify determinism over long runs + migration.

- [ ] Balance: weapon damage/fireRate/ammo, drop weights, enemy hp/speed/damage, wave budget curve + playerScale
- [ ] Perf: real snapshot bytes with many enemies/bullets at 8 players; enforce caps; delta/quantized encoding verified
- [ ] Long-run determinism + host-migration drift check (host/client worlds converge byte-identical)
- [ ] TURN reachability for strict-NAT (reuse Arena requirement); Chrome/Firefox/Safari-iOS; touch/no-mouse aim fallback (reuse Arena decision #11)
- [ ] Update `docs/ROADMAP.md` progress log + decisions

**Open decisions (Overrun)**
- Game slug + name: **DECIDED (2026-07-08) — `overrun` / "Overrun"** (module `src/game/overrun/`, page `src/pages/games/overrun.astro`).
- Weapon inventory: **DECIDED (2026-07-10, shipped) — single active weapon + infinite-ammo pistol fallback.**
- Perks (NEW): **DECIDED (2026-07-09) — global pool now, class/weapon scoping later via `PerkDef.tags`**; pick UX = **non-blocking overlay** (keys 1/2/3 or click, offers queue). Stats→merch via the existing `print.ts` funnel.
- Per-gun tuning (proposed START table — damage/RPM/mag/reserve/reloadS/spread°/pellets/projSpeed/range/pierce/aoe/kind): PISTOL 12/300/12/∞/1.2/2/1/-/20/0/0 hitscan; SHOTGUN 8·pellet/70/6/36/1.0/9/8/-/12/0/0 hitscan; RIFLE 34/220/10/60/1.6/1/1/-/40/1/0 hitscan; AUTO-RIFLE 22/600/30/180/2.2/3/1/-/32/0/0 hitscan; SMG 14/900/30/240/1.4/5/1/-/22/0/0 hitscan; GAUSS 90/40/4/16/1.8/line/1/-/50/∞/0 pierce-line; ROCKET 120/50/1/6/2.0/0/1/18/45/0/aoe3.5 travel; FLAMETHROWER 6·particle/fuel100/-/1.5/cone/8/6/pierce travel; MG 20/1000/100/300/heat/1/-/38/0/0 hitscan+heat — **all tune in playtest**.
- Drop rate/weights: start ~15% base × tier multiplier, rare weight 1 / common weight 5, pity threshold — tune vs enemy density.
- Campaign length + Endless: recommend a **short 5-level campaign** first, Endless local-score only initially (persistence → Track B).
- Generalize `session.ts`/`SyncEngine`: **DECIDED (2026-07-10, shipped; merge-reconciled 2026-07-10 onto the repo's per-game netcode convention) — Overrun owns its netcode under `src/game/overrun/net/`** (`engine.ts`/`protocol.ts`/`adapter.ts`/`session.ts`, mirroring Squid's own `src/game/squid/net/`); shared `src/game/net/{sync,session,protocol}.ts` stays arena's, non-generic. Overrun runs its own `OverrunSession` + `oHello/oStart/oInput/oSnap/oDelta` wire kinds (full game separation from Arena — user directive 2026-07-09).
- Multi-shot-per-tick vs a 20-shots/s ceiling for the highest-RPM guns.

**Risks (Overrun)**
- Snapshot blowup (biggest) — mitigated by hitscan-on-spawn-tick, short flame ttl, entity caps, quantized/delta encoding (P-A0).
- Determinism leak (re-armed hard) — single coordinate-hash RNG whose seed rides every snapshot; no Math.random/clock in core, enforced by test.
- Host CPU bottleneck — spatial partitioning + entity caps.
- Proportional-scaling × revive churn — budget recomputed only at wave boundaries from a frozen, snapshot-carried partySize.
- Scope is the largest in the pack — ship a thin vertical slice (pistol+shotgun+rifle, 2 enemy kinds, 1 level) first, then widen.
- No-friendly-fire + AoE ambiguity — AoE queries enemies only by construction; enemy knockback clamped to field.
- Sprite-asset pipeline (Track E) is unproven — procedural placeholders keep P-D0…P-D3 shipping independent of art.

---

## Track E — Sprite-sheet art & asset pipeline (cross-cutting) · `dependsOn: none (parallel with projectiles)`

Goal: introduce the FIRST binary-asset pipeline (the renderer is 100% procedural today) per locked decision
#4 — a tactical-camo human + varied monsters (giant ants/zombies/bats/dinosaurs/clawed) + the gun family —
with a **render-only hard boundary** (art NEVER enters the deterministic sim), a shared loader/animation
registry used by both horde games, a static-hosting story, and a **procedural fallback** so gameplay TDD
never blocks on art. **Sourcing DECIDED (2026-07-08): AI-generated bespoke roster + CC0 placeholder packs.**

### AP0 — Conventions, licensing manifest, layout · `dependsOn: none`
- [ ] Atlas grouping (`player`/`enemies`/`weapons`/`projectiles`) + frame naming `entity_state_dir_NN`; animation-state vocabulary (enemies idle/walk/attack/die; player idle/run/shoot)
- [ ] Directionality per kind: **rotate-sprite** for the near-top-down shooter + radially-symmetric enemies (ants/bats); **4-facing** for humanoid/dino under the Arena 2.5D `Y_SCALE` foreshorten
- [ ] `public/game/atlases/` layout + `docs/ART-PIPELINE.md`; `LICENSES.md` manifest schema (frame → source → license → attribution)
- [ ] Confirm CSP/`image.domains`: **bundled same-origin under `public/`** for the core roster; Wix Media CDN reserved for optional/user-content art via the P7 URL-on-the-wire pattern

### AP1 — Shared render loader + animation registry (procedural fallback first) · `dependsOn: AP0`
- [ ] `render/assets.ts`: Phaser `preload` of packed atlases per group with a load-error handler
- [ ] `render/anim.ts`: data-driven registry `entityKind → state → {frames, frameRate, loop}` (adding a monster = data, not code)
- [ ] **Fallback**: on a missing/failed atlas, synthesize a procedural texture per kind (extend today's `makeTextures`) — every enemy/weapon playable the moment its enum exists
- [ ] **Guard test**: core sim dirs (`src/game/arena`, `src/game/overrun`) import NOTHING from `render/assets|anim`; animation stepping uses RENDER dt (wall clock), never sim dt

### AP2 — Sourcing: CC0 placeholders + AI-generated bespoke roster · `dependsOn: AP0`
- [ ] Import CC0 packs (Kenney top-down/dungeon; filtered OpenGameArt CC0/CC-BY only — no CC-BY-SA/GPL) for every kind + gun icon; record each in `LICENSES.md`
- [ ] Generate bespoke frames (tactical-camo human + named monsters) via the authorized AI image tool + `UploadImageToWixSite`; pack into atlases (free-tex-packer/TexturePacker CLI) at ≤1024–2048px
- [ ] Completeness check: every `(kind,state,dir)` referenced by `anim.ts` resolves to a real frame; measure atlas bytes vs budget

### AP3 — Wire real atlases into Arena Survival renderer · `dependsOn: AP1, AP2, A/P-A4`
- [ ] Map sim `enemyKind` enum → atlas animation set; player body + layered rotated weapon; 4-facing for humanoid/dino, rotate for ants/bats; death/attack anims driven by snapshot status transitions; fallback verified by removing an atlas

### AP4 — Overrun renderer reuse (twin-stick, rotate-sprite) · `dependsOn: AP1, AP2, D/P-D0`
- [ ] Overrun scene reuses `render/assets.ts` + `anim.ts` (shared infra, independent enemy logic); rotate-to-aim body; full gun family as swappable layered weapon sprites; projectile frames; lazy-load the enemy atlas during lobby/countdown

### AP5 — Budget/load gate + optional CDN offload · `dependsOn: AP3, AP4`
- [ ] Measure the built bundle: per-atlas bytes, total added weight, preload time on throttled network; target **≤1.5 MB gzipped soft / 3 MB hard**, PNGs ≤2048² (1024² preferred)
- [ ] Confirm block-on-core-atlas + lazy-load-enemy-atlas hides behind the 3 s countdown; if an atlas exceeds budget, move to Wix Media CDN (P7 URL pattern + allowed-host); CI size-check guarding the atlas dir; document final numbers in `docs/ART-PIPELINE.md`

**Open decisions (Art)**
- Which AI image tool is authorized for production art + its output-ownership/license terms (sourcing *approach* is locked: AI + CC0).
- Shared render infra promoted to `src/game/shared/render/` vs the shooter importing from `src/game/arena/render/`.
- Whether Overrun and Survival share one enemies atlas or ship separate rosters (they share the loader; art sets may differ) — impacts bundle budget.
- 4- vs 8-facing granularity for humanoid/dino in the Arena — look/asset-cost tradeoff, settle in AP0 with a visual test.
- Final numeric budget (1.5 MB soft / 3 MB hard is a proposed start) pending AP5 measurement.

**Risks (Art)**
- Determinism leak if art metadata (frame sizes, sprite-derived hitboxes) creeps into the sim — mitigated by the guard test + keeping all sizes/hitboxes as sim constants in meters.
- Licensing contamination — CC0/CC-BY whitelist + `LICENSES.md` per frame; verify AI-tool output-ownership.
- CSP/allowed-host friction — default bundled same-origin; only offload to CDN with the host explicitly allowed + tested.
- Bundle bloat vs static-hosting limits — hard 3 MB cap, per-mode lazy-load, AP5 size gate.
- Facing/foreshorten mismatch — rotate only radially-symmetric enemies; 4/8-facing for humanoid/dino.

---

## Module map (where code lands)

- **Pure core (unit-tested):** `src/game/arena/{types,intent,dash,combat,sim,match,countdown,lobby,roomLink}.ts`
  (+ existing `logic.ts`, `constants.ts`), `src/game/net/protocol.ts`.
- **Adapters (impure, integration/manual):** `src/game/arena/render/` (Phaser scene),
  `src/game/arena/input/keyboard.ts`, `src/game/net/{transport,rtc,sync}.ts`, `src/game/audio/sfx.ts`.
- **React UI:** `src/components/game/Arena.tsx` (shell), `src/components/game/lobby/WarmupRoom.tsx`,
  `src/components/game/hud/{Hearts,DashIndicator,Countdown}.tsx`.
- **Post-ship expansion (planned):** pure core — `src/game/arena/maze.ts` (seeded generator + connectivity),
  powerups/buffs in `sim.ts`/`types.ts`, round tally + co-op spawns/win-rules in `match.ts`, weapon stats in
  `constants.ts`, aim + team + bow projectiles on `types.ts`/`sim.ts`; impure — `src/game/arena/input/mouse.ts` (pointer→aim); UI —
  `src/components/game/scoreboard/Podium.tsx`; extended — `WarmupRoom.tsx`
  (shape/arena/rounds/mutator/weapon/mode/upload controls), `render/scene.ts`, `protocol.ts`, `sfx.ts`,
  `bot.ts` (maze + enemy targeting). Auth/avatar (F4): Wix Members Google login + a server route to Wix Media.
- **Survival (Track A):** pure core — `src/game/arena/survival/{rng,enemy,enemyKinds,steering,waves,behaviors,step}.ts` (+ `mode` on `types.ts`, `resolveEnd`/`centerSpawns`/`createSurvivalWorld` in `match.ts`, entity caps in `constants.ts`); net — quantized/delta snapshots in `protocol.ts`/`sync.ts`; UI — mode toggle in `WarmupRoom.tsx`, `SurvivalHud`.
- **Overrun shooter (Track D):** new game module `src/game/overrun/{types,rng,weapons,intent,projectile,enemies,waves,drops,firing,sim,shooterSession}.ts`; render — `src/game/overrun/render/scene.ts`; page `src/pages/games/overrun.astro`; UI `src/components/game/overrun/Overrun.tsx` (+ its lobby/HUD).
- **Art pipeline (Track E):** shared `src/game/*/render/{assets,anim}.ts`, atlases under `public/game/atlases/`, `docs/ART-PIPELINE.md` + `LICENSES.md`.
- **Members area (Track B):** `@wix/members` auth wiring; server routes `src/pages/api/{avatar,match-result}.ts` (Wix Media upload + Wix Data writes, elevated creds); `src/components/members/{MembersArea,LockedFeature}.tsx` + a `useCapability()` hook; `@wix/pricing-plans` for B3.
- **Assets:** one base musa sprite under `public/` (runtime-tinted to 8 colors) for versus; sprite-sheet atlases (Track E) for the horde games.
- **Keep untouched:** Astro site chrome (`layout/`, `footer`, `navbar`), the vite 6.4.3 override.

## Open decisions (recommendation in **bold**)

1. Trystero signaling: **Nostr + BitTorrent fallback, redundancy on** / Firebase-Supabase / self-hosted WS.
2. TURN provider: **Metered Open Relay free tier** now → Cloudflare Realtime TURN at scale.
3. Host election: **lowest alive peer id** (deterministic) / lowest-aggregate-RTT (only if lag complaints).
4. Eliminated player who refreshes: **returns as spectator only** / can't rejoin / revive.
5. Turn-based game #2 identity (Track C) — pick via a short brainstorm before T0.
6. Custom-avatar transport (F4): **DECIDED (2026-06-22) — Wix Media CDN URL on the wire, gated on Google (Gmail) login** (avatars + future player data link to the account). Supersedes the earlier P2P-blob option.
7. Maze algorithm (F6): **recursive backtracker (randomized DFS)**, seed broadcast in `start` / randomized Prim's / Eller's; add loops by knocking out a few extra walls.
8. Haste-powerup buff model (F7): **DECIDED (2026-06-22) — timed (~8 s, cooldowns ×0.5)** (not permanent/stacking).
9. Rounds default (F5): **DECIDED (2026-06-22) — best-of-3; a tie for a podium place → sudden-death extra round(s)** until decided.
10. Identity/auth provider (Track B B0): **DECIDED (2026-07-08) — Wix Members managed login, email + Google + social**; sign-in is OPTIONAL (anonymous play preserved), member features shown locked with hints. (Supersedes the earlier Google-only note.)
11. No-mouse / touch fallback for free-aim (F8/P11): **DECIDED (2026-07-06) — aim falls back to the movement-facing angle** when no pointer aim is present (keyboard-only plays as before). Richer twin-stick/drag-to-aim deferred.
12. Weapon balance (F9/P12): start at sword 2 m·90°·1 s / spear ~3.5 m·narrow·slower / knife ~1 m·fast / **bow** ranged (arrow ~12 m/s, ~15 m range, slow draw, little/no knockback) — **tune in playtest**.
13. Co-op difficulty (F10/P13): **fixed bot count** / escalating waves (pairs with rounds) / scales with player count — **decide at P13**.

## Risks (carry into every phase)

- **TURN is non-negotiable** from P2 or strict-NAT users silently fail to join.
- Mesh ceiling ~10 peers — cap **strictly at 8**, tear down kicked/left connections.
- Flaky public relays affect only the initial handshake — mitigate with redundancy + fallback + a "connecting…" state.
- Cross-browser WebRTC/audio quirks (Firefox lag, Safari/iOS autoplay) — test all three.
- Malicious host can cheat/see hidden state (inherent to host-authoritative P2P) — documented, acceptable for casual play.
- **Determinism leak:** the old `ArenaScene` uses `Math.random` for wanderers — that must **not** enter the sim core.
  The expansion **re-arms this risk** (maze + powerup spawns): generate on the host from a **seed broadcast in `start`** and inject it — never `Math.random()`/clocks inside the core.
- **Avatar payloads (F4):** uncapped uploads can blow the relay/handshake budget — resize/crop client-side and cap (≤~8 KB); validate type/size; treat as untrusted cosmetic data (no sim effect).
- New deps must build under **vite 6.4.3 + Astro 5.8 + `@wix/astro`** on static hosting.

---

## Track F — Squid (co-op octopus walker) — **SHIPPED 2026-07-10** · `dependsOn: none (first consumer of the generic SyncEngine)`

1–8 players cooperatively walk a verlet-physics octopus 5 m to an arched finish line — each player
holds ONE leg at a time (click to grab, Space to cycle; ←/→ swing, hold ↑ to lift/replant). Planted
legs are the base that propels the body (QWOP-style, emergent from pinned tips + rigid chains).
Rounds are timed; the host posts finish times to a per-stage **team highscore board** shown in the
waiting room. Two stages: **Boardwalk** (flat) and **The Gap** (0.9 m hole at 3 m — head in ⇒ game over).

- **Module map:** pure core `src/game/squid/{constants,stage,types,verlet,octopus,control,intent,sim,match}.ts`
  (fully unit-tested, no clock/RNG/engine imports; clock accumulates injected `dt`); net
  `src/game/squid/net/{adapter,session}.ts` over the now-generic `SyncEngine<W,I>` (`net/sync.ts` —
  arena byte-identical via `arenaSyncAdapter`; this closes the Track D "generalize session/sync" open
  decision); render `src/game/squid/render/{contract,scene}.ts` (side view, per-player leg tints);
  UI `Squid.tsx` + `SquidWarmupRoom.tsx` (stage select + top-10 dashboards); page `games/squid.astro`
  + live cabinet in `lib/games/registry.ts`; persistence `lib/squid/scores.ts` +
  `/api/squid-result` (host-reported, sanity-bounded) + `/api/squid-scores` reading a per-stage
  top-10 JSON doc in `GameScores` (elevated get/save only — no query builders).
- **Live-verified (headless Playwright):** lobby → stage select → countdown → grab (click + Space) →
  walk → **Finish! 3:27.1** → score saved → dashboard row; API bounds all 400; two-tab roster sync
  over live Nostr relays. Playtest caught + fixed a real clock bug (timer counted frames, not dt).
- **Fixed 2026-07-10 (playtest-fixes round,
  `docs/superpowers/specs/2026-07-10-squid-playtest-fixes-design.md`):** collapsed stance — added a
  capped support spring (`STAND_HEAD_Y_M=0.75`, `SUPPORT_PER_LEG_MPS2=2.5`, `STAND_GAIN=50`; applied
  to the head **and** each planted leg's root, since a head-only push was cancelled by the solver;
  equilibrium ≈0.575 m head height with all 8 planted, sags with fewer, exactly zero with none);
  sticky-lifted abandoned legs dangling below the floor — legs with no controller are force-unlifted
  every tick (they drop and re-plant) and `solve()` no longer skips ground clamping for lifted points.
  Also landed this round: The Gap widened 0.5 m → 0.9 m (span 3.0–3.9); host-only "Next level ▶" on
  the finish overlay chains stage1 → stage2 via the normal `squidStart` broadcast (no button on
  stage2 or after a fail; each stage still scores separately).
- **Open follow-ups (feel, next playtest):** solo progress walls at The Gap's edge — re-evaluate now
  that stance + the wider hole have landed; `SWING_LIFTED_MPS=0.5` is deliberate but sluggish
  (raising it is capped by the <0.15 m head-drift test); more stages; per-member stats via Track B;
  touch controls; SFX polish; WASD aliases in the controls legend.

---

## Track G — Road Madness (arcade driving party game)

**Full requirements + delivery roadmap:**
`docs/superpowers/specs/2026-07-10-road-madness-design.md`

**File-level implementation plan:**
`docs/superpowers/plans/2026-07-10-road-madness.md`

Road Madness targets 1–8 players and one shared deterministic arcade-vehicle core across four
modes: **Race** (1/3/5 laps, rear/cabin pseudo-3D views), **Last Madman Standing** (Derby vs
Monster bumper damage), **Carnage** (two-minute destructible monster-zombie city), and **Bomb Tag**
(ram-to-pass hot potato, the recommended fourth mode). Delivery order is handling/derby local slice
→ road-specific online room/authority → derby feel → Race → Carnage → Bomb Tag → ship/widen.

Tracking:

- [x] Product requirements, mode rules, multiplayer architecture, UX, performance, and quality gates.
- [x] Pure fixed-30-Hz driving/collision core; Derby/Monster data; bumper speed/angle/mass damage.
- [x] Deterministic input-driven bots; Last Madman wreck/win lifecycle; 15 focused unit tests.
- [x] Procedural angled Phaser pit + React garage/HUD/results at `/games/road-madness`.
- [x] Playable-alpha arcade registration; production build and headless browser smoke green.
- [x] Local competitive lifecycle: nitro, sudden death, best-of rounds, and collision juice.
- [x] Road protocol/codec: namespaced messages, quantized keyframes/deltas, and byte budgets.
- [ ] Online 1–8 player room, session adapter, interpolation, host migration, and live playtest.
- [ ] Race, Carnage, Bomb Tag, content/accessibility, cross-browser/TURN, production ship.

---

## Progress log

- **2026-07-13** — **Track F: Squid rope-leg renderer shipped.** Per
  `docs/superpowers/specs/2026-07-13-squid-rope-legs-design.md`: each leg now a 15-joint rope
  with anchors at the old root/mid/tip fractions (indices into `leg.pts`), renderer hit-test
  expanded to the lower half (from the old pts[1..2] two-point slice), planted-tip dot now draws
  at `pts[TIP]` (index 14). Joints are invisible — the rope renders as a smooth polyline only,
  no dot markers. Solver iterations doubled 8→24 to stabilize the longer chains; stance spring
  now lifts head + each planted leg's upper chain (`pts[0..ROOT_ANCHOR]`) as a single block with
  `STAND_GAIN=80`, achieving 8-planted equilibrium ≈0.60 m head height. Walk advance 0.55 m per 2 s
  (the review probe measured 0.4536 m on the 3-joint rig under identical inputs). Stage times are not
  comparable with the 3-joint era. 547 tests green, tsc clean.

- **2026-07-10** — **Track F: Squid playtest-fixes round shipped.** Per
  `docs/superpowers/specs/2026-07-10-squid-playtest-fixes-design.md`: force-unlift legs with no
  controller each tick and dropped `skipGround` from `solve()` so no point ever ends a tick below
  the floor (fixes the sticky-lifted-leg bug); widened The Gap 0.5 m → 0.9 m (span 3.0–3.9); added
  a capped support spring for an active stance (`STAND_HEAD_Y_M=0.75`,
  `SUPPORT_PER_LEG_MPS2=2.5`, `STAND_GAIN=50`) — applied to the head *and* each planted leg's root
  (a head-only nudge is cancelled by the solver), measured equilibrium ≈0.575 m head height with
  all 8 planted, sagging with fewer, zero force with none; and a host-only "Next level ▶" button
  on the finish overlay that chains stage1 → stage2 via the normal `squidStart` broadcast, each
  stage still scoring separately. 456 tests green, tsc clean.

- **2026-07-10** — **Road Madness online foundation (RM2 / Task 7).** Added a Road-owned
  `rHello`/`rStart`/`rInput`/`rSnap`/`rDelta`/`rEvent` protocol that rejects other-game and invented
  tags while keeping remote peers at the existing clamped intent-only trust boundary. Added compact,
  deterministic world keyframes and exact-base deltas: centimetre positions/velocities, milliradian
  headings, quantized health/timers/nitro, complete round/migration state, stable player ordering, and
  all impact/wreck/nitro transients. New tests cover every message family, hostile inputs, quantized
  idempotence, all event shapes, null/final outcomes, stale-delta rejection, roster changes, and a
  maximum eight-car byte budget. Road suite is 33/33 and Astro typecheck reports zero errors.

- **2026-07-10** — **Road Madness requirements + playable Last Madman alpha (Track G).** Defined
  the four-mode product and staged roadmap; chose **Bomb Tag** as mode four because its hot-potato
  chase reuses bumper qualification while staying distinct from damage derby. Implemented a pure
  deterministic vehicle slice (`src/game/road-madness/`): acceleration/brake→reverse, speed-scaled
  steering, grip/handbrake/drag, class mass/health/handling, stable circle impulse/separation, authored
  front/rear bumper arcs, speed+angle+mass damage, pair cooldown, wreck/winner state, and ordinary-input
  chase bots. Added the procedural angled Phaser pit, Derby/Monster garage, health/speed/damage HUD,
  visual impacts, countdown, spectate/result/rematch, `/games/road-madness`, and arcade cabinet. Added a
  validated, expiring local-match checkpoint after a timed trace proved unrelated Vite HMR was remounting
  the React island at the garage; active matches now restore across HMR/refresh. 15/15 Road tests and Wix
  production build green; headless Chrome verified garage→Start→live tick/input/car movement and an
  HMR restore with one canvas and no garage reset. Whole-repo tests/typecheck remain blocked only
  by unrelated uncommitted Arena Survival WIP (`survival/step.ts`/test); Road Madness has no diagnostics.

- **2026-07-10** — **merge-reconcile(overrun): netcode made per-game.** Merging `main` (which had landed
  Squid's own "netcode per game" resolution — `1fffecb`) into `game/overrun-slice` surfaced the same
  architectural fork on the Overrun side: this branch had made the shared `net/sync.ts` a generic
  `SyncEngine<W,I>`/`SyncAdapter`, but `main` had reverted shared `net/{sync,session,protocol}.ts` back to
  arena's original non-generic line. Resolved to the repo convention: shared `src/game/net/**` stays
  arena's (untouched, non-generic); **Overrun now owns its full netcode under `src/game/overrun/net/`** —
  `engine.ts` (its own copy of the generic `SyncEngine`/`SyncAdapter`, carrying the cadence/`lastSent`
  snapshot-or-delta logic, the `update` message kind, and the host-election-staleness fix in
  `onPeerLeave`), `protocol.ts` (own `{v,m}` envelope + the `oHello/oStart/oInput/oSnap/oDelta` wire kinds,
  moved out of the shared protocol), `adapter.ts`, and `session.ts` — mirroring how Squid's own
  `src/game/squid/net/{engine,protocol,adapter,session}.ts` already does this. Deleted
  `src/game/net/arenaAdapter.ts` (arena goes back to its inline engine). Overrun's engine keeps its
  cadence/delta/`update` extension and the peer-leave host-refresh fix **game-locally** — Squid's own
  engine copy doesn't have either, confirming per-game really means per-game (no shared generic engine
  reintroduced). 312+ tests, tsc clean, build green.
- **2026-07-10** — **Overrun thin slice SHIPPED (Track D, branch `game/overrun-slice`).** Subagent-driven TDD
  build of the full vertical slice per `docs/superpowers/plans/2026-07-09-overrun-slice.md`: pure deterministic
  sim core `src/game/overrun/` (coordinate-hash RNG carried by a world seed, fixed 30 Hz, purity-guard test),
  3 hitscan guns + reload/pistol-fallback, rusher/tank waves (budget × frozen partySize, perimeter spawns),
  drops (weights+pity+cap), downed/revive with revive-before-wipe, XP → 6-perk global pool (non-blocking picks),
  stats→merch scorecard; quantized keyframe/delta codec @10 Hz (worst-case keyframe 4156 B / delta 3135 B,
  budget-tested), own `SyncEngine`/`SyncAdapter` copy under `src/game/overrun/net/` (per the per-game netcode
  convention — shared `net/` stays arena's), `OverrunSession` with client interpolation + 8-peer/host-migration
  LocalHub e2e + 8-player mesh cap; procedural fake-2.5D renderer + React island/HUD/lobby; `/games/overrun`
  page replaces the Tactics card. **Game separation:** zero arena imports in overrun (recursive test), own
  primitives/wire/lobby/HUD. Fixed along the way: plan's stepEnemy self-contradiction (signed clamp),
  revive-helper pre-combat snapshot, engine host-election staleness on peer-leave (fixed in overrun's own
  `net/engine.ts`). 302 tests, tsc clean, build green (40 routes), HTTP smoke verified. Final whole-branch
  review (adversarial) caught + fixed pre-merge: **ended-phase never broadcast off the snapshot cadence**
  (clients hung on wipe — forced phase-transition keyframe + duplicate suppression, networked game-over e2e
  added), unbounded `pending` wire growth in endless runs (`MAX_PENDING` 150 + suffix-drop `pdo` delta),
  same-tick multi-level duplicate perk offers, digit-string guards, separation guard extended to overrun components,
  `countdownMs` consumed. 312 tests. **Owner actions:** live cross-device playtest + balance pass. Known follow-ups
  (accepted): dead re-claim/announce branch in both sessions, engine listener accumulation on rematch, `%` stripped
  from merch sub by sanitizer, shot events lack playerId (SFX attribution heuristic), lobby-host vs engine-host
  divergence for a mid-match late joiner.
- **2026-07-10** — **Track F: Squid shipped (subagent-driven, 14-task plan).** New co-op octopus
  walker per the approved spec (`docs/superpowers/specs/2026-07-09-squid-game-design.md`; plan in
  `docs/superpowers/plans/2026-07-09-squid-game.md`). Pure fixed-iteration verlet core (head hub +
  8×3-segment legs; planted tips pinned; lifted legs keep their chain but skip ground support; lift
  cap is head-relative so the rig falls into the hole as one piece), leg-ownership reducers,
  edge-triggered intents + `coerceSquidIntent` trust boundary, and a **generic
  `SyncEngine<W,I>`/`SyncAdapter`** refactor (arena wire-identical) that squid rides with its own
  session (explicit-host parity). Per-stage team top-10 persisted via `GameScores` single-doc rows +
  trusted API routes. Review loop caught real bugs pre-merge: spaghetti-leg detachment (constraints
  were being dropped for lifted legs), a per-click phantom sim tick, non-host "Saving…" stuck state,
  leaderboard-wipe on transient read errors — and the live Playwright playtest caught the round clock
  counting frames instead of dt (3×+ fast timers). 226 tests green (56 new), tsc clean, build green; solo
  finish + score save + dashboard verified in-browser. Feel follow-ups logged in Track F.
- **2026-07-09** — **B1b per-game avatars shipped + data model decided.** Finalized the Track B data
  model (data-type collections keyed by `(memberId, gameId)`; leaderboard metrics as first-class columns).
  Built the avatar slice: created `PlayerAvatars` (ADMIN, deterministic `<gameSlug>-<memberId>` id; verified
  upsert/get live), pure `resolveGameAvatar` (per-game → global → shape, TDD), elevated `playerAvatars`
  adapter, `games` registry + allowlist, `/api/avatar` `gameId` branch, per-game uploader in Account → Player
  (SSR-resolved) + Arena lobby (member-gated), and full wire→render: `avatarUrl` on hello/start
  (`coerceAvatarUrl` https-only trust boundary) → `scene.ts` composites a circular avatar texture over the
  body with shape fallback on any load/CORS failure. 151 tests, tsc clean, built.
- **2026-07-09** — **P2P cross-device connectivity fixed (root cause: no TURN relay).** Symptom: other
  players couldn't join even on the same home wifi — only a 2nd tab on the host's own PC connected.
  Systematic-debugging confirmed signaling (Nostr relays) works (the same-PC tabs matchmake through the
  same public relays a phone would use); the failure was ICE. STUN-only ICE can't pair two devices behind
  one home NAT (mDNS `.local` host candidates don't resolve across devices; same-NAT reflexive pairs need
  router hairpinning), and there was **no TURN relay** to fall back on (`Arena.tsx` shipped STUN-only
  despite `rtc.ts` flagging TURN as required). Fix: pure TDD'd `net/ice.ts`
  (`buildIceServers`/`iceConfigFromEnv`, 9 tests) reads `PUBLIC_TURN_URLS/USERNAME/CREDENTIAL` +
  optional `PUBLIC_STUN_URLS`, STUN-only when unset (no regression). Verified the `PUBLIC_*` values
  inline into the client bundle via a sentinel build. **Owner action to finish:** provision free TURN
  creds (metered.ca), `wix env set` the three PUBLIC_TURN_* vars, redeploy, verify cross-device. 147 tests, tsc clean.
- **2026-07-08** — **P12 bow shipped + Track B (members area) designed.** Finished P12: new pure
  `arena/projectile.ts` + `World.projectiles`; ranged weapons loose host-simulated arrows (deterministic
  `owner#tick` id) stepped/expired/hit in `sim.ts`, carried in the snapshot; bow in the picker; arrow/held-bow
  sprites + `"shoot"` SFX. 132 tests, tsc clean, built, committed (`5e81f25`), deployed. Then brainstormed +
  rewrote **Track B** into a **members area** (Wix Members email+Google+social, OPTIONAL login with
  locked-feature hints): B0 auth foundation → B1 avatar upload (absorbs F4: jpg/png → resize/crop → `/api/avatar`
  → Wix Media URL on the member) → B2 progress/stats → B3 freemium (Pricing Plans) → B4 ads/ads-off (later).
  Capability model (anonymous / signed-in / paid) drives a reusable `<LockedFeature>`. Design only — first build
  step is B0 (needs Wix-dashboard login config).
- **2026-07-08** — **Roadmap expanded: Survival mode + Overrun shooter + Art pipeline (design only).** Brainstormed
  (skill) + ran an 8-agent design workflow (5 area designs → adversarial critics → synthesis) grounded in the codebase.
  Added **Track A · Survival** (co-op PvE, P-A0…P-A5: bandwidth/determinism substrate → mode plumbing + `versus`
  rename → enemy/wave/one-archetype → step reducer + net → behaviors/roster/lifecycle → UX), a new **Track D — Overrun**
  (Crimsonland-style co-op horde shooter, P-D0…P-D6; supersedes the Track C "Tactics" card), and a cross-cutting
  **Track E — sprite-sheet art pipeline** (procedural fallback so gameplay TDD never blocks on art). Track C (Tactics)
  reframed/deferred. Build order locked: finish P12 projectiles → Survival → Overrun. Biggest correction from the
  critique: the naive full-world JSON snapshot won't survive hordes — entity caps + quantized/delta @10 Hz +
  coordinate-hash RNG pulled into the P-A0 foundation. User decisions: independent enemy engines; survival =
  escalating level campaign + revive + endless; shooter name **Overrun**; art = AI-generated + CC0 placeholders. No
  feature code yet — also shipped this week: melee weapons feel + render passes (see git).
- **2026-07-06** — **Implementation started (P6, P7-F3, P11 landed).** **P6:** pure `joinedIds` connect-sound
  detection + `"join"` SFX + first-gesture audio unlock; two-phase death tween (recoil → spin-up phase-out).
  **P7-F3:** new pure `arena/cosmetic.ts` (`Shape` + `coerceShape` wire-boundary), threaded shape through
  `PlayerMeta`/protocol/`lobby`/`session`/`soloDriver`; 4-shape picker in `WarmupRoom` + per-shape procedural
  body textures. **P11 (free-aim, core change):** `Intent`/`RawInput` gain optional `aim` (falls back to
  facing), `PlayerState.aim` + `AttackState.aim`; `combat.inAttackCone` + `sim` knockback now aim-vector based
  (facing kept for the body); `directionAngle`/`aimVector` helpers; pure `input/mouse.screenDeltaToWorldAngle`
  (un-projects the 2.5D y-squash); scene injects pointer aim + sweeps the blade around the locked aim; bots aim
  at their target; `coerceIntent` finite-checks aim. TDD throughout (+16 unit tests → **112 total**), `tsc`
  clean (caught a latent Phaser-typings bug in the F3 diamond shape), build green. **Pending:** live in-browser
  playtest of audio/visual + peer sync (headless can't drive it). Decisions locked: #11 no-mouse aim fallback.
- **2026-06-22** — **Expansion round 2 + decisions locked.** Locked F4 → **Wix Media CDN avatars gated on
  Google (Gmail) login** (avatars + future player data attach to the account; pulls Track B W0 auth forward
  and sets the provider to Google), F7 → **timed** haste, F5 → **best-of-3 with a sudden-death extra round
  to break a podium-place tie**. Added three new Track A features: **P11** free-aim combat (F8 — keys move,
  mouse aims; `Intent.facing` 4-way → continuous `aim`, combat cone generalized to an aim vector), **P12**
  weapon types (F9 — sword/spear/knife + **bow** loadout; melee uses the existing cone (`resolveAttack`
  already param'd), bow is the first **ranged** weapon → adds a deterministic `World.projectiles` system in
  `sim.ts`), **P13** co-op mode (F10 — humans vs. a bot team, no friendly
  fire, team-based win/lose, players spawn center). Updated Track B W0 (Google login), Module map, and
  3 new Open decisions (11–13). Planning only — no feature code yet.
- **2026-06-22** — **Lobby tuning + roadmap expanded.** Shipped a `WarmupRoom` pass (default 2 bots that
  clear when a 2nd player joins; Start gated at ≥2 participants with a hover hint; removed the redundant
  "Practice vs bots" button — `SoloDriver` core kept for future re-exposure). Added **post-ship Track A
  expansion** phases: **P6** lobby feel & death juice (F1 connect sound, F2 death phase-out), **P7** player
  customization (F3 shapes, F4 uploaded image avatars — cosmetic-only), **P8** rounds & podium scoreboard
  (F5), **P9** arena types / auto-generated labyrinth (F6), **P10** mutators / haste powerups (F7). Maze +
  powerup randomness routed through host-seeded `start` broadcast to keep the sim core deterministic; 4 new
  open decisions + 2 risks logged. Planning only — no feature code yet.
- **2026-06-18** — Roadmap created. Arena 2D single-player prototype shipped & deployed.
- **2026-06-18** — **P0 complete.** Pure sim core landed (`types`, `intent`, `dash`, `combat`,
  `sim`, `match`, `countdown` + generalized `logic`), 61 unit tests, project builds. Adversarial
  review found & TDD-fixed 2 real dash bugs (2 m overshoot; dashing-into-wall freeze) and closed
  6 coverage gaps. Core is engine/transport-free with injected `dt` (no clocks/RNG).
- **2026-06-18** — **P1 complete.** Sim-driven Phaser 4 renderer (fake-2.5D: y-sort, tilted floor,
  shadows, death-jump tween, procedural tinted musa, locked-direction sword); React HUD
  (hearts / dash sweep / countdown); Web Audio SFX; deterministic `bot.ts` for solo play; phase-driven
  `Arena.tsx` shell. 66 tests, build green, verified live in-browser.
- **2026-06-18** — **P1 balance pass** (user feedback): added a **1 s attack cooldown** (`ATTACK_COOLDOWN_S`,
  gated in `sim.ts`, shown via a new HUD attack badge — `CooldownBadge` reused for dash + attack) and
  **1 m knockback** away from the attacker on a hit (`KNOCKBACK_M`, clamped to field). TDD: 3 new sim
  tests (cooldown gating, knockback, knockback clamp). 69 tests, build green, verified live.
- **2026-06-19** — **2.5D sword projection fix** (user feedback: up/down attacks felt like misses). The sim
  hit cone is symmetric in world space (added up/down combat tests to prove it), but the sword sprite was
  drawn un-projected while the field is vertically foreshortened (`Y_SCALE`), so pointing up/down it visually
  over-reached and players mis-aimed. Fix: project the sword swing onto the ground plane (y × `Y_SCALE`) so its
  on-screen reach matches the real reach in every direction. Build green; live-verified up-attack hits.
- **2026-06-18** — **Combat feel pass 2** (user feedback): unified the figure size so the drawn musa ==
  the physical body (`FIGURE_M` 0.5 → 1.5; `VIS_R` derived from `FIGURE_RADIUS_M`), so hit detection now
  covers the **whole body** (`resolveAttack` uses `reach + FIGURE_RADIUS_M`, not center-only). Sword sprite
  now **pivots at the player and sweeps the 90° cone** during a swing (animated by attack TTL), so the
  visual traces the actual hit area. TDD: combat "hits the whole body" test. 97 tests, build green;
  live-verified (hit at 2.5 m + sword sweep ~90°, 0 console errors).
- **2026-06-18** — **Combat balance pass** (user feedback): attack reach now matches the sword image
  (`SWORD_REACH_M` 1 → 2 m; the sword sprite geometry is derived from the constant so image == hit range),
  and knockback bumped to `reach + 1` (= 3 m, `KNOCKBACK_M` derived). TDD: new combat tests (1.8 m hits;
  `KNOCKBACK_M === SWORD_REACH_M + 1`). 96 tests, build green; live-confirmed the 1.8 m hit in practice.
- **2026-06-18** — **P3 + P4 complete (wired & locally playable).** Built the netplay `Session` (roster
  presence, host election, Start→countdown→match), wired the host-authoritative `SyncEngine` into a
  driver-agnostic renderer (`MatchDriver`: net `Session` or `SoloDriver`), and the `WarmupRoom` UI
  (name, 8-color musa picker, party list + kick, copyable `?room=` join link, Start + bots). Combat/
  death/win render on every peer by diffing host snapshots; peer-drop marks players dead; rematch +
  back-to-room. **94 tests** (full lobby→start→play + bot + migration + peer-drop flows under `LocalHub`),
  type-clean, build green. Browser-verified: lobby + room-link + Practice (move/attack/4 players, 0 errors);
  Trystero P2P confirmed connecting (incidental ghost-peer synced match). **Manual TODO:** real 2-browser
  cross-machine playtest + TURN for strict-NAT (P5). Next: **P5** polish/hardening + live cross-browser.
- **2026-06-18** — **P2 net engine complete (under LocalHub).** Built `net/{transport,protocol,election,sync}`
  + Trystero adapter `net/rtc.ts` (installed `trystero`). Host-authoritative sync: clients send inputs-only,
  host runs `stepWorld` + broadcasts snapshots; deterministic host election + migration (lowest alive id);
  `coerceIntent` anti-cheat boundary. **84 tests** (15 new net tests, all green via in-memory multi-peer
  `LocalHub`), `net/*` type-clean, build green. **Remaining for P2:** prediction/interpolation polish, wiring
  the engine into the scene (with P4 lobby), and manual cross-browser real-peer verification (needs live
  relays/2 machines — can't be driven headlessly). Next: **P3** (networked combat/match) — likely paired with P4 lobby to enable real-peer testing.
