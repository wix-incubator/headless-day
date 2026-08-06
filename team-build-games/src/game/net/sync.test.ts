import { describe, expect, it } from "vitest";
import { LocalHub } from "./transport";
import { SyncEngine } from "./sync";
import { createWorld } from "../arena/match";
import type { Intent, InputState, World } from "../arena/types";

const NONE: InputState = { up: false, down: false, left: false, right: false };
const IDLE: Intent = {
  move: NONE,
  facing: "down",
  dash: false,
  attack: false,
  block: false,
};
const RIGHT: Intent = {
  move: { ...NONE, right: true },
  facing: "right",
  dash: false,
  attack: false,
  block: false,
};

const spawns = () => [
  { id: "a", pos: { x: 5, y: 15 } },
  { id: "b", pos: { x: 10, y: 15 } },
  { id: "c", pos: { x: 20, y: 15 } },
];

describe("SyncEngine — host authority", () => {
  it("the host applies a client's input and broadcasts it to everyone", () => {
    const hub = new LocalHub();
    let aWorld: World | undefined;
    let bWorld: World | undefined;
    const a = new SyncEngine({
      transport: hub.join("a"),
      localId: "a",
      world: createWorld(spawns().slice(0, 2)),
      readIntent: () => IDLE,
      onWorld: (w) => (aWorld = w),
    });
    const b = new SyncEngine({
      transport: hub.join("b"),
      localId: "b",
      world: createWorld(spawns().slice(0, 2)),
      readIntent: () => RIGHT, // b holds "right"
      onWorld: (w) => (bWorld = w),
    });

    expect(a.isHost).toBe(true); // lowest id
    expect(b.isHost).toBe(false);

    // client ticks first (sends input), then host steps using it
    for (let i = 0; i < 5; i++) {
      b.tick(0.1);
      a.tick(0.1);
    }
    b.tick(0); // flush: let b render the host's latest snapshot

    // b moved right in the canonical (host) world, and b's own client view agrees exactly
    expect(aWorld!.players.b.pos.x).toBeGreaterThan(10);
    expect(bWorld!.players.b.pos.x).toBeCloseTo(aWorld!.players.b.pos.x, 5);
    // 'a' (idle) did not move
    expect(aWorld!.players.a.pos.x).toBeCloseTo(5, 5);
  });
});

describe("SyncEngine — host-controlled bots & peer drop", () => {
  it("the host applies extra intents for non-peer entities (bots)", () => {
    const hub = new LocalHub();
    let aWorld: World | undefined;
    const a = new SyncEngine({
      transport: hub.join("a"),
      localId: "a",
      world: createWorld(spawns()),
      readIntent: () => IDLE,
      onWorld: (w) => (aWorld = w),
      hostExtraIntents: () => ({ c: RIGHT }), // host drives "c" like a bot
    });
    const b = new SyncEngine({
      transport: hub.join("b"),
      localId: "b",
      world: createWorld(spawns()),
      readIntent: () => IDLE,
      onWorld: () => {},
    });
    for (let i = 0; i < 3; i++) {
      b.tick(0.1);
      a.tick(0.1);
    }
    expect(aWorld!.players.c.pos.x).toBeGreaterThan(20); // c (host-driven) moved right
  });

  it("marks a departed peer's player dead so the match resolves", () => {
    const hub = new LocalHub();
    let aWorld: World | undefined;
    const ta = hub.join("a");
    const tb = hub.join("b");
    const a = new SyncEngine({
      transport: ta,
      localId: "a",
      world: createWorld(spawns().slice(0, 2)),
      readIntent: () => IDLE,
      onWorld: (w) => (aWorld = w),
    });
    const b = new SyncEngine({
      transport: tb,
      localId: "b",
      world: createWorld(spawns().slice(0, 2)),
      readIntent: () => IDLE,
      onWorld: () => {},
    });

    a.tick(0.05);
    tb.close(); // b drops → host a marks b dead
    a.tick(0.05);

    expect(aWorld!.players.b.status).toBe("dead");
    expect(aWorld!.phase).toBe("ended");
    expect(aWorld!.winnerId).toBe("a");
    void b;
  });
});

describe("SyncEngine — host migration", () => {
  it("promotes the next-lowest peer when the host leaves, and the sim continues", () => {
    const hub = new LocalHub();
    const worlds: Record<string, World> = {};
    const ta = hub.join("a");
    const tb = hub.join("b");
    const tc = hub.join("c");
    const a = new SyncEngine({
      transport: ta,
      localId: "a",
      world: createWorld(spawns()),
      readIntent: () => IDLE,
      onWorld: (w) => (worlds.a = w),
    });
    const b = new SyncEngine({
      transport: tb,
      localId: "b",
      world: createWorld(spawns()),
      readIntent: () => IDLE,
      onWorld: (w) => (worlds.b = w),
    });
    const c = new SyncEngine({
      transport: tc,
      localId: "c",
      world: createWorld(spawns()),
      readIntent: () => IDLE,
      onWorld: (w) => (worlds.c = w),
    });

    expect(a.isHost).toBe(true);
    for (let i = 0; i < 4; i++) {
      b.tick(0.05);
      c.tick(0.05);
      a.tick(0.05);
    }
    const tickBeforeLeave = b.getWorld().tick;
    expect(tickBeforeLeave).toBeGreaterThan(0);

    // host leaves
    ta.close();

    for (let i = 0; i < 4; i++) {
      c.tick(0.05);
      b.tick(0.05);
    }
    c.tick(0); // flush: let c render b's latest snapshot

    expect(b.isHost).toBe(true); // migrated to next-lowest connected
    expect(c.isHost).toBe(false);
    expect(b.getWorld().tick).toBeGreaterThan(tickBeforeLeave); // sim kept advancing
    expect(worlds.c!.tick).toBe(b.getWorld().tick); // c is now following b's snapshots
  });
});
