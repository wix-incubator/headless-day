// Client-side API glue + visitor identity for joke-exchange.

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

export const CONTENT_FLAGS = [
  { key: "dark", label: "Dark humor" },
  { key: "sexual/nsfw", label: "Sexual / NSFW" },
  { key: "religious", label: "Religious" },
  { key: "political", label: "Political" },
  { key: "explicit-language", label: "Explicit language" },
] as const;

export interface RewardJoke {
  id: string;
  text: string;
  category: string;
  contentFlags: string[];
  authorHandle: string;
  score: number;
}

export interface SubmitResult {
  submittedId: string;
  joke: RewardJoke | null;
  notice?: string;
}

const LS = {
  visitorId: "jx.visitorId",
  ack: "jx.contentWarningAck",
  avoidCategories: "jx.avoidCategories",
  avoidFlags: "jx.avoidFlags",
  reacted: "jx.reacted",
};

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private mode — session-only */
  }
}

export function getVisitorId(): string {
  let id = safeGet(LS.visitorId);
  if (!id) {
    id = crypto.randomUUID();
    safeSet(LS.visitorId, id);
  }
  return id;
}

export const warningAcked = () => safeGet(LS.ack) === "1";
export const ackWarning = () => safeSet(LS.ack, "1");

export const loadAvoid = (): { categories: string[]; flags: string[] } => ({
  categories: JSON.parse(safeGet(LS.avoidCategories) ?? "[]"),
  flags: JSON.parse(safeGet(LS.avoidFlags) ?? "[]"),
});
export const saveAvoid = (categories: string[], flags: string[]) => {
  safeSet(LS.avoidCategories, JSON.stringify(categories));
  safeSet(LS.avoidFlags, JSON.stringify(flags));
};

export interface Me {
  id: string;
  handle: string;
}

export const fetchMe = async (): Promise<Me | null> => {
  const res = await fetch("/api/me");
  if (!res.ok) return null;
  return (await res.json()).member ?? null;
};

export const hasReacted = (jokeId: string) => (safeGet(LS.reacted) ?? "").split(",").includes(jokeId);
export const markReacted = (jokeId: string) =>
  safeSet(LS.reacted, [...(safeGet(LS.reacted) ?? "").split(",").filter(Boolean), jokeId].slice(-500).join(","));

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export function submitJoke(input: {
  text: string;
  avoidCategories: string[];
  avoidFlags: string[];
}): Promise<SubmitResult> {
  return call("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, visitorId: getVisitorId() }),
  });
}

export function react(jokeId: string, reactionType: "laugh" | "thumbsup") {
  return call<{ ok: true; score: number }>("/api/react", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jokeId, reactionType, visitorId: getVisitorId() }),
  });
}

export function flag(jokeId: string, reason: string) {
  return call<{ ok: true; hidden: boolean }>("/api/flag", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jokeId, reason, visitorId: getVisitorId() }),
  });
}

export interface LeaderboardData {
  period: "week" | "all";
  offset: number;
  topJokes: (RewardJoke & { reactions: number })[];
  hasMore: boolean;
  topComedians: { handle: string; score: number; jokes: number }[];
}

export const fetchLeaderboard = (period: "week" | "all", offset = 0) =>
  call<LeaderboardData>(`/api/leaderboard?period=${period}&offset=${offset}`);

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}
