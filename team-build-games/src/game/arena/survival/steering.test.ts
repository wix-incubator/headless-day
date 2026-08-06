import { describe, expect, it } from "vitest";
import { nearestPlayer, separation, stepToward } from "./steering";

describe("survival steering (pure)", () => {
  it("nearestPlayer returns the closest ALIVE player, ignoring the dead", () => {
    const players = [
      { id: "a", pos: { x: 0, y: 0 }, status: "alive" as const },
      { id: "b", pos: { x: 10, y: 0 }, status: "alive" as const },
      { id: "c", pos: { x: 0.2, y: 0 }, status: "dead" as const }, // closer, but dead
    ];
    expect(nearestPlayer({ x: 0.5, y: 0 }, players)?.id).toBe("a");
  });

  it("nearestPlayer returns null when nobody is alive", () => {
    expect(nearestPlayer({ x: 0, y: 0 }, [{ id: "a", pos: { x: 1, y: 1 }, status: "dead" as const }])).toBeNull();
  });

  it("stepToward moves exactly `dist` metres toward the target", () => {
    const p = stepToward({ x: 0, y: 0 }, { x: 10, y: 0 }, 3);
    expect(p.x).toBeCloseTo(3, 5);
    expect(p.y).toBeCloseTo(0, 5);
  });

  it("stepToward snaps to the target when it's within one step", () => {
    expect(stepToward({ x: 0, y: 0 }, { x: 2, y: 0 }, 5)).toEqual({ x: 2, y: 0 });
  });

  it("separation pushes away from a too-close neighbour and is zero when clear", () => {
    const push = separation({ x: 0, y: 0 }, [{ x: 0.3, y: 0 }], 1);
    expect(push.x).toBeLessThan(0); // neighbour is at +x → pushed toward -x
    expect(separation({ x: 0, y: 0 }, [{ x: 5, y: 0 }], 1)).toEqual({ x: 0, y: 0 });
  });
});
