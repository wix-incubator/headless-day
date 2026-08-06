import { describe, expect, it } from "vitest";
import { SoloRoadDriver } from "./soloDriver";
import type { RawDriveInput } from "./types";

const DRIVING: RawDriveInput = {
  up: true,
  down: false,
  left: false,
  right: true,
  handbrake: false,
  boost: false,
};

const IDLE: RawDriveInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  handbrake: false,
  boost: false,
};

describe("SoloRoadDriver checkpoints", () => {
  it("restores an in-progress match without returning to the garage", () => {
    const original = new SoloRoadDriver("monster");
    let before = original.frame(0, IDLE);
    for (let frame = 0; frame < 300; frame += 1) {
      before = original.frame(1 / 60, DRIVING);
    }
    expect(before.world.tick).toBeGreaterThan(0);

    const restored = new SoloRoadDriver("monster", original.snapshot());
    const after = restored.frame(0, IDLE);
    expect(after).toEqual(before);
    expect(restored.getMeta(restored.localId).vehicle).toBe("monster");
  });

  it("restores a countdown at the same whole-second display", () => {
    const original = new SoloRoadDriver("derby");
    const before = original.frame(0.7, IDLE);
    const restored = new SoloRoadDriver("derby", original.snapshot());
    expect(restored.frame(0, IDLE).countdown).toBe(before.countdown);
  });

  it("stages the next round after the deterministic intermission", () => {
    const original = new SoloRoadDriver("derby", undefined, { bestOf: 3 });
    const snapshot = original.snapshot();
    snapshot.countdownLeft = 0;
    snapshot.roundBreakLeft = 0.05;
    snapshot.world = {
      ...snapshot.world,
      phase: "round-ended",
      roundWinnerId: "driver",
      roundEndReason: "last-alive",
      roundWins: { ...snapshot.world.roundWins, driver: 1 },
    };
    const restored = new SoloRoadDriver("derby", snapshot);
    const next = restored.frame(0.1, IDLE);
    expect(next.world.phase).toBe("playing");
    expect(next.world.roundNumber).toBe(2);
    expect(next.countdown).toBe(3);
    expect(next.world.roundWins.driver).toBe(1);
  });
});
