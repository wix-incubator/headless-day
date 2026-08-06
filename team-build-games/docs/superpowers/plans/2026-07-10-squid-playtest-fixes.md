# Squid Post-Playtest Fixes Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix floor penetration, widen The Gap to 0.9 m, add an active per-planted-leg stance spring, and add a host-only "Next level" button to the finish overlay.

**Architecture:** All physics changes live in the pure sim core (`src/game/squid/`) with unit tests; the UI change is confined to `Squid.tsx` + one pure helper in `stage.ts`. No protocol or net changes — `squidStart` already carries the stage.

**Tech Stack:** TypeScript, Vitest (`npx vitest run --project squid`), React island, Astro. Spec: `docs/superpowers/specs/2026-07-10-squid-playtest-fixes-design.md`.

## Global Constraints

- Sim core stays pure: no clocks, no `Math.random()`, no DOM/Phaser/network imports; `dt` injected; fixed `SOLVER_ITERATIONS`/`SUBSTEPS`.
- Determinism: iterate player intents in sorted `playerIds` order (already the pattern).
- All tuning numbers live in `src/game/squid/constants.ts`, never inline in sim code.
- Run tests from the repo root of the working tree; the squid project is `npx vitest run --project squid`. If working in a worktree under `.claude/worktrees/`, the worktree needs its own `vitest.config.ts` (the parent config excludes `**/.claude/**`) — copy the parent `vitest.config.ts` into the worktree root if tests report "no test files found".
- Type-check with `npx tsc --noEmit -p .` — **2 pre-existing errors in `src/components/game/Arena.tsx` are known and NOT yours to fix**; any new error is.

---

### Task 1: Widen The Gap + `nextStageId` helper

**Files:**
- Modify: `src/game/squid/stage.ts`
- Test: `src/game/squid/stage.test.ts`

**Interfaces:**
- Produces: `nextStageId(id: StageId): StageId | null` (stage1 → "stage2", stage2 → null), `stage2.hole === { x: 3, width: 0.9 }`. Task 4 imports `nextStageId`.
- The renderer already draws ground strips and the hole shaft from `stage.hole` (`render/scene.ts:140-146`) — no renderer change needed.

- [ ] **Step 1: Update stage tests (fail first)**

In `src/game/squid/stage.test.ts`, update the two hole expectations and add `nextStageId` coverage. The file currently checks `{ x: 3, width: 0.5 }` and the 3.0–3.5 span; make it:

```ts
// inside the existing describe — replace the two hole-related tests:
  it("stage defs: stage1 solid, stage2 has the 0.9 m gap", () => {
    expect(stageById("stage1").hole).toBeNull();
    expect(stageById("stage2").hole).toEqual({ x: 3, width: 0.9 });
  });

  it("stage2 ground has no support only inside the 3.0–3.9 m hole", () => {
    const s = stageById("stage2");
    expect(groundYAt(2.99, s)).toBe(0);
    expect(groundYAt(3.0, s)).toBeNull();
    expect(groundYAt(3.45, s)).toBeNull();
    expect(groundYAt(3.9, s)).toBeNull();
    expect(groundYAt(3.91, s)).toBe(0);
  });

  it("nextStageId chains stage1 → stage2 → null", () => {
    expect(nextStageId("stage1")).toBe("stage2");
    expect(nextStageId("stage2")).toBeNull();
  });
```

Add `nextStageId` to the import from `./stage`. Also fix the stage1 flat test if it asserts `groundYAt(3.5, stage1) === 0` style values — stage1 has no hole, so its assertions stay valid; only update lines referencing the old 3.5 boundary for stage2.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project squid src/game/squid/stage.test.ts`
Expected: FAIL — hole width mismatch and `nextStageId` not exported.

- [ ] **Step 3: Implement**

In `src/game/squid/stage.ts`:

```ts
export const STAGES: StageDef[] = [
  { id: "stage1", name: "Boardwalk", hole: null },
  { id: "stage2", name: "The Gap", hole: { x: 3, width: 0.9 } },
];
```

And add (below `coerceStageId`):

```ts
/** The stage after `id` in STAGES order, or null when `id` is the last stage. */
export function nextStageId(id: StageId): StageId | null {
  const i = STAGES.findIndex((s) => s.id === id);
  return i >= 0 && i + 1 < STAGES.length ? STAGES[i + 1]!.id : null;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run --project squid src/game/squid/stage.test.ts`
Expected: PASS. Note: `sim.test.ts` may now fail (its fail-state test teleports the rig to x=3.25 over the old hole) — that test is rewritten in Task 2; a pre-existing-test failure here is expected and must be called out in the commit message, not silently fixed with different geometry.

- [ ] **Step 5: Commit**

```bash
git add src/game/squid/stage.ts src/game/squid/stage.test.ts
git commit -m "feat(squid): widen The Gap to 0.9m + nextStageId helper (sim fail-test updated in next commit)"
```

---

### Task 2: Floor-penetration fix (remove `skipGround`, force-unlift uncontrolled legs)

**Files:**
- Modify: `src/game/squid/verlet.ts` (drop the `skipGround` parameter)
- Modify: `src/game/squid/sim.ts`
- Test: `src/game/squid/sim.test.ts`

**Interfaces:**
- Consumes: Task 1's stage geometry (hole now 3.0–3.9).
- Produces: `solve(points, constraints, pinned, groundAt)` — 4 args, no `skipGround`. Behavior rule for later tasks: a leg with `control[legIdx] === null` is always `lifted: false` after a step; no non-pinned point ever ends a tick below `groundYAt(x)` where ground exists.

Two root causes being fixed (see spec §1): abandoned legs keep `lifted: true` forever (nothing resets it once the controller cycles away), and `skipGround` exempts all 3 points of a lifted leg from the ground clamp so they sink through the boardwalk.

- [ ] **Step 1: Write the failing tests**

Add to `src/game/squid/sim.test.ts` (new describe block), and **replace** the two fail/finish tests that relied on world-mutated `lifted: true` legs with **no controllers** — under the new rule those legs auto-drop, so the tests must hold legs lifted through real controlled intents. Use the existing `rigAt` helper and `run` helper.

New describe block:

```ts
describe("stepSquid — floor integrity & abandoned legs", () => {
  it("no point ever ends a tick below the floor (solo lift+swing thrash)", () => {
    let w = createSquidWorld("stage1", ["A"]);
    const intents = { A: { swing: 1 as const, lift: true, cycle: false, grabLeg: 0 } };
    for (let i = 0; i < 60; i++) {
      w = stepSquid(w, intents, DT);
      for (const p of w.points) expect(p.pos.y).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("a leg abandoned while lifted auto-unlifts and returns to the floor", () => {
    let w = createSquidWorld("stage1", ["A"]);
    // lift leg 0 for a second…
    w = run(w, { A: { ...idle, grabLeg: 0, lift: true } }, 20);
    expect(w.legs[0]!.lifted).toBe(true);
    // …then A cycles away to another leg and goes idle
    w = stepSquid(w, { A: { ...idle, cycle: true } }, DT);
    w = run(w, { A: idle }, 40);
    expect(w.legs[0]!.lifted).toBe(false);
    const tip = w.points[w.legs[0]!.pts[2]]!;
    expect(tip.pos.y).toBeLessThan(0.1); // back down at the floor, not dangling
    expect(tip.pos.y).toBeGreaterThanOrEqual(-1e-9);
  });
});
```

Replace the stage-2 fail test and the stage-1 counterpart (currently they mutate `legs` to `lifted: true` and step with `{}` intents):

```ts
  it("stage2: head over the hole with every leg held lifted falls in ⇒ failed", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    let w = rigAt(createSquidWorld("stage2", ids), 3.45); // center of the 3.0–3.9 gap
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, intents, 80);
    expect(w.result).toBe("failed");
    expect(w.phase).toBe("ended");
    expect(w.points[HEAD]!.pos.y).toBeLessThan(-HEAD_DROP_FAIL_M);
  });

  it("stage1 has no fail state: abandoned legs re-plant and the body just rests", () => {
    let w = rigAt(createSquidWorld("stage1", ["A"]), 3.45);
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, {}, 60); // no controllers ⇒ legs auto-unlift, drop, re-plant
    expect(w.result).toBeNull();
    expect(w.legs.every((l) => !l.lifted)).toBe(true);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project squid src/game/squid/sim.test.ts`
Expected: FAIL — "no point below floor" fails (lifted legs sink via `skipGround`), "abandoned leg" fails (`lifted` stays true).

- [ ] **Step 3: Implement**

`src/game/squid/verlet.ts` — remove the `skipGround` parameter and its doc/branch:

```ts
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
```

…and in the per-point loop delete the line `if (skipGround?.[i] === true) continue;`.

`src/game/squid/sim.ts` — after the "First pass" lift-state loop, add the force-unlift pass:

```ts
  // Any leg nobody controls may not stay lifted — it relaxes, drops, and re-plants.
  for (let legIdx = 0; legIdx < legs.length; legIdx++) {
    if (control[legIdx] === null) legs[legIdx]!.lifted = false;
  }
```

Then delete the `skipGround` array construction (lines building `skipGround`) and change the solve call to `solve(integrate(pts, dt / SUBSTEPS), RIG_CONSTRAINTS, pinned, groundAt)`. Update the section comment: lifted legs stay rig-connected via constraints; the ground now clamps them too (`lifted` only blocks *planting*).

- [ ] **Step 4: Run the full squid project**

Run: `npx vitest run --project squid`
Expected: ALL PASS — including the pre-existing locomotion tests ("lifted leg barely moves body" head-drift `< 0.15` bound, spaghetti-drift, sag). If the head-drift bound breaks, do NOT rewrite the test's scenario — investigate first: ground friction on a still-grounded tip during the first lift ticks is the likely cause and is legitimate physics; loosening `0.15` to `0.2` with a comment is acceptable ONLY if the measured drift stays visibly near-stationary (report the actual drift value when asking the reviewer).

- [ ] **Step 5: Commit**

```bash
git add src/game/squid/verlet.ts src/game/squid/sim.ts src/game/squid/sim.test.ts
git commit -m "fix(squid): legs can no longer sink under the floor; abandoned lifted legs auto-drop"
```

---

### Task 3: Active stance — capped per-planted-leg support spring

**Files:**
- Modify: `src/game/squid/constants.ts`
- Modify: `src/game/squid/sim.ts`
- Test: `src/game/squid/sim.test.ts`

**Interfaces:**
- Consumes: Task 2's sim shape (no `skipGround`; substep loop `integrate` → `solve`).
- Produces: constants `STAND_HEAD_Y_M = 0.75`, `SUPPORT_PER_LEG_MPS2 = 2.5`, `STAND_GAIN = 30`. Behavior: head holds a standing band with all legs planted; zero planted legs ⇒ zero support (fail path unchanged).

- [ ] **Step 1: Write the failing tests**

In `src/game/squid/sim.test.ts`, strengthen the idle-stance test and add cap/no-balloon coverage. Import `STAND_HEAD_Y_M` from `./constants`.

Replace the existing `"stands stable when idle (planted legs support the head)"` test with:

```ts
  it("actively stands on planted legs: head holds a standing band, not a collapse", () => {
    const w0 = createSquidWorld("stage1", ["A"]);
    const w = run(w0, { A: idle }, 120); // 6 s — long past any transient
    const y = w.points[HEAD]!.pos.y;
    expect(y).toBeGreaterThan(0.55); // was collapsing toward ~0.4 before the stance spring
    expect(y).toBeLessThan(STAND_HEAD_Y_M + 0.2); // capped spring — no balloon float
    expect(w.result).toBeNull();
  });
```

Add to the locomotion describe:

```ts
  it("stance force needs planted legs: all-lifted still sags (no anti-gravity)", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    const w0 = createSquidWorld("stage1", ids);
    const y0 = w0.points[HEAD]!.pos.y;
    const w = run(w0, intents, 30);
    expect(w.points[HEAD]!.pos.y).toBeLessThan(y0 - 0.2);
  });
```

(This deliberately duplicates the old sag test's shape — keep the old one too if it still passes; the point is the stance spring must not break it.)

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run --project squid src/game/squid/sim.test.ts`
Expected: FAIL — the standing-band test (head settles too low without the spring). The sag test should already pass.

- [ ] **Step 3: Implement**

`src/game/squid/constants.ts` — add after the leg-motors block:

```ts
// --- active stance (the octopus tries to stand on planted legs) ---
/** Target head ride height the stance spring aims for (slight crouch below the 1.1 m spawn). */
export const STAND_HEAD_Y_M = 0.75;
/** Max upward acceleration each PLANTED leg contributes — zero planted legs ⇒ zero support. */
export const SUPPORT_PER_LEG_MPS2 = 2.5;
/** Stance spring gain: m/s² per meter of height deficit (gravity is 9 — must exceed it within the deficit range). */
export const STAND_GAIN = 30;
```

`src/game/squid/sim.ts` — import the three constants, then replace the substep loop with:

```ts
  let pts = points;
  const sdt = dt / SUBSTEPS;
  const plantedCount = legs.reduce((n, l) => n + (l.planted ? 1 : 0), 0);
  for (let s = 0; s < SUBSTEPS; s++) {
    pts = integrate(pts, sdt);
    // active stance: capped support spring through planted legs — upward only, never a winch
    const head = pts[HEAD]!;
    const deficit = STAND_HEAD_Y_M - head.pos.y;
    if (plantedCount > 0 && deficit > 0) {
      const accel = Math.min(STAND_GAIN * deficit, plantedCount * SUPPORT_PER_LEG_MPS2);
      head.pos.y += accel * sdt * sdt; // position nudge, same style as gravity in integrate()
    }
    pts = solve(pts, RIG_CONSTRAINTS, pinned, groundAt);
  }
```

(`plantedCount` uses the leg state fixed *before* the substeps — planted set doesn't change mid-substep because pins are fixed for the whole step; this keeps the force stable and deterministic.)

- [ ] **Step 4: Run the full squid project + tune if needed**

Run: `npx vitest run --project squid`
Expected: ALL PASS. Tuning rules if the band test misses: adjust `STAND_GAIN` (20–60 range) first, `STAND_HEAD_Y_M` second; do NOT touch `SUPPORT_PER_LEG_MPS2` (it encodes the "~4 planted legs to hold height" balance: 4 × 2.5 = 10 > gravity 9). If the stage-2 fail test from Task 2 now passes/fails differently, planted-count over the hole must be re-checked — the stance force must be exactly 0 in that test (all legs lifted ⇒ 0 planted).

- [ ] **Step 5: Commit**

```bash
git add src/game/squid/constants.ts src/game/squid/sim.ts src/game/squid/sim.test.ts
git commit -m "feat(squid): active stance — capped per-planted-leg support spring"
```

---

### Task 4: "Next level" button on the finish overlay

**Files:**
- Modify: `src/components/game/Squid.tsx`
- Test: `src/game/squid/net/session.test.ts`

**Interfaces:**
- Consumes: `nextStageId` from Task 1; `SquidSession.start(stage)` (already host-gated, no phase gate — callable from `ended`); `getState().stage` is the stage actually being played (not the lobby selector).
- Produces: host-only "Next level ▶" button on the *finished* overlay when `nextStageId(state.stage)` is non-null; clicking broadcasts a normal `squidStart` for the next stage.

- [ ] **Step 1: Write the failing session test**

Add to `src/game/squid/net/session.test.ts` (the session's `phase` field is public and writable — set it to simulate a finished round; reaching a natural finish takes minutes of simulated walking):

```ts
  it("host chains the next stage from the ended phase: everyone re-enters countdown", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    a.start("stage1");
    const epoch1 = a.getState().matchEpoch;
    a.phase = "ended";
    b.phase = "ended";

    a.start("stage2"); // what the Next level button calls
    expect(a.phase).toBe("countdown");
    expect(b.phase).toBe("countdown");
    expect(a.getState().stage).toBe("stage2");
    expect(b.getState().stage).toBe("stage2");
    expect(a.getState().matchEpoch).toBe(epoch1 + 1);
    expect(a.getState().roster.map((p) => p.id)).toEqual(["a", "b"]); // same party
  });
```

- [ ] **Step 2: Run to verify it (likely) passes — then the real red is the UI**

Run: `npx vitest run --project squid src/game/squid/net/session.test.ts`
Expected: PASS already (no session change needed — that's the point of the test: it pins the behavior the button depends on). This is a characterization test, not TDD red; the UI wiring below has no unit test (it's covered by the live playtest in the verify step after the plan).

- [ ] **Step 3: Implement the button**

`src/components/game/Squid.tsx`:

1. Extend the stage import: `import { STAGES, nextStageId } from "../../game/squid/stage";`
2. Next to `playAgain` (line ~197), add:

```tsx
  const startNextLevel = () => {
    const state = sessionRef.current?.getState();
    if (!state?.isHost) return;
    const next = nextStageId(state.stage);
    if (!next) return;
    setStage(next); // keep the lobby selector + "Play again" in sync with what we're playing
    sfxRef.current.resume();
    sessionRef.current?.start(next);
  };
```

3. In the result overlay's button row (currently `Play again` + `Back to room`), insert the button FIRST, only in the finished branch context:

```tsx
              <div className="flex gap-3">
                {sessionState!.isHost && result.result === "finished" && nextStageId(sessionState!.stage) && (
                  <button onClick={startNextLevel} className="rounded-lg bg-emerald-500 px-5 py-2 font-semibold text-white hover:bg-emerald-400">
                    Next level ▶
                  </button>
                )}
                {sessionState!.isHost && (
                  <button onClick={playAgain} className="rounded-lg bg-sky-500 px-5 py-2 font-semibold text-white hover:bg-sky-400">
                    Play again
                  </button>
                )}
                <button onClick={backToRoom} className="rounded-lg border border-white/40 px-5 py-2 font-semibold text-white hover:bg-white/10">
                  Back to room
                </button>
              </div>
```

Overlay reset on chain: `session.start()` → `beginRound` bumps `matchEpoch` → `gameKey` changes → the Phaser-recreate effect (line ~133) runs `setResult(null)` + `setHud(FRESH_HUD)`. Verify this by reading that effect — no extra state change should be needed. The score-post guard (`postedEpochRef`) is per-epoch, so the stage-2 finish posts its own score.

- [ ] **Step 4: Type-check and run the suite**

Run: `npx tsc --noEmit -p . ; npx vitest run --project squid`
Expected: no NEW tsc errors (the 2 pre-existing `Arena.tsx` errors remain); all squid tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/game/Squid.tsx src/game/squid/net/session.test.ts
git commit -m "feat(squid): host-only Next level button chains stages from the finish overlay"
```

---

### Task 5: Docs + full-suite gate

**Files:**
- Modify: `docs/ROADMAP.md` (Track F)

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Update ROADMAP Track F**

In `docs/ROADMAP.md`, Track F (Squid): mark the "collapsed stance" and "abandoned sticky-lifted legs dangle below the floor" follow-ups as fixed (stance spring + force-unlift, this plan); note The Gap is now 0.9 m and stages chain via the Next level button. Add a progress-log entry dated 2026-07-10 referencing `docs/superpowers/specs/2026-07-10-squid-playtest-fixes-design.md`. Keep the remaining open items (touch controls, SFX polish, WASD aliases, "solo wall" — re-evaluate after playtest).

- [ ] **Step 2: Full test suite**

Run: `npx vitest run`
Expected: ALL projects pass (arena/members/merch/squid — 326+ tests).

- [ ] **Step 3: Commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: ROADMAP Track F — stance + floor fixes landed, Gap 0.9m, level chaining"
```
