import { useMemo, useState, type FormEvent } from "react";
import { createClient, OAuthStrategy } from "@wix/sdk";
import { availabilityTimeSlots, bookings } from "@wix/bookings";
import { redirects } from "@wix/redirects";
import { trackEvent } from "../utils/analytics";
import { formatMoney, RENTALS_APP_ID } from "../utils/rentals";

const SESSION_KEY = "wix_session";
const SITE_TIMEZONE = "America/Los_Angeles";

interface BookRentalProps {
  clientId: string;
  serviceId: string;
  serviceName: string;
  scheduleId?: string;
  pricePerDay: number;
  currency: string;
  minDays: number;
  maxDays: number;
  primaryResourceType?: string;
  unitType?: "HOUR" | "DAY";
}

type TimeSlotLike = {
  serviceId?: string | null;
  scheduleId?: string | null;
  localStartDate?: string | null;
  localEndDate?: string | null;
  bookable?: boolean | null;
  location?: {
    _id?: string | null;
    id?: string | null;
    name?: string | null;
    formattedAddress?: string | null;
    locationType?: string | null;
  };
  availableResources?: Array<{
    resources?: Array<{ _id?: string; id?: string; name?: string | null }>;
  }>;
};

type BookedSlot = {
  serviceId: string;
  scheduleId?: string;
  startDate: string;
  endDate: string;
  timezone: string;
  resource?: { _id: string; name?: string };
  location?: {
    _id?: string;
    name?: string;
    formattedAddress?: string;
    locationType: "OWNER_BUSINESS" | "OWNER_CUSTOM" | "CUSTOM";
  };
};

function readTokens() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeTokens(tokens: unknown) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
  } catch {
    /* storage may be blocked */
  }
}

function createWixClient(clientId: string) {
  return createClient({
    modules: { availabilityTimeSlots, bookings, redirects },
    auth: OAuthStrategy({
      clientId,
      tokens: readTokens(),
    }),
  });
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function zonedNow() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    dateTime: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`,
  };
}

function addCalendarDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function addHoursToLocalDateTime(local: string, hours: number) {
  const [datePart, timePart = "00:00:00"] = local.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0));
  next.setUTCHours(next.getUTCHours() + hours);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}T${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`;
}

function todayIsoDate() {
  return zonedNow().date;
}

function mapLocationType(
  type?: string | null,
): "OWNER_BUSINESS" | "OWNER_CUSTOM" | "CUSTOM" | undefined {
  if (type === "BUSINESS" || type === "OWNER_BUSINESS") return "OWNER_BUSINESS";
  if (type === "CUSTOM" || type === "OWNER_CUSTOM") return "OWNER_CUSTOM";
  if (type === "CUSTOMER") return "CUSTOM";
  return undefined;
}

function slotDateKey(localStart?: string | null) {
  return localStart?.slice(0, 10) ?? "";
}

function localKey(value?: string | null) {
  return value?.slice(0, 19) ?? "";
}

function firstResource(slot: TimeSlotLike) {
  const resource = slot.availableResources?.flatMap((group) => group.resources ?? [])[0];
  const id = resource?._id ?? resource?.id;
  if (!id) return undefined;
  return { _id: id, name: resource?.name ?? undefined };
}

function availabilityLocation(slot: TimeSlotLike) {
  const loc = slot.location;
  if (!loc) return undefined;
  const id = loc._id ?? loc.id ?? undefined;
  const rawType = loc.locationType;
  const locationType =
    rawType === "OWNER_BUSINESS" || rawType === "BUSINESS"
      ? ("BUSINESS" as const)
      : rawType === "OWNER_CUSTOM" || rawType === "CUSTOM"
        ? ("CUSTOM" as const)
        : rawType === "CUSTOMER"
          ? ("CUSTOMER" as const)
          : id
            ? ("BUSINESS" as const)
            : undefined;
  if (!locationType && !id) return undefined;
  return {
    _id: id,
    name: loc.name ?? undefined,
    formattedAddress: loc.formattedAddress ?? undefined,
    locationType,
  };
}

function toBookedSlot(
  slot: TimeSlotLike,
  timezone: string,
  serviceId: string,
  scheduleId: string | undefined,
  endOverride: string,
): BookedSlot | undefined {
  const startDate = slot.localStartDate;
  if (!startDate) return undefined;
  const resource = firstResource(slot);
  const locationType = mapLocationType(slot.location?.locationType) ?? (slot.location?._id || slot.location?.id ? "OWNER_BUSINESS" : undefined);
  return {
    serviceId: slot.serviceId ?? serviceId,
    scheduleId: slot.scheduleId ?? scheduleId,
    startDate,
    endDate: endOverride,
    timezone,
    resource,
    location: locationType
      ? {
          _id: slot.location?._id ?? slot.location?.id ?? undefined,
          name: slot.location?.name ?? undefined,
          formattedAddress: slot.location?.formattedAddress ?? undefined,
          locationType,
        }
      : undefined,
  };
}

function nestedErrorCode(err: unknown): string {
  const walk = (value: unknown, depth = 0): string => {
    if (!value || typeof value !== "object" || depth > 4) return "";
    const record = value as Record<string, unknown>;
    const direct = record.code;
    if (typeof direct === "string" && direct) return direct;
    if (typeof direct === "number") return String(direct);
    const nested = record.applicationError ?? record.details ?? record.data;
    return walk(nested, depth + 1);
  };
  return walk(err);
}

function bookingErrorMessage(err: unknown) {
  const details =
    err && typeof err === "object"
      ? (err as { details?: { applicationError?: { code?: string | number } }; message?: string })
      : undefined;
  const code = String(nestedErrorCode(err) || details?.details?.applicationError?.code || "");
  const message = String(details?.message ?? "");
  if (code === "NO_AVAILABILITY" || message === "NO_AVAILABILITY") {
    return "Those dates aren't open to book. Try another start day.";
  }
  if (code === "DURATION_DOESNT_FIT" || message === "DURATION_DOESNT_FIT") {
    return "That length doesn't fit the remaining hours today. Try fewer hours or another day.";
  }
  if (code.includes("SLOT_NOT_AVAILABLE") || /slot/i.test(message)) {
    return "Those dates are already taken. Try another start day.";
  }
  if (code.includes("INVALID_DURATION")) {
    return "That length is outside the allowed window. Pick a shorter session.";
  }
  if (code.includes("PREMIUM_VALIDATION_FAILED") || code.includes("accept_payment_feature_missing")) {
    return "Wix won't take payment on a Free plan. Upgrade this site and connect Accept Payments, then try again.";
  }
  if (code === "404" || code.includes("NOT_FOUND")) {
    const stage =
      err && typeof err === "object" ? (err as { stage?: string }).stage : undefined;
    if (stage === "checkout") {
      return "Wix held the time but couldn't open checkout. Refresh and try once more.";
    }
    return "Wix couldn't create that booking. Refresh and try another start time.";
  }
  return "Could not open checkout. Check the browser console for the Wix error.";
}

function visitorAccessToken(client: ReturnType<typeof createWixClient>) {
  return client.auth.getTokens()?.accessToken?.value;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function entityId(value: unknown): string | undefined {
  const record = asRecord(value);
  const nested = asRecord(record.checkout ?? record.cart ?? record);
  const id = nested._id ?? nested.id;
  return typeof id === "string" && id ? id : undefined;
}

async function postWixJson(url: string, token: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(`HTTP ${response.status}`), {
      details: data,
      status: response.status,
    });
  }
  return data;
}

async function createRentalsCheckout(token: string, bookingId: string) {
  const line = {
    quantity: 1,
    catalogReference: {
      appId: RENTALS_APP_ID,
      catalogItemId: bookingId,
    },
  };
  const checkoutBody = { channelType: "WEB", lineItems: [line] };
  const cartBody = { catalogItems: [line] };
  const attempts: Array<{ url: string; body: unknown; kind: "checkout" | "cart" }> = [
    { kind: "checkout", url: "https://www.wixapis.com/ecom/v1/checkouts", body: checkoutBody },
    { kind: "checkout", url: "https://edge.wixapis.com/ecom/v1/checkouts", body: checkoutBody },
    { kind: "cart", url: "https://www.wixapis.com/ecom/v2/carts", body: cartBody },
    { kind: "cart", url: "https://edge.wixapis.com/ecom/v2/carts", body: cartBody },
  ];

  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      const data = await postWixJson(attempt.url, token, attempt.body);
      const id = entityId(data);
      if (id) return { kind: attempt.kind, id };
    } catch (err) {
      lastError = err;
    }
  }
  throw Object.assign(lastError instanceof Error ? lastError : new Error("Checkout failed"), {
    stage: "checkout",
  });
}

async function fetchCheckoutPageUrl(token: string, checkoutOrCart: { kind: "checkout" | "cart"; id: string }) {
  const urls =
    checkoutOrCart.kind === "cart"
      ? [
          `https://www.wixapis.com/ecom/v2/carts/${checkoutOrCart.id}/get-checkout-url`,
          `https://edge.wixapis.com/ecom/v2/carts/${checkoutOrCart.id}/get-checkout-url`,
        ]
      : [
          `https://www.wixapis.com/ecom/v1/checkouts/${checkoutOrCart.id}/checkout-url`,
          `https://www.wixapis.com/ecom/v1/checkouts/${checkoutOrCart.id}/wix-checkout-url`,
          `https://edge.wixapis.com/ecom/v1/checkouts/${checkoutOrCart.id}/checkout-url`,
        ];
  for (const url of urls) {
    try {
      const data = await postWixJson(url, token, {});
      const record = asRecord(data);
      const checkoutUrl = record.checkoutUrl ?? record.checkoutURL;
      if (typeof checkoutUrl === "string" && checkoutUrl) return checkoutUrl;
    } catch {
      /* try the next documented host */
    }
  }
  return undefined;
}

export default function BookRental({
  clientId,
  serviceId,
  serviceName,
  scheduleId,
  pricePerDay,
  currency,
  minDays,
  maxDays,
  primaryResourceType,
  unitType = "HOUR",
}: BookRentalProps) {
  const isHourly = unitType === "HOUR";
  const durationOptions = useMemo(() => {
    if (isHourly) {
      const start = Math.max(1, Math.min(8, minDays || 1));
      const end = Math.max(start, Math.min(8, maxDays || 8));
      const hours = [1, 2, 4, 8].filter((value) => value >= start && value <= end);
      return hours.length > 0 ? hours : [start];
    }
    const start = Math.max(1, Math.min(8, minDays || 1));
    const end = Math.max(start, Math.min(8, maxDays || 3));
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [isHourly, minDays, maxDays]);

  const minDate = isHourly ? todayIsoDate() : addCalendarDays(todayIsoDate(), 1);
  const [startDate, setStartDate] = useState(minDate);
  const [durationDays, setDurationDays] = useState(durationOptions[0] ?? 1);
  const [status, setStatus] = useState<"idle" | "booking" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const preview = formatMoney(pricePerDay * durationDays, currency);

  const handleBook = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("booking");
    setError(null);

    const timezone = SITE_TIMEZONE;
    const now = zonedNow();
    const bookingStart =
      !isHourly && startDate === now.date ? addCalendarDays(startDate, 1) : startDate;
    const fromLocalDate =
      bookingStart === now.date ? now.dateTime : `${bookingStart}T00:00:00`;
    const toLocalDate = `${addCalendarDays(bookingStart, isHourly ? 1 : durationDays)}T00:00:00`;
    const dayEnd = `${addCalendarDays(bookingStart, 1)}T00:00:00`;

    try {
      const client = createWixClient(clientId);
      if (!readTokens()) {
        await client.auth.generateVisitorTokens();
        writeTokens(client.auth.getTokens());
      }

      const availability = await client.availabilityTimeSlots.listAvailabilityTimeSlots({
        serviceId,
        fromLocalDate,
        toLocalDate,
        timeZone: timezone,
        bookable: true,
        timeSlotsPerDay: isHourly ? 48 : 1,
        includeResourceTypeIds: primaryResourceType ? [primaryResourceType] : undefined,
      });
      writeTokens(client.auth.getTokens());

      const slots = ((availability.timeSlots ?? []) as TimeSlotLike[]).filter(
        (slot) => slot.bookable !== false,
      );

      let bookedSlot: BookedSlot | undefined;
      if (isHourly) {
        const firstFit = slots.find((slot) => {
          if (!slot.localStartDate || slotDateKey(slot.localStartDate) !== bookingStart) return false;
          const end = addHoursToLocalDateTime(slot.localStartDate, durationDays);
          return end <= dayEnd;
        });
        if (slots.length > 0 && !firstFit) {
          throw Object.assign(new Error("DURATION_DOESNT_FIT"), {
            details: { applicationError: { code: "DURATION_DOESNT_FIT" } },
          });
        }
        if (firstFit?.localStartDate) {
          const location = availabilityLocation(firstFit);
          if (!location) {
            throw Object.assign(new Error("NO_AVAILABILITY"), {
              details: { applicationError: { code: "NO_AVAILABILITY" } },
            });
          }

          const wantedEnd = addHoursToLocalDateTime(firstFit.localStartDate, durationDays);
          const ends = await client.availabilityTimeSlots.listAvailabilityTimeSlotEndOptions(serviceId, {
            localStartDate: firstFit.localStartDate,
            timeZone: timezone,
            location,
          });
          writeTokens(client.auth.getTokens());

          const endOptions = ((ends.endOptions ?? []) as TimeSlotLike[]).filter(
            (option) => option.bookable !== false,
          );
          const matchingEnd = endOptions.find((option) => localKey(option.localEndDate) === localKey(wantedEnd));
          if (!matchingEnd?.localEndDate) {
            throw Object.assign(new Error("DURATION_DOESNT_FIT"), {
              details: { applicationError: { code: "DURATION_DOESNT_FIT" } },
            });
          }

          const detailed = await client.availabilityTimeSlots.getAvailabilityTimeSlot(
            serviceId,
            firstFit.localStartDate,
            matchingEnd.localEndDate,
            timezone,
            location,
            { includeResourceTypeIds: primaryResourceType ? [primaryResourceType] : undefined },
          );
          writeTokens(client.auth.getTokens());

          const detailedSlot = (detailed.timeSlot ?? firstFit) as TimeSlotLike;
          bookedSlot = toBookedSlot(
            { ...firstFit, ...detailedSlot, location: detailedSlot.location ?? firstFit.location },
            timezone,
            serviceId,
            scheduleId,
            matchingEnd.localEndDate,
          );
        }
      } else {
        const consecutive: TimeSlotLike[] = [];
        for (let offset = 0; offset < durationDays; offset += 1) {
          const key = addCalendarDays(bookingStart, offset);
          const match = slots.find((slot) => slotDateKey(slot.localStartDate) === key);
          if (!match) break;
          consecutive.push(match);
        }
        if (consecutive.length === durationDays) {
          const startSlot = consecutive[0];
          const last = consecutive[consecutive.length - 1];
          const endDate = last.localEndDate ?? toLocalDate;
          const location = availabilityLocation(startSlot);
          if (!location || !startSlot.localStartDate) {
            throw Object.assign(new Error("NO_AVAILABILITY"), {
              details: { applicationError: { code: "NO_AVAILABILITY" } },
            });
          }
          const detailed = await client.availabilityTimeSlots.getAvailabilityTimeSlot(
            serviceId,
            startSlot.localStartDate,
            endDate,
            timezone,
            location,
            { includeResourceTypeIds: primaryResourceType ? [primaryResourceType] : undefined },
          );
          writeTokens(client.auth.getTokens());
          const detailedSlot = (detailed.timeSlot ?? startSlot) as TimeSlotLike;
          bookedSlot = toBookedSlot(
            { ...startSlot, ...detailedSlot, location: detailedSlot.location ?? startSlot.location },
            timezone,
            serviceId,
            scheduleId,
            endDate,
          );
        }
      }

      if (!bookedSlot) {
        throw Object.assign(new Error("NO_AVAILABILITY"), { details: { applicationError: { code: "NO_AVAILABILITY" } } });
      }

      if (!bookedSlot.resource) {
        throw Object.assign(new Error("NO_AVAILABILITY"), { details: { applicationError: { code: "NO_AVAILABILITY" } } });
      }

      if (!bookedSlot.scheduleId) {
        throw new Error("Missing schedule");
      }

      trackEvent("InitiateCheckout", {
        id: serviceId,
        name: serviceName,
        price: pricePerDay * durationDays,
        currency,
        quantity: durationDays,
        origin: "Rental Detail",
      });

      const created = await client.bookings.createBooking({
        totalParticipants: 1,
        selectedPaymentOption: "ONLINE",
        bookedEntity: {
          slot: {
            serviceId: bookedSlot.serviceId,
            scheduleId: bookedSlot.scheduleId,
            startDate: bookedSlot.startDate,
            endDate: bookedSlot.endDate,
            timezone: bookedSlot.timezone,
            resource: bookedSlot.resource,
            location: bookedSlot.location,
          },
        },
      });
      writeTokens(client.auth.getTokens());

      const bookingId = created.booking?._id ?? (created.booking as { id?: string } | undefined)?.id;
      if (!bookingId) {
        throw new Error("Missing booking ID");
      }

      const token = visitorAccessToken(client);
      if (!token) {
        throw Object.assign(new Error("Missing visitor session"), { stage: "checkout" });
      }

      let paidCheckout: { kind: "checkout" | "cart"; id: string };
      try {
        paidCheckout = await createRentalsCheckout(token, bookingId);
      } catch (checkoutError) {
        throw Object.assign(
          checkoutError instanceof Error ? checkoutError : new Error("Checkout failed"),
          { stage: "checkout" },
        );
      }

      const thankYouPageUrl = `${window.location.origin}/thank-you`;
      if (paidCheckout.kind === "checkout") {
        try {
          const { redirectSession } = await client.redirects.createRedirectSession({
            ecomCheckout: { checkoutId: paidCheckout.id },
            callbacks: {
              postFlowUrl: thankYouPageUrl,
              thankYouPageUrl,
            },
          });
          writeTokens(client.auth.getTokens());
          if (redirectSession?.fullUrl) {
            window.location.href = redirectSession.fullUrl;
            return;
          }
        } catch (redirectError) {
          console.error("[rentals] ecom redirect session failed:", redirectError);
        }
      }

      const url = await fetchCheckoutPageUrl(token, paidCheckout);
      if (!url) {
        throw Object.assign(new Error("Missing checkout URL"), { stage: "checkout" });
      }
      window.location.href = url;
    } catch (err) {
      console.error("[rentals] checkout redirect failed:", err);
      setError(bookingErrorMessage(err));
      setStatus("error");
    }
  };

  return (
    <form className="book-rental" onSubmit={handleBook}>
      <label className="book-field">
        <span className="book-label">Start date</span>
        <input
          className="book-input"
          type="date"
          min={minDate}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          required
        />
      </label>

      <fieldset className="book-field">
        <legend className="book-label">{isHourly ? "How long?" : "How many days?"}</legend>
        <div className="duration-pills">
          {durationOptions.map((days) => {
            const selected = days === durationDays;
            const label = isHourly
              ? `${days} ${days === 1 ? "hour" : "hours"}`
              : `${days} ${days === 1 ? "day" : "days"}`;
            return (
              <button
                key={days}
                type="button"
                className={`duration-pill${selected ? " selected" : ""}`}
                aria-pressed={selected}
                onClick={() => setDurationDays(days)}
              >
                {label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <p className="price-preview">
        <span className="price-preview-label">Looks like</span>
        <span className="rental-price">{preview}</span>
        <span className="price-preview-note">
          {formatMoney(pricePerDay, currency)} × {durationDays}
          {isHourly
            ? durationDays === 1
              ? " hour"
              : " hours"
            : durationDays === 1
              ? " day"
              : " days"}
        </span>
      </p>

      {error && (
        <p className="book-error" role="alert">
          {error}
        </p>
      )}

      <button className="book-btn" type="submit" disabled={status === "booking"}>
        {status === "booking" ? "Opening checkout…" : "Book this ride"}
      </button>
    </form>
  );
}
