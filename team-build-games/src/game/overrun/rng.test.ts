import { describe, expect, it } from "vitest";
import { hash01 } from "./rng";

describe("hash01 (coordinate-hash RNG)", () => {
  it("is deterministic for identical coordinates", () => {
    expect(hash01(42, 100, "p1", 0)).toBe(hash01(42, 100, "p1", 0));
  });

  it("returns values in [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const v = hash01(7, i, "salt");
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("is roughly uniform (mean of 1000 draws near 0.5)", () => {
    let sum = 0;
    for (let i = 0; i < 1000; i++) sum += hash01(123, i);
    expect(sum / 1000).toBeGreaterThan(0.45);
    expect(sum / 1000).toBeLessThan(0.55);
  });

  it("changes with every coordinate: seed, tick, id, salt", () => {
    const base = hash01(1, 50, "e7", "drop");
    expect(hash01(2, 50, "e7", "drop")).not.toBe(base);
    expect(hash01(1, 51, "e7", "drop")).not.toBe(base);
    expect(hash01(1, 50, "e8", "drop")).not.toBe(base);
    expect(hash01(1, 50, "e7", "gun")).not.toBe(base);
  });

  it("draws are independent: one draw's coords never shift another's value", () => {
    // No cursor: the value for (seed,tick,id) is a pure function of those coords,
    // regardless of how many OTHER draws happen "before" it.
    const v = hash01(9, 10, "p2", 3);
    hash01(9, 10, "p1", 0); // an "upstream" draw
    hash01(9, 10, "p1", 1);
    expect(hash01(9, 10, "p2", 3)).toBe(v);
  });

  it("distinguishes string coords from their lengths/concatenations", () => {
    expect(hash01(1, "ab", "c")).not.toBe(hash01(1, "a", "bc"));
  });
});
