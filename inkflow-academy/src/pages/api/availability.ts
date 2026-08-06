import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { availabilityCalendar } from "@wix/bookings";
import { json } from "../../lib/json";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const serviceId = new URL(request.url).searchParams.get("serviceId");
  if (!serviceId) return json({ error: "serviceId required" }, 400);

  try {
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 86400000);

    const res = await auth.elevate(availabilityCalendar.queryAvailability)(
      {
        filter: {
          serviceId: [serviceId],
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
      { timezone: "Asia/Shanghai" },
    );

    const slots = (res.availabilityEntries ?? [])
      .filter((e) => e.bookable && e.slot?.startDate)
      .map((e) => {
        const slot = e.slot!;
        return {
          serviceId: slot.serviceId ?? serviceId,
          scheduleId: slot.scheduleId,
          eventId: slot.eventId ?? null,
          startDate: slot.startDate,
          endDate: slot.endDate,
          timezone: slot.timezone ?? "Asia/Shanghai",
          resourceId: slot.resource?._id ?? (slot as { resourceId?: string }).resourceId,
          resourceName: slot.resource?.name,
          openSpots: e.openSpots ?? e.remainingCapacity ?? 1,
        };
      });

    return json({ slots });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "availability failed";
    return json({ error: message }, 500);
  }
};
