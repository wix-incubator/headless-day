/**
 * Leg-ownership reducer: index = leg, value = controlling player (null = unheld).
 * One player holds at most one leg — every mutation goes through these reducers
 * on the HOST, so the invariant can't be violated from the wire.
 */

import { LEG_COUNT } from "./constants";
import type { PlayerId } from "./types";

export type LegControl = (PlayerId | null)[];

export const emptyControl = (): LegControl => Array(LEG_COUNT).fill(null);

export function legOf(control: LegControl, playerId: PlayerId): number | null {
  const i = control.indexOf(playerId);
  return i === -1 ? null : i;
}

export function releasePlayer(control: LegControl, playerId: PlayerId): LegControl {
  const i = control.indexOf(playerId);
  if (i === -1) return control;
  const next = [...control];
  next[i] = null;
  return next;
}

/** Claim `leg` if unheld (releasing the player's previous leg). No-op on bad index / held leg. */
export function claimLeg(control: LegControl, playerId: PlayerId, leg: number): LegControl {
  if (!Number.isInteger(leg) || leg < 0 || leg >= LEG_COUNT) return control;
  if (control[leg] === playerId) return control;
  if (control[leg] !== null && control[leg] !== playerId) return control;
  const next = [...releasePlayer(control, playerId)];
  next[leg] = playerId;
  return next;
}

/** Release the current leg and claim the next unheld one (wrapping); first unheld if none. */
export function cycleLeg(control: LegControl, playerId: PlayerId): LegControl {
  const cur = legOf(control, playerId);
  const start = cur === null ? 0 : cur + 1;
  for (let step = 0; step < LEG_COUNT; step++) {
    const i = (start + step) % LEG_COUNT;
    if (control[i] === null) return claimLeg(control, playerId, i);
  }
  return control; // every other leg is held — keep the current one
}
