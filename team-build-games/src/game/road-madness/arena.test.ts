import { describe, expect, it } from "vitest";
import { arenaFeatureCooldownKey, arenaFeaturesForRound } from "./arena";
import { vehicleDef } from "./vehicles";

describe("Road Madness round arena features", () => {
  it("places exactly two half-car spike towers and two speed pads every round", () => {
    for (let round = 1; round <= 12; round += 1) {
      const features = arenaFeaturesForRound(round);
      expect(features.towers).toHaveLength(2);
      expect(features.speedPads).toHaveLength(2);
      for (const tower of features.towers) {
        expect(tower.radius).toBeCloseTo(vehicleDef("derby").collisionRadius * 0.5, 5);
      }
    }
  });

  it("rotates deterministic layouts between rounds and repeats after four", () => {
    expect(arenaFeaturesForRound(2)).not.toEqual(arenaFeaturesForRound(1));
    expect(arenaFeaturesForRound(5)).toEqual(arenaFeaturesForRound(1));
  });

  it("uses collision-safe stable cooldown keys", () => {
    expect(arenaFeatureCooldownKey("pad", "a:b", "speed-a")).toBe(
      '["pad","a:b","speed-a"]',
    );
    expect(arenaFeatureCooldownKey("tower", "a:b", "tower-a")).not.toBe(
      arenaFeatureCooldownKey("pad", "a:b", "tower-a"),
    );
  });
});
