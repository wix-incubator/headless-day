// src/game/squid/sim.test.ts
import { describe, expect, it } from "vitest";
import { createSquidWorld, timeMsOf } from "./match";
import { stepSquid } from "./sim";
import { HEAD, TIP } from "./octopus";
import { FINISH_X_M, HEAD_DROP_FAIL_M, LEG_COUNT, STAND_HEAD_Y_M } from "./constants";
import type { SquidIntent, SquidWorld } from "./types";

const DT = 1 / 20;
const idle: SquidIntent = { swing: 0, lift: false, cycle: false };

/** Step n ticks with the same intents. */
const run = (w: SquidWorld, intents: Record<string, SquidIntent>, n: number): SquidWorld => {
  for (let i = 0; i < n; i++) w = stepSquid(w, intents, DT);
  return w;
};

describe("stepSquid — determinism & lifecycle", () => {
  it("is deterministic: identical runs produce deep-equal worlds", () => {
    const intents = { A: { ...idle, cycle: true } };
    const a = run(createSquidWorld("stage1", ["A"]), intents, 40);
    const b = run(createSquidWorld("stage1", ["A"]), intents, 40);
    expect(a).toEqual(b);
  });

  it("accumulates elapsed time so timeMsOf is exact", () => {
    const w = run(createSquidWorld("stage1", ["A"]), {}, 20);
    expect(w.elapsedS).toBeCloseTo(1.0);
    expect(timeMsOf(w)).toBe(1000);
  });

  it("actively stands on planted legs: head holds a standing band, not a collapse", () => {
    const w0 = createSquidWorld("stage1", ["A"]);
    const w = run(w0, { A: idle }, 120); // 6 s — long past any transient
    const y = w.points[HEAD]!.pos.y;
    // Rope stance restored: the spring lifts HEAD + the whole upper chain (points 0..ROOT_ANCHOR)
    // of each planted leg as one rigid block, so solve() no longer cancels the lift. Measured
    // settle height at STAND_GAIN=80 with 8 planted legs is ~0.60 m (probe-fix.mjs) — a real
    // stand near the old 3-joint rig's ~0.575, not the ~0.07 m collapse the single-anchor nudge gave.
    expect(y).toBeGreaterThan(0.55);
    expect(y).toBeLessThan(STAND_HEAD_Y_M + 0.2); // capped spring — no balloon float
    expect(w.result).toBeNull();
  });
});

describe("stepSquid — leg selection", () => {
  it("cycle claims a leg; grab claims a specific unheld leg", () => {
    let w = createSquidWorld("stage1", ["A", "B"]);
    w = stepSquid(w, { A: { ...idle, cycle: true }, B: { ...idle, grabLeg: 5 } }, DT);
    expect(w.control[0]).toBe("A");
    expect(w.control[5]).toBe("B");
  });

  it("resolves a grab conflict deterministically (lower sorted id wins)", () => {
    let w = createSquidWorld("stage1", ["B", "A"]);
    w = stepSquid(w, { A: { ...idle, grabLeg: 2 }, B: { ...idle, grabLeg: 2 } }, DT);
    expect(w.control[2]).toBe("A");
  });
});

describe("stepSquid — locomotion (the core mechanic)", () => {
  /** All 8 legs held by 8 players, swinging forward while planted. */
  const swarm = (swing: 1 | -1): { ids: string[]; intents: Record<string, SquidIntent> } => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, swing };
    return { ids, intents };
  };

  it("swinging planted legs propels the body forward", () => {
    const { ids, intents } = swarm(1);
    const w0 = createSquidWorld("stage1", ids);
    const x0 = w0.points[HEAD]!.pos.x;
    const w = run(w0, intents, 40); // 2 s of forward swing
    expect(w.points[HEAD]!.pos.x).toBeGreaterThan(x0 + 0.3);
  });

  it("swinging a LIFTED leg moves its tip but barely moves the body", () => {
    let w = createSquidWorld("stage1", ["A"]);
    const intents = { A: { ...idle, grabLeg: 0, lift: true, swing: 1 as const } };
    const x0 = w.points[HEAD]!.pos.x;
    const tip0 = w.points[w.legs[0]!.pts[TIP]!]!.pos.x;
    w = run(w, intents, 20);
    expect(w.points[w.legs[0]!.pts[TIP]!]!.pos.x).toBeGreaterThan(tip0 + 0.2);
    expect(Math.abs(w.points[HEAD]!.pos.x - x0)).toBeLessThan(0.15);
  });

  it("lifting all legs makes the body sag toward the ground", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    const w0 = createSquidWorld("stage1", ids);
    const y0 = w0.points[HEAD]!.pos.y;
    const w = run(w0, intents, 30);
    expect(w.points[HEAD]!.pos.y).toBeLessThan(y0 - 0.2);
  });

  it("stance force needs planted legs: all-lifted still sags (no anti-gravity)", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    const w0 = createSquidWorld("stage1", ids);
    const y0 = w0.points[HEAD]!.pos.y;
    const w = run(w0, intents, 30);
    expect(w.points[HEAD]!.pos.y).toBeLessThan(y0 - 0.2);
  });

  it("a lifted leg stays attached to the body (no spaghetti drift)", () => {
    let w = createSquidWorld("stage1", ["A", "B"]);
    const intents = {
      A: { swing: 1 as const, lift: true, cycle: false, grabLeg: 0 },
      B: { swing: 0 as const, lift: false, cycle: false, grabLeg: 4 },
    };
    for (let i = 0; i < 60; i++) w = stepSquid(w, intents, 1 / 20); // 3 s of lifted swing
    const head = w.points[HEAD]!.pos;
    for (const pi of w.legs[0]!.pts) {
      const p = w.points[pi]!.pos;
      // full chain is 15 × LEG_SEGMENT_M ≈ 1.35 m; allow modest solver slack
      expect(Math.hypot(p.x - head.x, p.y - head.y)).toBeLessThan(2);
    }
  });
});

describe("stepSquid — floor integrity & abandoned legs", () => {
  it("no point ever ends a tick below the floor (solo lift+swing thrash)", () => {
    let w = createSquidWorld("stage1", ["A"]);
    const intents = { A: { swing: 1 as const, lift: true, cycle: false, grabLeg: 0 } };
    for (let i = 0; i < 60; i++) {
      w = stepSquid(w, intents, DT);
      for (const p of w.points) expect(p.pos.y).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it("a leg abandoned while lifted auto-unlifts and returns to the floor", () => {
    let w = createSquidWorld("stage1", ["A"]);
    // lift leg 0 for a second…
    w = run(w, { A: { ...idle, grabLeg: 0, lift: true } }, 20);
    expect(w.legs[0]!.lifted).toBe(true);
    // …then A cycles away to another leg and goes idle
    w = stepSquid(w, { A: { ...idle, cycle: true } }, DT);
    w = run(w, { A: idle }, 40);
    expect(w.legs[0]!.lifted).toBe(false);
    const tip = w.points[w.legs[0]!.pts[TIP]!]!;
    expect(tip.pos.y).toBeLessThan(0.1); // back down at the floor, not dangling
    expect(tip.pos.y).toBeGreaterThanOrEqual(-1e-9);
  });
});

describe("stepSquid — fail & finish", () => {
  /** Teleport the rig so the head sits over the given x (test helper — sim never does this). */
  const rigAt = (w: SquidWorld, x: number): SquidWorld => {
    const dx = x - w.points[HEAD]!.pos.x;
    return {
      ...w,
      points: w.points.map((p) => ({
        pos: { x: p.pos.x + dx, y: p.pos.y },
        prev: { x: p.prev.x + dx, y: p.prev.y },
      })),
    };
  };

  it("stage2: head over the hole with every leg held lifted falls in ⇒ failed", () => {
    const ids = Array.from({ length: LEG_COUNT }, (_, i) => `P${i}`);
    const intents: Record<string, SquidIntent> = {};
    for (let i = 0; i < LEG_COUNT; i++) intents[`P${i}`] = { ...idle, grabLeg: i, lift: true };
    let w = rigAt(createSquidWorld("stage2", ids), 3.45); // center of the 3.0–3.9 gap
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, intents, 80);
    expect(w.result).toBe("failed");
    expect(w.phase).toBe("ended");
    expect(w.points[HEAD]!.pos.y).toBeLessThan(-HEAD_DROP_FAIL_M);
  });

  it("stage1 has no fail state: abandoned legs re-plant and the body just rests", () => {
    let w = rigAt(createSquidWorld("stage1", ["A"]), 3.45);
    w = { ...w, legs: w.legs.map((l) => ({ ...l, planted: false, lifted: true })) };
    w = run(w, {}, 60); // no controllers ⇒ legs auto-unlift, drop, re-plant
    expect(w.result).toBeNull();
    expect(w.legs.every((l) => !l.lifted)).toBe(true);
  });

  it("head crossing the finish arch ends the round with the exact time", () => {
    // Rope legs (24-iteration solver) resolve a head-only nudge much more thoroughly than the
    // old 3-joint rig did: nudging just the HEAD point while leaving every rope joint behind gets
    // mostly undone within the same tick (measured: the head snaps back below FINISH_X_M for
    // nudges from +0.01 up to +0.3, non-monotonically — the whole rig has to move together for the
    // crossing to register). Shift the whole rig with rigAt() instead of hand-nudging HEAD alone.
    let w = rigAt(createSquidWorld("stage1", ["A"]), FINISH_X_M + 0.01);
    w = { ...w, elapsedS: 5 };
    w = stepSquid(w, {}, DT);
    expect(w.result).toBe("finished");
    expect(w.phase).toBe("ended");
    expect(timeMsOf(w)).toBe(5050);
  });

  it("an ended world is frozen", () => {
    let w = createSquidWorld("stage1", ["A"]);
    w = { ...w, phase: "ended", result: "finished" };
    expect(stepSquid(w, { A: { ...idle, swing: 1 } }, DT)).toBe(w);
  });
});
