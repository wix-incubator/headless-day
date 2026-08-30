// POST /api/submit — the give-to-get core loop (Phase 0: pre-filters only, auto-approve).
import type { APIRoute } from "astro";
import { items } from "@wix/data";
import {
  CATEGORIES,
  CONTENT_FLAGS,
  SUBMIT_COOLDOWN_MS,
  hashText,
  json,
  pickRewardJoke,
  preFilter,
  validVisitorId,
  type JokeItem,
} from "../../lib/jokes";
import { getMember } from "../../lib/member";
import { classifyJoke } from "../../lib/classify";
import { tryAiModerate } from "../../lib/aiModerate";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const { text, avoidCategories, avoidFlags, visitorId } = body ?? {};
  if (!validVisitorId(visitorId)) return json({ error: "Missing or invalid visitorId." }, 400);
  if (typeof text !== "string") return json({ error: "Missing joke text." }, 400);
  const avoidCats: string[] = Array.isArray(avoidCategories)
    ? avoidCategories.filter((c) => (CATEGORIES as readonly string[]).includes(c))
    : [];
  const avoidFl: string[] = Array.isArray(avoidFlags)
    ? avoidFlags.filter((f) => (CONTENT_FLAGS as readonly string[]).includes(f))
    : [];

  // Auto-classification — the submitter never categorizes.
  // Optional Prompt Hub gate (off by default) → keyword heuristics as the fallback.
  let category: string, flags: string[], moderatedBy: string;
  let fixedText = text.trim();
  const ai = await tryAiModerate(text.trim());
  if (ai) {
    if (ai.hardBlock) return json({ error: ai.blockReason || "This one can't go on stage." }, 422);
    if (!ai.isJoke) return json({ error: "The gate is pretty sure that's not a joke. Give it another shot." }, 422);
    ({ category, flags, moderatedBy } = ai);
    fixedText = ai.fixedText;
  } else {
    ({ category, flags } = classifyJoke(text));
    moderatedBy = "heuristics:v1";
  }

  // 1. Cheap pre-filters
  const filter = preFilter(text);
  if (!filter.ok) return json({ error: filter.reason }, 422);

  // 2. Rate limit: min gap between submissions per visitor
  const { items: recent } = await items
    .query("Jokes")
    .eq("authorVisitorId", visitorId)
    .descending("_createdDate")
    .limit(1)
    .find();
  if (recent.length > 0) {
    const last = new Date((recent[0] as any)._createdDate).getTime();
    const wait = SUBMIT_COOLDOWN_MS - (Date.now() - last);
    if (wait > 0) return json({ error: `Easy there, headliner — wait ${Math.ceil(wait / 1000)}s between jokes.` }, 429);
  }

  // 3. Exact-hash dedup
  const textHash = await hashText(text);
  const { items: dupes } = await items.query("Jokes").eq("textHash", textHash).limit(1).find();
  if (dupes.length > 0) return json({ error: "We've heard that one — it's already in the exchange." }, 409);

  // 4. Store (Phase 0: auto-approved; Phase 1 will hold as 'pending' for AI review)
  // Leaderboard identity comes from the logged-in member (server-resolved), never from the client.
  const member = await getMember();
  const inserted = (await items.insert("Jokes", {
    text: fixedText,
    category,
    dark: flags.includes("dark"),
    contentFlags: flags,
    textHash,
    authorVisitorId: visitorId,
    authorMemberId: member?.id ?? "",
    authorHandle: member?.handle ?? "",
    score: 0,
    reactionCount: 0,
    flagCount: 0,
    status: "approved",
    moderationTag: flags.length ? flags.join(",") : "none",
    moderatedBy,
  })) as unknown as JokeItem;

  // 5. Reward: a different author's joke, honoring avoid-lists + unseen rules
  const { joke, relaxedSeen, relaxedAvoid } = await pickRewardJoke(visitorId, avoidCats, avoidFl, member?.id);
  if (!joke) {
    return json({
      submittedId: inserted._id,
      joke: null,
      notice: "Your joke is in! The exchange is brand new — nobody else's joke is available yet. Come back soon.",
    });
  }

  await items.insert("Seen", { visitorId, jokeId: joke._id });

  let notice: string | undefined;
  if (relaxedSeen && relaxedAvoid) notice = "You've heard everything that matches your filters — repeats and avoided categories are back on the menu.";
  else if (relaxedSeen) notice = "You've heard every fresh joke that fits — showing repeats now.";
  else if (relaxedAvoid) notice = "Nothing fresh outside your avoided categories — we had to dip into them.";

  return json({
    submittedId: inserted._id,
    joke: {
      id: joke._id,
      text: joke.text,
      category: joke.category,
      contentFlags: joke.contentFlags ?? (joke.dark ? ["dark"] : []),
      authorHandle: joke.authorHandle || "Anonymous comedian",
      score: joke.score ?? 0,
    },
    notice,
  });
};
