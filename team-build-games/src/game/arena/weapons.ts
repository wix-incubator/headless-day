/**
 * Weapon loadout + per-weapon combat stats. Unlike cosmetic shape, weapon IS sim-relevant
 * (it changes reach / arc / cadence / knockback), so it lives on `PlayerState` and is read by
 * the sim. Pure, engine-free. `coerceWeapon` is the wire trust boundary.
 *
 * Melee weapons resolve an instant cone (see `combat.ts`); the bow is ranged and fires an
 * arrow `Projectile` instead (see `sim.ts`).
 */

import { ATTACK_CONE_HALF_ANGLE, ATTACK_COOLDOWN_S, KNOCKBACK_M, SWORD_REACH_M } from "../constants";
import type { Shape } from "./cosmetic";

export type Weapon = "sword" | "spear" | "knife" | "bow" | "katana" | "solar-hammer";

export const FREE_WEAPONS: Weapon[] = ["sword", "spear", "knife", "bow"];
export const PREMIUM_WEAPONS: Weapon[] = ["katana", "solar-hammer"];
export const WEAPON_LIST: Weapon[] = [...FREE_WEAPONS, ...PREMIUM_WEAPONS];

export const DEFAULT_WEAPON: Weapon = "sword";

export interface WeaponStats {
  /** Melee reach in meters (unused for ranged weapons). */
  reach: number;
  /** Half-angle (radians) of the melee cone (ignored when `thrust` is set). */
  coneHalfAngle: number;
  /** Seconds between attacks. */
  cooldown: number;
  /** Meters a hit knocks the victim back. */
  knockback: number;
  /** Present for thrust weapons (e.g. spear): hits a straight line/band, not a widening cone. */
  thrust?: { halfWidth: number };
  /** Present only for ranged weapons: fires a projectile instead of a melee hit. */
  ranged?: { speed: number; range: number };
  /** Signature premium attack, simulated as a deterministic traveling or expanding wave. */
  special?:
    | { kind: "crushing-wave"; speed: number; range: number; radius: number }
    | { kind: "solar-wave"; speed: number; radius: number };
}

export const WEAPONS: Record<Weapon, WeaponStats> = {
  // Sword == the legacy tuning, so existing players/tests are unchanged.
  sword: { reach: SWORD_REACH_M, coneHalfAngle: ATTACK_CONE_HALF_ANGLE, cooldown: ATTACK_COOLDOWN_S, knockback: KNOCKBACK_M },
  // Spear: long, slow, heavy knockback — a STRAIGHT thrust (narrow band), not an arc.
  spear: { reach: 3.5, coneHalfAngle: Math.PI / 8, cooldown: 1.4, knockback: 4, thrust: { halfWidth: 0.2 } },
  // Knife: short, wide, fast, light knockback (reach bumped +20%: 1 → 1.2).
  knife: { reach: 1.2, coneHalfAngle: Math.PI / 3, cooldown: 0.45, knockback: 1 },
  // Bow: ranged — fires an arrow along the aim; no melee hit.
  bow: { reach: 0, coneHalfAngle: 0, cooldown: 1.2, knockback: 0.5, ranged: { speed: 14, range: 16 } },
  // Neon Ronin: the swing launches a 1 m-wide piercing wave for 10 m.
  katana: {
    reach: 2.3,
    coneHalfAngle: Math.PI / 3,
    cooldown: 1.15,
    knockback: 3,
    special: { kind: "crushing-wave", speed: 12, range: 10, radius: 0.5 },
  },
  // Solar Warden: the ground slam expands as a 3 m radial solar wave.
  "solar-hammer": {
    reach: 2.1,
    coneHalfAngle: Math.PI / 2,
    cooldown: 1.8,
    knockback: 4,
    special: { kind: "solar-wave", speed: 12, radius: 3 },
  },
};

export interface WeaponInfo {
  label: string;
  blurb: string;
  asset: string;
  premiumShape?: Shape;
}

export const WEAPON_INFO: Record<Weapon, WeaponInfo> = {
  sword: { label: "Sword", blurb: "Balanced close-range sweep.", asset: "/assets/arena/weapons/sword.png" },
  spear: { label: "Spear", blurb: "Long, narrow thrust.", asset: "/assets/arena/weapons/spear.png" },
  knife: { label: "Knife", blurb: "Fast, wide close-range cut.", asset: "/assets/arena/weapons/knife.png" },
  bow: { label: "Bow", blurb: "Ranged arrow attack.", asset: "/assets/arena/weapons/bow.png" },
  katana: {
    label: "Neon Katana",
    blurb: "Sends a 1 m crushing wave up to 10 m.",
    asset: "/assets/arena/weapons/katana.png",
    premiumShape: "neon-ronin",
  },
  "solar-hammer": {
    label: "Solar Hammer",
    blurb: "Ground slam sends a solar wave 3 m in every direction.",
    asset: "/assets/arena/weapons/solar-hammer.png",
    premiumShape: "solar-warden",
  },
};

export function isPremiumWeapon(weapon: Weapon): boolean {
  return PREMIUM_WEAPONS.includes(weapon);
}

export function ownsWeapon(weapon: Weapon, ownedPremiumShapes: readonly Shape[]): boolean {
  const required = WEAPON_INFO[weapon].premiumShape;
  return !required || ownedPremiumShapes.includes(required);
}

/** Host-side entitlement boundary: locked premium weapons become the default sword. */
export function playableWeapon(weapon: Weapon, ownedPremiumShapes: readonly Shape[]): Weapon {
  return ownsWeapon(weapon, ownedPremiumShapes) ? weapon : DEFAULT_WEAPON;
}

export function coerceWeapon(raw: unknown): Weapon {
  return WEAPON_LIST.includes(raw as Weapon) ? (raw as Weapon) : DEFAULT_WEAPON;
}
