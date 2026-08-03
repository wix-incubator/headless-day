import { describe, expect, it } from "vitest";
import {
  ROAD_DT,
  ROUND_TIMEOUT_S,
  SUDDEN_DEATH_START_S,
  WRECK_LINGER_TICKS,
} from "./constants";
import { IDLE_DRIVE_INTENT } from "./intent";
import { arenaFeaturesForRound } from "./arena";
import { createRoadWorld, startNextRoadRound } from "./match";
import { stepRoadWorld } from "./sim";

describe("Road Madness simulation", () => {
  it("accelerates a car in its forward direction at a fixed tick", () => {
    let world = createRoadWorld([{ id: "player", vehicle: "derby" }]);
    world = {
      ...world,
      cars: {
        player: {
          ...world.cars.player!,
          pos: { x: 10, y: 10 },
          heading: 0,
        },
      },
    };
    for (let i = 0; i < 30; i += 1) {
      world = stepRoadWorld(
        world,
        { player: { ...IDLE_DRIVE_INTENT, throttle: 1 } },
        ROAD_DT,
      );
    }
    expect(world.cars.player!.pos.x).toBeGreaterThan(13);
    expect(Math.abs(world.cars.player!.pos.y - 10)).toBeLessThan(0.001);
    expect(world.cars.player!.vel.x).toBeGreaterThan(0);
  });

  it("uses canonical nitro to accelerate harder, drain the meter, and emit one start event", () => {
    let normal = createRoadWorld([{ id: "player", vehicle: "derby" }]);
    let boosted = createRoadWorld([{ id: "player", vehicle: "derby" }]);
    for (const world of [normal, boosted]) {
      world.cars.player = {
        ...world.cars.player!,
        pos: { x: 10, y: 10 },
        heading: 0,
      };
    }
    const throttle = { ...IDLE_DRIVE_INTENT, throttle: 1 };
    const boost = { ...throttle, boost: true };
    normal = stepRoadWorld(normal, { player: throttle }, ROAD_DT);
    boosted = stepRoadWorld(boosted, { player: boost }, ROAD_DT);
    expect(boosted.events.filter((event) => event.kind === "nitro")).toHaveLength(1);

    for (let tick = 1; tick < 30; tick += 1) {
      normal = stepRoadWorld(normal, { player: throttle }, ROAD_DT);
      boosted = stepRoadWorld(boosted, { player: boost }, ROAD_DT);
    }
    expect(boosted.cars.player!.vel.x).toBeGreaterThan(normal.cars.player!.vel.x);
    expect(boosted.cars.player!.nitro).toBeLessThan(1);
    expect(boosted.cars.player!.boosting).toBe(true);
  });

  it("honors the host nitro rule and only recharges after boost is released", () => {
    let disabled = createRoadWorld(
      [{ id: "player", vehicle: "derby" }],
      "last-madman",
      { nitroEnabled: false },
    );
    const boost = { ...IDLE_DRIVE_INTENT, throttle: 1, boost: true };
    disabled = stepRoadWorld(disabled, { player: boost }, ROAD_DT);
    expect(disabled.cars.player!.boosting).toBe(false);
    expect(disabled.cars.player!.nitro).toBe(1);
    expect(disabled.events.some((event) => event.kind === "nitro")).toBe(false);

    let enabled = createRoadWorld([{ id: "player", vehicle: "derby" }]);
    for (let tick = 0; tick < 90; tick += 1) {
      enabled = stepRoadWorld(enabled, { player: boost }, ROAD_DT);
    }
    expect(enabled.cars.player!.nitro).toBe(0);
    for (let tick = 0; tick < 30; tick += 1) {
      enabled = stepRoadWorld(enabled, { player: boost }, ROAD_DT);
    }
    expect(enabled.cars.player!.nitro).toBe(0);
    for (let tick = 0; tick < 30; tick += 1) {
      enabled = stepRoadWorld(enabled, { player: IDLE_DRIVE_INTENT }, ROAD_DT);
    }
    expect(enabled.cars.player!.nitro).toBeGreaterThan(0.1);
  });

  it("launches a car from a speed pad once per cooldown window", () => {
    let world = createRoadWorld([{ id: "player", vehicle: "derby" }]);
    const pad = arenaFeaturesForRound(world.roundNumber).speedPads[0];
    world.cars.player = {
      ...world.cars.player!,
      pos: { ...pad.pos },
      vel: { x: 0, y: 0 },
      heading: 0,
    };
    world = stepRoadWorld(world, { player: IDLE_DRIVE_INTENT }, ROAD_DT);
    expect(world.cars.player!.vel.x).toBeGreaterThanOrEqual(8.5);
    expect(
      world.events.some(
        (event) => event.kind === "speed-pad" && event.carId === "player",
      ),
    ).toBe(true);

    world.cars.player = {
      ...world.cars.player!,
      pos: { ...pad.pos },
      vel: { x: 0, y: 0 },
    };
    world = stepRoadWorld(world, { player: IDLE_DRIVE_INTENT }, ROAD_DT);
    expect(
      world.events.some(
        (event) => event.tick === world.tick && event.kind === "speed-pad",
      ),
    ).toBe(false);
  });

  it("bounces and damages a car that drives into a spike tower", () => {
    let world = createRoadWorld([
      { id: "player", vehicle: "derby" },
      { id: "rival", vehicle: "monster" },
    ]);
    const tower = arenaFeaturesForRound(world.roundNumber).towers[0];
    world.cars.player = {
      ...world.cars.player!,
      pos: { x: tower.pos.x - 1.72, y: tower.pos.y },
      vel: { x: 8, y: 0 },
      heading: 0,
    };
    world.cars.rival = {
      ...world.cars.rival!,
      pos: { x: 26, y: 16 },
      vel: { x: 0, y: 0 },
    };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.cars.player!.health).toBeLessThan(world.cars.player!.maxHealth);
    expect(world.cars.player!.vel.x).toBeLessThan(0);
    expect(
      world.events.some(
        (event) => event.kind === "tower-hit" && event.carId === "player",
      ),
    ).toBe(true);
  });

  it("keeps a wreck as an obstacle for five seconds, then removes it from play", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "derby" },
      { id: "c", vehicle: "monster" },
    ]);
    world.cars.b = {
      ...world.cars.b!,
      status: "wrecked",
      health: 0,
      wreckedAtTick: 0,
    };
    for (let tick = 0; tick < WRECK_LINGER_TICKS - 1; tick += 1) {
      world = stepRoadWorld(world, {}, ROAD_DT);
    }
    expect(world.cars.b!.status).toBe("wrecked");
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.cars.b!.status).toBe("removed");
    expect(world.cars.b!.vel).toEqual({ x: 0, y: 0 });
    expect(world.phase).toBe("playing");
  });

  it("a clean moving front-bumper hit damages a parked car, not the rammer", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "derby" },
    ]);
    world.cars.a = {
      ...world.cars.a!,
      pos: { x: 10, y: 10 },
      vel: { x: 9, y: 0 },
      heading: 0,
    };
    world.cars.b = {
      ...world.cars.b!,
      pos: { x: 12, y: 10 },
      vel: { x: 0, y: 0 },
      heading: 0,
    };
    const next = stepRoadWorld(world, {}, ROAD_DT);
    expect(next.cars.b!.health).toBeLessThan(next.cars.b!.maxHealth);
    expect(next.cars.a!.health).toBe(next.cars.a!.maxHealth);
    expect(next.events.some((event) => event.kind === "impact" && event.sourceId === "a")).toBe(true);
  });

  it("a side scrape separates cars without dealing authored damage", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "derby" },
    ]);
    world.cars.a = {
      ...world.cars.a!,
      pos: { x: 10, y: 10 },
      vel: { x: 9, y: 0 },
      heading: Math.PI / 2,
    };
    world.cars.b = {
      ...world.cars.b!,
      pos: { x: 12, y: 10 },
      vel: { x: 0, y: 0 },
      heading: 0,
    };
    const next = stepRoadWorld(world, {}, ROAD_DT);
    expect(next.cars.a!.health).toBe(next.cars.a!.maxHealth);
    expect(next.cars.b!.health).toBe(next.cars.b!.maxHealth);
    expect(next.events).toHaveLength(0);
  });

  it("uses a pair cooldown so one overlap cannot deal damage every tick", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "derby" },
    ]);
    world.cars.a = {
      ...world.cars.a!,
      pos: { x: 10, y: 10 },
      vel: { x: 9, y: 0 },
      heading: 0,
    };
    world.cars.b = { ...world.cars.b!, pos: { x: 12, y: 10 }, heading: 0 };
    world = stepRoadWorld(world, {}, ROAD_DT);
    const healthAfterFirst = world.cars.b!.health;
    world.cars.a = {
      ...world.cars.a!,
      pos: { x: 10, y: 10 },
      vel: { x: 9, y: 0 },
      heading: 0,
    };
    world.cars.b = {
      ...world.cars.b!,
      pos: { x: 12, y: 10 },
      vel: { x: 0, y: 0 },
      heading: 0,
    };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.cars.b!.health).toBe(healthAfterFirst);
  });

  it("wrecks the final opponent and ends with the surviving winner", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "monster" },
      { id: "b", vehicle: "derby" },
    ], "last-madman", { bestOf: 1 });
    world.cars.a = {
      ...world.cars.a!,
      pos: { x: 10, y: 10 },
      vel: { x: 9, y: 0 },
      heading: 0,
    };
    world.cars.b = {
      ...world.cars.b!,
      pos: { x: 12.1, y: 10 },
      vel: { x: 0, y: 0 },
      heading: 0,
      health: 1,
    };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.cars.b!.status).toBe("wrecked");
    expect(world.phase).toBe("ended");
    expect(world.winnerId).toBe("a");
    expect(world.events.some((event) => event.kind === "wrecked" && event.carId === "b")).toBe(true);
  });

  it("carries standings through a best-of-three and rotates the next-round grid", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "monster" },
    ], "last-madman", { bestOf: 3 });
    const firstSpawn = { ...world.cars.a!.pos };
    world.cars.a = { ...world.cars.a!, damageDealt: 17 };
    world.cars.b = { ...world.cars.b!, status: "wrecked", health: 0, wreckedAtTick: 0 };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.phase).toBe("round-ended");
    expect(world.roundWinnerId).toBe("a");
    expect(world.roundWins.a).toBe(1);
    expect(world.winnerId).toBeNull();
    world.arenaCooldowns = { '["pad","a","speed-a"]': 1 };

    world = startNextRoadRound(world);
    expect(world.phase).toBe("playing");
    expect(world.roundNumber).toBe(2);
    expect(world.cars.a!.pos).not.toEqual(firstSpawn);
    expect(world.cars.a!.health).toBe(world.cars.a!.maxHealth);
    expect(world.cars.a!.damageDealt).toBe(17);
    expect(world.cars.a!.roundDamageDealt).toBe(0);
    expect(world.arenaCooldowns).toEqual({});

    world.cars.b = { ...world.cars.b!, status: "wrecked", health: 0, wreckedAtTick: world.tick };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.phase).toBe("ended");
    expect(world.winnerId).toBe("a");
    expect(world.roundWins.a).toBe(2);
  });

  it("records a simultaneous-wreck round as a draw without awarding a win", () => {
    let world = createRoadWorld([
      { id: "a", vehicle: "derby" },
      { id: "b", vehicle: "derby" },
    ]);
    world.cars.a = { ...world.cars.a!, status: "wrecked", health: 0, wreckedAtTick: 0 };
    world.cars.b = { ...world.cars.b!, status: "wrecked", health: 0, wreckedAtTick: 0 };
    world = stepRoadWorld(world, {}, ROAD_DT);
    expect(world.phase).toBe("round-ended");
    expect(world.roundWinnerId).toBeNull();
    expect(world.roundEndReason).toBe("draw");
    expect(world.roundWins).toEqual({ a: 0, b: 0 });
  });

  it("starts sudden death at 75 seconds, contracts the walls, and escalates ram damage", () => {
    const specs = [
      { id: "a", vehicle: "derby" as const },
      { id: "b", vehicle: "derby" as const },
      { id: "c", vehicle: "monster" as const },
    ];
    let normal = createRoadWorld(specs);
    let sudden = createRoadWorld(specs);
    for (const world of [normal, sudden]) {
      world.cars.a = { ...world.cars.a!, pos: { x: 10, y: 10 }, vel: { x: 9, y: 0 }, heading: 0 };
      world.cars.b = { ...world.cars.b!, pos: { x: 12, y: 10 }, vel: { x: 0, y: 0 }, heading: 0 };
      world.cars.c = { ...world.cars.c!, pos: { x: 20, y: 15 } };
    }
    sudden.elapsed = SUDDEN_DEATH_START_S + 20;
    normal = stepRoadWorld(normal, {}, ROAD_DT);
    sudden = stepRoadWorld(sudden, {}, ROAD_DT);
    expect(sudden.suddenDeath).toBe(true);
    expect(sudden.safeBounds.minX).toBeGreaterThan(0);
    expect(sudden.safeBounds.maxY).toBeLessThan(20);
    expect(sudden.damageMultiplier).toBeGreaterThan(1);
    expect(sudden.cars.b!.health).toBeLessThan(normal.cars.b!.health);
  });

  it("resolves the hard timeout by health, then current-round damage, with exact ties drawing", () => {
    const makeTimeout = () => {
      const world = createRoadWorld([
        { id: "a", vehicle: "derby" },
        { id: "b", vehicle: "derby" },
      ]);
      world.elapsed = ROUND_TIMEOUT_S - ROAD_DT / 2;
      world.cars.a = { ...world.cars.a!, health: 60, roundDamageDealt: 12 };
      world.cars.b = { ...world.cars.b!, health: 60, roundDamageDealt: 8 };
      return world;
    };

    let damageWin = stepRoadWorld(makeTimeout(), {}, ROAD_DT);
    expect(damageWin.phase).toBe("round-ended");
    expect(damageWin.roundWinnerId).toBe("a");
    expect(damageWin.roundEndReason).toBe("timeout");

    const healthWorld = makeTimeout();
    healthWorld.cars.b = { ...healthWorld.cars.b!, health: 70, roundDamageDealt: 0 };
    const healthWin = stepRoadWorld(healthWorld, {}, ROAD_DT);
    expect(healthWin.roundWinnerId).toBe("b");

    const tieWorld = makeTimeout();
    tieWorld.cars.b = { ...tieWorld.cars.b!, roundDamageDealt: 12 };
    const draw = stepRoadWorld(tieWorld, {}, ROAD_DT);
    expect(draw.roundWinnerId).toBeNull();
    expect(draw.roundEndReason).toBe("draw");
  });
});
