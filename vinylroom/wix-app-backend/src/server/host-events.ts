import { ApiKeyStrategy, createClient } from "@wix/sdk";
import { ticketDefinitionsV2, wixEventsV2 } from "@wix/events";
import { files } from "@wix/media";

export type BackendConfig = {
  apiKey: string;
  siteId: string;
};

type HostEventInput = {
  title?: unknown;
  genre?: unknown;
  moods?: unknown;
  date?: unknown;
  time?: unknown;
  venue?: unknown;
  capacity?: unknown;
  price?: unknown;
  isPrivate?: unknown;
  records?: unknown;
  timeZone?: unknown;
  coverDataUrl?: unknown;
};

type TokenInfo = {
  active?: boolean;
  subjectType?: string;
  subject_type?: string;
  subjectId?: string;
  subject_id?: string;
  siteId?: string;
  site_id?: string;
};

type UploadedFile = {
  file?: {
    _id?: string;
    id?: string;
    displayName?: string;
    media?: { image?: { image?: { width?: number; height?: number } } };
  };
};

const PRODUCTION_ORIGINS = new Set([
  "https://vinylroom.online",
  "https://www.vinylroom.online",
]);

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin") ?? "";
  if (PRODUCTION_ORIGINS.has(origin)) return origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin;
  return "";
}

export function corsHeaders(request: Request) {
  const origin = allowedOrigin(request);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(request: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders(request) });
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function stringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function numberInRange(value: unknown, min: number, max: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : NaN;
}

function zonedDate(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  let instant = Date.UTC(year, month - 1, day, hour, minute);
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const parts = Object.fromEntries(
        formatter.formatToParts(new Date(instant)).map((part) => [part.type, part.value]),
      );
      const rendered = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second),
      );
      instant -= rendered - Date.UTC(year, month - 1, day, hour, minute);
    }
  } catch {
    return null;
  }
  return new Date(instant);
}

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) return "Wix could not create the event.";
  const details = error as Error & {
    details?: { applicationError?: { description?: string; code?: string | number } };
  };
  return (
    details.details?.applicationError?.description ||
    (details.details?.applicationError?.code
      ? `Wix error ${details.details.applicationError.code}`
      : error.message) ||
    "Wix could not create the event."
  );
}

function slugPart(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase()
      .slice(0, 60) || "listening-room"
  );
}

function decodeCover(value: unknown) {
  if (typeof value !== "string") return null;
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || match[1].length > 2_800_000) return null;
  try {
    const binary = atob(match[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  } catch {
    return null;
  }
}

async function verifyMember(request: Request, siteId: string) {
  const header = request.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const response = await fetch("https://www.wixapis.com/oauth2/token-info", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  if (!response.ok) return null;
  const info = (await response.json()) as TokenInfo;
  const subjectType = info.subjectType ?? info.subject_type;
  const tokenSiteId = info.siteId ?? info.site_id;
  if (!info.active || subjectType !== "MEMBER") return null;
  if (tokenSiteId && tokenSiteId !== siteId) return null;
  return info.subjectId ?? info.subject_id ?? "member";
}

function wixClient(config: BackendConfig) {
  return createClient({
    auth: ApiKeyStrategy({ apiKey: config.apiKey, siteId: config.siteId }),
    modules: {
      events: wixEventsV2,
      ticketDefinitions: ticketDefinitionsV2,
      mediaFiles: files,
    },
  }) as unknown as {
    events: {
      createEvent: typeof wixEventsV2.createEvent;
      deleteEvent: typeof wixEventsV2.deleteEvent;
    };
    ticketDefinitions: {
      createTicketDefinition: typeof ticketDefinitionsV2.createTicketDefinition;
    };
    mediaFiles: {
      generateFileUploadUrl: typeof files.generateFileUploadUrl;
    };
  };
}

async function uploadEventCover(
  client: ReturnType<typeof wixClient>,
  title: string,
  coverDataUrl: unknown,
) {
  const bytes = decodeCover(coverDataUrl);
  if (!bytes) throw new Error("The generated event cover is invalid.");
  const fileName = `${slugPart(title)}-${Date.now()}.png`;
  const { uploadUrl } = await client.mediaFiles.generateFileUploadUrl("image/png", {
    fileName,
    sizeInBytes: String(bytes.byteLength),
    private: false,
    labels: ["Vinyl Rooms", "Generated event cover"],
    filePath: "/vinyl-room-event-covers",
  });
  if (!uploadUrl) throw new Error("Wix Media did not return an event-cover upload URL.");
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: bytes,
  });
  if (!response.ok) throw new Error("Wix Media could not upload the event cover.");
  const uploaded = (await response.json()) as UploadedFile;
  const id = uploaded.file?._id ?? uploaded.file?.id;
  if (!id) throw new Error("Wix Media uploaded the cover without returning its ID.");
  const image = uploaded.file?.media?.image?.image;
  return `wix:image://v1/${id}/${encodeURIComponent(uploaded.file?.displayName || fileName)}#originWidth=${image?.width ?? 1200}&originHeight=${image?.height ?? 1200}`;
}

export async function handleHostEvent(request: Request, config: BackendConfig) {
  if (request.headers.get("origin") && !allowedOrigin(request)) {
    return json(request, { error: "Origin not allowed." }, 403);
  }
  if (!config.apiKey || !config.siteId) {
    return json(request, { error: "Event service is not configured." }, 503);
  }

  const memberId = await verifyMember(request, config.siteId).catch(() => null);
  if (!memberId) {
    return json(request, { error: "Sign in as a Wix Member to create a room." }, 401);
  }

  let body: HostEventInput;
  try {
    body = (await request.json()) as HostEventInput;
  } catch {
    return json(request, { error: "Invalid event data." }, 400);
  }

  const title = text(body.title, 120);
  const genre = text(body.genre, 40);
  const moods = stringList(body.moods, 3, 40);
  const date = text(body.date, 10);
  const time = text(body.time, 5);
  const venue = text(body.venue, 50);
  const records = stringList(body.records, 24, 120);
  const capacity = Math.round(numberInRange(body.capacity, 2, 50));
  const price = numberInRange(body.price, 0, 10000);
  const isPrivate = body.isPrivate === true;
  const timeZone = text(body.timeZone, 80) || "Europe/Warsaw";
  const startDate = zonedDate(date, time, timeZone);
  const cover = decodeCover(body.coverDataUrl);

  if (!title || !date || !time || !venue || !records.length || !startDate || !cover) {
    return json(request, { error: "Add a title, date, time, location, records, and a valid event cover." }, 400);
  }
  if (!Number.isFinite(capacity) || !Number.isFinite(price)) {
    return json(request, { error: "Capacity or ticket price is invalid." }, 400);
  }
  if (startDate.getTime() <= Date.now() + 5 * 60 * 1000) {
    return json(request, { error: "Choose a start time at least 5 minutes from now." }, 400);
  }

  const client = wixClient(config);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
  const summary = [
    genre ? `${genre} listening room.` : "Vinyl listening room.",
    moods.length ? `Mood: ${moods.join(", ")}.` : "",
    `Records: ${records.join("; ")}.`,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 500);

  let eventId = "";
  try {
    const mainImage = await uploadEventCover(client, title, body.coverDataUrl);
    const event = await client.events.createEvent(
      {
        title,
        shortDescription: summary,
        mainImage,
        dateAndTimeSettings: { startDate, endDate, timeZoneId: timeZone, showTimeZone: false },
        location: { name: venue, type: "VENUE" },
        registration: { initialType: "TICKETING" },
        guestListSettings: { displayedPublicly: false },
      },
      { draft: isPrivate },
    );
    if (!event._id) throw new Error("Wix created an event without returning its ID.");
    eventId = event._id;
    await client.ticketDefinitions.createTicketDefinition({
      eventId,
      name: "Seat",
      description: "One seat at this vinyl listening room",
      initialLimit: capacity,
      limitPerCheckout: Math.min(8, capacity),
      feeType: price === 0 ? "NO_FEE" : "FEE_ADDED_AT_CHECKOUT",
      pricingMethod: { fixedPrice: { value: price.toFixed(2), currency: "USD" } },
    });

    if (isPrivate) {
      return json(request, {
        eventId,
        slug: event.slug,
        eventPageUrl: event.eventPageUrl,
        status: "DRAFT",
        message: "Private room created as a Wix draft.",
      }, 201);
    }
    return json(request, {
      eventId,
      slug: event.slug,
      eventPageUrl: event.eventPageUrl,
      status: event.status ?? "UPCOMING",
      message: "Your listening room is live.",
    }, 201);
  } catch (error) {
    if (eventId) await client.events.deleteEvent(eventId).catch(() => undefined);
    const message = errorMessage(error);
    const permissionDenied = /permission|WIX_EVENTS\.|ExternalAppIdentity/i.test(message);
    console.error("host-events create failed", { memberId, eventId, message });
    if (isPrivate && /WIX_EVENTS\.READ_DRAFT_EVENTS/i.test(message)) {
      return json(request, {
        error: "Private rooms require the Wix draft-events permission. Switch the room to Public or grant WIX_EVENTS.READ_DRAFT_EVENTS to the backend app.",
      }, 403);
    }
    return json(request, { error: message }, permissionDenied ? 403 : 502);
  }
}
