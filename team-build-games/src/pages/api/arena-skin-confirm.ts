import type { APIRoute } from "astro";
import { grantArenaSkin, isArenaPremiumSkinId } from "../../lib/wix/arenaSkins";
import { getSessionMember } from "../../lib/wix/members";

export const GET: APIRoute = async ({ redirect, request }) => {
  const url = new URL(request.url);
  const skin = url.searchParams.get("skin");
  if (!isArenaPremiumSkinId(skin)) {
    return new Response("Unknown Arena skin.", { status: 400 });
  }

  const member = await getSessionMember();
  if (!member) {
    return redirect(
      `/api/auth/login?returnToUrl=${encodeURIComponent(
        `/api/arena-skin-confirm?skin=${skin}`,
      )}`,
      302,
    );
  }

  await grantArenaSkin(member.id, skin, url.searchParams.get("checkoutId") ?? "");
  return redirect(`/games/arena?skin=${encodeURIComponent(skin)}&checkout=success`, 303);
};
