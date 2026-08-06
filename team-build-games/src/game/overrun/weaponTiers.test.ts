import { describe, expect, it } from "vitest";
import { MAX_WEAPON_TIER, droppableGuns, unlockedTier } from "./weaponTiers";

describe("weapon tiers", () => {
  it("campaign unlocks by stage: stage 1 = shotgun only, then adds a tier per stage", () => {
    // wave 1 is stage 1, wave 4 is stage 2, wave 9 is stage 3 (see stages table)
    expect(droppableGuns("campaign", 1)).toEqual(["shotgun"]);
    expect(droppableGuns("campaign", 4)).toEqual(["shotgun", "autorifle", "rifle"]);
    expect(droppableGuns("campaign", 9)).toEqual(["shotgun", "autorifle", "rifle", "smg", "dmr"]);
  });

  it("campaign caps at the highest defined tier for late stages", () => {
    expect(unlockedTier("campaign", 33)).toBe(MAX_WEAPON_TIER); // final stage
  });

  it("stage 4 unlocks the flamethrower", () => {
    // stages table [3,5,7,5,3,10] → stage 4 starts at wave 16
    expect(droppableGuns("campaign", 16)).toContain("flamethrower");
    expect(droppableGuns("campaign", 9)).not.toContain("flamethrower"); // stage 3, not yet
  });

  it("stage 5 unlocks the rocket launcher", () => {
    // stage 5 starts at wave 21 (3+5+7+5 = 20 waves before it)
    expect(droppableGuns("campaign", 21)).toContain("rocket");
    expect(droppableGuns("campaign", 16)).not.toContain("rocket"); // stage 4, not yet
  });

  it("survival starts at tier 1 and opens one tier every two waves", () => {
    expect(unlockedTier("survival", 1)).toBe(1);
    expect(unlockedTier("survival", 2)).toBe(1);
    expect(unlockedTier("survival", 3)).toBe(2);
    expect(unlockedTier("survival", 5)).toBe(3);
    expect(droppableGuns("survival", 1)).toEqual(["shotgun"]);
  });

  it("cumulative: every unlocked tier's guns are droppable, lower tiers included", () => {
    for (let stage = 1; stage <= MAX_WEAPON_TIER; stage++) {
      const guns = droppableGuns("survival", (stage - 1) * 2 + 1);
      expect(guns).toContain("shotgun"); // tier 1 always present once unlocked
      expect(new Set(guns).size).toBe(guns.length); // no dupes
    }
  });
});
