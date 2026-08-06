import { describe, expect, it } from "vitest";
import { analyzeSeqs, summarizeLatencies } from "./stats";

describe("summarizeLatencies", () => {
  it("returns null for an empty sample", () => {
    expect(summarizeLatencies([])).toBeNull();
  });

  it("collapses a single value onto every field", () => {
    expect(summarizeLatencies([10])).toEqual({
      count: 1,
      min: 10,
      max: 10,
      mean: 10,
      p50: 10,
      p95: 10,
      p99: 10,
    });
  });

  it("computes nearest-rank percentiles over 1..100", () => {
    const values = Array.from({ length: 100 }, (_, i) => i + 1);
    // shuffle deterministically to prove sorting happens inside
    const shuffled = [...values.filter((v) => v % 2 === 0), ...values.filter((v) => v % 2 === 1)];
    expect(summarizeLatencies(shuffled)).toEqual({
      count: 100,
      min: 1,
      max: 100,
      mean: 50.5,
      p50: 50,
      p95: 95,
      p99: 99,
    });
  });

  it("does not mutate its input", () => {
    const values = [3, 1, 2];
    summarizeLatencies(values);
    expect(values).toEqual([3, 1, 2]);
  });
});

describe("analyzeSeqs", () => {
  it("reports zeros for no events", () => {
    expect(analyzeSeqs([])).toEqual({
      received: 0,
      unique: 0,
      expected: 0,
      dropped: 0,
      dropPct: 0,
      reorders: 0,
      dupes: 0,
    });
  });

  it("sees a clean in-order run as lossless", () => {
    expect(analyzeSeqs([0, 1, 2, 3])).toEqual({
      received: 4,
      unique: 4,
      expected: 4,
      dropped: 0,
      dropPct: 0,
      reorders: 0,
      dupes: 0,
    });
  });

  it("counts a gap as a drop against maxSeq+1", () => {
    expect(analyzeSeqs([0, 2, 3])).toEqual({
      received: 3,
      unique: 3,
      expected: 4,
      dropped: 1,
      dropPct: 25,
      reorders: 0,
      dupes: 0,
    });
  });

  it("counts arrivals below the running max as reorders, not drops", () => {
    expect(analyzeSeqs([0, 2, 1, 3])).toEqual({
      received: 4,
      unique: 4,
      expected: 4,
      dropped: 0,
      dropPct: 0,
      reorders: 1,
      dupes: 0,
    });
  });

  it("separates duplicates from drops", () => {
    expect(analyzeSeqs([0, 1, 1, 2])).toEqual({
      received: 4,
      unique: 3,
      expected: 3,
      dropped: 0,
      dropPct: 0,
      reorders: 0,
      dupes: 1,
    });
  });
});
