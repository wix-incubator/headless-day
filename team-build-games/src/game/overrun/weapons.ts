/**
 * The slice's 3-gun arsenal — all hitscan (bullets resolve on the fire tick and
 * NEVER serialize). Numbers from the roadmap START table; tune in playtest.
 */

import type { AmmoState, GunId } from "./types";

export interface GunDef {
  id: GunId;
  name: string;
  /** Damage per pellet (pre-perk). */
  damage: number;
  rpm: number;
  magSize: number;
  /** Max reserve rounds; null = infinite (the pistol fallback). */
  reserveMax: number | null;
  reloadS: number;
  /** Max deviation (degrees) either side of the aim. */
  spreadDeg: number;
  pellets: number;
  /** Hitscan range in meters. */
  range: number;
  /** Enemies a single pellet passes through beyond the first. */
  pierce: number;
}

export const GUNS: Record<GunId, GunDef> = {
  pistol: { id: "pistol", name: "Pistol", damage: 12, rpm: 300, magSize: 12, reserveMax: null, reloadS: 1.2, spreadDeg: 2, pellets: 1, range: 20, pierce: 0 },
  shotgun: { id: "shotgun", name: "Shotgun", damage: 8, rpm: 70, magSize: 6, reserveMax: 36, reloadS: 1.0, spreadDeg: 9, pellets: 8, range: 12, pierce: 0 },
  rifle: { id: "rifle", name: "Rifle", damage: 34, rpm: 220, magSize: 10, reserveMax: 60, reloadS: 1.6, spreadDeg: 1, pellets: 1, range: 40, pierce: 0 },
  // Automatic rifle: full-auto workhorse — steady damage, high fire rate, big mag.
  autorifle: { id: "autorifle", name: "Auto Rifle", damage: 22, rpm: 560, magSize: 30, reserveMax: 120, reloadS: 1.8, spreadDeg: 3, pellets: 1, range: 34, pierce: 0 },
  // SMG: spray-and-pray — light damage, blistering rpm, huge mag, wider spread, shorter reach.
  smg: { id: "smg", name: "SMG", damage: 14, rpm: 750, magSize: 32, reserveMax: 160, reloadS: 1.4, spreadDeg: 5, pellets: 1, range: 22, pierce: 0 },
  // DMR: marksman — slow, single, pinpoint, long range, heavy per-hit damage.
  dmr: { id: "dmr", name: "DMR", damage: 60, rpm: 90, magSize: 8, reserveMax: 48, reloadS: 1.9, spreadDeg: 0.6, pellets: 1, range: 55, pierce: 0 },
  // Flamethrower: continuous short-range CONE (see firing's flame branch — `pellets`/`spreadDeg`
  // are unused for it) that sets enemies alight for burn-over-time. `damage` is the per-tick direct
  // hit; `rpm` gates the fuel burn cadence; `range` is the cone length. Melts stacks up close.
  flamethrower: { id: "flamethrower", name: "Flamethrower", damage: 5, rpm: 600, magSize: 100, reserveMax: 200, reloadS: 2.2, spreadDeg: 0, pellets: 1, range: 7, pierce: 0 },
  // Rocket launcher: fires a TRAVELLING projectile (see firing's rocket branch + the sim's projectile
  // step) that detonates for a big AoE — `damage`/`pellets`/`spread` are unused; `range` is the flight
  // distance before it airbursts. Slow, tiny mag: the top-tier crowd-clearer.
  rocket: { id: "rocket", name: "Rocket Launcher", damage: 0, rpm: 45, magSize: 4, reserveMax: 12, reloadS: 2.6, spreadDeg: 0, pellets: 1, range: 40, pierce: 0 },
};

export const GUN_IDS: GunId[] = ["pistol", "shotgun", "rifle", "autorifle", "smg", "dmr", "flamethrower", "rocket"];
export const DEFAULT_GUN: GunId = "pistol";

/** Narrow an untrusted value to a known gun id. */
export function coerceGun(raw: unknown): GunId {
  return GUN_IDS.includes(raw as GunId) ? (raw as GunId) : DEFAULT_GUN;
}

/** Full mag + full reserve (0 for the infinite pistol — its reserve is never consumed). */
export function freshAmmo(gun: GunId): AmmoState {
  const def = GUNS[gun];
  return { mag: def.magSize, reserve: def.reserveMax ?? 0, reloadRemaining: 0, fireCooldown: 0 };
}

/** Can this gun still reload? The pistol always can (infinite reserve). */
export function hasReserve(gun: GunId, ammo: AmmoState): boolean {
  return GUNS[gun].reserveMax === null || ammo.reserve > 0;
}
