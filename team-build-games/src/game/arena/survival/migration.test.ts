/**
 * P-A3 phase gate: host-migration determinism. Serialize a live survival World to the wire, rebuild
 * it on a fresh peer via encode → decode → worldFromSnapshot, then step BOTH forward with identical
 * inputs and assert byte-identical worlds for many ticks. Proves the snapshot carries every
 * host-mutated field (enemies, run, seed, cursor) and that a promoted peer forks nothing.
 */
import { describe, it, expect } from "vitest";
import { stepWorld } from "../sim";
import { createSurvivalMatchWorld } from "./step";
import { encode, decode, worldFromSnapshot, type NetMessage } from "../../net/protocol";
import type { World } from "../types";

const DT = 0.1;

/** The snapshot message the host broadcasts each tick (mirrors sync.ts). */
function snapshotMessage(w: World): NetMessage {
  return {
    t: "snapshot",
    tick: w.tick,
    phase: w.phase,
    winnerId: w.winnerId,
    mode: w.mode,
    players: w.players,
    projectiles: w.projectiles,
    enemies: w.enemies,
    survival: w.survival,
  };
}

describe("survival host migration", () => {
  it("a peer hydrated from a snapshot steps byte-identically to the host", () => {
    let host = createSurvivalMatchWorld(["p1", "p2"], "coop-survival", { seed: 123 });
    // Run a while so enemies are on the field and the campaign has progressed.
    for (let i = 0; i < 50; i++) host = stepWorld(host, {}, DT);
    expect(host.enemies!.length).toBeGreaterThan(0);

    // Migrate: host → wire → fresh peer.
    const msg = decode(encode(snapshotMessage(host)));
    expect(msg).not.toBeNull();
    let peer = worldFromSnapshot(msg as Extract<NetMessage, { t: "snapshot" }>);
    expect(peer.enemies).toEqual(host.enemies);
    expect(peer.survival).toEqual(host.survival);

    // Step both forward with identical (empty) intents — must never diverge.
    for (let i = 0; i < 200; i++) {
      host = stepWorld(host, {}, DT);
      peer = stepWorld(peer, {}, DT);
      expect(peer.enemies).toEqual(host.enemies);
      expect(peer.players).toEqual(host.players);
      expect(peer.survival).toEqual(host.survival);
      expect(peer.phase).toBe(host.phase);
      expect(peer.winnerId).toBe(host.winnerId);
    }
  });
});
