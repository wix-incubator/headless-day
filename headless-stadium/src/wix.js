// ---------------------------------------------------------------------------
// Wix Headless commerce layer — Stores checkout today, Events when configured.
//
// Two purchase paths share buySeat():
//
//   Stores (active) — the catalog holds one product per price tier. "Buy this
//     seat" adds the tier's product to the visitor's cart and redirects to the
//     Wix hosted checkout. This works against the currently-connected site.
//
//   Events (opt-in) — set WIX_EVENT_SLUG once the Wix Events app is installed
//     and an event + ticket definitions exist. The match data (title, kickoff,
//     venue, prices) then comes from the live event, and "Buy this seat"
//     becomes a real ticket reservation -> hosted events checkout.
//
// The clientId is the public OAuth app id from wix.config.json — not a secret.
// ---------------------------------------------------------------------------

// Your headless OAuth app id — set VITE_WIX_CLIENT_ID in .env (see .env.example).
const WIX_CLIENT_ID = import.meta.env.VITE_WIX_CLIENT_ID;
if (!WIX_CLIENT_ID) {
  console.warn('[wix] VITE_WIX_CLIENT_ID is not set — live data and checkout are disabled');
}
// The Wix Stores app id — a platform-wide constant, identical on every site.
const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

// Which Wix Event to show, by its URL slug. Leave empty to run on the
// simulated event data with the Stores checkout.
const WIX_EVENT_SLUG = '';

// The free watch-party at Wix Campus — a live Wix Events RSVP event.
const WATCH_PARTY_SLUG = 'watch-the-final-at-wix-campus';

// The SDK is code-split behind a dynamic import and built on first use, so its
// ~250 kB never lands on the critical path — the arena renders first, commerce
// loads when the visitor is idle or actually buys something.
let clientPromise = null;

function getClient() {
  clientPromise ??= (async () => {
    const [sdk, stores, ecom, events, redirectsMod] = await Promise.all([
      import('@wix/sdk'),
      import('@wix/stores'),
      import('@wix/ecom'),
      import('@wix/events'),
      import('@wix/redirects'),
    ]);
    return sdk.createClient({
      modules: {
        productsV3: stores.productsV3,
        readOnlyVariantsV3: stores.readOnlyVariantsV3,
        currentCart: ecom.currentCart,
        wixEventsV2: events.wixEventsV2,
        ticketDefinitionsV2: events.ticketDefinitionsV2,
        orders: events.orders,
        rsvpV2: events.rsvpV2,
        redirects: redirectsMod.redirects,
      },
      auth: sdk.OAuthStrategy({ clientId: WIX_CLIENT_ID }),
    });
  })();
  return clientPromise;
}

// ---------------------------------------------- watch party (Events, RSVP)

let watchPartyPromise = null;

// The free "watch it at Wix Campus" screening — reads the live RSVP event.
// Returns null when the event is missing/closed so the UI can hide the CTA.
export function fetchWatchParty() {
  watchPartyPromise ??= loadWatchParty().catch((err) => {
    console.warn('[wix] watch-party event unavailable:', err?.message ?? err);
    watchPartyPromise = null; // allow a retry on the next call
    return null;
  });
  return watchPartyPromise;
}

async function loadWatchParty() {
  const client = await getClient();
  const { event } = await client.wixEventsV2.getEventBySlug(WATCH_PARTY_SLUG, {
    fields: ['DETAILS', 'TEXTS', 'REGISTRATION'],
  });
  if (!event?._id || event.registration?.registrationDisabled) return null;
  return {
    eventId: event._id,
    title: event.title,
    blurb: event.shortDescription ?? '',
    when: event.dateAndTimeSettings?.formatted?.dateAndTime ?? '',
    venue: event.location?.name ?? 'Wix Campus',
  };
}

// Free registration — the built-in RSVP form fields, nothing more.
export async function registerForWatchParty({ firstName, lastName, email }) {
  const party = await fetchWatchParty();
  if (!party) throw new Error('Watch party registration is unavailable right now');
  const client = await getClient();
  await client.rsvpV2.createRsvp({
    eventId: party.eventId,
    firstName,
    lastName,
    email,
    status: 'YES',
  });
}

// ------------------------------------------------------- live event (Events)

let wixEventPromise = null;

// Returns the live event shaped for data.js, or null when Events is not
// configured / unavailable. Never throws — a live outage must not break the
// concept demo, it just falls back to simulated data.
export function fetchWixEvent() {
  if (!WIX_EVENT_SLUG) return Promise.resolve(null);
  wixEventPromise ??= loadWixEvent().catch((err) => {
    console.warn('[wix] live event unavailable, using simulated data:', err?.message ?? err);
    wixEventPromise = null; // allow a retry on the next call
    return null;
  });
  return wixEventPromise;
}

async function loadWixEvent() {
  const client = await getClient();
  const { event } = await client.wixEventsV2.getEventBySlug(WIX_EVENT_SLUG);
  if (!event?._id) return null;

  const { items } = await client.ticketDefinitionsV2
    .queryTicketDefinitions()
    .eq('eventId', event._id)
    .find();

  const tiers = (items ?? []).map((def) => ({
    ticketDefinitionId: def._id,
    name: def.name ?? '',
    blurb: def.description ?? '',
    price: ticketPrice(def),
  }));

  const dt = event.dateAndTimeSettings;
  return {
    eventId: event._id,
    slug: event.slug ?? WIX_EVENT_SLUG,
    competition: event.title ?? null,
    kickoff: formatKickoff(dt),
    startsAt: dt?.startDate ? new Date(dt.startDate).toISOString() : null,
    endsAt: dt?.endDate ? new Date(dt.endDate).toISOString() : null,
    venue: venueName(event.location),
    tiers,
  };
}

// ------------------------------------------------------ tickets (Stores path)

// tierName -> { catalogItemId, variantId }, resolved lazily on first purchase.
let ticketMapPromise = null;

async function resolveTicketMap(priceTiers) {
  const client = await getClient();
  const { items } = await client.productsV3.queryProducts().limit(50).find();
  const map = {};
  for (const tier of priceTiers) {
    const product = items.find((p) => p.name && p.name.includes(tier.name));
    if (!product) continue;
    // Variants are a separate read-only resource; single-variant products
    // still need the variantId or the cart add silently no-ops.
    const res = await client.readOnlyVariantsV3
      .queryVariants()
      .eq('productData.productId', product._id)
      .find();
    const variant = res.items[0];
    if (!variant) continue;
    map[tier.id] = {
      catalogItemId: product._id,
      variantId: variant.variantId ?? variant._id,
    };
  }
  return map;
}

// Warm both lookups in the background so the first "Buy this seat" click
// doesn't pay the network latency. Failures are fine — buySeat retries.
export function preloadTickets(priceTiers) {
  fetchWixEvent().catch(() => {});
  ticketMapPromise ??= resolveTicketMap(priceTiers).catch((err) => {
    ticketMapPromise = null; // allow a retry on the next attempt
    throw err;
  });
  return ticketMapPromise;
}

// --------------------------------------------------------------- buy a seat

// Returns the hosted-checkout URL to redirect the buyer to. Uses the Events
// reservation flow when a live event is wired up, the Stores cart otherwise.
export async function buySeat(event, tierId) {
  const tier = event.priceTiers.find((t) => t.id === tierId);
  if (event.eventId && tier?.ticketDefinitionId) {
    return buyEventTicket(event, tier.ticketDefinitionId);
  }
  return buyStoresTicket(event, tierId);
}

async function buyEventTicket(event, ticketDefinitionId) {
  const client = await getClient();
  const reservation = await client.orders.createReservation(event.eventId, {
    ticketQuantities: [{ ticketDefinitionId, quantity: 1 }],
  });
  const session = await client.redirects.createRedirectSession({
    eventsCheckout: { reservationId: reservation._id, eventSlug: event.slug },
    callbacks: {
      postFlowUrl: window.location.origin,
      thankYouPageUrl: window.location.origin,
    },
  });
  return session.redirectSession.fullUrl;
}

async function buyStoresTicket(event, tierId) {
  const map = await preloadTickets(event.priceTiers);
  const ticket = map[tierId];
  if (!ticket) throw new Error(`No ticket product found for tier "${tierId}"`);

  const client = await getClient();
  await client.currentCart.addToCurrentCart({
    lineItems: [
      {
        quantity: 1,
        catalogReference: {
          catalogItemId: ticket.catalogItemId,
          appId: STORES_APP_ID,
          options: { variantId: ticket.variantId },
        },
      },
    ],
  });

  const checkout = await client.currentCart.createCheckoutFromCurrentCart({
    channelType: client.currentCart.ChannelType.WEB,
  });
  const session = await client.redirects.createRedirectSession({
    ecomCheckout: { checkoutId: checkout.checkoutId },
    callbacks: {
      postFlowUrl: window.location.origin,
      thankYouPageUrl: window.location.origin,
    },
  });
  return session.redirectSession.fullUrl;
}

// --------------------------------------------------------------- helpers

function ticketPrice(def) {
  const pm = def.pricingMethod;
  const raw = pm?.fixedPrice?.value ?? pm?.guestPrice?.value;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatKickoff(dt) {
  const start = dt?.startDate;
  if (!start) return null;
  try {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: dt.timeZoneId || undefined,
    }).format(new Date(start));
  } catch {
    return null;
  }
}

function venueName(loc) {
  if (!loc) return null;
  return loc.name || loc.address?.formatted || null;
}
