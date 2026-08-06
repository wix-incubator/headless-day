// src/game/overrun/net/interp.ts
/**
 * Client-side smoothing: snapshots land at 10 Hz, rendering runs at 60 —
 * lerp player/enemy positions (and player aim) between the last two snapshots.
 * Pure; the session picks alpha = timeSinceLatest / SNAPSHOT_INTERVAL_S.
 */

import type { ShooterWorld } from "../types";

/** Shortest-arc angle interpolation. */
export function lerpAngle(a: number, b: number, t: number): number {
  const TAU = Math.PI * 2;
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Render-world between snapshot `a` (older) and `b` (newer). Positions lerp; state comes from b. */
export function lerpWorlds(a: ShooterWorld | null, b: ShooterWorld, alpha: number): ShooterWorld {
  if (!a || a.tick >= b.tick) return b;
  const t = Math.min(1, Math.max(0, alpha));
  const players = { ...b.players };
  for (const id of Object.keys(players)) {
    const pa = a.players[id];
    const pb = players[id]!;
    if (!pa) continue;
    players[id] = {
      ...pb,
      pos: { x: mix(pa.pos.x, pb.pos.x, t), y: mix(pa.pos.y, pb.pos.y, t) },
      aim: lerpAngle(pa.aim, pb.aim, t),
    };
  }
  const prevEnemies = new Map(a.enemies.map((e) => [e.id, e]));
  const enemies = b.enemies.map((e) => {
    const pe = prevEnemies.get(e.id);
    return pe ? { ...e, pos: { x: mix(pe.pos.x, e.pos.x, t), y: mix(pe.pos.y, e.pos.y, t) } } : e;
  });
  return { ...b, players, enemies };
}
