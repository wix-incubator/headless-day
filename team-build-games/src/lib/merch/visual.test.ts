import { describe, expect, it } from "vitest";
import { BODY_ASSET } from "../../game/arena/cosmetic";
import { sanitizeVisual } from "./visual";

const KNOWN_WARRIOR = BODY_ASSET.circle;

describe("sanitizeVisual", () => {
  it("keeps a known warrior sprite path", () => {
    expect(sanitizeVisual({ warrior: KNOWN_WARRIOR }).warriorSrc).toBe(KNOWN_WARRIOR);
  });

  it("rejects an unknown/attacker-supplied warrior path", () => {
    expect(sanitizeVisual({ warrior: "/evil.png" }).warriorSrc).toBeUndefined();
    expect(sanitizeVisual({ warrior: "https://evil.com/x.png" }).warriorSrc).toBeUndefined();
  });

  it("keeps a first-party Wix CDN avatar URL", () => {
    const url = "https://static.wixstatic.com/media/abc~mv2.jpg";
    expect(sanitizeVisual({ avatar: url }).avatarUrl).toBe(url);
  });

  it("rejects avatar URLs from any other host", () => {
    expect(sanitizeVisual({ avatar: "https://evil.com/a.jpg" }).avatarUrl).toBeUndefined();
    expect(sanitizeVisual({ avatar: "http://static.wixstatic.com/a.jpg" }).avatarUrl).toBeUndefined();
    expect(sanitizeVisual({ avatar: "javascript:alert(1)" }).avatarUrl).toBeUndefined();
  });

  it("treats null/empty input as no visual", () => {
    expect(sanitizeVisual({})).toEqual({ warriorSrc: undefined, avatarUrl: undefined });
    expect(sanitizeVisual({ warrior: null, avatar: "" })).toEqual({
      warriorSrc: undefined,
      avatarUrl: undefined,
    });
  });
});
