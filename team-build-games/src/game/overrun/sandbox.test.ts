import { describe, expect, it } from "vitest";
import { parseOverrunSandboxConfig, createOverrunSandboxWorld } from "./sandbox";
import { krakenHp, ENEMIES } from "./enemies";
import { TOTAL_STAGES, stageForWave } from "./stages";

const parse = (q: string) => parseOverrunSandboxConfig(new URLSearchParams(q));

describe("parseOverrunSandboxConfig", () => {
  it("defaults to a small rusher pack with AI on when nothing is specified", () => {
    const c = parse("");
    expect(c.kinds).toEqual(["rusher"]);
    expect(c.count).toBeGreaterThanOrEqual(1);
    expect(c.ai).toBe(true);
    expect(c.hp).toBe(null);
  });

  it("parses a comma list of kinds, dropping unknowns, and accepts the kraken", () => {
    expect(parse("enemy=kraken,tank,banana,spitter").kinds).toEqual(["kraken", "tank", "spitter"]);
    expect(parse("enemy=nonsense").kinds).toEqual(["rusher"]); // all invalid → default
  });

  it("reads ai=off, count, hp, and gun (clamped/coerced)", () => {
    expect(parse("ai=off").ai).toBe(false);
    expect(parse("count=5").count).toBe(5);
    expect(parse("count=999").count).toBeLessThanOrEqual(24);
    expect(parse("count=0").count).toBe(1);
    expect(parse("hp=250").hp).toBe(250);
    expect(parse("hp=-4").hp).toBe(null);
    expect(parse("gun=shotgun").gun).toBe("shotgun");
    expect(parse("gun=bogus").gun).toBe(parse("").gun); // falls back to the default gun
  });
});

describe("createOverrunSandboxWorld", () => {
  it("drops in a single local player with the chosen gun and no wave machinery running", () => {
    const w = createOverrunSandboxWorld(parse("gun=dmr&enemy=tank&count=1"));
    expect(Object.keys(w.players)).toEqual(["you"]);
    expect(w.players.you!.gun).toBe("dmr");
    expect(w.phase).toBe("playing");
    expect(w.pending).toEqual([]); // no queued spawns
    expect(w.wave).toBe(1); // non-zero so the sim never composes a fresh wave
  });

  it("places `count` enemies, cycling through the chosen kinds", () => {
    const w = createOverrunSandboxWorld(parse("enemy=rusher,tank&count=4"));
    expect(w.enemies).toHaveLength(4);
    expect(w.enemies.map((e) => e.kind)).toEqual(["rusher", "tank", "rusher", "tank"]);
  });

  it("scales a Kraken's HP to a solo party and initializes its attack timer", () => {
    const w = createOverrunSandboxWorld(parse("enemy=kraken&count=1"));
    const boss = w.enemies[0]!;
    expect(boss.kind).toBe("kraken");
    expect(boss.health).toBe(krakenHp(1));
    expect(boss.special).toBe("none");
    expect(boss.specialRemaining).toBeGreaterThan(0); // attack timer primed
  });

  it("honours an explicit hp override on every target", () => {
    const w = createOverrunSandboxWorld(parse("enemy=exploder&count=2&hp=15"));
    expect(w.enemies.every((e) => e.health === 15)).toBe(true);
    expect(ENEMIES.exploder.health).not.toBe(15); // proving the override, not the default
  });
});

describe("campaign stage launcher", () => {
  it("parses ?stage into a clamped 1..TOTAL_STAGES value (null when absent/invalid)", () => {
    expect(parse("").stage).toBe(null);
    expect(parse("stage=3").stage).toBe(3);
    expect(parse("stage=99").stage).toBe(TOTAL_STAGES);
    expect(parse("stage=0").stage).toBe(1);
    expect(parse("stage=abc").stage).toBe(null);
  });

  it("launches EVERY stage as a real campaign world at that stage's first wave, with a composed wave", () => {
    for (let s = 1; s <= TOTAL_STAGES; s++) {
      const w = createOverrunSandboxWorld(parse(`stage=${s}`));
      expect(w.mode).toBe("campaign");
      expect(stageForWave(w.wave)).toMatchObject({ stage: s, waveInStage: 1 });
      expect(w.pending.length).toBeGreaterThan(0); // the first wave is queued to spawn
      expect(Object.keys(w.players)).toEqual(["you"]);
      expect(w.enemies).toEqual([]); // nothing placed by hand — the sim spawns from `pending`
    }
  });

  it("a stage launch overrides the enemy-inspection params (real waves, not hand-placed)", () => {
    const w = createOverrunSandboxWorld(parse("stage=2&enemy=kraken&count=9"));
    expect(w.mode).toBe("campaign");
    expect(w.enemies).toEqual([]); // enemy/count ignored in stage mode
  });
});
