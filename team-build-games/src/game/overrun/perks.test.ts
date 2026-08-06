import { describe, expect, it } from "vitest";
import { effectiveStats, PERK_IDS, PERKS, rollOffer, xpToNext } from "./perks";
import { PLAYER_HEALTH, PICKUP_RADIUS_M } from "./constants";

describe("perk pool", () => {
  it("has 6 perks in a stable wire order, each with display copy and a tags hook", () => {
    expect(PERK_IDS).toEqual(["trigger", "sprint", "power", "vitality", "hands", "magnet"]);
    for (const id of PERK_IDS) {
      expect(PERKS[id].name.length).toBeGreaterThan(0);
      expect(PERKS[id].blurb.length).toBeGreaterThan(0);
      expect(Array.isArray(PERKS[id].tags)).toBe(true); // class/weapon scoping hook (empty now)
    }
  });

  it("effectiveStats: no perks = identity baseline", () => {
    expect(effectiveStats([])).toEqual({
      fireRateMult: 1, moveSpeedMult: 1, damageMult: 1,
      maxHealth: PLAYER_HEALTH, reloadMult: 1, pickupRadius: PICKUP_RADIUS_M,
    });
  });

  it("perks stack multiplicatively / additively and are order-independent", () => {
    const a = effectiveStats(["power", "power", "vitality"]);
    expect(a.damageMult).toBeCloseTo(1.3225); // 1.15²
    expect(a.maxHealth).toBe(PLAYER_HEALTH + 25);
    expect(effectiveStats(["vitality", "power", "power"])).toEqual(a);
  });

  it("rollOffer returns 3 DISTINCT perks, deterministically", () => {
    const o = rollOffer(42, 100, "p1", 1);
    expect(new Set(o.choices).size).toBe(3);
    expect(rollOffer(42, 100, "p1", 1)).toEqual(o);
    expect(rollOffer(42, 101, "p1", 1)).not.toEqual(o); // tick-sensitive
    // player-sensitive ("p2" coincidentally floors to the same 3 indices as "p1"
    // at these exact coordinates — a legit 1-in-120 collision — so probe with "p3")
    expect(rollOffer(42, 100, "p3", 1)).not.toEqual(o);
  });

  it("rollOffer is level-sensitive: same tick, consecutive levels roll different offers", () => {
    // The double-level-up case (e.g. a tank kill dumps enough XP for two levels in
    // one tick): each level being awarded must get its own coordinate-hash slot.
    const o1 = rollOffer(42, 100, "p1", 1);
    const o2 = rollOffer(42, 100, "p1", 2);
    expect(o2).not.toEqual(o1);
  });

  it("xpToNext grows linearly", () => {
    expect(xpToNext(0)).toBe(20);
    expect(xpToNext(1)).toBe(35);
    expect(xpToNext(4)).toBe(80);
  });
});
