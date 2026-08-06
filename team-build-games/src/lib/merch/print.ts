/**
 * Print payload for score merch (pure). The title/subtitle travel from the
 * game-over screen through the shop as query params, so everything is
 * sanitized here: uppercase, charset-restricted, length-clamped, and passed
 * through a small profanity filter (player names end up on shirts).
 */

export interface PrintPayload {
  title: string;
  sub: string;
}

export const TITLE_MAX = 24;
export const SUB_MAX = 36;

export const DEFAULT_PAYLOAD: PrintPayload = {
  title: "TEAMBUILD GAMES",
  sub: "THE OFFICE ARCADE",
};

// The pixel font ships uppercase Latin + digits + basic punctuation only.
const ALLOWED = /[^A-Z0-9 .·:#!?'&+-]/g;

// Light internal blocklist — this is an office wall, not the open internet.
const BLOCKLIST = ["FUCK", "SHIT", "CUNT", "BITCH", "ASSHOLE", "DICK", "NAZI"];

function clean(raw: string, max: number): string {
  let text = raw.toUpperCase().replace(ALLOWED, "").replace(/\s+/g, " ").trim();
  for (const word of BLOCKLIST) {
    if (text.includes(word)) {
      text = text.replaceAll(word, "*".repeat(word.length));
    }
  }
  return text.slice(0, max).trim();
}

/** Sanitize a raw (query-param) payload; empty results fall back to defaults. */
export function sanitizePayload(raw: { title?: string; sub?: string }): PrintPayload {
  const title = clean(raw.title ?? "", TITLE_MAX);
  const sub = clean(raw.sub ?? "", SUB_MAX);
  return {
    title: title || DEFAULT_PAYLOAD.title,
    sub: sub || DEFAULT_PAYLOAD.sub,
  };
}

/** Build the shop URL that carries a payload (and optional visual) into the merch funnel. */
export function buildShopUrl(
  product: string,
  payload: PrintPayload,
  visual?: { warriorSrc?: string | null; avatarUrl?: string | null },
): string {
  const params = new URLSearchParams({ title: payload.title, sub: payload.sub });
  if (visual?.warriorSrc) params.set("warrior", visual.warriorSrc);
  if (visual?.avatarUrl) params.set("avatar", visual.avatarUrl);
  return `/shop/${product}?${params.toString()}`;
}

export interface MatchResultOptions {
  youWon: boolean;
  /** null when draw */
  winnerId: string | null;
  /** display name of winner; null when draw */
  winnerName: string | null;
  /** display names of non-winners in standings order */
  loserNames: string[];
  localHits: number;
  localDistanceM: number;
  /** pre-formatted date, e.g. "JUL 9 2026" */
  date: string;
}

/**
 * Build a personalized PrintPayload from a match outcome.
 * Text is sanitized (uppercase, charset-restricted, length-clamped) via sanitizePayload.
 */
export function matchResultPayload(opts: MatchResultOptions): PrintPayload {
  const { youWon, winnerId, winnerName, loserNames, localHits, localDistanceM, date } = opts;
  const statPart = `${localHits} HITS · ${Math.round(localDistanceM)}M`;

  let rawTitle: string;
  let rawSub: string;

  if (youWon) {
    rawTitle = "ARENA CHAMPION";
    const beaten = loserNames.slice(0, 2).join(" & ");
    rawSub = beaten ? `I BEAT ${beaten} · ${statPart}` : statPart;
  } else if (winnerId) {
    rawTitle = "ELIMINATED WITH HONOR";
    rawSub = winnerName ? `LOST TO ${winnerName} · ${statPart}` : statPart;
  } else {
    rawTitle = "MUTUAL DESTRUCTION";
    rawSub = `${statPart} · ${date}`;
  }

  return sanitizePayload({ title: rawTitle, sub: rawSub });
}
