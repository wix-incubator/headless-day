# Overrun (co-op horde shooter) — Thin Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Overrun" — a Crimsonland-style twin-stick co-op horde shooter at `/games/overrun`: 1–8 players, WASD + mouse free-aim, hold-to-fire hitscan guns (pistol/shotgun/rifle), endless escalating waves of rushers + tanks, weapon/medkit drops, downed/revive, XP + non-blocking perk picks, per-player run stats feeding the existing merch-print funnel.

**Architecture:** Pure deterministic sim core in `src/game/overrun/` (fixed 30 Hz tick, coordinate-hash RNG carried by a seed in the world, no clocks/`Math.random`), networked by the existing host-authoritative P2P stack via a generic `SyncEngine<W, I>` + `SyncAdapter` (the same shape the squid plan defines — see Global Constraints) extended with snapshot cadence control and keyframe+delta quantized encoding at 10 Hz. Clients interpolate between snapshots. Phaser fake-2.5D renderer (procedural textures) + React island mirror `Arena.tsx`.

**Tech Stack:** TypeScript (strict), Astro 5.8 + `@wix/astro` (vite pinned 6.4.3), React islands, Phaser 4, Trystero WebRTC, vitest. New deps: **none**.

**Spec:** `docs/superpowers/specs/2026-07-09-overrun-slice-design.md` (approved 2026-07-09).

## Global Constraints

- **Coordination with the Squid plan:** `docs/superpowers/plans/2026-07-09-squid-game.md` Task 8 defines the SAME `SyncAdapter`/`SyncEngine<W, I>` generalization. Task 10 below is written to work from EITHER starting state (current non-generic `sync.ts`, or squid's generic version already landed). Check `src/game/net/sync.ts` for `SyncAdapter` before starting Task 10 and follow the branch noted there. The final adapter interface (with `encodeSnapshot(world, prevSent): string | null` and the `update` message kind) is a strict superset of squid's — arena and squid adapters remain valid.
- **No clocks, `Math.random()`, DOM, Phaser, or network imports in `src/game/overrun/*.ts`** (top-level core files). `net/` is the impure wire boundary (its `session.ts` may use `Math.random` ONLY to mint the match seed), `render/` is the impure engine adapter. Enforced by `purity.test.ts` (Task 8).
- World units are **meters**, +y is down; field is **30 m** square (arena conventions). Shooter sim rate **30 Hz fixed-step** (`SHOOTER_TICK_HZ`), snapshots every **3 ticks** (10 Hz), keyframe every **10th** snapshot.
- **Entity caps:** ≤60 live enemies, ≤24 pickups, ≤32 events carried; keyframe ≤4096 bytes, steady-state delta ≤2560 bytes (asserted in tests).
- **No friendly fire structurally:** hitscan rays query enemies only; there is no bullet-vs-player code path. AoE does not exist in the slice.
- **Determinism:** every random draw is `hash01(seed, ...stable coords)` — never a shared advancing cursor. Iterate players in sorted-id order everywhere; enemies in array (spawn) order.
- All existing tests must stay green after every task (`npx vitest run` — 151 tests at plan time, plus squid's if it landed first). Run `npx tsc --noEmit` before each commit.
- Working directory: `/Users/kyryloi/wix/wix-headless-masterclass/team-build-games`.
- Commit after every task with a conventional message ending in `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

## Plan amendments — baseline drift (added 2026-07-09, worktree base `0388ad4`)

The concurrent arena session landed protocol v2 between plan-writing and execution. These
amendments OVERRIDE the corresponding details in the tasks below:

1. **`iconColor` no longer exists** in `hello`/`StartPlayer`/`LobbyPlayer`/`RosterEntry` (`PROTOCOL_VERSION = 2`), and arena's `PlayerMeta` lost `colorIndex`. Adapt Overrun:
   - `OverrunSession` constructor options drop `iconColor` → `{ transport, name, isCreator?, onChange }`; `setProfile(name: string)` only; `sendHello` sends no `iconColor`.
   - The `oStart` message carries `players: { id: PlayerId; name: string }[]` (no iconColor). Update the Task 9 protocol union member accordingly.
   - **`colorIndex` is DERIVED**: each player's index in the `oStart` players array (host builds it from `rosterList` order). `beginMatch` stores `meta = { name, colorIndex: arrayIndex }`. `OverrunMeta.colorIndex` stays in the render contract — it is now derived, not chosen.
   - `OverrunWarmupRoom` has NO color picker — name input only; party-list color dots use the same derived roster-order index. Its props drop `colorIndex`/`onColor`.
   - Task 12's session tests: construct sessions without `iconColor`; assert `getMeta` colorIndexes are distinct per player after start.
2. **Baseline numbers**: 201 tests at execution start (not 151); maze (P9) and the merch storefront (`/shop/*` pages) already exist — the Task 14 merch link should point at the LIVE funnel exactly as `Arena.tsx` does at HEAD (re-read it; if its buildShopUrl call changed products/params, mirror the new form).
3. **Read files at HEAD before mirroring**: `session.ts`/`lobby.ts`/`protocol.ts`/`Arena.tsx`/`WarmupRoom.tsx` all changed after the plan's code excerpts were written. Where a task says "mirror the arena X", the CURRENT file wins over any stale detail in this plan's prose.

## Plan amendment — wire byte budgets (final review, 2026-07-10)

Measured worst-case (all caps maxed) came in at keyframe 4156 B / delta 3135 B, over the original
4096/2560 targets. The asserted ceilings are **keyframe ≤ 6144 B / delta ≤ 4096 B** (still a hard,
test-pinned cap; ~15 KB/s steady-state at 10 Hz — well within DataChannel headroom). Endless-run
growth is contained by `MAX_PENDING = 150` + suffix-drop (`pdo`) delta encoding of the spawn queue.

## Plan amendment — GAME SEPARATION (added 2026-07-09, user directive; OVERRIDES task details below)

Arena and Overrun must be two fully separate games. Binding rules for every remaining task:

1. **No `src/game/arena/**` imports anywhere** under `src/game/overrun/**` or `src/components/game/overrun/**`. Wherever a task's code says `import ... from "../arena/types"` (or `../../arena/...`), use Overrun's own equivalents instead.
2. `src/game/overrun/types.ts` defines its own primitives: `Vec2 {x,y}`, `InputState {up,down,left,right}`, `PlayerId = string` (a Task-8.5 decoupling commit retrofits Tasks 1–8).
3. `purity.test.ts` additionally asserts no overrun file matches `from ["']\.\.?/.*arena` — the separation is test-enforced.
4. **Task 9:** codec imports `PlayerId`/`Vec2` from `../types` (overrun), not arena.
5. **Task 10:** the generic `SyncEngine`/`SyncAdapter` stays in `src/game/net/sync.ts` but `arenaSyncAdapter` moves to a NEW file `src/game/net/arenaAdapter.ts` (arena's `session.ts` imports it from there) so Overrun bundles never pull arena sim code. `sync.ts` must not import anything from `src/game/arena/**` when done.
6. **Task 12:** OverrunSession does NOT reuse arena's `hello` or `lobby.ts` (they carry arena Shape/Weapon cosmetics). Add `{ t: "oHello"; name: string; hostId?: string | null }` to the protocol union; OverrunSession keeps its own `Record<PlayerId, { id; name }>` roster (upsert/remove inline — trivial), still reuses game-neutral `kick`/`host` message kinds, `electHost`, `roomLink`, `ice`, `transport`. `COUNTDOWN_S`: define `OVERRUN_COUNTDOWN_S = 3` in overrun constants; do not import game-pack constants.
7. **Task 13:** copy the 3-line `screenDeltaToWorldAngle` into `src/game/overrun/render/aim.ts` (with its 2 assertions as a colocated test) instead of importing arena's; define local render constants (PX_PER_M etc.) in the overrun scene rather than importing `src/game/constants.ts`.
8. **Task 14:** Overrun HUD components are all its own (already planned); use an Overrun-styled countdown (red theme) inside `src/components/game/overrun/hud/` instead of importing arena's `Countdown`. Game-neutral infra stays shared: `Sfx`, `roomLink`, `ice`, `joinedIds`-style helpers if game-neutral (roster-diff helper may be reimplemented in overrun's session), merch `print.ts` funnel.

## File Structure (all new unless marked Modify)

```
src/game/overrun/constants.ts        tuning constants (tick/snapshot rates, caps, combat, drops, XP)
src/game/overrun/rng.ts              coordinate-hash RNG: hash01(seed, ...coords)
src/game/overrun/types.ts            ShooterWorld/Player/Enemy/Pickup/Event/Intent/RawShooterInput
src/game/overrun/weapons.ts          GUNS table (pistol/shotgun/rifle) + coerceGun + freshAmmo
src/game/overrun/perks.ts            PERKS pool, effectiveStats, rollOffer, xpToNext
src/game/overrun/intent.ts           RawShooterInput→ShooterIntent (edge memory) + coerceShooterIntent
src/game/overrun/match.ts            createShooterWorld (ring spawns) + alive helpers
src/game/overrun/enemies.ts          ENEMIES defs (rusher/tank) + nearestAlive + stepEnemy
src/game/overrun/firing.ts           tickAmmo/tryStartReload/fireTick (hitscan rays, pierce, fallback)
src/game/overrun/waves.ts            waveBudget/composeWave/spawnPos
src/game/overrun/drops.ts            rollDrop (weighted + pity/anti-flood)
src/game/overrun/stats.ts            accuracy + buildOverrunPrintPayload (merch funnel)
src/game/overrun/sim.ts              stepShooter — the single reducer, fixed phase order
src/game/overrun/purity.test.ts      guard: no Math.random/Date/performance in core files
src/game/overrun/net/codec.ts        quantized QWorld + keyframe/delta diff/apply
src/game/overrun/net/adapter.ts      overrunSyncAdapter (SyncAdapter<ShooterWorld, ShooterIntent>)
src/game/overrun/net/interp.ts       lerpWorlds/lerpAngle (client 10 Hz → smooth render)
src/game/overrun/net/session.ts      OverrunSession (lobby/hello/start/kick + fixed-tick + interp)
src/game/overrun/render/contract.ts  OverrunDriver/OverrunHudState/OverrunEvent/OverrunConfig
src/game/overrun/render/keyboard.ts  Phaser keys → RawShooterInput (WASD + R + 1/2/3)
src/game/overrun/render/scene.ts     Phaser fake-2.5D scene, procedural textures, tracers
src/game/net/sync.ts                 Modify: generic SyncEngine + cadence/delta support (Task 10)
src/game/net/session.ts              Modify: arena Session passes arenaSyncAdapter (Task 10)
src/game/net/sync.test.ts            Modify: constructions gain adapter (Task 10)
src/game/net/protocol.ts             Modify: + oStart/oInput/oSnap/oDelta message kinds (Task 9)
src/components/game/overrun/Overrun.tsx            React island phase shell
src/components/game/overrun/OverrunWarmupRoom.tsx  lobby variant (name/color/party/start)
src/components/game/overrun/hud/AmmoBox.tsx        mag/reserve + reload bar
src/components/game/overrun/hud/XpBar.tsx          XP progress + level
src/components/game/overrun/hud/PerkOffersOverlay.tsx  3 perk cards, 1/2/3 or click
src/components/game/overrun/hud/TeamStrip.tsx      teammate health/status strip
src/pages/games/overrun.astro        page (mirror arena.astro)
src/lib/games/registry.ts            Modify: replace the Tactics card with Overrun (live)
src/lib/members/games.ts             Modify: + overrun entry (avatar/stats allowlist)
docs/ROADMAP.md                      Modify: Track D slice status + progress log (final task)
```

Colocated tests: `constants.ts` and `types.ts` have none; every other core/net file gets `<name>.test.ts` next to it. `render/` and React components follow the repo pattern (no unit tests; `tsc` + build + live playtest gate).

---

### Task 1: Constants + coordinate-hash RNG

**Files:**
- Create: `src/game/overrun/constants.ts`
- Create: `src/game/overrun/rng.ts`
- Test: `src/game/overrun/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every constant below (later tasks import by these exact names); `hash01(seed: number, ...coords: (number | string)[]): number` returning a deterministic value in `[0, 1)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/game/overrun/rng.test.ts
import { describe, expect, it } from "vitest";
import { hash01 } from "./rng";

describe("hash01 (coordinate-hash RNG)", () => {
  it("is deterministic for identical coordinates", () => {
    expect(hash01(42, 100, "p1", 0)).toBe(hash01(42, 100, "p1", 0));
  });

  it("returns values in [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const v = hash01(7, i, "salt");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform (mean of 1000 draws near 0.5)", () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += hash01(123, i);
    expect(sum / 1000).toBeGreaterThan(0.45);
    expect(sum / 1000).toBeLessThan(0.55);
  });

  it("changes with every coordinate: seed, tick, id, salt", () => {
    const base = hash01(1, 50, "e7", "drop");
    expect(hash01(2, 50, "e7", "drop")).not.toBe(base);
    expect(hash01(1, 51, "e7", "drop")).not.toBe(base);
    expect(hash01(1, 50, "e8", "drop")).not.toBe(base);
    expect(hash01(1, 50, "e7", "gun")).not.toBe(base);
  });

  it("draws are independent: one draw's coords never shift another's value", () => {
    // No cursor: the value for (seed,tick,id) is a pure function of those coords,
    // regardless of how many OTHER draws happen "before" it.
    const v = hash01(9, 10, "p2", 3);
    hash01(9, 10, "p1", 0); // an "upstream" draw
    hash01(9, 10, "p1", 1);
    expect(hash01(9, 10, "p2", 3)).toBe(v);
  });

  it("distinguishes string coords from their lengths/concatenations", () => {
    expect(hash01(1, "ab", "c")).not.toBe(hash01(1, "a", "bc"));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/overrun/rng.test.ts`
Expected: FAIL — `Cannot find module './rng'`.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/overrun/constants.ts
/**
 * Overrun tuning constants. The sim is fixed-step (SHOOTER_TICK_HZ) so cadence,
 * cooldowns, and snapshots are exactly reproducible across host migrations.
 */

/** Fixed simulation rate (Hz) — the session accumulates render dt into whole ticks. */
export const SHOOTER_TICK_HZ = 30;
export const SHOOTER_DT = 1 / SHOOTER_TICK_HZ;
/** Broadcast a snapshot every N ticks (30/3 = 10 Hz). */
export const SNAPSHOT_EVERY_TICKS = 3;
/** Every Nth broadcast is a full keyframe (10 × 0.1 s ≈ 1 s). */
export const KEYFRAME_EVERY = 10;
export const SNAPSHOT_INTERVAL_S = SNAPSHOT_EVERY_TICKS / SHOOTER_TICK_HZ;
/** Cap on catch-up sim ticks per render frame (tab-refocus etc.). */
export const MAX_CATCHUP_TICKS = 4;

// --- field / players ---
export const OVERRUN_FIELD_M = 30;
export const PLAYER_RADIUS_M = 0.75;
export const PLAYER_HEALTH = 100;
export const PLAYER_SPEED_MS = 4;

// --- caps (snapshot-size + host-CPU guards) ---
export const MAX_ENEMIES = 60;
export const MAX_PICKUPS = 24;
export const MAX_EVENTS = 32;
/** Events older than this many ticks are pruned (renderer consumes them fast). */
export const EVENT_TTL_TICKS = 6;

// --- waves ---
export const SPAWNS_PER_TICK = 2;
export const INTERMISSION_S = 3;

// --- downed / revive ---
export const REVIVE_RANGE_M = 2;
export const REVIVE_S = 3;
export const REVIVE_HEALTH = 50;

// --- pickups / drops ---
export const PICKUP_RADIUS_M = 1;
export const PICKUP_TTL_S = 12;
export const MEDKIT_HEAL = 40;
/** After swapping guns, ignore weapon pickups briefly so you don't instantly re-swap. */
export const SWAP_GUARD_S = 0.5;
export const DROP_WEAPON_P = 0.1;
export const DROP_MEDKIT_P = 0.06;
/** Kills without a drop before one is forced (anti-dry-streak). */
export const PITY_LIMIT = 25;

// --- XP / perks ---
export const XP_BASE = 20;
export const XP_PER_LEVEL = 15;
```

```ts
// src/game/overrun/rng.ts
/**
 * Coordinate-hash RNG (murmur3-style mixing): every draw is a pure function of
 * (seed, ...stable coordinates) — there is NO advancing cursor, so an extra or
 * missing draw upstream can never shift downstream values, and host migration
 * (which reconstructs the world from a snapshot-carried seed) can't fork RNG state.
 */

function mix(h: number, x: number): number {
  let k = Math.imul(x | 0, 0xcc9e2d51);
  k = (k << 15) | (k >>> 17);
  k = Math.imul(k, 0x1b873593);
  h ^= k;
  h = (h << 13) | (h >>> 19);
  return (Math.imul(h, 5) + 0xe6546b64) | 0;
}

function fmix(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** Deterministic draw in [0, 1) for the given seed + coordinates (numbers are floored). */
export function hash01(seed: number, ...coords: (number | string)[]): number {
  let h = seed | 0;
  for (const c of coords) {
    if (typeof c === "string") {
      for (let i = 0; i < c.length; i++) h = mix(h, c.charCodeAt(i));
      h = mix(h, c.length | 0x40000000); // length marker: "ab","c" ≠ "a","bc"
    } else {
      h = mix(h, Math.floor(c));
      h = mix(h, 0x9e3779b9); // type marker so number/string sequences can't collide trivially
    }
  }
  return fmix(h) / 4294967296;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/overrun/rng.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/constants.ts src/game/overrun/rng.ts src/game/overrun/rng.test.ts
git commit -m "feat(overrun): constants + coordinate-hash RNG (no-cursor, migration-safe)"
```

---

### Task 2: Domain types + gun table + intent mapping

**Files:**
- Create: `src/game/overrun/types.ts`
- Create: `src/game/overrun/weapons.ts`
- Create: `src/game/overrun/intent.ts`
- Test: `src/game/overrun/weapons.test.ts`, `src/game/overrun/intent.test.ts`

**Interfaces:**
- Consumes: `Vec2`, `InputState`, `PlayerId` from `../arena/types`; constants from Task 1.
- Produces (exact names later tasks import): all types below; `GUNS: Record<GunId, GunDef>`, `GUN_IDS: GunId[]`, `DEFAULT_GUN: GunId = "pistol"`, `coerceGun(raw: unknown): GunId`, `freshAmmo(gun: GunId): AmmoState`, `hasReserve(gun: GunId, ammo: AmmoState): boolean`; `initialShooterMemory(): ShooterInputMemory`, `inputToShooterIntent(raw, mem): { intent: ShooterIntent; memory: ShooterInputMemory }`, `coerceShooterIntent(raw: unknown): ShooterIntent`.

- [ ] **Step 1: Write `src/game/overrun/types.ts`** (pure types — no test file)

```ts
// src/game/overrun/types.ts
/**
 * Engine/transport-free domain types for the Overrun sim core. Plain data only.
 * Coordinates in METERS, +y down (arena convention). The world carries its own
 * seed so any peer can reproduce every future random draw after a host migration.
 */

import type { InputState, PlayerId, Vec2 } from "../arena/types";

export type GunId = "pistol" | "shotgun" | "rifle";
export type EnemyKind = "rusher" | "tank";
export type PickupKind = "shotgun" | "rifle" | "medkit";
export type ShooterStatus = "alive" | "downed" | "dead";
export type ShooterPhase = "playing" | "ended";
export type PerkId = "trigger" | "sprint" | "power" | "vitality" | "hands" | "magnet";

export interface AmmoState {
  mag: number;
  /** Rounds outside the mag. Ignored for the pistol (infinite reserve). */
  reserve: number;
  /** Seconds left of an active reload (0 = not reloading). Blocks firing, not movement. */
  reloadRemaining: number;
  /** Seconds until the next shot is allowed (RPM gate). */
  fireCooldown: number;
}

/** Cumulative run stats — the merch-print scorecard inputs. */
export interface ShooterStats {
  /** Trigger pulls (a shotgun blast counts once, not per pellet). */
  shots: number;
  /** Trigger pulls that damaged ≥1 enemy. */
  hits: number;
  kills: number;
}

/** One queued level-up: three distinct perk choices rolled deterministically. */
export interface PerkOffer {
  choices: [PerkId, PerkId, PerkId];
}

export interface ShooterPlayer {
  id: PlayerId;
  pos: Vec2;
  /** Free-aim angle (radians), host-consumed input echoed into the world for rendering. */
  aim: number;
  health: number;
  status: ShooterStatus;
  gun: GunId;
  ammo: AmmoState;
  xp: number;
  level: number;
  perks: PerkId[];
  /** FIFO queue of unclaimed level-up offers (head is the active one in the HUD). */
  offers: PerkOffer[];
  stats: ShooterStats;
  /** Seconds of teammate-proximity revive accumulated while downed (resets when alone). */
  reviveProgress: number;
  /** Seconds left of the post-swap pickup guard. */
  swapGuard: number;
}

export interface Enemy {
  /** Deterministic `e${spawnSeq}`. */
  id: string;
  kind: EnemyKind;
  pos: Vec2;
  health: number;
  /** Seconds until this enemy may deal contact damage again. */
  attackCooldown: number;
}

export interface Pickup {
  /** Deterministic `pk:${enemyId}` of the enemy that dropped it. */
  id: string;
  kind: PickupKind;
  pos: Vec2;
  /** Seconds left before the pickup despawns. */
  ttl: number;
}

/** Transient, render-only facts (tracers, kill pops, SFX). Pruned after EVENT_TTL_TICKS. */
export type ShooterEvent =
  | { tick: number; kind: "shot"; from: Vec2; to: Vec2; gun: GunId }
  | { tick: number; kind: "kill"; pos: Vec2; enemy: EnemyKind }
  | { tick: number; kind: "pickup"; pos: Vec2; item: PickupKind }
  | { tick: number; kind: "levelup"; playerId: PlayerId }
  | { tick: number; kind: "downed"; playerId: PlayerId }
  | { tick: number; kind: "revived"; playerId: PlayerId };

/** What a client sends per tick — never positions/health/enemies. */
export interface ShooterIntent {
  move: InputState;
  /** Free-aim angle in radians (mouse); host echoes it into the player state. */
  aim?: number;
  /** HELD state — all slice guns are auto (hold to fire). */
  fire: boolean;
  /** Rising-edge: reload requested this tick. */
  reload: boolean;
  /** Rising-edge: claim choice N of the head perk offer (null = no pick). */
  perkPick: 0 | 1 | 2 | null;
}

/** Raw held-key state read by the renderer each frame. */
export interface RawShooterInput extends InputState {
  fire: boolean;
  reload: boolean;
  aim?: number;
  pick1: boolean;
  pick2: boolean;
  pick3: boolean;
}

/** Edge-detection memory carried between frames. */
export interface ShooterInputMemory {
  reloadHeld: boolean;
  pick1Held: boolean;
  pick2Held: boolean;
  pick3Held: boolean;
}

export interface ShooterWorld {
  tick: number;
  phase: ShooterPhase;
  /** Match seed — rides every keyframe so any peer reproduces all draws. */
  seed: number;
  /** Current wave number (1-based; 0 = not started). */
  wave: number;
  /** Player count frozen at the current wave's start (proportional budget input). */
  partySize: number;
  /** Enemy kinds queued to spawn this wave (drained SPAWNS_PER_TICK per tick under MAX_ENEMIES). */
  pending: EnemyKind[];
  /** Seconds left of the between-waves breather (0 = wave in progress). */
  intermission: number;
  players: Record<PlayerId, ShooterPlayer>;
  enemies: Enemy[];
  pickups: Pickup[];
  events: ShooterEvent[];
  /** Party score: Σ enemy scoreValue × wave at kill time. */
  score: number;
  /** Monotonic spawn counter — enemy ids + spawn-position draws key off it. */
  spawnSeq: number;
  /** Kills since the last drop (forces one at PITY_LIMIT). */
  pity: number;
}
```

- [ ] **Step 2: Write the failing weapons test**

```ts
// src/game/overrun/weapons.test.ts
import { describe, expect, it } from "vitest";
import { coerceGun, DEFAULT_GUN, freshAmmo, GUN_IDS, GUNS, hasReserve } from "./weapons";

describe("gun table", () => {
  it("defines exactly the slice guns", () => {
    expect(GUN_IDS).toEqual(["pistol", "shotgun", "rifle"]);
    expect(DEFAULT_GUN).toBe("pistol");
  });

  it("matches the roadmap START numbers", () => {
    expect(GUNS.pistol).toMatchObject({ damage: 12, rpm: 300, magSize: 12, reserveMax: null, reloadS: 1.2, spreadDeg: 2, pellets: 1, range: 20, pierce: 0 });
    expect(GUNS.shotgun).toMatchObject({ damage: 8, rpm: 70, magSize: 6, reserveMax: 36, reloadS: 1.0, spreadDeg: 9, pellets: 8, range: 12, pierce: 0 });
    expect(GUNS.rifle).toMatchObject({ damage: 34, rpm: 220, magSize: 10, reserveMax: 60, reloadS: 1.6, spreadDeg: 1, pellets: 1, range: 40, pierce: 1 });
  });

  it("freshAmmo fills the mag and reserve (0 for the infinite pistol)", () => {
    expect(freshAmmo("rifle")).toEqual({ mag: 10, reserve: 60, reloadRemaining: 0, fireCooldown: 0 });
    expect(freshAmmo("pistol")).toEqual({ mag: 12, reserve: 0, reloadRemaining: 0, fireCooldown: 0 });
  });

  it("hasReserve: pistol always true; others only with rounds left", () => {
    expect(hasReserve("pistol", freshAmmo("pistol"))).toBe(true);
    expect(hasReserve("shotgun", { mag: 0, reserve: 0, reloadRemaining: 0, fireCooldown: 0 })).toBe(false);
    expect(hasReserve("shotgun", { mag: 0, reserve: 6, reloadRemaining: 0, fireCooldown: 0 })).toBe(true);
  });

  it("coerceGun rejects junk", () => {
    expect(coerceGun("rifle")).toBe("rifle");
    expect(coerceGun("bazooka")).toBe(DEFAULT_GUN);
    expect(coerceGun(42)).toBe(DEFAULT_GUN);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npx vitest run src/game/overrun/weapons.test.ts`
Expected: FAIL — `Cannot find module './weapons'`.

- [ ] **Step 4: Write `src/game/overrun/weapons.ts`**

```ts
// src/game/overrun/weapons.ts
/**
 * The slice's 3-gun arsenal — all hitscan (bullets resolve on the fire tick and
 * NEVER serialize). Numbers from the roadmap START table; tune in playtest.
 */

import type { AmmoState, GunId } from "./types";

export interface GunDef {
  id: GunId;
  name: string;
  /** Damage per pellet (pre-perk). */
  damage: number;
  rpm: number;
  magSize: number;
  /** Max reserve rounds; null = infinite (the pistol fallback). */
  reserveMax: number | null;
  reloadS: number;
  /** Max deviation (degrees) either side of the aim. */
  spreadDeg: number;
  pellets: number;
  /** Hitscan range in meters. */
  range: number;
  /** Enemies a single pellet passes through beyond the first. */
  pierce: number;
}

export const GUNS: Record<GunId, GunDef> = {
  pistol: { id: "pistol", name: "Pistol", damage: 12, rpm: 300, magSize: 12, reserveMax: null, reloadS: 1.2, spreadDeg: 2, pellets: 1, range: 20, pierce: 0 },
  shotgun: { id: "shotgun", name: "Shotgun", damage: 8, rpm: 70, magSize: 6, reserveMax: 36, reloadS: 1.0, spreadDeg: 9, pellets: 8, range: 12, pierce: 0 },
  rifle: { id: "rifle", name: "Rifle", damage: 34, rpm: 220, magSize: 10, reserveMax: 60, reloadS: 1.6, spreadDeg: 1, pellets: 1, range: 40, pierce: 1 },
};

export const GUN_IDS: GunId[] = ["pistol", "shotgun", "rifle"];
export const DEFAULT_GUN: GunId = "pistol";

/** Narrow an untrusted value to a known gun id. */
export function coerceGun(raw: unknown): GunId {
  return GUN_IDS.includes(raw as GunId) ? (raw as GunId) : DEFAULT_GUN;
}

/** Full mag + full reserve (0 for the infinite pistol — its reserve is never consumed). */
export function freshAmmo(gun: GunId): AmmoState {
  const def = GUNS[gun];
  return { mag: def.magSize, reserve: def.reserveMax ?? 0, reloadRemaining: 0, fireCooldown: 0 };
}

/** Can this gun still reload? The pistol always can (infinite reserve). */
export function hasReserve(gun: GunId, ammo: AmmoState): boolean {
  return GUNS[gun].reserveMax === null || ammo.reserve > 0;
}
```

- [ ] **Step 5: Run weapons test to verify it passes**

Run: `npx vitest run src/game/overrun/weapons.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Write the failing intent test**

```ts
// src/game/overrun/intent.test.ts
import { describe, expect, it } from "vitest";
import { coerceShooterIntent, initialShooterMemory, inputToShooterIntent } from "./intent";
import type { RawShooterInput } from "./types";

const RAW: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

describe("inputToShooterIntent", () => {
  it("fire is held-state (auto guns), reload is rising-edge", () => {
    const m0 = initialShooterMemory();
    const a = inputToShooterIntent({ ...RAW, fire: true, reload: true }, m0);
    expect(a.intent.fire).toBe(true);
    expect(a.intent.reload).toBe(true);
    const b = inputToShooterIntent({ ...RAW, fire: true, reload: true }, a.memory);
    expect(b.intent.fire).toBe(true); // still held
    expect(b.intent.reload).toBe(false); // edge consumed
  });

  it("perkPick fires once per key press, lowest key wins on chords", () => {
    const m0 = initialShooterMemory();
    const a = inputToShooterIntent({ ...RAW, pick2: true, pick3: true }, m0);
    expect(a.intent.perkPick).toBe(1);
    const b = inputToShooterIntent({ ...RAW, pick2: true, pick3: true }, a.memory);
    expect(b.intent.perkPick).toBe(null);
  });

  it("passes aim through", () => {
    const { intent } = inputToShooterIntent({ ...RAW, aim: 1.5 }, initialShooterMemory());
    expect(intent.aim).toBe(1.5);
  });
});

describe("coerceShooterIntent (anti-cheat boundary)", () => {
  it("sanitizes junk into a well-formed intent", () => {
    expect(coerceShooterIntent(null)).toEqual({
      move: { up: false, down: false, left: false, right: false },
      aim: undefined, fire: false, reload: false, perkPick: null,
    });
    expect(coerceShooterIntent({ move: { up: 1 }, fire: "yes", perkPick: 2, aim: 0.5 })).toEqual({
      move: { up: true, down: false, left: false, right: false },
      aim: 0.5, fire: true, reload: false, perkPick: 2,
    });
  });

  it("rejects out-of-range picks and non-finite aim", () => {
    expect(coerceShooterIntent({ perkPick: 7 }).perkPick).toBe(null);
    expect(coerceShooterIntent({ perkPick: -1 }).perkPick).toBe(null);
    expect(coerceShooterIntent({ aim: Infinity }).aim).toBe(undefined);
    expect(coerceShooterIntent({ aim: NaN }).aim).toBe(undefined);
  });
});
```

- [ ] **Step 7: Run to verify it fails, then write `src/game/overrun/intent.ts`**

Run: `npx vitest run src/game/overrun/intent.test.ts` → FAIL (`Cannot find module './intent'`).

```ts
// src/game/overrun/intent.ts
/**
 * Raw held-key state → serializable ShooterIntent (+ edge memory), and the
 * host-side trust boundary `coerceShooterIntent` (peers can only ever send
 * well-formed intent bits — never positions/health/enemies).
 */

import type { RawShooterInput, ShooterInputMemory, ShooterIntent } from "./types";

export function initialShooterMemory(): ShooterInputMemory {
  return { reloadHeld: false, pick1Held: false, pick2Held: false, pick3Held: false };
}

export function inputToShooterIntent(
  raw: RawShooterInput,
  mem: ShooterInputMemory,
): { intent: ShooterIntent; memory: ShooterInputMemory } {
  const picks: Array<0 | 1 | 2> = [];
  if (raw.pick1 && !mem.pick1Held) picks.push(0);
  if (raw.pick2 && !mem.pick2Held) picks.push(1);
  if (raw.pick3 && !mem.pick3Held) picks.push(2);
  return {
    intent: {
      move: { up: raw.up, down: raw.down, left: raw.left, right: raw.right },
      aim: raw.aim,
      fire: raw.fire,
      reload: raw.reload && !mem.reloadHeld,
      perkPick: picks[0] ?? null,
    },
    memory: { reloadHeld: raw.reload, pick1Held: raw.pick1, pick2Held: raw.pick2, pick3Held: raw.pick3 },
  };
}

/** Sanitize an untrusted wire intent (the host's anti-cheat boundary). */
export function coerceShooterIntent(raw: unknown): ShooterIntent {
  const i = (raw ?? {}) as Partial<ShooterIntent> & { move?: Partial<ShooterIntent["move"]> };
  const m: Partial<ShooterIntent["move"]> = i.move ?? {};
  const aim = Number.isFinite(i.aim) ? (i.aim as number) : undefined;
  const perkPick = i.perkPick === 0 || i.perkPick === 1 || i.perkPick === 2 ? i.perkPick : null;
  return {
    move: { up: !!m.up, down: !!m.down, left: !!m.left, right: !!m.right },
    aim,
    fire: !!i.fire,
    reload: !!i.reload,
    perkPick,
  };
}
```

- [ ] **Step 8: Run tests + typecheck, then commit**

Run: `npx vitest run src/game/overrun && npx tsc --noEmit`
Expected: PASS (rng + weapons + intent).

```bash
git add src/game/overrun/types.ts src/game/overrun/weapons.ts src/game/overrun/weapons.test.ts src/game/overrun/intent.ts src/game/overrun/intent.test.ts
git commit -m "feat(overrun): domain types, 3-gun hitscan table, intent mapping + trust boundary"
```

---

### Task 3: Perk pool + XP curve

**Files:**
- Create: `src/game/overrun/perks.ts`
- Test: `src/game/overrun/perks.test.ts`

**Interfaces:**
- Consumes: `hash01` (Task 1), `PerkId`, `PerkOffer` (Task 2), `PLAYER_HEALTH`, `PICKUP_RADIUS_M`, `XP_BASE`, `XP_PER_LEVEL` (Task 1).
- Produces: `EffectiveStats { fireRateMult, moveSpeedMult, damageMult, maxHealth, reloadMult, pickupRadius }`; `PerkDef { id, name, blurb, tags: string[] }`; `PERKS: Record<PerkId, PerkDef>`; `PERK_IDS: PerkId[]` (stable order — the wire index); `effectiveStats(perks: PerkId[]): EffectiveStats`; `rollOffer(seed: number, tick: number, playerId: string): PerkOffer`; `xpToNext(level: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/game/overrun/perks.test.ts
import { describe, expect, it } from "vitest";
import { effectiveStats, PERK_IDS, PERKS, rollOffer, xpToNext } from "./perks";
import { PLAYER_HEALTH, PICKUP_RADIUS_M } from "./constants";

describe("perk pool", () => {
  it("has 6 perks in a stable wire order, each with display copy and a tags hook", () => {
    expect(PERK_IDS).toEqual(["trigger", "sprint", "power", "vitality", "hands", "magnet"]);
    for (const id of PERK_IDS) {
      expect(PERKS[id].name.length).toBeGreaterThan(0);
      expect(PERKS[id].blurb.length).toBeGreaterThan(0);
      expect(Array.isArray(PERKS[id].tags)).toBe(true); // class/weapon scoping hook (empty now)
    }
  });

  it("effectiveStats: no perks = identity baseline", () => {
    expect(effectiveStats([])).toEqual({
      fireRateMult: 1, moveSpeedMult: 1, damageMult: 1,
      maxHealth: PLAYER_HEALTH, reloadMult: 1, pickupRadius: PICKUP_RADIUS_M,
    });
  });

  it("perks stack multiplicatively / additively and are order-independent", () => {
    const a = effectiveStats(["power", "power", "vitality"]);
    expect(a.damageMult).toBeCloseTo(1.3225); // 1.15²
    expect(a.maxHealth).toBe(PLAYER_HEALTH + 25);
    expect(effectiveStats(["vitality", "power", "power"])).toEqual(a);
  });

  it("rollOffer returns 3 DISTINCT perks, deterministically", () => {
    const o = rollOffer(42, 100, "p1");
    expect(new Set(o.choices).size).toBe(3);
    expect(rollOffer(42, 100, "p1")).toEqual(o);
    expect(rollOffer(42, 101, "p1")).not.toEqual(o); // tick-sensitive
    expect(rollOffer(42, 100, "p2")).not.toEqual(o); // player-sensitive
  });

  it("xpToNext grows linearly", () => {
    expect(xpToNext(0)).toBe(20);
    expect(xpToNext(1)).toBe(35);
    expect(xpToNext(4)).toBe(80);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/overrun/perks.test.ts` → FAIL (`Cannot find module './perks'`).

- [ ] **Step 3: Write `src/game/overrun/perks.ts`**

```ts
// src/game/overrun/perks.ts
/**
 * Global perk pool (Crimsonland-style level-up picks). Effects resolve through
 * pure `effectiveStats` so stacking is order-free. `tags` is the extension hook
 * for future class-/weapon-scoped perks (empty for the global pool).
 */

import { PICKUP_RADIUS_M, PLAYER_HEALTH, XP_BASE, XP_PER_LEVEL } from "./constants";
import { hash01 } from "./rng";
import type { PerkId, PerkOffer } from "./types";

export interface EffectiveStats {
  fireRateMult: number;
  moveSpeedMult: number;
  damageMult: number;
  maxHealth: number;
  reloadMult: number;
  pickupRadius: number;
}

export interface PerkDef {
  id: PerkId;
  name: string;
  blurb: string;
  /** Future class/weapon scoping filters on these (empty = global pool). */
  tags: string[];
}

/** Stable order — this index IS the wire encoding of a perk. Append only. */
export const PERK_IDS: PerkId[] = ["trigger", "sprint", "power", "vitality", "hands", "magnet"];

export const PERKS: Record<PerkId, PerkDef> = {
  trigger: { id: "trigger", name: "Hair Trigger", blurb: "+15% fire rate", tags: [] },
  sprint: { id: "sprint", name: "Adrenaline", blurb: "+10% move speed", tags: [] },
  power: { id: "power", name: "Hollow Points", blurb: "+15% damage", tags: [] },
  vitality: { id: "vitality", name: "Thick Skin", blurb: "+25 max health", tags: [] },
  hands: { id: "hands", name: "Fast Hands", blurb: "15% faster reload", tags: [] },
  magnet: { id: "magnet", name: "Scavenger", blurb: "+30% pickup radius", tags: [] },
};

/** Resolve a perk list into concrete multipliers/bonuses (order-independent). */
export function effectiveStats(perks: PerkId[]): EffectiveStats {
  const s: EffectiveStats = {
    fireRateMult: 1, moveSpeedMult: 1, damageMult: 1,
    maxHealth: PLAYER_HEALTH, reloadMult: 1, pickupRadius: PICKUP_RADIUS_M,
  };
  for (const p of perks) {
    if (p === "trigger") s.fireRateMult *= 1.15;
    else if (p === "sprint") s.moveSpeedMult *= 1.1;
    else if (p === "power") s.damageMult *= 1.15;
    else if (p === "vitality") s.maxHealth += 25;
    else if (p === "hands") s.reloadMult *= 0.85;
    else if (p === "magnet") s.pickupRadius *= 1.3;
  }
  return s;
}

/** Cumulative XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return XP_BASE + XP_PER_LEVEL * level;
}

/** Three DISTINCT perks for a level-up, drawn by coordinate-hash (deterministic). */
export function rollOffer(seed: number, tick: number, playerId: string): PerkOffer {
  const pool = [...PERK_IDS];
  const choices: PerkId[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const idx = Math.floor(hash01(seed, tick, playerId, "perk", slot) * pool.length);
    choices.push(pool.splice(idx, 1)[0]!);
  }
  return { choices: choices as [PerkId, PerkId, PerkId] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/overrun/perks.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/perks.ts src/game/overrun/perks.test.ts
git commit -m "feat(overrun): global perk pool + XP curve (tags hook for future classes)"
```

---

### Task 4: World factory + enemy definitions & steering

**Files:**
- Create: `src/game/overrun/match.ts`
- Create: `src/game/overrun/enemies.ts`
- Test: `src/game/overrun/match.test.ts`, `src/game/overrun/enemies.test.ts`

**Interfaces:**
- Consumes: types (Task 2), `freshAmmo`/`DEFAULT_GUN` (Task 2), constants (Task 1).
- Produces: `createShooterWorld(ids: PlayerId[], seed: number): ShooterWorld` (ring spawns, wave 0, phase "playing"); `alivePlayers(w: ShooterWorld): ShooterPlayer[]`; `sortedPlayerIds(w: ShooterWorld): PlayerId[]`; `EnemyDef { kind, radius, speed, health, damage, attackInterval, xp, cost, scoreValue, minWave }`; `ENEMIES: Record<EnemyKind, EnemyDef>`; `ENEMY_KINDS: EnemyKind[]` (stable wire order `["rusher","tank"]`); `nearestAlive(pos: Vec2, players: ShooterPlayer[]): ShooterPlayer | null` (players must be pre-sorted by id; ties → first); `stepEnemy(e: Enemy, target: Vec2 | null, dt: number): Enemy` (chase, stop at contact range, clamp to field).

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/overrun/match.test.ts
import { describe, expect, it } from "vitest";
import { alivePlayers, createShooterWorld, sortedPlayerIds } from "./match";
import { OVERRUN_FIELD_M, PLAYER_HEALTH } from "./constants";

describe("createShooterWorld", () => {
  it("spawns full-health pistol players on a ring around the center", () => {
    const w = createShooterWorld(["b", "a", "c"], 7);
    expect(sortedPlayerIds(w)).toEqual(["a", "b", "c"]);
    for (const p of Object.values(w.players)) {
      expect(p.health).toBe(PLAYER_HEALTH);
      expect(p.status).toBe("alive");
      expect(p.gun).toBe("pistol");
      expect(p.ammo.mag).toBe(12);
      const dx = p.pos.x - OVERRUN_FIELD_M / 2;
      const dy = p.pos.y - OVERRUN_FIELD_M / 2;
      expect(Math.hypot(dx, dy)).toBeCloseTo(3, 5);
    }
    // deterministic placement: sorted-id order around the ring
    expect(createShooterWorld(["b", "a", "c"], 7)).toEqual(w);
  });

  it("starts at wave 0, playing, with the seed carried in-world", () => {
    const w = createShooterWorld(["a"], 99);
    expect(w).toMatchObject({ tick: 0, phase: "playing", seed: 99, wave: 0, partySize: 1, pending: [], intermission: 0, enemies: [], pickups: [], events: [], score: 0, spawnSeq: 0, pity: 0 });
  });

  it("alivePlayers filters by status", () => {
    const w = createShooterWorld(["a", "b"], 1);
    w.players.a = { ...w.players.a!, status: "downed" };
    expect(alivePlayers(w).map((p) => p.id)).toEqual(["b"]);
  });
});
```

```ts
// src/game/overrun/enemies.test.ts
import { describe, expect, it } from "vitest";
import { ENEMIES, ENEMY_KINDS, nearestAlive, stepEnemy } from "./enemies";
import { createShooterWorld, alivePlayers } from "./match";
import type { Enemy } from "./types";

const enemy = (over: Partial<Enemy> = {}): Enemy => ({ id: "e0", kind: "rusher", pos: { x: 5, y: 5 }, health: 20, attackCooldown: 0, ...over });

describe("enemy defs", () => {
  it("defines rusher (fast/fragile) and tank (slow/beefy) with wave gating", () => {
    expect(ENEMY_KINDS).toEqual(["rusher", "tank"]);
    expect(ENEMIES.rusher).toMatchObject({ radius: 0.4, speed: 4.5, health: 20, damage: 5, attackInterval: 0.5, xp: 2, cost: 1, scoreValue: 10, minWave: 1 });
    expect(ENEMIES.tank).toMatchObject({ radius: 0.9, speed: 1.8, health: 120, damage: 20, attackInterval: 0.8, xp: 8, cost: 4, scoreValue: 40, minWave: 3 });
  });
});

describe("nearestAlive", () => {
  it("chases the closest living player; equal distances break to the lowest id", () => {
    const w = createShooterWorld(["a", "b"], 1);
    w.players.a = { ...w.players.a!, pos: { x: 10, y: 15 } };
    w.players.b = { ...w.players.b!, pos: { x: 20, y: 15 } };
    const sorted = alivePlayers(w).sort((p, q) => (p.id < q.id ? -1 : 1));
    expect(nearestAlive({ x: 12, y: 15 }, sorted)?.id).toBe("a");
    expect(nearestAlive({ x: 15, y: 15 }, sorted)?.id).toBe("a"); // tie → lowest id
    expect(nearestAlive({ x: 5, y: 5 }, [])).toBe(null);
  });
});

describe("stepEnemy", () => {
  it("moves toward the target at kind speed", () => {
    const e = stepEnemy(enemy(), { x: 15, y: 5 }, 0.1);
    expect(e.pos.x).toBeCloseTo(5.45, 5); // 4.5 m/s × 0.1 s
    expect(e.pos.y).toBeCloseTo(5, 5);
  });

  it("stops at contact range instead of overlapping the player", () => {
    const e = stepEnemy(enemy({ pos: { x: 14, y: 5 } }), { x: 15, y: 5 }, 1);
    // rusher radius 0.4 + player 0.75 = 1.15 contact distance
    expect(15 - e.pos.x).toBeCloseTo(1.15, 5);
  });

  it("ticks down the attack cooldown and idles with no target", () => {
    const e = stepEnemy(enemy({ attackCooldown: 0.5 }), null, 0.1);
    expect(e.attackCooldown).toBeCloseTo(0.4, 5);
    expect(e.pos).toEqual({ x: 5, y: 5 });
  });
});
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run src/game/overrun/match.test.ts src/game/overrun/enemies.test.ts` → FAIL (missing modules).

- [ ] **Step 3: Write the implementations**

```ts
// src/game/overrun/match.ts
/** Pure world factory + queries. Spawns are a deterministic ring (sorted-id order). */

import type { PlayerId } from "../arena/types";
import { OVERRUN_FIELD_M, PLAYER_HEALTH } from "./constants";
import { DEFAULT_GUN, freshAmmo } from "./weapons";
import type { ShooterPlayer, ShooterWorld } from "./types";

const SPAWN_RING_M = 3;

export function createShooterWorld(ids: PlayerId[], seed: number): ShooterWorld {
  const sorted = [...ids].sort();
  const c = OVERRUN_FIELD_M / 2;
  const players: Record<PlayerId, ShooterPlayer> = {};
  sorted.forEach((id, i) => {
    const a = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
    players[id] = {
      id,
      pos: { x: c + Math.cos(a) * SPAWN_RING_M, y: c + Math.sin(a) * SPAWN_RING_M },
      aim: 0,
      health: PLAYER_HEALTH,
      status: "alive",
      gun: DEFAULT_GUN,
      ammo: freshAmmo(DEFAULT_GUN),
      xp: 0,
      level: 0,
      perks: [],
      offers: [],
      stats: { shots: 0, hits: 0, kills: 0 },
      reviveProgress: 0,
      swapGuard: 0,
    };
  });
  return {
    tick: 0, phase: "playing", seed, wave: 0, partySize: sorted.length,
    pending: [], intermission: 0, players, enemies: [], pickups: [], events: [],
    score: 0, spawnSeq: 0, pity: 0,
  };
}

export function sortedPlayerIds(w: ShooterWorld): PlayerId[] {
  return Object.keys(w.players).sort();
}

export function alivePlayers(w: ShooterWorld): ShooterPlayer[] {
  return sortedPlayerIds(w)
    .map((id) => w.players[id]!)
    .filter((p) => p.status === "alive");
}
```

```ts
// src/game/overrun/enemies.ts
/**
 * Enemy roster + steering. Rushers swarm fast and nibble; tanks lumber in and
 * hit hard. AI is chase-nearest-alive with lowest-id tie-breaks (deterministic).
 */

import type { Vec2 } from "../arena/types";
import { OVERRUN_FIELD_M, PLAYER_RADIUS_M } from "./constants";
import type { Enemy, EnemyKind, ShooterPlayer } from "./types";

export interface EnemyDef {
  kind: EnemyKind;
  radius: number;
  speed: number;
  health: number;
  /** Contact damage per attack. */
  damage: number;
  /** Seconds between contact attacks. */
  attackInterval: number;
  xp: number;
  /** Wave-budget points this kind costs. */
  cost: number;
  /** Score awarded per kill (× current wave). */
  scoreValue: number;
  /** First wave this kind may appear on. */
  minWave: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  rusher: { kind: "rusher", radius: 0.4, speed: 4.5, health: 20, damage: 5, attackInterval: 0.5, xp: 2, cost: 1, scoreValue: 10, minWave: 1 },
  tank: { kind: "tank", radius: 0.9, speed: 1.8, health: 120, damage: 20, attackInterval: 0.8, xp: 8, cost: 4, scoreValue: 40, minWave: 3 },
};

/** Stable order — this index IS the wire encoding of a kind. Append only. */
export const ENEMY_KINDS: EnemyKind[] = ["rusher", "tank"];

/** Closest living player (input must be sorted by id; ties keep the first = lowest id). */
export function nearestAlive(pos: Vec2, players: ShooterPlayer[]): ShooterPlayer | null {
  let best: ShooterPlayer | null = null;
  let bestD = Infinity;
  for (const p of players) {
    const d = Math.hypot(p.pos.x - pos.x, p.pos.y - pos.y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

/** Chase the target, stopping at contact range; always tick the attack cooldown. */
export function stepEnemy(e: Enemy, target: Vec2 | null, dt: number): Enemy {
  const def = ENEMIES[e.kind];
  const cooled = Math.max(0, e.attackCooldown - dt);
  if (!target) return { ...e, attackCooldown: cooled };
  const dx = target.x - e.pos.x;
  const dy = target.y - e.pos.y;
  const dist = Math.hypot(dx, dy);
  const contact = def.radius + PLAYER_RADIUS_M;
  const travel = Math.min(def.speed * dt, Math.max(0, dist - contact));
  const pos =
    dist > 1e-9
      ? {
          x: clamp(e.pos.x + (dx / dist) * travel, def.radius, OVERRUN_FIELD_M - def.radius),
          y: clamp(e.pos.y + (dy / dist) * travel, def.radius, OVERRUN_FIELD_M - def.radius),
        }
      : e.pos;
  return { ...e, pos, attackCooldown: cooled };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/overrun` → all overrun tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/match.ts src/game/overrun/match.test.ts src/game/overrun/enemies.ts src/game/overrun/enemies.test.ts
git commit -m "feat(overrun): world factory (ring spawns) + rusher/tank defs & deterministic steering"
```

---

### Task 5: Firing — hitscan rays, reload machine, pistol fallback

**Files:**
- Create: `src/game/overrun/firing.ts`
- Test: `src/game/overrun/firing.test.ts`

**Interfaces:**
- Consumes: `GUNS`/`freshAmmo`/`hasReserve` (Task 2), `effectiveStats`-shaped `EffectiveStats` (Task 3), `ENEMIES` (Task 4), `hash01` (Task 1).
- Produces:
  - `tickAmmo(p: ShooterPlayer, dt: number, eff: EffectiveStats): ShooterPlayer` — decrements `fireCooldown`; runs the reload countdown and, on completion, fills the mag from reserve (pistol reserve untouched).
  - `tryStartReload(p: ShooterPlayer, eff: EffectiveStats): ShooterPlayer` — starts a reload if mag not full, reserve available, not already reloading.
  - `fireTick(p: ShooterPlayer, enemies: Enemy[], fire: boolean, seed: number, tick: number, eff: EffectiveStats): { player: ShooterPlayer; enemies: Enemy[]; events: ShooterEvent[] }` — the per-player firing resolution; damaged enemies come back with reduced `health` (possibly ≤ 0; the sim removes them and attributes kills to `p.id`).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/overrun/firing.test.ts
import { describe, expect, it } from "vitest";
import { fireTick, tickAmmo, tryStartReload } from "./firing";
import { effectiveStats } from "./perks";
import { freshAmmo, GUNS } from "./weapons";
import { createShooterWorld } from "./match";
import type { Enemy, ShooterPlayer } from "./types";

const EFF = effectiveStats([]);
const player = (over: Partial<ShooterPlayer> = {}): ShooterPlayer => ({
  ...createShooterWorld(["p1"], 1).players.p1!,
  pos: { x: 5, y: 15 }, aim: 0, ...over,
});
const enemy = (id: string, x: number, over: Partial<Enemy> = {}): Enemy => ({
  id, kind: "rusher", pos: { x, y: 15 }, health: 20, attackCooldown: 0, ...over,
});

describe("fireTick", () => {
  it("held fire shoots at the gun's RPM (cooldown-gated), decrementing the mag", () => {
    let p = player();
    const r1 = fireTick(p, [], true, 1, 10, EFF);
    expect(r1.player.ammo.mag).toBe(11);
    expect(r1.player.ammo.fireCooldown).toBeCloseTo(60 / 300, 5);
    expect(r1.player.stats.shots).toBe(1);
    // cooldown not yet elapsed → no second shot
    const r2 = fireTick(r1.player, [], true, 1, 11, EFF);
    expect(r2.player.ammo.mag).toBe(11);
    expect(r2.player.stats.shots).toBe(1);
  });

  it("hits the nearest enemy on the ray and emits a shot event with the impact point", () => {
    const p = player(); // aiming +x from (5,15)
    const far = enemy("e2", 12);
    const near = enemy("e1", 8);
    const r = fireTick(p, [far, near], true, 1, 0, EFF);
    const e1 = r.enemies.find((e) => e.id === "e1")!;
    const e2 = r.enemies.find((e) => e.id === "e2")!;
    expect(e1.health).toBe(20 - GUNS.pistol.damage);
    expect(e2.health).toBe(20); // pistol pierce 0 — blocked by the near one
    expect(r.player.stats.hits).toBe(1);
    const shot = r.events.find((e) => e.kind === "shot")!;
    expect(shot.kind === "shot" && shot.to.x).toBeCloseTo(8, 0); // tracer ends at the hit
  });

  it("rifle pierces exactly one extra enemy", () => {
    const p = player({ gun: "rifle", ammo: freshAmmo("rifle") });
    const r = fireTick(p, [enemy("e1", 8), enemy("e2", 12), enemy("e3", 16)], true, 1, 0, EFF);
    expect(r.enemies.find((e) => e.id === "e1")!.health).toBe(20 - 34);
    expect(r.enemies.find((e) => e.id === "e2")!.health).toBe(20 - 34);
    expect(r.enemies.find((e) => e.id === "e3")!.health).toBe(20); // pierce 1 exhausted
  });

  it("shotgun fires 8 pellets with deterministic spread; counts ONE shot", () => {
    const p = player({ gun: "shotgun", ammo: freshAmmo("shotgun") });
    const a = fireTick(p, [enemy("e1", 5.8, { health: 1000 })], true, 42, 7, EFF);
    const b = fireTick(p, [enemy("e1", 5.8, { health: 1000 })], true, 42, 7, EFF);
    expect(a.enemies[0]!.health).toBe(b.enemies[0]!.health); // same coords → same pellets
    expect(a.player.stats.shots).toBe(1);
    // point blank: every pellet lands → 8 × 8 damage
    expect(a.enemies[0]!.health).toBe(1000 - 8 * 8);
    // different tick → different spread draw
    const c = fireTick(p, [enemy("e1", 11, { health: 1000 })], true, 42, 8, EFF);
    const d = fireTick(p, [enemy("e1", 11, { health: 1000 })], true, 42, 7, EFF);
    expect(c.enemies[0]!.health === d.enemies[0]!.health).toBe(false);
  });

  it("respects range", () => {
    const p = player(); // pistol range 20
    const r = fireTick(p, [enemy("e1", 26)], true, 1, 0, EFF);
    expect(r.enemies[0]!.health).toBe(20);
    expect(r.player.stats.hits).toBe(0);
  });

  it("empty mag with reserve auto-starts a reload; firing stays blocked while reloading", () => {
    const p = player({ gun: "shotgun", ammo: { mag: 0, reserve: 12, reloadRemaining: 0, fireCooldown: 0 } });
    const r = fireTick(p, [], true, 1, 0, EFF);
    expect(r.player.ammo.reloadRemaining).toBeCloseTo(GUNS.shotgun.reloadS, 5);
    expect(r.events).toEqual([]);
    const r2 = fireTick(r.player, [], true, 1, 1, EFF);
    expect(r2.player.ammo.mag).toBe(0); // still reloading — no shot
  });

  it("mag AND reserve empty falls back to a fresh infinite pistol", () => {
    const p = player({ gun: "rifle", ammo: { mag: 0, reserve: 0, reloadRemaining: 0, fireCooldown: 0 } });
    const r = fireTick(p, [], true, 1, 0, EFF);
    expect(r.player.gun).toBe("pistol");
    expect(r.player.ammo.mag).toBe(12);
  });

  it("downed players and idle triggers don't fire", () => {
    expect(fireTick(player({ status: "downed" }), [], true, 1, 0, EFF).events).toEqual([]);
    expect(fireTick(player(), [], false, 1, 0, EFF).player.ammo.mag).toBe(12);
  });
});

describe("reload machine", () => {
  it("tryStartReload arms the countdown (perk-scaled) and completion fills the mag from reserve", () => {
    let p = player({ gun: "rifle", ammo: { mag: 3, reserve: 20, reloadRemaining: 0, fireCooldown: 0 } });
    p = tryStartReload(p, effectiveStats(["hands"]));
    expect(p.ammo.reloadRemaining).toBeCloseTo(1.6 * 0.85, 5);
    p = tickAmmo(p, 2, effectiveStats(["hands"]));
    expect(p.ammo).toMatchObject({ mag: 10, reserve: 13, reloadRemaining: 0 });
  });

  it("pistol reload completion never consumes reserve", () => {
    let p = player({ ammo: { mag: 2, reserve: 0, reloadRemaining: 0.01, fireCooldown: 0 } });
    p = tickAmmo(p, 0.1, EFF);
    expect(p.ammo).toMatchObject({ mag: 12, reserve: 0 });
  });

  it("tryStartReload is a no-op on full mag / no reserve / already reloading", () => {
    const full = player();
    expect(tryStartReload(full, EFF)).toEqual(full);
    const dry = player({ gun: "rifle", ammo: { mag: 2, reserve: 0, reloadRemaining: 0, fireCooldown: 0 } });
    expect(tryStartReload(dry, EFF)).toEqual(dry);
  });

  it("multi-shot ceiling is documented: max RPM 300 < 30 Hz tick rate × 60", () => {
    // At 30 Hz a tick is 33.3 ms; the fastest slice gun (pistol, 300 RPM) fires every
    // 200 ms — so at most ONE shot per tick can ever be due. If a faster gun is added
    // (>1800 RPM), fireTick must gain a multi-shot-per-tick loop. Assert the invariant:
    for (const g of Object.values(GUNS)) expect(g.rpm).toBeLessThanOrEqual(1800);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/overrun/firing.test.ts` → FAIL (`Cannot find module './firing'`).

- [ ] **Step 3: Write `src/game/overrun/firing.ts`**

```ts
// src/game/overrun/firing.ts
/**
 * Hitscan firing + the reload state machine. Bullets resolve on the fire tick —
 * they never exist as world state, so they never serialize. Rays query ENEMIES
 * ONLY: no friendly fire is possible by construction.
 *
 * Every random draw (pellet spread) is hash01(seed, tick, playerId, pellet) —
 * stable coordinates, no cursor.
 */

import { hash01 } from "./rng";
import { ENEMIES } from "./enemies";
import type { EffectiveStats } from "./perks";
import { freshAmmo, GUNS, hasReserve } from "./weapons";
import type { Enemy, ShooterEvent, ShooterPlayer } from "./types";

/** Advance cooldowns/reload by dt; a finished reload fills the mag from reserve. */
export function tickAmmo(p: ShooterPlayer, dt: number, _eff: EffectiveStats): ShooterPlayer {
  const def = GUNS[p.gun];
  const fireCooldown = Math.max(0, p.ammo.fireCooldown - dt);
  let { mag, reserve, reloadRemaining } = p.ammo;
  if (reloadRemaining > 0) {
    reloadRemaining = Math.max(0, reloadRemaining - dt);
    if (reloadRemaining === 0) {
      const want = def.magSize - mag;
      const take = def.reserveMax === null ? want : Math.min(want, reserve);
      mag += take;
      if (def.reserveMax !== null) reserve -= take;
    }
  }
  return { ...p, ammo: { mag, reserve, reloadRemaining, fireCooldown } };
}

/** Start a reload if it would do something (blocks firing, not movement). */
export function tryStartReload(p: ShooterPlayer, eff: EffectiveStats): ShooterPlayer {
  const def = GUNS[p.gun];
  if (p.ammo.reloadRemaining > 0 || p.ammo.mag >= def.magSize || !hasReserve(p.gun, p.ammo)) return p;
  return { ...p, ammo: { ...p.ammo, reloadRemaining: def.reloadS * eff.reloadMult } };
}

/** One player's firing resolution for this tick. Damaged enemies return with reduced health. */
export function fireTick(
  p: ShooterPlayer,
  enemies: Enemy[],
  fire: boolean,
  seed: number,
  tick: number,
  eff: EffectiveStats,
): { player: ShooterPlayer; enemies: Enemy[]; events: ShooterEvent[] } {
  if (!fire || p.status !== "alive" || p.ammo.reloadRemaining > 0 || p.ammo.fireCooldown > 0) {
    return { player: p, enemies, events: [] };
  }
  const def = GUNS[p.gun];
  if (p.ammo.mag <= 0) {
    if (hasReserve(p.gun, p.ammo)) return { player: tryStartReload(p, eff), enemies, events: [] };
    // both empty → the infinite-pistol fallback
    return { player: { ...p, gun: "pistol", ammo: freshAmmo("pistol") }, enemies, events: [] };
  }

  const out = enemies.map((e) => ({ ...e }));
  const events: ShooterEvent[] = [];
  let landed = false;
  const spreadRad = (def.spreadDeg * Math.PI) / 180;

  for (let pellet = 0; pellet < def.pellets; pellet++) {
    const a = p.aim + (hash01(seed, tick, p.id, "spread", pellet) * 2 - 1) * spreadRad;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    // collect ray hits: perpendicular distance ≤ enemy radius, 0 ≤ t ≤ range
    const hits: { idx: number; t: number }[] = [];
    out.forEach((e, idx) => {
      if (e.health <= 0) return; // already dead from an earlier pellet
      const rx = e.pos.x - p.pos.x;
      const ry = e.pos.y - p.pos.y;
      const t = rx * dir.x + ry * dir.y;
      if (t < 0 || t > def.range) return;
      const perp = Math.hypot(rx - t * dir.x, ry - t * dir.y);
      if (perp <= ENEMIES[e.kind].radius) hits.push({ idx, t });
    });
    hits.sort((h1, h2) => h1.t - h2.t || (out[h1.idx]!.id < out[h2.idx]!.id ? -1 : 1));
    const taken = hits.slice(0, def.pierce + 1);
    for (const h of taken) {
      out[h.idx]!.health -= def.damage * eff.damageMult;
      landed = true;
    }
    const endT = taken.length > 0 ? taken[taken.length - 1]!.t : def.range;
    events.push({
      tick, kind: "shot", gun: p.gun,
      from: { x: p.pos.x, y: p.pos.y },
      to: { x: p.pos.x + dir.x * endT, y: p.pos.y + dir.y * endT },
    });
  }

  const player: ShooterPlayer = {
    ...p,
    ammo: { ...p.ammo, mag: p.ammo.mag - 1, fireCooldown: 60 / (def.rpm * eff.fireRateMult) },
    stats: { ...p.stats, shots: p.stats.shots + 1, hits: p.stats.hits + (landed ? 1 : 0) },
  };
  return { player, enemies: out, events };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/overrun/firing.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add src/game/overrun/firing.ts src/game/overrun/firing.test.ts
git commit -m "feat(overrun): hitscan firing (spread/pierce/pellets), reload machine, pistol fallback"
```

---
### Task 6: Waves — budget, composition, perimeter spawns

**Files:**
- Create: `src/game/overrun/waves.ts`
- Test: `src/game/overrun/waves.test.ts`

**Interfaces:**
- Consumes: `hash01` (Task 1), `ENEMIES`/`ENEMY_KINDS` (Task 4), `OVERRUN_FIELD_M` (Task 1).
- Produces: `waveBudget(wave: number, partySize: number): number`; `composeWave(seed: number, wave: number, partySize: number): EnemyKind[]` (the pending-spawn queue); `spawnPos(seed: number, spawnSeq: number): Vec2` (on the field perimeter).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/overrun/waves.test.ts
import { describe, expect, it } from "vitest";
import { composeWave, spawnPos, waveBudget } from "./waves";
import { ENEMIES } from "./enemies";
import { OVERRUN_FIELD_M } from "./constants";

describe("waveBudget", () => {
  it("escalates with the wave and scales with party size", () => {
    expect(waveBudget(1, 1)).toBe(10);   // (6+4)×1.0
    expect(waveBudget(1, 8)).toBe(45);   // (6+4)×4.5
    expect(waveBudget(5, 1)).toBe(26);   // (6+20)×1.0
    expect(waveBudget(2, 4)).toBeGreaterThan(waveBudget(2, 1));
    expect(waveBudget(3, 2)).toBeGreaterThan(waveBudget(2, 2));
  });
});

describe("composeWave", () => {
  it("spends the whole budget and is deterministic", () => {
    const q = composeWave(42, 4, 3);
    const cost = q.reduce((s, k) => s + ENEMIES[k].cost, 0);
    expect(cost).toBe(waveBudget(4, 3));
    expect(composeWave(42, 4, 3)).toEqual(q);
    expect(composeWave(43, 4, 3)).not.toEqual(q);
  });

  it("never schedules tanks before their minWave", () => {
    for (let w = 1; w < 3; w++) {
      expect(composeWave(7, w, 8).every((k) => k === "rusher")).toBe(true);
    }
  });

  it("mixes tanks in from wave 3 (probabilistically, over several seeds)", () => {
    const kinds = new Set([1, 2, 3, 4, 5].flatMap((seed) => composeWave(seed, 6, 4)));
    expect(kinds.has("tank")).toBe(true);
  });
});

describe("spawnPos", () => {
  it("always lands exactly on the field perimeter, deterministically", () => {
    for (let s = 0; s < 200; s++) {
      const p = spawnPos(9, s);
      const onEdge =
        p.x === 0 || p.x === OVERRUN_FIELD_M || p.y === 0 || p.y === OVERRUN_FIELD_M;
      expect(onEdge).toBe(true);
      expect(spawnPos(9, s)).toEqual(p);
    }
  });

  it("spreads spawns around all four edges", () => {
    const edges = new Set<string>();
    for (let s = 0; s < 100; s++) {
      const p = spawnPos(3, s);
      if (p.y === 0) edges.add("top");
      else if (p.y === OVERRUN_FIELD_M) edges.add("bottom");
      else if (p.x === 0) edges.add("left");
      else edges.add("right");
    }
    expect(edges.size).toBe(4);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/overrun/waves.test.ts` → FAIL (`Cannot find module './waves'`).

- [ ] **Step 3: Write `src/game/overrun/waves.ts`**

```ts
// src/game/overrun/waves.ts
/**
 * Wave engine: a points budget (escalating with the wave, proportional to the
 * frozen partySize) is spent on enemy kinds; spawns land on the field perimeter.
 * All draws are coordinate-hashed off (seed, wave|spawnSeq) — reproducible anywhere.
 */

import type { Vec2 } from "../arena/types";
import { OVERRUN_FIELD_M } from "./constants";
import { ENEMIES } from "./enemies";
import { hash01 } from "./rng";
import type { EnemyKind } from "./types";

const BASE_BUDGET = 6;
const BUDGET_PER_WAVE = 4;
const TANK_MIX = 0.25;

/** Points to spend on this wave. partySize is frozen at wave start (mid-wave churn immune). */
export function waveBudget(wave: number, partySize: number): number {
  return Math.round((BASE_BUDGET + BUDGET_PER_WAVE * wave) * (0.5 + 0.5 * partySize));
}

/** The wave's spawn queue: kinds drawn per-slot off (seed, "mix", wave, i). */
export function composeWave(seed: number, wave: number, partySize: number): EnemyKind[] {
  let points = waveBudget(wave, partySize);
  const queue: EnemyKind[] = [];
  for (let i = 0; points > 0; i++) {
    const tankOk = wave >= ENEMIES.tank.minWave && points >= ENEMIES.tank.cost;
    const kind: EnemyKind = tankOk && hash01(seed, "mix", wave, i) < TANK_MIX ? "tank" : "rusher";
    queue.push(kind);
    points -= ENEMIES[kind].cost;
  }
  return queue;
}

/** Perimeter position for the Nth spawn: walk the square's edge by a hashed parameter. */
export function spawnPos(seed: number, spawnSeq: number): Vec2 {
  const t = hash01(seed, "spawn", spawnSeq) * 4;
  const f = OVERRUN_FIELD_M;
  const d = (t % 1) * f;
  if (t < 1) return { x: d, y: 0 };
  if (t < 2) return { x: f, y: d };
  if (t < 3) return { x: f - d, y: f };
  return { x: 0, y: f - d };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/overrun/waves.test.ts` → PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/waves.ts src/game/overrun/waves.test.ts
git commit -m "feat(overrun): wave budget/composition + perimeter spawn positions"
```

---

### Task 7: Drops + run stats / merch payload

**Files:**
- Create: `src/game/overrun/drops.ts`
- Create: `src/game/overrun/stats.ts`
- Test: `src/game/overrun/drops.test.ts`, `src/game/overrun/stats.test.ts`

**Interfaces:**
- Consumes: `hash01`, drop constants (Task 1), types (Task 2).
- Produces: `rollDrop(seed: number, tick: number, enemy: Enemy, pickupsLive: number, pity: number): { pickup: Pickup | null; pity: number }`; `accuracy(s: ShooterStats): number` (0..1, 0-safe); `buildOverrunPrintPayload(world: ShooterWorld, id: PlayerId): { title: string; sub: string }`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/overrun/drops.test.ts
import { describe, expect, it } from "vitest";
import { rollDrop } from "./drops";
import { MAX_PICKUPS, PICKUP_TTL_S, PITY_LIMIT } from "./constants";
import type { Enemy } from "./types";

const enemy = (id = "e5"): Enemy => ({ id, kind: "rusher", pos: { x: 3, y: 4 }, health: 0, attackCooldown: 0 });

describe("rollDrop", () => {
  it("is deterministic and reproducible for the same coordinates", () => {
    const a = rollDrop(42, 100, enemy(), 0, 0);
    expect(rollDrop(42, 100, enemy(), 0, 0)).toEqual(a);
  });

  it("drops land at the enemy's position with a deterministic id + ttl, and reset pity", () => {
    // scan ticks until a drop occurs (base rate 16%) — bounded scan keeps the test fast
    for (let t = 0; t < 200; t++) {
      const r = rollDrop(1, t, enemy("e9"), 0, 0);
      if (r.pickup) {
        expect(r.pickup).toMatchObject({ id: "pk:e9", pos: { x: 3, y: 4 }, ttl: PICKUP_TTL_S });
        expect(["shotgun", "rifle", "medkit"]).toContain(r.pickup.kind);
        expect(r.pity).toBe(0);
        return;
      }
      expect(r.pity).toBe(1);
    }
    throw new Error("no drop in 200 ticks — weights broken");
  });

  it("roughly matches the configured rates over many draws", () => {
    let weapons = 0, medkits = 0;
    for (let t = 0; t < 2000; t++) {
      const r = rollDrop(7, t, enemy(`e${t}`), 0, 0);
      if (r.pickup?.kind === "medkit") medkits++;
      else if (r.pickup) weapons++;
    }
    expect(weapons / 2000).toBeGreaterThan(0.06);
    expect(weapons / 2000).toBeLessThan(0.14);
    expect(medkits / 2000).toBeGreaterThan(0.03);
    expect(medkits / 2000).toBeLessThan(0.09);
  });

  it("pity forces a drop at the limit", () => {
    // find coordinates that would NOT drop naturally, then apply pity pressure
    let t = 0;
    while (rollDrop(3, t, enemy(), 0, 0).pickup) t++;
    const forced = rollDrop(3, t, enemy(), 0, PITY_LIMIT - 1);
    expect(forced.pickup).not.toBeNull();
    expect(forced.pity).toBe(0);
  });

  it("never drops past the live-pickup cap (and still counts pity)", () => {
    const r = rollDrop(1, 0, enemy(), MAX_PICKUPS, PITY_LIMIT - 1);
    expect(r.pickup).toBeNull();
    expect(r.pity).toBe(PITY_LIMIT);
  });
});
```

```ts
// src/game/overrun/stats.test.ts
import { describe, expect, it } from "vitest";
import { accuracy, buildOverrunPrintPayload } from "./stats";
import { createShooterWorld } from "./match";

describe("accuracy", () => {
  it("is hits/shots, zero-safe", () => {
    expect(accuracy({ shots: 0, hits: 0, kills: 0 })).toBe(0);
    expect(accuracy({ shots: 200, hits: 156, kills: 90 })).toBeCloseTo(0.78);
  });
});

describe("buildOverrunPrintPayload", () => {
  it("builds the merch title/sub from the run", () => {
    const w = createShooterWorld(["p1"], 1);
    w.wave = 12;
    w.players.p1 = {
      ...w.players.p1!,
      level: 9,
      stats: { shots: 440, hits: 343, kills: 342 },
    };
    expect(buildOverrunPrintPayload(w, "p1")).toEqual({
      title: "OVERRUN · WAVE 12",
      sub: "342 KILLS · 78% ACC · LVL 9",
    });
  });

  it("degrades gracefully for an unknown player", () => {
    const w = createShooterWorld(["p1"], 1);
    expect(buildOverrunPrintPayload(w, "ghost")).toEqual({
      title: "OVERRUN · WAVE 0",
      sub: "0 KILLS · 0% ACC · LVL 0",
    });
  });
});
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run src/game/overrun/drops.test.ts src/game/overrun/stats.test.ts` → FAIL (missing modules).

- [ ] **Step 3: Write the implementations**

```ts
// src/game/overrun/drops.ts
/**
 * Weapon/medkit drop economy: weighted roll per kill, a pity counter that
 * forces a drop after a dry streak, and a hard live-pickup cap (anti-flood +
 * snapshot-size guard). Pity lives IN the world so host migration keeps it.
 */

import { DROP_MEDKIT_P, DROP_WEAPON_P, MAX_PICKUPS, PICKUP_TTL_S, PITY_LIMIT } from "./constants";
import { hash01 } from "./rng";
import type { Enemy, Pickup, PickupKind } from "./types";

export function rollDrop(
  seed: number,
  tick: number,
  enemy: Enemy,
  pickupsLive: number,
  pity: number,
): { pickup: Pickup | null; pity: number } {
  if (pickupsLive >= MAX_PICKUPS) return { pickup: null, pity: pity + 1 };
  const r = hash01(seed, tick, enemy.id, "drop");
  const forced = pity + 1 >= PITY_LIMIT;
  let kind: PickupKind | null = null;
  if (r < DROP_WEAPON_P) {
    kind = hash01(seed, tick, enemy.id, "gun") < 0.5 ? "shotgun" : "rifle";
  } else if (r < DROP_WEAPON_P + DROP_MEDKIT_P) {
    kind = "medkit";
  } else if (forced) {
    kind = hash01(seed, tick, enemy.id, "pity") < 0.5 ? "medkit" : hash01(seed, tick, enemy.id, "gun") < 0.5 ? "shotgun" : "rifle";
  }
  if (!kind) return { pickup: null, pity: pity + 1 };
  return {
    pickup: { id: `pk:${enemy.id}`, kind, pos: { x: enemy.pos.x, y: enemy.pos.y }, ttl: PICKUP_TTL_S },
    pity: 0,
  };
}
```

```ts
// src/game/overrun/stats.ts
/**
 * Run-stat derivations + the merch-print payload (fed through the existing
 * sanitizePayload/buildShopUrl funnel by the island — this stays pure strings).
 */

import type { PlayerId } from "../arena/types";
import type { ShooterStats, ShooterWorld } from "./types";

/** Landed trigger-pulls over total, in [0,1]; 0 when no shots fired. */
export function accuracy(s: ShooterStats): number {
  return s.shots === 0 ? 0 : s.hits / s.shots;
}

/** Scorecard line for the trophy shop: title ≤24 chars, sub ≤36 (print.ts clamps anyway). */
export function buildOverrunPrintPayload(world: ShooterWorld, id: PlayerId): { title: string; sub: string } {
  const p = world.players[id];
  const kills = p?.stats.kills ?? 0;
  const acc = Math.round(accuracy(p?.stats ?? { shots: 0, hits: 0, kills: 0 }) * 100);
  const level = p?.level ?? 0;
  return {
    title: `OVERRUN · WAVE ${world.wave}`,
    sub: `${kills} KILLS · ${acc}% ACC · LVL ${level}`,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/overrun` → all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/drops.ts src/game/overrun/drops.test.ts src/game/overrun/stats.ts src/game/overrun/stats.test.ts
git commit -m "feat(overrun): drop economy (weights+pity+cap) and run stats / merch payload"
```

---

### Task 8: The reducer — `stepShooter` + purity guard

**Files:**
- Create: `src/game/overrun/sim.ts`
- Create: `src/game/overrun/purity.test.ts`
- Test: `src/game/overrun/sim.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–7.
- Produces: `stepShooter(world: ShooterWorld, intents: Record<PlayerId, ShooterIntent>, dt: number): ShooterWorld` — THE single reducer later tasks (adapter, session) plug into `SyncAdapter.step`.

**Fixed phase order inside one step** (documented in the file header; tests below pin the tricky orderings):
1. If `phase === "ended"`: return the world unchanged (frozen for the scoreboard).
2. `tick + 1`; prune events older than `EVENT_TTL_TICKS`.
3. **Perk picks** (sorted player ids): `perkPick` consumes the HEAD offer only.
4. **Player upkeep + movement** (sorted ids): tick `swapGuard`/ammo (`tickAmmo`); alive players move (normalized diagonal × `PLAYER_SPEED_MS` × perk, clamped to `[PLAYER_RADIUS_M, FIELD − PLAYER_RADIUS_M]`); `reload` edge → `tryStartReload`; `aim` echoed into the player when finite.
5. **Firing** (sorted ids, sequential so kill attribution is direct): `fireTick` per player; after each player's fire, collect enemies with `health ≤ 0` → for each (in array order): killer gets `xp` (level-ups loop `xpToNext`, each pushes `rollOffer(seed, tick, killerId)` + `levelup` event), `stats.kills + 1`, `score += scoreValue × wave`, `kill` event, `rollDrop` (live count = current pickups incl. ones added this tick), then remove the enemy.
6. **Enemies** (array order): `stepEnemy` toward `nearestAlive`; in contact range with `attackCooldown === 0` → damage the target, set cooldown; a player reaching `health ≤ 0` becomes `downed` (health 0, `downed` event, `reviveProgress` 0).
7. **Revive** (sorted ids): each downed player with ≥1 alive teammate within `REVIVE_RANGE_M` gains `reviveProgress + dt` (else reset to 0); at `REVIVE_S` → `alive` with `min(REVIVE_HEALTH, eff.maxHealth)` health + `revived` event.
8. **Wipe check** (AFTER revive — revive-before-wipe): no `alive` players → `phase = "ended"`.
9. **Pickups**: `ttl − dt`, expired removed; alive players (sorted) collect within `eff.pickupRadius`: medkit heals `MEDKIT_HEAL` capped at `eff.maxHealth`; weapon with `swapGuard > 0` is skipped; same gun → reserve refilled to `reserveMax`; different gun → swap + `freshAmmo` + `swapGuard = SWAP_GUARD_S`; `pickup` event.
10. **Waves**: `wave === 0` → start wave 1 immediately (freeze `partySize` = players with `status !== "dead"`, `pending = composeWave`). Wave complete (`pending` empty, no enemies, `intermission === 0`) → `intermission = INTERMISSION_S` + wave-clear revive of ALL downed (`revived` events). `intermission > 0` → count down; on reaching 0 → `wave + 1`, re-freeze `partySize`, new `pending`. Drain `pending`: up to `SPAWNS_PER_TICK` spawns while `enemies.length < MAX_ENEMIES` (`spawnPos(seed, spawnSeq)`, id `e${spawnSeq}`, `spawnSeq + 1`).
11. Cap events at `MAX_EVENTS` (keep newest).

- [ ] **Step 1: Write the failing sim test**

```ts
// src/game/overrun/sim.test.ts
import { describe, expect, it } from "vitest";
import { stepShooter } from "./sim";
import { createShooterWorld } from "./match";
import { ENEMIES } from "./enemies";
import { INTERMISSION_S, REVIVE_HEALTH, REVIVE_S, SHOOTER_DT } from "./constants";
import { waveBudget } from "./waves";
import { xpToNext } from "./perks";
import type { Enemy, ShooterIntent, ShooterWorld } from "./types";

const IDLE: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const intents = (w: ShooterWorld, over: Record<string, Partial<ShooterIntent>> = {}) =>
  Object.fromEntries(Object.keys(w.players).map((id) => [id, { ...IDLE, ...over[id] }]));
const step = (w: ShooterWorld, over: Record<string, Partial<ShooterIntent>> = {}) =>
  stepShooter(w, intents(w, over), SHOOTER_DT);
const enemyAt = (id: string, x: number, y: number, over: Partial<Enemy> = {}): Enemy =>
  ({ id, kind: "rusher", pos: { x, y }, health: 20, attackCooldown: 0, ...over });

describe("determinism", () => {
  it("same seed + same intent script → identical worlds over 600 ticks", () => {
    const script = (w: ShooterWorld, t: number) =>
      intents(w, { a: { move: { up: t % 7 < 3, down: false, left: t % 5 < 2, right: false }, fire: t % 3 === 0, aim: (t % 62) / 10 } });
    let w1 = createShooterWorld(["a", "b"], 1234);
    let w2 = createShooterWorld(["a", "b"], 1234);
    for (let t = 0; t < 600; t++) {
      w1 = stepShooter(w1, script(w1, t), SHOOTER_DT);
      w2 = stepShooter(w2, script(w2, t), SHOOTER_DT);
    }
    expect(w2).toEqual(w1);
    expect(w1.wave).toBeGreaterThanOrEqual(1);
  });
});

describe("movement", () => {
  it("moves alive players (diagonal normalized) and clamps to the field", () => {
    const w0 = createShooterWorld(["a"], 1);
    const w1 = step(w0, { a: { move: { up: false, down: true, left: false, right: true } } });
    const d = Math.hypot(w1.players.a!.pos.x - w0.players.a!.pos.x, w1.players.a!.pos.y - w0.players.a!.pos.y);
    expect(d).toBeCloseTo(4 * SHOOTER_DT, 5);
  });

  it("downed players don't move or fire", () => {
    const w0 = createShooterWorld(["a", "b"], 1);
    w0.players.a = { ...w0.players.a!, status: "downed", health: 0 };
    const w1 = step(w0, { a: { move: { up: true, down: false, left: false, right: false }, fire: true } });
    expect(w1.players.a!.pos).toEqual(w0.players.a!.pos);
    expect(w1.players.a!.stats.shots).toBe(0);
  });
});

describe("waves", () => {
  it("wave 1 starts on the first tick with the frozen party budget", () => {
    const w1 = step(createShooterWorld(["a", "b", "c"], 5));
    expect(w1.wave).toBe(1);
    expect(w1.partySize).toBe(3);
    expect(w1.pending.length + w1.enemies.length).toBe(
      // budget spent entirely on rushers at wave 1 (cost 1 each)
      waveBudget(1, 3),
    );
  });

  it("drains pending spawns gradually and increments spawnSeq", () => {
    const w1 = step(createShooterWorld(["a"], 5));
    const w2 = step(w1);
    expect(w2.enemies.length).toBeGreaterThan(w1.enemies.length);
    expect(w2.spawnSeq).toBe(w2.enemies.length);
    expect(w2.enemies.every((e, i) => e.id === `e${i}`)).toBe(true);
  });

  it("wave clear → intermission (+ wave-clear revive) → next wave with a re-frozen party", () => {
    let w = step(createShooterWorld(["a", "b"], 5));
    w = { ...w, pending: [], enemies: [], players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    const cleared = step(w);
    expect(cleared.intermission).toBeCloseTo(INTERMISSION_S, 5);
    expect(cleared.players.b!.status).toBe("alive"); // wave-clear auto-revive
    expect(cleared.players.b!.health).toBe(REVIVE_HEALTH);
    let next = cleared;
    for (let t = 0; t < Math.ceil(INTERMISSION_S / SHOOTER_DT) + 1; t++) next = step(next);
    expect(next.wave).toBe(2);
    expect(next.partySize).toBe(2);
  });
});

describe("combat + kills", () => {
  it("firing kills award xp/score/kill-stat to the shooter and roll drops", () => {
    let w = step(createShooterWorld(["a"], 7));
    w = { ...w, pending: [], enemies: [enemyAt("e0", w.players.a!.pos.x + 2, w.players.a!.pos.y, { health: 1 })] };
    const after = step(w, { a: { fire: true, aim: 0 } });
    expect(after.enemies).toEqual([]);
    expect(after.players.a!.stats.kills).toBe(1);
    expect(after.players.a!.xp).toBe(ENEMIES.rusher.xp);
    expect(after.score).toBe(ENEMIES.rusher.scoreValue * after.wave);
    expect(after.events.some((e) => e.kind === "kill")).toBe(true);
  });

  it("enemy contact damages on its attack interval and downs at 0 HP", () => {
    let w = step(createShooterWorld(["a"], 7));
    const p = w.players.a!;
    w = { ...w, pending: [], enemies: [enemyAt("e0", p.pos.x + 1.0, p.pos.y, { health: 1000 })] };
    const hit = step(w);
    expect(hit.players.a!.health).toBe(p.health - ENEMIES.rusher.damage);
    expect(hit.enemies[0]!.attackCooldown).toBeCloseTo(ENEMIES.rusher.attackInterval, 5);
    // burn the player down → downed, not dead
    let burn = { ...w, players: { ...w.players, a: { ...p, health: ENEMIES.rusher.damage } } };
    const downed = step(burn);
    expect(downed.players.a!.status).toBe("downed");
    expect(downed.events.some((e) => e.kind === "downed")).toBe(true);
  });
});

describe("downed / revive / wipe", () => {
  const setup = () => {
    let w = step(createShooterWorld(["a", "b"], 3));
    w = { ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })] }; // keep the wave alive
    const a = w.players.a!;
    const b = w.players.b!;
    return { ...w, players: { ...w.players, a: { ...a, status: "downed" as const, health: 0, pos: { x: 10, y: 10 } }, b: { ...b, pos: { x: 11, y: 10 } } } };
  };

  it("teammate proximity accumulates revive progress to completion", () => {
    let w = setup();
    const ticks = Math.ceil(REVIVE_S / SHOOTER_DT);
    for (let t = 0; t < ticks; t++) w = step(w);
    expect(w.players.a!.status).toBe("alive");
    expect(w.players.a!.health).toBe(REVIVE_HEALTH);
  });

  it("progress resets when the teammate walks away", () => {
    let w = setup();
    w = step(w);
    expect(w.players.a!.reviveProgress).toBeGreaterThan(0);
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, pos: { x: 25, y: 25 } } } };
    w = step(w);
    expect(w.players.a!.reviveProgress).toBe(0);
  });

  it("all players downed → ended; a revive completing the same tick prevents the wipe", () => {
    // both downed → wipe
    let w = setup();
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    expect(step(w).phase).toBe("ended");
    // b alive and reviving a: when b is downed on the SAME tick a's revive completes, no wipe
    let w2 = setup();
    w2 = { ...w2, players: { ...w2.players, a: { ...w2.players.a!, reviveProgress: REVIVE_S - SHOOTER_DT / 2 } } };
    const enemyOnB = enemyAt("kb", w2.players.b!.pos.x + 1, w2.players.b!.pos.y, { health: 1000 });
    w2 = { ...w2, enemies: [...w2.enemies, enemyOnB], players: { ...w2.players, b: { ...w2.players.b!, health: ENEMIES.rusher.damage } } };
    const out = step(w2);
    expect(out.players.a!.status).toBe("alive"); // revive landed
    expect(out.players.b!.status).toBe("downed");
    expect(out.phase).toBe("playing"); // revive-before-wipe
  });

  it("a frozen ended world stays frozen", () => {
    let w = setup();
    w = { ...w, players: { ...w.players, b: { ...w.players.b!, status: "downed", health: 0 } } };
    const ended = step(w);
    expect(step(ended)).toEqual(ended);
  });
});

describe("perks flow", () => {
  it("level-up enqueues a 3-choice offer; perkPick consumes the head", () => {
    let w = step(createShooterWorld(["a"], 11));
    const need = xpToNext(0);
    const kills = Math.ceil(need / ENEMIES.rusher.xp);
    const p = w.players.a!;
    w = { ...w, pending: [], enemies: Array.from({ length: kills }, (_, i) => enemyAt(`k${i}`, p.pos.x + 1.5, p.pos.y, { health: 1 })) };
    // rifle-less: pistol kills them over several ticks
    for (let t = 0; t < 200 && w.players.a!.level === 0; t++) w = step(w, { a: { fire: true, aim: 0 } });
    expect(w.players.a!.level).toBe(1);
    expect(w.players.a!.offers.length).toBe(1);
    const choice = w.players.a!.offers[0]!.choices[2];
    const picked = step(w, { a: { perkPick: 2 } });
    expect(picked.players.a!.perks).toEqual([choice]);
    expect(picked.players.a!.offers).toEqual([]);
    // pick with no pending offer is a no-op
    expect(step(picked, { a: { perkPick: 0 } }).players.a!.perks).toEqual([choice]);
  });
});

describe("pickups", () => {
  it("medkits heal capped at max; weapon pickups swap with a fresh mag + swap guard; same-gun tops up reserve", () => {
    let w = step(createShooterWorld(["a"], 13));
    const p = w.players.a!;
    w = {
      ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })],
      pickups: [{ id: "pk:1", kind: "medkit", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }],
      players: { ...w.players, a: { ...p, health: 90 } },
    };
    let out = step(w);
    expect(out.players.a!.health).toBe(100); // capped
    expect(out.pickups).toEqual([]);
    // weapon swap
    out = { ...out, pickups: [{ id: "pk:2", kind: "rifle", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }] };
    out = step(out);
    expect(out.players.a!.gun).toBe("rifle");
    expect(out.players.a!.ammo.mag).toBe(10);
    expect(out.players.a!.swapGuard).toBeGreaterThan(0);
    // guard blocks an immediate re-swap
    out = { ...out, pickups: [{ id: "pk:3", kind: "shotgun", pos: { x: p.pos.x, y: p.pos.y }, ttl: 5 }] };
    out = step(out);
    expect(out.players.a!.gun).toBe("rifle");
    expect(out.pickups.length).toBe(1);
    // same gun tops up reserve once the guard expires
    out = { ...out, pickups: [{ id: "pk:4", kind: "rifle", pos: { x: p.pos.x, y: p.pos.y }, ttl: 9 }], players: { ...out.players, a: { ...out.players.a!, swapGuard: 0, ammo: { ...out.players.a!.ammo, reserve: 3 } } } };
    out = step(out);
    expect(out.players.a!.ammo.reserve).toBe(60);
  });

  it("pickups expire by ttl", () => {
    let w = step(createShooterWorld(["a"], 13));
    w = { ...w, pending: [], enemies: [enemyAt("far", 29, 29, { health: 1000 })], pickups: [{ id: "pk:1", kind: "medkit", pos: { x: 1, y: 1 }, ttl: SHOOTER_DT / 2 }] };
    expect(step(w).pickups).toEqual([]);
  });
});
```

- [ ] **Step 2: Write the failing purity guard**

```ts
// src/game/overrun/purity.test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The determinism guard the roadmap demands: no wall-clock or ambient randomness
 * in the sim core. net/ (wire boundary — session mints the seed) and render/
 * (engine adapter) are exempt; test files are exempt.
 */
const CORE_DIR = join(__dirname);
const BANNED = [/Math\.random/, /Date\.now/, /new Date\(/, /performance\.now/];

describe("overrun sim core purity", () => {
  it("contains no clocks or ambient RNG in top-level core files", () => {
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    expect(files.length).toBeGreaterThan(8);
    for (const f of files) {
      const src = readFileSync(join(CORE_DIR, f), "utf8");
      for (const rx of BANNED) {
        expect(src, `${f} must not use ${rx}`).not.toMatch(rx);
      }
    }
  });

  it("core files import nothing from net/ or render/ or engines", () => {
    const files = readdirSync(CORE_DIR).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    for (const f of files) {
      const src = readFileSync(join(CORE_DIR, f), "utf8");
      expect(src, `${f} must stay engine/transport-free`).not.toMatch(/from ["']\.\/(net|render)\//);
      expect(src, `${f} must stay engine/transport-free`).not.toMatch(/from ["']phaser["']/i);
    }
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npx vitest run src/game/overrun/sim.test.ts src/game/overrun/purity.test.ts` → sim FAILs on missing module (purity may pass already — fine).

- [ ] **Step 4: Write `src/game/overrun/sim.ts`**

```ts
// src/game/overrun/sim.ts
/**
 * stepShooter — THE Overrun reducer. Pure: (world, intents, dt) → world.
 * Fixed phase order (each numbered block below); every random draw is a
 * coordinate-hash off the world-carried seed. Players iterate in sorted-id
 * order, enemies in spawn (array) order — byte-reproducible on any peer.
 *
 * Order: picks → upkeep/move → fire(+kills/drops/xp) → enemies(+contact/downed)
 * → revive → wipe-check (revive-before-wipe) → pickups → waves/spawning → caps.
 */

import type { PlayerId } from "../arena/types";
import {
  EVENT_TTL_TICKS, INTERMISSION_S, MAX_ENEMIES, MAX_EVENTS, OVERRUN_FIELD_M,
  PLAYER_RADIUS_M, PLAYER_SPEED_MS, REVIVE_HEALTH, REVIVE_RANGE_M, REVIVE_S,
  MEDKIT_HEAL, SPAWNS_PER_TICK, SWAP_GUARD_S,
} from "./constants";
import { ENEMIES, nearestAlive, stepEnemy } from "./enemies";
import { fireTick, tickAmmo, tryStartReload } from "./firing";
import { effectiveStats, rollOffer, xpToNext } from "./perks";
import { rollDrop } from "./drops";
import { composeWave, spawnPos } from "./waves";
import { freshAmmo, GUNS } from "./weapons";
import type { Enemy, Pickup, ShooterEvent, ShooterIntent, ShooterPlayer, ShooterWorld } from "./types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function stepShooter(
  world: ShooterWorld,
  intents: Record<PlayerId, ShooterIntent>,
  dt: number,
): ShooterWorld {
  if (world.phase === "ended") return world; // 1. frozen for the scoreboard

  const tick = world.tick + 1;
  const seed = world.seed;
  const ids = Object.keys(world.players).sort();
  const events: ShooterEvent[] = world.events.filter((e) => e.tick > tick - EVENT_TTL_TICKS); // 2.
  const players: Record<PlayerId, ShooterPlayer> = { ...world.players };
  let enemies: Enemy[] = world.enemies;
  let pickups: Pickup[] = [...world.pickups];
  let { score, pity, spawnSeq, wave, partySize, intermission } = world;
  let pending = world.pending;

  // 3. perk picks
  for (const id of ids) {
    const pick = intents[id]?.perkPick ?? null;
    const p = players[id]!;
    if (pick !== null && p.offers.length > 0) {
      const [head, ...rest] = p.offers;
      players[id] = { ...p, perks: [...p.perks, head!.choices[pick]], offers: rest };
    }
  }

  // 4. upkeep + movement
  for (const id of ids) {
    const intent = intents[id];
    let p = players[id]!;
    const eff = effectiveStats(p.perks);
    p = tickAmmo(p, dt, eff);
    p = { ...p, swapGuard: Math.max(0, p.swapGuard - dt) };
    if (p.status === "alive" && intent) {
      if (intent.aim !== undefined && Number.isFinite(intent.aim)) p = { ...p, aim: intent.aim };
      const mx = (intent.move.right ? 1 : 0) - (intent.move.left ? 1 : 0);
      const my = (intent.move.down ? 1 : 0) - (intent.move.up ? 1 : 0);
      if (mx !== 0 || my !== 0) {
        const n = Math.hypot(mx, my);
        const v = PLAYER_SPEED_MS * eff.moveSpeedMult * dt;
        p = {
          ...p,
          pos: {
            x: clamp(p.pos.x + (mx / n) * v, PLAYER_RADIUS_M, OVERRUN_FIELD_M - PLAYER_RADIUS_M),
            y: clamp(p.pos.y + (my / n) * v, PLAYER_RADIUS_M, OVERRUN_FIELD_M - PLAYER_RADIUS_M),
          },
        };
      }
      if (intent.reload) p = tryStartReload(p, eff);
    }
    players[id] = p;
  }

  // 5. firing + kill attribution (sequential per player so the killer is unambiguous)
  for (const id of ids) {
    const intent = intents[id];
    let p = players[id]!;
    const eff = effectiveStats(p.perks);
    const res = fireTick(p, enemies, intent?.fire ?? false, seed, tick, eff);
    p = res.player;
    events.push(...res.events);
    const survivors: Enemy[] = [];
    for (const e of res.enemies) {
      if (e.health > 0) {
        survivors.push(e);
        continue;
      }
      const def = ENEMIES[e.kind];
      // xp + level-ups
      let xp = p.xp + def.xp;
      let level = p.level;
      let offers = p.offers;
      while (xp >= xpToNext(level)) {
        xp -= xpToNext(level);
        level += 1;
        offers = [...offers, rollOffer(seed, tick, p.id)];
        events.push({ tick, kind: "levelup", playerId: p.id });
      }
      p = { ...p, xp, level, offers, stats: { ...p.stats, kills: p.stats.kills + 1 } };
      score += def.scoreValue * wave;
      events.push({ tick, kind: "kill", pos: { x: e.pos.x, y: e.pos.y }, enemy: e.kind });
      const drop = rollDrop(seed, tick, e, pickups.length, pity);
      pity = drop.pity;
      if (drop.pickup) pickups.push(drop.pickup);
    }
    enemies = survivors;
    players[id] = p;
  }

  // 6. enemies: chase + contact damage
  const aliveSorted = () => ids.map((i) => players[i]!).filter((p) => p.status === "alive");
  enemies = enemies.map((e) => {
    const target = nearestAlive(e.pos, aliveSorted());
    let stepped = stepEnemy(e, target ? target.pos : null, dt);
    if (target) {
      const def = ENEMIES[e.kind];
      const d = Math.hypot(target.pos.x - stepped.pos.x, target.pos.y - stepped.pos.y);
      if (d <= def.radius + PLAYER_RADIUS_M + 1e-6 && stepped.attackCooldown === 0) {
        const t = players[target.id]!;
        const health = Math.max(0, t.health - def.damage);
        players[target.id] =
          health === 0
            ? { ...t, health: 0, status: "downed", reviveProgress: 0 }
            : { ...t, health };
        if (health === 0) events.push({ tick, kind: "downed", playerId: t.id });
        stepped = { ...stepped, attackCooldown: def.attackInterval };
      }
    }
    return stepped;
  });

  // 7. revive (proximity)
  for (const id of ids) {
    const p = players[id]!;
    if (p.status !== "downed") continue;
    const helper = aliveSorted().some(
      (q) => q.id !== id && Math.hypot(q.pos.x - p.pos.x, q.pos.y - p.pos.y) <= REVIVE_RANGE_M,
    );
    if (!helper) {
      if (p.reviveProgress !== 0) players[id] = { ...p, reviveProgress: 0 };
      continue;
    }
    const progress = p.reviveProgress + dt;
    if (progress >= REVIVE_S) {
      const eff = effectiveStats(p.perks);
      players[id] = { ...p, status: "alive", health: Math.min(REVIVE_HEALTH, eff.maxHealth), reviveProgress: 0 };
      events.push({ tick, kind: "revived", playerId: id });
    } else {
      players[id] = { ...p, reviveProgress: progress };
    }
  }

  // 8. wipe check (after revive — revive-before-wipe)
  let phase = world.phase;
  if (!ids.some((id) => players[id]!.status === "alive")) phase = "ended";

  // 9. pickups: expiry + collection
  pickups = pickups.map((k) => ({ ...k, ttl: k.ttl - dt })).filter((k) => k.ttl > 0);
  for (const id of ids) {
    let p = players[id]!;
    if (p.status !== "alive") continue;
    const eff = effectiveStats(p.perks);
    const remaining: Pickup[] = [];
    for (const k of pickups) {
      const inRange = Math.hypot(k.pos.x - p.pos.x, k.pos.y - p.pos.y) <= eff.pickupRadius;
      if (!inRange) {
        remaining.push(k);
        continue;
      }
      if (k.kind === "medkit") {
        p = { ...p, health: Math.min(eff.maxHealth, p.health + MEDKIT_HEAL) };
      } else if (p.swapGuard > 0) {
        remaining.push(k);
        continue;
      } else if (k.kind === p.gun) {
        p = { ...p, ammo: { ...p.ammo, reserve: GUNS[p.gun].reserveMax ?? 0 } };
      } else {
        p = { ...p, gun: k.kind, ammo: freshAmmo(k.kind), swapGuard: SWAP_GUARD_S };
      }
      events.push({ tick, kind: "pickup", pos: { x: k.pos.x, y: k.pos.y }, item: k.kind });
    }
    pickups = remaining;
    players[id] = p;
  }

  // 10. waves + spawning
  const partyCount = () => ids.filter((id) => players[id]!.status !== "dead").length;
  if (phase === "playing") {
    if (wave === 0) {
      wave = 1;
      partySize = partyCount();
      pending = composeWave(seed, wave, partySize);
    } else if (pending.length === 0 && enemies.length === 0 && intermission === 0) {
      intermission = INTERMISSION_S;
      for (const id of ids) {
        const p = players[id]!;
        if (p.status === "downed") {
          const eff = effectiveStats(p.perks);
          players[id] = { ...p, status: "alive", health: Math.min(REVIVE_HEALTH, eff.maxHealth), reviveProgress: 0 };
          events.push({ tick, kind: "revived", playerId: id });
        }
      }
    } else if (intermission > 0) {
      intermission = Math.max(0, intermission - dt);
      if (intermission === 0) {
        wave += 1;
        partySize = partyCount();
        pending = composeWave(seed, wave, partySize);
      }
    }
    if (pending.length > 0) {
      const spawned: Enemy[] = [];
      let queue = pending;
      while (spawned.length < SPAWNS_PER_TICK && queue.length > 0 && enemies.length + spawned.length < MAX_ENEMIES) {
        const kind = queue[0]!;
        queue = queue.slice(1);
        spawned.push({ id: `e${spawnSeq}`, kind, pos: spawnPos(seed, spawnSeq), health: ENEMIES[kind].health, attackCooldown: 0 });
        spawnSeq += 1;
      }
      pending = queue;
      enemies = [...enemies, ...spawned];
    }
  }

  // 11. caps
  const cappedEvents = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

  return {
    tick, phase, seed, wave, partySize, pending, intermission,
    players, enemies, pickups, events: cappedEvents, score, spawnSeq, pity,
  };
}
```

- [ ] **Step 5: Run the full overrun suite + typecheck**

Run: `npx vitest run src/game/overrun && npx tsc --noEmit`
Expected: PASS — including the determinism 600-tick test and purity guard.

- [ ] **Step 6: Commit**

```bash
git add src/game/overrun/sim.ts src/game/overrun/sim.test.ts src/game/overrun/purity.test.ts
git commit -m "feat(overrun): stepShooter reducer (waves/combat/revive/perks/pickups) + purity guard"
```

---

### Task 9: Quantized keyframe/delta codec + protocol message kinds

**Files:**
- Create: `src/game/overrun/net/codec.ts`
- Modify: `src/game/net/protocol.ts` (add 4 opaque message kinds to `NetMessage`)
- Test: `src/game/overrun/net/codec.test.ts`

**Interfaces:**
- Consumes: types (Task 2), `PERK_IDS` (Task 3), `ENEMY_KINDS` (Task 4), `GUN_IDS` (Task 2), caps (Task 1).
- Produces: `QWorld` (opaque quantized world), `ODelta`; `qWorld(w: ShooterWorld): QWorld`; `unqWorld(q: QWorld): ShooterWorld`; `diffWorld(prevQ: QWorld, curQ: QWorld): ODelta`; `applyDelta(prev: ShooterWorld, d: ODelta): ShooterWorld` (returns `prev` unchanged when `d.b !== prev.tick` — the wait-for-keyframe rule).
- Quantization: positions/ranges → **int centimeters** (`Math.round(x*100)`), seconds → **int centiseconds**, health → int, aim → int milliradians. `pending` encodes as a char string (`"r"`/`"t"` by `ENEMY_KINDS` index), perks as a digit string of `PERK_IDS` indexes.
- **Modify `src/game/net/protocol.ts`:** append to the `NetMessage` union (before `| { t: "event"; ... }`):

```ts
  // Overrun (Track D) — payloads are opaque here; src/game/overrun/net/codec.ts owns their shape.
  | { t: "oStart"; countdownMs: number; seed: number; players: { id: PlayerId; name: string; iconColor: number }[] }
  | { t: "oInput"; intent: unknown }
  | { t: "oSnap"; w: unknown }
  | { t: "oDelta"; d: unknown }
```

- [ ] **Step 1: Write the failing test**

```ts
// src/game/overrun/net/codec.test.ts
import { describe, expect, it } from "vitest";
import { applyDelta, diffWorld, qWorld, unqWorld } from "./codec";
import { createShooterWorld } from "../match";
import { stepShooter } from "../sim";
import { SHOOTER_DT, MAX_ENEMIES, MAX_PICKUPS, MAX_EVENTS } from "../constants";
import type { ShooterIntent, ShooterWorld } from "../types";

const IDLE: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const idle = (w: ShooterWorld) => Object.fromEntries(Object.keys(w.players).map((id) => [id, IDLE]));

/** A worst-case world: 8 players, full enemy/pickup/event load. */
function fatWorld(): ShooterWorld {
  let w = createShooterWorld(["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"], 777);
  w = stepShooter(w, idle(w), SHOOTER_DT);
  const enemies = Array.from({ length: MAX_ENEMIES }, (_, i) => ({
    id: `e${i}`, kind: (i % 4 === 0 ? "tank" : "rusher") as const,
    pos: { x: (i % 30) + 0.123, y: Math.floor(i / 3) + 0.456 }, health: 20 + i, attackCooldown: 0.25,
  }));
  const pickups = Array.from({ length: MAX_PICKUPS }, (_, i) => ({
    id: `pk:e${i}`, kind: (["shotgun", "rifle", "medkit"] as const)[i % 3]!,
    pos: { x: i + 0.5, y: i + 0.25 }, ttl: 7.5,
  }));
  const events = Array.from({ length: MAX_EVENTS }, (_, i) => ({
    tick: w.tick, kind: "shot" as const, gun: "rifle" as const,
    from: { x: 1.11, y: 2.22 }, to: { x: 20.5, y: 15.25 },
  }));
  return { ...w, enemies, pickups, events, wave: 12, score: 34567, pity: 7, spawnSeq: 480 };
}

describe("quantized round-trip", () => {
  it("unq(q(w)) preserves structure within quantization error and is idempotent", () => {
    const w = fatWorld();
    const r = unqWorld(qWorld(w));
    expect(Object.keys(r.players)).toEqual(Object.keys(w.players));
    expect(r.enemies.length).toBe(w.enemies.length);
    expect(r.enemies[3]!.pos.x).toBeCloseTo(w.enemies[3]!.pos.x, 2); // cm precision
    expect(r.players.p1!.aim).toBeCloseTo(w.players.p1!.aim, 2);
    expect(r).toMatchObject({ tick: w.tick, seed: w.seed, wave: 12, score: 34567, pity: 7, spawnSeq: 480, partySize: w.partySize, phase: w.phase });
    expect(r.pending).toEqual(w.pending);
    // idempotent: quantizing an already-quantized world is lossless
    expect(unqWorld(qWorld(r))).toEqual(r);
  });

  it("preserves perks/offers/stats/ammo exactly (migration needs them)", () => {
    const w = fatWorld();
    w.players.p1 = {
      ...w.players.p1!, gun: "rifle", perks: ["power", "magnet"],
      offers: [{ choices: ["trigger", "hands", "sprint"] }],
      stats: { shots: 440, hits: 343, kills: 342 }, xp: 17, level: 9,
      ammo: { mag: 7, reserve: 41, reloadRemaining: 0.8, fireCooldown: 0.1 },
    };
    const r = unqWorld(qWorld(w));
    expect(r.players.p1!).toMatchObject({
      gun: "rifle", perks: ["power", "magnet"],
      offers: [{ choices: ["trigger", "hands", "sprint"] }],
      stats: { shots: 440, hits: 343, kills: 342 }, xp: 17, level: 9,
    });
    expect(r.players.p1!.ammo.mag).toBe(7);
    expect(r.players.p1!.ammo.reloadRemaining).toBeCloseTo(0.8, 2);
  });
});

describe("delta encode/apply", () => {
  it("apply(prev, diff(prev, cur)) reproduces the quantized current world exactly", () => {
    let w = createShooterWorld(["a", "b"], 42);
    for (let t = 0; t < 30; t++) w = stepShooter(w, idle(w), SHOOTER_DT);
    const prev = unqWorld(qWorld(w));
    let cur = w;
    for (let t = 0; t < 3; t++) cur = stepShooter(cur, idle(cur), SHOOTER_DT);
    const rebuilt = applyDelta(prev, diffWorld(qWorld(w), qWorld(cur)));
    expect(rebuilt).toEqual(unqWorld(qWorld(cur)));
  });

  it("handles enemy adds, removals, and pickup changes", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const cur: ShooterWorld = {
      ...prev, tick: prev.tick + 3,
      enemies: [...prev.enemies.slice(2), { id: "e999", kind: "tank", pos: { x: 1, y: 2 }, health: 120, attackCooldown: 0 }],
      pickups: prev.pickups.slice(1),
    };
    const rebuilt = applyDelta(prev, diffWorld(qWorld(prev), qWorld(cur)));
    expect(rebuilt).toEqual(unqWorld(qWorld(cur)));
  });

  it("a delta against the wrong base is ignored (wait for the next keyframe)", () => {
    const prev = unqWorld(qWorld(fatWorld()));
    const cur = { ...prev, tick: prev.tick + 3, score: prev.score + 100 };
    const d = diffWorld(qWorld(prev), qWorld(cur));
    const stale = { ...prev, tick: prev.tick - 3 };
    expect(applyDelta(stale, d)).toBe(stale);
  });
});

describe("byte budget (the P-A0 guarantee)", () => {
  it("worst-case keyframe ≤ 6144 bytes; worst-case delta ≤ 4096", () => {
    // Worst case = every cap maxed simultaneously. Steady-state real traffic is far
    // smaller; this pins the ceiling so cap changes that blow the wire fail loudly.
    const w = fatWorld();
    const key = JSON.stringify({ v: 1, m: { t: "oSnap", w: qWorld(w) } });
    expect(key.length).toBeLessThanOrEqual(6144);
    let cur = w;
    for (let t = 0; t < 3; t++) cur = stepShooter(cur, idle(cur), SHOOTER_DT);
    const delta = JSON.stringify({ v: 1, m: { t: "oDelta", d: diffWorld(qWorld(w), qWorld(cur)) } });
    expect(delta.length).toBeLessThanOrEqual(4096);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/overrun/net/codec.test.ts` → FAIL (`Cannot find module './codec'`).

- [ ] **Step 3: Write `src/game/overrun/net/codec.ts`**

```ts
// src/game/overrun/net/codec.ts
/**
 * Quantized wire codec (the absorbed P-A0): positions → int cm, times → int cs,
 * aim → int mrad; enemies/pickups/events as tuples; players as short-key objects
 * (≤8 of them). Deltas diff QUANTIZED forms so a client applying a delta lands
 * exactly on unq(q(hostWorld)) — no drift between keyframes.
 *
 * Keyframes carry EVERYTHING (seed, spawnSeq, pity, pending, offers…) so a
 * migrating host resumes bit-compatibly from its last received snapshot.
 */

import type { PlayerId, Vec2 } from "../../arena/types";
import { EVENT_TTL_TICKS, MAX_EVENTS } from "../constants";
import { ENEMY_KINDS } from "../enemies";
import { GUN_IDS } from "../weapons";
import { PERK_IDS } from "../perks";
import type {
  Enemy, EnemyKind, PerkId, PerkOffer, Pickup, PickupKind, ShooterEvent,
  ShooterPhase, ShooterPlayer, ShooterStatus, ShooterWorld,
} from "../types";

const cm = (m: number) => Math.round(m * 100);
const m = (cmv: number) => cmv / 100;
const cs = (s: number) => Math.round(s * 100);
const s = (csv: number) => csv / 100;
const mrad = (rad: number) => Math.round(rad * 1000);
const rad = (mr: number) => mr / 1000;

const STATUS: ShooterStatus[] = ["alive", "downed", "dead"];
const PICKUP_KINDS: PickupKind[] = ["shotgun", "rifle", "medkit"];
const EVENT_KINDS = ["shot", "kill", "pickup", "levelup", "downed", "revived"] as const;

// players: short-key object (readable, only 8 of them)
interface QPlayer {
  i: PlayerId; x: number; y: number; a: number; h: number; st: number; g: number;
  am: [number, number, number, number]; // mag, reserve, reloadCs, fireCdCs
  xp: number; lv: number; pk: string; of: number[][]; sh: [number, number, number]; // shots,hits,kills
  rv: number; gd: number;
}
type QEnemy = [string, number, number, number, number, number]; // id, kind, xcm, ycm, health, cdCs
type QPickup = [string, number, number, number, number]; // id, kind, xcm, ycm, ttlCs
type QEvent = (number | string)[]; // [tick, kindIdx, ...payload]

export interface QWorld {
  t: number; ph: number; sd: number; wv: number; ps: number; pd: string; im: number;
  pl: QPlayer[]; en: QEnemy[]; pk: QPickup[]; ev: QEvent[];
  sc: number; sq: number; py: number;
}

export interface ODelta {
  /** Base tick this delta applies to (client must hold exactly this world). */
  b: number;
  t: number;
  ph: number;
  pl: QPlayer[]; // players always ship in full (≤8)
  en: { a: QEnemy[]; u: [string, number, number, number, number][]; d: string[] }; // add / update(id,x,y,h,cd) / delete
  pk: QPickup[]; // full pickup list (≤24 small tuples — ttls tick every step, diffing buys nothing)
  ev: QEvent[]; // events newer than the base tick
  s: [number, number, number, number, number]; // wave, partySize, intermissionCs, score, pity
  sq: number;
  pd?: string; // pending — only when changed
}

const qVec = (v: Vec2): [number, number] => [cm(v.x), cm(v.y)];

function qPlayer(p: ShooterPlayer): QPlayer {
  return {
    i: p.id, x: cm(p.pos.x), y: cm(p.pos.y), a: mrad(p.aim), h: Math.round(p.health),
    st: STATUS.indexOf(p.status), g: GUN_IDS.indexOf(p.gun),
    am: [p.ammo.mag, p.ammo.reserve, cs(p.ammo.reloadRemaining), cs(p.ammo.fireCooldown)],
    xp: p.xp, lv: p.level,
    pk: p.perks.map((k) => PERK_IDS.indexOf(k)).join(""),
    of: p.offers.map((o) => o.choices.map((c) => PERK_IDS.indexOf(c))),
    sh: [p.stats.shots, p.stats.hits, p.stats.kills],
    rv: cs(p.reviveProgress), gd: cs(p.swapGuard),
  };
}

function unqPlayer(q: QPlayer): ShooterPlayer {
  return {
    id: q.i, pos: { x: m(q.x), y: m(q.y) }, aim: rad(q.a), health: q.h,
    status: STATUS[q.st]!, gun: GUN_IDS[q.g]!,
    ammo: { mag: q.am[0], reserve: q.am[1], reloadRemaining: s(q.am[2]), fireCooldown: s(q.am[3]) },
    xp: q.xp, level: q.lv,
    perks: [...q.pk].map((c) => PERK_IDS[Number(c)]!) as PerkId[],
    offers: q.of.map((o) => ({ choices: o.map((n) => PERK_IDS[n]!) as PerkOffer["choices"] })),
    stats: { shots: q.sh[0], hits: q.sh[1], kills: q.sh[2] },
    reviveProgress: s(q.rv), swapGuard: s(q.gd),
  };
}

const qEnemy = (e: Enemy): QEnemy => [e.id, ENEMY_KINDS.indexOf(e.kind), cm(e.pos.x), cm(e.pos.y), Math.round(e.health), cs(e.attackCooldown)];
const unqEnemy = (q: QEnemy): Enemy => ({ id: q[0], kind: ENEMY_KINDS[q[1]]!, pos: { x: m(q[2]), y: m(q[3]) }, health: q[4], attackCooldown: s(q[5]) });
const qPickup = (k: Pickup): QPickup => [k.id, PICKUP_KINDS.indexOf(k.kind), cm(k.pos.x), cm(k.pos.y), cs(k.ttl)];
const unqPickup = (q: QPickup): Pickup => ({ id: q[0], kind: PICKUP_KINDS[q[1]]!, pos: { x: m(q[2]), y: m(q[3]) }, ttl: s(q[4]) });

function qEvent(e: ShooterEvent): QEvent {
  const k = EVENT_KINDS.indexOf(e.kind);
  if (e.kind === "shot") return [e.tick, k, GUN_IDS.indexOf(e.gun), ...qVec(e.from), ...qVec(e.to)];
  if (e.kind === "kill") return [e.tick, k, ENEMY_KINDS.indexOf(e.enemy), ...qVec(e.pos)];
  if (e.kind === "pickup") return [e.tick, k, PICKUP_KINDS.indexOf(e.item), ...qVec(e.pos)];
  return [e.tick, k, e.playerId];
}

function unqEvent(q: QEvent): ShooterEvent {
  const tick = q[0] as number;
  const kind = EVENT_KINDS[q[1] as number]!;
  if (kind === "shot") return { tick, kind, gun: GUN_IDS[q[2] as number]!, from: { x: m(q[3] as number), y: m(q[4] as number) }, to: { x: m(q[5] as number), y: m(q[6] as number) } };
  if (kind === "kill") return { tick, kind, enemy: ENEMY_KINDS[q[2] as number]!, pos: { x: m(q[3] as number), y: m(q[4] as number) } };
  if (kind === "pickup") return { tick, kind, item: PICKUP_KINDS[q[2] as number]!, pos: { x: m(q[3] as number), y: m(q[4] as number) } };
  return { tick, kind, playerId: q[2] as string };
}

const qPending = (pd: EnemyKind[]): string => pd.map((k) => ENEMY_KINDS.indexOf(k)).join("");
const unqPending = (str: string): EnemyKind[] => [...str].map((c) => ENEMY_KINDS[Number(c)]!);

export function qWorld(w: ShooterWorld): QWorld {
  return {
    t: w.tick, ph: w.phase === "ended" ? 1 : 0, sd: w.seed, wv: w.wave, ps: w.partySize,
    pd: qPending(w.pending), im: cs(w.intermission),
    pl: Object.keys(w.players).sort().map((id) => qPlayer(w.players[id]!)),
    en: w.enemies.map(qEnemy), pk: w.pickups.map(qPickup), ev: w.events.map(qEvent),
    sc: w.score, sq: w.spawnSeq, py: w.pity,
  };
}

export function unqWorld(q: QWorld): ShooterWorld {
  const players: Record<PlayerId, ShooterPlayer> = {};
  for (const p of q.pl) players[p.i] = unqPlayer(p);
  return {
    tick: q.t, phase: (q.ph === 1 ? "ended" : "playing") as ShooterPhase, seed: q.sd,
    wave: q.wv, partySize: q.ps, pending: unqPending(q.pd), intermission: s(q.im),
    players, enemies: q.en.map(unqEnemy), pickups: q.pk.map(unqPickup), events: q.ev.map(unqEvent),
    score: q.sc, spawnSeq: q.sq, pity: q.py,
  };
}

/** Diff two QUANTIZED worlds (host: qWorld(lastSent) vs qWorld(current)). */
export function diffWorld(prevQ: QWorld, curQ: QWorld): ODelta {
  const prevEn = new Map(prevQ.en.map((e) => [e[0], e]));
  const curEnIds = new Set(curQ.en.map((e) => e[0]));
  const en: ODelta["en"] = { a: [], u: [], d: [] };
  for (const e of curQ.en) {
    const p = prevEn.get(e[0]);
    if (!p) en.a.push(e);
    else if (p[2] !== e[2] || p[3] !== e[3] || p[4] !== e[4] || p[5] !== e[5]) en.u.push([e[0], e[2], e[3], e[4], e[5]]);
  }
  for (const e of prevQ.en) if (!curEnIds.has(e[0])) en.d.push(e[0]);

  const d: ODelta = {
    b: prevQ.t, t: curQ.t, ph: curQ.ph, pl: curQ.pl, en, pk: curQ.pk,
    ev: curQ.ev.filter((e) => (e[0] as number) > prevQ.t),
    s: [curQ.wv, curQ.ps, curQ.im, curQ.sc, curQ.py], sq: curQ.sq,
  };
  if (curQ.pd !== prevQ.pd) d.pd = curQ.pd;
  return d;
}

/** Apply a delta to the client's held world. Wrong base → return prev (wait for keyframe). */
export function applyDelta(prev: ShooterWorld, d: ODelta): ShooterWorld {
  if (prev.tick !== d.b) return prev;
  const players: Record<PlayerId, ShooterPlayer> = {};
  for (const p of d.pl) players[p.i] = unqPlayer(p);

  const removed = new Set(d.en.d);
  const updated = new Map(d.en.u.map((u) => [u[0], u]));
  const enemies: Enemy[] = [];
  for (const e of prev.enemies) {
    if (removed.has(e.id)) continue;
    const u = updated.get(e.id);
    enemies.push(u ? { ...e, pos: { x: m(u[1]), y: m(u[2]) }, health: u[3], attackCooldown: s(u[4]) } : e);
  }
  enemies.push(...d.en.a.map(unqEnemy));

  const pickups = d.pk.map(unqPickup);

  // Rebuild events exactly as the sim would hold them: kept-window ∪ new, capped to newest.
  const kept = prev.events.filter((e) => e.tick > d.t - EVENT_TTL_TICKS);
  const events = [...kept, ...d.ev.map(unqEvent)];
  const capped = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;

  return {
    tick: d.t, phase: d.ph === 1 ? "ended" : "playing", seed: prev.seed,
    wave: d.s[0], partySize: d.s[1], intermission: s(d.s[2]),
    pending: d.pd !== undefined ? unqPending(d.pd) : prev.pending,
    players, enemies, pickups, events: capped, score: d.s[3], spawnSeq: d.sq, pity: d.s[4],
  };
}
```

- [ ] **Step 4: Modify `src/game/net/protocol.ts`** — add the four `o*` members to `NetMessage` as shown in the Interfaces block above.

- [ ] **Step 5: Run tests + typecheck**

Run: `npx vitest run src/game/overrun/net/codec.test.ts && npx tsc --noEmit && npx vitest run src/game/net`
Expected: codec PASS (7 tests), existing net suite still green.

- [ ] **Step 6: Commit**

```bash
git add src/game/overrun/net/codec.ts src/game/overrun/net/codec.test.ts src/game/net/protocol.ts
git commit -m "feat(overrun): quantized keyframe/delta codec + oStart/oInput/oSnap/oDelta wire kinds"
```

---

### Task 10: SyncEngine — generic + snapshot cadence/delta support (arena unchanged)

**Files:**
- Modify: `src/game/net/sync.ts`
- Modify: `src/game/net/session.ts` (arena passes `arenaSyncAdapter`)
- Modify: `src/game/net/sync.test.ts` (constructions gain `adapter: arenaSyncAdapter`)

**Interfaces:**
- Consumes: current `sync.ts`/`session.ts` — **OR** the already-generic version if the squid plan's Task 8 landed first (check for `export interface SyncAdapter` in `src/game/net/sync.ts`).
- Produces: `SyncAdapter<W, I>` and `SyncEngine<W, I>` with (deviations from the squid shape in **bold**):
  - `step`, `coerceIntent`, `encodeInput`, `decodeMessage`, `electHost`, `onPeerLeave?` — as in the squid plan.
  - **`encodeSnapshot(world: W, prevSent: W | null): string | null`** — `null` means "don't broadcast this tick" (cadence control); `prevSent` is the last world actually broadcast (delta base).
  - **`decodeMessage` may also return `{ kind: "update"; apply: (prev: W) => W }`** — for deltas that need the client's held world.
  - `arenaSyncAdapter: SyncAdapter<World, Intent>` — byte-identical arena wire behavior (`encodeSnapshot: (w) => encode({...})`, ignores `prevSent`, never `null`).

**Branch A — squid Task 8 has NOT landed** (no `SyncAdapter` in `sync.ts`): implement the full generic rewrite exactly as the squid plan's Task 8 Step 1 code (see `docs/superpowers/plans/2026-07-09-squid-game.md` lines ~1331–1461), THEN apply the extension edits below.
**Branch B — squid Task 8 HAS landed:** apply only the extension edits below.

- [ ] **Step 1 (Branch A only): Perform the squid plan's Task 8** — rewrite `sync.ts` generic, update `session.ts` (`adapter: arenaSyncAdapter` in `beginMatch`), update `sync.test.ts` constructions. Run `npx vitest run` — all green before proceeding.

- [ ] **Step 2: Extend the adapter interface + engine (both branches)** — in `src/game/net/sync.ts`:

Change the `SyncAdapter` members:

```ts
  /**
   * Encode the outbound broadcast for this tick, or null to skip (cadence control).
   * `prevSent` is the last world actually broadcast by THIS peer (delta base;
   * null before the first broadcast and right after host migration → keyframe).
   */
  encodeSnapshot(world: W, prevSent: W | null): string | null;
  /** Decode a wire message addressed to this engine; null → not ours (lobby traffic etc.). */
  decodeMessage(
    data: string,
  ):
    | { kind: "input"; intent: unknown }
    | { kind: "snapshot"; world: W }
    | { kind: "update"; apply: (prev: W) => W }
    | null;
```

In `SyncEngine`, add the field and rework the host branch of `tick()`:

```ts
  /** Last world actually broadcast by this peer (the delta base). */
  private lastSent: W | null = null;
```

```ts
    if (this.isHost) {
      this.inputs.set(this.opts.localId, intent);
      const intents = { ...this.opts.hostExtraIntents?.(), ...Object.fromEntries(this.inputs) };
      this.world = this.opts.adapter.step(this.world, intents, dt);
      const payload = this.opts.adapter.encodeSnapshot(this.world, this.lastSent);
      if (payload !== null) {
        this.opts.transport.send(payload);
        this.lastSent = this.world;
      }
      this.opts.onWorld(this.world);
    } else {
```

And extend `onMessage`:

```ts
    if (m.kind === "input" && this.isHost) {
      this.inputs.set(from, this.opts.adapter.coerceIntent(m.intent));
    } else if (m.kind === "snapshot" && !this.isHost) {
      this.world = m.world;
    } else if (m.kind === "update" && !this.isHost) {
      this.world = m.apply(this.world);
    }
```

Update `arenaSyncAdapter.encodeSnapshot` to the new signature (behavior unchanged):

```ts
  encodeSnapshot: (w, _prevSent) =>
    encode({ t: "snapshot", tick: w.tick, phase: w.phase, winnerId: w.winnerId, players: w.players, projectiles: w.projectiles }),
```

- [ ] **Step 3: Add engine tests for the new behavior** — append to `src/game/net/sync.test.ts` (using the existing LocalHub test helpers/style found in that file):

```ts
describe("snapshot cadence + deltas (generic engine)", () => {
  it("skips broadcast when encodeSnapshot returns null, and passes the last SENT world as prevSent", () => {
    // Minimal fake adapter over a counter world {n: number}: snapshot every 2nd tick.
    const sent: Array<{ n: number; prev: number | null }> = [];
    type CW = { n: number };
    const adapter: SyncAdapter<CW, Record<string, never>> = {
      step: (w) => ({ n: w.n + 1 }),
      coerceIntent: () => ({}),
      encodeInput: () => JSON.stringify({ t: "i" }),
      encodeSnapshot: (w, prev) => {
        if (w.n % 2 !== 0) return null;
        sent.push({ n: w.n, prev: prev?.n ?? null });
        return JSON.stringify({ t: "s", n: w.n });
      },
      decodeMessage: (data) => {
        const m = JSON.parse(data);
        if (m.t === "i") return { kind: "input", intent: {} };
        if (m.t === "s") return { kind: "snapshot", world: { n: m.n } };
        return null;
      },
      electHost: (_w, connected) => [...connected].sort()[0] ?? null,
    };
    const hub = new LocalHub();
    const host = new SyncEngine({ transport: hub.join("a"), localId: "a", world: { n: 0 }, adapter, readIntent: () => ({}), onWorld: () => {} });
    const client = new SyncEngine({ transport: hub.join("b"), localId: "b", world: { n: 0 }, adapter, readIntent: () => ({}), onWorld: () => {} });
    for (let t = 0; t < 4; t++) { host.tick(0.05); client.tick(0.05); }
    expect(sent).toEqual([{ n: 2, prev: null }, { n: 4, prev: 2 }]);
    expect(client.getWorld().n).toBe(4);
  });

  it("applies 'update' messages against the client's held world", () => {
    type CW = { n: number };
    const adapter: SyncAdapter<CW, Record<string, never>> = {
      step: (w) => ({ n: w.n + 1 }),
      coerceIntent: () => ({}),
      encodeInput: () => JSON.stringify({ t: "i" }),
      encodeSnapshot: (w, prev) =>
        prev === null ? JSON.stringify({ t: "s", n: w.n }) : JSON.stringify({ t: "d", add: w.n - prev.n }),
      decodeMessage: (data) => {
        const m = JSON.parse(data);
        if (m.t === "i") return { kind: "input", intent: {} };
        if (m.t === "s") return { kind: "snapshot", world: { n: m.n } };
        if (m.t === "d") return { kind: "update", apply: (prev: CW) => ({ n: prev.n + m.add }) };
        return null;
      },
      electHost: (_w, connected) => [...connected].sort()[0] ?? null,
    };
    const hub = new LocalHub();
    const host = new SyncEngine({ transport: hub.join("a"), localId: "a", world: { n: 0 }, adapter, readIntent: () => ({}), onWorld: () => {} });
    const client = new SyncEngine({ transport: hub.join("b"), localId: "b", world: { n: 0 }, adapter, readIntent: () => ({}), onWorld: () => {} });
    for (let t = 0; t < 3; t++) { host.tick(0.05); client.tick(0.05); }
    expect(client.getWorld().n).toBe(3); // keyframe n=1, then deltas +1 +1
  });
});
```

(Import `SyncAdapter` in the test file's import list; `LocalHub` is already imported there.)

- [ ] **Step 4: Run the FULL suite** — this is the regression gate for the whole plan:

Run: `npx vitest run && npx tsc --noEmit`
Expected: ALL tests green (arena suite unchanged, new engine tests pass).

- [ ] **Step 5: Commit**

```bash
git add src/game/net/sync.ts src/game/net/sync.test.ts src/game/net/session.ts
git commit -m "refactor(net): generic SyncEngine via SyncAdapter + snapshot cadence & delta updates (arena unchanged)"
```

---
### Task 11: Overrun sync adapter + client interpolation

**Files:**
- Create: `src/game/overrun/net/adapter.ts`
- Create: `src/game/overrun/net/interp.ts`
- Test: `src/game/overrun/net/adapter.test.ts`, `src/game/overrun/net/interp.test.ts`

**Interfaces:**
- Consumes: `SyncAdapter` (Task 10), codec (Task 9), `stepShooter` (Task 8), `coerceShooterIntent` (Task 2), `encode`/`decode` (protocol), `electHost` from `src/game/net/election.ts`, cadence constants (Task 1).
- Produces: `overrunSyncAdapter: SyncAdapter<ShooterWorld, ShooterIntent>`; `lerpWorlds(a: ShooterWorld | null, b: ShooterWorld, alpha: number): ShooterWorld`; `lerpAngle(a: number, b: number, t: number): number`.

- [ ] **Step 1: Write the failing tests**

```ts
// src/game/overrun/net/interp.test.ts
import { describe, expect, it } from "vitest";
import { lerpAngle, lerpWorlds } from "./interp";
import { createShooterWorld } from "../match";

describe("lerpAngle", () => {
  it("takes the shortest arc, including across ±π", () => {
    expect(lerpAngle(0, 1, 0.5)).toBeCloseTo(0.5);
    expect(lerpAngle(3, -3, 0.5)).toBeCloseTo(Math.PI, 1); // wraps through π, not through 0
  });
});

describe("lerpWorlds", () => {
  it("lerps player + enemy positions between snapshots; everything else comes from b", () => {
    const a = createShooterWorld(["p"], 1);
    a.players.p = { ...a.players.p!, pos: { x: 10, y: 10 }, aim: 0 };
    a.enemies = [{ id: "e0", kind: "rusher", pos: { x: 0, y: 0 }, health: 20, attackCooldown: 0 }];
    const b = { ...a, tick: a.tick + 3, score: 50 };
    b.players = { p: { ...a.players.p!, pos: { x: 12, y: 10 }, aim: 1 } };
    b.enemies = [{ id: "e0", kind: "rusher", pos: { x: 2, y: 0 }, health: 15, attackCooldown: 0 }];
    const out = lerpWorlds(a, b, 0.5);
    expect(out.players.p!.pos.x).toBeCloseTo(11);
    expect(out.players.p!.aim).toBeCloseTo(0.5);
    expect(out.enemies[0]!.pos.x).toBeCloseTo(1);
    expect(out.enemies[0]!.health).toBe(15); // non-positional fields from b
    expect(out.score).toBe(50);
  });

  it("entities new in b (no counterpart in a) render at b's position", () => {
    const a = createShooterWorld(["p"], 1);
    const b = { ...a, tick: a.tick + 3, enemies: [{ id: "e9", kind: "tank" as const, pos: { x: 5, y: 5 }, health: 120, attackCooldown: 0 }] };
    expect(lerpWorlds(a, b, 0.2).enemies[0]!.pos).toEqual({ x: 5, y: 5 });
  });

  it("null or stale base returns b as-is", () => {
    const b = createShooterWorld(["p"], 1);
    expect(lerpWorlds(null, b, 0.5)).toBe(b);
    expect(lerpWorlds({ ...b, tick: b.tick + 9 }, b, 0.5)).toBe(b);
  });
});
```

```ts
// src/game/overrun/net/adapter.test.ts
import { describe, expect, it } from "vitest";
import { overrunSyncAdapter } from "./adapter";
import { createShooterWorld } from "../match";
import { stepShooter } from "../sim";
import { KEYFRAME_EVERY, SHOOTER_DT, SNAPSHOT_EVERY_TICKS } from "../constants";
import { qWorld, unqWorld } from "./codec";
import type { ShooterIntent, ShooterWorld } from "../types";

const IDLE: ShooterIntent = { move: { up: false, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null };
const idle = (w: ShooterWorld) => Object.fromEntries(Object.keys(w.players).map((id) => [id, IDLE]));
const advance = (w: ShooterWorld, n: number) => {
  for (let t = 0; t < n; t++) w = stepShooter(w, idle(w), SHOOTER_DT);
  return w;
};

describe("overrunSyncAdapter cadence", () => {
  it("broadcasts only every SNAPSHOT_EVERY_TICKS ticks; first send is a keyframe, then deltas, keyframe again on schedule", () => {
    let w = createShooterWorld(["a"], 5);
    let prevSent: ShooterWorld | null = null;
    const kinds: string[] = [];
    for (let t = 0; t < SNAPSHOT_EVERY_TICKS * (KEYFRAME_EVERY + 2); t++) {
      w = stepShooter(w, idle(w), SHOOTER_DT);
      const payload = overrunSyncAdapter.encodeSnapshot(w, prevSent);
      if (w.tick % SNAPSHOT_EVERY_TICKS !== 0) {
        expect(payload).toBeNull();
        continue;
      }
      expect(payload).not.toBeNull();
      kinds.push((JSON.parse(payload!) as { m: { t: string } }).m.t);
      prevSent = w;
    }
    expect(kinds[0]).toBe("oSnap"); // prevSent null → keyframe
    expect(kinds).toContain("oDelta"); // deltas between keyframes
    expect(kinds.filter((k) => k === "oSnap").length).toBeGreaterThanOrEqual(2); // periodic keyframes
  });

  it("a client fed only the adapter's own broadcasts reconstructs the host's quantized world", () => {
    let host = createShooterWorld(["a", "b"], 9);
    let prevSent: ShooterWorld | null = null;
    let client: ShooterWorld = createShooterWorld(["a", "b"], 9);
    for (let t = 0; t < 90; t++) {
      host = stepShooter(host, idle(host), SHOOTER_DT);
      const payload = overrunSyncAdapter.encodeSnapshot(host, prevSent);
      if (!payload) continue;
      prevSent = host;
      const m = overrunSyncAdapter.decodeMessage(payload)!;
      if (m.kind === "snapshot") client = m.world;
      else if (m.kind === "update") client = m.apply(client);
    }
    expect(client).toEqual(unqWorld(qWorld(host)));
  });

  it("a delta arriving on the wrong base leaves the client world untouched until the next keyframe", () => {
    let host = createShooterWorld(["a"], 9);
    host = advance(host, SNAPSHOT_EVERY_TICKS);
    const key = overrunSyncAdapter.encodeSnapshot(host, null)!;
    const clientBase = (overrunSyncAdapter.decodeMessage(key) as { kind: "snapshot"; world: ShooterWorld }).world;
    const prevSent = host;
    host = advance(host, SNAPSHOT_EVERY_TICKS);
    host = advance(host, SNAPSHOT_EVERY_TICKS);
    // delta based on a send the client never got applied to an older world:
    const delta = overrunSyncAdapter.encodeSnapshot(host, advance(prevSent, SNAPSHOT_EVERY_TICKS))!;
    const m = overrunSyncAdapter.decodeMessage(delta)!;
    expect(m.kind).toBe("update");
    if (m.kind === "update") expect(m.apply(clientBase)).toBe(clientBase);
  });

  it("elects the lowest connected id that exists in the world (downed still hosts); input encodes/decodes", () => {
    const w = createShooterWorld(["b", "c"], 1);
    expect(overrunSyncAdapter.electHost(w, ["c", "b", "zz"])).toBe("b");
    w.players.b = { ...w.players.b!, status: "dead" };
    expect(overrunSyncAdapter.electHost(w, ["b", "c"])).toBe("c");
    const input = overrunSyncAdapter.encodeInput(w, { ...IDLE, fire: true });
    const m = overrunSyncAdapter.decodeMessage(input);
    expect(m?.kind).toBe("input");
  });

  it("onPeerLeave marks the departed player dead", () => {
    const w = createShooterWorld(["a", "b"], 1);
    const out = overrunSyncAdapter.onPeerLeave!(w, "b");
    expect(out.players.b!.status).toBe("dead");
    expect(overrunSyncAdapter.onPeerLeave!(out, "ghost")).toBe(out);
  });
});
```

- [ ] **Step 2: Run to verify both fail**

Run: `npx vitest run src/game/overrun/net` → FAIL (missing modules).

- [ ] **Step 3: Write the implementations**

```ts
// src/game/overrun/net/interp.ts
/**
 * Client-side smoothing: snapshots land at 10 Hz, rendering runs at 60 —
 * lerp player/enemy positions (and player aim) between the last two snapshots.
 * Pure; the session picks alpha = timeSinceLatest / SNAPSHOT_INTERVAL_S.
 */

import type { ShooterWorld } from "../types";

/** Shortest-arc angle interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  const TAU = Math.PI * 2;
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Render-world between snapshot `a` (older) and `b` (newer). Positions lerp; state comes from b. */
export function lerpWorlds(a: ShooterWorld | null, b: ShooterWorld, alpha: number): ShooterWorld {
  if (!a || a.tick >= b.tick) return b;
  const t = Math.min(1, Math.max(0, alpha));
  const players = { ...b.players };
  for (const id of Object.keys(players)) {
    const pa = a.players[id];
    const pb = players[id]!;
    if (!pa) continue;
    players[id] = {
      ...pb,
      pos: { x: mix(pa.pos.x, pb.pos.x, t), y: mix(pa.pos.y, pb.pos.y, t) },
      aim: lerpAngle(pa.aim, pb.aim, t),
    };
  }
  const prevEnemies = new Map(a.enemies.map((e) => [e.id, e]));
  const enemies = b.enemies.map((e) => {
    const pe = prevEnemies.get(e.id);
    return pe ? { ...e, pos: { x: mix(pe.pos.x, e.pos.x, t), y: mix(pe.pos.y, e.pos.y, t) } } : e;
  });
  return { ...b, players, enemies };
}
```

```ts
// src/game/overrun/net/adapter.ts
/**
 * Overrun's SyncAdapter: plugs stepShooter + the quantized keyframe/delta codec
 * into the shared SyncEngine. Cadence: broadcast every SNAPSHOT_EVERY_TICKS
 * ticks; keyframe when there's no delta base or on the KEYFRAME_EVERY schedule.
 */

import type { PeerId } from "../../net/transport";
import type { SyncAdapter } from "../../net/sync";
import { decode, encode } from "../../net/protocol";
import { electHost } from "../../net/election";
import { KEYFRAME_EVERY, SNAPSHOT_EVERY_TICKS } from "../constants";
import { coerceShooterIntent } from "../intent";
import { stepShooter } from "../sim";
import { applyDelta, diffWorld, qWorld, unqWorld, type ODelta, type QWorld } from "./codec";
import type { ShooterIntent, ShooterWorld } from "../types";

export const overrunSyncAdapter: SyncAdapter<ShooterWorld, ShooterIntent> = {
  step: stepShooter,
  coerceIntent: coerceShooterIntent,
  encodeInput: (_w, intent) => encode({ t: "oInput", intent }),
  encodeSnapshot: (w, prevSent) => {
    if (w.tick % SNAPSHOT_EVERY_TICKS !== 0 || w.tick === 0) return null;
    const snapIndex = w.tick / SNAPSHOT_EVERY_TICKS;
    if (prevSent === null || snapIndex % KEYFRAME_EVERY === 0) {
      return encode({ t: "oSnap", w: qWorld(w) });
    }
    return encode({ t: "oDelta", d: diffWorld(qWorld(prevSent), qWorld(w)) });
  },
  decodeMessage: (data) => {
    const m = decode(data);
    if (!m) return null;
    if (m.t === "oInput") return { kind: "input", intent: m.intent };
    if (m.t === "oSnap") return { kind: "snapshot", world: unqWorld(m.w as QWorld) };
    if (m.t === "oDelta") return { kind: "update", apply: (prev: ShooterWorld) => applyDelta(prev, m.d as ODelta) };
    return null;
  },
  electHost: (w, connected: PeerId[]) => {
    const present = connected.filter((id) => w.players[id] && w.players[id]!.status !== "dead");
    return electHost(present.length > 0 ? present : [...connected]);
  },
  onPeerLeave: (w, id) =>
    w.players[id] && w.players[id]!.status !== "dead"
      ? { ...w, players: { ...w.players, [id]: { ...w.players[id]!, status: "dead", health: 0 } } }
      : w,
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/overrun/net && npx tsc --noEmit` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/net/adapter.ts src/game/overrun/net/adapter.test.ts src/game/overrun/net/interp.ts src/game/overrun/net/interp.test.ts
git commit -m "feat(overrun): SyncAdapter (keyframe/delta cadence) + client snapshot interpolation"
```

---

### Task 12: OverrunSession + end-to-end LocalHub tests

**Files:**
- Create: `src/game/overrun/net/session.ts`
- Test: `src/game/overrun/net/session.test.ts`

**Interfaces:**
- Consumes: `overrunSyncAdapter` (Task 11), `lerpWorlds` (Task 11), generic `SyncEngine` (Task 10), `LobbyPlayer`/`Roster`/`upsert`/`remove`/`rosterList` from `src/game/net/lobby.ts`, `electHost` from `election.ts`, `encode`/`decode`/`coerceAvatarUrl` + `oStart` (Task 9), `coerceShape`/`DEFAULT_SHAPE` + `coerceWeapon`/`DEFAULT_WEAPON` (arena — the shared `hello` message carries them; Overrun ignores them), `createShooterWorld` (Task 4), `initialShooterMemory`/`inputToShooterIntent` (Task 2), `COUNTDOWN_S` from `src/game/constants.ts`, cadence constants (Task 1).
- Produces: `OverrunSession` with:
  - `localId: PlayerId`; `phase: "lobby" | "countdown" | "playing" | "ended"`; `matchEpoch: number`
  - `getState(): { localId; phase; matchEpoch; roster: LobbyPlayer[]; hostId: PlayerId | null; isHost: boolean }`
  - `setProfile(name: string, iconColor: number): void`
  - `start(): void` — host-only, ≥1 participant; **mints `seed = Math.floor(Math.random() * 0x7fffffff)`** (the one legal impurity — documented) and broadcasts `oStart`
  - `pickPerk(i: 0 | 1 | 2): void` — queues a pick for the next tick's intent (the HUD's click path)
  - `kick(id)`, `makeHost(id)`, `leave()`, `toLobby()`
  - `frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number }` — fixed-tick accumulator (`SHOOTER_DT`, capped `MAX_CATCHUP_TICKS`); on clients returns `lerpWorlds(prevSnap, latestSnap, sinceLatest / SNAPSHOT_INTERVAL_S)`; sets `phase = "ended"` when the world ends
  - `getMeta(id: PlayerId): { name: string; colorIndex: number }`
  - Constructor options: `{ transport: Transport; name: string; iconColor: number; isCreator?: boolean; onChange: () => void }`

**Implementation notes (mirror the arena `Session` explicit-host model exactly):** creator claims host; `hello` carries `hostId` and the profile (send `shape: DEFAULT_SHAPE, weapon: DEFAULT_WEAPON` in the shared hello — coerced but unused here); `host` message transfers; host-leave falls back to lowest-id election with re-claim + announce. `oStart` → `beginMatch(players, seed)`: build `createShooterWorld(ids, seed)`, meta from the start players, `new SyncEngine({ transport, localId, world, adapter: overrunSyncAdapter, readIntent, onWorld: () => {} })`, `phase = "countdown"`, `countdownLeft = COUNTDOWN_S`, `matchEpoch += 1`. `readIntent` maps `pendingRaw` through `inputToShooterIntent` + merges `queuedPick` (consume once, prefer the keyboard's pick when both). In `frame` during `playing`/`ended`: `acc = Math.min(acc + dt, MAX_CATCHUP_TICKS * SHOOTER_DT)`; `while (acc >= SHOOTER_DT) { engine.tick(SHOOTER_DT); acc -= SHOOTER_DT; }`; snapshot-change detection: `const w = engine.getWorld(); if (w.tick !== latestTick) { prevSnap = latestSnap; latestSnap = w; latestTick = w.tick; sinceLatest = 0; } else sinceLatest += dt;` — host renders `w` directly, clients render `lerpWorlds(prevSnap, latestSnap, sinceLatest / SNAPSHOT_INTERVAL_S)`.

- [ ] **Step 1: Write the failing test** — the e2e heart of the plan:

```ts
// src/game/overrun/net/session.test.ts
import { describe, expect, it } from "vitest";
import { OverrunSession } from "./session";
import { LocalHub } from "../../net/transport";
import { qWorld, unqWorld } from "./codec";
import { MAX_CATCHUP_TICKS, SHOOTER_DT, SNAPSHOT_EVERY_TICKS } from "../constants";
import type { RawShooterInput } from "../types";

const RAW: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

function makeParty(n: number): { hub: LocalHub; sessions: OverrunSession[] } {
  const hub = new LocalHub();
  const sessions = Array.from({ length: n }, (_, i) =>
    new OverrunSession({ transport: hub.join(`p${i}`), name: `P${i}`, iconColor: i % 8, isCreator: i === 0, onChange: () => {} }),
  );
  return { hub, sessions };
}

/** Run every session's frame() for `seconds` of wall time in SHOOTER_DT slices. */
function run(sessions: OverrunSession[], seconds: number, input: (id: string) => RawShooterInput = () => RAW): void {
  const steps = Math.round(seconds / SHOOTER_DT);
  for (let s = 0; s < steps; s++) for (const ses of sessions) ses.frame(SHOOTER_DT, input(ses.localId));
}

describe("OverrunSession lifecycle", () => {
  it("8 peers: roster converges, host starts, everyone reaches playing with an identical initial party", () => {
    const { sessions } = makeParty(8);
    expect(sessions[0]!.getState().roster.length).toBe(8);
    expect(sessions[7]!.getState().hostId).toBe("p0");
    sessions[0]!.start();
    expect(sessions.every((s) => s.phase === "countdown")).toBe(true);
    run(sessions, 3.1); // countdown
    expect(sessions.every((s) => s.phase === "playing")).toBe(true);
    const worlds = sessions.map((s) => s.frame(SHOOTER_DT, RAW).world);
    expect(Object.keys(worlds[0]!.players).sort()).toEqual(["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
  });

  it("non-host cannot start", () => {
    const { sessions } = makeParty(2);
    sessions[1]!.start();
    expect(sessions[0]!.phase).toBe("lobby");
  });

  it("clients converge on the host's quantized world and never spawn enemies of their own", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.start();
    run(sessions, 3.1);
    run(sessions, 2); // waves spawn on the host
    const host = sessions[0]!.frame(SHOOTER_DT, RAW).world;
    // after a snapshot boundary settles, clients hold exactly unq(q(host-at-that-tick))
    run(sessions, SNAPSHOT_EVERY_TICKS * SHOOTER_DT * 2);
    const client = sessions[2]!.frame(0, RAW).world; // dt 0 → no tick, raw latest snapshot (alpha 0 → latest? lerp(prev,latest,0)=prev pos… assert on IDs not positions)
    expect(host.enemies.length).toBeGreaterThan(0);
    // every enemy a client knows came from the host's spawnSeq namespace — no local spawns
    expect(client.enemies.every((e) => /^e\d+$/.test(e.id))).toBe(true);
    expect(client.spawnSeq).toBeGreaterThan(0);
    expect(client.seed).toBe(host.seed);
  });

  it("host migration mid-wave: the new host resumes from its held snapshot (seed/spawnSeq/pity intact) and clients keep converging", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.start();
    run(sessions, 3.1);
    run(sessions, 3); // into wave 1+
    const beforeQ = qWorld(sessions[1]!.frame(0, RAW).world);
    sessions[0]!.leave();
    const survivors = sessions.slice(1);
    run(survivors, 0.5);
    // p1 (lowest surviving id) is now host and kept simulating from its snapshot
    expect(survivors[0]!.getState().isHost).toBe(true);
    const after = survivors[0]!.frame(0, RAW).world;
    expect(after.seed).toBe(unqWorld(beforeQ).seed);
    expect(after.spawnSeq).toBeGreaterThanOrEqual(unqWorld(beforeQ).spawnSeq);
    expect(after.tick).toBeGreaterThan(unqWorld(beforeQ).tick);
    expect(after.players.p0?.status).toBe("dead"); // departed peer folded in
    // determinism of the continuation: a fresh sim fed the same snapshot+idle intents matches the new host
    run(survivors, 1);
    const w1 = survivors[0]!.frame(0, RAW).world;
    const w2 = survivors[1]!.frame(0, RAW).world;
    expect(qWorld(w2).t).toBeLessThanOrEqual(qWorld(w1).t); // client trails by ≤ a snapshot
  });

  it("pickPerk queues a pick that reaches the sim as intent", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    // no offer yet → pick is a harmless no-op; the wire path is what's under test
    sessions[0]!.pickPerk(1);
    run(sessions, 0.2);
    expect(sessions[0]!.phase).toBe("playing");
  });

  it("frame clamps catch-up work after a long stall", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    const before = sessions[0]!.frame(0, RAW).world.tick;
    sessions[0]!.frame(10, RAW); // a 10 s hang must not run 300 ticks
    const after = sessions[0]!.frame(0, RAW).world.tick;
    expect(after - before).toBeLessThanOrEqual(MAX_CATCHUP_TICKS + 1);
  });

  it("toLobby resets to the warm-up room", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    sessions[0]!.toLobby();
    expect(sessions[0]!.phase).toBe("lobby");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run src/game/overrun/net/session.test.ts` → FAIL (`Cannot find module './session'`).

- [ ] **Step 3: Write `src/game/overrun/net/session.ts`** — mirror `src/game/net/session.ts` structurally (constructor/hello/host/kick/makeHost/onPeerLeave are near-verbatim; strip rounds/bots/shape/weapon usage; add the shooter bits). Full file:

```ts
// src/game/overrun/net/session.ts
/**
 * Overrun netplay session: Transport + warm-up roster + the generic SyncEngine,
 * exposed as the renderer's OverrunDriver. Mirrors the arena Session's presence
 * + explicit-host model (hello/host/kick/leave), minus rounds/bots/cosmetics.
 *
 * The ONE permitted impurity in this file: `start()` mints the match seed with
 * Math.random() — it is broadcast in `oStart` and from then on all randomness
 * is the world-carried coordinate-hash.
 */

import type { PlayerId } from "../../arena/types";
import type { Transport } from "../../net/transport";
import { decode, encode } from "../../net/protocol";
import { SyncEngine } from "../../net/sync";
import { electHost } from "../../net/election";
import type { LobbyPlayer, Roster } from "../../net/lobby";
import { remove, rosterList, upsert } from "../../net/lobby";
import { DEFAULT_SHAPE } from "../../arena/cosmetic";
import { DEFAULT_WEAPON } from "../../arena/weapons";
import { COUNTDOWN_S } from "../../constants";
import { MAX_CATCHUP_TICKS, SHOOTER_DT, SNAPSHOT_INTERVAL_S } from "../constants";
import { initialShooterMemory, inputToShooterIntent } from "../intent";
import { createShooterWorld } from "../match";
import { overrunSyncAdapter } from "./adapter";
import { lerpWorlds } from "./interp";
import type { RawShooterInput, ShooterIntent, ShooterWorld } from "../types";

export type OverrunPhase = "lobby" | "countdown" | "playing" | "ended";

export interface OverrunSessionOptions {
  transport: Transport;
  name: string;
  iconColor: number;
  isCreator?: boolean;
  onChange: () => void;
}

const NO_INPUT: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

export class OverrunSession {
  readonly localId: PlayerId;
  phase: OverrunPhase = "lobby";
  matchEpoch = 0;

  private readonly t: Transport;
  private profile: LobbyPlayer;
  private roster: Roster = {};
  private explicitHostId: PlayerId | null = null;
  private engine: SyncEngine<ShooterWorld, ShooterIntent> | null = null;
  private initialWorld: ShooterWorld | null = null;
  private meta: Record<PlayerId, { name: string; colorIndex: number }> = {};
  private countdownLeft = 0;
  private mem = initialShooterMemory();
  private pendingRaw: RawShooterInput = NO_INPUT;
  private queuedPick: 0 | 1 | 2 | null = null;
  private acc = 0;
  // client interpolation state
  private prevSnap: ShooterWorld | null = null;
  private latestSnap: ShooterWorld | null = null;
  private latestTick = -1;
  private sinceLatest = 0;

  constructor(private readonly opts: OverrunSessionOptions) {
    this.t = opts.transport;
    this.localId = this.t.selfId;
    this.profile = { id: this.localId, name: opts.name, iconColor: opts.iconColor, shape: DEFAULT_SHAPE, weapon: DEFAULT_WEAPON, avatarUrl: null };
    this.roster = upsert({}, this.profile);
    if (opts.isCreator) this.explicitHostId = this.localId;
    this.t.onMessage((data, from) => this.onMessage(data, from));
    this.t.onPeerJoin(() => this.sendHello());
    this.t.onPeerLeave((id) => this.onPeerLeave(id));
    this.sendHello();
  }

  getState() {
    const hostId = this.hostId();
    return {
      localId: this.localId,
      phase: this.phase,
      matchEpoch: this.matchEpoch,
      roster: rosterList(this.roster),
      hostId,
      isHost: hostId === this.localId,
    };
  }

  setProfile(name: string, iconColor: number): void {
    this.profile = { ...this.profile, name, iconColor };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  /** Host-only: start the run for the current roster with a freshly minted seed. */
  start(): void {
    if (this.hostId() !== this.localId) return;
    const players = rosterList(this.roster).map((p) => ({ id: p.id, name: p.name, iconColor: p.iconColor }));
    if (players.length < 1) return;
    const seed = Math.floor(Math.random() * 0x7fffffff);
    this.t.send(encode({ t: "oStart", countdownMs: COUNTDOWN_S * 1000, seed, players }));
    this.beginMatch(players, seed);
  }

  /** HUD click path for a perk choice (keyboard 1/2/3 flows through RawShooterInput). */
  pickPerk(i: 0 | 1 | 2): void {
    this.queuedPick = i;
  }

  kick(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    this.t.send(encode({ t: "kick", targetId }));
    this.roster = remove(this.roster, targetId);
    this.opts.onChange();
  }

  makeHost(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    if (!(targetId in this.roster)) return;
    this.explicitHostId = targetId;
    this.t.send(encode({ t: "host", hostId: targetId }));
    this.opts.onChange();
  }

  leave(): void {
    this.t.close();
  }

  toLobby(): void {
    this.phase = "lobby";
    this.engine = null;
    this.initialWorld = null;
    this.prevSnap = null;
    this.latestSnap = null;
    this.latestTick = -1;
    this.opts.onChange();
  }

  getMeta(id: PlayerId): { name: string; colorIndex: number } {
    return this.meta[id] ?? { name: id.slice(0, 6), colorIndex: 0 };
  }

  /** Advance the fixed-tick sim and return the world to RENDER (+ countdown). */
  frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number } {
    this.pendingRaw = input;

    if (this.phase === "countdown") {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.opts.onChange();
      }
      return { world: this.initialWorld ?? createShooterWorld([this.localId], 0), countdown: Math.ceil(this.countdownLeft) };
    }

    if ((this.phase === "playing" || this.phase === "ended") && this.engine) {
      this.acc = Math.min(this.acc + dt, MAX_CATCHUP_TICKS * SHOOTER_DT);
      while (this.acc >= SHOOTER_DT) {
        this.engine.tick(SHOOTER_DT);
        this.acc -= SHOOTER_DT;
      }
      const w = this.engine.getWorld();
      if (w.tick !== this.latestTick) {
        this.prevSnap = this.latestSnap;
        this.latestSnap = w;
        this.latestTick = w.tick;
        this.sinceLatest = 0;
      } else {
        this.sinceLatest += dt;
      }
      if (w.phase === "ended" && this.phase === "playing") {
        this.phase = "ended";
        this.opts.onChange();
      }
      const render = this.engine.isHost
        ? w
        : lerpWorlds(this.prevSnap, this.latestSnap ?? w, this.sinceLatest / SNAPSHOT_INTERVAL_S);
      return { world: render, countdown: 0 };
    }

    return { world: this.initialWorld ?? createShooterWorld([this.localId], 0), countdown: 0 };
  }

  // ---- internals ----

  private hostId(): PlayerId | null {
    if (this.explicitHostId && [this.localId, ...this.t.getPeers()].includes(this.explicitHostId)) {
      return this.explicitHostId;
    }
    return electHost([this.localId, ...this.t.getPeers()]);
  }

  private onPeerLeave(id: PlayerId): void {
    const wasHost = id === this.hostId();
    this.roster = remove(this.roster, id);
    if (wasHost) {
      this.explicitHostId = null;
      if (electHost([this.localId, ...this.t.getPeers()]) === this.localId) {
        this.explicitHostId = this.localId;
        this.t.send(encode({ t: "host", hostId: this.localId }));
      }
    }
    this.opts.onChange();
  }

  private sendHello(): void {
    this.t.send(encode({ t: "hello", name: this.profile.name, iconColor: this.profile.iconColor, shape: this.profile.shape, weapon: this.profile.weapon, avatarUrl: null, hostId: this.explicitHostId }));
  }

  private onMessage(data: string, from: PlayerId): void {
    const m = decode(data);
    if (!m) return;
    switch (m.t) {
      case "hello": {
        const isNew = !(from in this.roster);
        this.roster = upsert(this.roster, { id: from, name: m.name, iconColor: m.iconColor, shape: DEFAULT_SHAPE, weapon: DEFAULT_WEAPON, avatarUrl: null });
        if (this.explicitHostId == null && m.hostId != null) this.explicitHostId = m.hostId;
        if (isNew) this.sendHello();
        this.opts.onChange();
        break;
      }
      case "host":
        this.explicitHostId = m.hostId;
        this.opts.onChange();
        break;
      case "kick":
        if (m.targetId === this.localId) {
          this.leave();
          this.phase = "lobby";
          this.opts.onChange();
        }
        break;
      case "oStart":
        this.beginMatch(m.players, m.seed);
        break;
      default:
        break; // oInput/oSnap/oDelta are consumed by the SyncEngine's handler
    }
  }

  private beginMatch(players: { id: PlayerId; name: string; iconColor: number }[], seed: number): void {
    this.meta = Object.fromEntries(players.map((p) => [p.id, { name: p.name, colorIndex: p.iconColor }]));
    this.initialWorld = createShooterWorld(players.map((p) => p.id), seed);
    this.mem = initialShooterMemory();
    this.acc = 0;
    this.prevSnap = null;
    this.latestSnap = null;
    this.latestTick = -1;

    this.engine = new SyncEngine({
      transport: this.t,
      localId: this.localId,
      world: this.initialWorld,
      adapter: overrunSyncAdapter,
      readIntent: () => {
        const { intent, memory } = inputToShooterIntent(this.pendingRaw, this.mem);
        this.mem = memory;
        const perkPick = intent.perkPick ?? this.queuedPick;
        this.queuedPick = null;
        return { ...intent, perkPick };
      },
      onWorld: () => {},
    });

    this.phase = "countdown";
    this.countdownLeft = COUNTDOWN_S;
    this.matchEpoch += 1;
    this.opts.onChange();
  }
}
```

- [ ] **Step 4: Run the session e2e + the FULL suite**

Run: `npx vitest run src/game/overrun && npx vitest run && npx tsc --noEmit`
Expected: everything green.

- [ ] **Step 5: Commit**

```bash
git add src/game/overrun/net/session.ts src/game/overrun/net/session.test.ts
git commit -m "feat(overrun): OverrunSession (fixed-tick, interp, migration) + 8-peer LocalHub e2e"
```

---

### Task 13: Renderer — contract, keyboard, fake-2.5D scene (procedural art)

**Files:**
- Create: `src/game/overrun/render/contract.ts`
- Create: `src/game/overrun/render/keyboard.ts`
- Create: `src/game/overrun/render/scene.ts`

No unit tests (impure Phaser adapter — repo pattern; `tsc` + build + Task 16 live playtest gate it).

**Interfaces:**
- Consumes: `OverrunSession.frame/getMeta` (Task 12) via the driver contract; `screenDeltaToWorldAngle` from `src/game/arena/input/mouse.ts` (verbatim reuse); `PX_PER_M` from `src/game/constants.ts`; overrun constants + types; `GUNS` (HUD strings), `PERKS`/`xpToNext` (HUD), `ENEMIES` (radii), `accuracy` (end screen — used by the island, not the scene).
- Produces:

```ts
// src/game/overrun/render/contract.ts
/** Contract between the Overrun Phaser scene and whatever drives the match. */

import type { PlayerId } from "../../arena/types";
import type { GunId, PerkOffer, RawShooterInput, ShooterStatus, ShooterWorld } from "../types";

export interface OverrunMeta {
  name: string;
  colorIndex: number;
}

export interface OverrunDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawShooterInput): { world: ShooterWorld; countdown: number };
  getMeta(id: PlayerId): OverrunMeta;
}

export interface TeammateHud {
  id: PlayerId;
  name: string;
  colorIndex: number;
  status: ShooterStatus;
  health: number;
}

export interface OverrunHudState {
  countdown: number;
  health: number;
  maxHealth: number;
  status: ShooterStatus;
  gun: GunId;
  mag: number;
  /** null = infinite (pistol). */
  reserve: number | null;
  /** 0..1 of an active reload (0 = idle). */
  reloadFraction: number;
  wave: number;
  intermission: number;
  score: number;
  xp: number;
  xpNext: number;
  level: number;
  /** Head of the local player's offer queue (null = nothing to pick). */
  offer: PerkOffer | null;
  offersQueued: number;
  kills: number;
  teammates: TeammateHud[];
}

export type OverrunEvent =
  | { type: "tik"; n: number }
  | { type: "go" }
  | { type: "shot" }
  | { type: "kill" }
  | { type: "pickup" }
  | { type: "levelup" }
  | { type: "downed"; local: boolean }
  | { type: "revived" }
  | { type: "gameover" };

export interface OverrunConfig {
  driver: OverrunDriver;
  onHud: (h: OverrunHudState) => void;
  onEvent: (e: OverrunEvent) => void;
  /** Fired once when the run ends, with the final world (scorecard + merch payload source). */
  onEnd: (world: ShooterWorld) => void;
}
```

```ts
// src/game/overrun/render/keyboard.ts
/** Phaser keyboard → RawShooterInput (WASD/arrows move, R reload, 1/2/3 perk picks). */

import Phaser from "phaser";
import type { RawShooterInput } from "../types";

export interface ShooterKeyboardReader {
  read(): Omit<RawShooterInput, "fire" | "aim">;
}

export function createShooterKeyboard(scene: Phaser.Scene): ShooterKeyboardReader {
  const kb = scene.input.keyboard;
  if (!kb) {
    return { read: () => ({ up: false, down: false, left: false, right: false, reload: false, pick1: false, pick2: false, pick3: false }) };
  }
  const cursors = kb.createCursorKeys();
  const K = Phaser.Input.Keyboard.KeyCodes;
  const w = kb.addKey(K.W), a = kb.addKey(K.A), s = kb.addKey(K.S), d = kb.addKey(K.D);
  const r = kb.addKey(K.R);
  const one = kb.addKey(K.ONE), two = kb.addKey(K.TWO), three = kb.addKey(K.THREE);
  return {
    read: () => ({
      up: cursors.up.isDown || w.isDown,
      down: cursors.down.isDown || s.isDown,
      left: cursors.left.isDown || a.isDown,
      right: cursors.right.isDown || d.isDown,
      reload: r.isDown,
      pick1: one.isDown,
      pick2: two.isDown,
      pick3: three.isDown,
    }),
  };
}
```

- **`src/game/overrun/render/scene.ts`** — export `OVERRUN_WIDTH`, `OVERRUN_HEIGHT`, `OverrunScene`. Follow `ArenaScene`'s conventions exactly (read `src/game/arena/render/scene.ts` first):
  - Same projection: `MARGIN_X = 56`, `OFFSET_Y = 109`, `BOTTOM_PAD = 98`, `Y_SCALE = 0.62`, `sx/sy` helpers, `OVERRUN_WIDTH/HEIGHT` computed like `ARENA_WIDTH/HEIGHT` from `OVERRUN_FIELD_M`.
  - `create()`: read `cfg` from `this.registry.get("cfg") as OverrunConfig`; build ALL textures procedurally with `Phaser.GameObjects.Graphics` + `generateTexture` (NO asset loads — no `preload` fetches): dark floor rect with a subtle grid; per-color soldier discs (8 player colors, camo-green body `0x3f6212` with a colored ring per `colorIndex`, radius `PLAYER_RADIUS_M * PX_PER_M`); gun layer (an 18×5 white rect, origin (0.15, 0.5), tinted per gun: pistol `0xd4d4d8`, shotgun `0xf59e0b`, rifle `0x38bdf8`); `rusher` red disc (`0xef4444`, radius 0.4 m scaled), `tank` dark disc (`0x334155`, radius 0.9 m scaled) with a darker rim; pickups: medkit = white rounded square + red cross, gun pickups = amber square with a 7px dark letter "S"/"R" drawn as `Text`.
  - `update(_, deltaMs)`: build `RawShooterInput` = keyboard read + `fire: this.input.activePointer.isDown` + `aim: screenDeltaToWorldAngle(pointer.x - sx(local.pos.x), pointer.y - sy(local.pos.y), Y_SCALE)` (only when a local alive player exists); call `driver.frame(deltaMs / 1000, input)`; then diff-render:
    - Players: container per id (soldier disc + gun layer rotated to `player.aim`; screen rotation angle = `Math.atan2(Math.sin(aim) * Y_SCALE, Math.cos(aim))` — re-project the world angle); y-sort via `setDepth(pos.y)`; downed → tint gray `0x64748b` + a white circular progress arc (Graphics, `reviveProgress / REVIVE_S`); dead → hide; name label under each non-local player (small, from `driver.getMeta`).
    - Enemies: pooled images keyed by id; remove → 150 ms fade-out tween ("kill pop").
    - Pickups: pooled images keyed by id, slight sine bob using render time (render-only wall clock is fine here).
    - Events (dedupe by `tick:index` key, only process events with `tick > lastProcessedTick`): `shot` → draw a 1-frame tracer line (Graphics, alpha 0.7, auto-fade 80 ms) from `from` to `to` (projected) + a 3px muzzle circle; forward to `onEvent({type:"shot"})` only for the LOCAL player's shots (SFX volume sanity); `kill` → `onEvent({type:"kill"})`; `levelup`/`downed`/`revived`/`pickup` similarly (`downed` sets `local` by comparing playerId).
    - Countdown: forward `tik`/`go` transitions like `ArenaScene` does (track `lastCountdown`).
    - HUD: assemble `OverrunHudState` from the local player + world (`xpNext: xpToNext(level)`, `reserve: GUNS[gun].reserveMax === null ? null : ammo.reserve`, `reloadFraction: ammo.reloadRemaining / (GUNS[gun].reloadS)` clamped, `offer: offers[0] ?? null`, `offersQueued: offers.length`, teammates = every OTHER player mapped through `getMeta`); call `cfg.onHud` every frame (the island rate-limits).
    - End: when `world.phase === "ended"` and not yet fired → `cfg.onEvent({type:"gameover"})` + `cfg.onEnd(world)` once.

**Steps:**

- [ ] **Step 1:** Read `src/game/arena/render/scene.ts` fully (the projection helpers, texture generation with Graphics, container/y-sort/diff-render patterns, countdown event forwarding).
- [ ] **Step 2:** Write the three files per the spec above. Keep `scene.ts` ≤ ~450 lines; extract tiny private helpers rather than inlining everything in `update`.
- [ ] **Step 3:** Verify: `npx tsc --noEmit` clean; `npx vitest run` still green (no sim/net files touched).
- [ ] **Step 4: Commit**

```bash
git add src/game/overrun/render
git commit -m "feat(overrun): fake-2.5D Phaser scene (procedural textures, tracers, revive ring) + shooter keyboard"
```

---

### Task 14: React island — Overrun.tsx, lobby variant, HUD, end screen + merch link

**Files:**
- Create: `src/components/game/overrun/Overrun.tsx`
- Create: `src/components/game/overrun/OverrunWarmupRoom.tsx`
- Create: `src/components/game/overrun/hud/AmmoBox.tsx`, `hud/XpBar.tsx`, `hud/PerkOffersOverlay.tsx`, `hud/TeamStrip.tsx`

**Interfaces:**
- Consumes: `OverrunSession` (Task 12), `OverrunScene`/`OVERRUN_WIDTH`/`OVERRUN_HEIGHT` + `OverrunConfig`/`OverrunHudState`/`OverrunEvent` (Task 13), `buildJoinUrl`/`mintRoomId`/`parseRoomId` (`src/game/net/roomLink.ts`), `buildIceServers`/`iceConfigFromEnv` (`src/game/net/ice.ts`), `joinedIds` (`src/game/net/lobby.ts`), `Sfx` (`src/game/audio/sfx.ts`), `Countdown` from `../hud/Countdown`, `buildShopUrl`/`sanitizePayload` (`src/lib/merch/print.ts`), `buildOverrunPrintPayload`/`accuracy` (Task 7), `PERKS` (Task 3).
- Produces: default export `Overrun()` island component.

**Structure — mirror `src/components/game/Arena.tsx` closely** (read it first; same refs/effects/roomLink/RTC/Phaser-mount patterns). Differences:

1. **Session:** `new OverrunSession({ transport, name, iconColor, isCreator: !existing, onChange: bump })`; transport created identically via `createRtcTransport` + the same `ICE_SERVERS` block (copy it verbatim — env-inlining constraint).
2. **Phaser mount:** `gameKey = sessionState.phase !== "lobby" ? \`n${sessionState.matchEpoch}\` : ""`; config `{ width: OVERRUN_WIDTH, height: OVERRUN_HEIGHT, scene: [OverrunScene] }`; `cfg: OverrunConfig = { driver: sessionRef.current!, onHud, onEvent, onEnd: (w) => setFinalWorld(w) }`.
3. **SFX mapping** (reuse existing `Sfx` sound names — no new audio code): `tik→"tik"`, `go→"go"`, `shot→"shoot"`, `kill→"hit"`, `pickup→"join"`, `levelup→"go"`, `downed(local)→"gameover"`, `downed(!local)→"hit"`, `revived→"join"`, `gameover→"gameover"`.
4. **HUD overlay** (absolute-positioned over the canvas, `pointerEvents: "none"` except the perk overlay):
   - top-left: health bar (green→red fill `hud.health / hud.maxHealth`, numeric label) + `<TeamStrip teammates={hud.teammates} />`
   - top-right: wave badge (`WAVE {hud.wave}` or `NEXT WAVE IN {ceil(intermission)}`) + score
   - bottom-left: `<AmmoBox gun={hud.gun} mag={hud.mag} reserve={hud.reserve} reloadFraction={hud.reloadFraction} />`
   - bottom: `<XpBar xp={hud.xp} xpNext={hud.xpNext} level={hud.level} />`
   - right edge: `<PerkOffersOverlay offer={hud.offer} queued={hud.offersQueued} onPick={(i) => sessionRef.current?.pickPerk(i)} />` — 3 cards showing `PERKS[id].name` + `.blurb` + the key hint `[1]/[2]/[3]`; clickable (`pointerEvents: "auto"`)
   - `hud.status === "downed"` → centered pulsing "DOWNED — a teammate can revive you" banner
   - `hud.countdown > 0` → `<Countdown n={hud.countdown} />`
5. **End screen** (`phase === "ended" && finalWorld`): overlay (reuse Arena's `Overlay` pattern — copy the small component) with: `WAVE {finalWorld.wave}` headline, party score, a stats table (per player: name, kills, accuracy % via `accuracy`, level — local row highlighted), Play again (host: `sessionRef.current?.start()`) / Back to room (`toLobby`), and the merch link:

```tsx
const payload = sanitizePayload(buildOverrunPrintPayload(finalWorld, localId));
<a href={buildShopUrl("tee", payload)} className="mt-1 rounded-lg border border-amber-300/60 px-5 py-2 font-semibold text-amber-300 hover:bg-amber-300/10">
  🏆 Print this run on a tee
</a>
```

6. **`OverrunWarmupRoom`** (lean — model on `src/components/game/lobby/WarmupRoom.tsx`'s markup/styles, strip shape/weapon/avatar/bots/rounds): name input, 8-color picker, party list (color dot, name, host ★, kick ✕ + make-host for the host), copyable room link, controls legend line ("WASD move · mouse aim · hold LMB fire · R reload · 1/2/3 perks"), Start button (host-only, enabled at ≥1, label "Start — co-op up to 8"; non-hosts see "Waiting for the host…"). Props: `{ roster, localId, hostId, isHost, name, colorIndex, joinUrl, onName, onColor, onStart, onKick, onMakeHost }`.
7. Keep the join-chime effect + audio-unlock effect verbatim from Arena.

**Steps:**

- [ ] **Step 1:** Read `src/components/game/Arena.tsx` and `src/components/game/lobby/WarmupRoom.tsx` fully.
- [ ] **Step 2:** Write the four HUD components (each ≤60 lines, plain divs + tailwind classes consistent with the existing HUD components' style).
- [ ] **Step 3:** Write `OverrunWarmupRoom.tsx`, then `Overrun.tsx` per the structure above.
- [ ] **Step 4:** Verify: `npx tsc --noEmit` clean; `npx vitest run` green.
- [ ] **Step 5: Commit**

```bash
git add src/components/game/overrun
git commit -m "feat(overrun): React island — phase shell, warm-up room, shooter HUD, perk overlay, scorecard + merch link"
```

---

### Task 15: Page + arcade/member registries (Overrun replaces the Tactics card)

**Files:**
- Create: `src/pages/games/overrun.astro`
- Modify: `src/lib/games/registry.ts` (replace the `tactics` entry)
- Modify: `src/lib/members/games.ts` (add overrun)

**Interfaces:**
- Consumes: `Overrun` island (Task 14), `Layout`/`Footer`/`GameSwitcher`/`LikeButton` components, `getLikeCounts`/`getMemberLikedSet` (`src/lib/wix/gameLikes.ts`), `getSessionMember` (`src/lib/wix/members.ts`).
- Produces: live `/games/overrun`; the home-page cabinet + game switcher pick Overrun up automatically from the registry.

- [ ] **Step 1: Write `src/pages/games/overrun.astro`** — mirror `src/pages/games/arena.astro` exactly, minus the avatar SSR block (Overrun has no in-game avatars in the slice):

```astro
---
import Footer from "../../components/layout/footer.astro";
import Layout from "../../components/layout/layout.astro";
import Overrun from "../../components/game/overrun/Overrun.tsx";
import GameSwitcher from "../../components/games/GameSwitcher.astro";
import LikeButton from "../../components/games/LikeButton.astro";
import { getLikeCounts, getMemberLikedSet } from "../../lib/wix/gameLikes";
import { getSessionMember } from "../../lib/wix/members";

const member = await getSessionMember();
const likeCounts = await getLikeCounts(["overrun"]);
const liked = member ? (await getMemberLikedSet(member.id)).has("overrun") : false;

const controls = [
  { keys: "WASD / arrows", action: "Move your soldier" },
  { keys: "Mouse", action: "Aim — hold left button to fire" },
  { keys: "R", action: "Reload" },
  { keys: "1 / 2 / 3", action: "Pick a level-up perk" },
];
---

<Layout
  title="Overrun — TeamBuild Games"
  description="Co-op horde shooter for 1–8 players. Hold the field, scavenge guns, revive your teammates — the waves don't stop."
>
  <div class="mx-auto w-full max-w-4xl px-4 py-10">
    <div class="mb-8">
      <a href="/" class="font-display text-[9px] text-neutral-500 hover:text-cyan-300">
        &lt; Back to the arcade
      </a>
      <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 class="neon font-display text-2xl text-red-400 sm:text-3xl">Overrun</h1>
        <div class="flex flex-wrap items-center gap-2 font-display text-[8px]">
          <span class="border border-red-400/40 px-2 py-1 text-red-300">Co-op horde</span>
          <span class="border border-white/15 px-2 py-1 text-neutral-400">1–8 players</span>
          <span class="border border-amber-400/40 px-2 py-1 text-amber-300">Endless waves</span>
          <LikeButton gameId="overrun" count={likeCounts.overrun ?? 0} liked={liked} authed={!!member} />
        </div>
      </div>
      <p class="mt-3 max-w-2xl text-neutral-400">
        The horde pours in from every edge. Kite, scavenge dropped guns, pick your
        level-up perks without stopping, and keep your teammates on their feet —
        when the whole party is down, it's over.
      </p>
    </div>

    <div class="mb-6"><GameSwitcher slug="overrun" /></div>

    <div class="rounded-2xl border border-red-400/25 bg-night-900 p-3 shadow-[0_0_48px_rgb(239_68_68/0.12)] sm:p-4">
      <Overrun client:only="react" />
    </div>

    <section class="mt-8 rounded-xl border border-white/10 bg-night-900 p-6">
      <h2 class="eyebrow text-emerald-400">Controls</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        {
          controls.map((c) => (
            <div class="flex items-center gap-3">
              <dt class="shrink-0 rounded border border-white/20 bg-night-800 px-2.5 py-1.5 font-display text-[9px] text-neutral-200">
                {c.keys}
              </dt>
              <dd class="text-sm text-neutral-400">{c.action}</dd>
            </div>
          ))
        }
      </dl>
      <p class="mt-5 text-xs leading-relaxed text-neutral-500">
        Co-op tip: everyone starts with a pistol — better guns drop from kills.
        Downed teammates revive when you stand next to them, and everyone gets
        back up between waves. The run ends when the whole party is down.
      </p>
    </section>
  </div>
  <Footer />
</Layout>
```

- [ ] **Step 2: Modify `src/lib/games/registry.ts`** — replace the whole `tactics` object (slug/name/kind/players/blurb/href/status/chip) with:

```ts
  {
    slug: "overrun",
    name: "Overrun",
    kind: "Co-op horde shooter",
    players: "1–8 players",
    blurb:
      "The waves don't stop. Scavenge guns, pick perks on the run, and keep your team standing — Crimsonland energy, office-friendly rounds.",
    href: "/games/overrun",
    status: "live",
    chip: "border-red-400/40 text-red-300",
  },
```

(The roadmap decision: the Tactics card slot is reclaimed; Tactics returns later as its own future game.)

- [ ] **Step 3: Modify `src/lib/members/games.ts`** — add to `GAMES`:

```ts
  { id: "overrun", name: "Overrun", accent: "from-red-500/20 to-amber-500/20" },
```

- [ ] **Step 4: Verify build + tests**

Run: `npx tsc --noEmit && npx vitest run && npm run build`
Expected: clean typecheck, all tests green, production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/pages/games/overrun.astro src/lib/games/registry.ts src/lib/members/games.ts
git commit -m "feat(overrun): /games/overrun page + arcade card (replaces Tactics slot) + member-games entry"
```

---

### Task 16: Verification, live playtest, ROADMAP update

**Files:**
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Full verification battery**

```bash
npx vitest run          # ALL tests green — expect ≈220+ (151 baseline + ~70 new; more if squid landed)
npx tsc --noEmit        # clean
npm run build           # production build green
```

- [ ] **Step 2: Live smoke test** (headless can't drive WebRTC/Phaser — do a real browser pass): `npm run dev`, open `/games/overrun`; verify: lobby renders + room link; Start → countdown → soldiers on the field; WASD/mouse/fire/tracers; enemies crawl in from the edges and chase; kills drop pickups occasionally; XP bar fills → perk cards appear → 1/2/3 picks work without pausing; getting swarmed downs you (solo → run ends); end screen shows wave/kills/accuracy/level + the "Print this run on a tee" link lands on `/shop/tee?title=OVERRUN…`. Open the room link in a second browser: second soldier appears, movement/fire visibly smooth (interpolation), revive works. Note any balance pain (wave 1 too hard/easy, drop starvation) — tune constants, rerun `npx vitest run` (budget tests may pin totals — update them WITH the constant change if a cap changed).

- [ ] **Step 3: Update `docs/ROADMAP.md`:**
  - In **Track D**, under the Track D heading add a status line: `Status: **thin vertical slice SHIPPED (2026-XX-XX)** — pistol/shotgun/rifle, rusher+tank, endless waves, drops+medkits, downed/revive, XP+perk picks (non-blocking overlay), stats→merch scorecard, quantized keyframe/delta @10 Hz over a generic SyncEngine. Decoupled from Track A (P-A0 absorbed as game-agnostic net infra). Widen-later: campaign, 6 more guns, 3 more enemy kinds, sprite atlases (Track E), Track B persistence.`
  - Check off the P-D0…P-D6 bullets that the slice actually delivered (leave campaign/extra-guns/extra-enemies bullets unchecked with a `(slice: deferred)` note).
  - Under **Open decisions (Overrun)** record: weapon inventory = single active + infinite pistol (DECIDED, shipped); session generalization = generic `SyncAdapter` (DECIDED, shipped — shared with squid if present); NEW decisions: perks = global pool now / class-scoped later via `tags` (DECIDED 2026-07-09), perk-pick UX = non-blocking overlay (DECIDED 2026-07-09), run structure = endless-only slice (campaign later), stats→merch via existing print funnel (DECIDED 2026-07-09).
  - Add a **Progress log** entry (top, dated, matching the log's voice): Overrun slice shipped — module map, the SyncEngine generalization + cadence/delta extension, byte-budget numbers from the codec test, test count, playtest tuning notes, and that Survival now depends on the SAME shipped substrate (P-A0 no longer blocks on Track A).
- [ ] **Step 4: Final commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs(roadmap): Overrun thin slice shipped — Track D status, decisions, progress log"
```

---

## Execution notes

- **Task order is strict** for 1→12 (each consumes the previous). Tasks 13–14 depend on 12; Task 15 on 14; Task 16 last.
- **If the squid plan is being executed concurrently**, land its Task 8 (or this plan's Task 10 Branch A) FIRST in whichever plan runs first — the two plans' `sync.ts` edits are designed to compose (this plan's Task 10 is a superset).
- **Balance numbers are start values** (`constants.ts`, `weapons.ts`, `enemies.ts`, `waves.ts`) — expect to tune in the Task 16 playtest; keep tests parameterized off the constants (they already are) so tuning doesn't churn tests.

## Plan self-review checklist (done at write time)

- **Spec coverage:** slice scope ✔ (T1–T15), P-A0 substrate ✔ (T9–T11), XP/perks + non-blocking picks ✔ (T3, T8, T13–T14), health pickups ✔ (T7–T8), stats→merch ✔ (T7, T14), downed/revive + revive-before-wipe ✔ (T8), no-friendly-fire structural ✔ (T5), determinism + purity guard ✔ (T8), byte budget ✔ (T9), 8-peer/migration/client-never-spawns e2e ✔ (T12), interpolation ✔ (T11–T12), procedural art ✔ (T13), index card swap ✔ (T15), ROADMAP follow-up ✔ (T16).
- **Type consistency:** `ShooterIntent.perkPick: 0|1|2|null`, `offers: PerkOffer[]` with `choices` tuple, `AmmoState{mag,reserve,reloadRemaining,fireCooldown}`, `stepShooter(world, intents, dt)`, `SyncAdapter.encodeSnapshot(world, prevSent): string | null`, `decodeMessage → input|snapshot|update`, `QWorld`/`ODelta` field names match between qWorld/diffWorld/applyDelta, `OverrunSession.frame(dt, RawShooterInput)`.
- **No placeholders:** every code step has complete code or an exact mirror instruction pointing at a specific existing file read in Step 1 of that task.
