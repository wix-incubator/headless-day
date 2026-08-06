import type { APIRoute } from "astro";
import { items } from "@wix/data";
import { TESTIMONIALS_COLLECTION } from "../../lib/wix-constants";
import { json } from "../../lib/json";

export const prerender = false;

type TestimonialRow = {
  quote?: string;
  author?: string;
  meta?: string;
  rating?: number;
  order?: number;
};

export const GET: APIRoute = async () => {
  try {
    const { items: rows } = await items
      .query(TESTIMONIALS_COLLECTION)
      .ascending("order")
      .limit(12)
      .find();

    const testimonials = (rows as TestimonialRow[])
      .map((t) => ({
        quote: t.quote ?? "",
        author: t.author ?? "",
        meta: t.meta ?? "",
        rating: typeof t.rating === "number" ? t.rating : 5,
      }))
      .filter((t) => t.quote);

    return json({ testimonials });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "testimonials failed";
    return json({ error: message, testimonials: [] }, 200);
  }
};
