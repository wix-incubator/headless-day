// POST /api/flag — one flag per visitor per joke; auto-hide at threshold.
import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { FLAG_HIDE_THRESHOLD, json, validVisitorId } from "../../lib/jokes";

export const prerender = false;

const REASONS = ["offensive", "not-a-joke", "duplicate", "spam"];
const MAX_FLAGS_PER_VISITOR_PER_HOUR = 10;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const { jokeId, visitorId, reason } = body ?? {};
  if (!validVisitorId(visitorId)) return json({ error: "Missing or invalid visitorId." }, 400);
  if (typeof jokeId !== "string" || !jokeId) return json({ error: "Missing jokeId." }, 400);
  if (!REASONS.includes(reason)) return json({ error: "Unknown flag reason." }, 400);

  // One flag per visitor per joke
  const { items: existing } = await items
    .query("Flags")
    .eq("jokeId", jokeId)
    .eq("visitorId", visitorId)
    .limit(1)
    .find();
  if (existing.length > 0) return json({ error: "You already flagged this joke." }, 409);

  // Rate limit flags per visitor
  const hourAgo = new Date(Date.now() - 3600_000);
  const { items: recentFlags } = await items
    .query("Flags")
    .eq("visitorId", visitorId)
    .gt("_createdDate", hourAgo)
    .limit(MAX_FLAGS_PER_VISITOR_PER_HOUR + 1)
    .find();
  if (recentFlags.length >= MAX_FLAGS_PER_VISITOR_PER_HOUR)
    return json({ error: "Flagging limit reached — take a breather." }, 429);

  const { items: jokes } = await items.query("Jokes").eq("_id", jokeId).limit(1).find();
  if (jokes.length === 0) return json({ error: "Joke not found." }, 404);
  const joke: any = jokes[0];

  await items.insert("Flags", { jokeId, visitorId, reason });
  const newCount = (joke.flagCount ?? 0) + 1;
  // Trust tiers: registered (logged-in) authors need 3 flags; unregistered authors hide on the 1st.
  const threshold = joke.authorMemberId ? FLAG_HIDE_THRESHOLD : 1;
  await items.update("Jokes", {
    ...joke,
    flagCount: newCount,
    // Auto-hide: drops it from the pool + leaderboards. Admin can restore in the Content Manager.
    status: newCount >= threshold ? "hidden" : joke.status,
  });

  return json({ ok: true, hidden: newCount >= threshold });
};
