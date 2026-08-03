import { describe, expect, it } from "vitest";
import { LocalHub } from "./transport";
import { Session } from "./session";
import { COUNTDOWN_S } from "../constants";
import type { RawInput } from "../arena/types";

const IDLE: RawInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
  attack: false,
  block: false,
};
const RIGHT: RawInput = { ...IDLE, right: true };

describe("Session — lobby → start → play", () => {
  it("converges the roster, elects a host, starts a match, and syncs a client's movement", () => {
    const hub = new LocalHub();
    const a = new Session({
      transport: hub.join("a"),
      name: "Ay",
      shape: "circle",
      weapon: "sword",
      onChange: () => {},
    });
    const b = new Session({
      transport: hub.join("b"),
      name: "Bee",
      shape: "circle",
      weapon: "sword",
      onChange: () => {},
    });

    // presence converges on both peers despite join ordering
    expect(a.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(b.getState().roster.map((p) => p.id)).toEqual(["a", "b"]);
    expect(a.getState().isHost).toBe(true);
    expect(b.getState().isHost).toBe(false);

    // host starts a human-only match
    a.start(0);
    expect(a.phase).toBe("countdown");
    expect(b.phase).toBe("countdown"); // received the start broadcast

    // b spawns at the left (x≈2); hold "right" through countdown + a second of play
    const bSpawnX = b.frame(0, RIGHT).world.players.b.pos.x;
    for (let i = 0; i < 85; i++) {
      b.frame(0.05, RIGHT);
      a.frame(0.05, IDLE);
    }
    const aw = a.frame(0, IDLE).world;
    const bw = b.frame(0, RIGHT).world;

    expect(aw.phase).toBe("playing"); // countdown elapsed
    expect(aw.players.b.pos.x).toBeGreaterThan(bSpawnX + 1); // host applied b's input
    expect(bw.players.b.pos.x).toBeCloseTo(aw.players.b.pos.x, 1); // client follows host
  });

  it("a host-driven bot is simulated and visible to clients", () => {
    const hub = new LocalHub();
    const a = new Session({
      transport: hub.join("a"),
      name: "A",
      shape: "circle",
      weapon: "sword",
      onChange: () => {},
    });
    const b = new Session({
      transport: hub.join("b"),
      name: "B",
      shape: "circle",
      weapon: "sword",
      onChange: () => {},
    });

    a.start(1); // 2 humans + 1 bot
    expect(a.getMeta("bot:1").name).toBe("Bot 1");

    for (let i = 0; i < 70; i++) {
      b.frame(0.05, IDLE);
      a.frame(0.05, IDLE);
    }
    const aw = a.frame(0, IDLE).world;
    expect(aw.players["bot:1"]).toBeDefined();
    expect(aw.players["bot:1"]!.status).toBe("alive");
  });

  it("does not start an unavailable mode under Free For All rules", () => {
    const hub = new LocalHub();
    const a = new Session({
      transport: hub.join("a"),
      name: "A",
      shape: "circle",
      weapon: "sword",
      onChange: () => {},
    });
    a.start(1, 1, "labyrinth"); // still 'soon' → falls back to FFA rules
    expect(a.getState().mode).toBe("ffa");
    expect(a.frame(0, IDLE).world.mode).toBe("ffa");
  });

  it("broadcasts avatar removal and replacement to the lobby", () => {
    const hub = new LocalHub();
    const a = new Session({
      transport: hub.join("a"),
      name: "A",
      shape: "circle",
      weapon: "sword",
      avatarUrl: "https://cdn.example.com/a.png",
      onChange: () => {},
    });
    const b = new Session({
      transport: hub.join("b"),
      name: "B",
      shape: "square",
      weapon: "spear",
      onChange: () => {},
    });

    expect(b.getState().roster.find((p) => p.id === "a")?.avatarUrl).toContain(
      "a.png",
    );
    a.setAvatarUrl(null);
    expect(a.getState().roster.find((p) => p.id === "a")?.avatarUrl).toBeNull();
    expect(b.getState().roster.find((p) => p.id === "a")?.avatarUrl).toBeNull();

    a.setAvatarUrl("https://cdn.example.com/new-a.png");
    expect(b.getState().roster.find((p) => p.id === "a")?.avatarUrl).toContain(
      "new-a.png",
    );
  });
});

describe("Session — explicit host (creator stays host; transferable)", () => {
  const opts = (id: string, extra = {}) => ({
    transport: undefined as never, // set below
    name: id,
    shape: "circle" as const,
    weapon: "sword" as const,
    onChange: () => {},
    ...extra,
  });

  it("keeps the room creator as host even when a joiner has a lexicographically-lower id", () => {
    const hub = new LocalHub();
    // creator "z" has the HIGHER id; joiner "a" the lower — old lowest-id election would crown "a".
    const z = new Session({
      ...opts("z"),
      transport: hub.join("z"),
      isCreator: true,
    });
    const a = new Session({ ...opts("a"), transport: hub.join("a") });

    expect(z.getState().isHost).toBe(true);
    expect(a.getState().isHost).toBe(false);
    expect(a.getState().hostId).toBe("z");
    expect(z.getState().hostId).toBe("z");
  });

  it("transfers host to another player via makeHost", () => {
    const hub = new LocalHub();
    const z = new Session({
      ...opts("z"),
      transport: hub.join("z"),
      isCreator: true,
    });
    const a = new Session({ ...opts("a"), transport: hub.join("a") });

    z.makeHost("a");

    expect(a.getState().isHost).toBe(true);
    expect(z.getState().isHost).toBe(false);
    expect(z.getState().hostId).toBe("a");
    expect(a.getState().hostId).toBe("a");
  });

  it("migrates host to a remaining peer when the host leaves", () => {
    const hub = new LocalHub();
    const z = new Session({
      ...opts("z"),
      transport: hub.join("z"),
      isCreator: true,
    });
    const a = new Session({ ...opts("a"), transport: hub.join("a") });
    const b = new Session({ ...opts("b"), transport: hub.join("b") });

    hub.leave("z"); // creator/host drops
    // remaining peers re-elect a stable host (lowest remaining id: "a") and agree on it
    expect(a.getState().hostId).toBe("a");
    expect(b.getState().hostId).toBe("a");
    expect(a.getState().isHost).toBe(true);
  });
});

describe("Session — rounds lifecycle (host-gated, P8)", () => {
  const opts = (id: string, extra = {}) => ({
    transport: undefined as never,
    name: id,
    shape: "circle" as const,
    weapon: "sword" as const,
    onChange: () => {},
    ...extra,
  });

  it("rounds=1: a round ending finishes the match (phase 'ended') with a populated board", () => {
    const hub = new LocalHub();
    const a = new Session({
      ...opts("a"),
      transport: hub.join("a"),
      isCreator: true,
    });
    new Session({ ...opts("b"), transport: hub.join("b") });
    a.start(0, 1);
    a.frame(COUNTDOWN_S + 0.1, IDLE); // exit countdown → playing
    expect(a.phase).toBe("playing");
    hub.leave("b"); // b drops → host marks it dead
    a.frame(0.05, IDLE); // only 'a' alive → round resolves
    expect(a.phase).toBe("ended");
    const st = a.getState();
    expect(st.board?.final).toBe(true);
    expect(st.board?.wins.a).toBe(1);
    expect(st.board?.podium[0]?.players).toContain("a"); // 'a' is 1st
  });

  it("rounds>1: a round ending pauses at 'roundover' until the host advances", () => {
    const hub = new LocalHub();
    const a = new Session({
      ...opts("a"),
      transport: hub.join("a"),
      isCreator: true,
    });
    new Session({ ...opts("b"), transport: hub.join("b") });
    a.start(0, 2); // best of 2
    a.frame(COUNTDOWN_S + 0.1, IDLE);
    hub.leave("b");
    a.frame(0.05, IDLE); // round 1 resolves
    expect(a.phase).toBe("roundover");
    expect(a.getState().board?.final).toBe(false);
    expect(a.getState().board?.wins.a).toBe(1);
    // only the host's Next-round advances the match
    a.nextRoundAction();
    expect(a.phase).toBe("countdown"); // round 2 begins
    expect(a.getState().roundNumber).toBe(2);
  });

  it("ignores nextRoundAction unless we are the host at a round-over", () => {
    const hub = new LocalHub();
    const a = new Session({
      ...opts("a"),
      transport: hub.join("a"),
      isCreator: true,
    });
    a.nextRoundAction(); // in lobby → no-op
    expect(a.phase).toBe("lobby");
  });
});
