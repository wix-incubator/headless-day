import { describe, expect, it } from "vitest";
import { carImpactDamage, classifyBumper, impactDamage, pairKey } from "./collision";
import { createRoadWorld } from "./match";

describe("Road Madness bumper damage", () => {
  it("classifies front, rear, and side arcs", () => {
    expect(classifyBumper(0, { x: 1, y: 0 })).toBe("front");
    expect(classifyBumper(0, { x: -1, y: 0 })).toBe("rear");
    expect(classifyBumper(0, { x: 0, y: 1 })).toBe("side");
  });

  it("requires a qualifying bumper and minimum speed", () => {
    const common = {
      alignment: 1,
      attackerMass: 1,
      targetMass: 1,
      frontMultiplier: 1,
      rearMultiplier: 0.6,
    };
    expect(impactDamage({ ...common, closingSpeed: 2.9, bumper: "front" })).toBe(0);
    expect(impactDamage({ ...common, closingSpeed: 10, bumper: "side" })).toBe(0);
    expect(impactDamage({ ...common, closingSpeed: 10, bumper: "front" })).toBeGreaterThan(0);
  });

  it("scales with speed, angle, bumper, and mass", () => {
    const base = {
      attackerMass: 1,
      targetMass: 1,
      frontMultiplier: 1,
      rearMultiplier: 0.6,
    };
    const low = impactDamage({ ...base, closingSpeed: 6, bumper: "front", alignment: 1 });
    const fast = impactDamage({ ...base, closingSpeed: 10, bumper: "front", alignment: 1 });
    const angled = impactDamage({ ...base, closingSpeed: 10, bumper: "front", alignment: 0.7 });
    const rear = impactDamage({ ...base, closingSpeed: 10, bumper: "rear", alignment: -1 });
    const heavy = impactDamage({
      ...base,
      closingSpeed: 10,
      bumper: "front",
      alignment: 1,
      attackerMass: 1.5,
    });
    expect(fast).toBeGreaterThan(low);
    expect(fast).toBeGreaterThan(angled);
    expect(fast).toBeGreaterThan(rear);
    expect(heavy).toBeGreaterThan(fast);
  });

  it("gives the monster truck a stronger clean ram", () => {
    const world = createRoadWorld([
      { id: "derby", vehicle: "derby" },
      { id: "monster", vehicle: "monster" },
      { id: "target", vehicle: "derby" },
    ]);
    const target = world.cars.target!;
    const derby = { ...world.cars.derby!, heading: 0 };
    const monster = { ...world.cars.monster!, heading: 0 };
    const direction = { x: 1, y: 0 };
    expect(carImpactDamage(monster, target, direction, 8).damage).toBeGreaterThan(
      carImpactDamage(derby, target, direction, 8).damage,
    );
  });

  it("makes unordered pair keys stable", () => {
    expect(pairKey("bravo", "alpha")).toBe("alpha|bravo");
    expect(pairKey("alpha", "bravo")).toBe("alpha|bravo");
  });
});

