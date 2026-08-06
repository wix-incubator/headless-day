import { describe, expect, it } from "vitest";
import { MAX_SIGNAL_BYTES, isSignalTopic, parseSignalBody, unwrapSignalPayload } from "./protocol";

const TOPIC = "a".repeat(40);

describe("isSignalTopic", () => {
  // Trystero topics are sha1 digests where each byte is `.toString(36)` UNPADDED and joined:
  // base36 alphabet, 20 chars (all bytes < 36) to 40 chars (all bytes ≥ 36).
  it("accepts base36 strings between 20 and 40 chars", () => {
    expect(isSignalTopic("0123456789abcdef0123456789abcdef01234567")).toBe(true); // 40, hex subset
    expect(isSignalTopic("z".repeat(40))).toBe(true);
    expect(isSignalTopic("g".repeat(20))).toBe(true);
    expect(isSignalTopic("1a9zq0p3k7v2m5x8c4b6")).toBe(true); // 20, mixed
  });

  it("rejects wrong lengths, uppercase, and non-base36 chars", () => {
    expect(isSignalTopic("a".repeat(19))).toBe(false);
    expect(isSignalTopic("a".repeat(41))).toBe(false);
    expect(isSignalTopic("A".repeat(40))).toBe(false);
    expect(isSignalTopic("a".repeat(19) + "-")).toBe(false);
    expect(isSignalTopic("a".repeat(19) + "_")).toBe(false);
    expect(isSignalTopic("")).toBe(false);
  });
});

describe("parseSignalBody", () => {
  it("returns topic and msg for a valid body", () => {
    expect(parseSignalBody({ topic: TOPIC, msg: "hello" })).toEqual({ ok: true, topic: TOPIC, msg: "hello" });
  });

  it("rejects a non-object body", () => {
    expect(parseSignalBody(null)).toEqual({ ok: false, error: "invalid body" });
    expect(parseSignalBody("x")).toEqual({ ok: false, error: "invalid body" });
  });

  it("rejects an invalid topic", () => {
    expect(parseSignalBody({ topic: "short", msg: "hello" })).toEqual({ ok: false, error: "invalid topic" });
  });

  it("rejects a missing or non-string msg", () => {
    expect(parseSignalBody({ topic: TOPIC })).toEqual({ ok: false, error: "invalid msg" });
    expect(parseSignalBody({ topic: TOPIC, msg: 5 })).toEqual({ ok: false, error: "invalid msg" });
    expect(parseSignalBody({ topic: TOPIC, msg: "" })).toEqual({ ok: false, error: "invalid msg" });
  });

  it("rejects a msg whose wrapped payload exceeds the publish cap", () => {
    // Wrapped shape is {"m":"<msg>"} — 8 bytes of overhead for a plain ASCII msg.
    const fits = "x".repeat(MAX_SIGNAL_BYTES - 8);
    const tooBig = "x".repeat(MAX_SIGNAL_BYTES - 7);
    expect(parseSignalBody({ topic: TOPIC, msg: fits })).toMatchObject({ ok: true });
    expect(parseSignalBody({ topic: TOPIC, msg: tooBig })).toEqual({ ok: false, error: "payload too large" });
  });
});

describe("unwrapSignalPayload", () => {
  it("extracts the wrapped msg string", () => {
    expect(unwrapSignalPayload({ m: "sig" })).toBe("sig");
  });

  it("returns null for anything else", () => {
    expect(unwrapSignalPayload(null)).toBeNull();
    expect(unwrapSignalPayload({})).toBeNull();
    expect(unwrapSignalPayload({ m: 7 })).toBeNull();
    expect(unwrapSignalPayload({ m: "" })).toBeNull();
    expect(unwrapSignalPayload("raw")).toBeNull();
  });
});
