# Squid — rope legs (15 joints, invisible) · Design

**Date:** 2026-07-13 · **Status:** approved by user (15 joints/leg = 3 × 5; joints not rendered)

## Summary

Each octopus leg goes from a 3-point chain to a **15-point rope** so tentacles bend smoothly,
with **no visual markers for any joint** — the extra joints are visible only as a smoother leg
curve. Total leg reach (1.35 m) and the gameplay feel (propulsion, lift, stance, grabbing) are
preserved by attaching forces at the same *fractional positions* along the leg as today.

## Decision locked (user, 2026-07-13)

- **15 joints per leg** (3 × 5), segment length `1.35 / 15 = 0.09 m`.
- **No joint dots** — legs stay pure polylines. The existing colored dot on a *planted tip*
  stays (it signals plant state, not a joint).

## Rig (`constants.ts`, `octopus.ts`, `types.ts`)

- New constant `LEG_JOINTS = 15`; `LEG_SEGMENT_M` becomes `1.35 / LEG_JOINTS` (= 0.09). Keep a
  named `LEG_LENGTH_M = 1.35` so the reach is explicit.
- `POINT_COUNT = 1 + LEG_COUNT * LEG_JOINTS` (= 121). Point layout unchanged in spirit:
  `[0]` = head hub, then each leg's points root→tip contiguously.
- `RIG_CONSTRAINTS`: per leg, head→p0 then p_j→p_{j+1} for j = 0..13 (15 constraints × 8 legs =
  120). Still a static module const; snapshots carry only positions + leg state.
- `Leg.pts` type changes `[number, number, number]` → `number[]` (length `LEG_JOINTS`).
- `buildPoints` interpolates each leg's points at fractions `(j+1)/LEG_JOINTS` from head to the
  fanned tip position (same `tipOffset` fan).

## Anchors — preserving today's dynamics (`octopus.ts`, `sim.ts`)

Three derived anchor indices (exported from `octopus.ts`, computed from `LEG_JOINTS`):

- `TIP = LEG_JOINTS - 1` (index 14) — lift motor target, plant rule, pin, pinned-tip restore.
- `ROOT_ANCHOR = round(LEG_JOINTS / 3) - 1` (index 4, ≈⅓ of the chain) — where today's "root"
  sits. The stance spring pushes head + each planted leg's ROOT_ANCHOR.
- `MID_ANCHOR = round(2 * LEG_JOINTS / 3) - 1` (index 9, ≈⅔) — today's "mid".
- The planted-swing motor pushes exactly `ROOT_ANCHOR` and `MID_ANCHOR` — **two points, same
  fractional positions as today** — so propulsion does not scale with joint count.

All `leg.pts[0] / pts[1] / pts[2]` references in `sim.ts` are replaced by these anchors; no
other motor/plant/fail logic changes.

## Stiffness (`constants.ts`)

`SOLVER_ITERATIONS` 8 → **24** (still a fixed constant → deterministic). Rationale: constraint
corrections propagate ~one link per iteration; 8 iterations cannot rigidify a 15-link chain and
legs would stretch under body weight. Cost stays trivial (121 points × 120 constraints × 24
iterations × 2 substeps per tick).

Retuning is expected and bounded: `STAND_GAIN` / test bands may shift with the new chain
stiffness. The behavioral contracts from the 2026-07-10 round must be re-verified empirically:

- stand band with all legs planted; monotonic sag with fewer planted; zero force with none;
- stage-2 fail reachable (all-lifted over the hole drops below −0.5 m);
- walk speed comparable to the 3-joint rig (modest change acceptable, report numbers);
- no point below the floor under thrash; abandoned lifted legs re-plant;
- determinism (same-input runs deep-equal).

## Rendering & input (`render/scene.ts`)

- `strokeChain` already draws head + `leg.pts` as a polyline — with 15 points the joints appear
  only as a smoother curve. **No circles/markers are added for joints.** Planted-tip dot uses
  `TIP` instead of `pts[2]`.
- Click-to-grab hit-test samples the **lower half** of the chain (indices ≥ `floor(LEG_JOINTS/2)`)
  instead of `pts[1]`/`pts[2]`, keeping the same 0.45 m radius and nearest-leg-wins rule.

## Wire & compatibility

Snapshots already carry the full `points` array and `legs[].pts`; the JSON grows ~5× (~121
points) but remains small for 20 Hz-cadence snapshots. No protocol version bump: squid rounds
are started fresh by `squidStart`, and all peers run the same build in practice. Scores, stages,
lobby, and UI are untouched.

## Error handling

No new failure modes: anchors are compile-time constants; `coerceSquidIntent` and control
reducers are index-based and unchanged (grabLeg indexes legs, not points).

## Testing

- `octopus.test.ts` — 121 points; per leg 15 constraints of 0.09 m; head connects to p0; anchors
  at the expected indices; total reach 1.35 m.
- `sim.test.ts` — existing behavioral suite re-tuned to the new equilibrium (bands re-measured,
  not weakened: each loosened bound needs a measured justification in the implementer report).
- `verlet.test.ts` — unchanged (solver API untouched).
- Renderer/session — type-level only (`pts` array); LocalHub session tests re-run as-is.

## Out of scope

Per-joint rendering effects (taper, gradients); leg self-collision; variable joint counts per
stage; touch controls.

## As built (2026-07-14)

1. **Stance nudge**: the spec's "head + each planted leg's ROOT_ANCHOR" push collapses on rope
   legs — the free joints between head and anchor absorb the lift (measured settle ~0.07 m). As
   built, the nudge lifts the head + each planted leg's upper chain `pts[0..ROOT_ANCHOR]` as one
   block (constraints inside the block stay at rest length, so the solver cancels nothing);
   `STAND_GAIN=80`; measured 8-planted equilibrium ≈0.60 m.
2. **Wire reality**: a rope snapshot encodes to ≈14 KB (was ≈3 KB), and snapshots were being
   broadcast every render frame, not at the "20 Hz cadence" the spec assumed — the engine now
   throttles broadcasts to 20 Hz (≈2.3 Mbps per client; coordinate quantization is the noted
   follow-up if this needs to shrink further).
3. **Test fixture**: the finish-line test teleports the whole rig (`rigAt`) instead of nudging
   the head alone — the 24-iteration solver relaxes a single-point teleport back within one tick.
