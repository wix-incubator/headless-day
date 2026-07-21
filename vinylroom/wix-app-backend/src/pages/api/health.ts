import type { APIRoute } from "astro";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

export const OPTIONS: APIRoute = async () =>
  new Response(null, { status: 204, headers });

export const GET: APIRoute = async () =>
  new Response(JSON.stringify({ ok: true, service: "vinyl-room-events" }), {
    status: 200,
    headers,
  });
