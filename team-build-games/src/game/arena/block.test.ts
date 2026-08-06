import { describe, expect, it } from "vitest";
import { BLOCK_COOLDOWN_S, BLOCK_TTL_S, START_HEALTH } from "../constants";
import { blockCooldownFraction, blockCoversSource } from "./combat";
import { createWorld } from "./match";
import { stepWorld } from "./sim";
import type { Intent, PlayerState } from "./types";

const NONE = { up: false, down: false, left: false, right: false } as const;
const idle = (facing: Intent["facing"] = "down"): Intent => ({
  move: NONE,
  facing,
  dash: false,
  attack: false,
  block: false,
});
const action = (
  facing: Intent["facing"],
  aim: number,
  kind: "attack" | "block",
): Intent => ({
  ...idle(facing),
  aim,
  [kind]: true,
});

function activeDefender(): PlayerState {
  const defender = createWorld([{ id: "B", pos: { x: 10, y: 10 } }]).players.B;
  defender.block = { aim: 0, ttl: BLOCK_TTL_S };
  return defender;
}

describe("block guard geometry", () => {
  it("covers incoming attacks in front, but not behind", () => {
    const defender = activeDefender();
    expect(blockCoversSource(defender, { x: 12, y: 10 })).toBe(true);
    expect(blockCoversSource(defender, { x: 8, y: 10 })).toBe(false);
  });

  it("widens the sword guard arc by 20%", () => {
    const defender = activeDefender();
    const sourceAt = (degrees: number) => ({
      x: 10 + Math.cos((degrees * Math.PI) / 180),
      y: 10 + Math.sin((degrees * Math.PI) / 180),
    });
    expect(blockCoversSource(defender, sourceAt(50))).toBe(true);
    expect(blockCoversSource(defender, sourceAt(56))).toBe(false);
  });
});

describe("stepWorld block mechanics", () => {
  it("intercepts a front melee hit and emits a block impact sequence", () => {
    const world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 11, y: 15 }, facing: "left" },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    const next = stepWorld(
      world,
      {
        A: action("right", 0, "attack"),
        B: action("left", Math.PI, "block"),
      },
      0.05,
    );

    expect(next.players.B.health).toBe(START_HEALTH);
    expect(next.players.B.blockImpactSeq).toBe(1);
    expect(next.players.A.stats.hits).toBe(0);
    expect(next.players.A.stats.misses).toBe(1);
  });

  it("does not protect the defender from a rear attack", () => {
    const world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right" },
      { id: "B", pos: { x: 11, y: 15 }, facing: "right" },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    const next = stepWorld(
      world,
      {
        A: action("right", 0, "attack"),
        B: action("right", 0, "block"),
      },
      0.05,
    );

    expect(next.players.B.health).toBe(START_HEALTH - 1);
    expect(next.players.B.blockImpactSeq).toBe(0);
  });

  it("keeps the guard active for 0.2s and recharges it in 1s", () => {
    let world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right" },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    world = stepWorld(world, { A: action("right", 0, "block") }, 0.05);
    expect(world.players.A.block?.ttl).toBeCloseTo(BLOCK_TTL_S, 5);
    expect(world.players.A.blockCooldownRemaining).toBe(BLOCK_COOLDOWN_S);
    expect(blockCooldownFraction(world.players.A.blockCooldownRemaining)).toBe(
      0,
    );

    world = stepWorld(world, { A: idle("right") }, BLOCK_TTL_S);
    expect(world.players.A.block).toBeNull();
    expect(world.players.A.blockCooldownRemaining).toBeCloseTo(0.8, 5);

    world = stepWorld(world, { A: idle("right") }, 0.8);
    expect(world.players.A.blockCooldownRemaining).toBe(0);
    expect(blockCooldownFraction(world.players.A.blockCooldownRemaining)).toBe(
      1,
    );
  });

  it("intercepts an incoming bow arrow during the active guard window", () => {
    let world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right", weapon: "bow" },
      { id: "B", pos: { x: 13, y: 15 }, facing: "left" },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    world = stepWorld(
      world,
      {
        A: action("right", 0, "attack"),
        B: action("left", Math.PI, "block"),
      },
      0.05,
    );
    for (let i = 0; i < 3 && world.projectiles.length > 0; i++) {
      world = stepWorld(world, { A: idle("right"), B: idle("left") }, 0.05);
    }

    expect(world.projectiles).toHaveLength(0);
    expect(world.players.B.health).toBe(START_HEALTH);
    expect(world.players.B.blockImpactSeq).toBe(1);
  });

  it("blocks a katana crushing wave without stopping it for targets behind the guard", () => {
    let world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right", weapon: "katana" },
      { id: "B", pos: { x: 12, y: 15 }, facing: "left" },
      { id: "C", pos: { x: 15, y: 15 } },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    world = stepWorld(
      world,
      {
        A: action("right", 0, "attack"),
        B: action("left", Math.PI, "block"),
      },
      0.05,
    );
    for (let i = 0; i < 10; i += 1) {
      world = stepWorld(world, { A: idle("right"), B: idle("left") }, 0.05);
    }

    expect(world.players.B.health).toBe(START_HEALTH);
    expect(world.players.B.blockImpactSeq).toBe(1);
    expect(world.players.C.health).toBe(START_HEALTH - 1);
  });

  it("lets a front guard absorb the expanding solar ground wave", () => {
    let world = createWorld([
      { id: "A", pos: { x: 10, y: 15 }, facing: "right", weapon: "solar-hammer" },
      { id: "B", pos: { x: 12, y: 15 }, facing: "left" },
      { id: "Z", pos: { x: 1, y: 1 } },
    ]);
    world = stepWorld(
      world,
      {
        A: action("right", 0, "attack"),
        B: action("left", Math.PI, "block"),
      },
      0.05,
    );
    for (let i = 0; i < 4; i += 1) {
      world = stepWorld(world, { A: idle("right"), B: idle("left") }, 0.04);
    }

    expect(world.players.B.health).toBe(START_HEALTH);
    expect(world.players.B.blockImpactSeq).toBe(1);
  });
});
