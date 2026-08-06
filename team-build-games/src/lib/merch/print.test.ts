import { describe, expect, it } from "vitest";
import { buildShopUrl, DEFAULT_PAYLOAD, sanitizePayload, SUB_MAX, TITLE_MAX } from "./print";

describe("sanitizePayload", () => {
  it("uppercases and keeps allowed characters", () => {
    expect(sanitizePayload({ title: "Arena Champion!", sub: "3 KO · Jul 9 2026" })).toEqual({
      title: "ARENA CHAMPION!",
      sub: "3 KO · JUL 9 2026",
    });
  });

  it("strips disallowed characters and collapses whitespace", () => {
    expect(sanitizePayload({ title: "<b>win</b>", sub: "a\n\t  b" })).toEqual({
      title: "BWINB",
      sub: "A B",
    });
  });

  it("clamps to the print area", () => {
    const long = "X".repeat(100);
    const out = sanitizePayload({ title: long, sub: long });
    expect(out.title).toHaveLength(TITLE_MAX);
    expect(out.sub).toHaveLength(SUB_MAX);
  });

  it("falls back to defaults when empty or fully stripped", () => {
    expect(sanitizePayload({})).toEqual(DEFAULT_PAYLOAD);
    expect(sanitizePayload({ title: "@@@", sub: "" })).toEqual(DEFAULT_PAYLOAD);
  });

  it("masks blocklisted words (they go on office walls)", () => {
    expect(sanitizePayload({ title: "holy shit" }).title).toBe("HOLY ****");
  });
});

describe("buildShopUrl", () => {
  it("carries the payload as query params", () => {
    const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" });
    expect(url).toBe("/shop/tee?title=CHAMPION&sub=JUL+9");
  });
});

describe("buildShopUrl visual params", () => {
  it("includes warrior and avatar query params when visual is provided", () => {
    const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" }, {
      warriorSrc: "/assets/arena/warriors/swordsman.png",
      avatarUrl: "https://cdn.example.com/avatar.jpg",
    });
    expect(url).toContain("warrior=");
    expect(url).toContain("avatar=");
    expect(url).toContain("swordsman");
    expect(url).toContain("cdn.example.com");
  });

  it("omits warrior and avatar params when visual is not provided", () => {
    const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" });
    expect(url).not.toContain("warrior");
    expect(url).not.toContain("avatar");
  });
});

import { matchResultPayload } from "./print";

describe("matchResultPayload", () => {
  const BASE = {
    winnerId: null,
    winnerName: null,
    loserNames: [],
    localHits: 5,
    localDistanceM: 80.4,
    date: "JUL 9 2026",
  };

  it("produces ARENA CHAMPION title when you won", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: ["Alice", "Bob"] });
    expect(out.title).toBe("ARENA CHAMPION");
  });

  it("lists up to 2 defeated opponents in the sub line when you won", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: ["Alice", "Bob", "Carol"] });
    expect(out.sub).toContain("I BEAT ALICE & BOB");
    expect(out.sub).not.toContain("CAROL");
  });

  it("produces ELIMINATED WITH HONOR and lost-to line when you lost", () => {
    const out = matchResultPayload({ ...BASE, youWon: false, winnerId: "x", winnerName: "Alice" });
    expect(out.title).toBe("ELIMINATED WITH HONOR");
    expect(out.sub).toContain("LOST TO ALICE");
  });

  it("produces MUTUAL DESTRUCTION on a draw", () => {
    const out = matchResultPayload({ ...BASE, youWon: false });
    expect(out.title).toBe("MUTUAL DESTRUCTION");
  });

  it("includes hit count and rounded distance in sub", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, localHits: 7, localDistanceM: 123.9 });
    expect(out.sub).toContain("7 HITS");
    expect(out.sub).toContain("124M");
  });

  it("includes the date when draw (no winner line to use)", () => {
    const out = matchResultPayload({ ...BASE, youWon: false });
    expect(out.sub).toContain("JUL 9 2026");
  });

  it("output respects SUB_MAX length", () => {
    const longName = "A".repeat(30);
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: [longName, longName] });
    expect(out.sub.length).toBeLessThanOrEqual(SUB_MAX);
  });

  it("falls back to stat line when winner has no name", () => {
    const out = matchResultPayload({ ...BASE, youWon: false, winnerId: "x", winnerName: null });
    expect(out.title).toBe("ELIMINATED WITH HONOR");
    expect(out.sub).toContain("HITS");
  });

  it("falls back to stat line when winner won but loserNames is empty", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: [] });
    expect(out.title).toBe("ARENA CHAMPION");
    expect(out.sub).toContain("HITS");
  });
});
