/**
 * Pure round/podium state machine for best-of-N matches (P8). No clock, no RNG — the host advances
 * it as rounds resolve and broadcasts the state so every peer shows the same standings/podium.
 *
 * Model: play exactly `total` regular rounds, ranking players by round wins. If players tie for a
 * PODIUM place (1st/2nd/3rd), sudden-death rounds run among the tied group — one place decided per
 * decider — until the top three are ordered. Ties that fall entirely off the podium are left as-is.
 *
 * Tie-breaks are recorded as a monotonic resolution SEQUENCE (`seq`), not a win count: the player who
 * wins the Nth decider gets seq N. Within a win tier, resolved players rank ahead of unresolved ones
 * in seq order — so a 2nd-place decider winner and a 3rd-place decider winner stay distinct (a flat
 * counter would collapse them back into one tie). Regular round wins are never distorted.
 */

import type { PlayerId } from "./types";

export interface RoundsState {
  total: number; // regular rounds to play
  index: number; // regular rounds completed
  wins: Record<PlayerId, number>; // round wins per player
  seq: Record<PlayerId, number>; // sudden-death resolution order (0 = unresolved; lower positive = better)
  nextSeq: number; // next resolution number to hand out
  players: PlayerId[]; // participants, in a stable order
}

export interface Placement {
  place: number; // 1-based; tied players share a place
  players: PlayerId[];
  wins: number;
}

export type NextRound =
  | { kind: "play"; roundNumber: number } // play the next regular round (1-based)
  | { kind: "tiebreak"; players: PlayerId[]; place: number } // sudden-death among these for `place`
  | { kind: "done"; podium: Placement[] }; // match over — final standings

export function createRounds(players: PlayerId[], total: number): RoundsState {
  const zero = (): Record<PlayerId, number> => Object.fromEntries(players.map((p) => [p, 0]));
  return { total: Math.max(1, Math.floor(total)), index: 0, wins: zero(), seq: zero(), nextSeq: 1, players: [...players] };
}

/** Record a regular round's winner (null = drawn round: still counts toward N, no win awarded). */
export function recordRoundWin(state: RoundsState, winnerId: PlayerId | null): RoundsState {
  const wins = { ...state.wins };
  if (winnerId != null && winnerId in wins) wins[winnerId] = (wins[winnerId] ?? 0) + 1;
  return { ...state, wins, index: state.index + 1 };
}

/** Record a sudden-death decider's winner (locks their podium order; doesn't touch the win tally). */
export function recordTiebreakWin(state: RoundsState, winnerId: PlayerId | null): RoundsState {
  if (winnerId == null || !(winnerId in state.seq)) return state; // draw → tie stands, decider replays
  return { ...state, seq: { ...state.seq, [winnerId]: state.nextSeq }, nextSeq: state.nextSeq + 1 };
}

/** Rank two players: more wins first; within equal wins, resolved (by seq) ahead of unresolved. */
function compare(state: RoundsState, a: PlayerId, b: PlayerId): number {
  const dw = (state.wins[b] ?? 0) - (state.wins[a] ?? 0);
  if (dw !== 0) return dw;
  const sa = state.seq[a] ?? 0;
  const sb = state.seq[b] ?? 0;
  if (sa && sb) return sa - sb; // both resolved: earlier decider win ranks higher
  if (sa) return -1; // a resolved, b not
  if (sb) return 1; // b resolved, a not
  return 0; // both unresolved at equal wins → genuinely tied
}

/** Players grouped into tiers of genuinely-tied players (equal wins, both unresolved), best first. */
function tiers(state: RoundsState): PlayerId[][] {
  const ranked = [...state.players].sort((a, b) => compare(state, a, b));
  const out: PlayerId[][] = [];
  for (const id of ranked) {
    const last = out[out.length - 1];
    if (last && compare(state, last[last.length - 1]!, id) === 0) last.push(id);
    else out.push([id]);
  }
  return out;
}

/** Final standings: place is 1 + (players ranked strictly higher); tied players share a place. */
export function standings(state: RoundsState): Placement[] {
  const out: Placement[] = [];
  let place = 1;
  for (const tier of tiers(state)) {
    out.push({ place, players: tier, wins: state.wins[tier[0]!] ?? 0 });
    place += tier.length;
  }
  return out;
}

export function nextRound(state: RoundsState): NextRound {
  if (state.index < state.total) return { kind: "play", roundNumber: state.index + 1 };
  // Regular rounds done — resolve podium ties top-down (only places within the top 3).
  let place = 1;
  for (const tier of tiers(state)) {
    if (tier.length > 1 && place <= 3) return { kind: "tiebreak", players: tier, place };
    place += tier.length;
  }
  return { kind: "done", podium: standings(state) };
}
