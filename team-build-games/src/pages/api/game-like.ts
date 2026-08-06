import type { APIRoute } from "astro";
import { members } from "@wix/members";
import { GAME_SLUGS } from "../../lib/games/registry";
import { toggleGameLike } from "../../lib/wix/gameLikes";

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Trusted like toggle: a signed-in member POSTs `{ gameId }` and their like for that game
 * flips on/off (one like per member per game — enforced by the (gameId, memberId) row).
 * Requires a resolvable member id, so anonymous sessions get a 401 and the client
 * redirects to login. Returns `{ liked, count }` for optimistic UI updates.
 */
export const POST: APIRoute = async ({ request }) => {
  // strict member check — likes are keyed by member id, so the generic session
  // fallback used elsewhere isn't enough here
  let memberId: string | undefined;
  try {
    memberId = (await members.getCurrentMember())?.member?._id ?? undefined;
  } catch {
    memberId = undefined;
  }
  if (!memberId) return json({ error: "login-required" }, 401);

  let gameId = "";
  try {
    ({ gameId = "" } = await request.json());
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!GAME_SLUGS.includes(gameId)) return json({ error: "Unknown game." }, 400);

  try {
    const result = await toggleGameLike(gameId, memberId);
    return json(result, 200);
  } catch {
    return json({ error: "Could not save your vote — try again." }, 502);
  }
};
