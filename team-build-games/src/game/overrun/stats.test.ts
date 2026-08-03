import { describe, expect, it } from "vitest";
import { accuracy, buildOverrunPrintPayload } from "./stats";
import { createShooterWorld } from "./match";

describe("accuracy", () => {
  it("is hits/shots, zero-safe", () => {
    expect(accuracy({ shots: 0, hits: 0, kills: 0 })).toBe(0);
    expect(accuracy({ shots: 200, hits: 156, kills: 90 })).toBeCloseTo(0.78);
  });
});

describe("buildOverrunPrintPayload", () => {
  it("builds the merch title/sub from the run", () => {
    const w = createShooterWorld(["p1"], 1);
    w.wave = 12;
    w.players.p1 = {
      ...w.players.p1!,
      level: 9,
      stats: { shots: 440, hits: 343, kills: 342 },
    };
    expect(buildOverrunPrintPayload(w, "p1")).toEqual({
      title: "OVERRUN · WAVE 12",
      sub: "342 KILLS · 78% ACC · LVL 9",
    });
  });

  it("degrades gracefully for an unknown player", () => {
    const w = createShooterWorld(["p1"], 1);
    expect(buildOverrunPrintPayload(w, "ghost")).toEqual({
      title: "OVERRUN · WAVE 0",
      sub: "0 KILLS · 0% ACC · LVL 0",
    });
  });
});
