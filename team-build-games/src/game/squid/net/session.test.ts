// src/game/squid/net/session.test.ts
import { describe, expect, it } from "vitest";
import { LocalHub } from "../../net/transport";
import { SquidSession } from "./session";
import type { RawSquidInput } from "../types";

const IDLE: RawSquidInput = { left: false, right: false, lift: false, cycle: false, grabLeg: null };
const GRAB4: RawSquidInput = { ...IDLE, grabLeg: 4 };

describe("SquidSession — lobby → start → play", () => {
  it("converges the roster, honors the creator-host, and syncs a client's leg grab", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    expect(a.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(b.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(a.getState().isHost).toBe(true);

    a.start("stage2");
    expect(a.phase).toBe("countdown");
    expect(b.phase).toBe("countdown");
    expect(b.getState().stage).toBe("stage2");

    // 3 s countdown + ~1 s of play at 20 Hz frames; b holds a grab on leg 4 throughout
    for (let i = 0; i < 80; i++) {
      a.frame(0.05, IDLE);
      b.frame(0.05, GRAB4);
    }
    const aw = a.frame(0, IDLE).world;
    const bw = b.frame(0, GRAB4).world;
    expect(aw.phase).toBe("playing");
    expect(aw.elapsedS).toBeGreaterThan(0);
    expect(aw.control[4]).toBe("b"); // host applied b's grab
    expect(bw.control[4]).toBe("b"); // client sees it via snapshot
  });

  it("solo start is allowed (1 player) and a leaver's leg is released", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    a.start("stage1");
    for (let i = 0; i < 80; i++) {
      a.frame(0.05, IDLE);
      b.frame(0.05, GRAB4);
    }
    expect(a.frame(0, IDLE).world.control[4]).toBe("b");

    b.leave();
    a.frame(0.05, IDLE);
    expect(a.frame(0, IDLE).world.control[4]).toBeNull();
    expect(a.frame(0, IDLE).world.playerIds).toEqual(["a"]);
  });

  it("host chains the next stage from the ended phase: everyone re-enters countdown", () => {
    const hub = new LocalHub();
    const a = new SquidSession({ transport: hub.join("a"), name: "Ay", iconColor: 0, isCreator: true, onChange: () => {} });
    const b = new SquidSession({ transport: hub.join("b"), name: "Bee", iconColor: 1, onChange: () => {} });

    a.start("stage1");
    const epoch1 = a.getState().matchEpoch;
    a.phase = "ended";
    b.phase = "ended";

    a.start("stage2"); // what the Next level button calls
    expect(a.phase).toBe("countdown");
    expect(b.phase).toBe("countdown");
    expect(a.getState().stage).toBe("stage2");
    expect(b.getState().stage).toBe("stage2");
    expect(a.getState().matchEpoch).toBe(epoch1 + 1);
    expect(a.getState().roster.map((p) => p.id)).toEqual(["a", "b"]); // same party
  });
});
