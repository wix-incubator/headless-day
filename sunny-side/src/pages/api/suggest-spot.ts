import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { items } from "@wix/data";

export const prerender = false;

const CITIES = ["Tel Aviv", "Kyiv", "Kraków", "Dublin", "Miami", "Vilnius", "São Paulo"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try { body = await request.json(); } catch { /* ignore */ }

    const city = clean(body.city, 60);
    const spotName = clean(body.spotName, 120);
    const neighborhood = clean(body.neighborhood, 120);
    const whyGreat = clean(body.whyGreat, 2000);
    const submitterName = clean(body.submitterName, 120);
    const submitterEmail = clean(body.submitterEmail, 200);

    // Validation
    if (!CITIES.includes(city)) return json({ error: "Please choose one of the listed cities." }, 400);
    if (!spotName) return json({ error: "Please add the spot's name." }, 400);
    if (!neighborhood) return json({ error: "Please add the neighborhood." }, 400);
    if (whyGreat.length < 3) return json({ error: "Tell us a little about why it's great." }, 400);
    if (submitterEmail && !EMAIL_RE.test(submitterEmail)) return json({ error: "That email doesn't look right." }, 400);

    const data: Record<string, string> = { city, spotName, neighborhood, whyGreat, status: "pending" };
    if (submitterName) data.submitterName = submitterName;
    if (submitterEmail) data.submitterEmail = submitterEmail;

    await auth.elevate(items.insert)("SpotSuggestions", data);
    return json({ ok: true });
  } catch (e: any) {
    console.error("suggest-spot failed", e);
    return json({ error: e?.message || "Something went wrong." }, 500);
  }
};
