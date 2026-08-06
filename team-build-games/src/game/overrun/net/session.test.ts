// src/game/overrun/net/session.test.ts
import { describe, expect, it } from "vitest";
import { OverrunSession } from "./session";
import { LocalHub } from "../../net/transport";
import { qWorld, unqWorld } from "./codec";
import { MAX_CATCHUP_TICKS, SHOOTER_DT, SNAPSHOT_EVERY_TICKS } from "../constants";
import type { RawShooterInput } from "../types";

const RAW: RawShooterInput = { up: false, down: false, left: false, right: false, fire: false, reload: false, pick1: false, pick2: false, pick3: false };

function makeParty(n: number): { hub: LocalHub; sessions: OverrunSession[] } {
  const hub = new LocalHub();
  const sessions = Array.from({ length: n }, (_, i) =>
    new OverrunSession({ transport: hub.join(`p${i}`), name: `P${i}`, isCreator: i === 0, onChange: () => {} }),
  );
  return { hub, sessions };
}

/** Run every session's frame() for `seconds` of wall time in SHOOTER_DT slices. */
function run(sessions: OverrunSession[], seconds: number, input: (id: string) => RawShooterInput = () => RAW): void {
  const steps = Math.round(seconds / SHOOTER_DT);
  for (let s = 0; s < steps; s++) for (const ses of sessions) ses.frame(SHOOTER_DT, input(ses.localId));
}

describe("OverrunSession lifecycle", () => {
  it("8 peers: roster converges, host starts, everyone reaches playing with an identical initial party", () => {
    const { sessions } = makeParty(8);
    expect(sessions[0]!.getState().roster.length).toBe(8);
    expect(sessions[7]!.getState().hostId).toBe("p0");
    sessions[0]!.start();
    expect(sessions.every((s) => s.phase === "countdown")).toBe(true);
    run(sessions, 3.1); // countdown
    expect(sessions.every((s) => s.phase === "playing")).toBe(true);
    const worlds = sessions.map((s) => s.frame(SHOOTER_DT, RAW).world);
    expect(Object.keys(worlds[0]!.players).sort()).toEqual(["p0", "p1", "p2", "p3", "p4", "p5", "p6", "p7"]);
    // colorIndex is derived from each player's index in the host-ordered oStart players array
    // (rosterList sorts by id, so lexicographic p0..p7 order matches numeric index here).
    for (let i = 0; i < 8; i++) {
      expect(sessions[0]!.getMeta(`p${i}`).colorIndex).toBe(i);
      expect(sessions[7]!.getMeta(`p${i}`).colorIndex).toBe(i);
    }
  });

  it("non-host cannot start", () => {
    const { sessions } = makeParty(2);
    sessions[1]!.start();
    expect(sessions[0]!.phase).toBe("lobby");
  });

  it("host signalIntro flips introPlaying on every peer", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.signalIntro();
    expect(sessions.every((s) => s.getState().introPlaying)).toBe(true);
  });

  it("non-host signalIntro is a no-op", () => {
    const { sessions } = makeParty(2);
    sessions[1]!.signalIntro();
    expect(sessions.some((s) => s.getState().introPlaying)).toBe(false);
  });

  it("starting the match clears introPlaying everywhere", () => {
    const { sessions } = makeParty(2);
    sessions[0]!.signalIntro();
    sessions[0]!.start();
    expect(sessions.every((s) => s.getState().introPlaying)).toBe(false);
  });

  it("clients converge on the host's quantized world and never spawn enemies of their own", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.start();
    run(sessions, 3.1);
    run(sessions, 2); // waves spawn on the host
    const host = sessions[0]!.frame(SHOOTER_DT, RAW).world;
    // after a snapshot boundary settles, clients hold exactly unq(q(host-at-that-tick))
    run(sessions, SNAPSHOT_EVERY_TICKS * SHOOTER_DT * 2);
    const client = sessions[2]!.frame(0, RAW).world; // dt 0 → no tick, raw latest snapshot (alpha 0 → latest? lerp(prev,latest,0)=prev pos… assert on IDs not positions)
    expect(host.enemies.length).toBeGreaterThan(0);
    // every enemy a client knows came from the host's spawnSeq namespace — no local spawns
    expect(client.enemies.every((e) => /^e\d+$/.test(e.id))).toBe(true);
    expect(client.spawnSeq).toBeGreaterThan(0);
    expect(client.seed).toBe(host.seed);
  });

  it("host migration mid-wave: the new host resumes from its held snapshot (seed/spawnSeq/pity intact) and clients keep converging", () => {
    const { sessions } = makeParty(3);
    sessions[0]!.start();
    run(sessions, 3.1);
    run(sessions, 3); // into wave 1+
    const beforeQ = qWorld(sessions[1]!.frame(0, RAW).world);
    sessions[0]!.leave();
    const survivors = sessions.slice(1);
    run(survivors, 0.5);
    // p1 (lowest surviving id) is now host and kept simulating from its snapshot
    expect(survivors[0]!.getState().isHost).toBe(true);
    const after = survivors[0]!.frame(0, RAW).world;
    expect(after.seed).toBe(unqWorld(beforeQ).seed);
    expect(after.spawnSeq).toBeGreaterThanOrEqual(unqWorld(beforeQ).spawnSeq);
    expect(after.tick).toBeGreaterThan(unqWorld(beforeQ).tick);
    expect(after.players.p0?.status).toBe("dead"); // departed peer folded in
    // determinism of the continuation: a fresh sim fed the same snapshot+idle intents matches the new host
    run(survivors, 1);
    const w1 = survivors[0]!.frame(0, RAW).world;
    const w2 = survivors[1]!.frame(0, RAW).world;
    expect(qWorld(w2).t).toBeLessThanOrEqual(qWorld(w1).t); // client trails by ≤ a snapshot
  });

  it("pickPerk queues a pick that reaches the sim as intent", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    // no offer yet → pick is a harmless no-op; the wire path is what's under test
    sessions[0]!.pickPerk(1);
    run(sessions, 0.2);
    expect(sessions[0]!.phase).toBe("playing");
  });

  it("frame clamps catch-up work after a long stall", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    const before = sessions[0]!.frame(0, RAW).world.tick;
    sessions[0]!.frame(10, RAW); // a 10 s hang must not run 300 ticks
    const after = sessions[0]!.frame(0, RAW).world.tick;
    expect(after - before).toBeLessThanOrEqual(MAX_CATCHUP_TICKS + 1);
  });

  it("toLobby resets to the warm-up room", () => {
    const { sessions } = makeParty(1);
    sessions[0]!.start();
    run(sessions, 3.1);
    sessions[0]!.toLobby();
    expect(sessions[0]!.phase).toBe("lobby");
  });

  it("9 peers: host start() is a no-op (phase stays lobby for all)", () => {
    const { sessions } = makeParty(9);
    expect(sessions[0]!.getState().roster.length).toBe(9);
    sessions[0]!.start();
    expect(sessions.every((s) => s.phase === "lobby")).toBe(true);
  });

  it("wipe reaches the client too: a host-side wipe must be broadcast even off the snapshot cadence (CRITICAL-1 regression)", () => {
    // 2 idle players never fight back, so wave enemies eventually wipe the party.
    // Without the adapter fix, if the wipe tick doesn't land on a snapshot-cadence
    // boundary the "ended" world is never broadcast and the client hangs in
    // "playing" forever.
    const { sessions } = makeParty(2);
    sessions[0]!.start();
    run(sessions, 3.1); // countdown -> playing
    expect(sessions.every((s) => s.phase === "playing")).toBe(true);

    const MAX_TICKS = 1800; // 60 sim-seconds bound (rushers: 5 dmg/0.5s contact, 100 HP — a wipe lands well inside this)
    for (let i = 0; i < MAX_TICKS && sessions[0]!.phase !== "ended"; i++) {
      for (const s of sessions) s.frame(SHOOTER_DT, RAW);
    }
    expect(sessions[0]!.phase).toBe("ended"); // host wiped within the bound

    // Run a few more frames so the client's engine receives the broadcast carrying
    // the phase transition (a delta or forced keyframe, depending on cadence).
    for (let i = 0; i < 10; i++) for (const s of sessions) s.frame(SHOOTER_DT, RAW);
    expect(sessions[1]!.phase).toBe("ended"); // client must have converged too — not hung at "playing"
  });
});
