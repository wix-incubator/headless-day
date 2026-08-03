import { describe, expect, it } from "vitest";
import { screenDeltaToWorldAngle } from "./mouse";

// The field is drawn with the y axis foreshortened by Y_SCALE, so a screen delta must be
// un-projected (divide dy by yScale) before taking the angle — otherwise up/down aim is wrong.
describe("screenDeltaToWorldAngle", () => {
  const Y = 0.62;

  it("is 0 aiming straight right and ±π/2 aiming straight down/up", () => {
    expect(screenDeltaToWorldAngle(10, 0, Y)).toBeCloseTo(0, 5);
    expect(screenDeltaToWorldAngle(0, 10, Y)).toBeCloseTo(Math.PI / 2, 5);
    expect(screenDeltaToWorldAngle(0, -10, Y)).toBeCloseTo(-Math.PI / 2, 5);
  });

  it("un-projects the foreshortened y so a squashed screen delta reads as 45° in world space", () => {
    // dy on screen is Y_SCALE× the world dy, so 6.2 px down == 10 world units for dx=10 → 45°
    expect(screenDeltaToWorldAngle(10, 6.2, Y)).toBeCloseTo(Math.PI / 4, 5);
  });
});
