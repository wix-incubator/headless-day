/**
 * Global perk pool (Crimsonland-style level-up picks). Effects resolve through
 * pure `effectiveStats` so stacking is order-free. `tags` is the extension hook
 * for future class-/weapon-scoped perks (empty for the global pool).
 */

import { PICKUP_RADIUS_M, PLAYER_HEALTH, XP_BASE, XP_PER_LEVEL } from "./constants";
import { hash01 } from "./rng";
import type { PerkId, PerkOffer } from "./types";

export interface EffectiveStats {
  fireRateMult: number;
  moveSpeedMult: number;
  damageMult: number;
  maxHealth: number;
  reloadMult: number;
  pickupRadius: number;
}

export interface PerkDef {
  id: PerkId;
  name: string;
  blurb: string;
  /** Future class/weapon scoping filters on these (empty = global pool). */
  tags: string[];
}

/** Stable order — this index IS the wire encoding of a perk. Append only. */
export const PERK_IDS: PerkId[] = ["trigger", "sprint", "power", "vitality", "hands", "magnet"];

export const PERKS: Record<PerkId, PerkDef> = {
  trigger: { id: "trigger", name: "Hair Trigger", blurb: "+15% fire rate", tags: [] },
  sprint: { id: "sprint", name: "Adrenaline", blurb: "+10% move speed", tags: [] },
  power: { id: "power", name: "Hollow Points", blurb: "+15% damage", tags: [] },
  vitality: { id: "vitality", name: "Thick Skin", blurb: "+25 max health", tags: [] },
  hands: { id: "hands", name: "Fast Hands", blurb: "15% faster reload", tags: [] },
  magnet: { id: "magnet", name: "Scavenger", blurb: "+30% pickup radius", tags: [] },
};

/** Resolve a perk list into concrete multipliers/bonuses (order-independent). */
export function effectiveStats(perks: PerkId[]): EffectiveStats {
  const s: EffectiveStats = {
    fireRateMult: 1, moveSpeedMult: 1, damageMult: 1,
    maxHealth: PLAYER_HEALTH, reloadMult: 1, pickupRadius: PICKUP_RADIUS_M,
  };
  for (const p of perks) {
    if (p === "trigger") s.fireRateMult *= 1.15;
    else if (p === "sprint") s.moveSpeedMult *= 1.1;
    else if (p === "power") s.damageMult *= 1.15;
    else if (p === "vitality") s.maxHealth += 25;
    else if (p === "hands") s.reloadMult *= 0.85;
    else if (p === "magnet") s.pickupRadius *= 1.3;
  }
  return s;
}

/** Cumulative XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return XP_BASE + XP_PER_LEVEL * level;
}

/**
 * Three DISTINCT perks for a level-up, drawn by coordinate-hash (deterministic).
 * `level` (the level being awarded) is part of the hash coordinates so that two
 * level-ups in the same tick — e.g. a big XP dump from a tank kill — roll
 * DIFFERENT offers instead of duplicating the same three choices.
 */
export function rollOffer(seed: number, tick: number, playerId: string, level: number): PerkOffer {
  const pool = [...PERK_IDS];
  const choices: PerkId[] = [];
  for (let slot = 0; slot < 3; slot++) {
    const idx = Math.floor(hash01(seed, tick, playerId, "perk", level, slot) * pool.length);
    choices.push(pool.splice(idx, 1)[0]!);
  }
  return { choices: choices as [PerkId, PerkId, PerkId] };
}
