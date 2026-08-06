import { describe, expect, it } from "vitest";
import { encode as encodeLobby, PROTOCOL_VERSION } from "../../net/protocol";
import { coerceDriveIntent } from "../intent";
import type { RoadRules } from "../types";
import {
  decodeRoadMessage,
  encodeRoadMessage,
  type RoadNetMessage,
} from "./protocol";

const RULES: RoadRules = {
  nitroEnabled: true,
  bestOf: 3,
  botDifficulty: "mad",
};

describe("Road Madness wire protocol", () => {
  it("round-trips every namespaced message family", () => {
    const messages: RoadNetMessage[] = [
      {
        t: "rHello",
        name: "Torque",
        vehicle: "monster",
        colorIndex: 2,
        hostId: "host",
      },
      {
        t: "rStart",
        countdownMs: 3000,
        seed: 42,
        mode: "last-madman",
        mapId: "the-pit",
        rules: RULES,
        players: [
          {
            id: "host",
            name: "Torque",
            vehicle: "monster",
            colorIndex: 2,
            isBot: false,
          },
        ],
      },
      {
        t: "rInput",
        tick: 12,
        intent: { throttle: 1, steer: -0.5, handbrake: false, boost: true },
      },
      { t: "rSnap", w: { t: 12, c: [] } },
      { t: "rDelta", d: { b: 12, t: 15, c: [] } },
      {
        t: "rEvent",
        tick: 15,
        event: { kind: "round-ended", winnerId: "host", reason: "last-alive" },
      },
    ];

    for (const message of messages) {
      expect(decodeRoadMessage(encodeRoadMessage(message))).toEqual(message);
    }
  });

  it("ignores garbage, other games, version mismatches, and invented road tags", () => {
    expect(decodeRoadMessage("not json")).toBeNull();
    expect(decodeRoadMessage(encodeLobby({ t: "kick", targetId: "host" }))).toBeNull();
    expect(
      decodeRoadMessage(JSON.stringify({ v: 999, m: { t: "rInput" } })),
    ).toBeNull();
    expect(
      decodeRoadMessage(
        JSON.stringify({
          v: PROTOCOL_VERSION,
          m: { t: "rGrantHealth", health: 9999 },
        }),
      ),
    ).toBeNull();
  });

  it("keeps remote peers at the intent-only trust boundary", () => {
    const decoded = decodeRoadMessage(
      encodeRoadMessage({
        t: "rInput",
        tick: 20,
        intent: {
          throttle: 999,
          steer: Number.NEGATIVE_INFINITY,
          handbrake: "yes",
          boost: true,
          pos: { x: 999, y: 999 },
          health: 9999,
        },
      }),
    );
    expect(decoded?.t).toBe("rInput");
    if (decoded?.t !== "rInput") throw new Error("expected rInput");
    expect(coerceDriveIntent(decoded.intent)).toEqual({
      throttle: 1,
      steer: 0,
      handbrake: false,
      boost: true,
    });
  });
});
