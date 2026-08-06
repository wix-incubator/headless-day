# Squid — post-playtest fixes round 2 · Design

**Date:** 2026-07-10 · **Status:** approved by user (next-level flow, hole width, stance approach)

## Summary

Four fixes to the shipped Squid game, from the user's live playtest:

1. **Legs can no longer go under the floor** (bug fix).
2. **The Gap (stage 2) gets harder:** hole widens 0.5 m → 0.9 m.
3. **"Next level" button** on the finish overlay when a next stage exists (host-only).
4. **Active stance:** the octopus tries to stand on its planted legs with a limited,
   per-leg-capped force — balanced between legs, holding some height above the floor,
   explicitly *not* balloon-like.

## Decisions locked (user, 2026-07-10)

- **Next level flow:** host-only button on the *finished* overlay; clicking sends the normal
  `squidStart` for the next stage — every peer drops straight into the next countdown with the
  same roster. Non-hosts keep only "Back to room". Last stage → no button. Each stage still
  scores separately.
- **Hole width:** 0.9 m (span 3.0–3.9 m). Legs are 1.35 m, so crossing demands a real
  reach-across; the head (Ø 0.7 m) still fits through, so failing stays possible.
- **Stance model:** capped per-planted-leg support spring on the head (approach A).
  Rejected: root↔tip straightness constraints (solver-iteration-sensitive, pogo-stick
  artifacts, hard to bound the force).

## 1. Floor-penetration fix (`sim.ts`, `verlet.ts`)

Two root causes:

- **Abandoned lifted legs stay lifted forever.** `leg.lifted` is only written by the leg's
  *current* controller's intent; a player who lifts a leg and Space-cycles away leaves it
  lifted permanently → it dangles and skips ground collision (ROADMAP Track F
  "sticky lifted legs").
- **`skipGround` lets lifted-leg points sink below y=0.** All 3 points of a lifted leg skip
  the ground clamp, so mid-swing they clip through the boardwalk.

Fix:

- **Force-unlift uncontrolled legs:** in the lift-state pass, any leg whose index has no
  controller in `control` gets `lifted = false`. It relaxes, falls, and re-plants —
  self-healing.
- **Remove `skipGround` entirely:** `solve()` drops the parameter; ground clamps every
  non-pinned point always. `lifted` only prevents *planting* (the plant rule already checks
  it), so the clamp doesn't fight the lift — a lifted tip is being raised above ground anyway.
  Worst case is a foot dragging along the floor, which is physically correct.

## 2. The Gap widens (`stage.ts`)

`stage2.hole` becomes `{ x: 3, width: 0.9 }`. Data-only; renderer and `groundYAt` already
consume stage data. Update stage tests.

## 3. Active stance (`sim.ts`, `constants.ts`)

New constants:

- `STAND_HEAD_Y_M = 0.75` — target ride height (slight crouch below the 1.1 m spawn).
- `SUPPORT_PER_LEG_MPS2 = 2.5` — max upward acceleration contributed per planted leg.
- `STAND_GAIN = 30` — spring gain `K` in (m/s²) per meter of height deficit; starting value,
  playtest-tunable. (Gravity is 9 m/s²; a gain of 10 could never overcome it within a 0.75 m
  deficit.) The per-leg cap is what bounds the force, not the gain.

Each physics substep, before `solve`:

- Count planted legs `N`. If `N ≥ 1` and `head.pos.y < STAND_HEAD_Y_M`, nudge the head up by
  `min(K · (STAND_HEAD_Y_M − head.y), N · SUPPORT_PER_LEG_MPS2) · dt²` (same position-nudge
  style as the existing motors). **Upward only — never pulls down.**

Why this satisfies "legs as base, not a balloon":

- **Zero planted legs → zero support.** Over the hole, or with everything lifted, it falls
  exactly as today.
- With gravity 9 m/s², ~4 planted legs are needed to hold height; 2–3 planted → slow sag;
  lift too many legs mid-Gap and you drop. The cap prevents winching upward.
- The verlet constraints transmit the hover through the legs, so they visibly straighten
  under load.

Also addresses ROADMAP Track F "collapsed stance" and partially "solo wall at The Gap".

## 4. Next level button (`stage.ts`, `Squid.tsx`)

- `stage.ts`: `nextStageId(id: StageId): StageId | null` — stage1 → stage2, stage2 → null
  (derived from `STAGES` order, not hard-coded pairs).
- `Squid.tsx` result overlay: when `result === "finished"` **and** local player is host
  **and** `nextStageId(stage)` is non-null → "Next level ▶" button calling
  `session.start(nextStage)`. No protocol change — `squidStart` already carries the stage.
- Verify overlay/local state resets on `matchEpoch` bump (the `postedEpochRef` guard already
  prevents double score posts).

## Error handling

- Host leaves on the ended screen → host migrates as today; the new host's overlay shows the
  button (it re-renders from `getState()`).
- `start()` is already host-gated in the session; a stale non-host click is a no-op.
- Stance force with no planted legs is exactly zero — no new fail-state edge cases.

## Testing

Vitest, colocated:

- `sim.test.ts` — uncontrolled lifted leg re-plants within a bounded number of ticks; no point
  ever ends a tick below `groundYAt(x)` outside the hole; with all legs planted the head holds
  a band around `STAND_HEAD_Y_M`; with ≤2 planted it sags; with none planted over the hole it
  still fails. Existing finish/fail/head-drift tests re-tuned if the stance shifts them.
- `verlet.test.ts` — `solve()` signature change (drop `skipGround`); ground clamp holds for
  all non-pinned points.
- `stage.test.ts` — 0.9 m span; `nextStageId` for both stages.
- `session.test.ts` — host `start(stage2)` from the ended phase re-enters countdown on all
  peers with the same roster.

## Out of scope

More stages; retry button on fail; carrying a cumulative timer across levels; touch controls;
other ROADMAP Track F items not listed above.

## As built (2026-07-10)

§3's sketch nudges only `head.pos.y`; measured, that plateaus at 0.444 m regardless of `K` —
the constraint solver's rigid leg chains cancel a head-only push back out. Fix: apply the same
capped nudge to the head **and** to each planted leg's root point, so the lift is shared through
the chain instead of fought by it. Final constants: `STAND_HEAD_Y_M=0.75`,
`SUPPORT_PER_LEG_MPS2=2.5`, `STAND_GAIN=50` (raised from the sketch's 30 to compensate for the
force now being split across more points). Measured equilibrium ≈0.575 m head height with all 8
legs planted; sags monotonically as fewer legs are planted; exactly zero net force with zero
planted, preserving the "legs as base, not a balloon" property.
