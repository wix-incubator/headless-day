import { describe, it, expect } from "vitest";
import { createSurvivalWorld, stepSurvival, type SurvivalWorld } from "./step";
import { createEnemy } from "./enemy";
import { wavePlan } from "./waves";
import type { Intent } from "../types";

const DT = 0.1;
const noIntent = (): Record<string, Intent> => ({});

/** Attack toward +x (aim 0), no movement — used to swing at an enemy on the player's right. */
const swingRight = (id: string): Record<string, Intent> => ({
  [id]: {
    move: { up: false, down: false, left: false, right: false },
    facing: "right",
    aim: 0,
    dash: false,
    attack: true,
    block: false,
  },
});

/** Step `world` `n` times with a constant intent map. */
function run(world: SurvivalWorld, n: number, intents: Record<string, Intent> = {}): SurvivalWorld {
  let w = world;
  for (let i = 0; i < n; i++) w = stepSurvival(w, intents, DT);
  return w;
}

describe("createSurvivalWorld", () => {
  it("starts a playing run at level 1 / wave 1 with centered, full-health players and no enemies", () => {
    const w = createSurvivalWorld(["p1", "p2"], { seed: 7 });
    expect(w.phase).toBe("playing");
    expect(w.outcome).toBeNull();
    expect(w.tick).toBe(0);
    expect(w.enemies).toEqual([]);
    expect(w.run.level).toBe(1);
    expect(w.run.wave).toBe(1);
    expect(Object.values(w.players).every((p) => p.status === "alive" && p.health === 3)).toBe(true);
    // Both players spawn near the field centre (within a few metres), not on the perimeter.
    const c = w.fieldM / 2;
    expect(Object.values(w.players).every((p) => Math.hypot(p.pos.x - c, p.pos.y - c) <= 3)).toBe(true);
  });
});

describe("stepSurvival — wave spawning", () => {
  it("does not advance while ended", () => {
    const w: SurvivalWorld = { ...createSurvivalWorld(["p1"], { seed: 1 }), phase: "ended", outcome: "won" };
    expect(stepSurvival(w, noIntent(), DT)).toBe(w);
  });

  it("emits the wave's enemies from the plan as ticks advance, with ids straight from the plan", () => {
    const w0 = createSurvivalWorld(["p1"], { seed: 3 });
    const plan = wavePlan(w0.seed, 1, 1, 1);
    // Step long enough for every planned spawn's atTick to elapse.
    const lastAt = plan.spawns[plan.spawns.length - 1]!.atTick;
    const w = run(w0, lastAt + 1);
    expect(w.enemies.length).toBe(plan.spawns.length);
    // Ids come straight from the deterministic plan.
    expect(w.enemies.map((e) => e.id).sort()).toEqual(plan.spawns.map((s) => s.id).sort());
  });

  it("spawns each enemy beyond the field edge (they crawl in from outside)", () => {
    // Observe the first spawn the tick it appears, before it has crawled inward.
    const w = run(createSurvivalWorld(["p1"], { seed: 3 }), 1);
    expect(w.enemies.length).toBeGreaterThan(0);
    const e = w.enemies[0]!;
    expect(e.pos.x < 0 || e.pos.x > w.fieldM || e.pos.y < 0 || e.pos.y > w.fieldM).toBe(true);
  });
});

describe("stepSurvival — players vs enemies", () => {
  it("a melee swing kills an adjacent enemy (Hittable combat wired to enemies)", () => {
    const base = createSurvivalWorld(["p1"], { seed: 1 });
    const p = base.players.p1!;
    const enemy = { ...createEnemy("e1-1-0", "crawler", { x: p.pos.x + 0.5, y: p.pos.y }, 0), health: 1 };
    const w: SurvivalWorld = { ...base, enemies: [enemy] };
    const next = stepSurvival(w, swingRight("p1"), DT);
    expect(next.enemies[0]!.status).toBe("dead");
    expect(next.enemies[0]!.health).toBe(0);
  });

  it("a surviving hit monster is staggered and shoved away from the attacker", () => {
    const base = createSurvivalWorld(["p1"], { seed: 1 });
    const p = base.players.p1!;
    // A zombie (4 HP) just to the right survives one sword hit → should reel + get pushed further right.
    const enemy = createEnemy("e1-1-0", "zombie", { x: p.pos.x + 0.8, y: p.pos.y }, 0);
    const w: SurvivalWorld = { ...base, enemies: [enemy] };
    const hit = stepSurvival(w, swingRight("p1"), DT).enemies[0]!;
    expect(hit.status).toBe("alive");
    expect(hit.hitStunRemaining).toBeGreaterThan(0); // staggered
    expect(hit.pos.x).toBeGreaterThan(enemy.pos.x); // shoved away from the attacker (who aims +x)
  });

  it("enemies deal contact damage to a touching player", () => {
    const base = createSurvivalWorld(["p1"], { seed: 1 });
    const p = base.players.p1!;
    const enemy = createEnemy("e1-1-0", "crawler", { x: p.pos.x + 0.3, y: p.pos.y }, 0);
    const w: SurvivalWorld = { ...base, enemies: [enemy] };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.players.p1!.health).toBe(2); // one contact hit (crawler contactDamage 1)
  });
});

describe("stepSurvival — campaign progression", () => {
  it("advances to the next wave once every spawned enemy is dead", () => {
    const base = createSurvivalWorld(["p1"], { seed: 5, wavesPerLevel: 3, endless: true });
    const planLen = wavePlan(base.seed, 1, 1, 1).spawns.length;
    // All planned enemies emitted and already cleared → the wave resolves this tick.
    const w: SurvivalWorld = { ...base, enemies: [], spawnCursor: planLen, waveStartTick: 0, tick: 5 };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.run.wave).toBe(2);
    expect(next.spawnCursor).toBe(0);
  });

  it("wins a finite campaign when its final wave is cleared", () => {
    const base = createSurvivalWorld(["p1"], { seed: 5, wavesPerLevel: 1, campaignLevels: 1, endless: false });
    const planLen = wavePlan(base.seed, 1, 1, 1).spawns.length;
    const w: SurvivalWorld = { ...base, enemies: [], spawnCursor: planLen, waveStartTick: 0, tick: 5 };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.phase).toBe("ended");
    expect(next.outcome).toBe("won");
  });

  it("revives a downed party on a level clear BEFORE testing for a wipe (same-tick edge)", () => {
    // Final wave of a level clears the SAME tick the last ally is down: revive must win over wipe.
    const base = createSurvivalWorld(["p1"], { seed: 5, wavesPerLevel: 1, campaignLevels: 5, endless: false });
    const planLen = wavePlan(base.seed, 1, 1, base.partySizeThisWave).spawns.length;
    const downed = { ...base.players.p1!, health: 0, status: "dead" as const };
    const w: SurvivalWorld = { ...base, players: { p1: downed }, enemies: [], spawnCursor: planLen, waveStartTick: 0, tick: 5 };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.phase).toBe("playing"); // revived, not wiped
    expect(next.outcome).toBeNull();
    expect(next.players.p1!.status).toBe("alive");
    expect(next.run.level).toBe(2); // levelled up
  });

  it("fails the run when the whole party is down", () => {
    const base = createSurvivalWorld(["p1", "p2"], { seed: 1 });
    const dead = Object.fromEntries(
      Object.entries(base.players).map(([id, p]) => [id, { ...p, health: 0, status: "dead" as const }]),
    );
    const w: SurvivalWorld = { ...base, players: dead };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.phase).toBe("ended");
    expect(next.outcome).toBe("lost");
  });
});

describe("stepSurvival — frozen party size", () => {
  it("createSurvivalWorld freezes the wave's party size to the starting ally count", () => {
    expect(createSurvivalWorld(["p1", "p2", "p3"], { seed: 1 }).partySizeThisWave).toBe(3);
  });

  it("spawns from the frozen partySizeThisWave, not the live player-map size (mid-wave leave can't fork)", () => {
    // Frozen size 5, but only one ally remains in the map — spawn count must follow the frozen 5.
    const base = createSurvivalWorld(["p1"], { seed: 3 });
    // waveStartTick far in the past → every planned spawn is due on the first step (before enemies close in).
    const w: SurvivalWorld = { ...base, partySizeThisWave: 5, waveStartTick: -1000, tick: 0, spawnCursor: 0 };
    const next = stepSurvival(w, noIntent(), DT);
    const planFrozen = wavePlan(w.seed, 1, 1, 5);
    const planLive = wavePlan(w.seed, 1, 1, 1);
    expect(planFrozen.spawns.length).not.toBe(planLive.spawns.length); // the two sizes really differ
    expect(next.enemies.length).toBe(planFrozen.spawns.length);
  });
});

describe("stepSurvival — sandbox", () => {
  it("does not spawn waves or auto-end, even with the whole party down", () => {
    const base = createSurvivalWorld(["p1"], { seed: 1 });
    const deadP = { ...base.players.p1!, health: 0, status: "dead" as const };
    // waveStartTick far in the past would normally dump the whole wave in one tick — sandbox suppresses it.
    const w: SurvivalWorld = { ...base, players: { p1: deadP }, sandbox: true, waveStartTick: -1000 };
    const next = stepSurvival(w, noIntent(), DT);
    expect(next.enemies).toEqual([]); // no auto-spawn
    expect(next.phase).toBe("playing"); // no wipe / auto-end
    expect(next.outcome).toBeNull();
  });

  it("keeps a frozen enemy in place but still staggers + shoves it on a hit", () => {
    const base = createSurvivalWorld(["p1"], { seed: 1 });
    const p = base.players.p1!;
    const enemy = createEnemy("e0", "zombie", { x: p.pos.x + 0.8, y: p.pos.y }, 0); // 4 HP, survives one hit
    const w: SurvivalWorld = { ...base, sandbox: true, frozen: true, enemies: [enemy] };
    const next = stepSurvival(w, swingRight("p1"), DT).enemies[0]!;
    expect(next.hitStunRemaining).toBeGreaterThan(0); // reacted to the hit
    expect(next.pos.x).toBeGreaterThan(enemy.pos.x); // shoved despite being frozen
  });
});

describe("stepSurvival — determinism", () => {
  it("same seed + same intents → identical enemies and players", () => {
    const a = run(createSurvivalWorld(["p1", "p2"], { seed: 42 }), 40);
    const b = run(createSurvivalWorld(["p1", "p2"], { seed: 42 }), 40);
    expect(a.enemies).toEqual(b.enemies);
    expect(a.players).toEqual(b.players);
    expect(a.run).toEqual(b.run);
  });
});
