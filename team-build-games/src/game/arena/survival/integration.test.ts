/**
 * Integration: the shared stepWorld routes a survival World through stepSurvivalWorld. Guards the
 * additive `World.survival`/`World.enemies` seam + the adapter round-trip (versus path untouched —
 * that's covered by sim.test.ts, which never sets `world.survival`).
 */
import { describe, it, expect } from "vitest";
import { stepWorld } from "../sim";
import { createSurvivalMatchWorld, SURVIVAL_PARTY_WINNER } from "./step";
import { wavePlan } from "./waves";

const DT = 0.1;

describe("stepWorld — survival branch", () => {
  it("builds a survival World that carries the survival block + centered players", () => {
    const w = createSurvivalMatchWorld(["p1", "p2"], "coop-survival", { seed: 4 });
    expect(w.mode).toBe("coop-survival");
    expect(w.survival).toBeTruthy();
    expect(w.enemies).toEqual([]);
    expect(Object.keys(w.players)).toHaveLength(2);
  });

  it("steps enemies in via stepWorld (survival reducer runs, versus path skipped)", () => {
    const w0 = createSurvivalMatchWorld(["p1"], "coop-survival", { seed: 4 });
    const plan = wavePlan(w0.survival!.seed, 1, 1, w0.survival!.partySizeThisWave);
    const lastAt = plan.spawns[plan.spawns.length - 1]!.atTick;
    let w = w0;
    for (let i = 0; i <= lastAt; i++) w = stepWorld(w, {}, DT);
    expect(w.enemies!.length).toBe(plan.spawns.length);
    expect(w.tick).toBe(lastAt + 1);
  });

  it("flags the party winner sentinel on a campaign win", () => {
    // One-wave, one-level campaign, all enemies already cleared → the next step wins the run.
    const base = createSurvivalMatchWorld(["p1"], "coop-survival", {
      seed: 4,
      wavesPerLevel: 1,
      campaignLevels: 1,
    });
    const planLen = wavePlan(base.survival!.seed, 1, 1, base.survival!.partySizeThisWave).spawns.length;
    const primed = { ...base, enemies: [], survival: { ...base.survival!, spawnCursor: planLen } };
    const next = stepWorld(primed, {}, DT);
    expect(next.phase).toBe("ended");
    expect(next.winnerId).toBe(SURVIVAL_PARTY_WINNER);
  });
});
