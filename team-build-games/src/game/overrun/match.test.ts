import { describe, expect, it } from "vitest";
import { alivePlayers, createShooterWorld, sortedPlayerIds } from "./match";
import { OVERRUN_FIELD_M, PLAYER_HEALTH } from "./constants";

describe("createShooterWorld", () => {
  it("spawns full-health pistol players on a ring around the center", () => {
    const w = createShooterWorld(["b", "a", "c"], 7);
    expect(sortedPlayerIds(w)).toEqual(["a", "b", "c"]);
    for (const p of Object.values(w.players)) {
      expect(p.health).toBe(PLAYER_HEALTH);
      expect(p.status).toBe("alive");
      expect(p.gun).toBe("pistol");
      expect(p.ammo.mag).toBe(12);
      const dx = p.pos.x - OVERRUN_FIELD_M / 2;
      const dy = p.pos.y - OVERRUN_FIELD_M / 2;
      expect(Math.hypot(dx, dy)).toBeCloseTo(3, 5);
    }
    // deterministic placement: sorted-id order around the ring
    expect(createShooterWorld(["b", "a", "c"], 7)).toEqual(w);
  });

  it("starts at wave 0, playing, with the seed carried in-world", () => {
    const w = createShooterWorld(["a"], 99);
    expect(w).toMatchObject({ tick: 0, phase: "playing", seed: 99, wave: 0, partySize: 1, pending: [], intermission: 0, enemies: [], pickups: [], events: [], score: 0, spawnSeq: 0, pity: 0 });
  });

  it("alivePlayers filters by status", () => {
    const w = createShooterWorld(["a", "b"], 1);
    w.players.a = { ...w.players.a!, status: "downed" };
    expect(alivePlayers(w).map((p) => p.id)).toEqual(["b"]);
  });
});
