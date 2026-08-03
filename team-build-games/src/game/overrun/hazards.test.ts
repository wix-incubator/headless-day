import { describe, expect, it } from "vitest";
import { stepHazard, hazardActive } from "./hazards";
import type { Hazard } from "./types";

const pool = (over: Partial<Hazard> = {}): Hazard => ({
  id: "hz0", kind: "spit", pos: { x: 5, y: 5 }, radius: 2,
  telegraph: 0.8, duration: 2.5, dps: 22, ...over,
});
const blast = (over: Partial<Hazard> = {}): Hazard => ({
  id: "hz1", kind: "blast", pos: { x: 5, y: 5 }, radius: 3,
  telegraph: 0.5, duration: 0, dps: 0, burst: 35, ...over,
});

describe("hazardActive", () => {
  it("is inert while telegraphing, dangerous once the warning elapses", () => {
    expect(hazardActive(pool({ telegraph: 0.8 }))).toBe(false);
    expect(hazardActive(pool({ telegraph: 0 }))).toBe(true);
  });
});

describe("stepHazard — pool (continuous dps)", () => {
  it("counts the telegraph down first, without touching the active duration or detonating", () => {
    const { hazard, detonated } = stepHazard(pool({ telegraph: 0.8, duration: 2.5 }), 0.5);
    expect(hazard!.telegraph).toBeCloseTo(0.3, 5);
    expect(hazard!.duration).toBeCloseTo(2.5, 5); // duration only burns while active
    expect(detonated).toBe(false);
    expect(hazardActive(hazard!)).toBe(false);
  });

  it("floors the telegraph at 0 (goes active) without over-spending dt into the duration", () => {
    const { hazard } = stepHazard(pool({ telegraph: 0.2, duration: 2.5 }), 0.5);
    expect(hazard!.telegraph).toBe(0);
    expect(hazard!.duration).toBeCloseTo(2.5, 5); // the 0.3s overshoot is NOT charged to duration
    expect(hazardActive(hazard!)).toBe(true);
  });

  it("burns the active duration down once telegraphing is done", () => {
    const { hazard } = stepHazard(pool({ telegraph: 0, duration: 2.5 }), 0.5);
    expect(hazard!.telegraph).toBe(0);
    expect(hazard!.duration).toBeCloseTo(2.0, 5);
  });

  it("returns null when the active duration is spent (hazard removed)", () => {
    expect(stepHazard(pool({ telegraph: 0, duration: 0.3 }), 0.5).hazard).toBe(null);
  });
});

describe("stepHazard — blast (one-shot burst)", () => {
  it("only ticks its fuse while telegraphing, without detonating", () => {
    const { hazard, detonated } = stepHazard(blast({ telegraph: 0.5 }), 0.1);
    expect(hazard!.telegraph).toBeCloseTo(0.4, 5);
    expect(detonated).toBe(false);
  });

  it("detonates and is spent (hazard=null) on the tick its fuse elapses", () => {
    const { hazard, detonated } = stepHazard(blast({ telegraph: 0.05 }), 0.1);
    expect(detonated).toBe(true);
    expect(hazard).toBe(null); // a burst never enters an active-duration phase — it's gone after the hit
  });
});
