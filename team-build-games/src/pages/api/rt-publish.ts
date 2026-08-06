import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { publisher } from "@wix/realtime";
import { errorCode, errorStatus } from "../../lib/wix/apiError";

/**
 * Realtime Lab publish relay (see docs/superpowers/specs/2026-07-16-realtime-lab-design.md).
 * Wix Realtime only allows BACKEND publishes, so lab clients POST here and we relay with
 * elevated app credentials — the same client → backend → fan-out hop any real feature would pay.
 *
 * Guard: only `rtlab-*` channels, so this public route can't be abused as a general publish proxy.
 */

const CHANNEL_PREFIX = "rtlab-";

interface PublishBody {
  channel?: string;
  resourceId?: string;
  payload?: Record<string, unknown>;
}

export const POST: APIRoute = async ({ request }) => {
  let body: PublishBody;
  try {
    body = (await request.json()) as PublishBody;
  } catch {
    return json(400, { ok: false, status: 400, message: "invalid JSON body" });
  }

  const { channel, resourceId, payload } = body;
  if (typeof channel !== "string" || !channel.startsWith(CHANNEL_PREFIX)) {
    return json(400, { ok: false, status: 400, message: `channel must start with "${CHANNEL_PREFIX}"` });
  }
  if (payload === undefined || payload === null || typeof payload !== "object") {
    return json(400, { ok: false, status: 400, message: "payload must be an object" });
  }

  const started = performance.now();
  try {
    await auth.elevate(publisher.publish)(
      { name: channel, ...(resourceId ? { resourceId } : {}) },
      payload as Record<string, any>,
    );
    return json(200, { ok: true, publishMs: Math.round(performance.now() - started), serverTs: Date.now() });
  } catch (e) {
    const status = errorStatus(e);
    return json(status ?? 502, {
      ok: false,
      status,
      code: errorCode(e),
      message: (e as Error)?.message ?? String(e),
      publishMs: Math.round(performance.now() - started),
    });
  }
};

function json(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
