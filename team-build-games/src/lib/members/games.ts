/**
 * Registry of games that have a members-area presence (per-game avatars, and later stats/progress).
 * A game is just an `id` (the `gameId` used across `PlayerAvatars`/`PlayerStats`) plus display copy.
 * Add a game here and it's picked up by the account page + the avatar API's allowlist.
 */

export interface GameMeta {
  id: string;
  name: string;
  /** Tailwind gradient classes for the account card accent. */
  accent: string;
}

export const GAMES: GameMeta[] = [
  { id: "arena", name: "Arena", accent: "from-sky-500/20 to-emerald-500/20" },
  { id: "overrun", name: "Overrun", accent: "from-red-500/20 to-amber-500/20" },
  { id: "squid", name: "Squid", accent: "from-fuchsia-500/20 to-cyan-500/20" },
  { id: "road-madness", name: "Road Madness", accent: "from-amber-500/20 to-red-500/20" },
  { id: "survival", name: "Survival", accent: "from-emerald-500/20 to-cyan-500/20" },
];

/** Narrow an untrusted value to a known game id (the server-side allowlist for writes). */
export function isKnownGameId(id: unknown): id is string {
  return typeof id === "string" && GAMES.some((g) => g.id === id);
}
