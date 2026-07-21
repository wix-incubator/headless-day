import type { SSRManifest } from "astro";
import { corsHeaders, handleHostEvent } from "./server/host-events";
import { handleNewsletter, newsletterCorsHeaders } from "./server/newsletter";
import { contactCorsHeaders, handleContact } from "./server/contact";

type Env = {
  WIX_API_KEY: string;
  WIX_SITE_ID: string;
  WIX_NEWSLETTER_FORM_ID?: string;
};

export function createExports(_manifest: SSRManifest) {
  return {
    default: {
      async fetch(request: Request, env: Env) {
        const { pathname } = new URL(request.url);

        if (pathname === "/api/health" && request.method === "GET") {
          return Response.json({ ok: true, service: "vinyl-room-api", version: "2.0.0" });
        }

        if (pathname === "/api/host-events" && request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: corsHeaders(request) });
        }

        if (pathname === "/api/host-events" && request.method === "POST") {
          return handleHostEvent(request, {
            apiKey: env.WIX_API_KEY,
            siteId: env.WIX_SITE_ID,
          });
        }

        if (pathname === "/api/newsletter" && request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: newsletterCorsHeaders(request) });
        }

        if (pathname === "/api/newsletter" && request.method === "POST") {
          return handleNewsletter(request, {
            apiKey: env.WIX_API_KEY,
            siteId: env.WIX_SITE_ID,
            newsletterFormId: env.WIX_NEWSLETTER_FORM_ID,
          });
        }

        if (pathname === "/api/contact" && request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: contactCorsHeaders(request) });
        }

        if (pathname === "/api/contact" && request.method === "POST") {
          return handleContact(request, {
            apiKey: env.WIX_API_KEY,
            siteId: env.WIX_SITE_ID,
          });
        }

        return Response.json({ error: "Not found." }, { status: 404 });
      },
    },
  };
}
