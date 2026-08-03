/**
 * Pure warm-up room roster model + reducers. The same reducers run on every peer; the host's
 * roster is authoritative and re-broadcast on every change. Host = lowest connected id.
 */

import type { PlayerId } from "../arena/types";
import type { Shape } from "../arena/cosmetic";
import type { Weapon } from "../arena/weapons";
import { electHost } from "./election";
import { MAX_PLAYERS } from "../constants";

export interface LobbyPlayer {
  id: PlayerId;
  name: string;
  iconColor?: number; // squid leg tint (render-only); the arena identifies players by fighter shape
  shape: Shape; // cosmetic fighter selection (render-only)
  weapon: Weapon; // equipped weapon (sim-relevant)
  avatarUrl?: string | null; // signed-in member's face photo (render-only)
  ownedPremiumShapes?: Shape[]; // member-owned paid cosmetics, used by the host to sanitize starts
}

export type Roster = Record<PlayerId, LobbyPlayer>;

/** Add or update a player; ignored if the room is already full (and the id is new). */
export function upsert(roster: Roster, player: LobbyPlayer, max = MAX_PLAYERS): Roster {
  if (!(player.id in roster) && Object.keys(roster).length >= max) return roster;
  return { ...roster, [player.id]: player };
}

export function remove(roster: Roster, id: PlayerId): Roster {
  if (!(id in roster)) return roster;
  const next = { ...roster };
  delete next[id];
  return next;
}

/** Players sorted by id (stable display + deterministic spawn order). */
export function rosterList(roster: Roster): LobbyPlayer[] {
  return Object.values(roster).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** The lobby host: lowest id present. */
export function lobbyHost(roster: Roster): PlayerId | null {
  return electHost(Object.keys(roster));
}

export function isFull(roster: Roster, max = MAX_PLAYERS): boolean {
  return Object.keys(roster).length >= max;
}

/** Ids present in `next` but not in `prev`, excluding `self` — a peer joining triggers the connect sound. */
export function joinedIds(prev: PlayerId[], next: PlayerId[], self: PlayerId): PlayerId[] {
  const before = new Set(prev);
  return next.filter((id) => id !== self && !before.has(id));
}
