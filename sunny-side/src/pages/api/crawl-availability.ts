import type { APIRoute } from "astro";
import { auth } from "@wix/essentials";
import { availabilityTimeSlots } from "@wix/bookings";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
const ymd = (d: Date, tz: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

export const POST: APIRoute = async ({ request }) => {
  try {
    let body: any = {};
    try { body = await request.json(); } catch {}
    const serviceId = (body.serviceId || "").toString();
    const timeZone = (body.timeZone || "UTC").toString();
    const days = Math.min(Math.max(parseInt(body.days, 10) || 14, 1), 30);
    if (!serviceId) return json({ error: "Missing service." }, 400);

    const now = new Date();
    const fromLocalDate = ymd(now, timeZone) + "T00:00:00";
    const toLocalDate = ymd(new Date(now.getTime() + days * 86400000), timeZone) + "T23:59:59";

    const res: any = await auth.elevate(availabilityTimeSlots.listAvailabilityTimeSlots)({
      serviceId,
      fromLocalDate,
      toLocalDate,
      timeZone,
      bookable: true,
      cursorPaging: { limit: 300 },
    });
    // Breakfast crawls: only offer MORNING start times (07:00–11:00) in the city's
    // own local timezone. localStartDate is already local (we pass timeZone), so we
    // constrain by its local clock time. (The underlying schedule spans a wide band
    // across all city timezones; this presents each city only its local mornings.)
    const MORNING_START = 7 * 60;   // 07:00
    const MORNING_END = 11 * 60;    // 11:00 inclusive
    const localMinutes = (iso: string) => {
      const hm = (iso.split("T")[1] || "").slice(0, 5);
      return parseInt(hm.slice(0, 2), 10) * 60 + parseInt(hm.slice(3, 5), 10);
    };
    const slots = (res?.timeSlots || [])
      .filter((t: any) => t.localStartDate && t.scheduleId)
      .filter((t: any) => {
        const m = localMinutes(t.localStartDate);
        return m >= MORNING_START && m <= MORNING_END;
      })
      .map((t: any) => ({ start: t.localStartDate, end: t.localEndDate, scheduleId: t.scheduleId }));
    return json({ slots, timeZone });
  } catch (e: any) {
    console.error("crawl-availability failed", e);
    return json({ error: e?.message || "Could not load availability." }, 500);
  }
};
