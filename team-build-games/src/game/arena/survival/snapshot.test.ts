import { describe, it, expect } from "vitest";
import { survivalSnapshot, survivalWorldFromSnapshot } from "./snapshot";
import { createSurvivalWorld, stepSurvival, type SurvivalWorld } from "./step";
import { createEnemy } from "./enemy";

const DT = 0.1;

/** A world with a couple of live enemies and some campaign progress, for round-trip checks. */
function worldWithEnemies(): SurvivalWorld {
  let w = createSurvivalWorld(["p1", "p2"], { seed: 9 });
  for (let i = 0; i < 20; i++) w = stepSurvival(w, {}, DT);
  return w;
}

describe("survivalSnapshot / survivalWorldFromSnapshot", () => {
  it("round-trips a live world unchanged (host → wire → peer)", () => {
    const w = worldWithEnemies();
    const restored = survivalWorldFromSnapshot(survivalSnapshot(w));
    expect(restored).toEqual(w);
  });

  it("re-steps identically after a round-trip (deterministic hand-off)", () => {
    const w = worldWithEnemies();
    const direct = stepSurvival(w, {}, DT);
    const viaWire = stepSurvival(survivalWorldFromSnapshot(survivalSnapshot(w)), {}, DT);
    expect(viaWire).toEqual(direct);
  });

  it("sanitizes garbage enemies from an untrusted host (coerce trust boundary)", () => {
    const good = createEnemy("e1-1-0", "crawler", { x: 40, y: 15 }, 3);
    const raw = {
      tick: 5,
      phase: "playing",
      outcome: null,
      seed: 9,
      fieldM: 30,
      players: {},
      enemies: [good, { id: "junk", health: 999, pos: { x: "NaN" }, kind: "dragon" }, null],
      run: { level: 1, wave: 1, phase: "active", wavesPerLevel: 3, campaignLevels: 5, endless: false },
      waveStartTick: 0,
      spawnCursor: 1,
      projectiles: [],
    };
    const w = survivalWorldFromSnapshot(raw as never);
    // The good enemy survives; the two bad entries become well-formed (clamped) enemies, none crash.
    expect(w.enemies).toHaveLength(3);
    expect(w.enemies[0]).toEqual(good);
    expect(w.enemies[1]!.kind).toBe("crawler"); // unknown kind → default
    expect(w.enemies[1]!.health).toBeLessThanOrEqual(2); // clamped to crawler maxHealth
    expect(Number.isFinite(w.enemies[2]!.pos.x)).toBe(true); // null → zeroed, not NaN
  });

  it("clamps a malformed run/cursor into a valid campaign state", () => {
    const raw = {
      tick: -3,
      phase: "weird",
      outcome: "nonsense",
      seed: 2,
      fieldM: 0,
      players: {},
      enemies: [],
      run: { level: 0, wave: -1, phase: "bogus", wavesPerLevel: 0, campaignLevels: 0, endless: "yes" },
      waveStartTick: -10,
      spawnCursor: -5,
      projectiles: [],
    };
    const w = survivalWorldFromSnapshot(raw as never);
    expect(w.phase).toBe("playing"); // unknown phase → safe default
    expect(w.tick).toBe(0); // negative tick clamped
    expect(w.run.level).toBeGreaterThanOrEqual(1);
    expect(w.run.wave).toBeGreaterThanOrEqual(1);
    expect(w.run.wavesPerLevel).toBeGreaterThanOrEqual(1);
    expect(w.spawnCursor).toBeGreaterThanOrEqual(0);
    expect(w.waveStartTick).toBeGreaterThanOrEqual(0);
  });
});
