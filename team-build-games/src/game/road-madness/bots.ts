import type { BotDifficulty, CarState, DriveIntent, RoadWorld } from "./types";

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export function normalizeAngle(angle: number): number {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

export function nearestOpponent(world: RoadWorld, car: CarState): CarState | null {
  let best: CarState | null = null;
  let bestDistanceSq = Infinity;
  for (const id of Object.keys(world.cars).sort()) {
    const candidate = world.cars[id]!;
    if (candidate.id === car.id || candidate.status !== "alive") continue;
    const dx = candidate.pos.x - car.pos.x;
    const dy = candidate.pos.y - car.pos.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      best = candidate;
      bestDistanceSq = distanceSq;
    }
  }
  return best;
}

const BOT_PROFILES: Record<BotDifficulty, {
  lead: number;
  steerDivisor: number;
  coastAngle: number;
  handbrakeAngle: number;
  handbrakeSpeed: number;
  boostDistance: number;
  boostAngle: number;
}> = {
  rookie: {
    lead: 0.24,
    steerDivisor: 0.92,
    coastAngle: 1.18,
    handbrakeAngle: 1.18,
    handbrakeSpeed: 6.2,
    boostDistance: 11,
    boostAngle: 0.2,
  },
  mad: {
    lead: 0.42,
    steerDivisor: 0.72,
    coastAngle: 1.35,
    handbrakeAngle: 0.95,
    handbrakeSpeed: 5.2,
    boostDistance: 7,
    boostAngle: 0.32,
  },
  maniac: {
    lead: 0.58,
    steerDivisor: 0.58,
    coastAngle: 1.52,
    handbrakeAngle: 0.78,
    handbrakeSpeed: 4.4,
    boostDistance: 5.5,
    boostAngle: 0.45,
  },
};

/** Deterministic chase AI expressed through the exact same controls as a human. */
export function botIntent(world: RoadWorld, car: CarState): DriveIntent {
  if (car.status !== "alive") {
    return { throttle: 0, steer: 0, handbrake: false, boost: false };
  }
  const target = nearestOpponent(world, car);
  if (!target) return { throttle: 0, steer: 0, handbrake: false, boost: false };
  const profile = BOT_PROFILES[world.rules.botDifficulty];

  // Lead the target slightly so bots intersect rather than forming a follow-the-leader train.
  const lead = profile.lead;
  const tx = target.pos.x + target.vel.x * lead;
  const ty = target.pos.y + target.vel.y * lead;
  const desired = Math.atan2(ty - car.pos.y, tx - car.pos.x);
  const error = normalizeAngle(desired - car.heading);
  const speed = Math.hypot(car.vel.x, car.vel.y);

  return {
    // A target behind the bot triggers a forward U-turn, never a reverse ram.
    // Reverse remains a human control and can return later as explicit recovery
    // logic, but pursuit always presents the authored front bumper.
    throttle: Math.abs(error) > profile.coastAngle ? 0.52 : 1,
    steer: clamp(error / profile.steerDivisor, -1, 1),
    handbrake: Math.abs(error) > profile.handbrakeAngle && speed > profile.handbrakeSpeed,
    boost:
      Math.hypot(tx - car.pos.x, ty - car.pos.y) > profile.boostDistance &&
      Math.abs(error) < profile.boostAngle &&
      speed > 2,
  };
}
