import { describe, expect, it } from "vitest";
import { LocalHub, type PeerId } from "./transport";

describe("LocalHub", () => {
  it("fires join for existing peers and lists them in getPeers", () => {
    const hub = new LocalHub();
    const a = hub.join("a");
    const aSawJoin: PeerId[] = [];
    a.onPeerJoin((id) => aSawJoin.push(id));
    const b = hub.join("b");
    expect(aSawJoin).toEqual(["b"]); // a is notified when b joins
    expect(a.getPeers()).toEqual(["b"]);
    expect(b.getPeers()).toEqual(["a"]);
  });

  it("broadcasts to all others but not self", () => {
    const hub = new LocalHub();
    const a = hub.join("a");
    const b = hub.join("b");
    const c = hub.join("c");
    const got: Record<string, string[]> = { a: [], b: [], c: [] };
    a.onMessage((d, from) => got.a.push(`${from}:${d}`));
    b.onMessage((d, from) => got.b.push(`${from}:${d}`));
    c.onMessage((d, from) => got.c.push(`${from}:${d}`));
    a.send("hi");
    expect(got.a).toEqual([]); // not echoed to self
    expect(got.b).toEqual(["a:hi"]);
    expect(got.c).toEqual(["a:hi"]);
  });

  it("sends to a single targeted peer", () => {
    const hub = new LocalHub();
    const a = hub.join("a");
    const b = hub.join("b");
    const c = hub.join("c");
    const gotB: string[] = [];
    const gotC: string[] = [];
    b.onMessage((d) => gotB.push(d));
    c.onMessage((d) => gotC.push(d));
    a.send("secret", "b");
    expect(gotB).toEqual(["secret"]);
    expect(gotC).toEqual([]);
  });

  it("fires leave and drops the peer from getPeers", () => {
    const hub = new LocalHub();
    const a = hub.join("a");
    const b = hub.join("b");
    const left: PeerId[] = [];
    a.onPeerLeave((id) => left.push(id));
    b.close();
    expect(left).toEqual(["b"]);
    expect(a.getPeers()).toEqual([]);
  });
});
