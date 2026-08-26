// GET /api/me — current member identity for the HUD (null when anonymous).
import type { APIRoute } from "astro";
import { getMember } from "../../lib/member";
import { json } from "../../lib/jokes";

export const prerender = false;

export const GET: APIRoute = async () => {
  const member = await getMember();
  return json({ member });
};
