import { rooms as demoRooms, type Genre, type Room, type Sleeve } from "@/data/rooms";
import { getBrowserClient } from "./browser";
import { ordersCompat } from "./ordersCompat";
import { eventsCompat } from "./sdkCompat";
import { eventSchedule, isUpcomingEvent } from "./eventSchedule";

const SLEEVES: Record<string, Sleeve> = {
  Jazz: { from: "#1b3a5c", to: "#0a1420", accent: "#7fa8e8", motif: "circle" },
  Soul: { from: "#7a1f2b", to: "#22070a", accent: "#e8a04a", motif: "split" },
  "Hip-Hop": { from: "#c25a1e", to: "#2a1006", accent: "#f0a850", motif: "grid" },
  Ambient: { from: "#2f6b52", to: "#0a1712", accent: "#8fd6a8", motif: "horizon" },
  "City Pop": { from: "#d4507e", to: "#2a0a1c", accent: "#ff9ec4", motif: "arc" },
  Electronic: { from: "#c22b3a", to: "#1a1a1c", accent: "#ff6b78", motif: "bars" },
};

const KNOWN_GENRES = new Set(Object.keys(SLEEVES));

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function formatPrice(amount?: string | number, currency?: string, fallback = "") {
  if (amount == null) return fallback;
  const number = typeof amount === "string" ? Number.parseFloat(amount) : amount;
  if (!Number.isFinite(number)) return fallback;
  if (number === 0) return "Free";
  const symbols: Record<string, string> = { EUR: "€", USD: "$", GBP: "£", PLN: "zł" };
  return currency === "PLN"
    ? `${number} zł`
    : symbols[currency || ""]
      ? `${symbols[currency || ""]}${number}`
      : `${number} ${currency || ""}`.trim();
}

function eventNotes(description: string) {
  const genreMatch = /^(.+?) listening room\./i.exec(description);
  const moodMatch = /Mood:\s*(.+?)\.\s*Records:/i.exec(description);
  const recordsMatch = /Records:\s*(.+)\.?$/i.exec(description);
  const genre = genreMatch?.[1]?.trim();
  return {
    genre: genre && KNOWN_GENRES.has(genre) ? (genre as Genre) : undefined,
    mood: moodMatch?.[1]?.split(",").map((value) => value.trim()).filter(Boolean).join(" · ") || undefined,
    records: recordsMatch?.[1]?.replace(/\.$/, "").split(";").map((value) => value.trim()).filter(Boolean) || [],
  };
}

/** Client-side refresh, deliberately loaded after first paint so new Wix Events appear without a rebuild. */
export async function getLiveListeningRooms(): Promise<Room[]> {
  const client = getBrowserClient();
  if (!client) return [];
  const orderClient = ordersCompat(client.orders);

  const response = await eventsCompat(client.wixEventsV2)
    .queryEvents({ fields: ["DETAILS", "URLS"] })
    .limit(20)
    .find();
  const events = ((response.items ?? []) as unknown as Record<string, unknown>[]).filter(isUpcomingEvent);
  if (!events.length) return [];

  const tickets = await Promise.all(
    events.map(async (event) => {
      try {
        const available = await orderClient.queryAvailableTickets({
          filter: { eventId: String(event._id || "") },
          limit: 1,
        });
        return available.definitions?.[0] as unknown as Record<string, unknown> | undefined;
      } catch {
        return undefined;
      }
    }),
  );

  const byTitle = new Map(demoRooms.map((room) => [normalize(room.title), room]));
  const bySlug = new Map(demoRooms.map((room) => [room.id, room]));

  return events.map((event, index) => {
    const title = String(event.title || "Vinyl listening room");
    const slug = String(event.slug || `event-${index}`);
    const details = eventNotes(String(event.shortDescription || ""));
    const ticket = tickets[index];
    const dashboard = ticket?.dashboard as Record<string, unknown> | undefined;
    const price = ticket?.price as Record<string, unknown> | undefined;
    const quantity = typeof dashboard?.quantity === "number" ? dashboard.quantity : undefined;
    const unsold = typeof dashboard?.unsold === "number" ? dashboard.unsold : undefined;
    const location = event.location as Record<string, unknown> | undefined;
    const base = byTitle.get(normalize(title)) ?? bySlug.get(slug) ?? demoRooms[index % demoRooms.length];
    const schedule = eventSchedule(event);
    const locationName = String(location?.name || "");
    const genericCity = /^A room in (.+)$/i.exec(locationName)?.[1]?.trim();
    const genre = details.genre ?? base.genre;

    return {
      ...base,
      id: slug,
      title,
      genre,
      mood: details.mood ?? base.mood,
      records: details.records.length ? details.records : base.records,
      sleeve: SLEEVES[genre] ?? base.sleeve,
      venue: location?.locationTbd ? base.venue : String(locationName || base.venue),
      city: genericCity || base.city,
      day: schedule?.day ?? base.day,
      dateLabel: schedule?.dateLabel,
      startDate: schedule?.startDate,
      time: schedule?.time ?? base.time,
      price: formatPrice(price?.amount as string | undefined, price?.currency as string | undefined, base.price),
      capacity: quantity ?? base.capacity,
      seatsLeft: unsold ?? base.seatsLeft,
      wixEventId: String(event._id || ""),
      wixEventSlug: slug,
      wixTicketDefinitionId: String(ticket?._id || "") || undefined,
      source: "wix",
    };
  });
}
