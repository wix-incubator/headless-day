import { describe, expect, it } from "vitest";
import { electHost, electHostForWorld } from "./election";
import { createWorld } from "../arena/match";

describe("electHost", () => {
  it("picks the lowest id, or null when empty", () => {
    expect(electHost(["c", "a", "b"])).toBe("a");
    expect(electHost([])).toBeNull();
  });
});

describe("electHostForWorld", () => {
  const world = createWorld([
    { id: "a", pos: { x: 0, y: 0 } },
    { id: "b", pos: { x: 1, y: 0 } },
    { id: "c", pos: { x: 2, y: 0 } },
  ]);

  it("is the lowest alive & connected id", () => {
    expect(electHostForWorld(world, ["a", "b", "c"])).toBe("a");
  });

  it("migrates past a host that has left (not connected)", () => {
    expect(electHostForWorld(world, ["b", "c"])).toBe("b");
  });

  it("migrates past a host that has died (alive-only)", () => {
    world.players.a.status = "dead";
    expect(electHostForWorld(world, ["a", "b", "c"])).toBe("b");
  });
});
