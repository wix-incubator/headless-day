import { describe, expect, it } from "vitest";
import { coerceShooterIntent, initialShooterMemory, inputToShooterIntent } from "./intent";
import type { RawShooterInput } from "./types";

const RAW: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

describe("inputToShooterIntent", () => {
  it("fire is held-state (auto guns), reload is rising-edge", () => {
    const m0 = initialShooterMemory();
    const a = inputToShooterIntent({ ...RAW, fire: true, reload: true }, m0);
    expect(a.intent.fire).toBe(true);
    expect(a.intent.reload).toBe(true);
    const b = inputToShooterIntent({ ...RAW, fire: true, reload: true }, a.memory);
    expect(b.intent.fire).toBe(true); // still held
    expect(b.intent.reload).toBe(false); // edge consumed
  });

  it("perkPick fires once per key press, lowest key wins on chords", () => {
    const m0 = initialShooterMemory();
    const a = inputToShooterIntent({ ...RAW, pick2: true, pick3: true }, m0);
    expect(a.intent.perkPick).toBe(1);
    const b = inputToShooterIntent({ ...RAW, pick2: true, pick3: true }, a.memory);
    expect(b.intent.perkPick).toBe(null);
  });

  it("passes aim through", () => {
    const { intent } = inputToShooterIntent({ ...RAW, aim: 1.5 }, initialShooterMemory());
    expect(intent.aim).toBe(1.5);
  });
});

describe("coerceShooterIntent (anti-cheat boundary)", () => {
  it("sanitizes junk into a well-formed intent", () => {
    expect(coerceShooterIntent(null)).toEqual({
      move: { up: false, down: false, left: false, right: false },
      aim: undefined, fire: false, reload: false, perkPick: null,
    });
    expect(coerceShooterIntent({ move: { up: 1 }, fire: "yes", perkPick: 2, aim: 0.5 })).toEqual({
      move: { up: true, down: false, left: false, right: false },
      aim: 0.5, fire: true, reload: false, perkPick: 2,
    });
  });

  it("rejects out-of-range picks and non-finite aim", () => {
    expect(coerceShooterIntent({ perkPick: 7 }).perkPick).toBe(null);
    expect(coerceShooterIntent({ perkPick: -1 }).perkPick).toBe(null);
    expect(coerceShooterIntent({ aim: Infinity }).aim).toBe(undefined);
    expect(coerceShooterIntent({ aim: NaN }).aim).toBe(undefined);
  });
});
