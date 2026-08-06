import { describe, expect, it } from "vitest";
import {
  aimVector,
  clampToField,
  directionAngle,
  directionFromInput,
  directionVector,
  distance,
  isNearNPC,
  stepPosition,
  withinRange,
} from "./logic";
import type { InputState } from "./types";

const NONE: InputState = { up: false, down: false, left: false, right: false };

describe("directionFromInput", () => {
  it("returns zero vector when no keys are pressed", () => {
    expect(directionFromInput(NONE)).toEqual({ x: 0, y: 0 });
  });

  it("opposite keys cancel out", () => {
    expect(directionFromInput({ ...NONE, left: true, right: true })).toEqual({
      x: 0,
      y: 0,
    });
  });

  it("right moves +x, up moves -y (screen coords)", () => {
    expect(directionFromInput({ ...NONE, right: true })).toEqual({ x: 1, y: 0 });
    expect(directionFromInput({ ...NONE, up: true })).toEqual({ x: 0, y: -1 });
  });

  it("normalizes diagonals to unit length (no faster diagonal)", () => {
    const dir = directionFromInput({ ...NONE, right: true, down: true });
    expect(Math.hypot(dir.x, dir.y)).toBeCloseTo(1, 5);
    expect(dir.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(dir.y).toBeCloseTo(Math.SQRT1_2, 5);
  });
});

describe("stepPosition", () => {
  it("advances by speed * dt in the input direction", () => {
    const next = stepPosition({ x: 5, y: 5 }, { ...NONE, right: true }, 0.5, 4);
    expect(next).toEqual({ x: 7, y: 5 }); // 4 m/s * 0.5 s = 2 m
  });

  it("diagonal movement covers the same distance as cardinal", () => {
    const next = stepPosition({ x: 0, y: 0 }, { ...NONE, right: true, up: true }, 1, 4);
    expect(distance({ x: 0, y: 0 }, next)).toBeCloseTo(4, 5);
  });

  it("does not move when no keys are pressed", () => {
    expect(stepPosition({ x: 3, y: 9 }, NONE, 1, 4)).toEqual({ x: 3, y: 9 });
  });
});

describe("clampToField", () => {
  const FIELD = 30;
  const R = 0.25;

  it("keeps an in-bounds position unchanged", () => {
    expect(clampToField({ x: 15, y: 15 }, FIELD, R)).toEqual({ x: 15, y: 15 });
  });

  it("clamps past the far edge to field - radius", () => {
    expect(clampToField({ x: 99, y: 99 }, FIELD, R)).toEqual({
      x: FIELD - R,
      y: FIELD - R,
    });
  });

  it("clamps past the near edge to radius", () => {
    expect(clampToField({ x: -5, y: -5 }, FIELD, R)).toEqual({ x: R, y: R });
  });
});

describe("isNearNPC", () => {
  it("is true within range (inclusive)", () => {
    expect(isNearNPC({ x: 0, y: 0 }, { x: 1, y: 0 }, 1.5)).toBe(true);
    expect(isNearNPC({ x: 0, y: 0 }, { x: 1.5, y: 0 }, 1.5)).toBe(true);
  });

  it("is false beyond range", () => {
    expect(isNearNPC({ x: 0, y: 0 }, { x: 2, y: 0 }, 1.5)).toBe(false);
  });
});

describe("withinRange", () => {
  it("is true at exactly the range (inclusive)", () => {
    expect(withinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 5)).toBe(true);
  });

  it("is false just beyond the range", () => {
    expect(withinRange({ x: 0, y: 0 }, { x: 3, y: 4 }, 4.99)).toBe(false);
  });
});

describe("directionVector", () => {
  it("maps each facing to the right unit vector (y is down)", () => {
    expect(directionVector("right")).toEqual({ x: 1, y: 0 });
    expect(directionVector("left")).toEqual({ x: -1, y: 0 });
    expect(directionVector("down")).toEqual({ x: 0, y: 1 });
    expect(directionVector("up")).toEqual({ x: 0, y: -1 });
  });
});

describe("directionAngle / aimVector (free-aim geometry)", () => {
  it("directionAngle maps a facing to its radians (y is down)", () => {
    expect(directionAngle("right")).toBeCloseTo(0, 5);
    expect(directionAngle("down")).toBeCloseTo(Math.PI / 2, 5);
    expect(directionAngle("up")).toBeCloseTo(-Math.PI / 2, 5);
    expect(Math.abs(directionAngle("left"))).toBeCloseTo(Math.PI, 5);
  });

  it("aimVector is the unit vector for an angle (round-trips with directionAngle)", () => {
    expect(aimVector(0)).toEqual({ x: expect.closeTo(1, 5), y: expect.closeTo(0, 5) });
    const v = aimVector(Math.PI / 4);
    expect(v.x).toBeCloseTo(Math.SQRT1_2, 5);
    expect(v.y).toBeCloseTo(Math.SQRT1_2, 5);
    const down = aimVector(directionAngle("down"));
    expect(down.x).toBeCloseTo(0, 5);
    expect(down.y).toBeCloseTo(1, 5);
  });
});
