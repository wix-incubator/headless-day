import { ApiKeyStrategy, createClient } from "@wix/sdk";
import { rsvpV2, wixEventsV2 } from "@wix/events";
import { seedEvents, type EventsSource, type StoryEvent } from "./events-data";

type WixEvent = wixEventsV2.Event;

type WixConfig = {
  apiKey: string;
  siteId?: string;
  accountId?: string;
};

type LoadStoryEventsResult = {
  events: StoryEvent[];
  source: EventsSource;
};

type RsvpInput = {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
};

const eventIcons = ["💾", "🖥", "📘", "💿", "☎", "🧰", "🪟", "⌨"];

export function isWixEventsConfigured() {
  return Boolean(getWixConfig());
}

export async function loadStoryEvents(): Promise<LoadStoryEventsResult> {
  const client = getWixClient();

  if (!client) {
    return { events: seedEvents, source: "demo" };
  }

  try {
    const result = await client.wixEventsV2
      .queryEvents({ fields: ["DETAILS", "REGISTRATION", "URLS"] })
      .in("status", ["UPCOMING", "STARTED"])
      .ascending("dateAndTimeSettings.startDate")
      .limit(12)
      .find();

    const events = result.items.map(mapWixEvent).filter(Boolean);

    if (!events.length) {
      return { events: seedEvents, source: "demo" };
    }

    return { events, source: "wix" };
  } catch (error) {
    console.error("Failed to load Wix Events", error);
    return { events: seedEvents, source: "demo" };
  }
}

export async function createWixRsvp({
  eventId,
  firstName,
  lastName,
  email,
}: RsvpInput) {
  const client = getWixClient();

  if (!client) {
    return {
      mode: "demo",
      message:
        "Demo RSVP saved locally. Add Wix API credentials to send it into Wix Events.",
    };
  }

  // The generated type marks additionalGuestDetails as required, but Wix rejects
  // those fields when the event form does not include additional guests.
  const rsvp = {
    eventId,
    email,
    firstName,
    lastName,
    status: "YES",
  } as unknown as Parameters<typeof client.rsvpV2.createRsvp>[0];

  await client.rsvpV2.createRsvp(rsvp);

  return {
    mode: "wix",
    message: "RSVP sent to Wix Events.",
  };
}

function getWixClient() {
  const config = getWixConfig();

  if (!config) {
    return null;
  }

  return createClient({
    modules: { wixEventsV2, rsvpV2 },
    auth: ApiKeyStrategy(
      config.siteId
        ? { apiKey: config.apiKey, siteId: config.siteId }
        : { apiKey: config.apiKey, accountId: config.accountId ?? "" },
    ),
  });
}

function getWixConfig(): WixConfig | null {
  const apiKey = process.env.WIX_API_KEY;
  const siteId = process.env.WIX_SITE_ID;
  const accountId = process.env.WIX_ACCOUNT_ID;

  if (!apiKey || (!siteId && !accountId)) {
    return null;
  }

  return { apiKey, siteId, accountId };
}

function mapWixEvent(event: WixEvent, index: number): StoryEvent | null {
  if (!event._id || !event.title) {
    return null;
  }

  const formatted = event.dateAndTimeSettings?.formatted;
  const venue = formatVenue(event);
  const status = formatStatus(event);
  const summary =
    event.shortDescription?.trim() ||
    "A live story from programmers who shipped software before AI copilots joined the room.";

  return {
    id: event._id,
    title: event.title,
    date: formatted?.startDate || formatDate(event.dateAndTimeSettings?.startDate),
    time: formatted?.startTime || formatTime(event.dateAndTimeSettings?.startDate),
    venue,
    speaker: "Wix Events guest speaker",
    icon: eventIcons[index % eventIcons.length],
    status,
    summary,
    story: summary,
    eventPageUrl: event.eventPageUrl,
  };
}

function formatVenue(event: WixEvent) {
  const location = event.location;

  if (!location) {
    return "Venue TBA";
  }

  if (location.name) {
    return location.name;
  }

  if (location.locationTbd) {
    return "Venue TBA";
  }

  if (location.type === "ONLINE") {
    return "Online";
  }

  const address = location.address;
  const parts = [
    address?.addressLine1,
    address?.city,
    address?.country,
  ].filter(Boolean);

  return parts.join(", ") || "Venue TBA";
}

function formatStatus(event: WixEvent) {
  const rsvps = event.summaries?.rsvps;

  if (rsvps?.yesCount !== undefined) {
    return `${rsvps.yesCount} RSVP${rsvps.yesCount === 1 ? "" : "s"}`;
  }

  if (event.registration?.status) {
    return event.registration.status.replaceAll("_", " ").toLowerCase();
  }

  return event.status?.toLowerCase() || "open";
}

function formatDate(date?: Date | string | null) {
  if (!date) {
    return "Date TBA";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
  }).format(new Date(date));
}

function formatTime(date?: Date | string | null) {
  if (!date) {
    return "Time TBA";
  }

  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getWixErrorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error
    ? (error.status as number)
    : undefined;
}

export function getWixErrorMessage(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const response = "response" in error ? error.response : null;

  if (typeof response !== "object" || response === null || !("data" in response)) {
    return null;
  }

  const data = response.data;

  if (typeof data !== "object" || data === null || !("message" in data)) {
    return null;
  }

  return typeof data.message === "string" && data.message.trim()
    ? data.message
    : null;
}
