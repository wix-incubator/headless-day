/**
 * Optional: create the 8 sample listening rooms as Wix Events (+ one paid ticket
 * each) on your site, so the app has real data to load.
 *
 * Prereqs (see WIX_SETUP.md):
 *   - Wix Events installed on the site
 *   - An API key with the "Wix Events" permission
 *   - Your site's metaSiteId
 *
 * Run:
 *   node --env-file=.env.local scripts/seed-wix-events.mjs
 *
 * Note: Wix Events field shapes shift slightly across SDK minor versions. If a
 * call is rejected, adjust the offending field — the structure below matches
 * @wix/events at the version pinned in package.json. Each step is isolated in
 * try/catch so one failure doesn't abort the whole run.
 */
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { wixEventsV2, ticketDefinitions } from "@wix/events";

const { WIX_API_KEY, WIX_SITE_ID } = process.env;

if (!WIX_API_KEY || !WIX_SITE_ID) {
  console.error("✗ Set WIX_API_KEY and WIX_SITE_ID in .env.local first (see WIX_SETUP.md).");
  process.exit(1);
}

const client = createClient({
  modules: { wixEventsV2, ticketDefinitions },
  auth: ApiKeyStrategy({ apiKey: WIX_API_KEY, siteId: WIX_SITE_ID }),
});

// Slugs match src/data/rooms.ts so the app can merge its editorial extras.
// Prices are USD — the site's currency.
const SAMPLE = [
  { title: "Blue Note After Dark", city: "Warsaw", tz: "Europe/Warsaw", price: "18", currency: "USD", cap: 8, days: 5, hour: 21 },
  { title: "Radiohead: In Rainbows, Full Album", city: "Berlin", tz: "Europe/Berlin", price: "18", currency: "USD", cap: 12, days: 6, hour: 20 },
  { title: "90s Hip-Hop on Wax", city: "London", tz: "Europe/London", price: "15", currency: "USD", cap: 20, days: 4, hour: 22 },
  { title: "Ambient Sunday Session", city: "Lisbon", tz: "Europe/Lisbon", price: "12", currency: "USD", cap: 10, days: 7, hour: 17 },
  { title: "Japanese City Pop Evening", city: "Amsterdam", tz: "Europe/Amsterdam", price: "20", currency: "USD", cap: 14, days: 5, hour: 20 },
  { title: "Wine, Soul & Motown", city: "Paris", tz: "Europe/Paris", price: "28", currency: "USD", cap: 16, days: 6, hour: 19 },
  { title: "Man·Machine: Kraftwerk & Kin", city: "Düsseldorf", tz: "Europe/Berlin", price: "16", currency: "USD", cap: 18, days: 3, hour: 21 },
  { title: "Laurel Canyon: Rumours & Friends", city: "Kraków", tz: "Europe/Warsaw", price: "15", currency: "USD", cap: 12, days: 7, hour: 18 },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function errorMessage(err) {
  const code = err?.details?.applicationError?.code;
  if (code === 403) {
    return [
      "403 permission denied.",
      "The API key can read this site but cannot create Wix Events.",
      "Edit or create an API key with site access to this site and Wix Events write/manage permissions.",
    ].join(" ");
  }
  return (
    err?.details?.applicationError?.description ||
    code ||
    err?.response?.data?.message ||
    err?.message ||
    JSON.stringify(err, Object.getOwnPropertyNames(err), 2) ||
    String(err)
  );
}

// The SDK expects real Date objects here (it transforms them to REST timestamps).
function futureDate(daysAhead, hour) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Wix throttles rapid writes with 503s — back off and retry.
async function withRetry(fn, tries = 5) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const code = e?.details?.applicationError?.code;
      const transient = code === 503 || /service unavailable/i.test(e?.message ?? "");
      if (transient && i < tries - 1) {
        await sleep(1500 * (i + 1));
        continue;
      }
      throw e;
    }
  }
}

async function ticketCount(eventId) {
  try {
    // Note: listTicketDefinitions needs an explicit limit or it returns [].
    const res = await client.ticketDefinitions.listTicketDefinitions({
      eventId: [eventId],
      limit: 50,
    });
    return res.definitions?.length ?? 0;
  } catch {
    return -1; // unknown → let caller skip creating rather than duplicate
  }
}

/** Idempotent: reuse an existing event with the same title; ensure it has a ticket. */
async function seedOne(s, existingByTitle) {
  let event = existingByTitle.get(s.title);

  if (!event) {
    const res = await withRetry(() =>
      client.wixEventsV2.createEvent({
        title: s.title,
        shortDescription: `A ${s.city} listening room — records, played start to finish.`,
        dateAndTimeSettings: {
          startDate: futureDate(s.days, s.hour),
          endDate: futureDate(s.days, s.hour + 2),
          timeZoneId: s.tz,
        },
        location: { name: `A room in ${s.city}`, type: "VENUE" },
        registration: { initialType: "TICKETING" },
      }),
    );
    event = res.event ?? res; // createEvent returns the event directly
    await sleep(700);
  }

  // Add a paid ticket only if none exists yet. Money uses `amount` (string);
  // paid tickets require a wixFeeConfig.
  if ((await ticketCount(event._id)) === 0) {
    await withRetry(() =>
      client.ticketDefinitions.createTicketDefinition(event._id, {
        definition: {
          name: "Seat",
          description: "One seat at the listening room",
          limited: true,
          quantity: s.cap,
          wixFeeConfig: { type: "FEE_ADDED_AT_CHECKOUT" },
          pricing: { fixedPrice: { amount: s.price, currency: s.currency } },
        },
      }),
    );
  }

  return { eventId: event._id, slug: event.slug };
}

console.log(`Seeding ${SAMPLE.length} events → site ${WIX_SITE_ID}\n`);

// Reuse anything already there so re-runs don't duplicate.
const existing = (await client.wixEventsV2.queryEvents().limit(50).find()).items ?? [];
const existingByTitle = new Map(existing.map((e) => [e.title, e]));

let ok = 0;
for (const s of SAMPLE) {
  try {
    const { eventId, slug } = await seedOne(s, existingByTitle);
    ok++;
    console.log(`  ✓ ${s.title}  (id=${eventId}, slug=${slug})`);
  } catch (err) {
    console.log(`  ✗ ${s.title} — ${errorMessage(err)}`);
  }
  await sleep(700);
}
console.log(`\nDone. ${ok}/${SAMPLE.length} ready. Reload the app — the badge should read "Live from Wix".`);
