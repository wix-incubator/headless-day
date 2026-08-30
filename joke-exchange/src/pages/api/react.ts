// POST /api/react — one reaction (😂/👍) per visitor per joke; bumps joke score.
import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { json, validVisitorId } from "../../lib/jokes";

export const prerender = false;

const REACTION_TYPES = ["laugh", "thumbsup"];

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }
  const { jokeId, visitorId, reactionType } = body ?? {};
  if (!validVisitorId(visitorId)) return json({ error: "Missing or invalid visitorId." }, 400);
  if (typeof jokeId !== "string" || !jokeId) return json({ error: "Missing jokeId." }, 400);
  if (!REACTION_TYPES.includes(reactionType)) return json({ error: "Unknown reaction type." }, 400);

  // One reaction per visitor per joke
  const { items: existing } = await items
    .query("Reactions")
    .eq("jokeId", jokeId)
    .eq("visitorId", visitorId)
    .limit(1)
    .find();
  if (existing.length > 0) return json({ error: "You already reacted to this one." }, 409);

  const { items: jokes } = await items.query("Jokes").eq("_id", jokeId).limit(1).find();
  if (jokes.length === 0) return json({ error: "Joke not found." }, 404);
  const joke: any = jokes[0];

  await items.insert("Reactions", { jokeId, visitorId, reactionType });
  // one laugh = one point (single-reaction UI; ★ shows the laugh count)
  await items.update("Jokes", {
    ...joke,
    score: (joke.score ?? 0) + 1,
    reactionCount: (joke.reactionCount ?? 0) + 1,
  });

  return json({ ok: true, score: (joke.score ?? 0) + 1 });
};
