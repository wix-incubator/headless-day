/**
 * Weapon/medkit drop economy: weighted roll per kill, a pity counter that
 * forces a drop after a dry streak, and a hard live-pickup cap (anti-flood +
 * snapshot-size guard). Pity lives IN the world so host migration keeps it.
 */

import { DROP_MEDKIT_P, DROP_WEAPON_P, MAX_PICKUPS, PICKUP_TTL_S, PITY_LIMIT } from "./constants";
import { hash01 } from "./rng";
import type { DroppableGun, Enemy, Pickup, PickupKind } from "./types";

/**
 * `gunPool` is the set of currently-unlocked weapons (see weaponTiers); a weapon drop picks one
 * uniformly from it (deterministic hash draw). An empty pool means no weapon can drop this kill.
 */
export function rollDrop(
  seed: number,
  tick: number,
  enemy: Enemy,
  pickupsLive: number,
  pity: number,
  gunPool: DroppableGun[],
): { pickup: Pickup | null; pity: number } {
  if (pickupsLive >= MAX_PICKUPS) return { pickup: null, pity: pity + 1 };
  const pickGun = (): DroppableGun | null =>
    gunPool.length === 0 ? null : gunPool[Math.floor(hash01(seed, tick, enemy.id, "gun") * gunPool.length)]!;
  const r = hash01(seed, tick, enemy.id, "drop");
  const forced = pity + 1 >= PITY_LIMIT;
  let kind: PickupKind | null = null;
  if (r < DROP_WEAPON_P) {
    kind = pickGun();
  } else if (r < DROP_WEAPON_P + DROP_MEDKIT_P) {
    kind = "medkit";
  } else if (forced) {
    kind = hash01(seed, tick, enemy.id, "pity") < 0.5 ? "medkit" : pickGun() ?? "medkit";
  }
  if (!kind) return { pickup: null, pity: pity + 1 };
  return {
    pickup: { id: `pk:${enemy.id}`, kind, pos: { x: enemy.pos.x, y: enemy.pos.y }, ttl: PICKUP_TTL_S },
    pity: 0,
  };
}
