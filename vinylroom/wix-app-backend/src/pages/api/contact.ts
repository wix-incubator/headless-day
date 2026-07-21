import type { APIRoute } from "astro";
import { WIX_API_KEY, WIX_SITE_ID } from "astro:env/server";
import { contactCorsHeaders, handleContact } from "../../server/contact";

export const OPTIONS: APIRoute = async ({ request }) =>
  new Response(null, { status: 204, headers: contactCorsHeaders(request) });

export const POST: APIRoute = async ({ request }) =>
  handleContact(request, { apiKey: WIX_API_KEY, siteId: WIX_SITE_ID });
