import { describe, expect, it } from "vitest";
import { formatTimeMs, mergeTopScores, parseTopJson, scoreRowId, validateSquidResult } from "./scores";
import type { ScoreEntry } from "./scores";

const e = (timeMs: number, names = "A"): ScoreEntry => ({ timeMs, names, at: "2026-07-09T00:00:00.000Z" });

describe("mergeTopScores", () => {
  it("inserts sorted ascending by time and caps the list", () => {
    let top: ScoreEntry[] = [];
    for (const t of [50_000, 30_000, 40_000]) top = mergeTopScores(top, e(t));
    expect(top.map((s) => s.timeMs)).toEqual([30_000, 40_000, 50_000]);
    for (let i = 0; i < 12; i++) top = mergeTopScores(top, e(10_000 + i));
    expect(top).toHaveLength(10);
    expect(top[0]!.timeMs).toBe(10_000);
    expect(top[9]!.timeMs).toBe(10_009);
  });
});

describe("validateSquidResult", () => {
  const ok = { stageId: "stage1", timeMs: 42_000, playerNames: ["Ann", "Bo"] };

  it("accepts a valid result and joins names", () => {
    expect(validateSquidResult(ok)).toEqual({ stageId: "stage1", timeMs: 42_000, names: "Ann, Bo" });
  });

  it("rejects unknown stages, out-of-bounds times, and bad name lists", () => {
    expect(validateSquidResult({ ...ok, stageId: "stage9" })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 2_999 })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 1_800_001 })).toBeNull();
    expect(validateSquidResult({ ...ok, timeMs: 42.5 })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: [] })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: Array(9).fill("x") })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: ["ok", ""] })).toBeNull();
    expect(validateSquidResult({ ...ok, playerNames: ["x".repeat(25)] })).toBeNull();
    expect(validateSquidResult(null)).toBeNull();
  });

  it("trims names", () => {
    expect(validateSquidResult({ ...ok, playerNames: [" Ann "] })?.names).toBe("Ann");
  });
});

describe("parseTopJson / scoreRowId / formatTimeMs", () => {
  it("parses only well-formed entries and tolerates garbage", () => {
    expect(parseTopJson(JSON.stringify([e(1000), { bad: true }, e(2000)])).map((s) => s.timeMs)).toEqual([1000, 2000]);
    expect(parseTopJson("not json")).toEqual([]);
    expect(parseTopJson(undefined)).toEqual([]);
  });

  it("builds deterministic row ids", () => {
    expect(scoreRowId("stage2")).toBe("squid-stage2");
  });

  it("formats m:ss.t", () => {
    expect(formatTimeMs(42_350)).toBe("0:42.3");
    expect(formatTimeMs(83_040)).toBe("1:23.0");
  });
});
