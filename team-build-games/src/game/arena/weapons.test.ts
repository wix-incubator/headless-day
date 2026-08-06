import { describe, expect, it } from "vitest";
import {
  coerceWeapon,
  DEFAULT_WEAPON,
  ownsWeapon,
  playableWeapon,
  WEAPONS,
  WEAPON_LIST,
} from "./weapons";
import { SWORD_REACH_M, ATTACK_CONE_HALF_ANGLE, ATTACK_COOLDOWN_S, KNOCKBACK_M } from "../constants";

describe("weapons", () => {
  it("keeps the sword identical to the legacy constants (no behavior drift)", () => {
    expect(WEAPONS.sword).toMatchObject({
      reach: SWORD_REACH_M,
      coneHalfAngle: ATTACK_CONE_HALF_ANGLE,
      cooldown: ATTACK_COOLDOWN_S,
      knockback: KNOCKBACK_M,
    });
  });

  it("trades reach / arc / speed across melee weapons", () => {
    // spear out-ranges the sword; knife is shorter but faster
    expect(WEAPONS.spear.reach).toBeGreaterThan(WEAPONS.sword.reach);
    expect(WEAPONS.knife.reach).toBeLessThan(WEAPONS.sword.reach);
    expect(WEAPONS.knife.cooldown).toBeLessThan(WEAPONS.sword.cooldown);
    expect(WEAPONS.spear.cooldown).toBeGreaterThan(WEAPONS.sword.cooldown);
  });

  it("marks the bow as ranged (projectile) and the melee weapons as not", () => {
    expect(WEAPONS.bow.ranged).toBeTruthy();
    expect(WEAPONS.bow.ranged!.speed).toBeGreaterThan(0);
    expect(WEAPONS.bow.ranged!.range).toBeGreaterThan(0);
    expect(WEAPONS.sword.ranged).toBeUndefined();
  });

  it("coerceWeapon passes known weapons and defaults unknown ones", () => {
    for (const w of WEAPON_LIST) expect(coerceWeapon(w)).toBe(w);
    expect(coerceWeapon("bazooka")).toBe(DEFAULT_WEAPON);
    expect(coerceWeapon(undefined)).toBe(DEFAULT_WEAPON);
  });

  it("defines the premium signature attacks at their requested dimensions", () => {
    expect(WEAPONS.katana.special).toEqual({
      kind: "crushing-wave",
      speed: 12,
      range: 10,
      radius: 0.5,
    });
    expect(WEAPONS["solar-hammer"].special).toEqual({
      kind: "solar-wave",
      speed: 12,
      radius: 3,
    });
  });

  it("unlocks each premium weapon with its matching premium fighter", () => {
    expect(ownsWeapon("katana", ["neon-ronin"])).toBe(true);
    expect(ownsWeapon("katana", ["solar-warden"])).toBe(false);
    expect(ownsWeapon("solar-hammer", ["solar-warden"])).toBe(true);
    expect(playableWeapon("katana", [])).toBe(DEFAULT_WEAPON);
    expect(playableWeapon("spear", [])).toBe("spear");
  });
});
