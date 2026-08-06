import { describe, expect, it } from "vitest";
import { coerceSquidIntent, initialSquidMemory, squidInputToIntent } from "./intent";
import type { RawSquidInput } from "./types";

const raw = (o: Partial<RawSquidInput> = {}): RawSquidInput => ({
  left: false, right: false, lift: false, cycle: false, grabLeg: null, ...o,
});

describe("squidInputToIntent", () => {
  it("maps left/right to swing, cancelling when both held", () => {
    const m = initialSquidMemory();
    expect(squidInputToIntent(raw({ left: true }), m).intent.swing).toBe(-1);
    expect(squidInputToIntent(raw({ right: true }), m).intent.swing).toBe(1);
    expect(squidInputToIntent(raw({ left: true, right: true }), m).intent.swing).toBe(0);
  });

  it("cycle is edge-triggered: fires once per press, not per held frame", () => {
    let mem = initialSquidMemory();
    const first = squidInputToIntent(raw({ cycle: true }), mem);
    expect(first.intent.cycle).toBe(true);
    const second = squidInputToIntent(raw({ cycle: true }), first.memory);
    expect(second.intent.cycle).toBe(false);
    const released = squidInputToIntent(raw(), second.memory);
    const again = squidInputToIntent(raw({ cycle: true }), released.memory);
    expect(again.intent.cycle).toBe(true);
  });

  it("passes grabLeg through (null → undefined)", () => {
    const m = initialSquidMemory();
    expect(squidInputToIntent(raw({ grabLeg: 3 }), m).intent.grabLeg).toBe(3);
    expect(squidInputToIntent(raw(), m).intent.grabLeg).toBeUndefined();
  });
});

describe("coerceSquidIntent", () => {
  it("normalizes garbage into a safe intent", () => {
    expect(coerceSquidIntent(null)).toEqual({ swing: 0, lift: false, cycle: false, grabLeg: undefined });
    expect(coerceSquidIntent({ swing: 99, lift: 1, cycle: "yes", grabLeg: 3.7 })).toEqual({
      swing: 1, lift: true, cycle: true, grabLeg: undefined,
    });
    expect(coerceSquidIntent({ swing: -42 })).toMatchObject({ swing: -1 });
    expect(coerceSquidIntent({ grabLeg: 5 })).toMatchObject({ grabLeg: 5 });
    expect(coerceSquidIntent({ grabLeg: -1 })).toMatchObject({ grabLeg: undefined });
    expect(coerceSquidIntent({ grabLeg: 8 })).toMatchObject({ grabLeg: undefined });
  });
});
