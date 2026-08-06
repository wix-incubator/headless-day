import { describe, expect, it } from "vitest";
import { screenDeltaToWorldAngle } from "./aim";

// The field is drawn with the y axis foreshortened by Y_SCALE, so a screen delta must be
// un-projected (divide dy by yScale) before taking the angle — otherwise up/down aim is wrong.
describe("screenDeltaToWorldAngle", () => {
  const Y = 0.62;

  it("is 0 aiming straight along +x", () => {
    expect(screenDeltaToWorldAngle(10, 0, Y)).toBeCloseTo(0, 5);
  });

  it("un-squashes a screen delta of (0, yScale) to π/2", () => {
    expect(screenDeltaToWorldAngle(0, Y, Y)).toBeCloseTo(Math.PI / 2, 5);
  });

  it("un-projects a diagonal screen delta to the true 45° world angle", () => {
    // dy on screen is Y_SCALE× the world dy, so 6.2 px down == 10 world units for dx=10 → 45°
    expect(screenDeltaToWorldAngle(10, 6.2, Y)).toBeCloseTo(Math.PI / 4, 5);
  });
});
