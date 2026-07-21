import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { bookings } from "@wix/bookings";
import { createCart, calculateCart, placeOrder } from "@wix/auto_sdk_ecom_cart-v-2";
import { BOOKINGS_APP_ID, STAFF_RESOURCE_TYPE_ID } from "../../lib/wix";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try { body = await request.json(); } catch {}

    const serviceId = clean(body.serviceId, 80);
    const scheduleId = clean(body.scheduleId, 80);
    const startDate = clean(body.start, 40);
    const endDate = clean(body.end, 40);
    const timezone = clean(body.timezone, 60) || "UTC";
    const firstName = clean(body.firstName, 80);
    const lastName = clean(body.lastName, 80);
    const email = clean(body.email, 200);
    const phone = clean(body.phone, 40);

    if (!serviceId || !scheduleId || !startDate || !endDate) return json({ error: "Missing booking details." }, 400);
    if (!firstName || !lastName) return json({ error: "Please add your name." }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "Please add a valid email." }, 400);

    const formSubmission: Record<string, string> = { first_name: firstName, last_name: lastName, email };
    if (phone) formSubmission.phone = phone;

    const created: any = await auth.elevate(bookings.createBooking)(
      {
        selectedPaymentOption: "OFFLINE",
        totalParticipants: 1,
        bookedEntity: {
          slot: {
            serviceId,
            scheduleId,
            startDate,
            endDate,
            timezone,
            resourceSelections: [{ resourceTypeId: STAFF_RESOURCE_TYPE_ID, selectionMethod: "ANY_RESOURCE" }],
            location: { locationType: "OWNER_BUSINESS" },
          },
        },
      } as any,
      { formSubmission } as any
    );

    const bookingId = created?.booking?._id;
    if (!bookingId) return json({ error: "Booking could not be created." }, 500);

    const cart: any = await auth.elevate(createCart)({
      catalogItems: [{ quantity: 1, catalogReference: { catalogItemId: bookingId, appId: BOOKINGS_APP_ID } }],
      cart: { source: { channelType: "WEB" } },
    } as any);
    await auth.elevate(calculateCart)(cart._id);
    const order: any = await auth.elevate(placeOrder)(cart._id);
    const orderId = order?.orderId || order?.order?._id || order?._id || null;

    return json({ ok: true, bookingId, orderId });
  } catch (e: any) {
    console.error("crawl-book failed", e);
    return json({ error: e?.message || "Booking failed. Please try another time." }, 500);
  }
};
