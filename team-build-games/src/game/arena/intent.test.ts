import { describe, expect, it } from "vitest";
import { inputToIntent, initialMemory, nextFacing } from "./intent";
import type { RawInput } from "./types";

const RAW: RawInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
  attack: false,
  block: false,
};

describe("nextFacing", () => {
  it("faces the horizontal direction when moving left/right", () => {
    expect(nextFacing({ ...RAW, right: true }, "down")).toBe("right");
    expect(nextFacing({ ...RAW, left: true }, "down")).toBe("left");
  });

  it("faces vertically only when there is no horizontal input", () => {
    expect(nextFacing({ ...RAW, up: true }, "right")).toBe("up");
    expect(nextFacing({ ...RAW, down: true }, "right")).toBe("down");
    // horizontal wins over vertical when both held
    expect(nextFacing({ ...RAW, up: true, right: true }, "down")).toBe("right");
  });

  it("keeps the previous facing when there is no net movement", () => {
    expect(nextFacing(RAW, "left")).toBe("left");
    expect(nextFacing({ ...RAW, left: true, right: true }, "up")).toBe("up");
  });
});

describe("inputToIntent", () => {
  it("passes movement through and derives facing", () => {
    const { intent } = inputToIntent({ ...RAW, left: true }, initialMemory());
    expect(intent.move).toEqual({
      up: false,
      down: false,
      left: true,
      right: false,
    });
    expect(intent.facing).toBe("left");
  });

  it("fires dash only on the rising edge of Shift (not while held)", () => {
    let mem = initialMemory();
    const r1 = inputToIntent({ ...RAW, dash: true }, mem);
    expect(r1.intent.dash).toBe(true); // pressed this tick
    mem = r1.memory;
    const r2 = inputToIntent({ ...RAW, dash: true }, mem);
    expect(r2.intent.dash).toBe(false); // still held → no repeat
    mem = r2.memory;
    const r3 = inputToIntent({ ...RAW, dash: false }, mem); // released
    const r4 = inputToIntent({ ...RAW, dash: true }, r3.memory); // pressed again
    expect(r4.intent.dash).toBe(true);
  });

  it("fires attack only on the rising edge of Space", () => {
    const r1 = inputToIntent({ ...RAW, attack: true }, initialMemory());
    expect(r1.intent.attack).toBe(true);
    const r2 = inputToIntent({ ...RAW, attack: true }, r1.memory);
    expect(r2.intent.attack).toBe(false);
  });

  it("fires block only on the rising edge of Ctrl or right mouse input", () => {
    const r1 = inputToIntent({ ...RAW, block: true }, initialMemory());
    expect(r1.intent.block).toBe(true);
    const r2 = inputToIntent({ ...RAW, block: true }, r1.memory);
    expect(r2.intent.block).toBe(false);
    const released = inputToIntent({ ...RAW, block: false }, r2.memory);
    expect(
      inputToIntent({ ...RAW, block: true }, released.memory).intent.block,
    ).toBe(true);
  });

  it("passes the mouse aim angle through to the intent", () => {
    const { intent } = inputToIntent({ ...RAW, aim: 1.23 }, initialMemory());
    expect(intent.aim).toBeCloseTo(1.23, 5);
  });
});
