import { describe, expect, it } from "vitest";
import { OverrunSandboxDriver } from "./sandboxDriver";
import { parseOverrunSandboxConfig, firstWaveOfStage } from "./sandbox";
import { SHOOTER_DT } from "./constants";
import { stageForWave } from "./stages";
import type { RawShooterInput } from "./types";

const cfg = (q: string) => parseOverrunSandboxConfig(new URLSearchParams(q));
const IDLE: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };
const run = (d: OverrunSandboxDriver, frames: number, input: RawShooterInput = IDLE) => {
  let last = d.frame(SHOOTER_DT, input);
  for (let i = 1; i < frames; i++) last = d.frame(SHOOTER_DT, input);
  return last.world;
};

describe("OverrunSandboxDriver", () => {
  it("never lets the sim spawn a wave — the enemy count stays as configured", () => {
    const d = new OverrunSandboxDriver(cfg("enemy=rusher&count=2"));
    // Even after the player is reached/killed repeatedly over many seconds, no waves appear.
    const w = run(d, 400);
    expect(w.enemies.length).toBeLessThanOrEqual(2);
    expect(w.wave).toBe(1);
    expect(w.pending).toEqual([]);
  });

  it("keeps the local player alive (revives in place) instead of ending the run", () => {
    const d = new OverrunSandboxDriver(cfg("enemy=tank&count=6")); // heavy pressure, idle player
    const w = run(d, 600);
    expect(w.phase).toBe("playing");
    expect(w.players.you!.status).toBe("alive");
  });

  it("freezes enemies in place when AI is off, then lets them move once toggled on", () => {
    const d = new OverrunSandboxDriver(cfg("enemy=rusher&count=1&ai=off"));
    const before = { ...d.getConfig() };
    expect(before.ai).toBe(false);
    const frozen = run(d, 60).enemies[0]!;
    const start = createStart(d);
    expect(frozen.pos.x).toBeCloseTo(start.x, 6);
    expect(frozen.pos.y).toBeCloseTo(start.y, 6);

    d.toggleAi();
    const moved = run(d, 60).enemies[0]!;
    expect(Math.hypot(moved.pos.x - start.x, moved.pos.y - start.y)).toBeGreaterThan(0.1); // now chasing
  });

  it("cycleKind swaps the target kind and respawns; setGun re-arms the player in place", () => {
    const d = new OverrunSandboxDriver(cfg("enemy=rusher&count=1"));
    d.cycleKind(1);
    expect(d.getConfig().kinds[0]).not.toBe("rusher");
    d.setGun("shotgun");
    expect(d.frame(SHOOTER_DT, IDLE).world.players.you!.gun).toBe("shotgun");
  });

  it("runs the REAL campaign machinery when launched at a stage (spawns; the wave is not pinned)", () => {
    const d = new OverrunSandboxDriver(cfg("stage=3"));
    const startWave = firstWaveOfStage(3);
    const w = run(d, 30, IDLE);
    expect(w.mode).toBe("campaign");
    expect(w.wave).toBe(startWave); // still on stage 3's first wave — NOT reset to 1 like enemy mode
    expect(stageForWave(w.wave).stage).toBe(3);
    expect(w.enemies.length).toBeGreaterThan(0); // the composed wave spawned in for real
  });

  it("setStage relaunches a campaign stage; setEnemyMode returns to kind inspection", () => {
    const d = new OverrunSandboxDriver(cfg("enemy=rusher"));
    d.setStage(5);
    const camp = d.frame(0, IDLE).world;
    expect(camp.mode).toBe("campaign");
    expect(stageForWave(camp.wave).stage).toBe(5);
    d.setEnemyMode();
    expect(d.frame(0, IDLE).world.mode).toBe("survival");
  });
});

/** The ring position the single enemy is placed at — recompute from a fresh driver of the same config. */
function createStart(d: OverrunSandboxDriver) {
  const fresh = new OverrunSandboxDriver(d.getConfig());
  return { ...fresh.frame(0, IDLE).world.enemies[0]!.pos };
}
