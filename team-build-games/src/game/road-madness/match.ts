import { ROAD_ARENA_HEIGHT_M, ROAD_ARENA_WIDTH_M } from "./constants";
import type {
  ArenaBounds,
  CarState,
  RoadBestOf,
  RoadMode,
  RoadPlayerSpec,
  RoadRules,
  RoadWorld,
  Vec2,
} from "./types";
import { vehicleDef } from "./vehicles";

interface Spawn {
  pos: Vec2;
  heading: number;
}

const cx = ROAD_ARENA_WIDTH_M / 2;
const cy = ROAD_ARENA_HEIGHT_M / 2;
const SPAWNS: Spawn[] = [
  { pos: { x: 5, y: 4 }, heading: Math.atan2(cy - 4, cx - 5) },
  { pos: { x: 25, y: 16 }, heading: Math.atan2(cy - 16, cx - 25) },
  { pos: { x: 25, y: 4 }, heading: Math.atan2(cy - 4, cx - 25) },
  { pos: { x: 5, y: 16 }, heading: Math.atan2(cy - 16, cx - 5) },
  { pos: { x: 15, y: 3.3 }, heading: Math.PI / 2 },
  { pos: { x: 15, y: 16.7 }, heading: -Math.PI / 2 },
  { pos: { x: 4, y: 10 }, heading: 0 },
  { pos: { x: 26, y: 10 }, heading: Math.PI },
];

export function fullArenaBounds(): ArenaBounds {
  return { minX: 0, maxX: ROAD_ARENA_WIDTH_M, minY: 0, maxY: ROAD_ARENA_HEIGHT_M };
}

export function roundsToWin(bestOf: RoadBestOf): number {
  return Math.floor(bestOf / 2) + 1;
}

function normalizedBestOf(value: RoadBestOf | undefined): RoadBestOf {
  return value === 1 || value === 5 ? value : 3;
}

function buildCars(
  specs: RoadPlayerSpec[],
  spawnOffset = 0,
  previous: Record<string, CarState> = {},
): Record<string, CarState> {
  const cars: Record<string, CarState> = {};
  specs.forEach((spec, index) => {
    const spawn = SPAWNS[(index + spawnOffset) % SPAWNS.length]!;
    const def = vehicleDef(spec.vehicle);
    cars[spec.id] = {
      id: spec.id,
      vehicle: spec.vehicle,
      pos: { ...spawn.pos },
      vel: { x: 0, y: 0 },
      heading: spawn.heading,
      health: def.health,
      maxHealth: def.health,
      status: "alive",
      isBot: spec.isBot ?? false,
      colorIndex: spec.colorIndex ?? index,
      roundDamageDealt: 0,
      damageDealt: previous[spec.id]?.damageDealt ?? 0,
      nitro: 1,
      boosting: false,
      wreckedAtTick: null,
    };
  });
  return cars;
}

export function createRoadWorld(
  specs: RoadPlayerSpec[],
  mode: RoadMode = "last-madman",
  rules: Partial<RoadRules> = {},
): RoadWorld {
  const ordered = [...specs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const activeSpecs = ordered.slice(0, SPAWNS.length);
  const cars = buildCars(activeSpecs);

  return {
    tick: 0,
    mode,
    phase: "playing",
    elapsed: 0,
    matchElapsed: 0,
    rules: {
      nitroEnabled: rules.nitroEnabled ?? true,
      bestOf: normalizedBestOf(rules.bestOf),
      botDifficulty: rules.botDifficulty ?? "mad",
    },
    roundNumber: 1,
    roundWins: Object.fromEntries(activeSpecs.map((spec) => [spec.id, 0])),
    roundWinnerId: null,
    roundEndReason: null,
    suddenDeath: false,
    safeBounds: fullArenaBounds(),
    damageMultiplier: 1,
    cars,
    impactCooldowns: {},
    arenaCooldowns: {},
    events: [],
    winnerId: null,
  };
}

/** Reset bodies for the next round while preserving match wins and cumulative stats. */
export function startNextRoadRound(world: RoadWorld): RoadWorld {
  if (world.phase !== "round-ended") return world;
  const specs: RoadPlayerSpec[] = Object.values(world.cars).map((car) => ({
    id: car.id,
    vehicle: car.vehicle,
    isBot: car.isBot,
    colorIndex: car.colorIndex,
  }));
  specs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    ...world,
    phase: "playing",
    elapsed: 0,
    roundNumber: world.roundNumber + 1,
    roundWinnerId: null,
    roundEndReason: null,
    suddenDeath: false,
    safeBounds: fullArenaBounds(),
    damageMultiplier: 1,
    cars: buildCars(specs, world.roundNumber, world.cars),
    impactCooldowns: {},
    arenaCooldowns: {},
    events: [],
    winnerId: null,
  };
}
