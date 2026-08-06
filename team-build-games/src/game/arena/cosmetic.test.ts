import { describe, expect, it } from "vitest";
import { coerceShape, DEFAULT_SHAPE, SHAPES } from "./cosmetic";

describe("coerceShape (wire trust boundary for cosmetic shape)", () => {
  it("passes through every known shape", () => {
    for (const s of SHAPES) expect(coerceShape(s)).toBe(s);
  });

  it("falls back to the default for unknown / missing values", () => {
    expect(coerceShape("blob")).toBe(DEFAULT_SHAPE);
    expect(coerceShape(undefined)).toBe(DEFAULT_SHAPE);
    expect(coerceShape(42)).toBe(DEFAULT_SHAPE);
  });
});
