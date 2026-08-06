import { describe, expect, it } from "vitest";
import { buildJoinUrl, mintRoomId, parseRoomId } from "./roomLink";

describe("roomLink", () => {
  it("parses a valid room id and rejects junk", () => {
    expect(parseRoomId("?room=abcd1234")).toBe("abcd1234");
    expect(parseRoomId("?room=ab")).toBeNull(); // too short
    expect(parseRoomId("?room=Bad_Id!")).toBeNull();
    expect(parseRoomId("?foo=bar")).toBeNull();
  });

  it("builds a shareable join url", () => {
    expect(buildJoinUrl("https://x.com", "/games/arena", "room42")).toBe(
      "https://x.com/games/arena?room=room42",
    );
  });

  it("mints an 8-char id from the injected randomness", () => {
    expect(mintRoomId(() => 0)).toBe("aaaaaaaa");
    expect(mintRoomId(() => 0.999999)).toMatch(/^[a-z0-9]{8}$/);
  });
});
