import { describe, expect, it } from "vitest";
import { survivalHash, survivalRandom } from "./rng";

describe("Survival coordinate-hash RNG", () => {
  it("returns the same value for the same coordinates", () => {
    expect(survivalHash(42, 120, "e1-3", "spawn-angle")).toBe(
      survivalHash(42, 120, "e1-3", "spawn-angle"),
    );
  });

  it("changes when any stable coordinate changes", () => {
    const base = survivalHash(42, 120, "e1-3", 0);
    expect(survivalHash(43, 120, "e1-3", 0)).not.toBe(base);
    expect(survivalHash(42, 121, "e1-3", 0)).not.toBe(base);
    expect(survivalHash(42, 120, "e1-4", 0)).not.toBe(base);
    expect(survivalHash(42, 120, "e1-3", 1)).not.toBe(base);
  });

  it("produces bounded values with a reasonable spread", () => {
    const values = Array.from({ length: 1000 }, (_, i) => survivalRandom(9, i, `e${i}`, "spread"));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });
});
