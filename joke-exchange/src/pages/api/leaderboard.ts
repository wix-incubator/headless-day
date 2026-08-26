// GET /api/leaderboard?period=week|all&offset=0 — paged top jokes (infinite scroll)
// + top comedians (opt-in handles, first page only).
import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { json } from "../../lib/jokes";

export const prerender = false;

const PAGE = 20;

export const GET: APIRoute = async ({ url }) => {
  const period = url.searchParams.get("period") === "week" ? "week" : "all";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10) || 0);

  // Hall of Fame is for registered (logged-in) authors only — anonymous and seed
  // jokes still circulate in the game but don't rank.
  const { items: allJokes } = await items
    .query("Jokes")
    .eq("status", "approved")
    .descending("score")
    .limit(1000)
    .find();
  const jokes = (allJokes as any[]).filter((j) => j.authorMemberId);

  let scored: { joke: any; score: number; reactions: number }[];
  if (period === "week") {
    // Weekly score = laughs in the last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600_000);
    const { items: recent } = await items
      .query("Reactions")
      .gt("_createdDate", weekAgo)
      .limit(1000)
      .find();
    const byJoke = new Map<string, number>();
    for (const r of recent as any[]) byJoke.set(r.jokeId, (byJoke.get(r.jokeId) ?? 0) + 1);
    scored = (jokes as any[])
      .filter((j) => byJoke.has(j._id))
      .map((j) => ({ joke: j, score: byJoke.get(j._id)!, reactions: byJoke.get(j._id)! }));
  } else {
    scored = (jokes as any[]).map((j) => ({ joke: j, score: j.score ?? 0, reactions: j.reactionCount ?? 0 }));
  }

  scored.sort((a, b) => b.score - a.score);

  const page = scored.slice(offset, offset + PAGE).map(({ joke, score, reactions }) => ({
    id: joke._id,
    text: joke.text,
    category: joke.category,
    contentFlags: joke.contentFlags ?? (joke.dark ? ["dark"] : []),
    authorHandle: joke.authorHandle || "Anonymous comedian",
    score,
    reactions,
  }));

  // Top comedians only on the first page — the list header is static while jokes scroll
  let topComedians: { handle: string; score: number; jokes: number }[] = [];
  if (offset === 0) {
    const byAuthor = new Map<string, { handle: string; score: number; jokes: number }>();
    for (const { joke, score } of scored) {
      const handle = (joke.authorHandle || "").trim();
      if (!handle || joke.authorVisitorId === "seed") continue;
      const cur = byAuthor.get(handle) ?? { handle, score: 0, jokes: 0 };
      cur.score += score;
      cur.jokes += 1;
      byAuthor.set(handle, cur);
    }
    topComedians = [...byAuthor.values()].sort((a, b) => b.score - a.score).slice(0, 10);
  }

  return json({
    period,
    offset,
    topJokes: page,
    hasMore: offset + PAGE < scored.length,
    topComedians,
  });
};
