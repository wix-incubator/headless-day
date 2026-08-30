// Shared domain logic for joke-exchange (Phase 0 — no AI moderation).
import { items } from "@wix/data";

export const CATEGORIES = [
  "wordplay/puns",
  "observational",
  "dad-jokes",
  "dark-humor",
  "absurd/surreal",
  "self-deprecating",
  "tech/nerd",
  "animals",
  "knock-knock",
  "one-liners",
  "story/anecdote",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Content flags — the avoidable-sensitivity axis (JokeAPI-style blacklist flags).
// Hate targeting protected groups, illegal content etc. are HARD-BLOCKED (not a filter).
export const CONTENT_FLAGS = [
  "dark",
  "sexual/nsfw",
  "religious",
  "political",
  "explicit-language",
] as const;
export type ContentFlag = (typeof CONTENT_FLAGS)[number];

export const MIN_LENGTH = 10;
export const MAX_LENGTH = 600;
export const SUBMIT_COOLDOWN_MS = 20_000; // min gap between submissions per visitor
export const FLAG_HIDE_THRESHOLD = 3;

export interface JokeItem {
  _id: string;
  _createdDate?: string | Date;
  text: string;
  category: string;
  dark: boolean; // legacy convenience mirror of contentFlags.includes('dark')
  contentFlags: string[];
  textHash: string;
  authorVisitorId: string;
  authorMemberId?: string;
  authorHandle?: string;
  score: number;
  reactionCount: number;
  flagCount: number;
  status: string;
  moderationTag?: string;
}

/** Normalize text so trivial punctuation/case edits don't dodge dedup. */
export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** sha256 hex of normalized text (Web Crypto — works on the Cloudflare-style runtime). */
export async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeText(text));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export interface PreFilterResult {
  ok: boolean;
  reason?: string;
}

/** Cheap synchronous pre-filters — no LLM (Phase 0). */
export function preFilter(text: string): PreFilterResult {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH) return { ok: false, reason: `That's a bit short for a joke — give it at least ${MIN_LENGTH} characters.` };
  if (trimmed.length > MAX_LENGTH) return { ok: false, reason: `Save some material for the encore — max ${MAX_LENGTH} characters.` };
  // At least a few distinct words, some letters
  const words = normalizeText(trimmed).split(" ").filter(Boolean);
  if (words.length < 3) return { ok: false, reason: "A joke usually needs more than a couple of words." };
  if (!/\p{L}{2}/u.test(trimmed)) return { ok: false, reason: "That doesn't look like readable text." };
  // Garbage: one character repeated to fill the space
  const uniqueChars = new Set(normalizeText(trimmed).replace(/ /g, "")).size;
  if (uniqueChars < 5) return { ok: false, reason: "Keyboard mashing is only funny the first time. It was never funny." };
  return { ok: true };
}

/** Pick a reward joke. Never the visitor's own (by visitor id AND member id when logged in),
 *  prefer unseen, honor avoid-lists, weight by score. */
export async function pickRewardJoke(
  visitorId: string,
  avoidCategories: string[],
  avoidFlags: string[],
  memberId?: string,
): Promise<{ joke: JokeItem | null; relaxedSeen: boolean; relaxedAvoid: boolean }> {
  const [{ items: pool }, { items: seenRows }] = await Promise.all([
    items
      .query("Jokes")
      .eq("status", "approved")
      .ne("authorVisitorId", visitorId)
      .descending("score")
      .limit(1000)
      .find(),
    items.query("Seen").eq("visitorId", visitorId).limit(1000).find(),
  ]);
  const seen = new Set(seenRows.map((s: any) => s.jokeId));
  const avoidCatSet = new Set(avoidCategories);
  const avoidFlagSet = new Set(avoidFlags);

  // exclude own jokes across devices: the query filtered by visitorId; also drop
  // anything authored under the caller's member identity
  const all = (pool as unknown as JokeItem[]).filter((j) => !memberId || j.authorMemberId !== memberId);
  const notAvoided = all.filter(
    (j) => !avoidCatSet.has(j.category) && !(j.contentFlags ?? []).some((f) => avoidFlagSet.has(f)),
  );
  const unseen = notAvoided.filter((j) => !seen.has(j._id));

  let candidates = unseen;
  let relaxedSeen = false;
  let relaxedAvoid = false;
  if (candidates.length === 0) {
    candidates = notAvoided; // relax "unseen"
    relaxedSeen = candidates.length > 0;
  }
  if (candidates.length === 0) {
    candidates = all.filter((j) => !seen.has(j._id)); // relax avoid-list, keep unseen
    relaxedAvoid = candidates.length > 0;
  }
  if (candidates.length === 0) {
    candidates = all; // last resort: anything not their own
    relaxedSeen = relaxedAvoid = candidates.length > 0;
  }
  if (candidates.length === 0) return { joke: null, relaxedSeen: false, relaxedAvoid: false };

  // Trust tiers: jokes by registered (logged-in) authors are preferred at every stage;
  // unregistered-author jokes only surface when no registered-author joke is available.
  const registered = candidates.filter((j) => j.authorMemberId);
  if (registered.length > 0) candidates = registered;

  // Weighted random pick: weight = 1 + max(score, 0), so rated jokes surface more but everything can appear.
  const weights = candidates.map((j) => 1 + Math.max(j.score ?? 0, 0));
  let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
  let picked = candidates[0];
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i];
    if (roll <= 0) {
      picked = candidates[i];
      break;
    }
  }
  return { joke: picked, relaxedSeen, relaxedAvoid };
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const VISITOR_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;
export function validVisitorId(v: unknown): v is string {
  return typeof v === "string" && VISITOR_ID_RE.test(v);
}
