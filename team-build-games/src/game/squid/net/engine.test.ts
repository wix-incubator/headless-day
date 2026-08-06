// src/game/squid/net/engine.test.ts
import { describe, expect, it } from "vitest";
import { LocalHub } from "../../net/transport";
import { SyncEngine } from "./engine";
import { squidSyncAdapter } from "./adapter";
import { decodeSquid, encodeSquid } from "./protocol";
import { createSquidWorld } from "../match";
import { POINT_COUNT } from "../octopus";
import { LEG_JOINTS } from "../constants";
import type { SquidIntent, SquidWorld } from "../types";

const IDLE: SquidIntent = { swing: 0, lift: false, cycle: false };

describe("SyncEngine — host snapshot broadcast throttle (FIX 1)", () => {
  it("caps broadcasts to ~20 Hz over 30 frames of dt=1/60, but still sends on the very first tick", () => {
    const hub = new LocalHub();
    const hostTransport = hub.join("a"); // lowest id -> host per electHost
    const clientTransport = hub.join("b");

    const world = createSquidWorld("stage1", ["a", "b"]);

    let snapshotCount = 0;
    let firstTickSnapshotSeen = false;
    clientTransport.onMessage((data) => {
      const m = decodeSquid(data);
      if (m?.t === "squidSnapshot") snapshotCount++;
    });

    const host = new SyncEngine<SquidWorld, SquidIntent>({
      transport: hostTransport,
      localId: "a",
      world,
      adapter: squidSyncAdapter,
      readIntent: () => IDLE,
      onWorld: () => {},
    });
    // A second engine on "b" so it's a real connected peer (host election needs both online);
    // "b" is never elected host here since "a" < "b".
    new SyncEngine<SquidWorld, SquidIntent>({
      transport: clientTransport,
      localId: "b",
      world,
      adapter: squidSyncAdapter,
      readIntent: () => IDLE,
      onWorld: () => {},
    });

    host.tick(1 / 60);
    firstTickSnapshotSeen = snapshotCount >= 1;

    for (let i = 1; i < 30; i++) host.tick(1 / 60);

    // 30 frames * 1/60 s = 0.5 s total; at a 20 Hz cap (interval 0.05 s) that's ~10-12 sends,
    // never all 30 (which would be the un-throttled 60 Hz-broadcast bug).
    expect(firstTickSnapshotSeen).toBe(true);
    expect(snapshotCount).toBeGreaterThanOrEqual(10);
    expect(snapshotCount).toBeLessThanOrEqual(12);
  });

  it("keeps sending every tick when dt equals the 20 Hz interval exactly (existing session tests' cadence)", () => {
    const hub = new LocalHub();
    const hostTransport = hub.join("a");
    const clientTransport = hub.join("b");
    const world = createSquidWorld("stage1", ["a", "b"]);

    let snapshotCount = 0;
    clientTransport.onMessage((data) => {
      const m = decodeSquid(data);
      if (m?.t === "squidSnapshot") snapshotCount++;
    });

    const host = new SyncEngine<SquidWorld, SquidIntent>({
      transport: hostTransport,
      localId: "a",
      world,
      adapter: squidSyncAdapter,
      readIntent: () => IDLE,
      onWorld: () => {},
    });
    new SyncEngine<SquidWorld, SquidIntent>({
      transport: clientTransport,
      localId: "b",
      world,
      adapter: squidSyncAdapter,
      readIntent: () => IDLE,
      onWorld: () => {},
    });

    for (let i = 0; i < 10; i++) host.tick(0.05);

    expect(snapshotCount).toBe(10);
  });
});

describe("squidSyncAdapter — mixed-build snapshot shape guard (FIX 2)", () => {
  it("ignores a squidSnapshot whose world shape doesn't match this build (stale pre-rope 25-point world)", () => {
    const staleWorld = {
      ...createSquidWorld("stage1", ["a"]),
      points: Array.from({ length: 25 }, () => ({ pos: { x: 0, y: 0 }, prev: { x: 0, y: 0 } })),
      legs: [{ pts: [0, 1, 2] }],
    } as unknown as SquidWorld;

    const decoded = squidSyncAdapter.decodeMessage(
      encodeSquid({ t: "squidSnapshot", world: staleWorld }),
    );

    expect(decoded).toBeNull();
  });

  it("accepts a well-formed same-build snapshot (sanity check the guard doesn't over-reject)", () => {
    const world = createSquidWorld("stage1", ["a"]);
    expect(world.points.length).toBe(POINT_COUNT);
    expect(world.legs[0]!.pts.length).toBe(LEG_JOINTS);

    const decoded = squidSyncAdapter.decodeMessage(squidSyncAdapter.encodeSnapshot(world));
    expect(decoded).toEqual({ kind: "snapshot", world });
  });
});
