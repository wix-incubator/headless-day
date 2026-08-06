import { describe, expect, it } from "vitest";
import { buildIceServers, iceConfigFromEnv } from "./ice";

describe("buildIceServers", () => {
  it("returns the default Google STUN server when nothing is configured", () => {
    expect(buildIceServers()).toEqual([{ urls: ["stun:stun.l.google.com:19302"] }]);
  });

  it("uses custom STUN urls when provided", () => {
    expect(buildIceServers({ stunUrls: ["stun:a:3478", "stun:b:3478"] })).toEqual([
      { urls: ["stun:a:3478", "stun:b:3478"] },
    ]);
  });

  it("appends a TURN entry (with creds) after STUN when TURN is configured", () => {
    const servers = buildIceServers({
      turn: { urls: ["turn:relay:80", "turns:relay:443"], username: "u", credential: "c" },
    });
    expect(servers).toEqual([
      { urls: ["stun:stun.l.google.com:19302"] },
      { urls: ["turn:relay:80", "turns:relay:443"], username: "u", credential: "c" },
    ]);
  });

  it("omits TURN when it is null", () => {
    expect(buildIceServers({ turn: null })).toEqual([{ urls: ["stun:stun.l.google.com:19302"] }]);
  });
});

describe("iceConfigFromEnv", () => {
  it("yields STUN-only (turn null) when no TURN env vars are set", () => {
    expect(iceConfigFromEnv({})).toEqual({ turn: null });
  });

  it("builds a TURN config from PUBLIC_TURN_URLS/USERNAME/CREDENTIAL, splitting comma-separated urls", () => {
    const cfg = iceConfigFromEnv({
      PUBLIC_TURN_URLS: "turn:relay:80, turns:relay:443",
      PUBLIC_TURN_USERNAME: "user",
      PUBLIC_TURN_CREDENTIAL: "pass",
    });
    expect(cfg).toEqual({ turn: { urls: ["turn:relay:80", "turns:relay:443"], username: "user", credential: "pass" } });
  });

  it("accepts a single PUBLIC_TURN_URL as an alias for PUBLIC_TURN_URLS", () => {
    const cfg = iceConfigFromEnv({
      PUBLIC_TURN_URL: "turn:relay:80",
      PUBLIC_TURN_USERNAME: "user",
      PUBLIC_TURN_CREDENTIAL: "pass",
    });
    expect(cfg.turn?.urls).toEqual(["turn:relay:80"]);
  });

  it("ignores a half-configured TURN (missing credential) rather than emitting a broken entry", () => {
    expect(iceConfigFromEnv({ PUBLIC_TURN_URL: "turn:relay:80", PUBLIC_TURN_USERNAME: "user" })).toEqual({ turn: null });
  });

  it("passes custom STUN urls through from PUBLIC_STUN_URLS", () => {
    expect(iceConfigFromEnv({ PUBLIC_STUN_URLS: "stun:a:3478 , stun:b:3478" })).toEqual({
      stunUrls: ["stun:a:3478", "stun:b:3478"],
      turn: null,
    });
  });
});
