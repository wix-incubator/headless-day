import type { APIRoute } from "astro";
import { getSessionMember } from "../../lib/wix/members";
import { getOwnedArenaSkins } from "../../lib/wix/arenaSkins";

export const GET: APIRoute = async () => {
  const member = await getSessionMember();
  const ownedPremiumShapes = member
    ? await getOwnedArenaSkins(member.id)
    : [];

  return new Response(JSON.stringify({ ownedPremiumShapes }), {
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
    },
  });
};
