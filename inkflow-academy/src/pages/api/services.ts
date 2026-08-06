import type { APIRoute } from "astro";
import { services } from "@wix/bookings";
import { json } from "../../lib/json";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const { items } = await services.queryServices().limit(20).find();
    const list = (items ?? [])
      .filter((s) => s._id)
      .map((s) => ({
        id: s._id as string,
        name: s.name ?? "",
        description: s.description ?? "",
        price: s.payment?.fixed?.price?.value,
        currency: s.payment?.fixed?.price?.currency,
      }));
    return json({ services: list });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "services failed";
    return json({ error: message }, 500);
  }
};
