import { describe, expect, it } from "vitest";
import { decodeSquid, encodeSquid } from "./protocol";
import { encode } from "../../net/protocol";
import { createSquidWorld } from "../match";

describe("squid protocol messages", () => {
  it("round-trips squidStart", () => {
    const m = {
      t: "squidStart" as const,
      countdownMs: 3000,
      stage: "stage2" as const,
      players: [{ id: "A", name: "Ann", iconColor: 2, avatarUrl: null }],
    };
    expect(decodeSquid(encodeSquid(m))).toEqual(m);
  });

  it("round-trips squidInput and squidSnapshot with a real world", () => {
    const input = { t: "squidInput" as const, tick: 7, intent: { swing: 1 as const, lift: true, cycle: false } };
    expect(decodeSquid(encodeSquid(input))).toEqual(input);
    const snap = { t: "squidSnapshot" as const, world: createSquidWorld("stage1", ["A", "B"]) };
    expect(decodeSquid(encodeSquid(snap))).toEqual(snap);
  });

  it("ignores non-squid traffic and garbage (lobby messages stay with the shared protocol)", () => {
    expect(decodeSquid(encode({ t: "kick", targetId: "A" }))).toBeNull();
    expect(decodeSquid("not json")).toBeNull();
    expect(decodeSquid(JSON.stringify({ v: 999, m: { t: "squidInput" } }))).toBeNull();
  });
});
