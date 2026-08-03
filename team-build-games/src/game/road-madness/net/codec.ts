/**
 * Compact Road Madness world snapshots. Coordinates and velocity use integer
 * centimetres, headings use milliradians, durations use centiseconds, and
 * normalized meters use thousandths. Deltas diff quantized states so applying
 * a delta lands exactly on `unqWorld(qWorld(hostWorld))` without float drift.
 */

import type {
  ArenaBounds,
  BotDifficulty,
  CarState,
  CarStatus,
  PlayerId,
  RoadEvent,
  RoadMode,
  RoadPhase,
  RoadRoundEndReason,
  RoadWorld,
  VehicleClass,
} from "../types";

const MODES = ["race", "last-madman", "carnage", "bomb-tag"] as const satisfies readonly RoadMode[];
const PHASES = ["playing", "round-ended", "ended"] as const satisfies readonly RoadPhase[];
const VEHICLES = ["sport", "derby", "monster", "street"] as const satisfies readonly VehicleClass[];
const STATUSES = ["alive", "wrecked", "removed"] as const satisfies readonly CarStatus[];
const DIFFICULTIES = ["rookie", "mad", "maniac"] as const satisfies readonly BotDifficulty[];
const END_REASONS = ["last-alive", "timeout", "draw"] as const satisfies readonly RoadRoundEndReason[];
const BUMPERS = ["front", "rear"] as const;

const cm = (value: number): number => Math.round(value * 100);
const meters = (value: number): number => value / 100;
const cs = (value: number): number => Math.round(value * 100);
const seconds = (value: number): number => value / 100;
const milli = (value: number): number => Math.round(value * 1000);
const unmilli = (value: number): number => value / 1000;
const centi = (value: number): number => Math.round(value * 100);
const uncenti = (value: number): number => value / 100;

/**
 * id, vehicle, position, velocity, heading, health/max health, status, bot,
 * color, round/cumulative damage, nitro, boosting, wreck tick (-1 = never).
 */
export type QCar = [
  string,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Event tuples: impact=0, wrecked=1, nitro=2, speed-pad=3, tower-hit=4. */
export type QEvent = (number | string)[];

export interface QRoadWorld {
  t: number;
  m: number;
  ph: number;
  e: number;
  me: number;
  /** nitro enabled, best-of, bot difficulty */
  r: [number, number, number];
  rn: number;
  rw: [string, number][];
  ri: string;
  rr: number;
  sd: number;
  sb: [number, number, number, number];
  dm: number;
  c: QCar[];
  ic: [string, number][];
  ac: [string, number][];
  ev: QEvent[];
  wi: string;
}

/** Full dynamic state against one exact base tick. */
export interface RoadDelta {
  b: number;
  t: number;
  ph: number;
  e: number;
  me: number;
  rn: number;
  rw: [string, number][];
  ri: string;
  rr: number;
  sd: number;
  sb: [number, number, number, number];
  dm: number;
  c: QCar[];
  ic: [string, number][];
  ac: [string, number][];
  ev: QEvent[];
  wi: string;
}

function qCar(car: CarState): QCar {
  return [
    car.id,
    VEHICLES.indexOf(car.vehicle),
    cm(car.pos.x),
    cm(car.pos.y),
    cm(car.vel.x),
    cm(car.vel.y),
    milli(car.heading),
    centi(car.health),
    centi(car.maxHealth),
    STATUSES.indexOf(car.status),
    car.isBot ? 1 : 0,
    car.colorIndex,
    centi(car.roundDamageDealt),
    centi(car.damageDealt),
    milli(car.nitro),
    car.boosting ? 1 : 0,
    car.wreckedAtTick ?? -1,
  ];
}

function unqCar(car: QCar): CarState {
  return {
    id: car[0],
    vehicle: VEHICLES[car[1]]!,
    pos: { x: meters(car[2]), y: meters(car[3]) },
    vel: { x: meters(car[4]), y: meters(car[5]) },
    heading: unmilli(car[6]),
    health: uncenti(car[7]),
    maxHealth: uncenti(car[8]),
    status: STATUSES[car[9]]!,
    isBot: car[10] === 1,
    colorIndex: car[11],
    roundDamageDealt: uncenti(car[12]),
    damageDealt: uncenti(car[13]),
    nitro: unmilli(car[14]),
    boosting: car[15] === 1,
    wreckedAtTick: car[16] < 0 ? null : car[16],
  };
}

function qEvent(event: RoadEvent): QEvent {
  if (event.kind === "impact") {
    return [
      event.tick,
      0,
      event.sourceId,
      event.targetId,
      cm(event.point.x),
      cm(event.point.y),
      centi(event.damage),
      BUMPERS.indexOf(event.bumper),
    ];
  }
  if (event.kind === "wrecked") {
    return [
      event.tick,
      1,
      event.carId,
      event.byId ?? "",
      cm(event.point.x),
      cm(event.point.y),
    ];
  }
  if (event.kind === "nitro") {
    return [event.tick, 2, event.carId, cm(event.point.x), cm(event.point.y)];
  }
  if (event.kind === "speed-pad") {
    return [
      event.tick,
      3,
      event.carId,
      event.padId,
      cm(event.point.x),
      cm(event.point.y),
    ];
  }
  return [
    event.tick,
    4,
    event.carId,
    event.towerId,
    cm(event.point.x),
    cm(event.point.y),
    centi(event.damage),
  ];
}

function unqEvent(event: QEvent): RoadEvent {
  const tick = event[0] as number;
  if (event[1] === 0) {
    return {
      tick,
      kind: "impact",
      sourceId: event[2] as string,
      targetId: event[3] as string,
      point: { x: meters(event[4] as number), y: meters(event[5] as number) },
      damage: uncenti(event[6] as number),
      bumper: BUMPERS[event[7] as number]!,
    };
  }
  if (event[1] === 1) {
    return {
      tick,
      kind: "wrecked",
      carId: event[2] as string,
      byId: event[3] === "" ? null : (event[3] as string),
      point: { x: meters(event[4] as number), y: meters(event[5] as number) },
    };
  }
  if (event[1] === 2) {
    return {
      tick,
      kind: "nitro",
      carId: event[2] as string,
      point: { x: meters(event[3] as number), y: meters(event[4] as number) },
    };
  }
  if (event[1] === 3) {
    return {
      tick,
      kind: "speed-pad",
      carId: event[2] as string,
      padId: event[3] as string,
      point: { x: meters(event[4] as number), y: meters(event[5] as number) },
    };
  }
  return {
    tick,
    kind: "tower-hit",
    carId: event[2] as string,
    towerId: event[3] as string,
    point: { x: meters(event[4] as number), y: meters(event[5] as number) },
    damage: uncenti(event[6] as number),
  };
}

function qBounds(bounds: ArenaBounds): [number, number, number, number] {
  return [cm(bounds.minX), cm(bounds.maxX), cm(bounds.minY), cm(bounds.maxY)];
}

function unqBounds(bounds: QRoadWorld["sb"]): ArenaBounds {
  return {
    minX: meters(bounds[0]),
    maxX: meters(bounds[1]),
    minY: meters(bounds[2]),
    maxY: meters(bounds[3]),
  };
}

export function qWorld(world: RoadWorld): QRoadWorld {
  return {
    t: world.tick,
    m: MODES.indexOf(world.mode),
    ph: PHASES.indexOf(world.phase),
    e: cs(world.elapsed),
    me: cs(world.matchElapsed),
    r: [
      world.rules.nitroEnabled ? 1 : 0,
      world.rules.bestOf,
      DIFFICULTIES.indexOf(world.rules.botDifficulty),
    ],
    rn: world.roundNumber,
    rw: Object.keys(world.roundWins)
      .sort()
      .map((id) => [id, world.roundWins[id]!] as [string, number]),
    ri: world.roundWinnerId ?? "",
    rr: world.roundEndReason === null ? -1 : END_REASONS.indexOf(world.roundEndReason),
    sd: world.suddenDeath ? 1 : 0,
    sb: qBounds(world.safeBounds),
    dm: milli(world.damageMultiplier),
    c: Object.keys(world.cars)
      .sort()
      .map((id) => qCar(world.cars[id]!)),
    ic: Object.keys(world.impactCooldowns)
      .sort()
      .map((key) => [key, cs(world.impactCooldowns[key]!)] as [string, number]),
    ac: Object.keys(world.arenaCooldowns ?? {})
      .sort()
      .map((key) => [key, cs(world.arenaCooldowns[key]!)] as [string, number]),
    ev: world.events.map(qEvent),
    wi: world.winnerId ?? "",
  };
}

export function unqWorld(world: QRoadWorld): RoadWorld {
  const cars: Record<PlayerId, CarState> = {};
  for (const car of world.c) cars[car[0]] = unqCar(car);
  return {
    tick: world.t,
    mode: MODES[world.m]!,
    phase: PHASES[world.ph]!,
    elapsed: seconds(world.e),
    matchElapsed: seconds(world.me),
    rules: {
      nitroEnabled: world.r[0] === 1,
      bestOf: world.r[1] === 1 || world.r[1] === 5 ? world.r[1] : 3,
      botDifficulty: DIFFICULTIES[world.r[2]]!,
    },
    roundNumber: world.rn,
    roundWins: Object.fromEntries(world.rw),
    roundWinnerId: world.ri === "" ? null : world.ri,
    roundEndReason: world.rr < 0 ? null : END_REASONS[world.rr]!,
    suddenDeath: world.sd === 1,
    safeBounds: unqBounds(world.sb),
    damageMultiplier: unmilli(world.dm),
    cars,
    impactCooldowns: Object.fromEntries(
      world.ic.map(([key, remaining]) => [key, seconds(remaining)]),
    ),
    arenaCooldowns: Object.fromEntries(
      world.ac.map(([key, remaining]) => [key, seconds(remaining)]),
    ),
    events: world.ev.map(unqEvent),
    winnerId: world.wi === "" ? null : world.wi,
  };
}

export function diffWorld(previous: QRoadWorld, current: QRoadWorld): RoadDelta {
  return {
    b: previous.t,
    t: current.t,
    ph: current.ph,
    e: current.e,
    me: current.me,
    rn: current.rn,
    rw: current.rw,
    ri: current.ri,
    rr: current.rr,
    sd: current.sd,
    sb: current.sb,
    dm: current.dm,
    c: current.c,
    ic: current.ic,
    ac: current.ac,
    ev: current.ev,
    wi: current.wi,
  };
}

/** Wrong-base deltas are ignored until the next complete keyframe arrives. */
export function applyDelta(previous: RoadWorld, delta: RoadDelta): RoadWorld {
  if (previous.tick !== delta.b) return previous;
  const previousQ = qWorld(previous);
  return unqWorld({
    ...previousQ,
    t: delta.t,
    ph: delta.ph,
    e: delta.e,
    me: delta.me,
    rn: delta.rn,
    rw: delta.rw,
    ri: delta.ri,
    rr: delta.rr,
    sd: delta.sd,
    sb: delta.sb,
    dm: delta.dm,
    c: delta.c,
    ic: delta.ic,
    ac: delta.ac,
    ev: delta.ev,
    wi: delta.wi,
  });
}
