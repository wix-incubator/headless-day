# Overrun — Campaign mode (stages, bosses, victory)

**Status:** design / awaiting review
**Date:** 2026-07-13
**Scope:** Phase 1 of the Overrun improvement track. Later phases (new guns, timed
powerups, extra perks, ranged/splitter/exploder enemies) are explicitly **out of scope** here.

---

## 1. Goal

Overrun today is an endless survival run with no win condition — you play until the party
dies. This adds a finite, authored **Campaign**: a sequence of themed stages, each ending in a
boss, culminating in a **victory** screen. The existing endless run is preserved as a second
mode (**Survival**). A stage picker lets a party continue from the furthest stage they've reached.

### Success criteria
- A party can start a Campaign, clear 3 stages, beat the final boss, and see a Victory screen.
- On a wipe, the party returns to the lobby and can restart from any stage they've reached.
- Survival mode behaves exactly as it does today (no regression).
- The sim stays fully deterministic and host-authoritative; the wire format stays append-only
  and within the existing `MAX_PENDING` / `MAX_ENEMIES` caps.

---

## 2. Modes

Overrun gains a `mode` concept mirroring Arena's mode toggle and Squid's stage picker.

| Mode | Structure | End condition | Lobby controls |
|------|-----------|---------------|----------------|
| `campaign` | Stages 1→3, boss per stage | Victory (clear stage 3) or wipe | Mode toggle + **stage picker** |
| `survival` | Endless waves (today's behavior) | Party wipe (no win) | Mode toggle only |

- `mode` is chosen by the **host** in the warm-up room and carried on the `oStart` message so
  every peer builds the same world.
- Default mode: **campaign** (it's the new headline experience; Survival is the "endless" option).

---

## 3. Stage model (campaign)

### 3.1 Stage table

Three stages. Themes are **cosmetic for v1** (palette tint + banner text); the arena stays the
30 m box. Distinct arenas/hazards are future work.

| # | id | Theme / banner | Enemy pool | Boss |
|---|-----|----------------|-----------|------|
| 1 | `dock` | "STAGE 1 — LOADING DOCK" | rusher, swarmling | `boss_forklift` |
| 2 | `servers` | "STAGE 2 — SERVER ROOM" | rusher, swarmling, tank | `boss_mainframe` |
| 3 | `rooftop` | "STAGE 3 — ROOFTOP HQ" | rusher, swarmling, tank (heavy) | `boss_overclock` |

Each stage entry (new `STAGES` table in `stages.ts`):

```ts
interface OverrunStage {
  id: OverrunStageId;          // "dock" | "servers" | "rooftop"
  name: string;                // banner text
  pool: EnemyKind[];           // kinds eligible for normal waves
  poolWeights: number[];       // draw weights, parallel to pool
  budgetMult: number;          // per-stage difficulty scalar (e.g. 1.0, 1.15, 1.35)
  boss: EnemyKind;             // boss kind spawned on the final wave
  palette: string;             // theme accent (renderer/HUD tint)
}
```

### 3.2 Waves per stage

`wavesForStage(stageIndex) = 3 + floor((stageIndex - 1) / 2)` → **3, 3, 4** for stages 1–3
(the "+1 wave every 2 stages" rule; extends cleanly if more stages are added later).

- Within a stage, waves `1 .. (W-1)` are **normal** (drawn from the stage pool).
- Wave `W` (the last) is the **boss wave**: it spawns the stage's boss plus a small fixed
  escort of swarmlings.

### 3.3 Difficulty / budget

Normal-wave budget keeps escalating across the whole campaign using an **absolute wave index**
so difficulty ramps continuously between stages:

```
absWave = Σ wavesForStage(s) for s < stage  +  waveInStage
budget  = round((BASE_BUDGET + BUDGET_PER_WAVE * absWave) * (0.5 + 0.5 * partySize) * stage.budgetMult)
```

Budget is spent over the stage's weighted pool (replacing today's fixed rusher/tank mix in
campaign; Survival keeps the current `composeWave`). Cap stays `MAX_PENDING = 150`.

### 3.4 Stage transitions

- Clearing a normal wave → next wave (`INTERMISSION_S` breather, unchanged).
- Clearing a **boss wave** with `stage < 3` → advance to next stage: `stage++`, `waveInStage = 1`,
  play the **comic interstitial** (§3.5, 1 s) then the normal countdown, then compose the next
  stage's wave 1.
- Clearing the **stage 3 boss** → outro comic (§3.5) → `phase = "victory"` (see §6).

### 3.5 Comic interstitials

Two kinds of comic beat:

1. **Campaign intro (before stage 1): the 5-panel `OverrunComic`** — a story cutscene (squad preps →
   general's briefing → gear up → truck → arrive at the tower), **2 s/panel (~10 s), Skip-able**.
   Already built (`components/game/overrun/OverrunComic.tsx`, previewable at `/games/overrun-intro`).
   Shown once when a campaign match begins from stage 1.
2. **Between later stages + outro: a 1 s placeholder panel** — the Overrun wallpaper held for
   `COMIC_INTERSTITIAL_S = 1 s` before stages 2..N, and a 1 s outro on the Victory screen. Real
   per-stage comic art is a future swap.

The rest of this section describes the **1 s inter-stage** beat (the intro comic is a client-side
cutscene gated at match start; see §8.5 for its sync).

- Driven by a synced world timer `stageIntroRemaining`, so every peer sees the same beat at the
  same time with no host click needed (between-stage intros are sim-driven, not click-driven).
- On campaign match start **and** on each stage advance, the sim sets `stageIntroRemaining =
  COMIC_INTERSTITIAL_S` and **holds** the pre-wave state (no spawning, players idle) until it
  decrements to 0; then the normal countdown → first wave proceeds. Sequence per stage:
  `comic (1 s) → countdown (3 s) → waves`.
- The **outro** panel is client-side: the Victory overlay opens with the same wallpaper for 1 s,
  then reveals results (no extra world field needed).
- **Survival mode has no interstitials** (`stageIntroRemaining` stays 0).

---

## 4. New enemy: swarmling

Append to `ENEMIES` + `ENEMY_KINDS` (index is the wire encoding — append-only, no renumbering).

| field | value | notes |
|-------|-------|-------|
| kind | `swarmling` | |
| radius | 0.28 | small |
| hitRadius | 6/7 | small sprite |
| speed | 6.0 | fastest regular enemy |
| health | 6 | dies to one pellet |
| damage | 3 | chip damage |
| attackInterval | 0.4 | |
| xp | 1 | |
| cost | 0.5 | cheap → hordes; `composeWave` loop already handles fractional spend |
| scoreValue | 5 | |
| minWave | 1 | (Survival gating; Campaign availability is pool-driven) |

Reuses the existing chase/contact model in `enemies.ts` verbatim — **no new sim branch.** The
only ripple: `composeWave` must handle a fractional `cost` (already does, since it loops on
`points > 0`). Swarmlings count toward `MAX_ENEMIES = 60` like any enemy.

---

## 5. Bosses

Three boss kinds (`boss_forklift`, `boss_mainframe`, `boss_overclock`), appended to `ENEMIES` /
`ENEMY_KINDS`. Bosses are large, high-HP elites that use the existing chase/contact model **plus
one shared special: a telegraphed AoE slam.**

### 5.1 Stats (base; HP scales with party at spawn)

| kind | radius | speed | base health | damage | attackInterval | xp | scoreValue |
|------|--------|-------|-------------|--------|----------------|-----|-----------|
| boss_forklift | 1.4 | 2.2 | 800 | 30 | 1.0 | 60 | 500 |
| boss_mainframe | 1.6 | 1.6 | 1400 | 35 | 1.1 | 90 | 800 |
| boss_overclock | 1.8 | 2.0 | 2400 | 45 | 1.0 | 140 | 1200 |

- **Party scaling:** at spawn the sim sets `enemy.health = def.health * (0.5 + 0.5 * partySize)`
  (partySize frozen at wave start), so 8 players don't melt a boss instantly. This is a
  spawn-time multiply; `def.health` remains the canonical base.
- Bosses are spawned **explicitly** by the boss-wave composer (not bought from the points
  budget); `cost` is unused for boss kinds.

### 5.2 Boss specials — traveling earthquake slam + leap

All three bosses share **two** deterministic specials (stats differ per §5.1), alternating on a
fixed cadence measured from the boss's spawn tick. Timing uses `(tick − spawnTick)` — no RNG; the
*target* is the deterministically-chosen nearest living player (same tie-break as `nearestAlive`).

**A. Earthquake slam — a *traveling* shockwave (not a static ring).**
- Telegraph `BOSS_SLAM_TELEGRAPH ≈ 0.7 s`: boss rears up and locks the boss→target direction;
  renderer shows the aim line; boss frozen.
- On release, a shockwave **front spawns at the boss and advances along that direction** at
  `QUAKE_SPEED ≈ 12 m/s` for `QUAKE_RANGE ≈ 16 m`. A player the front sweeps past within
  `QUAKE_WIDTH ≈ 2 m` takes `BOSS_SLAM_DAMAGE` (~25/30/35 per boss) + knockback, **once** per front.
- Modeled as a world-side **quake record** `{ ownerId, origin, dir, travelled }` in a `world.quakes[]`
  list (serialized) — a boss-only hazard, not a bullet. Fronts expire at `QUAKE_RANGE`.

**B. Leap to player position (0.5 s pounce).**
- Telegraph `BOSS_LEAP_TELEGRAPH ≈ 0.5 s`: a landing marker appears at the target's **current**
  position, **locked at telegraph start** so it's dodgeable; boss crouches.
- Over `BOSS_LEAP_DURATION = 0.5 s` the boss arcs from its position to the locked landing point
  (interpolated; airborne bosses skip normal steering **and** contact damage).
- On land: `BOSS_LEAP_DAMAGE` (~20/25/30) + knockback to players within `BOSS_LEAP_RADIUS ≈ 3 m`,
  plus a short recovery before the boss resumes chasing.

**Cadence.** From spawn the boss cycles `chase → SLAM → chase → LEAP → …` on a fixed schedule
(`BOSS_SPECIAL_PERIOD ≈ 3.5 s` between specials), identical on every peer. Per-boss *unique* flavor
(forklift charge, mainframe summon-adds) stays future work.

**Enemy state additions (serialized):** `special: "none" | "slamTelegraph" | "leapTelegraph" | "leap"`,
`specialRemaining`, `leapFrom {x,y}`, `leapTo {x,y}`. Plus `world.quakes[]` for active shockwave
fronts. All derived from frozen/serialized state → identical on every peer.

### 5.3 Boss wave composition

`composeBossWave(stage, partySize)` → `[stage.boss, swarmling ×K]` where `K` scales modestly with
party (e.g. `2 + partySize`). The boss is index 0 so the renderer can find "the boss" for the HUD
health bar. Boss + escort still obey `MAX_ENEMIES`.

---

## 6. Victory

- New `ShooterPhase` value: `"victory"` (alongside `"playing"`, `"ended"`). Frozen like `ended`
  (sim early-returns the world).
- Triggered when the stage-3 boss wave is cleared.
- Renderer shows a **Victory screen** that **opens with the outro comic** (placeholder wallpaper,
  1 s; §3.5) then reveals: "CAMPAIGN CLEARED", total time / score, party stats, and the existing
  merch CTA (feed `buildOverrunPrintPayload` a `"CAMPAIGN CLEARED"` title).
- `ended` (party wipe) remains the failure screen, now annotated with reached stage/wave.

---

## 7. Progress & stage picker (wipe handling)

Chosen behavior: **wipe → lobby, progress kept, pick which stage to continue from.**

### 7.1 Unlock rule
- `maxStage` = the furthest stage a member has **started** (not just cleared), so a member who
  wiped on stage 2 can resume at stage 2.
- Fresh state: `maxStage = 1`. Starting a stage sets `maxStage = max(maxStage, thatStage)` and
  persists (see §7.2). Clearing stage N's boss starts stage N+1, bumping `maxStage` to N+1.

### 7.2 Persistence — per signed-in member (Wix Data)
Campaign progress is stored **per member** so it follows them across devices/sessions, mirroring
the Squid highscore pattern (`@wix/data`, elevated writes, auto-created collection).

- **Collection `OverrunProgress`** (fields: `memberId`, `maxStage`), created on first write via the
  existing `withCollection` / `createAdminCollection` helpers in `lib/wix/wixData.ts`.
- **`lib/wix/overrunProgress.ts`** (new adapter):
  - `getProgress(memberId): Promise<number>` → member's `maxStage` (default 1; best-effort, returns
    1 on any read failure so the game stays playable).
  - `advanceProgress(memberId, stage): Promise<number>` → sets `maxStage = clamp(max(current, stage),
    1, TOTAL_STAGES)`; **advance-only** (never lowers), elevated upsert. Returns the new value.
- **API routes** (member-scoped, resolve the caller via `getSessionMember`/`getMemberId` — never
  trust a memberId from the body):
  - `GET /api/overrun-progress` → `{ maxStage }` for the current member (1 for anonymous).
  - `POST /api/overrun-progress` `{ stage }` → advances the current member's progress; 401/no-op for
    anonymous.
- **Whose progress gates the room:** the **host's**. The host's island fetches its member progress
  on entering the lobby and, on each stage start, POSTs to advance it.
- **Anonymous host:** no persisted record — progress is **session-only** (in-memory `maxStage` that
  still unlocks as they clear stages during this session), reset when the room is recreated.

### 7.3 Stage picker (lobby UI)
- Mirrors Squid's stage selector: host-only control, shown **only in Campaign mode**.
- Renders stages 1..`maxStage` as selectable; locked stages (`> maxStage`) shown disabled.
- `maxStage` comes from the host member's persisted progress (or session value if anonymous),
  fetched by the island and passed into the room as a prop.
- Non-hosts see the host's chosen stage (read-only), same as Squid.
- The chosen start stage is carried on `oStart` as `startStage`.

### 7.4 Flow
```
Lobby (mode=campaign, pick startStage ≤ maxStage)
  → coin insert (1s) → comic interstitial (1s) → countdown → Stage startStage, wave 1
  → clear waves → boss wave → clear boss
      → stage < 3: comic interstitial (1s) → countdown → next stage (maxStage bumps)
      → stage == 3: outro comic (1s) → VICTORY
  → wipe anytime → "GAME OVER (reached Stage X, wave Y)" → back to lobby
      (maxStage retained; picker lets them resume at Stage X)
```

---

## 8. Data-model changes

### 8.1 Types (`types.ts`)
- `EnemyKind`: append `"swarmling" | "boss_forklift" | "boss_mainframe" | "boss_overclock"`.
- `ShooterPhase`: append `"victory"`.
- New `OverrunMode = "campaign" | "survival"` and `OverrunStageId = "dock" | "servers" | "rooftop"`.
- `ShooterWorld` new fields: `mode: OverrunMode`, `stage: number` (1-based; 0 in survival),
  `waveInStage: number`, `stageIntroRemaining: number` (comic-interstitial hold; §3.5), and
  `quakes: Quake[]` (active traveling shockwave fronts; §5.2).
- `Enemy` boss-special fields (§5.2): `special`, `specialRemaining`, `leapFrom`, `leapTo`.
- New constant `COMIC_INTERSTITIAL_S = 1` in `constants.ts`.
- New `ShooterEvent` variants: `{ kind: "slam", pos, radius }`, `{ kind: "stageClear", stage }`,
  `{ kind: "victory" }` (for sfx/vfx). Append-only.

### 8.2 New/changed sim modules
- **`stages.ts`** (new): `STAGES` table, `wavesForStage`, `stageByIndex`, `absWaveIndex`.
- **`waves.ts`**: `composeWave` gains a campaign path (stage pool + weighted draw + stage budget)
  and `composeBossWave`; Survival path unchanged.
- **`enemies.ts`**: swarmling + 3 boss defs; a `stepBoss` helper (special cadence, telegraph
  freeze, leap arc interpolation) called from `sim.ts`.
- **`sim.ts`**: stage/waveInStage bookkeeping in the "waves + spawning" block; **stage-intro hold**
  (decrement `stageIntroRemaining`; no spawning/countdown until it hits 0); boss HP party-scale at
  spawn; **boss-special sub-step** (advance quakes + apply their sweep damage, run leap arcs + land
  damage, drive the slam/leap cadence) as a new numbered block; victory transition; wipe annotated
  with reached stage/wave.
- **`match.ts`**: initial world seeded with `mode`, `stage`, `waveInStage` from the start message.

### 8.3 Net (`net/protocol.ts`, `net/codec.ts`, `net/session.ts`)
- `oStart` message: add `mode: OverrunMode` and `startStage: number`.
- `codec.ts`: encode the new `EnemyKind` indices, the `"victory"` phase, new world fields
  (`mode`, `stage`, `waveInStage`, `stageIntroRemaining`, `quakes[]`), boss-special fields on
  enemies (`special`, `specialRemaining`, `leapFrom`, `leapTo`), and new events. Keep diffing
  (`diffWorld`) correct for the added fields (they re-ship on keyframes and on change).
- `OverrunSession`:
  - `start(mode, startStage)` instead of `start()`; broadcasts them on `oStart`.
  - `getState()` adds `mode`, `stage`, `waveInStage`, and `bossHealth`/`bossMaxHealth` (for the HUD
    bar) — mirroring how Squid exposes `stage`.
  - Victory/`ended` both return to lobby via the existing `toLobby()`.
  - **`maxStage` is NOT session state** — it's the host member's persisted progress, fetched/held by
    the Overrun island (§7.2, §8.5) and passed into the warm-up room. The island advances it (POST)
    on each stage start.

### 8.5 Per-member progress (`lib/wix/overrunProgress.ts` + API)
- **Collection `OverrunProgress`** (`memberId`, `maxStage`), auto-created via `withCollection` /
  `createAdminCollection` (see `lib/wix/wixData.ts`), elevated writes — same pattern as Squid scores.
- Adapter: `getProgress(memberId)` (default 1, best-effort) and `advanceProgress(memberId, stage)`
  (advance-only clamp to `[1, TOTAL_STAGES]`, elevated upsert).
- API: `GET /api/overrun-progress` → `{ maxStage }` for the caller; `POST /api/overrun-progress`
  `{ stage }` → advances the caller's progress. Both resolve identity server-side via
  `getSessionMember`/`getMemberId`; anonymous → `maxStage` 1, POST is a no-op.
- Island: on entering the campaign lobby, fetch progress → `maxStage` React state → picker prop;
  on each stage start, POST to advance. Anonymous host → session-only in-memory `maxStage`.

### 8.4 Renderer / HUD / lobby
- **`render/scene.ts`**: swarmling + boss sprites; boss slam telegraph ring + slam flash; stage
  banner on stage start; palette tint per stage.
- **HUD**: boss health bar (from `bossHealth/bossMaxHealth`); stage/wave readout ("STAGE 2 · WAVE 3");
  **comic interstitial overlay** shown while `stageIntroRemaining > 0` (placeholder = Overrun
  wallpaper + stage banner); Victory (opens with the 1 s outro wallpaper) and annotated Game-Over
  overlays.
- **`OverrunWarmupRoom.tsx`**: mode toggle (Campaign/Survival) + stage picker (campaign only,
  1..maxStage), following the CoinSlot-gated start already in place. `onStart` becomes
  `onStart(mode, startStage)`.
- **Assets:** swarmling + 3 boss visuals must be registered in `assets.ts` / the manifest, with a
  **programmatic fallback** (tinted shapes) so the game renders if art isn't ready. The comic
  interstitial reuses the **existing Overrun wallpaper** image for v1 (no new art).

---

## 9. Determinism & wire constraints (must-hold invariants)

- All new randomness (pool draws) goes through `hash01` with documented coordinates
  (`(seed, "poolmix", stage, waveInStage, i)`); boss special cadence + targeting are tick-derived
  / nearest-alive, **no RNG**.
- Enum ordering is **append-only** — new kinds/phases/events go at the end; existing indices never
  move (keeps old clients decodable within a protocol version; bump `PROTOCOL_VERSION` if the
  envelope shape changes).
- Swarmling hordes + boss escorts must respect `MAX_PENDING` (queue) and `MAX_ENEMIES` (field).
  Budget tuning per stage keeps typical field counts under the cap.
- Boss specials (quake sweep, leap arc) and HP scaling read only frozen/serialized state
  (partySize, spawnTick, locked target position), so every peer computes identical outcomes.
- `world.quakes[]` is bounded (fronts expire at `QUAKE_RANGE`; at most one active per boss), keeping
  snapshot size in check.

---

## 10. Tests (add alongside existing `*.test.ts`)

- `stages.test.ts`: `wavesForStage` → 3/3/4; `absWaveIndex` continuity; pool membership per stage.
- `waves.test.ts`: campaign composition only draws from the stage pool; boss wave = `[boss, …swarm]`;
  budget honors `budgetMult` and `MAX_PENDING`; Survival path unchanged (regression).
- `enemies.test.ts`: swarmling + boss defs present and ordered; boss party-HP scale.
- `sim.test.ts`: normal→boss→next-stage transition; stage-3 boss clear → `phase="victory"`; wipe
  sets annotated reached stage/wave; **stage-intro hold** — `stageIntroRemaining` starts at
  `COMIC_INTERSTITIAL_S` on stage start, blocks spawning until it reaches 0, then the wave proceeds.
- `boss.test.ts`: special cadence deterministic across two runs; **quake** front travels along the
  locked boss→target direction and damages a swept player exactly once; **leap** locks the landing
  point at telegraph start, arcs over 0.5 s, lands damage within radius; airborne boss deals no
  contact damage.
- `codec.test.ts` / `protocol.test.ts`: round-trip new kinds, `"victory"` phase, new world fields
  and events; `oStart` carries `mode`/`startStage`.
- `session.test.ts`: `start(mode, startStage)` seeds the world; picker cannot select a locked stage.
- `overrunProgress.test.ts`: `advanceProgress` is advance-only and clamps to `[1, TOTAL_STAGES]`
  (never lowers `maxStage`); `getProgress` defaults to 1.

---

## 11. Implementation order (for the plan)

1. **Data + stages (no behavior change yet):** types, `stages.ts`, swarmling + boss defs, tests.
2. **Campaign wave engine:** `composeWave` campaign path + `composeBossWave`; `waves.test.ts`.
3. **Sim:** stage/wave bookkeeping, stage-intro hold (`stageIntroRemaining`), boss HP scale, boss
   specials (traveling quake + leap), victory + annotated wipe.
4. **Net:** `oStart` fields, codec for new kinds/phase/fields/events, session `start(mode,stage)`,
   `getState` additions.
5. **Per-member progress:** `OverrunProgress` collection + `lib/wix/overrunProgress.ts` +
   `/api/overrun-progress` (GET/POST); `overrunProgress.test.ts`.
6. **Lobby UI:** mode toggle + stage picker in `OverrunWarmupRoom` (picker fed by fetched
   `maxStage`); wire `onStart(mode, startStage)`.
7. **Intro comic wiring:** play the 5-panel `OverrunComic` on campaign start (synced across peers),
   gating the match; advance member progress. *(This slice is being done first — see below.)*
8. **Renderer/HUD/assets:** swarmling + boss sprites (with fallback), boss health bar, stage banner,
   slam telegraph, 1 s inter-stage interstitial + Victory (with 1 s outro) + annotated Game-Over.
9. **Playtest tuning:** budgets, boss HP/slam numbers, break timings.

---

## 12. Out of scope (later phases)
New guns (SMG/minigun/rocket/flamethrower), timed powerups (nuke/freeze/rage), additional perks,
and the harder enemy types (splitter, exploder, shielded, ranged/spitter). Distinct stage arenas &
environmental hazards. **Real per-stage comic art** — v1 uses the built 5-panel intro comic plus the
Overrun wallpaper as a 1 s placeholder for the inter-stage beats/outro.

## 13. Open questions / review flags
1. ✅ **Boss specials — RESOLVED:** all bosses get the traveling **earthquake slam** (shockwave
   moves in the target's direction) **and** a **0.5 s leap** to a player's position (§5.2).
2. ✅ **Progress scope — RESOLVED:** per signed-in member via Wix Data (`OverrunProgress`), gated by
   the host's progress; anonymous host = session-only unlock (§7.2, §8.5).
3. **Survival stage picker:** confirm Survival mode shows *no* stage picker (endless from wave 1).
4. ✅ **Comic placement — RESOLVED:** 1 s comic before *every* stage + an outro on Victory (§3.5).
   The intro is a 5-panel vector comic (`OverrunComic.tsx`), 2 s/panel, placeholder-styled — built.
