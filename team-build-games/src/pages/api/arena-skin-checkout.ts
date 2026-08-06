import type { APIRoute } from "astro";
import { createProductCheckoutUrl } from "../../lib/wix";
import {
  isArenaPremiumSkinId,
  memberOwnsArenaSkin,
} from "../../lib/wix/arenaSkins";
import { getSessionMember } from "../../lib/wix/members";

function productIdForSkin(skin: string): string {
  if (skin === "neon-ronin") return import.meta.env.ARENA_SKIN_NEON_RONIN_PRODUCT_ID ?? "";
  if (skin === "solar-warden") return import.meta.env.ARENA_SKIN_SOLAR_WARDEN_PRODUCT_ID ?? "";
  return "";
}

export const GET: APIRoute = async ({ redirect, request }) => {
  const url = new URL(request.url);
  const skin = url.searchParams.get("skin");
  if (!isArenaPremiumSkinId(skin)) {
    return new Response("Unknown Arena skin.", { status: 400 });
  }

  const checkoutPath = `/api/arena-skin-checkout?skin=${encodeURIComponent(skin)}`;
  const member = await getSessionMember();
  if (!member) {
    return redirect(
      `/api/auth/login?returnToUrl=${encodeURIComponent(checkoutPath)}`,
      302,
    );
  }

  if (await memberOwnsArenaSkin(member.id, skin)) {
    return redirect(`/games/arena?skin=${encodeURIComponent(skin)}&owned=1`, 302);
  }

  const productId = productIdForSkin(skin);
  if (!productId) {
    return redirect(
      `/games/arena?skin=${encodeURIComponent(skin)}&checkout=missing-product`,
      302,
    );
  }

  const postFlowUrl = `${url.origin}/api/arena-skin-confirm?skin=${encodeURIComponent(skin)}`;
  const checkoutUrl = await createProductCheckoutUrl(productId, postFlowUrl);
  return redirect(checkoutUrl, 302);
};
