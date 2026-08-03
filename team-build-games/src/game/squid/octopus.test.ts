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
