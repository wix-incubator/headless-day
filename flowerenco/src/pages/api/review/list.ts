import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { auth } from "@wix/essentials";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const GET: APIRoute = async () => {
  try {
    const query = auth.elevate(items.query);
    const { items: rows } = await query("Reviews")
      .eq("approved", true)
      .descending("_createdDate")
      .limit(50)
      .find();

    const reviews = (rows || []).map((r: any) => ({
      id:          r._id,
      name:        r.name,
      rating:      r.rating,
      review:      r.review,
      photoUrl:    r.photoUrl || "",
      productName: r.productName || "",
      date:        r._createdDate,
    }));

    return json({ reviews });
  } catch (e: any) {
    return json({ reviews: [], error: e?.message }, 200);
  }
};
