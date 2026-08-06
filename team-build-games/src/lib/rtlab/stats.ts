/**
 * Pure statistics for the Realtime Lab (see docs/superpowers/specs/2026-07-16-realtime-lab-design.md).
 */

export interface LatencySummary {
  count: number;
  min: number;
  max: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
}

export interface SeqReport {
  /** Raw event count (includes duplicates). */
  received: number;
  /** Distinct sequence numbers seen. */
  unique: number;
  /** maxSeq + 1 — what a lossless run would have delivered. */
  expected: number;
  dropped: number;
  dropPct: number;
  /** Arrivals below the running max (late/out-of-order deliveries). */
  reorders: number;
  dupes: number;
}

/** Nearest-rank percentile summary; null for an empty sample. Never mutates the input. */
export function summarizeLatencies(values: number[]): LatencySummary | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p: number) => sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)]!;
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean: sum / sorted.length,
    p50: rank(50),
    p95: rank(95),
    p99: rank(99),
  };
}

/** Loss/ordering analysis over sequence numbers in ARRIVAL order (seqs start at 0). */
export function analyzeSeqs(seqs: number[]): SeqReport {
  const seen = new Set<number>();
  let reorders = 0;
  let runningMax = -1;
  for (const s of seqs) {
    if (s < runningMax) reorders++;
    runningMax = Math.max(runningMax, s);
    seen.add(s);
  }
  const received = seqs.length;
  const unique = seen.size;
  const expected = received === 0 ? 0 : runningMax + 1;
  const dropped = Math.max(0, expected - unique);
  return {
    received,
    unique,
    expected,
    dropped,
    dropPct: expected === 0 ? 0 : (dropped / expected) * 100,
    reorders,
    dupes: received - unique,
  };
}
