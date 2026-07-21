import "server-only";
import { rooms as demoRooms, type Room } from "@/data/rooms";
import { getWixClient } from "./client";
import { ordersCompat } from "./ordersCompat";
import { eventsCompat } from "./sdkCompat";
import { eventSchedule, isUpcomingEvent } from "./eventSchedule";

export type RoomsResult = {
  rooms: Room[];
  source: "wix" | "mock";
};

/** Money like `{ amount: "45", currency: "PLN" }` → a display string, best-effort. */
function formatPrice(amount?: string | number, currency?: string, fallback = ""): string {
  if (amount == null) return fallback;
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return fallback;
  if (n === 0) return "Free";
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", PLN: "zł" };
  const sym = currency ? symbols[currency] : "";
  // zł reads better as a suffix; symbols as a prefix.
  return currency === "PLN" ? `${n} zł` : sym ? `${sym}${n}` : `${n} ${currency ?? ""}`.trim();
}

/**
 * Overlay live Wix Events fields onto a demo room (matched by slug), keeping the
 * editorial extras (genre, mood, vinyl lineup, equipment, sleeve) that Wix Events
 * has no native home for. Anything we can't read confidently keeps its demo value.
 */
function mergeEvent(base: Room, ev: Record<string, unknown>, ticket?: Record<string, unknown>): Room {
  const schedule = eventSchedule(ev);
  const location = ev.location as Record<string, unknown> | undefined;
  const price = ticket?.price as Record<string, unknown> | undefined;
  const limits = ticket?.dashboard as Record<string, unknown> | undefined;
  const sold = typeof limits?.ticketsSold === "number" ? (limits.ticketsSold as number) : undefined;
  const locationName = String(location?.name || "");
  const genericCity = /^A room in (.+)$/i.exec(locationName)?.[1]?.trim();

  return {
    ...base,
    title: (ev.title as string) || base.title,
    wixEventId: ev._id as string,
    wixEventSlug: (ev.slug as string) || base.wixEventSlug,
    wixTicketDefinitionId: (ticket?._id as string) || base.wixTicketDefinitionId,
    day: schedule?.day ?? base.day,
    dateLabel: schedule?.dateLabel,
    startDate: schedule?.startDate,
    time: schedule?.time ?? base.time,
    city: genericCity || (location?.city as string) || base.city,
    venue: location?.locationTbd ? base.venue : locationName || base.venue,
    price: formatPrice(price?.amount as string, price?.currency as string, base.price),
    seatsLeft: sold != null ? Math.max(0, base.capacity - sold) : base.seatsLeft,
    source: "wix",
  };
}

/**
 * Server-side. Returns live Wix Events mapped to rooms when the Headless client
 * is configured and returns events; otherwise the built-in demo set. Never
 * throws — any failure degrades to demo data so the page always renders.
 */
export async function getListeningRooms(): Promise<RoomsResult> {
  const client = getWixClient();
  if (!client) return { rooms: demoRooms, source: "mock" };

  try {
    const orderClient = ordersCompat(client.orders);
    const res = await eventsCompat(client.wixEventsV2)
      .queryEvents({ fields: ["DETAILS", "URLS"] })
      .limit(50)
      .find();
    const events = ((res.items ?? []) as Record<string, unknown>[])
      .filter(isUpcomingEvent)
      .sort((left, right) => {
        const leftStart = Date.parse(eventSchedule(left)?.startDate ?? "");
        const rightStart = Date.parse(eventSchedule(right)?.startDate ?? "");
        return (Number.isNaN(leftStart) ? Number.MAX_SAFE_INTEGER : leftStart)
          - (Number.isNaN(rightStart) ? Number.MAX_SAFE_INTEGER : rightStart);
      });
    if (events.length === 0) return { rooms: demoRooms, source: "mock" };

    // Pull one on-sale ticket per event (for price + a ticketDefinitionId),
    // in parallel; tolerate individual failures.
    const withTickets = await Promise.all(
      events.map(async (ev) => {
        try {
          const avail = await orderClient.queryAvailableTickets({
            filter: { eventId: String(ev._id || "") },
            limit: 1,
          });
          return { ev, ticket: avail.definitions?.[0] as Record<string, unknown> | undefined };
        } catch {
          return { ev, ticket: undefined };
        }
      }),
    );

    // Build rooms from live events, borrowing editorial extras from the demo room
    // that matches — by normalized title first (robust to Wix's auto-slugs), then
    // by slug; unmatched events fall back to a rotating demo sleeve.
    const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const byTitle = new Map(demoRooms.map((r) => [norm(r.title), r]));
    const bySlug = new Map(demoRooms.map((r) => [r.id, r]));
    const rooms: Room[] = withTickets.map(({ ev, ticket }, i) => {
      const slug = (ev.slug as string) ?? "";
      const title = (ev.title as string) ?? "";
      const base =
        byTitle.get(norm(title)) ??
        bySlug.get(slug) ??
        { ...demoRooms[i % demoRooms.length], id: slug || `event-${i}` };
      return mergeEvent(base, ev, ticket);
    });

    return { rooms, source: "wix" };
  } catch {
    return { rooms: demoRooms, source: "mock" };
  }
}
