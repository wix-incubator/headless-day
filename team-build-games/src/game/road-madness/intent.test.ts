import { describe, expect, it } from "vitest";
import { coerceDriveIntent, inputToDriveIntent } from "./intent";

describe("Road Madness input", () => {
  it("turns held keys into normalized axes", () => {
    expect(
      inputToDriveIntent({
        up: true,
        down: false,
        left: true,
        right: false,
        handbrake: true,
        boost: false,
      }),
    ).toEqual({ throttle: 1, steer: -1, handbrake: true, boost: false });
  });

  it("cancels opposite keys", () => {
    expect(
      inputToDriveIntent({
        up: true,
        down: true,
        left: true,
        right: true,
        handbrake: false,
        boost: false,
      }),
    ).toEqual({ throttle: 0, steer: 0, handbrake: false, boost: false });
  });

  it("clamps and sanitizes untrusted intent", () => {
    expect(coerceDriveIntent({ throttle: 99, steer: -3, handbrake: 1, boost: true })).toEqual({
      throttle: 1,
      steer: -1,
      handbrake: false,
      boost: true,
    });
    expect(coerceDriveIntent({ throttle: Number.NaN, steer: "right" })).toEqual({
      throttle: 0,
      steer: 0,
      handbrake: false,
      boost: false,
    });
  });
});

