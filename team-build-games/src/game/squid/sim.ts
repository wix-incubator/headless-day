// src/game/squid/sim.ts
/**
 * stepSquid — the deterministic heart of the squid game. Pure: no clock, no RNG,
 * no engine imports; dt injected; fixed substeps/iterations. Mirrors the arena's
 * stepWorld contract so the (generic) SyncEngine can drive either game.
 */

import {
  FINISH_X_M,
  HEAD_DROP_FAIL_M,
  LIFT_MPS,
  LIFT_TIP_BELOW_HEAD_M,
  PLANT_EPS_M,
  STAND_GAIN,
  STAND_HEAD_Y_M,
  SUBSTEPS,
  SUPPORT_PER_LEG_MPS2,
  SWING_LIFTED_MPS,
  SWING_PLANTED_MPS,
} from "./constants";
import { claimLeg, cycleLeg, legOf } from "./control";
import { HEAD, MID_ANCHOR, RIG_CONSTRAINTS, ROOT_ANCHOR, TIP } from "./octopus";
import { groundYAt, stageById } from "./stage";
import { integrate, solve } from "./verlet";
import type { PlayerId, RoundResult, SquidIntent, SquidWorld, VPoint } from "./types";

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

  // First pass: update lift state from player intents
  for (const id of world.playerIds) {
    const intent = intentsById[id];
    const legIdx = legOf(control, id);
    if (!intent || legIdx === null) continue;
    const leg = legs[legIdx]!;
    leg.lifted = intent.lift;
    if (leg.lifted) leg.planted = false;
  }

  // Any leg nobody controls may not stay lifted — it relaxes, drops, and re-plants.
  for (let legIdx = 0; legIdx < legs.length; legIdx++) {
    if (control[legIdx] === null) legs[legIdx]!.lifted = false;
  }

  // Second pass: apply motors — lifted legs get tip raised; planted legs get propulsion push
  for (let legIdx = 0; legIdx < legs.length; legIdx++) {
    const leg = legs[legIdx]!;
    const root = leg.pts[ROOT_ANCHOR]!;
    const mid = leg.pts[MID_ANCHOR]!;
    const tip = leg.pts[TIP]!;

    if (leg.lifted) {
      // raise the tip toward the body (position nudge — verlet turns it into velocity)
      const t = points[tip]!;
      const tipCap = points[HEAD]!.pos.y - LIFT_TIP_BELOW_HEAD_M;
      t.pos.y = Math.min(tipCap, t.pos.y + LIFT_MPS * dt);
      // swing only applied when a player actively controls the leg with a swing intent
      const controllerId = control[legIdx];
      if (controllerId !== null) {
        const intent = intentsById[controllerId];
        if (intent?.swing) t.pos.x += intent.swing * SWING_LIFTED_MPS * dt;
      }
    } else if (leg.planted) {
      // swing push: only from the controlling player's intent
      const controllerId = control[legIdx];
      if (controllerId !== null) {
        const intent = intentsById[controllerId];
        if (intent?.swing) {
          for (const i of [root, mid]) points[i]!.pos.x += intent.swing * SWING_PLANTED_MPS * dt;
        }
      }
    }
  }

  // 3) physics: substepped integrate + solve, pins = planted tips
  // Lifted legs stay fully connected to the rig via RIG_CONSTRAINTS so the chain never
  // detaches (no spaghetti drift). The ground now clamps every non-pinned point,
  // lifted legs included — `lifted` only blocks *planting*, it no longer exempts a leg
  // from ground collision, so a lifted leg simply rests on the floor if it sinks to it.
  const pinned: boolean[] = Array(points.length).fill(false);
  for (const leg of legs) if (leg.planted) pinned[leg.pts[TIP]!] = true;
  let pts = points;
  const sdt = dt / SUBSTEPS;
  const plantedCount = legs.reduce((n, l) => n + (l.planted ? 1 : 0), 0);
  for (let s = 0; s < SUBSTEPS; s++) {
    pts = integrate(pts, sdt);
    // active stance: capped support spring through planted legs — upward only, never a winch.
    // Nudging HEAD (or HEAD + a single deep anchor) gets almost entirely cancelled by solve():
    // with a 15-link rope, moving HEAD up while the joints below stay put leaves every
    // intervening head→p0→…→ROOT_ANCHOR constraint stretched, and each one's Gauss-Seidel
    // correction pulls HEAD back down toward the (unmoved) chain — the old rig hid this because
    // its "root" sat one link from the head. Fix: lift HEAD *and the whole upper chain*
    // (points 0..ROOT_ANCHOR) of each PLANTED leg as one rigid block. Every constraint *inside*
    // that block keeps its rest length, so solve() has nothing to cancel there; only the single
    // block→below link (ROOT_ANCHOR→ROOT_ANCHOR+1) is stretched, and it sits deep enough that the
    // compliant rope below (which stays taut to the pinned tip, providing the support ceiling)
    // absorbs it gently instead of dragging the head back to the floor. Lifted/unplanted legs are
    // left alone so they still sag and re-plant; the legs below ROOT_ANCHOR stay free rope, so
    // they still bend and swing visibly.
    const deficit = STAND_HEAD_Y_M - pts[HEAD]!.pos.y;
    if (plantedCount > 0 && deficit > 0) {
      const accel = Math.min(STAND_GAIN * deficit, plantedCount * SUPPORT_PER_LEG_MPS2);
      const dy = accel * sdt * sdt; // position nudge, same style as gravity in integrate()
      pts[HEAD]!.pos.y += dy;
      for (const leg of legs) {
        if (!leg.planted) continue;
        for (let j = 0; j <= ROOT_ANCHOR; j++) pts[leg.pts[j]!]!.pos.y += dy;
      }
    }
    pts = solve(pts, RIG_CONSTRAINTS, pinned, groundAt);
  }
  // pinned tips must not drift (integrate moves everything): restore them
  for (const leg of legs) {
    if (leg.planted) {
      const i = leg.pts[TIP]!;
      pts[i] = { pos: { ...world.points[i]!.pos }, prev: { ...world.points[i]!.pos } };
    }
  }

  // 4) plant rule
  for (const leg of legs) {
    const tip = pts[leg.pts[TIP]!]!;
    const g = groundAt(tip.pos.x);
    if (leg.lifted || g === null) leg.planted = false;
    else if (tip.pos.y <= g + PLANT_EPS_M) leg.planted = true;
  }

  // 5) clock + fail/finish
  const elapsedS = world.elapsedS + dt;
  const head = pts[HEAD]!;
  let result: RoundResult = world.result;
  if (head.pos.y < -HEAD_DROP_FAIL_M) result = "failed";
  else if (head.pos.x >= FINISH_X_M) result = "finished";

  return {
    ...world,
    tick: world.tick + 1,
    points: pts,
    legs,
    control,
    elapsedS,
    result,
    phase: result !== null ? "ended" : "playing",
  };
}
