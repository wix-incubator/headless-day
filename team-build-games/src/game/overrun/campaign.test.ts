import { describe, it, expect } from "vitest";
import { createShooterWorld } from "./match";
import { stepShooter } from "./sim";
import type { ShooterIntent, ShooterWorld } from "./types";

const idle: ShooterIntent = {
  move: { up: false, down: false, left: false, right: false },
  fire: false,
  reload: false,
  perkPick: null,
};
const intents = (ids: string[]) => Object.fromEntries(ids.map((id) => [id, idle]));

/** A campaign world parked at the end of stage 1 (wave 3), a beefed-up player, intermission ending. */
function atStage1End(): ShooterWorld {
  const w = createShooterWorld(["p1"], 7, "campaign");
  const p = {
    ...w.players.p1!,
    level: 3,
    xp: 50,
    gun: "shotgun" as const,
    perks: ["power" as const],
    stats: { shots: 10, hits: 5, kills: 5 },
  };
  return { ...w, wave: 3, intermission: 0.05, pending: [], enemies: [], players: { p1: p } };
}

describe("overrun campaign stage transitions", () => {
  it("resets the party (level 0 / pistol / no perks / full HP) and starts a comic beat on stage clear", () => {
    const next = stepShooter(atStage1End(), intents(["p1"]), 0.1);
    expect(next.wave).toBe(4); // crossed into stage 2
    expect(next.stageIntroRemaining ?? 0).toBeGreaterThan(0); // synced comic hold
    expect(next.pending).toEqual([]); // spawning held during the beat
    const p = next.players.p1!;
    expect(p.level).toBe(0);
    expect(p.gun).toBe("pistol");
    expect(p.perks).toEqual([]);
    expect(p.xp).toBe(0);
    expect(p.health).toBe(100);
    expect(p.stats.kills).toBe(5); // cumulative run stats preserved
  });

  it("does NOT reset or interstitial on a normal within-stage wave advance", () => {
    const w = createShooterWorld(["p1"], 7, "campaign");
    const p = { ...w.players.p1!, level: 3, gun: "shotgun" as const };
    const mid: ShooterWorld = { ...w, wave: 1, intermission: 0.05, pending: [], enemies: [], players: { p1: p } };
    const next = stepShooter(mid, intents(["p1"]), 0.1);
    expect(next.wave).toBe(2);
    expect(next.stageIntroRemaining ?? 0).toBe(0);
    expect(next.players.p1!.level).toBe(3); // untouched within a stage
  });

  it("composes the next stage's wave only after the comic beat elapses", () => {
    let w = stepShooter(atStage1End(), intents(["p1"]), 0.1); // → stage 2, holding
    expect(w.pending).toEqual([]);
    for (let i = 0; i < 60 && (w.stageIntroRemaining ?? 0) > 0; i++) w = stepShooter(w, intents(["p1"]), 0.1);
    expect(w.stageIntroRemaining ?? 0).toBe(0);
    expect(w.pending.length + w.enemies.length).toBeGreaterThan(0); // wave 4 now spawning
  });
});
