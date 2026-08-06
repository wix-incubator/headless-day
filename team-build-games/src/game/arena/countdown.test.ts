import { describe, expect, it } from "vitest";
import { countdownNumber, isCountdownDone, startCountdown, tickCountdown } from "./countdown";
import { COUNTDOWN_S } from "../constants";

describe("countdown", () => {
  it("starts at the configured length", () => {
    expect(startCountdown().remaining).toBe(COUNTDOWN_S);
  });

  it("ticks down and floors at 0", () => {
    let c = startCountdown();
    c = tickCountdown(c, 1);
    expect(c.remaining).toBeCloseTo(COUNTDOWN_S - 1, 5);
    c = tickCountdown(c, 10);
    expect(c.remaining).toBe(0);
  });

  it("reports 3→2→1→0 (GO) as it counts down", () => {
    expect(countdownNumber({ remaining: 3 })).toBe(3);
    expect(countdownNumber({ remaining: 2.4 })).toBe(3);
    expect(countdownNumber({ remaining: 2 })).toBe(2);
    expect(countdownNumber({ remaining: 0.1 })).toBe(1);
    expect(countdownNumber({ remaining: 0 })).toBe(0);
  });

  it("is done at 0", () => {
    expect(isCountdownDone({ remaining: 0 })).toBe(true);
    expect(isCountdownDone({ remaining: 0.5 })).toBe(false);
  });
});
