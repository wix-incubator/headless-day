/**
 * Pure squid-highscore logic shared by the API routes (validation/merge) and the
 * React UI (formatting). Persistence model: ONE document per stage holding the
 * top-10 as JSON — O(1) elevated get/save, no Wix Data queries needed.
 */

import { MAX_SCORE_MS, MIN_SCORE_MS } from "../../game/squid/constants";
import { STAGES } from "../../game/squid/stage";
import type { StageId } from "../../game/squid/stage";

export interface ScoreEntry {
  timeMs: number;
  /** Comma-joined roster, e.g. "Kyrylo, Dana". */
  names: string;
  /** ISO timestamp (server clock — never enters the sim). */
  at: string;
}

export const TOP_CAP = 10;
const MAX_NAME_LEN = 24;
const MAX_TEAM = 8;

/** Insert an entry keeping the list sorted ascending by time, capped at `cap`. */
export function mergeTopScores(top: ScoreEntry[], entry: ScoreEntry, cap = TOP_CAP): ScoreEntry[] {
  return [...top, entry].sort((a, b) => a.timeMs - b.timeMs).slice(0, cap);
}

export interface SquidResult {
  stageId: StageId;
  timeMs: number;
  names: string;
}

/** Server-side trust boundary for POST /api/squid-result bodies. Null = reject. */
export function validateSquidResult(raw: unknown): SquidResult | null {
  const r = (raw ?? {}) as { stageId?: unknown; timeMs?: unknown; playerNames?: unknown };
  if (!STAGES.some((s) => s.id === r.stageId)) return null;
  const t = r.timeMs;
  if (typeof t !== "number" || !Number.isInteger(t) || t < MIN_SCORE_MS || t > MAX_SCORE_MS) return null;
  if (!Array.isArray(r.playerNames) || r.playerNames.length < 1 || r.playerNames.length > MAX_TEAM) return null;
  const names: string[] = [];
  for (const n of r.playerNames) {
    if (typeof n !== "string") return null;
    const trimmed = n.trim();
    if (trimmed.length < 1 || trimmed.length > MAX_NAME_LEN) return null;
    names.push(trimmed);
  }
  return { stageId: r.stageId as StageId, timeMs: t, names: names.join(", ") };
}

/** Deterministic GameScores row id per stage (playerAvatars pattern). */
export function scoreRowId(stageId: StageId): string {
  return `squid-${stageId}`;
}

/** Parse a stored topJson value, dropping malformed entries. */
export function parseTopJson(raw: unknown): ScoreEntry[] {
  if (typeof raw !== "string") return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (s): s is ScoreEntry =>
        !!s && typeof s.timeMs === "number" && typeof s.names === "string" && typeof s.at === "string",
    );
  } catch {
    return [];
  }
}

/** 42_350 → "0:42.3" (minutes:seconds.tenths). */
export function formatTimeMs(ms: number): string {
  const totalS = ms / 1000;
  const m = Math.floor(totalS / 60);
  const s = totalS - m * 60;
  const whole = Math.floor(s);
  const tenth = Math.floor((s - whole) * 10);
  return `${m}:${String(whole).padStart(2, "0")}.${tenth}`;
}
