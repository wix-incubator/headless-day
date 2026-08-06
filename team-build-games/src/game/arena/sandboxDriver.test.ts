import { describe, it, expect } from "vitest";
import { SandboxDriver } from "./sandboxDriver";
import { parseSandboxConfig } from "./sandbox";
import type { RawInput } from "./types";

const IDLE: RawInput = { up: false, down: false, left: false, right: false, dash: false, attack: false, block: false };
const driver = (q: string) => new SandboxDriver(parseSandboxConfig(new URLSearchParams(q)));

describe("SandboxDriver", () => {
  it("drops straight in (no countdown) and steps the world each frame", () => {
    const d = driver("sandbox&enemy=dino");
    const a = d.frame(0.1, IDLE);
    expect(a.countdown).toBe(0);
    expect(d.frame(0.1, IDLE).world.tick).toBe(a.world.tick + 1);
  });

  it("toggleAi flips the survival frozen flag on the next frame", () => {
    const d = driver("sandbox&enemy=dino&ai=toggle");
    expect(d.frame(0.1, IDLE).world.survival?.frozen).toBe(true); // starts frozen
    d.toggleAi();
    expect(d.frame(0.1, IDLE).world.survival?.frozen).toBe(false);
  });

  it("swaps the player's weapon in place without disturbing the targets", () => {
    const d = driver("sandbox&enemy=dino&count=2");
    const before = d.frame(0.1, IDLE).world.enemies!.length;
    d.setWeapon("katana");
    const after = d.frame(0.1, IDLE).world;
    expect(after.players.you!.weapon).toBe("katana");
    expect(after.enemies!.length).toBe(before);
  });

  it("cycleEnemy respawns with the next target kind", () => {
    const d = driver("sandbox&enemy=crawler");
    d.cycleEnemy(1);
    expect(d.frame(0.1, IDLE).world.enemies![0]!.kind).not.toBe("crawler");
  });

  it("never auto-ends even when idle and alone (sandbox)", () => {
    const d = driver("sandbox&enemy=dummy");
    let w = d.frame(0.1, IDLE).world;
    for (let i = 0; i < 50; i++) w = d.frame(0.1, IDLE).world;
    expect(w.phase).toBe("playing");
  });
});
