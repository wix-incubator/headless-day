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

  it("is pure: input points are not mutated", () => {
    const input = [p(0, 1), p(2, 1)];
    solve(input, [{ a: 0, b: 1, len: 1 }], [false, false], flat);
    expect(input[0]!.pos).toEqual({ x: 0, y: 1 });
    expect(input[1]!.pos).toEqual({ x: 2, y: 1 });
  });
});
