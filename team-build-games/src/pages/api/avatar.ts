import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { files } from "@wix/media";
import { members } from "@wix/members";
import { isKnownGameId } from "../../lib/members/games";
import { getMemberId } from "../../lib/wix/members";
import { disableGameAvatar, setGameAvatarUrl } from "../../lib/wix/playerAvatars";

const MAX_BYTES = 400_000; // client sends a 256×256 png — comfortably under this

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/** Decode a base64 string to bytes without Node's Buffer (edge/fetch runtime). */
function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Trusted avatar upload (Track B B1). A signed-in member POSTs a small square png/jpeg data URL;
 * we upload it to Wix Media (elevated — clients can't write media directly).
 *
 * - No `gameId` (B1a) → stored as the member's **profile photo** (the global avatar), so
 *   `getSessionMember()` surfaces it everywhere.
 * - With a known `gameId` (B1b) → stored as a **per-game override** row in `PlayerAvatars`.
 *
 * One avatar per (member) globally, and one per (member, game). Cosmetic-only; validated server-side.
 */
export const POST: APIRoute = async ({ request }) => {
  // 1) resolve the signed-in member id (Members-API read, or the session-token fallback — see
  //    getMemberId; getCurrentMember() alone returns nothing in POST API routes even when logged in).
  const memberId = await getMemberId();
  if (!memberId) return json({ error: "Sign in to set an avatar." }, 401);

  // 2) parse + validate the image (a data URL produced by the client-side resize/crop)
  let dataUrl = "";
  let gameId: unknown;
  try {
    ({ dataUrl = "", gameId } = await request.json());
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  // gameId is optional; when present it must be a known game (allowlist prevents arbitrary rows).
  if (gameId !== undefined && !isKnownGameId(gameId)) return json({ error: "Unknown game." }, 400);
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(dataUrl);
  if (!match) return json({ error: "Expected a PNG or JPEG image." }, 400);
  const mimeType = match[1]!;
  const bytes = base64ToBytes(match[2]!);
  if (bytes.byteLength > MAX_BYTES) return json({ error: "Image too large." }, 413);

  // 3) upload to Wix Media (Manage Media Manager → elevated)
  const ext = mimeType === "image/png" ? "png" : "jpg";
  const fileName = `avatar-${memberId}.${ext}`;
  let avatarUrl: string | undefined;
  try {
    const { uploadUrl } = await auth.elevate(files.generateFileUploadUrl)(mimeType, { fileName, private: false });
    const put = await fetch(`${uploadUrl}?filename=${encodeURIComponent(fileName)}`, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      // Uint8Array is a valid fetch body at runtime; the lib's BodyInit type is narrower.
      body: bytes as unknown as BodyInit,
    });
    if (!put.ok) return json({ error: "Media upload failed." }, 502);
    const { file } = await put.json();
    avatarUrl = file?.url;
  } catch {
    return json({ error: "Media upload failed." }, 502);
  }
  if (!avatarUrl) return json({ error: "Media upload returned no URL." }, 502);

  // 4) store — per-game override (PlayerAvatars) or the global profile photo (both elevated)
  try {
    if (isKnownGameId(gameId)) {
      await setGameAvatarUrl(memberId, gameId, avatarUrl);
    } else {
      await auth.elevate(members.updateMember)(memberId, {
        profile: { photo: { url: avatarUrl, width: 256, height: 256 } },
      });
    }
  } catch {
    // Uploaded, but couldn't persist — surface it so the caller can retry/adjust.
    return json({ avatarUrl, warning: "uploaded-but-not-saved" }, 200);
  }

  return json({ avatarUrl }, 200);
};

/** Disable a per-game face photo without deleting or changing the member's global profile photo. */
export const DELETE: APIRoute = async ({ request }) => {
  const memberId = await getMemberId();
  if (!memberId) return json({ error: "Sign in to remove an avatar." }, 401);

  let gameId: unknown;
  try {
    ({ gameId } = await request.json());
  } catch {
    return json({ error: "Malformed request." }, 400);
  }
  if (!isKnownGameId(gameId)) return json({ error: "Unknown game." }, 400);

  try {
    await disableGameAvatar(memberId, gameId);
  } catch {
    return json({ error: "Could not remove the game avatar." }, 500);
  }

  return json({ avatarUrl: null }, 200);
};
