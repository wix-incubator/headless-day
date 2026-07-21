/**
 * Re-price every event's ticket in USD (the site currency). Run once:
 *   node --env-file=.env.local scripts/fix-currency.mjs
 */
import { createClient, ApiKeyStrategy } from "@wix/sdk";
import { wixEventsV2, ticketDefinitions } from "@wix/events";

const { WIX_API_KEY, WIX_SITE_ID } = process.env;
if (!WIX_API_KEY || !WIX_SITE_ID) {
  console.error("✗ Set WIX_API_KEY and WIX_SITE_ID in .env.local");
  process.exit(1);
}

const client = createClient({
  modules: { wixEventsV2, ticketDefinitions },
  auth: ApiKeyStrategy({ apiKey: WIX_API_KEY, siteId: WIX_SITE_ID }),
});

// USD price + capacity by event title.
const PLAN = {
  "Blue Note After Dark": { amount: "18", cap: 8 },
  "Radiohead: In Rainbows, Full Album": { amount: "18", cap: 12 },
  "90s Hip-Hop on Wax": { amount: "15", cap: 20 },
  "Ambient Sunday Session": { amount: "12", cap: 10 },
  "Japanese City Pop Evening": { amount: "20", cap: 14 },
  "Wine, Soul & Motown": { amount: "28", cap: 16 },
  "Man·Machine: Kraftwerk & Kin": { amount: "16", cap: 18 },
  "Laurel Canyon: Rumours & Friends": { amount: "15", cap: 12 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const events = (await client.wixEventsV2.queryEvents().limit(50).find()).items ?? [];
console.log(`Re-pricing ${events.length} events in USD\n`);

for (const ev of events) {
  const plan = PLAN[ev.title] ?? { amount: "18", cap: 10 };
  try {
    // 1. Set the event's ticket currency to USD.
    await client.ticketDefinitions.changeCurrency({ eventId: ev._id, currency: "USD" });
    await sleep(400);

    // 2. Rewrite each ticket with a clean USD price.
    const list = await client.ticketDefinitions.listTicketDefinitions({ eventId: [ev._id], limit: 50 });
    for (const def of list.definitions ?? []) {
      await client.ticketDefinitions.updateTicketDefinition(def._id, ev._id, {
        definition: {
          name: def.name || "Seat",
          description: def.description || "One seat at the listening room",
          limited: true,
          quantity: plan.cap,
          wixFeeConfig: { type: "FEE_ADDED_AT_CHECKOUT" },
          pricing: { fixedPrice: { amount: plan.amount, currency: "USD" } },
        },
      });
      await sleep(300);
    }
    console.log(`  ✓ ${ev.title} → $${plan.amount}`);
  } catch (e) {
    console.log(`  ✗ ${ev.title} — ${e?.details?.applicationError?.description || e?.message}`);
  }
  await sleep(400);
}
console.log("\nDone. Rebuild + release to bake the new prices.");
