import { describe, it, expect } from "vitest";
import { parseSandboxConfig, createSandboxWorld } from "./sandbox";
import { ENEMY_STATS } from "./survival/enemy";

const cfg = (q: string) => parseSandboxConfig(new URLSearchParams(q));

describe("parseSandboxConfig", () => {
  it("defaults everything for a bare ?sandbox", () => {
    const c = cfg("sandbox");
    expect(c.targets).toEqual(["crawler"]);
    expect(c.count).toBe(1);
    expect(c.ai).toBe("off");
    expect(c.weapon).toBe("sword");
    expect(c.hp).toBeNull();
    expect(c.dist).toBe(4);
  });

  it("parses multi-kind enemy, ai, weapon, hp, dist — and clamps count/dist", () => {
    const c = cfg("sandbox&enemy=dino,bat&count=99&ai=toggle&weapon=katana&hp=20&dist=100");
    expect(c.targets).toEqual(["dino", "bat"]);
    expect(c.count).toBeLessThanOrEqual(16);
    expect(c.ai).toBe("toggle");
    expect(c.weapon).toBe("katana");
    expect(c.hp).toBe(20);
    expect(c.dist).toBeLessThanOrEqual(12);
  });

  it("falls back on garbage (unknown enemy / weapon / ai dropped to defaults)", () => {
    const c = cfg("sandbox&enemy=dragon&weapon=laser&ai=wat");
    expect(c.targets).toEqual(["crawler"]);
    expect(c.weapon).toBe("sword");
    expect(c.ai).toBe("off");
  });

  it("recognizes the versus dummy target", () => {
    expect(cfg("sandbox&enemy=dummy").targets).toEqual(["dummy"]);
  });
});

describe("createSandboxWorld", () => {
  it("survival sub-mode: playing survival world, player + pre-placed frozen enemies", () => {
    const w = createSandboxWorld(cfg("sandbox&enemy=dino&count=3&dist=5"));
    expect(w.mode).toBe("coop-survival");
    expect(w.survival?.sandbox).toBe(true);
    expect(w.survival?.frozen).toBe(true); // ai=off → frozen
    expect(w.phase).toBe("playing");
    expect(w.enemies).toHaveLength(3);
    expect(w.enemies?.every((e) => e.kind === "dino")).toBe(true);
    expect(Object.keys(w.players)).toEqual(["you"]);
  });

  it("ai=on spawns un-frozen enemies", () => {
    expect(createSandboxWorld(cfg("sandbox&enemy=bat&ai=on")).survival?.frozen).toBe(false);
  });

  it("applies an hp override to enemies (else the per-kind default)", () => {
    expect(createSandboxWorld(cfg("sandbox&enemy=zombie&hp=7")).enemies?.[0]!.health).toBe(7);
    expect(createSandboxWorld(cfg("sandbox&enemy=zombie")).enemies?.[0]!.health).toBe(ENEMY_STATS.zombie.maxHealth);
  });

  it("cycles multiple enemy kinds round-robin over the count", () => {
    const w = createSandboxWorld(cfg("sandbox&enemy=ant,bat&count=3"));
    expect(w.enemies?.map((e) => e.kind)).toEqual(["ant", "bat", "ant"]);
  });

  it("versus dummy sub-mode: sandboxed versus world with dummy target(s), no survival block", () => {
    const w = createSandboxWorld(cfg("sandbox&enemy=dummy&count=2"));
    expect(w.sandbox).toBe(true);
    expect(w.survival).toBeUndefined();
    expect(w.mode).toBe("ffa");
    expect(Object.keys(w.players).sort()).toEqual(["dummy:0", "dummy:1", "you"]);
  });
});
