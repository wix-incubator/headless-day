/**
 * Pure, deterministic enemy AI for the single-player slice. No clocks/RNG — cadence is
 * derived from `world.tick`, so the same world always yields the same bot intent.
 * Bots double as stand-in "remote players" until real P2P peers arrive (P2).
 */

import type {
  Direction,
  InputState,
  Intent,
  PlayerId,
  PlayerState,
  World,
} from "./types";
import { directionAngle, distance } from "./logic";
import { SWORD_REACH_M } from "../constants";

const NONE: InputState = { up: false, down: false, left: false, right: false };

/** Stable hash of an id, used to stagger bot action cadence. */
function idHash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function facingToward(dx: number, dy: number, prev: Direction): Direction {
  if (dx === 0 && dy === 0) return prev;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

/** Closest alive opponent to `selfId`, or null. */
export function nearestEnemy(
  selfId: PlayerId,
  world: World,
): PlayerState | null {
  const self = world.players[selfId];
  if (!self) return null;
  let best: PlayerState | null = null;
  let bestD = Infinity;
  for (const p of Object.values(world.players)) {
    if (p.id === selfId || p.status !== "alive") continue;
    const d = distance(self.pos, p.pos);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best;
}

const ATTACK_PERIOD = 12; // attack at most once / ~0.6s at 20Hz
const DASH_PERIOD = 45;

/** Produce a bot's Intent for this tick: chase the nearest enemy, attack in reach. */
export function botIntent(selfId: PlayerId, world: World): Intent {
  const self = world.players[selfId];
  if (!self || self.status !== "alive") {
    const f = self?.facing ?? "down";
    return {
      move: { ...NONE },
      facing: f,
      aim: directionAngle(f),
      dash: false,
      attack: false,
      block: false,
    };
  }
  const target = nearestEnemy(selfId, world);
  if (!target)
    return {
      move: { ...NONE },
      facing: self.facing,
      aim: directionAngle(self.facing),
      dash: false,
      attack: false,
      block: false,
    };

  const dx = target.pos.x - self.pos.x;
  const dy = target.pos.y - self.pos.y;
  const dist = Math.hypot(dx, dy);
  const facing = facingToward(dx, dy, self.facing);
  const eps = 0.05;
  const inReach = dist <= SWORD_REACH_M;
  const phase = idHash(selfId);

  const move: InputState = inReach
    ? { ...NONE }
    : { up: dy < -eps, down: dy > eps, left: dx < -eps, right: dx > eps };
  const attack =
    inReach && world.tick % ATTACK_PERIOD === phase % ATTACK_PERIOD;
  const dash =
    !inReach &&
    dist > 4 &&
    self.dash.cooldownRemaining === 0 &&
    world.tick % DASH_PERIOD === phase % DASH_PERIOD;

  // Aim straight at the target so attacks land under the free-aim combat model.
  const aim = Math.atan2(dy, dx);
  return { move, facing, aim, dash, attack, block: false };
}
