/** Pure world factory + queries. Spawns are a deterministic ring (sorted-id order). */

import { OVERRUN_FIELD_M, PLAYER_HEALTH } from "./constants";
import { DEFAULT_GUN, freshAmmo } from "./weapons";
import type { OverrunMode, PlayerId, ShooterPlayer, ShooterWorld } from "./types";

const SPAWN_RING_M = 3;

export function createShooterWorld(ids: PlayerId[], seed: number, mode: OverrunMode = "survival"): ShooterWorld {
  const sorted = [...ids].sort();
  const c = OVERRUN_FIELD_M / 2;
  const players: Record<PlayerId, ShooterPlayer> = {};
  sorted.forEach((id, i) => {
    const a = (i / sorted.length) * Math.PI * 2 - Math.PI / 2;
    players[id] = {
      id,
      pos: { x: c + Math.cos(a) * SPAWN_RING_M, y: c + Math.sin(a) * SPAWN_RING_M },
      aim: 0,
      health: PLAYER_HEALTH,
      status: "alive",
      gun: DEFAULT_GUN,
      ammo: freshAmmo(DEFAULT_GUN),
      xp: 0,
      level: 0,
      perks: [],
      offers: [],
      stats: { shots: 0, hits: 0, kills: 0 },
      reviveProgress: 0,
      swapGuard: 0,
    };
  });
  return {
    tick: 0, phase: "playing", mode, seed, wave: 0, partySize: sorted.length,
    pending: [], intermission: 0, stageIntroRemaining: 0, players, enemies: [], pickups: [], events: [],
    score: 0, spawnSeq: 0, pity: 0,
  };
}

/**
 * Reset every player to the fresh baseline — level 0, pistol, no perks, full HP, back on the spawn
 * ring — preserving only cumulative run `stats`. Used at each campaign stage boundary so every stage
 * starts weak (a self-contained escalation).
 */
export function resetPartyForStage(
  players: Record<PlayerId, ShooterPlayer>,
): Record<PlayerId, ShooterPlayer> {
  const ids = Object.keys(players).sort();
  const c = OVERRUN_FIELD_M / 2;
  const out: Record<PlayerId, ShooterPlayer> = {};
  ids.forEach((id, i) => {
    const prev = players[id]!;
    const a = (i / ids.length) * Math.PI * 2 - Math.PI / 2;
    out[id] = {
      ...prev,
      pos: { x: c + Math.cos(a) * SPAWN_RING_M, y: c + Math.sin(a) * SPAWN_RING_M },
      health: PLAYER_HEALTH,
      status: "alive",
      gun: DEFAULT_GUN,
      ammo: freshAmmo(DEFAULT_GUN),
      xp: 0,
      level: 0,
      perks: [],
      offers: [],
      reviveProgress: 0,
      swapGuard: 0,
    };
  });
  return out;
}

export function sortedPlayerIds(w: ShooterWorld): PlayerId[] {
  return Object.keys(w.players).sort();
}

export function alivePlayers(w: ShooterWorld): ShooterPlayer[] {
  return sortedPlayerIds(w)
    .map((id) => w.players[id]!)
    .filter((p) => p.status === "alive");
}
