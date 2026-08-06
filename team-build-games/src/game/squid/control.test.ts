import { describe, expect, it } from "vitest";
import { claimLeg, cycleLeg, emptyControl, legOf, releasePlayer } from "./control";
import { LEG_COUNT } from "./constants";

describe("leg control", () => {
  it("starts with every leg unheld", () => {
    expect(emptyControl()).toEqual(Array(LEG_COUNT).fill(null));
  });

  it("claims an unheld leg and releases the player's previous leg", () => {
    let c = claimLeg(emptyControl(), "A", 2);
    expect(legOf(c, "A")).toBe(2);
    c = claimLeg(c, "A", 5);
    expect(legOf(c, "A")).toBe(5);
    expect(c[2]).toBeNull();
  });

  it("cannot claim a leg someone else holds", () => {
    let c = claimLeg(emptyControl(), "A", 2);
    c = claimLeg(c, "B", 2);
    expect(legOf(c, "B")).toBeNull();
    expect(legOf(c, "A")).toBe(2);
  });

  it("ignores out-of-range leg indices", () => {
    const c = emptyControl();
    expect(claimLeg(c, "A", -1)).toBe(c);
    expect(claimLeg(c, "A", LEG_COUNT)).toBe(c);
    expect(claimLeg(c, "A", 1.5)).toBe(c);
  });

  it("cycle with no current leg claims the first unheld leg", () => {
    const c = cycleLeg(claimLeg(emptyControl(), "B", 0), "A");
    expect(legOf(c, "A")).toBe(1);
  });

  it("cycle moves to the next unheld leg, skipping held ones and wrapping", () => {
    let c = emptyControl();
    c = claimLeg(c, "A", 6);
    c = claimLeg(c, "B", 7);
    c = cycleLeg(c, "A"); // 7 held by B → wraps to 0
    expect(legOf(c, "A")).toBe(0);
    expect(c[6]).toBeNull();
  });

  it("cycle when every other leg is held keeps the current leg", () => {
    let c = emptyControl();
    for (let i = 0; i < LEG_COUNT; i++) c = claimLeg(c, `P${i}`, i);
    const after = cycleLeg(c, "P3");
    expect(legOf(after, "P3")).toBe(3);
  });

  it("releasePlayer frees the player's leg", () => {
    const c = releasePlayer(claimLeg(emptyControl(), "A", 4), "A");
    expect(c[4]).toBeNull();
  });

  it("claiming a leg you already hold is a no-op (same array)", () => {
    const c = claimLeg(emptyControl(), "A", 2);
    expect(claimLeg(c, "A", 2)).toBe(c);
  });

  it("releasePlayer on a player holding nothing is a no-op (same array)", () => {
    const c = emptyControl();
    expect(releasePlayer(c, "A")).toBe(c);
  });
});
