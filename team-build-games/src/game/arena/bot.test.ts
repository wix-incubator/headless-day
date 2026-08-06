import { describe, expect, it } from "vitest";
import { botIntent, nearestEnemy } from "./bot";
import { createWorld } from "./match";

describe("nearestEnemy", () => {
  it("picks the closest alive opponent, skipping self and the dead", () => {
    const w = createWorld([
      { id: "BOT", pos: { x: 0, y: 0 } },
      { id: "NEAR", pos: { x: 3, y: 0 } },
      { id: "FAR", pos: { x: 10, y: 0 } },
    ]);
    w.players.NEAR.status = "dead"; // closest but dead → skipped
    expect(nearestEnemy("BOT", w)?.id).toBe("FAR");
  });

  it("returns null when there are no other alive players", () => {
    const w = createWorld([{ id: "BOT", pos: { x: 0, y: 0 } }]);
    expect(nearestEnemy("BOT", w)).toBeNull();
  });
});

describe("botIntent", () => {
  it("moves toward and faces its target", () => {
    const w = createWorld([
      { id: "BOT", pos: { x: 5, y: 5 } },
      { id: "P", pos: { x: 10, y: 5 } }, // to the right
    ]);
    const intent = botIntent("BOT", w);
    expect(intent.move.right).toBe(true);
    expect(intent.move.left).toBe(false);
    expect(intent.facing).toBe("right");
  });

  it("attacks exactly once over its cadence window when a target is in reach", () => {
    const w = createWorld([
      { id: "BOT", pos: { x: 5, y: 5 }, facing: "right" },
      { id: "P", pos: { x: 5.5, y: 5 } }, // within 1m reach
    ]);
    let attacks = 0;
    for (let tick = 0; tick < 12; tick++) {
      w.tick = tick;
      if (botIntent("BOT", w).attack) attacks++;
    }
    expect(attacks).toBe(1);
  });

  it("idles when there is no target", () => {
    const w = createWorld([{ id: "BOT", pos: { x: 5, y: 5 }, facing: "up" }]);
    const intent = botIntent("BOT", w);
    expect(intent).toMatchObject({
      move: { up: false, down: false, left: false, right: false },
      facing: "up",
      dash: false,
      attack: false,
      block: false,
    });
  });
});
