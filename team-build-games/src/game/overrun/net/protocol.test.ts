import { describe, expect, it } from "vitest";
import { decode, encode } from "./protocol";
import { encode as encodeLobby } from "../../net/protocol";

describe("overrun protocol messages", () => {
  it("round-trips oHello", () => {
    const m = { t: "oHello" as const, name: "Ann", hostId: "A" };
    expect(decode(encode(m))).toEqual(m);
  });

  it("round-trips oStart, oInput, oSnap, oDelta", () => {
    const start = { t: "oStart" as const, countdownMs: 3000, seed: 42, players: [{ id: "A", name: "Ann" }] };
    expect(decode(encode(start))).toEqual(start);
    const input = { t: "oInput" as const, intent: { move: { up: true, down: false, left: false, right: false }, fire: false, reload: false, perkPick: null } };
    expect(decode(encode(input))).toEqual(input);
    const snap = { t: "oSnap" as const, w: { t: 5, ph: 0 } };
    expect(decode(encode(snap))).toEqual(snap);
    const delta = { t: "oDelta" as const, d: { b: 0, t: 5 } };
    expect(decode(encode(delta))).toEqual(delta);
  });

  it("round-trips the oIntro campaign-intro signal", () => {
    expect(decode(encode({ t: "oIntro" }))).toEqual({ t: "oIntro" });
  });

  it("ignores non-overrun traffic and garbage (lobby messages stay with the shared protocol)", () => {
    expect(decode(encodeLobby({ t: "kick", targetId: "A" }))).toBeNull();
    expect(decode("not json")).toBeNull();
    expect(decode(JSON.stringify({ v: 999, m: { t: "oInput" } }))).toBeNull();
  });
});
