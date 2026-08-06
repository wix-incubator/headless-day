import { describe, expect, it } from "vitest";
import { resolveGameAvatar } from "./gameAvatar";

describe("resolveGameAvatar (per-game → global → none)", () => {
  it("prefers the per-game avatar when present", () => {
    expect(resolveGameAvatar("https://cdn/game.png", "https://cdn/global.png")).toBe("https://cdn/game.png");
  });

  it("falls back to the global avatar when there is no per-game override", () => {
    expect(resolveGameAvatar(null, "https://cdn/global.png")).toBe("https://cdn/global.png");
    expect(resolveGameAvatar(undefined, "https://cdn/global.png")).toBe("https://cdn/global.png");
  });

  it("keeps the illustrated fighter when the game avatar is explicitly disabled", () => {
    expect(resolveGameAvatar(null, "https://cdn/global.png", true)).toBeNull();
    expect(resolveGameAvatar("https://cdn/game.png", "https://cdn/global.png", true)).toBeNull();
  });

  it("returns null when neither is set (caller keeps the fighter artwork)", () => {
    expect(resolveGameAvatar(null, null)).toBeNull();
    expect(resolveGameAvatar(undefined, undefined)).toBeNull();
  });

  it("treats empty/whitespace strings as absent", () => {
    expect(resolveGameAvatar("", "https://cdn/global.png")).toBe("https://cdn/global.png");
    expect(resolveGameAvatar("   ", "https://cdn/global.png")).toBe("https://cdn/global.png");
    expect(resolveGameAvatar("", "")).toBeNull();
  });
});
