import { describe, it, expect } from "vitest";
import { survivalSummary } from "./summary";
import { createSurvivalWorld, type SurvivalWorld } from "./step";
import { createEnemy } from "./enemy";

/** A world at a given run/enemy/player state, for summary derivations. */
function world(over: Partial<SurvivalWorld>): SurvivalWorld {
  return { ...createSurvivalWorld(["p1", "p2"], { seed: 1, wavesPerLevel: 3, campaignLevels: 5 }), ...over };
}

describe("survivalSummary", () => {
  it("reports live campaign progress mid-run", () => {
    const base = world({});
    const w: SurvivalWorld = {
      ...base,
      run: { ...base.run, level: 2, wave: 2 },
      enemies: [createEnemy("e2-2-0", "crawler", { x: 40, y: 15 }, 0)],
    };
    const s = survivalSummary(w);
    expect(s.phase).toBe("playing");
    expect(s.level).toBe(2);
    expect(s.wave).toBe(2);
    // level 1 fully cleared (3 waves) + one wave of level 2 = 4 waves down.
    expect(s.wavesCleared).toBe(4);
    expect(s.enemiesRemaining).toBe(1);
    expect(s.partySize).toBe(2);
    expect(s.alive).toBe(2);
    expect(s.down).toBe(0);
  });

  it("counts alive vs downed allies and remaining live enemies (ignores dead ones)", () => {
    const base = world({});
    const players = {
      p1: base.players.p1!,
      p2: { ...base.players.p2!, health: 0, status: "dead" as const },
    };
    const enemies = [
      createEnemy("e1-1-0", "crawler", { x: 40, y: 15 }, 0),
      { ...createEnemy("e1-1-1", "crawler", { x: 41, y: 15 }, 0), health: 0, status: "dead" as const },
    ];
    const s = survivalSummary({ ...base, players, enemies });
    expect(s.alive).toBe(1);
    expect(s.down).toBe(1);
    expect(s.enemiesRemaining).toBe(1); // the dead enemy is not counted
  });

  it("headlines a campaign win with every wave cleared", () => {
    const base = world({});
    const w: SurvivalWorld = {
      ...base,
      phase: "ended",
      outcome: "won",
      run: { ...base.run, level: 5, wave: 3, phase: "won" },
    };
    const s = survivalSummary(w);
    expect(s.outcome).toBe("won");
    expect(s.wavesCleared).toBe(15); // 5 levels * 3 waves
    expect(s.headline).toBe("Campaign cleared!");
  });

  it("headlines a wipe with the level and wave reached", () => {
    const base = world({});
    const w: SurvivalWorld = {
      ...base,
      phase: "ended",
      outcome: "lost",
      run: { ...base.run, level: 3, wave: 2, phase: "failed" },
    };
    const s = survivalSummary(w);
    expect(s.outcome).toBe("lost");
    expect(s.headline).toBe("Wiped out — reached Level 3, Wave 2");
  });

  it("has no headline while the run is still playing", () => {
    expect(survivalSummary(world({})).headline).toBeNull();
  });
});
