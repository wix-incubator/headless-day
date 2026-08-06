# Squid Rope Legs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each octopus leg becomes a 15-joint verlet rope (was 3), bending smoothly, with no visual markers for any joint — forces attach at the same fractional chain positions as today so gameplay feel is preserved.

**Architecture:** All physics in the pure sim core (`src/game/squid/`); a derived-anchor layer (`TIP`, `ROOT_ANCHOR`, `MID_ANCHOR` exported from `octopus.ts`) replaces the hard-coded `pts[0]/pts[1]/pts[2]` so `sim.ts` logic is unchanged in spirit. Renderer already draws legs as polylines, so extra joints appear only as smoother curves. Spec: `docs/superpowers/specs/2026-07-13-squid-rope-legs-design.md`.

**Tech Stack:** TypeScript, Vitest (`npx vitest run --project squid`), Phaser renderer.

## Global Constraints

- Sim core stays pure: no clocks, no `Math.random()`, no DOM/Phaser/network imports; dt injected; fixed `SOLVER_ITERATIONS`/`SUBSTEPS`.
- All tuning numbers live in `src/game/squid/constants.ts`, never inline in sim code.
- Exact values from the spec: `LEG_JOINTS = 15`, `LEG_LENGTH_M = 1.35`, `LEG_SEGMENT_M = LEG_LENGTH_M / LEG_JOINTS` (= 0.09), `SOLVER_ITERATIONS` 8 → `24`, `POINT_COUNT = 1 + LEG_COUNT * LEG_JOINTS` (= 121), anchors `TIP = LEG_JOINTS - 1` (14), `ROOT_ANCHOR = Math.round(LEG_JOINTS / 3) - 1` (4), `MID_ANCHOR = Math.round((2 * LEG_JOINTS) / 3) - 1` (9).
- Behavioral contracts to re-verify (2026-07-10 round): stand band with all planted; monotonic sag with fewer; zero stance force with none planted; stage-2 fail reachable (all-lifted over hole → head < −0.5); walk speed comparable (modest change OK, report numbers); no point below floor; abandoned lifted legs re-plant; determinism.
- Loosening any existing test band requires a measured justification in the implementer report — never a silent rewrite.
- Run tests from the working-tree root: `npx vitest run --project squid`. Worktrees under `.claude/worktrees/` inherit the checked-in `vitest.config.ts` (works as-is). Type-check: `npx tsc --noEmit -p .` (currently zero errors — any error is new).

---

### Task 1: Rope rig + anchor-mapped sim (atomic physics change)

**Files:**
- Modify: `src/game/squid/constants.ts`
- Modify: `src/game/squid/types.ts` (Leg.pts type)
- Modify: `src/game/squid/octopus.ts`
- Modify: `src/game/squid/sim.ts`
- Test: `src/game/squid/octopus.test.ts` (rewrite), `src/game/squid/sim.test.ts` (anchor indexing + band re-measure)

**Interfaces:**
- Produces (Task 2 relies on these exact names): `octopus.ts` exports `TIP: number` (14), `ROOT_ANCHOR: number` (4), `MID_ANCHOR: number` (9) — all are indices INTO `leg.pts`, not into `world.points`; `Leg.pts` is now `number[]` (length `LEG_JOINTS`); `constants.ts` exports `LEG_JOINTS`, `LEG_LENGTH_M` (and still `LEG_SEGMENT_M`, now 0.09).
- This task must land as one commit: rig, types, sim, and tests are mutually dependent (the suite cannot be green in between).

- [ ] **Step 1: Rewrite the rig tests (fail first)**

Replace `src/game/squid/octopus.test.ts` wholesale:

```ts
import { describe, expect, it } from "vitest";
import { buildLegs, buildPoints, HEAD, MID_ANCHOR, POINT_COUNT, RIG_CONSTRAINTS, ROOT_ANCHOR, TIP } from "./octopus";
import { BODY_HEIGHT_M, HEAD_START_X_M, LEG_COUNT, LEG_JOINTS, LEG_LENGTH_M, LEG_SEGMENT_M } from "./constants";

describe("octopus rig — 15-joint rope legs", () => {
  it("has a head hub plus LEG_JOINTS points per leg", () => {
    expect(buildPoints()).toHaveLength(POINT_COUNT);
    expect(POINT_COUNT).toBe(1 + LEG_COUNT * LEG_JOINTS);
    expect(LEG_JOINTS).toBe(15);
  });

  it("spawns the head at the start position, at rest", () => {
    const head = buildPoints()[HEAD]!;
    expect(head.pos).toEqual({ x: HEAD_START_X_M, y: BODY_HEIGHT_M });
    expect(head.prev).toEqual(head.pos);
  });

  it("gives every leg LEG_JOINTS valid, unique point indices with grounded planted tips", () => {
    const legs = buildLegs();
    const pts = buildPoints();
    expect(legs).toHaveLength(LEG_COUNT);
    const seen = new Set<number>();
    for (const leg of legs) {
      expect(leg.pts).toHaveLength(LEG_JOINTS);
      for (const i of leg.pts) {
        expect(i).toBeGreaterThan(HEAD);
        expect(i).toBeLessThan(POINT_COUNT);
        expect(seen.has(i)).toBe(false);
        seen.add(i);
      }
      expect(leg.planted).toBe(true);
      expect(leg.lifted).toBe(false);
      expect(pts[leg.pts[TIP]!]!.pos.y).toBe(0); // tip starts on the ground
    }
  });

  it("chains head→p0→…→p14 per leg at segment length; total reach is LEG_LENGTH_M", () => {
    expect(RIG_CONSTRAINTS).toHaveLength(LEG_COUNT * LEG_JOINTS);
    for (const c of RIG_CONSTRAINTS) expect(c.len).toBeCloseTo(LEG_SEGMENT_M, 10);
    const headCons = RIG_CONSTRAINTS.filter((c) => c.a === HEAD);
    expect(headCons).toHaveLength(LEG_COUNT);
    expect(LEG_JOINTS * LEG_SEGMENT_M).toBeCloseTo(LEG_LENGTH_M, 10);
  });

  it("anchors sit at the same fractional positions as the old 3-joint rig", () => {
    expect(TIP).toBe(LEG_JOINTS - 1);
    expect(ROOT_ANCHOR).toBe(4); // ≈ 1/3 down the chain — the old "root"
    expect(MID_ANCHOR).toBe(9); // ≈ 2/3 — the old "mid"
  });

  it("fans the tips across the head so the stance is stable (some ahead, some behind)", () => {
    const pts = buildPoints();
    const tips = buildLegs().map((l) => pts[l.pts[TIP]!]!.pos.x);
    expect(Math.min(...tips)).toBeLessThan(HEAD_START_X_M);
    expect(Math.max(...tips)).toBeGreaterThan(HEAD_START_X_M);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project squid src/game/squid/octopus.test.ts`
Expected: FAIL — `LEG_JOINTS`/`TIP`/`ROOT_ANCHOR`/`MID_ANCHOR` not exported.

- [ ] **Step 3: Implement constants + types + rig**

`src/game/squid/constants.ts` — replace the leg block and solver constant:

```ts
export const LEG_COUNT = 8;
/** Joints per leg (verlet rope). The old rig had 3; forces attach at the same fractions. */
export const LEG_JOINTS = 15;
/** Total head-to-tip reach — unchanged from the 3-joint rig. */
export const LEG_LENGTH_M = 1.35;
/** One rope segment (head→p0 and each p_j→p_{j+1}). */
export const LEG_SEGMENT_M = LEG_LENGTH_M / LEG_JOINTS;
```

and

```ts
/** Constraint relaxation iterations per substep — FIXED for determinism.
 * 24 (was 8 for 3-joint legs): corrections propagate ~one link per iteration,
 * so a 15-link rope needs more passes or it stretches under body weight. */
export const SOLVER_ITERATIONS = 24;
```

`src/game/squid/types.ts` — the `Leg` interface:

```ts
/** One octopus leg: point indices into world.points, root-nearest-head → tip (length LEG_JOINTS). */
export interface Leg {
  pts: number[];
  /** Tip pinned to the ground (provides support + propulsion leverage). */
  planted: boolean;
  /** Lift key held — tip raised and unpinned. */
  lifted: boolean;
}
```

`src/game/squid/octopus.ts` — full replacement:

```ts
/**
 * Octopus rig: one head hub point + LEG_COUNT rope legs of LEG_JOINTS chained points each.
 * Constraint topology is static and deterministic, so it is a module const and
 * never rides the wire — snapshots only carry point positions + leg state.
 *
 * Anchors are indices INTO leg.pts (chain positions), not into world.points. They sit at
 * the same fractions of the leg as the old 3-joint rig's root/mid/tip, so motors and the
 * stance spring attach exactly where they used to and the feel carries over.
 */

import { BODY_HEIGHT_M, HEAD_START_X_M, LEG_COUNT, LEG_JOINTS, LEG_SEGMENT_M } from "./constants";
import type { DistCon, Leg, VPoint } from "./types";

export const HEAD = 0;
export const POINT_COUNT = 1 + LEG_COUNT * LEG_JOINTS;

/** Chain-position anchors (indices into leg.pts). */
export const TIP = LEG_JOINTS - 1;
export const ROOT_ANCHOR = Math.round(LEG_JOINTS / 3) - 1; // ≈1/3 down the chain — the old "root"
export const MID_ANCHOR = Math.round((2 * LEG_JOINTS) / 3) - 1; // ≈2/3 — the old "mid"

const at = (x: number, y: number): VPoint => ({ pos: { x, y }, prev: { x, y } });

/** Leg k's point indices, root→tip. */
const legPts = (k: number): number[] => Array.from({ length: LEG_JOINTS }, (_, j) => 1 + k * LEG_JOINTS + j);

/** Tip x-offset from the head for leg k: fanned from -0.9 m (behind) to +0.9 m (ahead). */
const tipOffset = (k: number): number => ((k - (LEG_COUNT - 1) / 2) / ((LEG_COUNT - 1) / 2)) * 0.9;

export function buildPoints(): VPoint[] {
  const pts: VPoint[] = [at(HEAD_START_X_M, BODY_HEIGHT_M)];
  for (let k = 0; k < LEG_COUNT; k++) {
    const tipX = HEAD_START_X_M + tipOffset(k);
    // points interpolated from head to tip; the solver settles exact lengths in a few ticks
    for (let j = 0; j < LEG_JOINTS; j++) {
      const f = (j + 1) / LEG_JOINTS;
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
  const p = legPts(k);
  const cons: DistCon[] = [{ a: HEAD, b: p[0]!, len: LEG_SEGMENT_M }];
  for (let j = 0; j + 1 < LEG_JOINTS; j++) cons.push({ a: p[j]!, b: p[j + 1]!, len: LEG_SEGMENT_M });
  return cons;
}).flat();
```

- [ ] **Step 4: Anchor-map `sim.ts`**

In `src/game/squid/sim.ts`, import the anchors: change the octopus import to
`import { HEAD, MID_ANCHOR, RIG_CONSTRAINTS, ROOT_ANCHOR, TIP } from "./octopus";` and make these exact substitutions (logic otherwise untouched):

1. Motor pass — replace `const [root, mid, tip] = leg.pts;` with:

```ts
    const root = leg.pts[ROOT_ANCHOR]!;
    const mid = leg.pts[MID_ANCHOR]!;
    const tip = leg.pts[TIP]!;
```

2. Pins: `pinned[leg.pts[2]] = true;` → `pinned[leg.pts[TIP]!] = true;`
3. Stance nudge: `pts[leg.pts[0]]!.pos.y += dy;` → `pts[leg.pts[ROOT_ANCHOR]!]!.pos.y += dy;` (same ⅓ chain position the old code pushed).
4. Pinned-tip restore: `const i = leg.pts[2];` → `const i = leg.pts[TIP]!;`
5. Plant rule: `const tip = pts[leg.pts[2]]!;` → `const tip = pts[leg.pts[TIP]!]!;`

- [ ] **Step 5: Update sim tests' point indexing**

In `src/game/squid/sim.test.ts`: add `TIP` to the octopus import (`import { HEAD, TIP } from "./octopus";`) and replace every `leg/legs[...]!.pts[2]` with `.pts[TIP]!`. That's the lifted-swing test (tip position twice) and the abandoned-leg test (tip height). The spaghetti-drift test iterates `w.legs[0]!.pts` and needs no change (bound `< 2` still exceeds the 1.35 m reach + slack).

- [ ] **Step 6: Run the full squid project and re-measure bands**

Run: `npx vitest run --project squid`

The rope + 24-iteration solver shifts equilibria. Tuning rules, in order:
1. If the stand-band test (`> 0.55`, `< STAND_HEAD_Y_M + 0.2`) misses: adjust `STAND_GAIN` within 20–80 first; only then move a band edge, and only with the measured settle height stated in your report. Never touch `SUPPORT_PER_LEG_MPS2`.
2. If the head-drift bound (`< 0.15`) breaks: do NOT rewrite the scenario; measure the drift, and loosen at most to 0.2 with the measured value reported.
3. If walking ("propels the body forward", `> x0 + 0.3` in 2 s) fails: `SWING_PLANTED_MPS` may be tuned within 2.2–6.0 (report the value and the measured advance). If it still can't pass, STOP and report BLOCKED with measurements — do not weaken the test.
4. Stage-2 fail and floor-integrity tests must pass unmodified.

Expected: ALL PASS (with any tuning reported).

- [ ] **Step 7: Commit**

```bash
git add src/game/squid/constants.ts src/game/squid/types.ts src/game/squid/octopus.ts src/game/squid/sim.ts src/game/squid/octopus.test.ts src/game/squid/sim.test.ts
git commit -m "feat(squid): rope legs — 15 joints per leg, anchor-mapped motors, 24-iteration solver"
```

---

### Task 2: Renderer hit-test/tip-dot + straggler sweep + docs

**Files:**
- Modify: `src/game/squid/render/scene.ts:76,172-173`
- Modify: `docs/ROADMAP.md` (Track F progress log)

**Interfaces:**
- Consumes: `TIP` from `./octopus` (index into `leg.pts`); `Leg.pts: number[]`.

- [ ] **Step 1: Update the renderer**

In `src/game/squid/render/scene.ts`:

1. Import `TIP` alongside `HEAD`: `import { HEAD, TIP } from "../octopus";`
2. Click-to-grab hit-test (in `create()`'s pointerdown handler) — replace `for (const pi of [leg.pts[1], leg.pts[2]]) {` with:

```ts
        for (const pi of leg.pts.slice(Math.floor(leg.pts.length / 2))) {
```

(lower half of the chain, same 0.45 m radius and nearest-leg-wins rule).
3. Planted-tip dot in `draw()` — replace `const tip = world.points[leg.pts[2]]!.pos;` with `const tip = world.points[leg.pts[TIP]!]!.pos;`

No other renderer changes: `strokeChain` already draws head + all `leg.pts` as a polyline, so the 15 joints render only as a smoother curve, with no dots or markers (the spec's "don't show them visually" requirement). Do NOT add circles for joints.

- [ ] **Step 2: Straggler sweep**

Run: `grep -rn "pts\[0\]\|pts\[1\]\|pts\[2\]" src/game/squid src/components/game`
Expected: no hits outside comments (anchor names only). Fix any straggler the same way (anchor import). Then:

Run: `npx tsc --noEmit -p . && npx vitest run`
Expected: zero tsc errors; full suite green (542+ tests).

- [ ] **Step 3: Update ROADMAP + commit**

Add one Track F progress-log entry dated 2026-07-13: rope legs shipped per `docs/superpowers/specs/2026-07-13-squid-rope-legs-design.md` — 15 joints/leg, anchors at the old root/mid/tip fractions, solver 8→24 iterations, joints invisible (polyline only); note any tuning values changed in Task 1 and that stage times aren't comparable with the 3-joint era. Match the file's existing entry style.

```bash
git add src/game/squid/render/scene.ts docs/ROADMAP.md
git commit -m "feat(squid): rope-leg renderer — lower-half grab hit-test, TIP dot, joints invisible; ROADMAP note"
```
