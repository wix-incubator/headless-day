import type { APIRoute } from "astro";
import { WIX_API_KEY, WIX_SITE_ID } from "astro:env/server";
import { corsHeaders, handleHostEvent } from "../../server/host-events";

export const OPTIONS: APIRoute = async ({ request }) =>
  new Response(null, { status: 204, headers: corsHeaders(request) });

export const POST: APIRoute = async ({ request }) =>
  handleHostEvent(request, { apiKey: WIX_API_KEY, siteId: WIX_SITE_ID });
