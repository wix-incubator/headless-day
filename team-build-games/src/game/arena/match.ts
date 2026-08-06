/**
 * Pure match/round lifecycle: build worlds, query alive players, detect the winner.
 * No engine/DOM/clock/RNG. Spawn placement is deterministic (a ring around the field).
 */

import type {
  Direction,
  MatchPhase,
  PlayerId,
  PlayerState,
  Vec2,
  World,
} from "./types";
import { initialDash } from "./dash";
import { directionAngle } from "./logic";
import { DEFAULT_WEAPON, type Weapon } from "./weapons";
import { DEFAULT_MODE, type GameMode } from "./modes";
import { FIELD_M, START_HEALTH } from "../constants";

export interface SpawnSpec {
  id: PlayerId;
  pos: Vec2;
  facing?: Direction;
  weapon?: Weapon;
}

/** A fresh, full-health, ready-to-play player. */
export function createPlayer(
  id: PlayerId,
  pos: Vec2,
  facing: Direction = "down",
  weapon: Weapon = DEFAULT_WEAPON,
): PlayerState {
  return {
    id,
    pos,
    facing,
    aim: directionAngle(facing),
    weapon,
    health: START_HEALTH,
    status: "alive",
    dash: initialDash(),
    attack: null,
    attackCooldownRemaining: 0,
    block: null,
    blockCooldownRemaining: 0,
    blockImpactSeq: 0,
    stats: { hits: 0, misses: 0, distance: 0 },
  };
}

/** Build a World from spawn specs, in the given phase (defaults to "playing"). */
export function createWorld(
  spawns: SpawnSpec[],
  phase: MatchPhase = "playing",
  mode: GameMode = DEFAULT_MODE,
): World {
  const players: Record<PlayerId, PlayerState> = {};
  for (const s of spawns)
    players[s.id] = createPlayer(s.id, s.pos, s.facing, s.weapon);
  return { mode, players, projectiles: [], phase, tick: 0, winnerId: null };
}

export function alivePlayers(world: World): PlayerState[] {
  return Object.values(world.players).filter((p) => p.status === "alive");
}

export function aliveCount(world: World): number {
  return alivePlayers(world).length;
}

/** The sole survivor's id when exactly one player is alive; otherwise null. */
export function soleSurvivor(world: World): PlayerId | null {
  const alive = alivePlayers(world);
  return alive.length === 1 ? alive[0]!.id : null;
}

/**
 * Deterministic spawn ring: place ids evenly on a circle inside the field,
 * `marginM` meters from the edge, all facing the centre.
 */
export function evenSpawns(
  ids: PlayerId[],
  fieldM = FIELD_M,
  marginM = 2,
): SpawnSpec[] {
  const c = fieldM / 2;
  const radius = c - marginM;
  return ids.map((id, i) => {
    const angle = (i / ids.length) * Math.PI * 2;
    const pos = {
      x: c + radius * Math.cos(angle),
      y: c + radius * Math.sin(angle),
    };
    return { id, pos, facing: facingToCenter(pos, { x: c, y: c }) };
  });
}

/** Nearest cardinal facing from `from` toward `to`. */
function facingToCenter(from: Vec2, to: Vec2): Direction {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}
