import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { publisher } from "@wix/realtime";
import { SIGNAL_CHANNEL, parseSignalBody } from "../../lib/signal/protocol";
import { errorCode, errorStatus } from "../../lib/wix/apiError";

/**
 * WebRTC signaling relay (see docs/superpowers/specs/2026-07-16-wix-signaling-migration-design.md).
 * Wix Realtime only allows backend publishes, so the browser topic adapter POSTs here and we
 * relay to the `signal` channel with elevated app creds. Topics are Trystero sha1 hashes;
 * `parseSignalBody` rejects anything else, which keeps this route single-purpose. Payloads are
 * E2E-encrypted by Trystero before they reach us — the relay never sees plaintext SDP.
 */

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false, status: 400, message: "invalid JSON body" });
  }

  const parsed = parseSignalBody(body);
  if (!parsed.ok) {
    return json(400, { ok: false, status: 400, message: parsed.error });
  }

  try {
    await auth.elevate(publisher.publish)({ name: SIGNAL_CHANNEL, resourceId: parsed.topic }, { m: parsed.msg });
    return json(200, { ok: true });
  } catch (e) {
    const status = errorStatus(e);
    return json(status ?? 502, {
      ok: false,
      status,
      code: errorCode(e),
      message: (e as Error)?.message ?? String(e),
    });
  }
};

function json(status: number, data: Record<string, unknown>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
