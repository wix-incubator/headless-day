import { describe, expect, it } from "vitest";
import { aliveCount, createPlayer, createWorld, evenSpawns, soleSurvivor } from "./match";
import { FIELD_M, START_HEALTH } from "../constants";

describe("createPlayer / createWorld", () => {
  it("spawns players alive with full health and a ready dash", () => {
    const p = createPlayer("A", { x: 1, y: 2 });
    expect(p).toMatchObject({ id: "A", health: START_HEALTH, status: "alive", attack: null });
    expect(p.dash.dashing).toBe(false);
  });

  it("builds a world keyed by player id, in the given phase", () => {
    const w = createWorld([{ id: "A", pos: { x: 0, y: 0 } }, { id: "B", pos: { x: 1, y: 1 } }], "playing");
    expect(Object.keys(w.players).sort()).toEqual(["A", "B"]);
    expect(w.phase).toBe("playing");
    expect(w.tick).toBe(0);
    expect(w.winnerId).toBeNull();
  });
});

describe("aliveCount / soleSurvivor", () => {
  const world = createWorld([
    { id: "A", pos: { x: 0, y: 0 } },
    { id: "B", pos: { x: 1, y: 0 } },
    { id: "C", pos: { x: 2, y: 0 } },
  ]);

  it("counts alive players and reports no survivor while >1 remain", () => {
    expect(aliveCount(world)).toBe(3);
    expect(soleSurvivor(world)).toBeNull();
  });

  it("reports the sole survivor when exactly one is alive", () => {
    world.players.B.status = "dead";
    world.players.C.status = "dead";
    expect(aliveCount(world)).toBe(1);
    expect(soleSurvivor(world)).toBe("A");
  });

  it("reports null when nobody is alive", () => {
    world.players.A.status = "dead";
    expect(soleSurvivor(world)).toBeNull();
  });
});

describe("evenSpawns", () => {
  it("produces one in-bounds spawn per id", () => {
    const spawns = evenSpawns(["A", "B", "C", "D", "E", "F", "G", "H"], FIELD_M, 2);
    expect(spawns).toHaveLength(8);
    for (const s of spawns) {
      expect(s.pos.x).toBeGreaterThan(0);
      expect(s.pos.x).toBeLessThan(FIELD_M);
      expect(s.pos.y).toBeGreaterThan(0);
      expect(s.pos.y).toBeLessThan(FIELD_M);
    }
  });
});
