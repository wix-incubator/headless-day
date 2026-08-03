# Overrun — thin vertical slice (Track D) · Design

**Date:** 2026-07-09 · **Status:** approved (user, 2026-07-09) · **Supersedes:** narrows Track D
(ROADMAP P-D0…P-D6) to a first shippable slice; adds XP/perks + stats→merch extensions.

## Decisions locked in this brainstorm

1. **Build order override:** Overrun ships before Survival, and is **decoupled** from Track A —
   the P-A0 substrate is built as game-agnostic net infra inside this work (Survival adopts it later).
2. **Scope:** thin vertical slice (below), then widen. Endless waves only — no 5-level campaign yet.
3. **Extensions (user-requested):** health pickups, XP + level-up perk picks, per-player run stats
   (shots / hits / accuracy / kills / final wave / level) → end-screen score card → **merch print**
   via the existing `buildShopUrl` funnel.
4. **Perk shape:** global perk pool now; perk defs carry a `tags` field so class-/weapon-scoped
   skills can be added later without a sim rework (hybrid path).
5. **Perk pick UX:** non-blocking overlay — 3 cards, keep playing, pick with 1/2/3 (or click);
   offers queue if you level again. The pick travels as normal input intent.
6. **Net approach:** full P-A0 substrate now — quantized **keyframe+delta** snapshot codec and a
   game-agnostic `SyncEngine`, built before gameplay. Arena migrates onto the generic engine via an
   adapter with zero behavior change.

## 1. What ships in the slice

A separate game at `/games/overrun` (module `src/game/overrun/`): 1–8 humans co-op, WASD moves,
mouse aims (free-aim reused from Arena), hold-LMB fires, R reloads. Endless escalating waves of two
enemy kinds — **rusher** (fast, fragile) and **tank** (slow, high HP, heavy contact damage) — spawn
on the field perimeter and chase the nearest living player. **No friendly fire, structurally**
(hitscan queries enemies only; there is no bullet-vs-player code path).

- **Guns (3, all hitscan):** pistol (infinite-ammo fallback), shotgun (8 pellets), rifle
  (pierce 1). Single active weapon; kills roll **weapon drops** and **medkits**; auto-pickup swaps
  the gun with a fresh full mag. Start numbers from the ROADMAP tuning table; tune in playtest.
- **Downed/revive:** 0 HP → downed (not dead); a teammate standing close revives over ~3 s, or
  wave-clear auto-revives everyone downed; full-party-down → game over. Revive-before-wipe
  ordering is defined: revives resolve before the wipe check in the same tick.
- **XP + perks:** kills grant XP to the killer; level thresholds enqueue a 3-perk offer rolled by
  coordinate-hash. Starter pool (6): +fire rate, +move speed, +damage, +max HP, faster reload,
  +pickup radius. Multiplicative stacking resolved by pure `effectiveStats(player)`.
- **Stats → merch:** per-player `{shots, hits, kills}` accumulate in the world; accuracy and score
  are derived. The end screen shows a score card (wave reached, kills, accuracy, level) and a
  "print it" link into the existing merch funnel (`sanitizePayload` + `buildShopUrl` in
  `src/lib/merch/print.ts`), e.g. title `OVERRUN · WAVE 12`, sub `342 KILLS · 78% ACC · LVL 9`.
- **Art:** procedural textures only (camo-green soldier disc with a layered rotated gun, red
  rusher blob, big dark tank blob), per Track E's fallback-first rule. Oscillator SFX like Arena.
- **Site wiring:** `index.astro`'s "Tactics — Coming soon" card is replaced by Overrun (play,
  `/games/overrun`).

**Out of scope (widen later):** campaign levels + Endless unlock, the other 6 guns (auto-rifle,
SMG, gauss, rocket, flamethrower, MG/heat), crawler/swarm-flyer/spitter enemies, pity tuning
beyond a basic anti-flood counter, sprite atlases (Track E), Track B highscore persistence,
touch/gamepad input, bots.

## 2. Architecture

Three layers, built strictly in this order. The sim layer imports nothing from net/render layers
(guard test).

### Layer 1 — generic net substrate (absorbed P-A0), in `src/game/net/`

- **`SyncEngine<W, I>`** parameterized by a `GameNetAdapter<W, I>`:
  `{ step(w, intents, dt), coerceIntent(raw): I, encodeSnapshot(w, seq): msg[], applySnapshot(w, msg): W, electFrom(w, connectedIds) }`.
  Arena supplies an adapter that reproduces today's exact behavior (per-frame full JSON
  snapshots); its existing test suite must stay green unchanged.
- **`codec.ts` (pure):** quantization helpers (positions → int cm, health/ammo → int, short field
  keys) and a **keyframe+delta** scheme: full snapshot every ~1 s (10 snapshots), deltas carry
  only changed/added/removed entities by id, all sequence-numbered. A client that misses a delta
  ignores further deltas and waits for the next keyframe — no ack channel, no resend.
- **Cadence:** Overrun's host steps the sim on a **fixed 30 Hz tick** (accumulator over
  render frames) and snapshots at **10 Hz**. Clients render ~120 ms behind via a pure
  `interp.ts` that lerps player/enemy positions between the last two snapshots (host renders the
  canonical world at full rate). Arena keeps its current cadence.
- **Entity caps (constants):** ≤60 live enemies, ≤24 pickups, ≤32 events per snapshot. All slice
  guns are hitscan, so **no projectile ever serializes**; tracers/kills/muzzle flashes travel as a
  transient per-snapshot event ring.
- **Budget check:** measure real keyframe/delta bytes in a LocalHub test (8 players + 60 enemies);
  keyframe target ≤ ~2 KB, steady-state deltas well under.

### Layer 2 — pure deterministic sim, `src/game/overrun/`

Files (each with a colocated `.test.ts`, TDD):

- `types.ts` — `ShooterWorld{ tick, phase:'playing'|'ended', seed, wave, waveState, partySize,
  players: Record<PlayerId, ShooterPlayer>, enemies: Enemy[], pickups: Pickup[],
  events: GameEvent[], score, spawnSeq, pity }`;
  `ShooterPlayer{ id, pos, aim, health, maxHealth, status:'alive'|'downed'|'dead', weapon,
  ammo{mag,reserve,reloadRemaining,fireCooldown}, xp, level, perks: PerkId[],
  pendingOffers: PerkOffer[], stats{shots,hits,kills}, reviveProgress }`.
  `partySize` is frozen at each wave start (proportional budget is immune to mid-wave churn).
- `rng.ts` — coordinate-hash `hash(seed, ...coords) → [0,1)` (splitmix-style avalanche; **no
  advancing cursor**, so an extra/missing upstream draw cannot shift downstream values and host
  migration cannot fork RNG state). Draw coords are stable: spread =
  `hash(seed, tick, playerId, pelletIndex)`, drop = `hash(seed, tick, enemyId)`, offers =
  `hash(seed, tick, playerId, slot)`, spawn = `hash(seed, wave, spawnSeq)`.
- `weapons.ts` — 3-gun table `{damage, rpm, mag, reserve, reloadS, spreadDeg, pellets, range,
  pierce}`: PISTOL 12/300/12/∞/1.2 s/2°/1/20 m/0 · SHOTGUN 8·pellet/70/6/36/1.0 s/9°/8/12 m/0 ·
  RIFLE 34/220/10/60/1.6 s/1°/1/40 m/1. `coerceWeapon` wire boundary.
- `perks.ts` — `PerkDef{ id, name, blurb, mods{fireRateMult?, moveSpeedMult?, damageMult?,
  maxHpBonus?, reloadMult?, pickupRadiusMult?}, tags: string[] }` (tags empty now; future
  class/weapon scoping filters on them). `rollOffers` → 3 distinct perks; `effectiveStats(player)`
  resolves stacking (multiplicative, order-free).
- `intent.ts` — `ShooterIntent{ move:{x,y}, aim, fire, reload, perkPick: 0|1|2|null }`;
  `coerceIntent` sanitizes only these fields (never positions/health/enemies); aim is
  host-consumed input, never a determinism input on clients.
- `firing.ts` — pure `fireGun(gun, ammo, effStats, aim, rngDraws) → {hits, ammo, events}`:
  RPM gating via `fireCooldown`, per-pellet spread, hitscan ray vs enemies (nearest within range;
  rifle pierces 1), mag/reserve decrement, reload state machine (blocks firing, not movement),
  both-empty → infinite pistol. 30 Hz tick vs ≤300 RPM (=5 shots/s) means multi-shot-per-tick
  cannot occur in the slice; a test documents the ceiling.
- `enemies.ts` — `Enemy{ id, kind:'rusher'|'tank', pos, health }` + per-kind constants
  (speed/hp/contactDps/radius/xp); chase-nearest-alive; **sorted-id iteration + lowest-id
  tie-breaks** for determinism.
- `waves.ts` — `budget(wave) × playerScale(partySize)` points spent on a kind mix; perimeter spawn
  positions via hash; concurrent-enemy cap; wave cleared → short intermission (ticks in world) →
  next wave; `spawnSeq` increments per spawn and rides the snapshot.
- `drops.ts` — weighted roll on enemy death (weapon: shotgun/rifle; medkit) with base ~15% and a
  simple anti-flood counter (`pity` in world, suppresses drops when many pickups are live);
  `Pickup{ id, kind, pos, ttl }`; medkit heals flat on pickup; weapon pickup replaces the gun with
  a fresh full mag (brief re-swap guard).
- `stats.ts` — accuracy = hits/shots (0-safe), score = f(kills, wave), and
  `buildOverrunPrintPayload(world, playerId)` for the merch funnel.
- `sim.ts` — single `stepWorld(world, intents, dt)` with a **fixed phase order**: consume perk
  picks → movement (perk-modified speed) → reload tick → firing (hitscan resolve; stats update) →
  enemy AI step → contact damage → downed transitions → revive progress (proximity + wave-clear)
  → **revive resolves before wipe check** → deaths → XP/level/offer enqueue → drop rolls →
  pickup collection → wave progression (freeze partySize on wave start) → score/events → end
  check. No `Math.random`, no `Date`, no clocks — enforced by a guard test over the module dir.

### Layer 3 — presentation

- `src/game/net/shooterSession.ts` — thin session for Overrun on the generic engine; reuses
  `lobby.ts`, `roomLink.ts`, `election.ts`; the `start` message carries the world seed; exposes a
  `MatchDriver`-shaped feed for the renderer (mirrors `session.ts` patterns).
- `src/game/overrun/render/scene.ts` — Phaser scene with Arena's fake-2.5D conventions (y-sort,
  `Y_SCALE` foreshorten, shadows); reuses `input/mouse.screenDeltaToWorldAngle` verbatim;
  procedural textures; rotate-to-aim gun layer; tracer lines + muzzle flash from snapshot events;
  enemy hurt flash + death pop; downed ring + revive progress arc; object pooling under the caps.
- `src/components/game/overrun/Overrun.tsx` — phase shell (lobby → countdown → playing → ended),
  mirroring `Arena.tsx`. WarmupRoom variant: name/color, party list + kick, room link,
  Start (≥1 player, cap 8), **no weapon pick** (pistol start, scavenge in-run).
- HUD components: HealthBar, WeaponAmmo (mag/reserve + reload progress), WaveLevel, Score, XPBar,
  **PerkOffers overlay** (3 cards, 1/2/3 keys or click → `intent.perkPick`), DownedPrompt,
  TeammateStrip. End screen: score card (wave, kills, accuracy, level) + merch print link +
  rematch/back-to-room.
- `src/pages/games/overrun.astro` mounts the island (mirror `arena.astro`);
  `index.astro` Tactics card → Overrun card.

## 3. Data flow

Host: local + peer intents (coerced) → `stepWorld` @30 Hz → snapshot encode (keyframe/delta)
@10 Hz → broadcast. Client: raw input → intent → send to host @ tick rate; receive snapshots →
`applySnapshot` → `interp.ts` → render. Host migration: next-lowest peer already holds the last
snapshot (seed + spawnSeq + pity + all entities ride every keyframe) and steps forward —
byte-identical continuation is asserted in tests. Perk picks, fire, reload are all just intent
bits, so anti-cheat stays a single `coerceIntent` boundary.

## 4. Error handling

- Malformed net messages: dropped by decode/coerce (existing pattern).
- Missed delta / out-of-order seq: client freezes on last good state ≤1 s until the next keyframe.
- Peer leave mid-run: host marks the player dead (Arena pattern); wave budget re-freezes at the
  next wave boundary; if the host leaves, migration as above.
- Renderer texture failures: procedural generation cannot fail at runtime (no external assets).
- Merch link: payload passes through the existing sanitizer; empty stats fall back to defaults.

## 5. Testing

TDD throughout, vitest, colocated. Highlights:

- **Determinism:** same seed + same intent script → identical world hashes over 10k ticks; guard
  test forbids `Math.random`/`Date` in `src/game/overrun/` (grep-based like the roadmap's rule).
- **RNG independence:** an extra/missing draw upstream cannot shift downstream values.
- **Firing:** cadence, spread bounds, pellet count, pierce, ammo, pistol fallback.
- **Waves/drops:** budget at 1 vs 8 players, partySize frozen mid-wave, drop reproducibility,
  caps enforced.
- **Downed/revive:** proximity revive, wave-clear revive, revive-before-wipe ordering, wipe=ended.
- **Perks/XP:** thresholds, offer determinism, queueing, stacking math, pick-consumes-head.
- **Codec:** quantize round-trips, delta apply == full snapshot, keyframe recovery after loss.
- **Net (LocalHub):** 8-peer convergence, client-fed-snapshots-only spawns zero enemies/drops,
  mid-wave host migration continues byte-identically, snapshot byte-size budget assertion.
- **Regression:** Arena's entire existing suite stays green after the SyncEngine generalization.

## 6. Risks

- **Arena regression from generalizing SyncEngine** — adapter pattern + full suite green is a
  hard gate before any Overrun net code.
- **Snapshot blowup** — hitscan-only + caps + quantized/delta; a byte-budget test keeps it honest.
- **Determinism leak** (roadmap's re-armed risk) — coordinate-hash RNG + guard test + long-run
  hash test.
- **10 Hz feel** — interpolation is in scope from the start; if playtest still feels laggy,
  raising snapshot Hz is a one-constant change measured against the byte budget.
- **Scope creep** — the widen-later list above is explicitly out; new ideas go to ROADMAP, not
  the slice.

## 7. ROADMAP follow-up

On completion: update Track D (mark slice phases, note the Survival decoupling + P-A0 absorption),
log the progress entry, and record the new decisions (perks hybrid, non-blocking picks, stats →
merch print).
