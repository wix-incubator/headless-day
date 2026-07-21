import type { APIRoute } from "astro";
import { WIX_API_KEY, WIX_SITE_ID } from "astro:env/server";
import { handleNewsletter, newsletterCorsHeaders } from "../../server/newsletter";

export const OPTIONS: APIRoute = async ({ request }) =>
  new Response(null, { status: 204, headers: newsletterCorsHeaders(request) });

export const POST: APIRoute = async ({ request }) =>
  handleNewsletter(request, { apiKey: WIX_API_KEY, siteId: WIX_SITE_ID });
