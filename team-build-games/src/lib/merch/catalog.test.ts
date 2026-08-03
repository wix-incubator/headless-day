import { describe, expect, it } from "vitest";
import {
  clampQty,
  defaultSelection,
  describeSelection,
  formatPrice,
  MAX_QTY,
  normalizeSelection,
  productBySlug,
  selectionColors,
  unitPriceCents,
} from "./catalog";

const tee = productBySlug("tee")!;
const poster = productBySlug("poster")!;

describe("catalog selection", () => {
  it("defaults to the first choice of every option", () => {
    expect(defaultSelection(tee)).toEqual({
      shirtColor: "black",
      printColor: "cyan",
      size: "XS",
    });
  });

  it("normalizes a valid selection and fills missing keys with defaults", () => {
    expect(normalizeSelection(tee, { size: "L" })).toEqual({
      shirtColor: "black",
      printColor: "cyan",
      size: "L",
    });
  });

  it("rejects values outside the option's choices", () => {
    expect(normalizeSelection(tee, { size: "XXXL" })).toBeNull();
    expect(normalizeSelection(tee, { shirtColor: "red" })).toBeNull();
  });
});

describe("pricing", () => {
  it("uses the base price when no deltas apply", () => {
    expect(unitPriceCents(tee, defaultSelection(tee))).toBe(2500);
  });

  it("applies per-choice price deltas (A2 poster upcharge)", () => {
    const a2 = normalizeSelection(poster, { posterSize: "a2" })!;
    expect(unitPriceCents(poster, a2)).toBe(1900 + 600);
  });

  it("formats cents as dollars", () => {
    expect(formatPrice(2500)).toBe("$25.00");
    expect(formatPrice(1234)).toBe("$12.34");
  });
});

describe("clampQty", () => {
  it("clamps into [1, MAX_QTY] and floors decimals", () => {
    expect(clampQty(0)).toBe(1);
    expect(clampQty(3.9)).toBe(3);
    expect(clampQty(999)).toBe(MAX_QTY);
    expect(clampQty("abc")).toBe(1);
  });
});

describe("describeSelection", () => {
  it("renders human-readable labels", () => {
    expect(describeSelection(tee, defaultSelection(tee))).toBe(
      "Arcade black · Neon cyan · XS",
    );
  });
});

describe("keychain product", () => {
  const keychain = productBySlug("keychain");

  it("exists in the catalog", () => {
    expect(keychain).toBeDefined();
  });

  it("has material and printColor options", () => {
    const keys = keychain!.options.map((o) => o.key);
    expect(keys).toContain("material");
    expect(keys).toContain("printColor");
  });

  it("metal material adds a price delta", () => {
    const metalChoice = keychain!.options
      .find((o) => o.key === "material")!
      .choices.find((c) => c.value === "metal")!;
    expect(metalChoice.priceDeltaCents).toBeGreaterThan(0);
  });

  it("base price is correct", () => {
    expect(keychain!.basePriceCents).toBe(900);
  });

  it("default selection includes material=acrylic", () => {
    expect(defaultSelection(keychain!)).toMatchObject({ material: "acrylic" });
  });
});

describe("selectionColors", () => {
  it("resolves the chosen garment + print swatches for a tee", () => {
    const colors = selectionColors(tee, { shirtColor: "white", printColor: "fuchsia", size: "M" });
    expect(colors.garmentColor).toBe("#e8e8ee");
    expect(colors.printColor).toBe("#e879f9");
  });

  it("falls back to a dark garment when the product has no color swatch (poster)", () => {
    const colors = selectionColors(poster, defaultSelection(poster));
    expect(colors.garmentColor).toBe("#0b0b1a");
    expect(colors.printColor).toBe("#22d3ee");
  });
});
