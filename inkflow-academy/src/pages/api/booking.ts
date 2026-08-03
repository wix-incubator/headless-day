import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { bookings } from "@wix/bookings";
import { createCart, calculateCart, placeOrder } from "@wix/auto_sdk_ecom_cart-v-2";
import { BOOKINGS_APP_ID, STAFF_RESOURCE_TYPE_ID } from "../../lib/wix-constants";
import { json } from "../../lib/json";

export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const slot = body.slot as Record<string, unknown> | undefined;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";

    if (!slot?.serviceId || !slot.scheduleId || !slot.startDate || !slot.endDate) {
      return json({ error: "Missing booking slot." }, 400);
    }
    if (!name) return json({ error: "Please add your name." }, 400);
    if (!EMAIL_RE.test(email)) return json({ error: "Please add a valid email." }, 400);

    const parts = name.split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || firstName;

    const formSubmission: Record<string, string> = {
      first_name: firstName,
      last_name: lastName,
      email,
    };
    if (phone) formSubmission.phone = phone;

    const resourceId = typeof slot.resourceId === "string" ? slot.resourceId : undefined;

    const created: { booking?: { _id?: string } } = await auth.elevate(bookings.createBooking)(
      {
        selectedPaymentOption: "OFFLINE",
        totalParticipants: 1,
        bookedEntity: {
          slot: {
            serviceId: slot.serviceId,
            scheduleId: slot.scheduleId,
            startDate: slot.startDate,
            endDate: slot.endDate,
            timezone: (slot.timezone as string) || "Asia/Shanghai",
            ...(slot.eventId ? { eventId: slot.eventId } : {}),
            resourceSelections: resourceId
              ? [{ resourceId }]
              : [
                  {
                    resourceTypeId: STAFF_RESOURCE_TYPE_ID,
                    selectionMethod: "ANY_RESOURCE",
                  },
                ],
            location: { locationType: "OWNER_BUSINESS" },
          },
        },
      } as Parameters<typeof bookings.createBooking>[0],
      { formSubmission } as Parameters<typeof bookings.createBooking>[1],
    );

    const bookingId = created?.booking?._id;
    if (!bookingId) return json({ error: "Booking could not be created." }, 500);

    const cart = await auth.elevate(createCart)({
      catalogItems: [
        {
          quantity: 1,
          catalogReference: { catalogItemId: bookingId, appId: BOOKINGS_APP_ID },
        },
      ],
      cart: { source: { channelType: "WEB" } },
    } as Parameters<typeof createCart>[0]);

    await auth.elevate(calculateCart)(cart._id!);
    const order = await auth.elevate(placeOrder)(cart._id!);
    const orderId =
      (order as { orderId?: string })?.orderId ??
      (order as { order?: { _id?: string } })?.order?._id ??
      null;

    return json({ ok: true, bookingId, orderId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Booking failed.";
    return json({ error: message }, 500);
  }
};
