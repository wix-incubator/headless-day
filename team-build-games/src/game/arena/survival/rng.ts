/** Order-independent deterministic randomness for host-owned Survival entities. */

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mix32(value: number): number {
  let x = value >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** A stable uint32 keyed by coordinates rather than a shared advancing cursor. */
export function survivalHash(
  seed: number,
  tick: number,
  entityId: string,
  salt: string | number,
): number {
  const entity = hashString(entityId);
  const salted = typeof salt === "number" ? salt >>> 0 : hashString(salt);
  return mix32((seed >>> 0) ^ Math.imul(tick >>> 0, 0x9e3779b1) ^ entity ^ salted);
}

/** Deterministic value in [0, 1), suitable for spawn angles and drop rolls. */
export function survivalRandom(
  seed: number,
  tick: number,
  entityId: string,
  salt: string | number,
): number {
  return survivalHash(seed, tick, entityId, salt) / 0x1_0000_0000;
}
