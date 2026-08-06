/**
 * Pure fixed-step Road Madness reducer. It deliberately uses an authored arcade
 * car model and circle collision shell: predictable controls matter more here
 * than general-purpose rigid-body realism.
 */

import {
  CAR_RESTITUTION,
  EVENT_TTL_TICKS,
  IMPACT_COOLDOWN_S,
  MIN_DAMAGE_SPEED_MS,
  NITRO_ACCELERATION_MULT,
  NITRO_DRAIN_PER_S,
  NITRO_MAX_SPEED_MULT,
  NITRO_RECHARGE_PER_S,
  ROUND_TIMEOUT_S,
  ROAD_ARENA_HEIGHT_M,
  ROAD_ARENA_WIDTH_M,
  SUDDEN_DEATH_MAX_DAMAGE_MULT,
  SUDDEN_DEATH_MAX_INSET_X_M,
  SUDDEN_DEATH_MAX_INSET_Y_M,
  SUDDEN_DEATH_SHRINK_S,
  SUDDEN_DEATH_START_S,
  SPEED_PAD_BONUS_MS,
  SPEED_PAD_COOLDOWN_S,
  SPEED_PAD_MIN_LAUNCH_MS,
  SPIKE_TOWER_COOLDOWN_S,
  SPIKE_TOWER_DAMAGE_PER_MS,
  SPIKE_TOWER_RESTITUTION,
  WALL_RESTITUTION,
  WRECK_LINGER_TICKS,
} from "./constants";
import {
  arenaFeatureCooldownKey,
  arenaFeaturesForRound,
  type SpeedPad,
  type SpikeTower,
} from "./arena";
import { carImpactDamage, forwardVector, pairKey } from "./collision";
import { IDLE_DRIVE_INTENT } from "./intent";
import { roundsToWin } from "./match";
import type { ArenaBounds, CarState, DriveIntent, PlayerId, RoadEvent, RoadWorld, Vec2 } from "./types";
import { vehicleDef } from "./vehicles";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;

function cloneCar(car: CarState): CarState {
  return { ...car, pos: { ...car.pos }, vel: { ...car.vel } };
}

function stepCar(car: CarState, intent: DriveIntent, dt: number, nitroEnabled: boolean): CarState {
  const next = cloneCar(car);
  const def = vehicleDef(next.vehicle);
  if (next.status === "removed") return next;
  if (next.status === "wrecked") {
    next.boosting = false;
    const coast = Math.max(0, 1 - 2.4 * dt);
    next.vel.x *= coast;
    next.vel.y *= coast;
    next.pos.x += next.vel.x * dt;
    next.pos.y += next.vel.y * dt;
    return next;
  }

  const forward0 = forwardVector(next.heading);
  const right0 = { x: -forward0.y, y: forward0.x };
  let forwardSpeed = dot(next.vel, forward0);
  let lateralSpeed = dot(next.vel, right0);
  const boosting =
    nitroEnabled &&
    intent.boost &&
    intent.throttle > 0 &&
    forwardSpeed >= -0.2 &&
    next.nitro > 0;
  next.boosting = boosting;
  next.nitro = clamp(
    next.nitro +
      (boosting
        ? -NITRO_DRAIN_PER_S * dt
        : !nitroEnabled || !intent.boost
          ? NITRO_RECHARGE_PER_S * dt
          : 0),
    0,
    1,
  );

  const speedRatio = clamp(Math.abs(forwardSpeed) / Math.max(1, def.maxSpeed), 0, 1);
  const steeringAuthority = 0.16 + speedRatio * 0.84;
  const direction = forwardSpeed < -0.2 ? -1 : 1;
  const driftTurn = intent.handbrake ? 1.2 : 1;
  next.heading += intent.steer * def.turnRate * steeringAuthority * direction * driftTurn * dt;

  if (intent.throttle > 0) {
    forwardSpeed +=
      def.acceleration *
      intent.throttle *
      (boosting ? NITRO_ACCELERATION_MULT : 1) *
      dt;
  } else if (intent.throttle < 0) {
    if (forwardSpeed > 0.35) forwardSpeed = Math.max(0, forwardSpeed - def.brake * -intent.throttle * dt);
    else forwardSpeed -= def.reverseAcceleration * -intent.throttle * dt;
  }

  const maxForwardSpeed = def.maxSpeed * (boosting ? NITRO_MAX_SPEED_MULT : 1);
  forwardSpeed = clamp(forwardSpeed, -def.reverseSpeed, maxForwardSpeed);
  const grip = intent.handbrake ? def.handbrakeGrip : def.grip;
  lateralSpeed *= Math.max(0, 1 - grip * dt);
  forwardSpeed *= Math.max(0, 1 - def.drag * dt);

  const forward = forwardVector(next.heading);
  const right = { x: -forward.y, y: forward.x };
  next.vel.x = forward.x * forwardSpeed + right.x * lateralSpeed;
  next.vel.y = forward.y * forwardSpeed + right.y * lateralSpeed;
  next.pos.x += next.vel.x * dt;
  next.pos.y += next.vel.y * dt;
  return next;
}

export function suddenDeathState(elapsed: number): {
  active: boolean;
  bounds: ArenaBounds;
  damageMultiplier: number;
} {
  const progress = clamp((elapsed - SUDDEN_DEATH_START_S) / SUDDEN_DEATH_SHRINK_S, 0, 1);
  const insetX = SUDDEN_DEATH_MAX_INSET_X_M * progress;
  const insetY = SUDDEN_DEATH_MAX_INSET_Y_M * progress;
  return {
    active: elapsed >= SUDDEN_DEATH_START_S,
    bounds: {
      minX: insetX,
      maxX: ROAD_ARENA_WIDTH_M - insetX,
      minY: insetY,
      maxY: ROAD_ARENA_HEIGHT_M - insetY,
    },
    damageMultiplier: 1 + (SUDDEN_DEATH_MAX_DAMAGE_MULT - 1) * progress,
  };
}

function containInArena(car: CarState, bounds: ArenaBounds): void {
  const radius = vehicleDef(car.vehicle).collisionRadius;
  if (car.pos.x < bounds.minX + radius) {
    car.pos.x = bounds.minX + radius;
    if (car.vel.x < 0) car.vel.x *= -WALL_RESTITUTION;
  } else if (car.pos.x > bounds.maxX - radius) {
    car.pos.x = bounds.maxX - radius;
    if (car.vel.x > 0) car.vel.x *= -WALL_RESTITUTION;
  }
  if (car.pos.y < bounds.minY + radius) {
    car.pos.y = bounds.minY + radius;
    if (car.vel.y < 0) car.vel.y *= -WALL_RESTITUTION;
  } else if (car.pos.y > bounds.maxY - radius) {
    car.pos.y = bounds.maxY - radius;
    if (car.vel.y > 0) car.vel.y *= -WALL_RESTITUTION;
  }
}

interface DamageResult {
  target: CarState;
  actual: number;
  wrecked: boolean;
}

function applyDamage(target: CarState, damage: number, tick: number): DamageResult {
  if (target.status !== "alive" || damage <= 0) return { target, actual: 0, wrecked: false };
  const actual = Math.min(target.health, damage);
  const health = Math.max(0, target.health - damage);
  const wrecked = health === 0;
  return {
    target: {
      ...target,
      health,
      status: wrecked ? "wrecked" : "alive",
      boosting: wrecked ? false : target.boosting,
      wreckedAtTick: wrecked ? tick : target.wreckedAtTick,
    },
    actual,
    wrecked,
  };
}

function resolvePair(
  a: CarState,
  b: CarState,
  canDamage: boolean,
  tick: number,
  damageMultiplier: number,
): { a: CarState; b: CarState; events: RoadEvent[]; damaged: boolean } {
  if (a.status === "removed" || b.status === "removed") {
    return { a, b, events: [], damaged: false };
  }
  const da = vehicleDef(a.vehicle);
  const db = vehicleDef(b.vehicle);
  let dx = b.pos.x - a.pos.x;
  let dy = b.pos.y - a.pos.y;
  let distance = Math.hypot(dx, dy);
  const minDistance = da.collisionRadius + db.collisionRadius;
  if (distance >= minDistance) return { a, b, events: [], damaged: false };

  // Stable fallback for exact overlap; id order is already stable in the caller.
  if (distance < 1e-6) {
    dx = 1;
    dy = 0;
    distance = 1;
  }
  const normal = { x: dx / distance, y: dy / distance };
  const overlap = minDistance - distance;
  const invMassA = 1 / da.mass;
  const invMassB = 1 / db.mass;
  const invMassSum = invMassA + invMassB;
  const nextA = cloneCar(a);
  const nextB = cloneCar(b);

  nextA.pos.x -= normal.x * overlap * (invMassA / invMassSum);
  nextA.pos.y -= normal.y * overlap * (invMassA / invMassSum);
  nextB.pos.x += normal.x * overlap * (invMassB / invMassSum);
  nextB.pos.y += normal.y * overlap * (invMassB / invMassSum);

  const relative = { x: nextA.vel.x - nextB.vel.x, y: nextA.vel.y - nextB.vel.y };
  const closingSpeed = dot(relative, normal);
  if (closingSpeed > 0) {
    const impulse = ((1 + CAR_RESTITUTION) * closingSpeed) / invMassSum;
    nextA.vel.x -= normal.x * impulse * invMassA;
    nextA.vel.y -= normal.y * impulse * invMassA;
    nextB.vel.x += normal.x * impulse * invMassB;
    nextB.vel.y += normal.y * impulse * invMassB;
  }

  if (!canDamage || closingSpeed <= 0 || a.status !== "alive" || b.status !== "alive") {
    return { a: nextA, b: nextB, events: [], damaged: false };
  }

  // Attribute only the part of the closing speed that each car actually drove
  // into the contact. A parked rear bumper should not "attack" the rammer, while
  // a true head-on collision legitimately lets both bumpers deal damage.
  const approachA = Math.min(closingSpeed, Math.max(0, dot(a.vel, normal)));
  const approachB = Math.min(
    closingSpeed,
    Math.max(0, dot(b.vel, { x: -normal.x, y: -normal.y })),
  );
  const hitA = carImpactDamage(a, b, normal, approachA);
  const hitB = carImpactDamage(b, a, { x: -normal.x, y: -normal.y }, approachB);
  const damageToB = applyDamage(nextB, hitA.damage * damageMultiplier, tick);
  const damageToA = applyDamage(nextA, hitB.damage * damageMultiplier, tick);
  let resultA = damageToA.target;
  let resultB = damageToB.target;
  resultA = {
    ...resultA,
    roundDamageDealt: resultA.roundDamageDealt + damageToB.actual,
    damageDealt: resultA.damageDealt + damageToB.actual,
  };
  resultB = {
    ...resultB,
    roundDamageDealt: resultB.roundDamageDealt + damageToA.actual,
    damageDealt: resultB.damageDealt + damageToA.actual,
  };

  const point = {
    x: (resultA.pos.x + resultB.pos.x) / 2,
    y: (resultA.pos.y + resultB.pos.y) / 2,
  };
  const events: RoadEvent[] = [];
  if (damageToB.actual > 0 && hitA.bumper !== "side") {
    events.push({
      tick,
      kind: "impact",
      sourceId: a.id,
      targetId: b.id,
      point,
      damage: damageToB.actual,
      bumper: hitA.bumper,
    });
  }
  if (damageToA.actual > 0 && hitB.bumper !== "side") {
    events.push({
      tick,
      kind: "impact",
      sourceId: b.id,
      targetId: a.id,
      point,
      damage: damageToA.actual,
      bumper: hitB.bumper,
    });
  }
  if (damageToB.wrecked) events.push({ tick, kind: "wrecked", carId: b.id, byId: a.id, point });
  if (damageToA.wrecked) events.push({ tick, kind: "wrecked", carId: a.id, byId: b.id, point });
  return { a: resultA, b: resultB, events, damaged: damageToA.actual > 0 || damageToB.actual > 0 };
}

function resolveSpikeTower(
  car: CarState,
  tower: SpikeTower,
  canDamage: boolean,
  tick: number,
  damageMultiplier: number,
): { car: CarState; events: RoadEvent[]; damaged: boolean } {
  if (car.status === "removed") return { car, events: [], damaged: false };
  const carRadius = vehicleDef(car.vehicle).collisionRadius;
  let dx = car.pos.x - tower.pos.x;
  let dy = car.pos.y - tower.pos.y;
  let distance = Math.hypot(dx, dy);
  const minDistance = carRadius + tower.radius;
  if (distance >= minDistance) return { car, events: [], damaged: false };
  if (distance < 1e-6) {
    dx = car.id < tower.id ? -1 : 1;
    dy = 0;
    distance = 1;
  }

  const normal = { x: dx / distance, y: dy / distance };
  const next = cloneCar(car);
  const overlap = minDistance - distance;
  next.pos.x += normal.x * overlap;
  next.pos.y += normal.y * overlap;

  const normalSpeed = dot(next.vel, normal);
  const impactSpeed = Math.max(0, -normalSpeed);
  if (normalSpeed < 0) {
    next.vel.x -= normal.x * normalSpeed * (1 + SPIKE_TOWER_RESTITUTION);
    next.vel.y -= normal.y * normalSpeed * (1 + SPIKE_TOWER_RESTITUTION);
  }
  if (!canDamage || car.status !== "alive" || impactSpeed <= MIN_DAMAGE_SPEED_MS) {
    return { car: next, events: [], damaged: false };
  }

  const damage =
    (impactSpeed - MIN_DAMAGE_SPEED_MS) *
    SPIKE_TOWER_DAMAGE_PER_MS *
    damageMultiplier;
  const result = applyDamage(next, damage, tick);
  const point = {
    x: tower.pos.x + normal.x * tower.radius,
    y: tower.pos.y + normal.y * tower.radius,
  };
  const events: RoadEvent[] = [];
  if (result.actual > 0) {
    events.push({
      tick,
      kind: "tower-hit",
      carId: car.id,
      towerId: tower.id,
      point,
      damage: result.actual,
    });
  }
  if (result.wrecked) {
    events.push({ tick, kind: "wrecked", carId: car.id, byId: null, point });
  }
  return { car: result.target, events, damaged: result.actual > 0 };
}

function applySpeedPad(
  car: CarState,
  pad: SpeedPad,
  canTrigger: boolean,
  tick: number,
): { car: CarState; event: RoadEvent | null; triggered: boolean } {
  if (!canTrigger || car.status !== "alive") {
    return { car, event: null, triggered: false };
  }
  const dx = car.pos.x - pad.pos.x;
  const dy = car.pos.y - pad.pos.y;
  if (dx * dx + dy * dy > pad.radius * pad.radius) {
    return { car, event: null, triggered: false };
  }

  const next = cloneCar(car);
  const forward = forwardVector(next.heading);
  const forwardSpeed = Math.max(0, dot(next.vel, forward));
  const maxLaunch = vehicleDef(next.vehicle).maxSpeed * 1.35;
  const launchSpeed = Math.min(
    maxLaunch,
    Math.max(SPEED_PAD_MIN_LAUNCH_MS, forwardSpeed + SPEED_PAD_BONUS_MS),
  );
  next.vel = { x: forward.x * launchSpeed, y: forward.y * launchSpeed };
  next.boosting = true;
  return {
    car: next,
    event: {
      tick,
      kind: "speed-pad",
      carId: car.id,
      padId: pad.id,
      point: { ...pad.pos },
    },
    triggered: true,
  };
}

export function stepRoadWorld(
  world: RoadWorld,
  intents: Record<PlayerId, DriveIntent>,
  dt: number,
): RoadWorld {
  if (world.phase !== "playing") return world;
  const tick = world.tick + 1;
  const elapsed = world.elapsed + dt;
  const suddenDeath = suddenDeathState(elapsed);
  const ids = Object.keys(world.cars).sort();
  const cars: Record<PlayerId, CarState> = {};
  const nitroEvents: RoadEvent[] = [];
  for (const id of ids) {
    const before = world.cars[id]!;
    let next = stepCar(before, intents[id] ?? IDLE_DRIVE_INTENT, dt, world.rules.nitroEnabled);
    if (
      next.status === "wrecked" &&
      next.wreckedAtTick !== null &&
      tick - next.wreckedAtTick >= WRECK_LINGER_TICKS
    ) {
      next = { ...next, status: "removed", boosting: false, vel: { x: 0, y: 0 } };
    }
    cars[id] = next;
    if (next.boosting && !before.boosting) {
      nitroEvents.push({ tick, kind: "nitro", carId: id, point: { ...next.pos } });
    }
    containInArena(cars[id]!, suddenDeath.bounds);
  }

  const impactCooldowns: Record<string, number> = {};
  for (const [key, value] of Object.entries(world.impactCooldowns)) {
    const remaining = Math.max(0, value - dt);
    if (remaining > 0) impactCooldowns[key] = remaining;
  }
  const arenaCooldowns: Record<string, number> = {};
  for (const [key, value] of Object.entries(world.arenaCooldowns ?? {})) {
    const remaining = Math.max(0, value - dt);
    if (remaining > 0) arenaCooldowns[key] = remaining;
  }
  const events = [
    ...world.events.filter((event) => event.tick > tick - EVENT_TTL_TICKS),
    ...nitroEvents,
  ];

  const arena = arenaFeaturesForRound(world.roundNumber);
  for (const id of ids) {
    for (const tower of arena.towers) {
      const key = arenaFeatureCooldownKey("tower", id, tower.id);
      const result = resolveSpikeTower(
        cars[id]!,
        tower,
        !(key in arenaCooldowns),
        tick,
        suddenDeath.damageMultiplier,
      );
      cars[id] = result.car;
      events.push(...result.events);
      if (result.damaged) arenaCooldowns[key] = SPIKE_TOWER_COOLDOWN_S;
    }
    for (const pad of arena.speedPads) {
      const key = arenaFeatureCooldownKey("pad", id, pad.id);
      const result = applySpeedPad(cars[id]!, pad, !(key in arenaCooldowns), tick);
      cars[id] = result.car;
      if (result.event) events.push(result.event);
      if (result.triggered) arenaCooldowns[key] = SPEED_PAD_COOLDOWN_S;
    }
  }

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const aId = ids[i]!;
      const bId = ids[j]!;
      const key = pairKey(aId, bId);
      const result = resolvePair(
        cars[aId]!,
        cars[bId]!,
        !(key in impactCooldowns),
        tick,
        suddenDeath.damageMultiplier,
      );
      cars[aId] = result.a;
      cars[bId] = result.b;
      events.push(...result.events);
      if (result.damaged) impactCooldowns[key] = IMPACT_COOLDOWN_S;
    }
  }

  // Pair separation near a wall can push a body outside. Clamp once more after all pairs.
  for (const id of ids) containInArena(cars[id]!, suddenDeath.bounds);

  const alive = ids.filter((id) => cars[id]!.status === "alive");
  let roundWinnerId: PlayerId | null = null;
  let roundEndReason = world.roundEndReason;
  let roundFinished = false;
  if (alive.length <= 1 && ids.length > 1) {
    roundWinnerId = alive[0] ?? null;
    roundEndReason = roundWinnerId ? "last-alive" : "draw";
    roundFinished = true;
  } else if (elapsed >= ROUND_TIMEOUT_S) {
    roundWinnerId = timeoutWinner(cars, alive);
    roundEndReason = roundWinnerId ? "timeout" : "draw";
    roundFinished = true;
  }

  const roundWins = { ...world.roundWins };
  if (roundFinished && roundWinnerId) {
    roundWins[roundWinnerId] = (roundWins[roundWinnerId] ?? 0) + 1;
  }
  const matchWinnerId =
    roundWinnerId && (roundWins[roundWinnerId] ?? 0) >= roundsToWin(world.rules.bestOf)
      ? roundWinnerId
      : null;
  const phase = matchWinnerId ? "ended" : roundFinished ? "round-ended" : "playing";
  return {
    ...world,
    tick,
    phase,
    elapsed,
    matchElapsed: world.matchElapsed + dt,
    roundWins,
    roundWinnerId: roundFinished ? roundWinnerId : null,
    roundEndReason: roundFinished ? roundEndReason : null,
    suddenDeath: suddenDeath.active,
    safeBounds: suddenDeath.bounds,
    damageMultiplier: suddenDeath.damageMultiplier,
    cars,
    impactCooldowns,
    arenaCooldowns,
    events,
    winnerId: matchWinnerId,
  };
}

function timeoutWinner(cars: Record<PlayerId, CarState>, alive: PlayerId[]): PlayerId | null {
  const ordered = alive
    .map((id) => cars[id]!)
    .sort((a, b) =>
      b.health !== a.health
        ? b.health - a.health
        : b.roundDamageDealt !== a.roundDamageDealt
          ? b.roundDamageDealt - a.roundDamageDealt
          : a.id < b.id
            ? -1
            : 1,
    );
  const first = ordered[0];
  const second = ordered[1];
  if (!first) return null;
  if (!second) return first.id;
  if (
    Math.abs(first.health - second.health) < 1e-6 &&
    Math.abs(first.roundDamageDealt - second.roundDamageDealt) < 1e-6
  ) {
    return null;
  }
  return first.id;
}
