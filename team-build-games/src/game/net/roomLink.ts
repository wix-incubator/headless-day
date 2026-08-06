/**
 * Pure helpers for the copyable join link. The room id lives in the URL (`?room=<id>`),
 * so opening a link == joining that party. Randomness is injected for testability.
 */

export const ROOM_PARAM = "room";
const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const ID_RE = /^[a-z0-9-]{4,32}$/;

/** Parse a room id from a URL query string, or null if absent/invalid. */
export function parseRoomId(search: string): string | null {
  const raw = new URLSearchParams(search).get(ROOM_PARAM);
  return raw && ID_RE.test(raw) ? raw : null;
}

/** Build the shareable join URL for a room. */
export function buildJoinUrl(origin: string, pathname: string, roomId: string): string {
  return `${origin}${pathname}?${ROOM_PARAM}=${encodeURIComponent(roomId)}`;
}

/** Generate a fresh 8-char room id. `rand` is injectable for deterministic tests. */
export function mintRoomId(rand: () => number = Math.random): string {
  let s = "";
  for (let i = 0; i < 8; i++) s += ID_ALPHABET[Math.floor(rand() * ID_ALPHABET.length)];
  return s;
}
