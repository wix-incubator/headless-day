import { describe, expect, it } from "vitest";
import {
  aggregateRecv,
  aggregateSent,
  buildPayload,
  buildStagePlan,
  classifyError,
  parseConfig,
  type RecvEvent,
  type SentEvent,
} from "./runner";

describe("buildStagePlan", () => {
  it("maps hz list to numbered stages with expected send counts", () => {
    expect(buildStagePlan([5, 20], 30_000)).toEqual([
      { stage: 0, hz: 5, durMs: 30_000, expectedSends: 150 },
      { stage: 1, hz: 20, durMs: 30_000, expectedSends: 600 },
    ]);
  });

  it("returns an empty plan for no stages", () => {
    expect(buildStagePlan([], 30_000)).toEqual([]);
  });
});

describe("buildPayload", () => {
  it("pads the JSON encoding to exactly the target size", () => {
    for (const target of [256, 2048, 10_240, 102_400]) {
      const p = buildPayload({ room: "A", stage: 2, seq: 17, sentTs: 1_700_000_000_000, targetBytes: target });
      expect(JSON.stringify(p).length).toBe(target);
      expect(p).toMatchObject({ room: "A", stage: 2, seq: 17, sentTs: 1_700_000_000_000 });
    }
  });

  it("never pads below the natural size for tiny targets", () => {
    const p = buildPayload({ room: "A", stage: 0, seq: 0, sentTs: 1, targetBytes: 10 });
    expect(p.pad).toBe("");
  });
});

describe("classifyError", () => {
  it("maps 429 to throttle", () => {
    expect(classifyError(429)).toBe("throttle");
  });
  it("maps 413 and size messages to payload", () => {
    expect(classifyError(413)).toBe("payload");
    expect(classifyError(400, "Payload too large")).toBe("payload");
  });
  it("maps 401/403 to auth", () => {
    expect(classifyError(401)).toBe("auth");
    expect(classifyError(403)).toBe("auth");
  });
  it("maps a missing status to network", () => {
    expect(classifyError(null)).toBe("network");
  });
  it("maps anything else to other", () => {
    expect(classifyError(500)).toBe("other");
  });
});

describe("parseConfig", () => {
  it("applies defaults for an empty query", () => {
    expect(parseConfig("")).toEqual({
      role: "both",
      room: "A",
      stagesHz: [5],
      stageDurMs: 30_000,
      payloadBytes: 2048,
      auto: false,
    });
  });

  it("parses a full query string", () => {
    expect(parseConfig("?role=pub&room=B&stages=5,10,20&dur=15&size=4096&auto=1")).toEqual({
      role: "pub",
      room: "B",
      stagesHz: [5, 10, 20],
      stageDurMs: 15_000,
      payloadBytes: 4096,
      auto: true,
    });
  });

  it("falls back to defaults on junk values", () => {
    const cfg = parseConfig("?role=hacker&stages=x,y&dur=-3&size=nope");
    expect(cfg.role).toBe("both");
    expect(cfg.stagesHz).toEqual([5]);
    expect(cfg.stageDurMs).toBe(30_000);
    expect(cfg.payloadBytes).toBe(2048);
  });

  it("parses per-stage payload sizes for the probe scenario", () => {
    expect(parseConfig("?sizes=1024,10240,102400").sizesBytes).toEqual([1024, 10_240, 102_400]);
  });

  it("omits sizesBytes when the param is absent or junk", () => {
    expect(parseConfig("").sizesBytes).toBeUndefined();
    expect(parseConfig("?sizes=x,y").sizesBytes).toBeUndefined();
  });
});

describe("aggregateSent", () => {
  it("groups by room+stage with rtt/publish summaries and error classes", () => {
    const sent: SentEvent[] = [
      { room: "A", stage: 0, seq: 0, sentTs: 0, ok: true, status: 200, rttMs: 100, publishMs: 40 },
      { room: "A", stage: 0, seq: 1, sentTs: 50, ok: true, status: 200, rttMs: 120, publishMs: 60 },
      { room: "A", stage: 0, seq: 2, sentTs: 100, ok: false, status: 429 },
      { room: "A", stage: 1, seq: 0, sentTs: 200, ok: true, status: 200, rttMs: 80, publishMs: 30 },
    ];
    const reports = aggregateSent(sent);
    expect(reports).toHaveLength(2);
    const s0 = reports.find((r) => r.stage === 0)!;
    expect(s0.room).toBe("A");
    expect(s0.sent).toBe(3);
    expect(s0.ok).toBe(2);
    expect(s0.errors).toEqual({ throttle: 1 });
    expect(s0.rtt?.p50).toBe(100);
    expect(s0.publishMs?.max).toBe(60);
    const s1 = reports.find((r) => r.stage === 1)!;
    expect(s1.sent).toBe(1);
    expect(s1.errors).toEqual({});
  });

  it("returns empty for no events", () => {
    expect(aggregateSent([])).toEqual([]);
  });
});

describe("aggregateRecv", () => {
  it("groups by room+stage with seq analysis and latency summary", () => {
    const recv: RecvEvent[] = [
      { room: "A", stage: 0, seq: 0, sentTs: 1000, recvTs: 1200 },
      { room: "A", stage: 0, seq: 2, sentTs: 1100, recvTs: 1400 },
      { room: "B", stage: 0, seq: 0, sentTs: 1000, recvTs: 1100 },
    ];
    const reports = aggregateRecv(recv);
    expect(reports).toHaveLength(2);
    const a = reports.find((r) => r.room === "A")!;
    expect(a.expected).toBe(3);
    expect(a.dropped).toBe(1);
    expect(a.latency?.p50).toBe(200);
    expect(a.latency?.max).toBe(300);
    const b = reports.find((r) => r.room === "B")!;
    expect(b.latency?.p50).toBe(100);
  });
});
