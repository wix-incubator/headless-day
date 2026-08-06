import { describe, expect, it } from "vitest";
import { coerceGun, DEFAULT_GUN, freshAmmo, GUN_IDS, GUNS, hasReserve } from "./weapons";

describe("gun table", () => {
  it("defines exactly the slice guns", () => {
    expect(GUN_IDS).toEqual(["pistol", "shotgun", "rifle", "autorifle", "smg", "dmr", "flamethrower", "rocket"]);
    expect(DEFAULT_GUN).toBe("pistol");
  });

  it("matches the roadmap START numbers", () => {
    expect(GUNS.pistol).toMatchObject({ damage: 12, rpm: 300, magSize: 12, reserveMax: null, reloadS: 1.2, spreadDeg: 2, pellets: 1, range: 20, pierce: 0 });
    expect(GUNS.shotgun).toMatchObject({ damage: 8, rpm: 70, magSize: 6, reserveMax: 36, reloadS: 1.0, spreadDeg: 9, pellets: 8, range: 12, pierce: 0 });
    expect(GUNS.rifle).toMatchObject({ damage: 34, rpm: 220, magSize: 10, reserveMax: 60, reloadS: 1.6, spreadDeg: 1, pellets: 1, range: 40, pierce: 0 });
  });

  it("freshAmmo fills the mag and reserve (0 for the infinite pistol)", () => {
    expect(freshAmmo("rifle")).toEqual({ mag: 10, reserve: 60, reloadRemaining: 0, fireCooldown: 0 });
    expect(freshAmmo("pistol")).toEqual({ mag: 12, reserve: 0, reloadRemaining: 0, fireCooldown: 0 });
  });

  it("hasReserve: pistol always true; others only with rounds left", () => {
    expect(hasReserve("pistol", freshAmmo("pistol"))).toBe(true);
    expect(hasReserve("shotgun", { mag: 0, reserve: 0, reloadRemaining: 0, fireCooldown: 0 })).toBe(false);
    expect(hasReserve("shotgun", { mag: 0, reserve: 6, reloadRemaining: 0, fireCooldown: 0 })).toBe(true);
  });

  it("coerceGun rejects junk", () => {
    expect(coerceGun("rifle")).toBe("rifle");
    expect(coerceGun("bazooka")).toBe(DEFAULT_GUN);
    expect(coerceGun(42)).toBe(DEFAULT_GUN);
  });
});
