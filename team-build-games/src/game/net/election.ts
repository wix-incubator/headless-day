/**
 * Pure, deterministic host election. The host is the lowest peer id among players who are
 * both ALIVE and connected — so every peer independently computes the same host with no
 * election chatter. Migration = recompute when the current host dies or leaves.
 */

import type { PlayerId, World } from "../arena/types";

/** Lowest id wins; null if the candidate set is empty. */
export function electHost(candidateIds: PlayerId[]): PlayerId | null {
  if (candidateIds.length === 0) return null;
  return [...candidateIds].sort()[0]!;
}

/**
 * Host for the given world, restricted to `connected` ids. Alive players are preferred;
 * if nobody alive is connected (e.g. pre-match lobby states), fall back to any connected id.
 */
export function electHostForWorld(world: World, connected: Iterable<PlayerId>): PlayerId | null {
  const connectedSet = new Set(connected);
  const alive = Object.values(world.players)
    .filter((p) => p.status === "alive" && connectedSet.has(p.id))
    .map((p) => p.id);
  if (alive.length > 0) return electHost(alive);
  return electHost([...connectedSet]);
}
