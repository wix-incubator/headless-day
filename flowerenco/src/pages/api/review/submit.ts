import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, email, rating, review, photoUrl, productName } = await request.json();
    if (!name || !email || !rating || !review) {
      return json({ error: "Please fill in your name, email, rating, and review." }, 400);
    }
    if (rating < 1 || rating > 5) {
      return json({ error: "Rating must be between 1 and 5." }, 400);
    }

    const insert = auth.elevate(items.insert);
    await insert("Reviews", {
      name:        String(name).slice(0, 80),
      email:       String(email).slice(0, 200),
      rating:      Number(rating),
      review:      String(review).slice(0, 2000),
      photoUrl:    photoUrl ? String(photoUrl).slice(0, 500) : "",
      productName: productName ? String(productName).slice(0, 100) : "",
      approved:    false,
    });

    return json({ ok: true });
  } catch (e: any) {
    return json({ error: e?.message || "Could not save your review." }, 500);
  }
};
