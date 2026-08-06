# Squid Game (co-op octopus walker) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship "Squid" — a second playable game where 1–8 players cooperatively walk an octopus 5 m to an arched finish line by each controlling one leg at a time, with two stages (flat / 0.5 m hole at 3 m), timed rounds, and a persistent per-stage team-highscore dashboard in the waiting room.

**Architecture:** Pure deterministic verlet-physics sim core in `src/game/squid/` (no clock/RNG/engine imports; `dt` injected; fixed solver iterations), synced by the existing host-authoritative P2P stack (`SyncEngine` gets a light generic parameterization by world type; the arena path stays behaviorally unchanged). A forked `SquidSession` reuses the lobby/roster/hello machinery. Phaser side-view renderer + React island mirror `Arena.tsx`. Scores persist via trusted Astro API routes writing a single top-10 document per stage in a `GameScores` Wix Data collection (deterministic row id, elevated get/save — the same pattern as `playerAvatars.ts`, deliberately avoiding query builders which don't compose with `auth.elevate`).

**Tech Stack:** TypeScript (strict), Astro 5.8 + `@wix/astro` (vite pinned 6.4.3), React islands, Phaser 4, Trystero WebRTC, `@wix/data` + `@wix/essentials` elevated writes, vitest.

**Spec:** `docs/superpowers/specs/2026-07-09-squid-game-design.md` (approved 2026-07-09).

## Global Constraints

- **No clocks, `Math.random()`, DOM, Phaser, or network imports inside `src/game/squid/` core files** (render/ subdir is the only impure adapter). `dt` is injected. Fixed `SOLVER_ITERATIONS`/`SUBSTEPS` so stepping is byte-deterministic.
- World units are **meters**; course length **5 m**; finish at **x ≥ 5**; stage 2 hole spans **3.0–3.5 m**; head drop ⇒ round failed (stage 2 only, emergent — ground just has no support there).
- Tick rate **20 Hz** (`TICK_HZ` from `src/game/constants.ts`); `timeMs = elapsedTicks / TICK_HZ * 1000`.
- **8 legs** always; one player holds at most one leg; enforced host-side, never trusted from the wire.
- All existing tests must stay green after every task (`npx vitest run` — 151 tests at plan time). New deps: **none**.
- Score sanity bounds (server-side): `3000 ≤ timeMs ≤ 1_800_000`, stage allowlisted, 1–8 names, each ≤ 24 chars.
- Commit after every task with a conventional message. Run `npx tsc --noEmit` before each commit.
- Working directory: `/Users/kyryloi/wix/wix-headless-masterclass/team-build-games`.

## File Structure (all new unless marked Modify)

```
src/game/squid/constants.ts        tuning constants (course, physics, motor speeds, fail depth)
src/game/squid/types.ts            SquidWorld, Leg, VPoint, DistCon, SquidIntent, RawSquidInput, StageId
src/game/squid/stage.ts            STAGES data + groundYAt + coerceStageId
src/game/squid/verlet.ts           integrate + solve (constraints, pins, ground)
src/game/squid/octopus.ts          rig builder (points, legs, constraints)
src/game/squid/control.ts          leg-claim reducer (grab/cycle/release)
src/game/squid/intent.ts           RawSquidInput→SquidIntent (edge memory) + coerceSquidIntent
src/game/squid/sim.ts              stepSquid (motors → verlet → plant → fail/finish)
src/game/squid/match.ts            createSquidWorld + timeMsOf
src/game/squid/net/adapter.ts      SyncAdapter<SquidWorld, SquidIntent>
src/game/squid/net/session.ts      SquidSession (roster/hello/start/kick + generic SyncEngine)
src/game/squid/render/contract.ts  SquidDriver, SquidHudState, SquidEvent
src/game/squid/render/scene.ts     Phaser side-view scene (impure adapter)
src/game/net/protocol.ts           Modify: + squidStart/squidInput/squidSnapshot messages
src/game/net/sync.ts               Modify: SyncEngine<W, I> generic via SyncAdapter
src/game/net/session.ts            Modify: arena Session passes the arena adapter
src/lib/squid/scores.ts            pure top-10 merge + result validation
src/pages/api/squid-result.ts      trusted POST (host reports a finished round)
src/pages/api/squid-scores.ts      GET top-10 per stage
src/lib/members/games.ts           Modify: + squid registry entry
src/components/game/Squid.tsx      React island phase shell
src/components/game/lobby/SquidWarmupRoom.tsx  lobby: stage select + highscore dashboard
src/pages/games/squid.astro        page (mirror arena.astro)
src/pages/index.astro              Modify: + Squid cabinet card
docs/ROADMAP.md                    Modify: progress log entry (final task)
```

Colocated tests: `constants` has none; every other core file gets `<name>.test.ts` next to it.

---

### Task 1: Squid constants + stage definitions

**Files:**
- Create: `src/game/squid/constants.ts`
- Create: `src/game/squid/stage.ts`
- Test: `src/game/squid/stage.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: every constant below (later tasks import them by these exact names); `type StageId = "stage1" | "stage2"` (exported from stage.ts for now — Task 4's types.ts re-exports it); `STAGES: StageDef[]`, `stageById(id: StageId): StageDef`, `groundYAt(x: number, stage: StageDef): number | null`, `coerceStageId(raw: unknown): StageId`.

- [ ] **Step 1: Write the failing test**

```ts
// src/game/squid/stage.test.ts
import { describe, expect, it } from "vitest";
import { coerceStageId, groundYAt, STAGES, stageById } from "./stage";

describe("stage", () => {
  it("defines exactly two stages with the spec'd geometry", () => {
    expect(STAGES.map((s) => s.id)).toEqual(["stage1", "stage2"]);
    expect(stageById("stage1").hole).toBeNull();
    expect(stageById("stage2").hole).toEqual({ x: 3, width: 0.5 });
  });

  it("stage1 ground is solid everywhere on the course", () => {
    const s = stageById("stage1");
    for (const x of [0, 2.9, 3.2, 3.5, 5]) expect(groundYAt(x, s)).toBe(0);
  });

  it("stage2 ground has no support only inside the 3.0–3.5 m hole", () => {
    const s = stageById("stage2");
    expect(groundYAt(2.99, s)).toBe(0);
    expect(groundYAt(3.0, s)).toBeNull();
    expect(groundYAt(3.25, s)).toBeNull();
    expect(groundYAt(3.5, s)).toBeNull();
    expect(groundYAt(3.51, s)).toBe(0);
  });

  it("coerceStageId falls back to stage1 on garbage", () => {
    expect(coerceStageId("stage2")).toBe("stage2");
    expect(coerceStageId("nope")).toBe("stage1");
    expect(coerceStageId(42)).toBe("stage1");
    expect(coerceStageId(undefined)).toBe("stage1");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/squid/stage.test.ts`
Expected: FAIL — `Cannot find module './stage'` (or equivalent resolve error).

- [ ] **Step 3: Write the implementation**

```ts
// src/game/squid/constants.ts
/**
 * Squid tuning constants. The world is modelled in METERS with y UP (ground = 0);
 * the renderer flips/scales to pixels. All physics numbers are here so playtest
 * tuning never touches sim code.
 */

/** Course length; the arched finish line stands at this x. */
export const COURSE_M = 5;
export const FINISH_X_M = COURSE_M;

export const LEG_COUNT = 8;
/** Each leg is 3 verlet segments of this length (total reach ~1.35 m). */
export const LEG_SEGMENT_M = 0.45;
/** Head hub spawn position. */
export const HEAD_START_X_M = 0.6;
export const BODY_HEIGHT_M = 1.1;
/** Head visual/collision radius (small enough to fit the 0.5 m hole). */
export const HEAD_R_M = 0.35;

// --- physics ---
export const GRAVITY_MPS2 = 9;
/** Constraint relaxation iterations per substep — FIXED for determinism. */
export const SOLVER_ITERATIONS = 8;
/** Physics substeps per sim tick — FIXED for determinism. */
export const SUBSTEPS = 2;
/** Verlet velocity damping per integration step (1 = none). */
export const DAMPING = 0.99;
/** Fraction of horizontal velocity removed while a point touches ground. */
export const GROUND_FRICTION = 0.7;
/** Tip within this height of ground counts as touching (plants). */
export const PLANT_EPS_M = 0.03;

// --- leg motors (per-second speeds, scaled by dt) ---
/** Horizontal push on a planted leg's upper points — this is what propels the body. */
export const SWING_PLANTED_MPS = 2.2;
/** Horizontal tip speed for a lifted (in-air) leg repositioning itself. */
export const SWING_LIFTED_MPS = 3.5;
/** Upward tip speed while the lift key is held. */
export const LIFT_MPS = 2.5;
/** A lifted tip may not rise above this height. */
export const LIFT_MAX_Y_M = 0.9;

/** Head center below -this ⇒ round failed (only reachable over the hole). */
export const HEAD_DROP_FAIL_M = 0.5;
/** Points may not leave the course strip horizontally. */
export const X_MIN_M = -1;
export const X_MAX_M = COURSE_M + 2;

// --- rendering ---
export const SQUID_PX_PER_M = 110;

// --- score sanity bounds (shared by client + server validation) ---
export const MIN_SCORE_MS = 3000;
export const MAX_SCORE_MS = 30 * 60 * 1000;
```

```ts
// src/game/squid/stage.ts
/** Data-only stage definitions. Ground is y=0 everywhere except inside a hole (no support). */

export type StageId = "stage1" | "stage2";

export interface StageDef {
  id: StageId;
  name: string;
  /** Horizontal span with no ground support, or null for a solid course. */
  hole: { x: number; width: number } | null;
}

export const STAGES: StageDef[] = [
  { id: "stage1", name: "Boardwalk", hole: null },
  { id: "stage2", name: "The Gap", hole: { x: 3, width: 0.5 } },
];

export function stageById(id: StageId): StageDef {
  return STAGES.find((s) => s.id === id) ?? STAGES[0]!;
}

/** Ground height at x, or null where there is no support (inside the hole). */
export function groundYAt(x: number, stage: StageDef): number | null {
  const h = stage.hole;
  if (h && x >= h.x && x <= h.x + h.width) return null;
  return 0;
}

/** Wire/UI trust boundary: narrow an untrusted value to a known stage id. */
export function coerceStageId(raw: unknown): StageId {
  return STAGES.some((s) => s.id === raw) ? (raw as StageId) : "stage1";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/squid/stage.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/constants.ts src/game/squid/stage.ts src/game/squid/stage.test.ts
git commit -m "feat(squid): constants + stage definitions (flat 5m / 0.5m hole at 3m)"
```

---

### Task 2: Verlet physics core

**Files:**
- Create: `src/game/squid/types.ts`
- Create: `src/game/squid/verlet.ts`
- Test: `src/game/squid/verlet.test.ts`

**Interfaces:**
- Consumes: constants from Task 1; `Vec2` and `PlayerId` from `src/game/arena/types.ts` (already exported there).
- Produces: all types below verbatim, plus `integrate(points: VPoint[], dt: number): VPoint[]` and `solve(points: VPoint[], constraints: DistCon[], pinned: boolean[], groundAt: (x: number) => number | null): VPoint[]` — both pure (return new arrays, never mutate inputs).

- [ ] **Step 1: Write types.ts** (no test of its own — it's consumed by every later test)

```ts
// src/game/squid/types.ts
/** Pure squid sim types. No engine/net/DOM imports — mirrors the arena core's discipline. */

import type { PlayerId, Vec2 } from "../arena/types";
import type { StageId } from "./stage";

export type { PlayerId, Vec2 };
export type { StageId };

/** A verlet point: position + previous position (velocity is pos - prev). */
export interface VPoint {
  pos: Vec2;
  prev: Vec2;
}

/** Distance constraint between point indices a and b. */
export interface DistCon {
  a: number;
  b: number;
  len: number;
}

/** One octopus leg: indices into world.points, [root, mid, tip] (root nearest the head). */
export interface Leg {
  pts: [number, number, number];
  /** Tip pinned to the ground (provides support + propulsion leverage). */
  planted: boolean;
  /** Lift key held — tip raised and unpinned. */
  lifted: boolean;
}

export type SquidPhase = "playing" | "ended";
export type RoundResult = "finished" | "failed" | null;

export interface SquidWorld {
  phase: SquidPhase;
  tick: number;
  stage: StageId;
  /** [0] = head hub; then legs' points in leg order (root, mid, tip per leg). */
  points: VPoint[];
  legs: Leg[];
  /** Controlling player per leg index (null = unheld). */
  control: (PlayerId | null)[];
  /** Sorted participant ids (deterministic intent iteration + meta lookups). */
  playerIds: PlayerId[];
  /** Ticks spent in "playing" before a result was set. */
  elapsedTicks: number;
  result: RoundResult;
}

/** What a player may express per tick (sanitized by coerceSquidIntent on the host). */
export interface SquidIntent {
  swing: -1 | 0 | 1;
  lift: boolean;
  /** Edge-triggered: release current leg, claim the next unheld one. */
  cycle: boolean;
  /** Edge-triggered: claim this leg index (from clicking a leg). */
  grabLeg?: number;
}

/** Raw per-frame input from the renderer (keyboard + pointer). */
export interface RawSquidInput {
  left: boolean;
  right: boolean;
  lift: boolean;
  cycle: boolean;
  grabLeg: number | null;
}
```

- [ ] **Step 2: Write the failing verlet test**

```ts
// src/game/squid/verlet.test.ts
import { describe, expect, it } from "vitest";
import { integrate, solve } from "./verlet";
import type { DistCon, VPoint } from "./types";

const p = (x: number, y: number, vx = 0, vy = 0): VPoint => ({
  pos: { x, y },
  prev: { x: x - vx, y: y - vy },
});

describe("integrate", () => {
  it("applies gravity: a resting point accelerates downward", () => {
    const [a] = integrate([p(0, 5)], 0.05);
    expect(a!.pos.y).toBeLessThan(5);
    expect(a!.pos.x).toBe(0);
  });

  it("preserves inertia (verlet): a moving point keeps moving", () => {
    const [a] = integrate([p(0, 5, 0.1, 0)], 0.05);
    expect(a!.pos.x).toBeGreaterThan(0.09); // ~0.1 minus damping
  });

  it("is pure: input points are not mutated", () => {
    const input = [p(0, 5)];
    integrate(input, 0.05);
    expect(input[0]!.pos).toEqual({ x: 0, y: 5 });
  });
});

describe("solve", () => {
  const flat = () => 0 as number | null;

  it("enforces a distance constraint between two free points", () => {
    const pts = [p(0, 1), p(2, 1)]; // 2 m apart, constrained to 1 m
    const con: DistCon[] = [{ a: 0, b: 1, len: 1 }];
    const out = solve(pts, con, [false, false], flat);
    const d = Math.hypot(out[0]!.pos.x - out[1]!.pos.x, out[0]!.pos.y - out[1]!.pos.y);
    expect(d).toBeCloseTo(1, 2);
  });

  it("a pinned point does not move; its partner takes the full correction", () => {
    const pts = [p(0, 1), p(2, 1)];
    const con: DistCon[] = [{ a: 0, b: 1, len: 1 }];
    const out = solve(pts, con, [true, false], flat);
    expect(out[0]!.pos).toEqual({ x: 0, y: 1 });
    expect(Math.hypot(out[1]!.pos.x, out[1]!.pos.y - 1)).toBeCloseTo(1, 2);
  });

  it("clamps points to the ground where support exists", () => {
    const out = solve([p(1, -0.4)], [], [false], flat);
    expect(out[0]!.pos.y).toBe(0);
  });

  it("lets points fall where groundAt returns null (the hole)", () => {
    const out = solve([p(1, -0.4)], [], [false], () => null);
    expect(out[0]!.pos.y).toBe(-0.4);
  });

  it("is deterministic: same inputs stepped twice give deep-equal results", () => {
    const pts = [p(0, 2, 0.05, 0), p(0.45, 2), p(0.9, 1.5)];
    const con: DistCon[] = [
      { a: 0, b: 1, len: 0.45 },
      { a: 1, b: 2, len: 0.45 },
    ];
    const run = () => solve(integrate(pts, 0.05), con, [false, false, true], flat);
    expect(run()).toEqual(run());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/game/squid/verlet.test.ts`
Expected: FAIL — cannot find module './verlet'.

- [ ] **Step 4: Write the implementation**

```ts
// src/game/squid/verlet.ts
/**
 * Minimal fixed-iteration verlet solver — the squid's whole physics engine.
 * Pure: both entry points clone their inputs and return new arrays. Determinism
 * comes from fixed iteration counts and fixed array order (no RNG, no clock).
 */

import { DAMPING, GRAVITY_MPS2, GROUND_FRICTION, SOLVER_ITERATIONS, X_MAX_M, X_MIN_M } from "./constants";
import type { DistCon, VPoint } from "./types";

const clone = (points: VPoint[]): VPoint[] =>
  points.map((p) => ({ pos: { ...p.pos }, prev: { ...p.prev } }));

/** Verlet integration: inertia + gravity + damping. Pure. */
export function integrate(points: VPoint[], dt: number): VPoint[] {
  return points.map((p) => {
    const vx = (p.pos.x - p.prev.x) * DAMPING;
    const vy = (p.pos.y - p.prev.y) * DAMPING;
    return {
      prev: { ...p.pos },
      pos: { x: p.pos.x + vx, y: p.pos.y + vy - GRAVITY_MPS2 * dt * dt },
    };
  });
}

/**
 * Relax distance constraints (SOLVER_ITERATIONS passes) with pinned points immovable,
 * colliding against the ground profile after each pass. Pure.
 */
export function solve(
  points: VPoint[],
  constraints: DistCon[],
  pinned: boolean[],
  groundAt: (x: number) => number | null,
): VPoint[] {
  const pts = clone(points);

  for (let it = 0; it < SOLVER_ITERATIONS; it++) {
    for (const c of constraints) {
      const a = pts[c.a]!;
      const b = pts[c.b]!;
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy) || 1e-9;
      const diff = (d - c.len) / d;
      const aPin = pinned[c.a] === true;
      const bPin = pinned[c.b] === true;
      if (aPin && bPin) continue;
      const wa = aPin ? 0 : bPin ? 1 : 0.5;
      const wb = aPin ? 1 : bPin ? 0 : 0.5;
      a.pos.x += dx * diff * wa;
      a.pos.y += dy * diff * wa;
      b.pos.x -= dx * diff * wb;
      b.pos.y -= dy * diff * wb;
    }

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      p.pos.x = Math.min(X_MAX_M, Math.max(X_MIN_M, p.pos.x));
      const g = groundAt(p.pos.x);
      if (g !== null && p.pos.y < g) {
        p.pos.y = g;
        // ground friction: bleed horizontal velocity while touching
        p.prev.x = p.pos.x - (p.pos.x - p.prev.x) * (1 - GROUND_FRICTION);
      }
    }
  }
  return pts;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/game/squid/verlet.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 6: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/types.ts src/game/squid/verlet.ts src/game/squid/verlet.test.ts
git commit -m "feat(squid): pure verlet core (integrate + pinned constraint solve + ground)"
```

---

### Task 3: Octopus rig builder

**Files:**
- Create: `src/game/squid/octopus.ts`
- Test: `src/game/squid/octopus.test.ts`

**Interfaces:**
- Consumes: `VPoint`, `Leg`, `DistCon` from Task 2; constants from Task 1.
- Produces: `HEAD = 0` (head point index), `POINT_COUNT = 1 + LEG_COUNT * 3`, `buildPoints(): VPoint[]`, `buildLegs(): Leg[]`, `RIG_CONSTRAINTS: DistCon[]` (module const — constraints are static rig topology and deliberately NOT part of `SquidWorld`/snapshots).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/squid/octopus.test.ts
import { describe, expect, it } from "vitest";
import { buildLegs, buildPoints, HEAD, POINT_COUNT, RIG_CONSTRAINTS } from "./octopus";
import { BODY_HEIGHT_M, HEAD_START_X_M, LEG_COUNT, LEG_SEGMENT_M } from "./constants";

describe("octopus rig", () => {
  it("has a head hub plus 3 points per leg", () => {
    expect(buildPoints()).toHaveLength(POINT_COUNT);
    expect(POINT_COUNT).toBe(1 + LEG_COUNT * 3);
  });

  it("spawns the head at the start position, at rest", () => {
    const head = buildPoints()[HEAD]!;
    expect(head.pos).toEqual({ x: HEAD_START_X_M, y: BODY_HEIGHT_M });
    expect(head.prev).toEqual(head.pos);
  });

  it("gives every leg 3 valid, unique point indices with grounded planted tips", () => {
    const legs = buildLegs();
    const pts = buildPoints();
    expect(legs).toHaveLength(LEG_COUNT);
    const seen = new Set<number>();
    for (const leg of legs) {
      for (const i of leg.pts) {
        expect(i).toBeGreaterThan(HEAD);
        expect(i).toBeLessThan(POINT_COUNT);
        expect(seen.has(i)).toBe(false);
        seen.add(i);
      }
      expect(leg.planted).toBe(true);
      expect(leg.lifted).toBe(false);
      expect(pts[leg.pts[2]]!.pos.y).toBe(0); // tip starts on the ground
    }
  });

  it("chains constraints head→root→mid→tip per leg at segment length", () => {
    expect(RIG_CONSTRAINTS).toHaveLength(LEG_COUNT * 3);
    for (const c of RIG_CONSTRAINTS) expect(c.len).toBe(LEG_SEGMENT_M);
    const headCons = RIG_CONSTRAINTS.filter((c) => c.a === HEAD);
    expect(headCons).toHaveLength(LEG_COUNT);
  });

  it("fans the tips across the head so the stance is stable (some ahead, some behind)", () => {
    const pts = buildPoints();
    const tips = buildLegs().map((l) => pts[l.pts[2]]!.pos.x);
    expect(Math.min(...tips)).toBeLessThan(HEAD_START_X_M);
    expect(Math.max(...tips)).toBeGreaterThan(HEAD_START_X_M);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/squid/octopus.test.ts`
Expected: FAIL — cannot find module './octopus'.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/squid/octopus.ts
/**
 * Octopus rig: one head hub point + LEG_COUNT legs of 3 chained points each.
 * Constraint topology is static and deterministic, so it is a module const and
 * never rides the wire — snapshots only carry point positions + leg state.
 */

import { BODY_HEIGHT_M, HEAD_START_X_M, LEG_COUNT, LEG_SEGMENT_M } from "./constants";
import type { DistCon, Leg, VPoint } from "./types";

export const HEAD = 0;
export const POINT_COUNT = 1 + LEG_COUNT * 3;

const at = (x: number, y: number): VPoint => ({ pos: { x, y }, prev: { x, y } });

/** Leg k's point indices: root/mid/tip. */
const legPts = (k: number): [number, number, number] => [1 + k * 3, 2 + k * 3, 3 + k * 3];

/** Tip x-offset from the head for leg k: fanned from -0.9 m (behind) to +0.9 m (ahead). */
const tipOffset = (k: number): number => ((k - (LEG_COUNT - 1) / 2) / ((LEG_COUNT - 1) / 2)) * 0.9;

export function buildPoints(): VPoint[] {
  const pts: VPoint[] = [at(HEAD_START_X_M, BODY_HEIGHT_M)];
  for (let k = 0; k < LEG_COUNT; k++) {
    const tipX = HEAD_START_X_M + tipOffset(k);
    // root/mid/tip interpolated from head to tip; the solver settles exact lengths in a few ticks
    for (const f of [1 / 3, 2 / 3, 1]) {
      pts.push(at(HEAD_START_X_M + (tipX - HEAD_START_X_M) * f, BODY_HEIGHT_M * (1 - f)));
    }
  }
  return pts;
}

export function buildLegs(): Leg[] {
  return Array.from({ length: LEG_COUNT }, (_, k) => ({
    pts: legPts(k),
    planted: true,
    lifted: false,
  }));
}

export const RIG_CONSTRAINTS: DistCon[] = Array.from({ length: LEG_COUNT }, (_, k) => {
  const [root, mid, tip] = legPts(k);
  return [
    { a: HEAD, b: root, len: LEG_SEGMENT_M },
    { a: root, b: mid, len: LEG_SEGMENT_M },
    { a: mid, b: tip, len: LEG_SEGMENT_M },
  ];
}).flat();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/squid/octopus.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/octopus.ts src/game/squid/octopus.test.ts
git commit -m "feat(squid): octopus rig builder (head hub + 8 three-segment legs)"
```

---

### Task 4: Leg-control reducer

**Files:**
- Create: `src/game/squid/control.ts`
- Test: `src/game/squid/control.test.ts`

**Interfaces:**
- Consumes: `PlayerId` from Task 2's types; `LEG_COUNT` from constants.
- Produces: `claimLeg(control: (PlayerId | null)[], playerId: PlayerId, leg: number): (PlayerId | null)[]`, `cycleLeg(control, playerId): (PlayerId | null)[]`, `releasePlayer(control, playerId): (PlayerId | null)[]`, `legOf(control, playerId): number | null`, `emptyControl(): (PlayerId | null)[]`. All pure (return new arrays or the same array when nothing changed).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/squid/control.test.ts
import { describe, expect, it } from "vitest";
import { claimLeg, cycleLeg, emptyControl, legOf, releasePlayer } from "./control";
import { LEG_COUNT } from "./constants";

describe("leg control", () => {
  it("starts with every leg unheld", () => {
    expect(emptyControl()).toEqual(Array(LEG_COUNT).fill(null));
  });

  it("claims an unheld leg and releases the player's previous leg", () => {
    let c = claimLeg(emptyControl(), "A", 2);
    expect(legOf(c, "A")).toBe(2);
    c = claimLeg(c, "A", 5);
    expect(legOf(c, "A")).toBe(5);
    expect(c[2]).toBeNull();
  });

  it("cannot claim a leg someone else holds", () => {
    let c = claimLeg(emptyControl(), "A", 2);
    c = claimLeg(c, "B", 2);
    expect(legOf(c, "B")).toBeNull();
    expect(legOf(c, "A")).toBe(2);
  });

  it("ignores out-of-range leg indices", () => {
    const c = emptyControl();
    expect(claimLeg(c, "A", -1)).toBe(c);
    expect(claimLeg(c, "A", LEG_COUNT)).toBe(c);
    expect(claimLeg(c, "A", 1.5)).toBe(c);
  });

  it("cycle with no current leg claims the first unheld leg", () => {
    const c = cycleLeg(claimLeg(emptyControl(), "B", 0), "A");
    expect(legOf(c, "A")).toBe(1);
  });

  it("cycle moves to the next unheld leg, skipping held ones and wrapping", () => {
    let c = emptyControl();
    c = claimLeg(c, "A", 6);
    c = claimLeg(c, "B", 7);
    c = cycleLeg(c, "A"); // 7 held by B → wraps to 0
    expect(legOf(c, "A")).toBe(0);
    expect(c[6]).toBeNull();
  });

  it("cycle when every other leg is held keeps the current leg", () => {
    let c = emptyControl();
    for (let i = 0; i < LEG_COUNT; i++) c = claimLeg(c, `P${i}`, i);
    const after = cycleLeg(c, "P3");
    expect(legOf(after, "P3")).toBe(3);
  });

  it("releasePlayer frees the player's leg", () => {
    const c = releasePlayer(claimLeg(emptyControl(), "A", 4), "A");
    expect(c[4]).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/squid/control.test.ts`
Expected: FAIL — cannot find module './control'.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/squid/control.ts
/**
 * Leg-ownership reducer: index = leg, value = controlling player (null = unheld).
 * One player holds at most one leg — every mutation goes through these reducers
 * on the HOST, so the invariant can't be violated from the wire.
 */

import { LEG_COUNT } from "./constants";
import type { PlayerId } from "./types";

export type LegControl = (PlayerId | null)[];

export const emptyControl = (): LegControl => Array(LEG_COUNT).fill(null);

export function legOf(control: LegControl, playerId: PlayerId): number | null {
  const i = control.indexOf(playerId);
  return i === -1 ? null : i;
}

export function releasePlayer(control: LegControl, playerId: PlayerId): LegControl {
  const i = control.indexOf(playerId);
  if (i === -1) return control;
  const next = [...control];
  next[i] = null;
  return next;
}

/** Claim `leg` if unheld (releasing the player's previous leg). No-op on bad index / held leg. */
export function claimLeg(control: LegControl, playerId: PlayerId, leg: number): LegControl {
  if (!Number.isInteger(leg) || leg < 0 || leg >= LEG_COUNT) return control;
  if (control[leg] !== null && control[leg] !== playerId) return control;
  const next = [...releasePlayer(control, playerId)];
  next[leg] = playerId;
  return next;
}

/** Release the current leg and claim the next unheld one (wrapping); first unheld if none. */
export function cycleLeg(control: LegControl, playerId: PlayerId): LegControl {
  const cur = legOf(control, playerId);
  const start = cur === null ? 0 : cur + 1;
  for (let step = 0; step < LEG_COUNT; step++) {
    const i = (start + step) % LEG_COUNT;
    if (control[i] === null) return claimLeg(control, playerId, i);
  }
  return control; // every other leg is held — keep the current one
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/squid/control.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/control.ts src/game/squid/control.test.ts
git commit -m "feat(squid): leg-ownership reducer (claim/cycle/release, one leg per player)"
```

---

### Task 5: Intent adapter + trust boundary

**Files:**
- Create: `src/game/squid/intent.ts`
- Test: `src/game/squid/intent.test.ts`

**Interfaces:**
- Consumes: `RawSquidInput`, `SquidIntent` from types.
- Produces: `SquidInputMemory { prevCycle: boolean }`, `initialSquidMemory(): SquidInputMemory`, `squidInputToIntent(raw: RawSquidInput, mem: SquidInputMemory): { intent: SquidIntent; memory: SquidInputMemory }`, `coerceSquidIntent(raw: unknown): SquidIntent` (the host anti-cheat boundary — mirrors `coerceIntent` in `src/game/net/protocol.ts:87`).

- [ ] **Step 1: Write the failing test**

```ts
// src/game/squid/intent.test.ts
import { describe, expect, it } from "vitest";
import { coerceSquidIntent, initialSquidMemory, squidInputToIntent } from "./intent";
import type { RawSquidInput } from "./types";

const raw = (o: Partial<RawSquidInput> = {}): RawSquidInput => ({
  left: false, right: false, lift: false, cycle: false, grabLeg: null, ...o,
});

describe("squidInputToIntent", () => {
  it("maps left/right to swing, cancelling when both held", () => {
    const m = initialSquidMemory();
    expect(squidInputToIntent(raw({ left: true }), m).intent.swing).toBe(-1);
    expect(squidInputToIntent(raw({ right: true }), m).intent.swing).toBe(1);
    expect(squidInputToIntent(raw({ left: true, right: true }), m).intent.swing).toBe(0);
  });

  it("cycle is edge-triggered: fires once per press, not per held frame", () => {
    let mem = initialSquidMemory();
    const first = squidInputToIntent(raw({ cycle: true }), mem);
    expect(first.intent.cycle).toBe(true);
    const second = squidInputToIntent(raw({ cycle: true }), first.memory);
    expect(second.intent.cycle).toBe(false);
    const released = squidInputToIntent(raw(), second.memory);
    const again = squidInputToIntent(raw({ cycle: true }), released.memory);
    expect(again.intent.cycle).toBe(true);
  });

  it("passes grabLeg through (null → undefined)", () => {
    const m = initialSquidMemory();
    expect(squidInputToIntent(raw({ grabLeg: 3 }), m).intent.grabLeg).toBe(3);
    expect(squidInputToIntent(raw(), m).intent.grabLeg).toBeUndefined();
  });
});

describe("coerceSquidIntent", () => {
  it("normalizes garbage into a safe intent", () => {
    expect(coerceSquidIntent(null)).toEqual({ swing: 0, lift: false, cycle: false, grabLeg: undefined });
    expect(coerceSquidIntent({ swing: 99, lift: 1, cycle: "yes", grabLeg: 3.7 })).toEqual({
      swing: 1, lift: true, cycle: true, grabLeg: undefined,
    });
    expect(coerceSquidIntent({ swing: -42 })).toMatchObject({ swing: -1 });
    expect(coerceSquidIntent({ grabLeg: 5 })).toMatchObject({ grabLeg: 5 });
    expect(coerceSquidIntent({ grabLeg: -1 })).toMatchObject({ grabLeg: undefined });
    expect(coerceSquidIntent({ grabLeg: 8 })).toMatchObject({ grabLeg: undefined });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/squid/intent.test.ts`
Expected: FAIL — cannot find module './intent'.

- [ ] **Step 3: Write the implementation**

```ts
// src/game/squid/intent.ts
/**
 * RawSquidInput (held keys, per render frame) → SquidIntent (per sim tick), with
 * edge detection for cycle. `coerceSquidIntent` is the host's anti-cheat boundary:
 * peers can only ever express well-formed intent bits, never leg ownership or positions.
 */

import { LEG_COUNT } from "./constants";
import type { RawSquidInput, SquidIntent } from "./types";

export interface SquidInputMemory {
  prevCycle: boolean;
}

export const initialSquidMemory = (): SquidInputMemory => ({ prevCycle: false });

export function squidInputToIntent(
  raw: RawSquidInput,
  mem: SquidInputMemory,
): { intent: SquidIntent; memory: SquidInputMemory } {
  const swing: SquidIntent["swing"] = raw.left === raw.right ? 0 : raw.left ? -1 : 1;
  return {
    intent: {
      swing,
      lift: raw.lift,
      cycle: raw.cycle && !mem.prevCycle,
      grabLeg: raw.grabLeg ?? undefined,
    },
    memory: { prevCycle: raw.cycle },
  };
}

/** Sanitize an untrusted wire intent (host trust boundary). */
export function coerceSquidIntent(raw: unknown): SquidIntent {
  const i = (raw ?? {}) as Partial<SquidIntent>;
  const swingNum = Number(i.swing);
  const swing: SquidIntent["swing"] = swingNum > 0 ? 1 : swingNum < 0 ? -1 : 0;
  const grabOk = Number.isInteger(i.grabLeg) && (i.grabLeg as number) >= 0 && (i.grabLeg as number) < LEG_COUNT;
  return {
    swing,
    lift: !!i.lift,
    cycle: !!i.cycle,
    grabLeg: grabOk ? (i.grabLeg as number) : undefined,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/squid/intent.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/intent.ts src/game/squid/intent.test.ts
git commit -m "feat(squid): intent adapter (edge-triggered cycle) + coerceSquidIntent trust boundary"
```

---

### Task 6: Sim step + match lifecycle

**Files:**
- Create: `src/game/squid/match.ts`
- Create: `src/game/squid/sim.ts`
- Test: `src/game/squid/sim.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 1–5; `TICK_HZ` from `src/game/constants.ts`.
- Produces: `createSquidWorld(stage: StageId, playerIds: PlayerId[]): SquidWorld` and `timeMsOf(world: SquidWorld): number` (match.ts); `stepSquid(world: SquidWorld, intentsById: Record<PlayerId, SquidIntent>, dt: number): SquidWorld` (sim.ts). These three are the whole core API the net/render layers use.

**Behavior contract (from the spec):**
1. Intents are applied in **sorted player-id order** (grab before cycle) — deterministic under any Record iteration order.
2. Holding lift unpins + raises the controlled leg's tip; swing moves a **lifted** tip horizontally, but pushes a **planted** leg's root+mid points horizontally — the pinned tip converts that into body displacement ("legs as base").
3. Physics: `SUBSTEPS` × (integrate → solve) with pins = planted tips.
4. Plant rule after physics: a non-lifted tip touching supported ground (≤ `PLANT_EPS_M`) plants; a lifted tip or a tip over the hole unplants.
5. Head below `-HEAD_DROP_FAIL_M` ⇒ `result: "failed"`, `phase: "ended"`. Head x ≥ `FINISH_X_M` ⇒ `result: "finished"`, `phase: "ended"`. `elapsedTicks` increments once per playing tick before the checks, so `timeMsOf` is exact.
6. After `phase === "ended"` the world is frozen (stepping returns it unchanged).

- [ ] **Step 1: Write match.ts** (trivial enough to write directly; covered by the sim tests)

```ts
// src/game/squid/match.ts
/** Round lifecycle helpers: world creation + finish-time computation. */

import { TICK_HZ } from "../constants";
import { emptyControl } from "./control";
import { buildLegs, buildPoints } from "./octopus";
import type { PlayerId, SquidWorld, StageId } from "./types";

export function createSquidWorld(stage: StageId, playerIds: PlayerId[]): SquidWorld {
  return {
    phase: "playing",
    tick: 0,
    stage,
    points: buildPoints(),
    legs: buildLegs(),
    control: emptyControl(),
    playerIds: [...playerIds].sort(),
    elapsedTicks: 0,
    result: null,
  };
}

/** The round time in ms (exact — derived from the deterministic tick count). */
export function timeMsOf(world: SquidWorld): number {
  return Math.round((world.elapsedTicks / TICK_HZ) * 1000);
}
```

- [ ] **Step 2: Write the failing sim tests**

```ts
// src/game/squid/sim.test.ts
import { describe, expect, it } from "vitest";
import { createSquidWorld, timeMsOf } from "./match";
import { stepSquid } from "./sim";
import { HEAD } from "./octopus";
import { FINISH_X_M, HEAD_DROP_FAIL_M, LEG_COUNT } from "./constants";
import type { SquidIntent, SquidWorld } from "./types";

const DT = 1 / 20;
const idle: SquidIntent = { swing: 0, lift: false, cycle: false };

/** Step n ticks with the same intents. */
const run = (w: SquidWorld, intents: Record<string, SquidIntent>, n: number): SquidWorld => {
  for (let i = 0; i < n; i++) w = stepSquid(w, intents, DT);
  return w;
};

describe("stepSquid — determinism & lifecycle", () => {
  it("is deterministic: identical runs produce deep-equal worlds", () => {
    const intents = { A: { ...idle, cycle: true } };
    const a = run(createSquidWorld("stage1", ["A"]), intents, 40);
    const b = run(createSquidWorld("stage1", ["A"]), intents, 40);
    expect(a).toEqual(b);
  });

  it("counts elapsed ticks so timeMsOf is exact", () => {
    const w = run(createSquidWorld("stage1", ["A"]), {}, 20);
    expect(w.elapsedTicks).toBe(20);
    expect(timeMsOf(w)).toBe(1000);
  });

  it("stands stable when idle (planted legs support the head)", () => {
    const w0 = createSquidWorld("stage1", ["A"]);
    const w = run(w0, { A: idle }, 60);
    expect(w.points[HEAD]!.pos.y).toBeGreaterThan(0.4);
    expect(w.result).toBeNull();
  });
});

describe("stepSquid — leg selection", () => {
  it("cycle claims a leg; grab claims a specific unheld leg", () => {
    let w = createSquidWorld("stage1", ["A", "B"]);
    w = stepSquid(w, { A: { ...idle, cycle: true }, B: { ...idle, grabLeg: 5 } }, DT);
    expect(w.control[0]).toBe("A");
    expect(w.control[5]).toBe("B");
  });

  it("resolves a grab conflict deterministically (lower sorted id wins)", () => {
    let w = createSquidWorld("stage1", ["B", "A"]);
    w = stepSquid(w, { A: { ...idle, grabLeg: 2 }, B: { ...idle, grabLeg: 2 } }, DT);
    expect(w.control[2]).toBe("A");
  });
});

describe("stepSquid — locomotion (the core mechanic)", () => {
  /** All 8 legs held by 8 players, swinging forward while planted. */
  const swarm = (swing: 1 | -1): { ids: string[]; intents: Record<string, SquidIntent> } => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, swing };
    return { ids, intents };
  };

  it("swinging planted legs propels the body forward", () => {
    const { ids, intents } = swarm(1);
    const w0 = createSquidWorld("stage1", ids);
    const x0 = w0.points[HEAD]!.pos.x;
    const w = run(w0, intents, 40); // 2 s of forward swing
    expect(w.points[HEAD]!.pos.x).toBeGreaterThan(x0 + 0.3);
  });

  it("swinging a LIFTED leg moves its tip but barely moves the body", () => {
    let w = createSquidWorld("stage1", ["A"]);
    const intents = { A: { ...idle, grabLeg: 0, lift: true, swing: 1 as const } };
    const x0 = w.points[HEAD]!.pos.x;
    const tip0 = w.points[w.legs[0]!.pts[2]]!.pos.x;
    w = run(w, intents, 20);
    expect(w.points[w.legs[0]!.pts[2]]!.pos.x).toBeGreaterThan(tip0 + 0.2);
    expect(Math.abs(w.points[HEAD]!.pos.x - x0)).toBeLessThan(0.15);
  });

  it("lifting all legs makes the body sag toward the ground", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    const w0 = createSquidWorld("stage1", ids);
    const y0 = w0.points[HEAD]!.pos.y;
    const w = run(w0, intents, 30);
    expect(w.points[HEAD]!.pos.y).toBeLessThan(y0 - 0.2);
  });
});

describe("stepSquid — fail & finish", () => {
  /** Teleport the rig so the head sits over the given x (test helper — sim never does this). */
  const rigAt = (w: SquidWorld, x: number): SquidWorld => {
    const dx = x - w.points[HEAD]!.pos.x;
    return {
      ...w,
      points: w.points.map((p) => ({
        pos: { x: p.pos.x + dx, y: p.pos.y },
        prev: { x: p.prev.x + dx, y: p.prev.y },
      })),
    };
  };

  it("stage2: head over the hole with no planted support falls in ⇒ failed", () => {
    let w = rigAt(createSquidWorld("stage2", ["A"]), 3.25);
    // unplant everything so nothing holds the body up over the gap
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, {}, 60); // gravity does the rest
    expect(w.result).toBe("failed");
    expect(w.phase).toBe("ended");
    expect(w.points[HEAD]!.pos.y).toBeLessThan(-HEAD_DROP_FAIL_M);
  });

  it("stage1 has no fail state: the same sag just rests on the ground", () => {
    let w = rigAt(createSquidWorld("stage1", ["A"]), 3.25);
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, {}, 60);
    expect(w.result).toBeNull();
  });

  it("head crossing the finish arch ends the round with the exact time", () => {
    let w = rigAt(createSquidWorld("stage1", ["A"]), FINISH_X_M - 0.05);
    w = { ...w, elapsedTicks: 100 };
    // nudge the head over the line
    const pts = w.points.map((p, i) =>
      i === HEAD ? { pos: { x: FINISH_X_M + 0.01, y: p.pos.y }, prev: p.prev } : p,
    );
    w = stepSquid({ ...w, points: pts }, {}, DT);
    expect(w.result).toBe("finished");
    expect(w.phase).toBe("ended");
    expect(timeMsOf(w)).toBe(Math.round(((100 + 1) / 20) * 1000));
  });

  it("an ended world is frozen", () => {
    let w = createSquidWorld("stage1", ["A"]);
    w = { ...w, phase: "ended", result: "finished" };
    expect(stepSquid(w, { A: { ...idle, swing: 1 } }, DT)).toBe(w);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/game/squid/sim.test.ts`
Expected: FAIL — cannot find module './sim'.

- [ ] **Step 4: Write the implementation**

```ts
// src/game/squid/sim.ts
/**
 * stepSquid — the deterministic heart of the squid game. Pure: no clock, no RNG,
 * no engine imports; dt injected; fixed substeps/iterations. Mirrors the arena's
 * stepWorld contract so the (generic) SyncEngine can drive either game.
 */

import {
  FINISH_X_M,
  HEAD_DROP_FAIL_M,
  LIFT_MAX_Y_M,
  LIFT_MPS,
  PLANT_EPS_M,
  SUBSTEPS,
  SWING_LIFTED_MPS,
  SWING_PLANTED_MPS,
} from "./constants";
import { claimLeg, cycleLeg, legOf } from "./control";
import { HEAD, RIG_CONSTRAINTS } from "./octopus";
import { groundYAt, stageById } from "./stage";
import { integrate, solve } from "./verlet";
import type { PlayerId, SquidIntent, SquidWorld, VPoint } from "./types";

const clonePoints = (points: VPoint[]): VPoint[] =>
  points.map((p) => ({ pos: { ...p.pos }, prev: { ...p.prev } }));

export function stepSquid(
  world: SquidWorld,
  intentsById: Record<PlayerId, SquidIntent>,
  dt: number,
): SquidWorld {
  if (world.phase !== "playing" || world.result !== null) return world;

  const stage = stageById(world.stage);
  const groundAt = (x: number) => groundYAt(x, stage);

  // 1) leg selection — sorted-id iteration for determinism; grabs before cycles
  let control = world.control;
  for (const id of world.playerIds) {
    const g = intentsById[id]?.grabLeg;
    if (g !== undefined) control = claimLeg(control, id, g);
  }
  for (const id of world.playerIds) {
    if (intentsById[id]?.cycle) control = cycleLeg(control, id);
  }

  // 2) leg motors + lift state
  const points = clonePoints(world.points);
  const legs = world.legs.map((leg) => ({ ...leg }));
  for (const id of world.playerIds) {
    const intent = intentsById[id];
    const legIdx = legOf(control, id);
    if (!intent || legIdx === null) continue;
    const leg = legs[legIdx]!;
    const [root, mid, tip] = leg.pts;

    leg.lifted = intent.lift;
    if (leg.lifted) leg.planted = false;

    if (leg.lifted) {
      // raise the tip toward the body (position nudge — verlet turns it into velocity)
      const t = points[tip]!;
      t.pos.y = Math.min(LIFT_MAX_Y_M, t.pos.y + LIFT_MPS * dt);
      if (intent.swing !== 0) t.pos.x += intent.swing * SWING_LIFTED_MPS * dt;
    } else if (leg.planted && intent.swing !== 0) {
      // push the leg's upper points; the pinned tip converts this into body motion
      for (const i of [root, mid]) points[i]!.pos.x += intent.swing * SWING_PLANTED_MPS * dt;
    }
  }

  // 3) physics: substepped integrate + solve, pins = planted tips
  const pinned: boolean[] = Array(points.length).fill(false);
  for (const leg of legs) if (leg.planted) pinned[leg.pts[2]] = true;
  let pts = points;
  for (let s = 0; s < SUBSTEPS; s++) {
    pts = solve(integrate(pts, dt / SUBSTEPS), RIG_CONSTRAINTS, pinned, groundAt);
  }
  // pinned tips must not drift (integrate moves everything): restore them
  for (const leg of legs) {
    if (leg.planted) {
      const i = leg.pts[2];
      pts[i] = { pos: { ...world.points[i]!.pos }, prev: { ...world.points[i]!.pos } };
    }
  }

  // 4) plant rule
  for (const leg of legs) {
    const tip = pts[leg.pts[2]]!;
    const g = groundAt(tip.pos.x);
    if (leg.lifted || g === null) leg.planted = false;
    else if (tip.pos.y <= g + PLANT_EPS_M) leg.planted = true;
  }

  // 5) clock + fail/finish
  const elapsedTicks = world.elapsedTicks + 1;
  const head = pts[HEAD]!;
  let result = world.result;
  if (head.pos.y < -HEAD_DROP_FAIL_M) result = "failed";
  else if (head.pos.x >= FINISH_X_M) result = "finished";

  return {
    ...world,
    tick: world.tick + 1,
    points: pts,
    legs,
    control,
    elapsedTicks,
    result,
    phase: result !== null ? "ended" : "playing",
  };
}
```

**Note for the implementer:** the locomotion tests encode the *feel contract*, not exact numbers. If `swinging planted legs propels the body forward` fails on thresholds, tune `SWING_PLANTED_MPS` / `GROUND_FRICTION` / `DAMPING` in `constants.ts` — do NOT weaken the assertion directions (forward must be forward; a lifted swing must move the tip more than the head; lifting all legs must sag). If the pinned-tip restore causes visible jitter later, an acceptable alternative is marking tips pinned during `integrate` too (skip inertia+gravity for pinned indices) — keep the tests green either way. Similarly, if the stage-2 fall test doesn't trip because splayed legs prop the head just above the fail depth, lower `HEAD_DROP_FAIL_M` (e.g. to 0.35) rather than weakening the test.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/game/squid/sim.test.ts`
Expected: PASS (11 tests). Budget tuning time here — this is the heart of the game.

- [ ] **Step 6: Run the whole suite + typecheck + commit**

```bash
npx vitest run
npx tsc --noEmit
git add src/game/squid/sim.ts src/game/squid/match.ts src/game/squid/sim.test.ts
git commit -m "feat(squid): deterministic sim step (motors, verlet, plant, fail/finish) + match lifecycle"
```

---

### Task 7: Protocol — squid wire messages

**Files:**
- Modify: `src/game/net/protocol.ts` (add message variants; nothing existing changes)
- Test: `src/game/net/protocol.test.ts` (append a describe block)

**Interfaces:**
- Consumes: `SquidIntent`, `SquidWorld`, `StageId` from `../squid/types`.
- Produces: three new `NetMessage` variants and `SquidStartPlayer`, used verbatim by Tasks 8–9:

```ts
export interface SquidStartPlayer {
  id: PlayerId;
  name: string;
  iconColor: number;
  avatarUrl?: string | null;
}
// added to the NetMessage union:
| { t: "squidStart"; countdownMs: number; stage: StageId; players: SquidStartPlayer[] }
| { t: "squidInput"; tick: number; intent: SquidIntent }
| { t: "squidSnapshot"; world: SquidWorld }
```

- [ ] **Step 1: Write the failing test** — append to `src/game/net/protocol.test.ts`:

```ts
import { createSquidWorld } from "../squid/match";

describe("squid protocol messages", () => {
  it("round-trips squidStart", () => {
    const m = {
      t: "squidStart" as const,
      countdownMs: 3000,
      stage: "stage2" as const,
      players: [{ id: "A", name: "Ann", iconColor: 2, avatarUrl: null }],
    };
    expect(decode(encode(m))).toEqual(m);
  });

  it("round-trips squidInput and squidSnapshot with a real world", () => {
    const input = { t: "squidInput" as const, tick: 7, intent: { swing: 1 as const, lift: true, cycle: false } };
    expect(decode(encode(input))).toEqual(input);
    const snap = { t: "squidSnapshot" as const, world: createSquidWorld("stage1", ["A", "B"]) };
    expect(decode(encode(snap))).toEqual(snap);
  });
});
```

(Reuse the file's existing `encode`/`decode` imports; add the `createSquidWorld` import at the top.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/net/protocol.test.ts`
Expected: FAIL — TypeScript rejects the unknown `t: "squidStart"` variant (compile error in the test).

- [ ] **Step 3: Implement** — in `src/game/net/protocol.ts`: add imports and the three variants:

```ts
// add to the imports at the top
import type { SquidIntent, SquidWorld, StageId } from "../squid/types";

// add after the StartPlayer interface
/** A participant in a starting squid round (no weapons/shapes — cosmetics are color+name). */
export interface SquidStartPlayer {
  id: PlayerId;
  name: string;
  iconColor: number;
  avatarUrl?: string | null;
}
```

and extend the `NetMessage` union (before `| { t: "event"; ... }`):

```ts
  | { t: "squidStart"; countdownMs: number; stage: StageId; players: SquidStartPlayer[] }
  | { t: "squidInput"; tick: number; intent: SquidIntent }
  | { t: "squidSnapshot"; world: SquidWorld }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/game/net/protocol.test.ts`
Expected: PASS (all existing + 2 new).

- [ ] **Step 5: Full suite + typecheck + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/game/net/protocol.ts src/game/net/protocol.test.ts
git commit -m "feat(net): squid wire messages (squidStart/squidInput/squidSnapshot)"
```

---

### Task 8: SyncEngine — light generic parameterization (arena behavior unchanged)

**Files:**
- Modify: `src/game/net/sync.ts` (full rewrite below — same behavior, world-type-generic)
- Modify: `src/game/net/session.ts` (arena Session passes the arena adapter; ~3 lines)
- Modify: `src/game/net/sync.test.ts` (constructions gain `adapter: arenaSyncAdapter`)

**Interfaces:**
- Consumes: existing `Transport`, `electHostForWorld`, arena `stepWorld`/`coerceIntent`/protocol.
- Produces: `SyncAdapter<W, I>` and `SyncEngine<W, I>` (exact shapes below) + `arenaSyncAdapter: SyncAdapter<World, Intent>` — Task 9's squid adapter implements the same interface.

**Why:** the engine's logic (elect → host-step+broadcast / client-send-input) is game-agnostic; only step/coerce/wire-codec/election are arena-specific. This is the "light generic parameterization" the roadmap earmarked (Overrun open decision) — squid is the first consumer.

- [ ] **Step 1: Rewrite `src/game/net/sync.ts`**

```ts
// src/game/net/sync.ts
/**
 * Host-authoritative sync engine — one per peer, driven by explicit `tick(dt)` calls
 * (no internal timer, so it's deterministic and unit-testable under a LocalHub).
 *
 * Generic over the world/intent types: everything game-specific (step function, intent
 * trust boundary, wire codec, host election, peer-leave rule) is injected via a
 * `SyncAdapter`, so the arena and squid share this engine verbatim.
 */

import type { Intent, PlayerId, World } from "../arena/types";
import { stepWorld } from "../arena/sim";
import type { PeerId, Transport } from "./transport";
import { coerceIntent, decode, encode, worldFromSnapshot } from "./protocol";
import { electHostForWorld } from "./election";

/** Everything game-specific the engine needs. Implementations must be pure/stateless. */
export interface SyncAdapter<W, I> {
  step(world: W, intents: Record<PlayerId, I>, dt: number): W;
  /** Anti-cheat boundary: sanitize an untrusted wire intent. */
  coerceIntent(raw: unknown): I;
  encodeInput(world: W, intent: I): string;
  encodeSnapshot(world: W): string;
  /** Decode a wire message addressed to this engine; null → not ours (lobby traffic etc.). */
  decodeMessage(data: string): { kind: "input"; intent: unknown } | { kind: "snapshot"; world: W } | null;
  electHost(world: W, connected: PeerId[]): PeerId | null;
  /** Host-side: fold a departed peer into the world (arena: kill their figure; squid: release their leg). */
  onPeerLeave?(world: W, id: PeerId): W;
}

export interface SyncOptions<W, I> {
  transport: Transport;
  localId: PeerId;
  /** Initial canonical world (host seeds from it; clients hold it until the first snapshot). */
  world: W;
  adapter: SyncAdapter<W, I>;
  /** Local input for this tick (e.g. from the keyboard adapter). */
  readIntent: () => I;
  /** Called every tick with the world to render (canonical on host, latest snapshot on clients). */
  onWorld: (world: W) => void;
  /** Host only: extra intents for non-peer entities the host simulates (e.g. bots). */
  hostExtraIntents?: () => Record<PlayerId, I>;
}

export class SyncEngine<W, I> {
  private world: W;
  private hostId: PeerId | null;
  /** Host buffer: latest intent received per peer (rate-limited to one-per-tick by overwrite). */
  private inputs = new Map<PeerId, I>();

  constructor(private readonly opts: SyncOptions<W, I>) {
    this.world = opts.world;
    this.hostId = this.computeHost();
    opts.transport.onMessage((data, from) => this.onMessage(data, from));
    opts.transport.onPeerLeave((id) => this.onPeerLeave(id));
  }

  private onPeerLeave(id: PeerId): void {
    this.inputs.delete(id);
    if (this.isHost && this.opts.adapter.onPeerLeave) {
      this.world = this.opts.adapter.onPeerLeave(this.world, id);
    }
  }

  get isHost(): boolean {
    return this.hostId === this.opts.localId;
  }

  getHostId(): PeerId | null {
    return this.hostId;
  }

  getWorld(): W {
    return this.world;
  }

  /** Advance one frame: (re)elect host, then host-step + broadcast, or client send-input. */
  tick(dt: number): void {
    this.hostId = this.computeHost();
    const intent = this.opts.readIntent();

    if (this.isHost) {
      this.inputs.set(this.opts.localId, intent);
      const intents = { ...this.opts.hostExtraIntents?.(), ...Object.fromEntries(this.inputs) };
      this.world = this.opts.adapter.step(this.world, intents, dt);
      this.opts.transport.send(this.opts.adapter.encodeSnapshot(this.world));
      this.opts.onWorld(this.world);
    } else {
      this.opts.transport.send(
        this.opts.adapter.encodeInput(this.world, intent),
        this.hostId ?? undefined,
      );
      this.opts.onWorld(this.world);
    }
  }

  private onMessage(data: string, from: PeerId): void {
    const m = this.opts.adapter.decodeMessage(data);
    if (!m) return;
    if (m.kind === "input" && this.isHost) {
      this.inputs.set(from, this.opts.adapter.coerceIntent(m.intent));
    } else if (m.kind === "snapshot" && !this.isHost) {
      this.world = m.world;
    }
  }

  private computeHost(): PeerId | null {
    const connected = [this.opts.localId, ...this.opts.transport.getPeers()];
    return this.opts.adapter.electHost(this.world, connected);
  }
}

/** The arena's adapter — byte-identical wire behavior to the pre-generic engine. */
export const arenaSyncAdapter: SyncAdapter<World, Intent> = {
  step: stepWorld,
  coerceIntent,
  encodeInput: (world, intent) => encode({ t: "input", tick: world.tick, intent }),
  encodeSnapshot: (w) =>
    encode({ t: "snapshot", tick: w.tick, phase: w.phase, winnerId: w.winnerId, players: w.players, projectiles: w.projectiles }),
  decodeMessage: (data) => {
    const m = decode(data);
    if (!m) return null;
    if (m.t === "input") return { kind: "input", intent: m.intent };
    if (m.t === "snapshot") return { kind: "snapshot", world: worldFromSnapshot(m) };
    return null;
  },
  electHost: electHostForWorld,
  onPeerLeave: (w, id) =>
    w.players[id]?.status === "alive"
      ? { ...w, players: { ...w.players, [id]: { ...w.players[id]!, status: "dead", attack: null, health: 0 } } }
      : w,
};
```

- [ ] **Step 2: Update the arena `Session`** — in `src/game/net/session.ts`:
  - Change the field type: `private engine: SyncEngine | null = null;` → `private engine: SyncEngine<World, Intent> | null = null;`
  - Import the adapter: `import { SyncEngine } from "./sync";` → `import { arenaSyncAdapter, SyncEngine } from "./sync";`
  - In `beginMatch`, add `adapter: arenaSyncAdapter,` to the `new SyncEngine({ ... })` options (right after `world: this.initialWorld,`).

- [ ] **Step 3: Update `src/game/net/sync.test.ts`** — every `new SyncEngine({ ... })` construction gains the line `adapter: arenaSyncAdapter,` (import it from `./sync`). No assertion changes — behavior is identical.

- [ ] **Step 4: Run the full suite to prove the refactor is a no-op**

Run: `npx vitest run && npx tsc --noEmit`
Expected: ALL tests pass (same count as before this task). If a snapshot/input wire test fails, the adapter's `encodeInput`/`encodeSnapshot` drifted from the old inline encoding — make them byte-identical.

- [ ] **Step 5: Commit**

```bash
git add src/game/net/sync.ts src/game/net/session.ts src/game/net/sync.test.ts
git commit -m "refactor(net): SyncEngine generic over world/intent via SyncAdapter (arena behavior unchanged)"
```

---

### Task 9: SquidSession — squid netplay over the shared stack

**Files:**
- Create: `src/game/squid/net/adapter.ts`
- Create: `src/game/squid/net/session.ts`
- Test: `src/game/squid/net/session.test.ts`

**Interfaces:**
- Consumes: `SyncAdapter`/`SyncEngine`/`arenaSyncAdapter` pattern from Task 8; `squidStart`/`squidInput`/`squidSnapshot` from Task 7; lobby reducers from `src/game/net/lobby.ts`; `electHost` from `src/game/net/election.ts`; squid core (Tasks 4–6). **Mirror the CURRENT arena `Session`** (`src/game/net/session.ts`) — it uses an explicit-host model: `isCreator` claims host, `hello` carries `hostId`, a `host` message transfers it, and host-leave falls back to lowest-id election.
- Produces: `squidSyncAdapter: SyncAdapter<SquidWorld, SquidIntent>`; `SquidSession` with: `localId`, `phase: "lobby" | "countdown" | "playing" | "ended"`, `matchEpoch`, `getState(): { localId; phase; matchEpoch; roster: LobbyPlayer[]; hostId; isHost; stage: StageId; result: RoundResult; timeMs: number }`, `setProfile(name, iconColor)`, `start(stage: StageId)` (host-only, ≥1 player), `kick(id)`, `makeHost(id)`, `leave()`, `toLobby()`, `frame(dt, input: RawSquidInput): { world: SquidWorld; countdown: number }`, `getMeta(id): { name: string; colorIndex: number }`. Constructor options: `{ transport, name, iconColor, isCreator?, onChange }`.

- [ ] **Step 1: Write the adapter**

```ts
// src/game/squid/net/adapter.ts
/** Squid's SyncAdapter: plugs the squid sim + wire messages into the shared SyncEngine. */

import type { SyncAdapter } from "../../net/sync";
import { decode, encode } from "../../net/protocol";
import { electHost } from "../../net/election";
import { stepSquid } from "../sim";
import { coerceSquidIntent } from "../intent";
import { releasePlayer } from "../control";
import type { SquidIntent, SquidWorld } from "../types";

export const squidSyncAdapter: SyncAdapter<SquidWorld, SquidIntent> = {
  step: stepSquid,
  coerceIntent: coerceSquidIntent,
  encodeInput: (world, intent) => encode({ t: "squidInput", tick: world.tick, intent }),
  encodeSnapshot: (world) => encode({ t: "squidSnapshot", world }),
  decodeMessage: (data) => {
    const m = decode(data);
    if (!m) return null;
    if (m.t === "squidInput") return { kind: "input", intent: m.intent };
    if (m.t === "squidSnapshot") return { kind: "snapshot", world: m.world };
    return null;
  },
  // Everyone is always "alive" in squid — plain lowest-connected-id election.
  electHost: (_world, connected) => electHost(connected),
  // A departed player's leg becomes grabbable; their intents stop mattering.
  onPeerLeave: (world, id) => ({
    ...world,
    control: releasePlayer(world.control, id),
    playerIds: world.playerIds.filter((p) => p !== id),
  }),
};
```

- [ ] **Step 2: Write the failing session test**

```ts
// src/game/squid/net/session.test.ts
import { describe, expect, it } from "vitest";
import { LocalHub } from "../../net/transport";
import { SquidSession } from "./session";
import type { RawSquidInput } from "../types";

const IDLE: RawSquidInput = { left: false, right: false, lift: false, cycle: false, grabLeg: null };
const GRAB4: RawSquidInput = { ...IDLE, grabLeg: 4 };

describe("SquidSession — lobby → start → play", () => {
  it("converges the roster, honors the creator-host, and syncs a client's leg grab", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    expect(a.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(b.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(a.getState().isHost).toBe(true);

    a.start("stage2");
    expect(a.phase).toBe("countdown");
    expect(b.phase).toBe("countdown");
    expect(b.getState().stage).toBe("stage2");

    // 3 s countdown + ~1 s of play at 20 Hz frames; b holds a grab on leg 4 throughout
    for (let i = 0; i < 80; i++) {
      a.frame(0.05, IDLE);
      b.frame(0.05, GRAB4);
    }
    const aw = a.frame(0, IDLE).world;
    const bw = b.frame(0, GRAB4).world;
    expect(aw.phase).toBe("playing");
    expect(aw.elapsedTicks).toBeGreaterThan(0);
    expect(aw.control[4]).toBe("b"); // host applied b's grab
    expect(bw.control[4]).toBe("b"); // client sees it via snapshot
  });

  it("solo start is allowed (1 player) and a leaver's leg is released", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    a.start("stage1");
    for (let i = 0; i < 80; i++) {
      a.frame(0.05, IDLE);
      b.frame(0.05, GRAB4);
    }
    expect(a.frame(0, IDLE).world.control[4]).toBe("b");

    b.leave();
    a.frame(0.05, IDLE);
    expect(a.frame(0, IDLE).world.control[4]).toBeNull();
    expect(a.frame(0, IDLE).world.playerIds).toEqual(["a"]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/game/squid/net/session.test.ts`
Expected: FAIL — cannot find module './session'.

- [ ] **Step 4: Write the implementation**

```ts
// src/game/squid/net/session.ts
/**
 * Squid netplay session: Transport + warm-up roster + the generic host-authoritative
 * SyncEngine. Mirrors the arena Session's presence/explicit-host model (hello carries
 * hostId; `host` transfers; host-leave falls back to lowest-id election) — but rounds
 * are cooperative: no bots, no weapons, start needs only 1 player, and the "result"
 * is the shared octopus finishing (timed) or failing.
 */

import type { PlayerId } from "../types";
import type { Transport } from "../../net/transport";
import { coerceAvatarUrl, decode, encode, type SquidStartPlayer } from "../../net/protocol";
import { SyncEngine } from "../../net/sync";
import { electHost } from "../../net/election";
import type { LobbyPlayer, Roster } from "../../net/lobby";
import { remove, rosterList, upsert } from "../../net/lobby";
import { DEFAULT_SHAPE } from "../../arena/cosmetic";
import { DEFAULT_WEAPON } from "../../arena/weapons";
import { COUNTDOWN_S } from "../../constants";
import { squidSyncAdapter } from "./adapter";
import { createSquidWorld, timeMsOf } from "../match";
import { initialSquidMemory, squidInputToIntent } from "../intent";
import { coerceStageId } from "../stage";
import type { RawSquidInput, RoundResult, SquidIntent, SquidWorld, StageId } from "../types";

export type SquidSessionPhase = "lobby" | "countdown" | "playing" | "ended";

export interface SquidSessionOptions {
  transport: Transport;
  name: string;
  iconColor: number;
  /** True for the peer that CREATED the room; it claims host (arena parity). */
  isCreator?: boolean;
  onChange: () => void;
}

const NO_INPUT: RawSquidInput = { left: false, right: false, lift: false, cycle: false, grabLeg: null };

export class SquidSession {
  readonly localId: PlayerId;
  private readonly t: Transport;
  private profile: LobbyPlayer;
  private roster: Roster = {};
  phase: SquidSessionPhase = "lobby";
  matchEpoch = 0;

  private explicitHostId: PlayerId | null = null;
  private engine: SyncEngine<SquidWorld, SquidIntent> | null = null;
  private initialWorld: SquidWorld | null = null;
  private stage: StageId = "stage1";
  private meta: Record<PlayerId, { name: string; colorIndex: number }> = {};
  private countdownLeft = 0;
  private mem = initialSquidMemory();
  private pendingRaw: RawSquidInput = NO_INPUT;

  constructor(private readonly opts: SquidSessionOptions) {
    this.t = opts.transport;
    this.localId = this.t.selfId;
    // LobbyPlayer carries shape/weapon for the arena; squid ignores them (defaults keep the wire valid).
    this.profile = { id: this.localId, name: opts.name, iconColor: opts.iconColor, shape: DEFAULT_SHAPE, weapon: DEFAULT_WEAPON, avatarUrl: null };
    this.roster = upsert({}, this.profile);
    if (opts.isCreator) this.explicitHostId = this.localId;

    this.t.onMessage((data, from) => this.onMessage(data, from));
    this.t.onPeerJoin(() => this.sendHello());
    this.t.onPeerLeave((id) => this.onPeerLeave(id));
    this.sendHello();
  }

  // ---- public state for the UI -------------------------------------------------

  getState() {
    const hostId = this.hostId();
    const world = this.engine?.getWorld() ?? null;
    return {
      localId: this.localId,
      phase: this.phase,
      matchEpoch: this.matchEpoch,
      roster: rosterList(this.roster),
      hostId,
      isHost: hostId === this.localId,
      stage: this.stage,
      result: (world?.result ?? null) as RoundResult,
      timeMs: world ? timeMsOf(world) : 0,
    };
  }

  toLobby(): void {
    this.phase = "lobby";
    this.engine = null;
    this.initialWorld = null;
    this.opts.onChange();
  }

  setProfile(name: string, iconColor: number): void {
    this.profile = { ...this.profile, name, iconColor };
    this.roster = upsert(this.roster, this.profile);
    this.sendHello();
    this.opts.onChange();
  }

  /** Host-only: start a round on `stage` with the current roster (1+ players — solo allowed). */
  start(stage: StageId): void {
    if (this.hostId() !== this.localId) return;
    const players: SquidStartPlayer[] = rosterList(this.roster).map((p) => ({
      id: p.id,
      name: p.name,
      iconColor: p.iconColor,
      avatarUrl: p.avatarUrl ?? null,
    }));
    if (players.length < 1) return;
    this.t.send(encode({ t: "squidStart", countdownMs: COUNTDOWN_S * 1000, stage, players }));
    this.beginRound(stage, players);
  }

  kick(targetId: PlayerId): void {
    if (this.hostId() !== this.localId || targetId === this.localId) return;
    this.t.send(encode({ t: "kick", targetId }));
    this.roster = remove(this.roster, targetId);
    this.opts.onChange();
  }

  /** Host-only: hand the host role to another connected player in the lobby. */
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

  // ---- driver (renderer) --------------------------------------------------------

  getMeta(id: PlayerId): { name: string; colorIndex: number } {
    return this.meta[id] ?? { name: id.slice(0, 6), colorIndex: 0 };
  }

  frame(dt: number, input: RawSquidInput): { world: SquidWorld; countdown: number } {
    this.pendingRaw = input;
    const fallback = this.initialWorld ?? createSquidWorld(this.stage, [this.localId]);

    if (this.phase === "countdown") {
      this.countdownLeft = Math.max(0, this.countdownLeft - dt);
      if (this.countdownLeft <= 0) {
        this.phase = "playing";
        this.opts.onChange();
      }
      return { world: fallback, countdown: Math.ceil(this.countdownLeft) };
    }

    if ((this.phase === "playing" || this.phase === "ended") && this.engine) {
      this.engine.tick(dt);
      const world = this.engine.getWorld();
      if (world.phase === "ended" && this.phase !== "ended") {
        this.phase = "ended";
        this.opts.onChange();
      }
      return { world, countdown: 0 };
    }

    return { world: fallback, countdown: 0 };
  }

  // ---- internals -----------------------------------------------------------------

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
    this.t.send(
      encode({
        t: "hello",
        name: this.profile.name,
        iconColor: this.profile.iconColor,
        shape: this.profile.shape,
        weapon: this.profile.weapon,
        avatarUrl: this.profile.avatarUrl,
        hostId: this.explicitHostId,
      }),
    );
  }

  private onMessage(data: string, from: PlayerId): void {
    const m = decode(data);
    if (!m) return;
    switch (m.t) {
      case "hello": {
        const isNew = !(from in this.roster);
        this.roster = upsert(this.roster, {
          id: from,
          name: m.name,
          iconColor: m.iconColor,
          shape: DEFAULT_SHAPE,
          weapon: DEFAULT_WEAPON,
          avatarUrl: coerceAvatarUrl(m.avatarUrl),
        });
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
      case "squidStart":
        this.beginRound(coerceStageId(m.stage), m.players);
        break;
      default:
        break; // squidInput/squidSnapshot are consumed by the SyncEngine's handler
    }
  }

  private beginRound(stage: StageId, players: SquidStartPlayer[]): void {
    this.stage = stage;
    this.meta = Object.fromEntries(players.map((p) => [p.id, { name: p.name, colorIndex: p.iconColor }]));
    this.initialWorld = createSquidWorld(stage, players.map((p) => p.id));
    this.mem = initialSquidMemory();

    this.engine = new SyncEngine<SquidWorld, SquidIntent>({
      transport: this.t,
      localId: this.localId,
      world: this.initialWorld,
      adapter: squidSyncAdapter,
      readIntent: () => {
        const { intent, memory } = squidInputToIntent(this.pendingRaw, this.mem);
        this.mem = memory;
        return intent;
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

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/game/squid/net/session.test.ts`
Expected: PASS (2 tests). Note: because both squid and arena sessions register message handlers on the same protocol, a squid room only ever sees squid + lobby messages — the arena `start` case simply never fires here.

- [ ] **Step 6: Full suite + typecheck + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/game/squid/net/
git commit -m "feat(squid): netplay session over the generic SyncEngine (explicit host, solo start, leg release on leave)"
```

---

### Task 10: Score persistence — pure helpers + trusted API routes

**Files:**
- Create: `src/lib/squid/scores.ts`
- Test: `src/lib/squid/scores.test.ts`
- Create: `src/pages/api/squid-result.ts`
- Create: `src/pages/api/squid-scores.ts`
- Modify: `src/lib/members/games.ts` (add squid to the members-area registry)

**Interfaces:**
- Consumes: `StageId` + `MIN_SCORE_MS`/`MAX_SCORE_MS` from the squid core; the elevated Wix Data patterns from `src/pages/api/suggest-game.ts` (collection auto-create) and `src/lib/wix/playerAvatars.ts` (deterministic row id + `getDataItem`/`saveDataItem` — **no query builders**, they don't compose with `auth.elevate`).
- Produces: `ScoreEntry { timeMs: number; names: string; at: string }`, `TOP_CAP = 10`, `mergeTopScores(top, entry, cap?)`, `validateSquidResult(raw): { stageId: StageId; timeMs: number; names: string } | null`, `scoreRowId(stageId)`, `parseTopJson(raw): ScoreEntry[]`, `formatTimeMs(ms): string` ("m:ss.t" — used by the React UI); HTTP: `POST /api/squid-result` (JSON `{ stageId, timeMs, playerNames: string[] }` → 204/400/500), `GET /api/squid-scores?stage=<id>` (→ `{ scores: ScoreEntry[] }`).

**Storage model:** one document per stage in a `GameScores` collection, row id `squid-<stageId>`, holding the top-10 as a JSON string (`topJson`). O(1) elevated get/save, no queries, race window acceptable for casual play. (If per-member stats land later via Track B `PlayerStats`, that's a separate additive collection.)

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/squid/scores.test.ts
import { describe, expect, it } from "vitest";
import { formatTimeMs, mergeTopScores, parseTopJson, scoreRowId, validateSquidResult } from "./scores";
import type { ScoreEntry } from "./scores";

const e = (timeMs: number, names = "A"): ScoreEntry => ({ timeMs, names, at: "2026-07-09T00:00:00.000Z" });

describe("mergeTopScores", () => {
  it("inserts sorted ascending by time and caps the list", () => {
    let top: ScoreEntry[] = [];
    for (const t of [50_000, 30_000, 40_000]) top = mergeTopScores(top, e(t));
    expect(top.map((s) => s.timeMs)).toEqual([30_000, 40_000, 50_000]);
    for (let i = 0; i < 12; i++) top = mergeTopScores(top, e(10_000 + i));
    expect(top).toHaveLength(10);
    expect(top[0]!.timeMs).toBe(10_000);
    expect(top[9]!.timeMs).toBe(10_009);
  });
});

describe("validateSquidResult", () => {
  const ok = { stageId: "stage1", timeMs: 42_000, playerNames: ["Ann", "Bo"] };

  it("accepts a valid result and joins names", () => {
    expect(validateSquidResult(ok)).toEqual({ stageId: "stage1", timeMs: 42_000, names: "Ann, Bo" });
  });

  it("rejects unknown stages, out-of-bounds times, and bad name lists", () => {
    expect(validateSquidResult({ ...ok, stageId: "stage9" })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 2_999 })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 1_800_001 })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 42.5 })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: [] })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: Array(9).fill("x") })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: ["ok", ""] })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: ["x".repeat(25)] })).toBeNull();
    expect(validateSquidResult(null)).toBeNull();
  });

  it("trims names", () => {
    expect(validateSquidResult({ ...ok, playerNames: [" Ann "] })?.names).toBe("Ann");
  });
});

describe("parseTopJson / scoreRowId / formatTimeMs", () => {
  it("parses only well-formed entries and tolerates garbage", () => {
    expect(parseTopJson(JSON.stringify([e(1000), { bad: true }, e(2000)])).map((s) => s.timeMs)).toEqual([1000, 2000]);
    expect(parseTopJson("not json")).toEqual([]);
    expect(parseTopJson(undefined)).toEqual([]);
  });

  it("builds deterministic row ids", () => {
    expect(scoreRowId("stage2")).toBe("squid-stage2");
  });

  it("formats m:ss.t", () => {
    expect(formatTimeMs(42_350)).toBe("0:42.3");
    expect(formatTimeMs(83_040)).toBe("1:23.0");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/squid/scores.test.ts`
Expected: FAIL — cannot find module './scores'.

- [ ] **Step 3: Write the pure helpers**

```ts
// src/lib/squid/scores.ts
/**
 * Pure squid-highscore logic shared by the API routes (validation/merge) and the
 * React UI (formatting). Persistence model: ONE document per stage holding the
 * top-10 as JSON — O(1) elevated get/save, no Wix Data queries needed.
 */

import { MAX_SCORE_MS, MIN_SCORE_MS } from "../../game/squid/constants";
import { STAGES } from "../../game/squid/stage";
import type { StageId } from "../../game/squid/stage";

export interface ScoreEntry {
  timeMs: number;
  /** Comma-joined roster, e.g. "Kyrylo, Dana". */
  names: string;
  /** ISO timestamp (server clock — never enters the sim). */
  at: string;
}

export const TOP_CAP = 10;
const MAX_NAME_LEN = 24;
const MAX_TEAM = 8;

/** Insert an entry keeping the list sorted ascending by time, capped at `cap`. */
export function mergeTopScores(top: ScoreEntry[], entry: ScoreEntry, cap = TOP_CAP): ScoreEntry[] {
  return [...top, entry].sort((a, b) => a.timeMs - b.timeMs).slice(0, cap);
}

export interface SquidResult {
  stageId: StageId;
  timeMs: number;
  names: string;
}

/** Server-side trust boundary for POST /api/squid-result bodies. Null = reject. */
export function validateSquidResult(raw: unknown): SquidResult | null {
  const r = (raw ?? {}) as { stageId?: unknown; timeMs?: unknown; playerNames?: unknown };
  if (!STAGES.some((s) => s.id === r.stageId)) return null;
  const t = r.timeMs;
  if (typeof t !== "number" || !Number.isInteger(t) || t < MIN_SCORE_MS || t > MAX_SCORE_MS) return null;
  if (!Array.isArray(r.playerNames) || r.playerNames.length < 1 || r.playerNames.length > MAX_TEAM) return null;
  const names: string[] = [];
  for (const n of r.playerNames) {
    if (typeof n !== "string") return null;
    const trimmed = n.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NAME_LEN) return null;
    names.push(trimmed);
  }
  return { stageId: r.stageId as StageId, timeMs: t, names: names.join(", ") };
}

/** Deterministic GameScores row id per stage (playerAvatars pattern). */
export function scoreRowId(stageId: StageId): string {
  return `squid-${stageId}`;
}

/** Parse a stored topJson value, dropping malformed entries. */
export function parseTopJson(raw: unknown): ScoreEntry[] {
  if (typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (s): s is ScoreEntry =>
        !!s && typeof s.timeMs === "number" && typeof s.names === "string" && typeof s.at === "string",
    );
  } catch {
    return [];
  }
}

/** 42_350 → "0:42.3" (minutes:seconds.tenths). */
export function formatTimeMs(ms: number): string {
  const totalS = ms / 1000;
  const m = Math.floor(totalS / 60);
  const s = totalS - m * 60;
  const whole = Math.floor(s);
  const tenth = Math.floor((s - whole) * 10);
  return `${m}:${String(whole).padStart(2, "0")}.${tenth}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/squid/scores.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Write the API routes** (no unit tests — thin I/O shells around the tested helpers; same posture as `suggest-game.ts`)

```ts
// src/pages/api/squid-result.ts
import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { collections, items } from "@wix/data";
import { mergeTopScores, parseTopJson, scoreRowId, validateSquidResult } from "../../lib/squid/scores";
import type { ScoreEntry } from "../../lib/squid/scores";

const COLLECTION_ID = "GameScores";

/** First write auto-creates the collection; writes stay server-only (elevated), so every role is ADMIN. */
async function createScoresCollection(): Promise<void> {
  const TEXT = collections.Type.TEXT;
  const ADMIN = collections.Role.ADMIN;
  await auth.elevate(collections.createDataCollection)({
    _id: COLLECTION_ID,
    displayName: "Game Scores",
    fields: ["gameId", "stageId", "topJson"].map((key) => ({ key, type: TEXT })),
    permissions: { insert: ADMIN, update: ADMIN, remove: ADMIN, read: ADMIN },
  });
}

function isMissingCollection(e: unknown): boolean {
  const text = `${(e as Error)?.message ?? ""} ${JSON.stringify((e as { details?: unknown })?.details ?? "")}`;
  return /not[_ ]?found|does not exist|WDE0025/i.test(text);
}

const bad = (status: number) => new Response(null, { status });

/**
 * Trusted squid score write: the round HOST posts { stageId, timeMs, playerNames[] } on finish.
 * Server validates (stage allowlist + sanity bounds) and merges into the per-stage top-10 doc
 * with elevated creds — clients never write Wix Data directly. A cheating host can mis-report;
 * accepted for casual play (same posture as the roadmap's match-result route).
 */
export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad(400);
  }
  const result = validateSquidResult(body);
  if (!result) return bad(400);

  const entry: ScoreEntry = { timeMs: result.timeMs, names: result.names, at: new Date().toISOString() };
  const _id = scoreRowId(result.stageId);

  const readTop = async (): Promise<ScoreEntry[]> => {
    try {
      const item = await auth.elevate(items.getDataItem)(_id, { dataCollectionId: COLLECTION_ID });
      return parseTopJson(item?.data?.topJson);
    } catch {
      return []; // row (or collection) doesn't exist yet
    }
  };
  const save = (top: ScoreEntry[]) =>
    auth.elevate(items.saveDataItem)({
      dataCollectionId: COLLECTION_ID,
      dataItem: { _id, data: { _id, gameId: "squid", stageId: result.stageId, topJson: JSON.stringify(top) } },
    });

  try {
    await save(mergeTopScores(await readTop(), entry));
  } catch (e) {
    if (!isMissingCollection(e)) return bad(500);
    try {
      await createScoresCollection();
      await save(mergeTopScores([], entry));
    } catch {
      return bad(500);
    }
  }
  return new Response(null, { status: 204 });
};
```

```ts
// src/pages/api/squid-scores.ts
import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { parseTopJson, scoreRowId } from "../../lib/squid/scores";
import { STAGES } from "../../game/squid/stage";
import type { StageId } from "../../game/squid/stage";

const COLLECTION_ID = "GameScores";

/** Public read of a stage's top-10 (the waiting-room dashboard). */
export const GET: APIRoute = async ({ url }) => {
  const stage = url.searchParams.get("stage");
  if (!STAGES.some((s) => s.id === stage)) {
    return new Response(JSON.stringify({ error: "unknown stage" }), { status: 400 });
  }
  let scores: unknown[] = [];
  try {
    const item = await auth.elevate(items.getDataItem)(scoreRowId(stage as StageId), {
      dataCollectionId: COLLECTION_ID,
    });
    scores = parseTopJson(item?.data?.topJson);
  } catch {
    scores = []; // no scores yet (or transient) — empty dashboard, never an error page
  }
  return new Response(JSON.stringify({ scores }), {
    status: 200,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
};
```

- [ ] **Step 6: Register squid in the members-area games registry** — in `src/lib/members/games.ts`, extend the `GAMES` array:

```ts
export const GAMES: GameMeta[] = [
  { id: "arena", name: "Arena", accent: "from-sky-500/20 to-emerald-500/20" },
  { id: "squid", name: "Squid", accent: "from-fuchsia-500/20 to-cyan-500/20" },
];
```

(This also allowlists `gameId: "squid"` for the per-game avatar API — free B1b integration.)

- [ ] **Step 7: Full suite + typecheck + commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/lib/squid/ src/pages/api/squid-result.ts src/pages/api/squid-scores.ts src/lib/members/games.ts
git commit -m "feat(squid): team highscore persistence (GameScores top-10 doc per stage + trusted API routes)"
```

---

### Task 11: Renderer — side-view Phaser scene + contract

**Files:**
- Create: `src/game/squid/render/contract.ts`
- Create: `src/game/squid/render/scene.ts`

No unit tests (impure Phaser adapter — same posture as the arena scene); gate is `npx tsc --noEmit` + the Task 14 live playtest.

**Interfaces:**
- Consumes: `SquidDriver` shape implemented by `SquidSession` (Task 9); `PALETTE` from `src/game/arena/render/scene.ts`; squid core geometry; `timeMsOf` from match.ts.
- Produces: `SQUID_W`, `SQUID_H`, `SquidScene`, `SquidConfig` — consumed by `Squid.tsx` (Task 12) exactly like `ArenaScene`/`ArenaConfig` are consumed by `Arena.tsx` (registry key `"cfg"`, `callbacks.preBoot`).

- [ ] **Step 1: Write the contract**

```ts
// src/game/squid/render/contract.ts
/** Shared contract between the squid renderer scene and whatever drives the round. */

import type { PlayerId, RawSquidInput, RoundResult, SquidWorld } from "../types";

export interface SquidPlayerMeta {
  name: string;
  colorIndex: number;
}

export interface SquidFramePacket {
  world: SquidWorld;
  countdown: number;
}

export interface SquidDriver {
  readonly localId: PlayerId;
  frame(dt: number, input: RawSquidInput): SquidFramePacket;
  getMeta(id: PlayerId): SquidPlayerMeta;
}

export interface SquidHudState {
  countdown: number;
  timeMs: number;
  /** The local player's held leg index, or null. */
  myLeg: number | null;
  result: RoundResult;
}

export type SquidEvent =
  | { type: "tik"; n: number }
  | { type: "go" }
  | { type: "grab" }
  | { type: "finish" }
  | { type: "fall" };

export interface SquidConfig {
  driver: SquidDriver;
  onHud: (h: SquidHudState) => void;
  onEvent: (e: SquidEvent) => void;
  onEnd: (result: "finished" | "failed", timeMs: number) => void;
}
```

- [ ] **Step 2: Write the scene**

```ts
// src/game/squid/render/scene.ts
/**
 * Side-view squid renderer: ground (with the stage-2 hole), arched finish line,
 * and the octopus — legs tinted per controlling player, local leg highlighted.
 * Impure adapter: reads keyboard/pointer, drives the SquidDriver, redraws with
 * Graphics each frame. All world math is in meters; only this file knows pixels.
 */

import Phaser from "phaser";
import { PALETTE } from "../../arena/render/scene";
import { COURSE_M, FINISH_X_M, HEAD_R_M, SQUID_PX_PER_M } from "../constants";
import { HEAD } from "../octopus";
import { stageById } from "../stage";
import { timeMsOf } from "../match";
import { legOf } from "../control";
import type { RawSquidInput, SquidWorld } from "../types";
import type { SquidConfig, SquidHudState } from "./contract";

const MARGIN_X = 100;
export const SQUID_W = MARGIN_X * 2 + COURSE_M * SQUID_PX_PER_M + 90; // room for the arch
export const SQUID_H = 440;
const GROUND_Y = 350;

const toX = (m: number): number => MARGIN_X + m * SQUID_PX_PER_M;
const toY = (m: number): number => GROUND_Y - m * SQUID_PX_PER_M;
const fromPx = (px: number, py: number): { x: number; y: number } => ({
  x: (px - MARGIN_X) / SQUID_PX_PER_M,
  y: (GROUND_Y - py) / SQUID_PX_PER_M,
});

const UNHELD = 0x64748b;
const colorOf = (i: number): number => PALETTE[i % PALETTE.length] ?? UNHELD;

export class SquidScene extends Phaser.Scene {
  private cfg!: SquidConfig;
  private g!: Phaser.GameObjects.Graphics;
  private keys!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    lift: Phaser.Input.Keyboard.Key;
    lift2: Phaser.Input.Keyboard.Key;
    a: Phaser.Input.Keyboard.Key;
    d: Phaser.Input.Keyboard.Key;
    cycle: Phaser.Input.Keyboard.Key;
  };
  private pendingGrab: number | null = null;
  private lastCountdown = -1;
  private ended = false;
  private lastHud: SquidHudState | null = null;

  constructor() {
    super("squid");
  }

  create(): void {
    this.cfg = this.game.registry.get("cfg") as SquidConfig;
    this.g = this.add.graphics();
    const kb = this.input.keyboard!;
    const K = Phaser.Input.Keyboard.KeyCodes;
    this.keys = {
      left: kb.addKey(K.LEFT),
      right: kb.addKey(K.RIGHT),
      lift: kb.addKey(K.UP),
      lift2: kb.addKey(K.W),
      a: kb.addKey(K.A),
      d: kb.addKey(K.D),
      cycle: kb.addKey(K.SPACE),
    };
    // click near a leg's lower half to grab it
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      const world = this.cfg.driver.frame(0, this.readInput()).world;
      const click = fromPx(p.x, p.y);
      let best: { leg: number; d: number } | null = null;
      world.legs.forEach((leg, i) => {
        for (const pi of [leg.pts[1], leg.pts[2]]) {
          const pt = world.points[pi]!.pos;
          const d = Math.hypot(pt.x - click.x, pt.y - click.y);
          if (d < 0.45 && (!best || d < best.d)) best = { leg: i, d };
        }
      });
      if (best) {
        this.pendingGrab = (best as { leg: number }).leg;
        this.cfg.onEvent({ type: "grab" });
      }
    });
  }

  private readInput(): RawSquidInput {
    return {
      left: this.keys.left.isDown || this.keys.a.isDown,
      right: this.keys.right.isDown || this.keys.d.isDown,
      lift: this.keys.lift.isDown || this.keys.lift2.isDown,
      cycle: this.keys.cycle.isDown,
      grabLeg: this.pendingGrab,
    };
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const input = this.readInput();
    const { world, countdown } = this.cfg.driver.frame(dt, input);
    this.pendingGrab = null; // grab is one-shot

    if (countdown !== this.lastCountdown) {
      if (countdown > 0) this.cfg.onEvent({ type: "tik", n: countdown });
      else if (this.lastCountdown > 0) this.cfg.onEvent({ type: "go" });
      this.lastCountdown = countdown;
    }
    if (world.result !== null && !this.ended) {
      this.ended = true;
      this.cfg.onEvent({ type: world.result === "finished" ? "finish" : "fall" });
      this.cfg.onEnd(world.result, timeMsOf(world));
    }

    const hud: SquidHudState = {
      countdown,
      timeMs: timeMsOf(world),
      myLeg: legOf(world.control, this.cfg.driver.localId),
      result: world.result,
    };
    const p = this.lastHud;
    if (!p || p.countdown !== hud.countdown || p.myLeg !== hud.myLeg || p.result !== hud.result || Math.abs(p.timeMs - hud.timeMs) >= 100) {
      this.lastHud = hud;
      this.cfg.onHud(hud);
    }

    this.draw(world);
  }

  private draw(world: SquidWorld): void {
    const g = this.g;
    g.clear();
    const stage = stageById(world.stage);

    // ground strips (leave the hole open) + hole shaft
    g.fillStyle(0x1e293b);
    const strips: [number, number][] = stage.hole
      ? [[-1, stage.hole.x], [stage.hole.x + stage.hole.width, COURSE_M + 2]]
      : [[-1, COURSE_M + 2]];
    for (const [x0, x1] of strips) g.fillRect(toX(x0), GROUND_Y, (x1 - x0) * SQUID_PX_PER_M, SQUID_H - GROUND_Y);
    if (stage.hole) {
      g.fillStyle(0x0b1220);
      g.fillRect(toX(stage.hole.x), GROUND_Y, stage.hole.width * SQUID_PX_PER_M, SQUID_H - GROUND_Y);
    }
    g.lineStyle(2, 0x334155).lineBetween(toX(-1), GROUND_Y, toX(COURSE_M + 2), GROUND_Y);

    // arched finish line
    const fx = toX(FINISH_X_M);
    g.lineStyle(6, 0xfbbf24);
    g.lineBetween(fx, GROUND_Y, fx, toY(1.6));
    g.lineBetween(fx + 46, GROUND_Y, fx + 46, toY(1.6));
    g.beginPath();
    g.arc(fx + 23, toY(1.6), 23, Math.PI, 0, false);
    g.strokePath();

    // legs: colored per controller; local player's leg gets a white glow underlay
    const myLeg = legOf(world.control, this.cfg.driver.localId);
    world.legs.forEach((leg, i) => {
      const holder = world.control[i];
      const color = holder ? colorOf(this.cfg.driver.getMeta(holder).colorIndex) : UNHELD;
      const chain = [world.points[HEAD]!, ...leg.pts.map((pi) => world.points[pi]!)];
      if (i === myLeg) {
        g.lineStyle(9, 0xffffff, 0.55);
        this.strokeChain(chain);
      }
      g.lineStyle(5, color, holder ? 1 : 0.7);
      this.strokeChain(chain);
      if (leg.planted) {
        const tip = world.points[leg.pts[2]]!.pos;
        g.fillStyle(color, 1).fillCircle(toX(tip.x), toY(tip.y), 4);
      }
    });

    // head + eye
    const head = world.points[HEAD]!.pos;
    g.fillStyle(0x8b5cf6).fillCircle(toX(head.x), toY(head.y), HEAD_R_M * SQUID_PX_PER_M);
    g.fillStyle(0xffffff).fillCircle(toX(head.x) + 9, toY(head.y) - 5, 6);
    g.fillStyle(0x0f172a).fillCircle(toX(head.x) + 11, toY(head.y) - 5, 3);
  }

  private strokeChain(chain: { pos: { x: number; y: number } }[]): void {
    this.g.beginPath();
    this.g.moveTo(toX(chain[0]!.pos.x), toY(chain[0]!.pos.y));
    for (const p of chain.slice(1)) this.g.lineTo(toX(p.pos.x), toY(p.pos.y));
    this.g.strokePath();
  }
}
```

**Note for the implementer:** the pointerdown handler calls `driver.frame(0, …)` just to read the current world for hit-testing — dt 0 means no sim advance; this matches how the driver is safe to poll.

- [ ] **Step 3: Typecheck + commit**

```bash
npx tsc --noEmit
git add src/game/squid/render/
git commit -m "feat(squid): side-view Phaser renderer (ground/hole/arch, per-player leg tint, grab-by-click)"
```

---

### Task 12: React island — Squid.tsx + SquidWarmupRoom (stage select + highscore dashboard)

**Files:**
- Create: `src/components/game/lobby/SquidWarmupRoom.tsx`
- Create: `src/components/game/Squid.tsx`
- Modify: `src/game/squid/net/session.ts` (one line — expose the round's `playerIds` in `getState`)

No unit tests (React shell mirrors `Arena.tsx`, which is also verified live); gate is typecheck + Task 14 playtest.

**Interfaces:**
- Consumes: `SquidSession` (Task 9), `SquidScene`/`SquidConfig`/`SQUID_W`/`SQUID_H` (Task 11), `formatTimeMs`/`ScoreEntry` (Task 10), the `Countdown` HUD component, `Sfx`, room-link/ICE helpers — all exactly as `Arena.tsx` uses them (`src/components/game/Arena.tsx` is the reference; keep its transport/ICE/`isCreator: !existing` bootstrapping verbatim).
- Produces: default-export `Squid()` React island for the page (Task 13).

- [ ] **Step 1: Expose round participants** — in `src/game/squid/net/session.ts` `getState()`, add after the `timeMs` line:

```ts
      playerIds: world?.playerIds ?? [],
```

(The island resolves score names as `state.playerIds.map((id) => session.getMeta(id).name)` — the actual round participants, not the possibly-changed lobby roster.)

- [ ] **Step 2: Write the squid warm-up room**

```tsx
// src/components/game/lobby/SquidWarmupRoom.tsx
import { useState } from "react";
import { PALETTE } from "../../../game/arena/render/scene";
import type { LobbyPlayer } from "../../../game/net/lobby";
import type { PlayerId } from "../../../game/arena/types";
import { STAGES } from "../../../game/squid/stage";
import type { StageId } from "../../../game/squid/stage";
import { MAX_PLAYERS } from "../../../game/constants";
import { formatTimeMs, type ScoreEntry } from "../../../lib/squid/scores";

const hex = (i: number) => `#${(PALETTE[i % PALETTE.length] ?? 0).toString(16).padStart(6, "0")}`;

interface Props {
  roster: LobbyPlayer[];
  localId: PlayerId;
  hostId: PlayerId | null;
  isHost: boolean;
  name: string;
  colorIndex: number;
  stage: StageId;
  joinUrl: string;
  /** Per-stage top-10; null while loading; missing entries render an empty state. */
  scores: Partial<Record<StageId, ScoreEntry[]>> | null;
  onName: (n: string) => void;
  onColor: (i: number) => void;
  onStage: (s: StageId) => void;
  onStart: () => void;
  onKick: (id: PlayerId) => void;
}

export default function SquidWarmupRoom(props: Props) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the input is selectable as a fallback */
    }
  };

  return (
    <div className="grid w-full gap-6 sm:grid-cols-[1fr_300px]">
      {/* left: setup */}
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-3xl font-bold">Squid — waiting room</h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            One octopus, eight legs. Grab a leg, walk together, beat the clock.
          </p>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Your name</span>
          <input
            value={props.name}
            onChange={(e) => props.onName(e.target.value.slice(0, 16))}
            className="w-56 rounded-md border border-neutral-300 bg-white px-3 py-1.5 dark:border-neutral-700 dark:bg-neutral-900"
            placeholder="Player"
          />
        </label>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Your leg color</span>
          <div className="flex flex-wrap gap-2">
            {PALETTE.map((_, i) => (
              <button
                key={i}
                aria-label={`color ${i + 1}`}
                onClick={() => props.onColor(i)}
                style={{ background: hex(i) }}
                className={`h-8 w-8 rounded-full transition ${
                  i === props.colorIndex ? "ring-2 ring-offset-2 ring-black dark:ring-white" : "opacity-80"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Stage {props.isHost ? "(you pick)" : "(host picks)"}</span>
          <div className="flex flex-wrap gap-2">
            {STAGES.map((s) => (
              <button
                key={s.id}
                disabled={!props.isHost}
                onClick={() => props.onStage(s.id)}
                className={`rounded-md border px-3 py-1.5 font-medium transition ${
                  s.id === props.stage
                    ? "border-black bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                }`}
              >
                {s.name}
                {s.hole && <span className="ml-1 text-xs opacity-70">· hole!</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 text-sm">
          <span className="text-neutral-500">Invite link</span>
          <div className="flex gap-2">
            <input
              readOnly
              value={props.joinUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full max-w-sm rounded-md border border-neutral-300 bg-neutral-50 px-3 py-1.5 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
            />
            <button onClick={copy} className="rounded-md bg-neutral-800 px-3 py-1.5 text-sm text-white hover:bg-neutral-700">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-2">
          {props.isHost ? (
            <button onClick={props.onStart} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400">
              Start round
            </button>
          ) : (
            <span className="text-sm text-neutral-500">Waiting for the host to start…</span>
          )}
        </div>
      </div>

      {/* right: party + highscores */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            Party · {props.roster.length}/{MAX_PLAYERS}
          </h3>
          <ul className="flex flex-col gap-2">
            {props.roster.map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: hex(p.iconColor) }} />
                <span className="flex-1 truncate text-sm">
                  {p.name}
                  {p.id === props.localId && " (you)"}
                  {p.id === props.hostId && <span className="ml-1 text-xs text-amber-500">host</span>}
                </span>
                {props.isHost && p.id !== props.localId && (
                  <button onClick={() => props.onKick(p.id)} className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-500/10">
                    kick
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {STAGES.map((s) => (
          <div key={s.id} className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
              🏆 {s.name} — best times
            </h3>
            {props.scores === null ? (
              <p className="text-xs text-neutral-500">Loading…</p>
            ) : (props.scores[s.id] ?? []).length === 0 ? (
              <p className="text-xs text-neutral-500">No finishes yet — be the first team!</p>
            ) : (
              <ol className="flex flex-col gap-1 text-sm">
                {(props.scores[s.id] ?? []).map((sc, i) => (
                  <li key={`${sc.at}-${i}`} className="flex items-baseline gap-2">
                    <span className="w-5 shrink-0 text-right text-xs text-neutral-500">{i + 1}.</span>
                    <span className="font-mono font-semibold">{formatTimeMs(sc.timeMs)}</span>
                    <span className="truncate text-xs text-neutral-500">{sc.names}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write the island**

```tsx
// src/components/game/Squid.tsx
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Phaser from "phaser";
import { SQUID_H, SQUID_W, SquidScene } from "../../game/squid/render/scene";
import type { SquidConfig, SquidEvent, SquidHudState } from "../../game/squid/render/contract";
import { SquidSession } from "../../game/squid/net/session";
import { buildJoinUrl, mintRoomId, parseRoomId } from "../../game/net/roomLink";
import { buildIceServers, iceConfigFromEnv } from "../../game/net/ice";
import { joinedIds } from "../../game/net/lobby";
import { Sfx } from "../../game/audio/sfx";
import type { StageId } from "../../game/squid/stage";
import { formatTimeMs, type ScoreEntry } from "../../lib/squid/scores";
import SquidWarmupRoom from "./lobby/SquidWarmupRoom";
import Countdown from "./hud/Countdown";

const ICE_SERVERS: RTCIceServer[] = buildIceServers(
  iceConfigFromEnv({
    PUBLIC_STUN_URLS: import.meta.env.PUBLIC_STUN_URLS,
    PUBLIC_TURN_URLS: import.meta.env.PUBLIC_TURN_URLS,
    PUBLIC_TURN_URL: import.meta.env.PUBLIC_TURN_URL,
    PUBLIC_TURN_USERNAME: import.meta.env.PUBLIC_TURN_USERNAME,
    PUBLIC_TURN_CREDENTIAL: import.meta.env.PUBLIC_TURN_CREDENTIAL,
  }),
);
const FRESH_HUD: SquidHudState = { countdown: 3, timeMs: 0, myLeg: null, result: null };

/** Squid island: waiting room (stage select + highscores) → countdown → co-op round → result. */
export default function Squid() {
  const hostRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sfxRef = useRef<Sfx>(new Sfx());
  const sessionRef = useRef<SquidSession | null>(null);
  const nameRef = useRef("Player");
  const colorRef = useRef(0);
  const postedEpochRef = useRef(-1);

  const [, forceRender] = useState(0);
  const bump = useCallback(() => forceRender((n) => n + 1), []);
  const [ready, setReady] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [name, setName] = useState("Player");
  const [colorIndex, setColorIndex] = useState(0);
  const [stage, setStage] = useState<StageId>("stage1");
  const [hud, setHud] = useState<SquidHudState>(FRESH_HUD);
  const [result, setResult] = useState<{ result: "finished" | "failed"; timeMs: number; saved: boolean | null } | null>(null);
  const [scores, setScores] = useState<Partial<Record<StageId, ScoreEntry[]>> | null>(null);

  // --- create transport + session once (client only) ---
  useEffect(() => {
    let cancelled = false;
    let session: SquidSession | null = null;
    (async () => {
      const existing = parseRoomId(window.location.search);
      const id = existing ?? mintRoomId();
      if (!existing) {
        window.history.replaceState(null, "", buildJoinUrl(window.location.origin, window.location.pathname, id));
      }
      setRoomId(id);
      const { createRtcTransport } = await import("../../game/net/rtc"); // client-only (WebRTC)
      if (cancelled) return;
      const transport = createRtcTransport({ roomId: id, iceServers: ICE_SERVERS });
      session = new SquidSession({ transport, name: nameRef.current, iconColor: colorRef.current, isCreator: !existing, onChange: bump });
      sessionRef.current = session;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      session?.leave();
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [bump]);

  // --- highscore dashboard: fetch on entry and whenever we land back in the lobby ---
  const sessionState = ready ? sessionRef.current!.getState() : null;
  const inLobby = !sessionState || sessionState.phase === "lobby";
  const refreshScores = useCallback(async () => {
    try {
      const [s1, s2] = await Promise.all(
        (["stage1", "stage2"] as StageId[]).map(async (s) => {
          const r = await fetch(`/api/squid-scores?stage=${s}`);
          if (!r.ok) throw new Error(String(r.status));
          return (await r.json()).scores as ScoreEntry[];
        }),
      );
      setScores({ stage1: s1, stage2: s2 });
    } catch {
      setScores({}); // dashboard shows empty states; the game stays playable
    }
  }, []);
  useEffect(() => {
    if (ready && inLobby) void refreshScores();
  }, [ready, inLobby, refreshScores]);

  const onHud = useCallback((h: SquidHudState) => setHud(h), []);
  const onEvent = useCallback((e: SquidEvent) => {
    const s = sfxRef.current;
    if (e.type === "tik") s.play("tik");
    else if (e.type === "go") s.play("go");
    else if (e.type === "grab") s.play("attack");
    else if (e.type === "finish") s.play("win");
    else if (e.type === "fall") s.play("gameover");
  }, []);

  // --- host reports a finished round once, then refreshes the dashboard ---
  const onEnd = useCallback(
    (res: "finished" | "failed", timeMs: number) => {
      setResult({ result: res, timeMs, saved: res === "finished" ? null : false });
      const session = sessionRef.current;
      if (!session) return;
      const state = session.getState();
      if (res !== "finished" || !state.isHost || postedEpochRef.current === state.matchEpoch) return;
      postedEpochRef.current = state.matchEpoch;
      const playerNames = state.playerIds.map((id) => session.getMeta(id).name);
      void fetch("/api/squid-result", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageId: state.stage, timeMs, playerNames }),
      })
        .then((r) => {
          setResult((cur) => (cur ? { ...cur, saved: r.ok } : cur));
          void refreshScores();
        })
        .catch(() => setResult((cur) => (cur ? { ...cur, saved: false } : cur)));
    },
    [refreshScores],
  );

  // --- (re)create the Phaser game whenever a round starts ---
  const inMatch = !!sessionState && sessionState.phase !== "lobby";
  const gameKey = inMatch ? `s${sessionState.matchEpoch}` : "";
  useEffect(() => {
    gameRef.current?.destroy(true);
    gameRef.current = null;
    const session = sessionRef.current;
    if (!gameKey || !session || !hostRef.current) return;

    setResult(null);
    setHud(FRESH_HUD);
    const cfg: SquidConfig = { driver: session, onHud, onEvent, onEnd };
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: SQUID_W,
      height: SQUID_H,
      parent: hostRef.current,
      backgroundColor: "#0f172a",
      scene: [SquidScene],
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
      callbacks: { preBoot: (g) => g.registry.set("cfg", cfg) },
    });
    gameRef.current = game;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameKey, onEnd, onEvent, onHud]);

  // --- connect chime + audio unlock (arena parity) ---
  const rosterIds = sessionState ? sessionState.roster.map((pl) => pl.id) : [];
  const rosterKey = rosterIds.join(",");
  const prevRosterIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!sessionState) return;
    const joined = joinedIds(prevRosterIdsRef.current, rosterIds, sessionState.localId);
    prevRosterIdsRef.current = rosterIds;
    if (joined.length > 0) sfxRef.current.play("join");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterKey]);
  useEffect(() => {
    const unlock = () => sfxRef.current.resume();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  if (!ready) {
    return <div className="py-16 text-center text-neutral-500">Connecting to the reef…</div>;
  }

  const joinUrl = buildJoinUrl(window.location.origin, window.location.pathname, roomId);

  const changeName = (n: string) => {
    setName(n);
    nameRef.current = n;
    sessionRef.current?.setProfile(n, colorRef.current);
  };
  const changeColor = (i: number) => {
    setColorIndex(i);
    colorRef.current = i;
    sessionRef.current?.setProfile(nameRef.current, i);
  };
  const startRound = () => {
    sfxRef.current.resume();
    sessionRef.current?.start(stage);
  };
  const playAgain = () => {
    if (sessionState?.isHost) startRound();
  };
  const backToRoom = () => {
    sessionRef.current?.toLobby();
    setResult(null);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      {!inMatch ? (
        <SquidWarmupRoom
          roster={sessionState!.roster}
          localId={sessionState!.localId}
          hostId={sessionState!.hostId}
          isHost={sessionState!.isHost}
          name={name}
          colorIndex={colorIndex}
          stage={stage}
          joinUrl={joinUrl}
          scores={scores}
          onName={changeName}
          onColor={changeColor}
          onStage={setStage}
          onStart={startRound}
          onKick={(id) => sessionRef.current?.kick(id)}
        />
      ) : (
        <div style={{ position: "relative", width: "100%", maxWidth: SQUID_W, aspectRatio: `${SQUID_W} / ${SQUID_H}` }}>
          <div ref={hostRef} style={{ position: "absolute", inset: 0, borderRadius: 12, overflow: "hidden", background: "#0f172a" }} />

          <div style={{ position: "absolute", left: 12, top: 12, fontFamily: "monospace", fontSize: 22, fontWeight: 700, color: "#fff", pointerEvents: "none" }}>
            ⏱ {formatTimeMs(hud.timeMs)}
          </div>
          <div style={{ position: "absolute", right: 12, top: 12, fontSize: 13, color: "#94a3b8", pointerEvents: "none" }}>
            {hud.myLeg === null ? "Click a leg or press Space to grab one" : `Leg ${hud.myLeg + 1} — Space switches`}
          </div>

          {hud.countdown > 0 && <Countdown n={hud.countdown} />}

          {result && (
            <Overlay>
              {result.result === "finished" ? (
                <>
                  <h2 className="text-4xl font-bold">Finish! 🏁 {formatTimeMs(result.timeMs)}</h2>
                  {result.saved === null && <p className="text-sm text-neutral-300">Saving score…</p>}
                  {result.saved === false && sessionState!.isHost && (
                    <p className="text-sm text-amber-300">Couldn't save the score — the time still counts in your hearts.</p>
                  )}
                  {result.saved === true && <p className="text-sm text-emerald-300">Saved to the team highscores!</p>}
                </>
              ) : (
                <h2 className="text-4xl font-bold">The octopus fell! ☠️</h2>
              )}
              <div className="flex gap-3">
                {sessionState!.isHost && (
                  <button onClick={playAgain} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400">
                    Play again
                  </button>
                )}
                <button onClick={backToRoom} className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10">
                  Back to room
                </button>
              </div>
              {!sessionState!.isHost && <p className="text-sm text-neutral-300">Waiting for the host to restart…</p>}
            </Overlay>
          )}
        </div>
      )}

      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Click a leg (or Space) to grab it · ←/→ swing · hold ↑ to lift, release to plant — walk the octopus to the arch, together.
      </p>
    </div>
  );
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "rgba(15,23,42,0.72)",
        borderRadius: 12,
        color: "#fff",
        textAlign: "center",
        padding: 16,
      }}
    >
      {children}
    </div>
  );
}
```

**Note:** the finish SFX assumes a `"win"` `SfxName` in `src/game/audio/sfx.ts` — check first; if it doesn't exist, use `"go"` for the finish event instead (do NOT add new SFX in this task). Non-host clients don't POST scores (`isHost` guard), so a round produces exactly one write.

- [ ] **Step 4: Typecheck, full suite, commit**

```bash
npx vitest run && npx tsc --noEmit
git add src/components/game/Squid.tsx src/components/game/lobby/SquidWarmupRoom.tsx src/game/squid/net/session.ts
git commit -m "feat(squid): React island — waiting room with stage select + team highscore dashboard, round HUD, result + score reporting"
```

---

### Task 13: Page + arcade registry card

**Files:**
- Create: `src/pages/games/squid.astro`
- Modify: `src/lib/games/registry.ts` (add the squid cabinet — the home page + GameSwitcher pick it up automatically)

- [ ] **Step 1: Add squid to `ARCADE_GAMES`** — in `src/lib/games/registry.ts`, insert after the arena entry:

```ts
  {
    slug: "squid",
    name: "Squid",
    kind: "Co-op walker",
    players: "1–8 players",
    blurb:
      "One octopus, eight legs, zero coordination. Grab a leg each and walk the beast 5 m to the finish arch — mind the gap, and race the team clock.",
    href: "/games/squid",
    status: "live",
    chip: "border-violet-400/40 text-violet-300",
  },
```

Then check how `src/pages/index.astro` renders a cabinet's screen art for live games (`game.slug === "arena" && …` around index.astro:209 pre-refactor): if screens are slug-conditional, the squid card will use whatever fallback non-arena slugs get — acceptable for this round; do NOT build custom cabinet art.

- [ ] **Step 2: Write the page** (mirrors the current `src/pages/games/arena.astro` — a static page beats the `[slug]` dynamic route for live games)

```astro
---
// src/pages/games/squid.astro
import Footer from "../../components/layout/footer.astro";
import Layout from "../../components/layout/layout.astro";
import Squid from "../../components/game/Squid.tsx";
import GameSwitcher from "../../components/games/GameSwitcher.astro";
import LikeButton from "../../components/games/LikeButton.astro";
import { getLikeCounts, getMemberLikedSet } from "../../lib/wix/gameLikes";
import { getSessionMember } from "../../lib/wix/members";

const member = await getSessionMember();
const likeCounts = await getLikeCounts(["squid"]);
const liked = member ? (await getMemberLikedSet(member.id)).has("squid") : false;

const controls = [
  { keys: "Click / Space", action: "Grab a free leg (Space switches)" },
  { keys: "← / →", action: "Swing your leg (planted legs push the body)" },
  { keys: "↑ (hold)", action: "Lift your leg's tip — release to plant it" },
];
---

<Layout
  title="Squid — TeamBuild Games"
  description="Co-op octopus walking, 1–8 players. One leg each, one shared body — reach the finish arch and put your team on the clock."
>
  <div class="mx-auto w-full max-w-4xl px-4 py-10">
    <div class="mb-8">
      <a
        href="/"
        class="font-display text-[9px] text-neutral-500 hover:text-cyan-300"
      >
        &lt; Back to the arcade
      </a>
      <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <h1 class="neon font-display text-2xl text-violet-400 sm:text-3xl">
          Squid
        </h1>
        <div class="flex flex-wrap items-center gap-2 font-display text-[8px]">
          <span class="border border-violet-400/40 px-2 py-1 text-violet-300">
            Co-op walker
          </span>
          <span class="border border-white/15 px-2 py-1 text-neutral-400">
            1–8 players
          </span>
          <span class="border border-amber-400/40 px-2 py-1 text-amber-300">
            Race the clock
          </span>
          <LikeButton
            gameId="squid"
            count={likeCounts.squid ?? 0}
            liked={liked}
            authed={!!member}
          />
        </div>
      </div>
      <p class="mt-3 max-w-2xl text-neutral-400">
        Every player controls one octopus leg — planted legs are the base that
        pushes the body forward. Walk 5 m to the arch as fast as you can; on
        The Gap, don't drop the head in the hole. Finish times go on the team
        highscore board in the waiting room.
      </p>
    </div>

    <div class="mb-6">
      <GameSwitcher slug="squid" />
    </div>

    {/* cabinet bezel around the game island */}
    <div
      class="rounded-2xl border border-violet-400/25 bg-night-900 p-3 shadow-[0_0_48px_rgb(167_139_250/0.12)] sm:p-4"
    >
      <Squid client:only="react" />
    </div>

    {/* controls legend */}
    <section class="mt-8 rounded-xl border border-white/10 bg-night-900 p-6">
      <h2 class="eyebrow text-emerald-400">Controls</h2>
      <dl class="mt-4 grid gap-3 sm:grid-cols-2">
        {
          controls.map((c) => (
            <div class="flex items-center gap-3">
              <dt
                class="shrink-0 rounded border border-white/20 bg-night-800 px-2.5 py-1.5 font-display text-[9px] text-neutral-200"
              >
                {c.keys}
              </dt>
              <dd class="text-sm text-neutral-400">{c.action}</dd>
            </div>
          ))
        }
      </dl>
      <p class="mt-5 text-xs leading-relaxed text-neutral-500">
        Co-op tip: solo is possible (Space hops between legs), but a full party
        moving all eight legs at once is where the chaos — and the fast times —
        live. Only one player can hold a leg at a time.
      </p>
    </section>
  </div>
  <Footer />
</Layout>
```

**Check before committing:** confirm the exact SSR helper names by reading the current `src/pages/games/arena.astro` — `getLikeCounts`/`getMemberLikedSet` usage and the `Layout` props must match it verbatim (they were verified at plan-writing time; the parallel screens work may have touched them).

- [ ] **Step 3: Typecheck + build + commit**

```bash
npx tsc --noEmit && npm run build
git add src/pages/games/squid.astro src/lib/games/registry.ts
git commit -m "feat(squid): /games/squid page + live arcade cabinet card"
```

---

### Task 14: Verification, live playtest, docs

**Files:**
- Modify: `docs/ROADMAP.md` (progress-log entry + a short Track F section)

- [ ] **Step 1: Full verification**

```bash
npx vitest run        # expect: all suites green (~35 new tests on top of the pre-existing count)
npx tsc --noEmit      # expect: clean
npm run build         # expect: green under vite 6.4.3 + @wix/astro
```

- [ ] **Step 2: Live playtest** (`npm run dev`; if the dev server 504s on optimized deps, `rm -rf node_modules/.vite` and restart — known project quirk):

1. Open `/games/squid` → waiting room renders; both highscore panels show empty states; the URL gains `?room=…`.
2. Start Stage 1 solo → tik-tok countdown → the octopus stands (does not collapse or jitter); click a leg → it highlights in your color; ←/→ on a planted leg scoots the body; ↑-lift + → then release steps the leg forward; Space hops to the next leg.
3. Walk to the arch → "Finish!" overlay with a plausible time → "Saved to the team highscores!" → Back to room → the time + your name appear on the Boardwalk board.
4. Start Stage 2 → at the 3 m hole, deliberately lift legs → head drops → "The octopus fell!" overlay; back in the room, no new score was recorded.
5. Second browser joins via the invite link → chime, roster sync; host starts; both players hold different legs (a held leg can't be grabbed); closing the second browser frees its leg mid-round.
6. `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"stageId":"stage1","timeMs":1,"playerNames":["x"]}' <dev-origin>/api/squid-result` → `400` (sanity bounds hold).
7. Zero console errors throughout.

Physics-feel tuning (constants only — `SWING_PLANTED_MPS`, `GRAVITY_MPS2`, `DAMPING`, `GROUND_FRICTION`, `LIFT_MPS`) is expected here; re-run `npx vitest run` after any tuning to keep the feel-contract tests green.

- [ ] **Step 3: Update `docs/ROADMAP.md`** — add a progress-log entry (top of the list, dated, in the log's own voice): Squid shipped — pure verlet co-op walker (`src/game/squid/`), SyncEngine genericized via `SyncAdapter` (arena unchanged — the Overrun open decision now has a shipped answer), `GameScores` top-10-doc persistence + `/api/squid-result`//api/squid-scores`, 2 stages, solo–8p; test count; playtest tuning notes. Also add a short `## Track F — Squid (co-op octopus walker) — SHIPPED` section listing the module map and follow-ups (more stages, Track B per-member stats, touch controls, SFX polish, octopus avatar rendering).

- [ ] **Step 4: Final commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: roadmap — Squid (Track F) shipped"
```

---

## Plan self-review notes (applied during writing)

- **Spec coverage:** stages/geometry (T1), verlet physics + "legs as base" propulsion (T2/T6), 8 legs & one-per-player enforcement (T3/T4), click/Space selection with edge-triggering (T4/T5/T11), hole fail + finish timing (T6), netcode reuse + light generic parameterization + migration-via-snapshot (T7–T9), solo start & leg auto-release on disconnect (T9), waiting room with host stage-select + per-stage top-10 dashboard (T12), trusted persistence with sanity bounds + save-failure UX (T10/T12), page/cabinet/registry + members-registry avatar allowlist (T10/T13), TDD throughout, live playtest + roadmap (T14).
- **Judgment calls encoded:** score storage = one top-10 JSON document per stage (Wix Data query builders don't compose with `auth.elevate` — proven `playerAvatars.ts` pattern; race window accepted for casual play). Countdown stays session-local (arena parity). Squid reuses lobby `hello` with default shape/weapon so `LobbyPlayer` stays untouched.
- **Type consistency:** `SquidIntent.grabLeg?: number` everywhere; `control: (PlayerId | null)[]`; `RoundResult = "finished" | "failed" | null`; `getState().playerIds` added in T12 Step 1 and consumed in the same task; `SyncAdapter` method names identical in T8 (arena) and T9 (squid).





