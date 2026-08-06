import { describe, expect, it } from "vitest";
import { PROTOCOL_VERSION } from "../../net/protocol";
import { ROAD_DT } from "../constants";
import { createRoadWorld } from "../match";
import { stepRoadWorld } from "../sim";
import type { DriveIntent, RoadEvent, RoadPlayerSpec, RoadWorld } from "../types";
import { applyDelta, diffWorld, qWorld, unqWorld } from "./codec";

const IDLE: DriveIntent = {
  throttle: 0,
  steer: 0,
  handbrake: false,
  boost: false,
};

const PLAYER_SPECS: RoadPlayerSpec[] = Array.from({ length: 8 }, (_, index) => ({
  id: `player-${index + 1}`,
  vehicle: index % 2 === 0 ? "derby" : "monster",
  isBot: index >= 4,
  colorIndex: index,
}));

const idleIntents = (world: RoadWorld): Record<string, DriveIntent> =>
  Object.fromEntries(Object.keys(world.cars).map((id) => [id, IDLE]));

function fullWorld(): RoadWorld {
  const world = createRoadWorld(PLAYER_SPECS, "last-madman", {
    nitroEnabled: true,
    bestOf: 5,
    botDifficulty: "maniac",
  });
  const ids = Object.keys(world.cars).sort();
  const cars = { ...world.cars };
  for (const [index, id] of ids.entries()) {
    const car = cars[id]!;
    cars[id] = {
      ...car,
      pos: { x: 2.345 + index * 3.1, y: 1.234 + index * 1.7 },
      vel: { x: -8.765 + index, y: 4.321 - index * 0.4 },
      heading: -2.75 + index * 0.61,
      health: car.maxHealth - index * 4.125,
      roundDamageDealt: index * 13.257,
      damageDealt: index * 31.764,
      nitro: 0.137 * index,
      boosting: index % 3 === 0,
      status: index === 6 ? "wrecked" : index === 7 ? "removed" : "alive",
      wreckedAtTick: index >= 6 ? 120 + index : null,
    };
  }

  const events: RoadEvent[] = [
    {
      tick: 149,
      kind: "impact",
      sourceId: ids[0]!,
      targetId: ids[1]!,
      point: { x: 9.876, y: 7.654 },
      damage: 23.456,
      bumper: "front",
    },
    {
      tick: 149,
      kind: "wrecked",
      carId: ids[6]!,
      byId: ids[0]!,
      point: { x: 12.345, y: 8.765 },
    },
    {
      tick: 150,
      kind: "nitro",
      carId: ids[2]!,
      point: { x: 4.567, y: 3.456 },
    },
    {
      tick: 150,
      kind: "speed-pad",
      carId: ids[3]!,
      padId: "speed-a",
      point: { x: 15, y: 5.5 },
    },
    {
      tick: 150,
      kind: "tower-hit",
      carId: ids[4]!,
      towerId: "tower-b",
      point: { x: 19.54, y: 12 },
      damage: 11.234,
    },
  ];

  return {
    ...world,
    tick: 150,
    elapsed: 81.234,
    matchElapsed: 203.456,
    roundNumber: 3,
    roundWins: Object.fromEntries(ids.map((id, index) => [id, index % 3])),
    suddenDeath: true,
    safeBounds: { minX: 1.234, maxX: 28.765, minY: 2.345, maxY: 17.654 },
    damageMultiplier: 1.876,
    cars,
    impactCooldowns: Object.fromEntries(
      Array.from({ length: 28 }, (_, index) => [
        `player-${(index % 7) + 1}|player-${(index % 7) + 2}:${index}`,
        0.01 + index * 0.011,
      ]),
    ),
    arenaCooldowns: {
      "pad:player-1:speed-a": 0.87,
      "tower:player-4:tower-b": 0.23,
    },
    events,
  };
}

describe("Road Madness quantized snapshots", () => {
  it("round-trips every canonical field and becomes idempotent", () => {
    const world = fullWorld();
    const rebuilt = unqWorld(qWorld(world));
    expect(Object.keys(rebuilt.cars)).toEqual(Object.keys(world.cars));
    expect(
      Math.abs(rebuilt.cars["player-3"]!.pos.x - world.cars["player-3"]!.pos.x),
    ).toBeLessThanOrEqual(0.0051);
    expect(rebuilt.cars["player-4"]!.heading).toBeCloseTo(
      world.cars["player-4"]!.heading,
      3,
    );
    expect(rebuilt).toMatchObject({
      tick: 150,
      mode: "last-madman",
      phase: "playing",
      roundNumber: 3,
      suddenDeath: true,
      rules: { nitroEnabled: true, bestOf: 5, botDifficulty: "maniac" },
    });
    expect(rebuilt.events.map((event) => event.kind)).toEqual([
      "impact",
      "wrecked",
      "nitro",
      "speed-pad",
      "tower-hit",
    ]);
    expect(unqWorld(qWorld(rebuilt))).toEqual(rebuilt);
  });

  it("preserves null and non-null round outcomes", () => {
    const world = fullWorld();
    expect(unqWorld(qWorld(world))).toMatchObject({
      roundWinnerId: null,
      roundEndReason: null,
      winnerId: null,
    });
    const ended: RoadWorld = {
      ...world,
      phase: "ended",
      roundWinnerId: "player-1",
      roundEndReason: "timeout",
      winnerId: "player-1",
    };
    expect(unqWorld(qWorld(ended))).toMatchObject({
      phase: "ended",
      roundWinnerId: "player-1",
      roundEndReason: "timeout",
      winnerId: "player-1",
    });
  });
});

describe("Road Madness quantized deltas", () => {
  it("reproduces the quantized host world exactly", () => {
    const raw = fullWorld();
    const previous = unqWorld(qWorld(raw));
    let current = raw;
    for (let index = 0; index < 3; index += 1) {
      current = stepRoadWorld(current, idleIntents(current), ROAD_DT);
    }
    const rebuilt = applyDelta(previous, diffWorld(qWorld(raw), qWorld(current)));
    expect(rebuilt).toEqual(unqWorld(qWorld(current)));
  });

  it("ignores a delta when the held snapshot has the wrong base tick", () => {
    const previous = unqWorld(qWorld(fullWorld()));
    const current = { ...previous, tick: previous.tick + 3 };
    const delta = diffWorld(qWorld(previous), qWorld(current));
    const stale = { ...previous, tick: previous.tick - 1 };
    expect(applyDelta(stale, delta)).toBe(stale);
  });

  it("handles roster changes without retaining removed cars", () => {
    const previous = unqWorld(qWorld(fullWorld()));
    const cars = { ...previous.cars };
    delete cars["player-8"];
    const current: RoadWorld = {
      ...previous,
      tick: previous.tick + 1,
      cars,
      roundWins: { ...previous.roundWins, "late-driver": 0 },
    };
    const rebuilt = applyDelta(previous, diffWorld(qWorld(previous), qWorld(current)));
    expect(rebuilt).toEqual(unqWorld(qWorld(current)));
    expect(rebuilt.cars["player-8"]).toBeUndefined();
  });
});

describe("Road Madness network byte budget", () => {
  it("keeps an eight-car maximum-transient keyframe and delta under budget", () => {
    const world = fullWorld();
    const keyframe = JSON.stringify({
      v: PROTOCOL_VERSION,
      m: { t: "rSnap", w: qWorld(world) },
    });
    expect(keyframe.length).toBeLessThanOrEqual(4096);

    const current: RoadWorld = {
      ...world,
      tick: world.tick + 3,
      elapsed: world.elapsed + ROAD_DT * 3,
      matchElapsed: world.matchElapsed + ROAD_DT * 3,
    };
    const delta = JSON.stringify({
      v: PROTOCOL_VERSION,
      m: { t: "rDelta", d: diffWorld(qWorld(world), qWorld(current)) },
    });
    expect(delta.length).toBeLessThanOrEqual(3072);
  });
});
