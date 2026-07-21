#!/usr/bin/env node
// One-off CMS seeder for Vechornytsi. Creates NATIVE collections + inserts items.
// Auth via env: WIX_TOKEN, WIX_SITE_ID. Idempotent-ish: ignores "already exists".

const TOKEN = process.env.WIX_TOKEN;
const SITE_ID = process.env.WIX_SITE_ID;
const BASE = "https://www.wixapis.com/wix-data/v2";

if (!TOKEN || !SITE_ID) {
  console.error("Missing WIX_TOKEN / WIX_SITE_ID");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "wix-site-id": SITE_ID,
  "Content-Type": "application/json",
};

async function api(path, body, method = "POST") {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function createCollection(collection) {
  const r = await api("/collections", { collection });
  if (r.status === 200 || r.status === 201) {
    console.log(`  collection ${collection.id}: created`);
    return true;
  }
  const msg = JSON.stringify(r.json);
  if (r.status === 409 || /already exists|WDE0053|DUPLICATE/i.test(msg)) {
    console.log(`  collection ${collection.id}: already exists`);
    return true;
  }
  console.error(`  collection ${collection.id}: FAILED ${r.status} ${msg}`);
  return false;
}

async function bulkInsert(dataCollectionId, items) {
  const r = await api("/bulk/items/insert", {
    dataCollectionId,
    dataItems: items.map((data) => ({ data })),
    returnEntity: true,
  });
  if (r.status !== 200 && r.status !== 201) {
    console.error(`  insert ${dataCollectionId}: FAILED ${r.status} ${JSON.stringify(r.json).slice(0, 400)}`);
    return [];
  }
  const results = r.json.results || [];
  const ids = results.map((x) => x.item?.id || x.dataItem?.id).filter(Boolean);
  console.log(`  insert ${dataCollectionId}: ${ids.length} items`);
  return ids;
}

const PERM_PUBLIC = { insert: "ADMIN", update: "ADMIN", remove: "ADMIN", read: "ANYONE" };
const PERM_WAITLIST = { insert: "ANYONE", update: "ADMIN", remove: "ADMIN", read: "ADMIN" };

const collections = [
  {
    id: "Dinners",
    displayName: "Upcoming Dinners",
    permissions: PERM_PUBLIC,
    fields: [
      { key: "title", displayName: "Title", type: "TEXT", required: true },
      { key: "slug", displayName: "Slug", type: "TEXT" },
      { key: "dateISO", displayName: "Date ISO", type: "TEXT" },
      { key: "dateLabel", displayName: "Date label", type: "TEXT" },
      { key: "menuTheme", displayName: "Menu theme", type: "TEXT" },
      { key: "coursePreview", displayName: "Course preview", type: "TEXT" },
      { key: "seatsAvailable", displayName: "Seats available", type: "NUMBER" },
      { key: "seatsTotal", displayName: "Seats total", type: "NUMBER" },
      { key: "price", displayName: "Price", type: "NUMBER" },
      { key: "winePairingPrice", displayName: "Wine pairing price", type: "NUMBER" },
      { key: "status", displayName: "Status", type: "TEXT" },
      { key: "reserveSlug", displayName: "Reserve product slug", type: "TEXT" },
      { key: "sortOrder", displayName: "Sort order", type: "NUMBER" },
    ],
  },
  {
    id: "Testimonials",
    displayName: "Testimonials",
    permissions: PERM_PUBLIC,
    fields: [
      { key: "name", displayName: "Name", type: "TEXT", required: true },
      { key: "quote", displayName: "Quote", type: "TEXT" },
      { key: "detail", displayName: "Detail", type: "TEXT" },
      { key: "sortOrder", displayName: "Sort order", type: "NUMBER" },
    ],
  },
  {
    id: "Story",
    displayName: "The Table",
    permissions: PERM_PUBLIC,
    fields: [
      { key: "heading", displayName: "Heading", type: "TEXT", required: true },
      { key: "body", displayName: "Body", type: "TEXT" },
      { key: "sortOrder", displayName: "Sort order", type: "NUMBER" },
    ],
  },
  {
    id: "FaqItems",
    displayName: "FAQ",
    permissions: PERM_PUBLIC,
    fields: [
      { key: "question", displayName: "Question", type: "TEXT", required: true },
      { key: "answer", displayName: "Answer", type: "TEXT" },
      { key: "sortOrder", displayName: "Sort order", type: "NUMBER" },
    ],
  },
  {
    id: "Waitlist",
    displayName: "Waitlist Signups",
    permissions: PERM_WAITLIST,
    fields: [
      { key: "name", displayName: "Name", type: "TEXT", required: true },
      { key: "email", displayName: "Email", type: "TEXT" },
      { key: "phone", displayName: "Phone", type: "TEXT" },
      { key: "dinnerSlug", displayName: "Dinner slug", type: "TEXT" },
      { key: "dinnerTitle", displayName: "Dinner title", type: "TEXT" },
      { key: "notified", displayName: "Notified", type: "BOOLEAN" },
    ],
  },
];

const dinners = [
  { title: "Midsummer Forage", slug: "midsummer-forage", dateISO: "2026-07-18", dateLabel: "Friday 18 July 2026", menuTheme: "Wild herbs and fjord crab", coursePreview: "Seven courses built around hand-picked sea lettuce, stone crab from the estuary, and mountain sorrel gathered above the treeline. Dessert is a frozen cloudberry skyr with birch syrup.", seatsAvailable: 4, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-midsummer-forage", sortOrder: 1 },
  { title: "Late Cod Season", slug: "late-cod-season", dateISO: "2026-07-25", dateLabel: "Friday 25 July 2026", menuTheme: "Salt cod and root cellar", coursePreview: "A menu honouring the river's stockfish heritage — five preparations of cod from cured to torched, paired with cellar-kept turnips, fermented cabbage, and a bone broth poured tableside.", seatsAvailable: 12, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-late-cod-season", sortOrder: 2 },
  { title: "Birch & Ember", slug: "birch-ember", dateISO: "2026-08-01", dateLabel: "Friday 1 August 2026", menuTheme: "Smoke, birch, and river trout", coursePreview: "Seven courses over open embers — torched river trout, birch-smoked celeriac, and a charred leek broth poured at the table. Dessert is a birch-syrup custard.", seatsAvailable: 8, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-birch-ember", sortOrder: 3 },
  { title: "The Mushroom Table", slug: "mushroom-table", dateISO: "2026-08-08", dateLabel: "Friday 8 August 2026", menuTheme: "Forest floor and cultured cream", coursePreview: "A menu built entirely from what grew in the shade this week — chanterelle, hedgehog, and pine — finished with a cultured-cream tart and pickled green pine cones.", seatsAvailable: 2, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Filling", reserveSlug: "reserve-mushroom-table", sortOrder: 4 },
  { title: "Sea Buckthorn", slug: "sea-buckthorn", dateISO: "2026-08-15", dateLabel: "Friday 15 August 2026", menuTheme: "Sour, salt, and late summer", coursePreview: "Bright, acidic courses hinged on sea buckthorn foraged from the riverbank — cured mackerel, buttermilk, and a frozen sea-buckthorn parfait.", seatsAvailable: 12, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-sea-buckthorn", sortOrder: 5 },
  { title: "The Cabbage Feast", slug: "cabbage-feast", dateISO: "2026-08-22", dateLabel: "Friday 22 August 2026", menuTheme: "Ferment, brine, and slow fire", coursePreview: "Six preparations of cabbage from the boathouse cellar — raw, charred, fermented, braised — with a bone broth and a caraway ice cream.", seatsAvailable: 10, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-cabbage-feast", sortOrder: 6 },
  { title: "Stone & Sorrel", slug: "stone-sorrel", dateISO: "2026-08-29", dateLabel: "Friday 29 August 2026", menuTheme: "Mountain greens and river stone", coursePreview: "Cold-smoked char, wild sorrel, and stone-baked rye, closing on a whey caramel and mountain-honey comb.", seatsAvailable: 6, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-stone-sorrel", sortOrder: 7 },
  { title: "Last Light of Summer", slug: "last-light", dateISO: "2026-09-05", dateLabel: "Friday 5 September 2026", menuTheme: "The final forage", coursePreview: "The season's last dinner before the water turns — a retrospective of the summer's best courses, chosen the morning of.", seatsAvailable: 12, seatsTotal: 12, price: 1950, winePairingPrice: 750, status: "Open", reserveSlug: "reserve-last-light", sortOrder: 8 },
];

const testimonials = [
  { name: "Anna Goncharenko", quote: "The cod broth course made the whole table go silent for ten seconds. That has never happened to me at a dinner.", detail: "Attended the Late Cod Season dinner, March 2025", sortOrder: 1 },
  { name: "Thomas Reinhardt", quote: "I flew in for one night. Sat next to a fisherman and a software engineer. Left with a jar of fermented cabbage and two new friends.", detail: "Attended the Midsummer Forage dinner, July 2024", sortOrder: 2 },
  { name: "Ivana Petrenko", quote: "No menu card, no announcements. She told each course as she set it down, and the room leaned in every time.", detail: "Attended the Birch & Ember dinner, August 2024", sortOrder: 3 },
];

const story = [
  {
    heading: "The table does the work",
    body: "Vechornytsi began as a dare between a chef and a boat restorer. In 2019, Einar Haldorsen bought a derelict boathouse on the Kyiv wharf with no plan beyond stripping it to its bones. His friend, chef Solveig Dahl, saw the timber frame and the water outside and said she could feed twelve people here, once a week, if he gave her the space and stayed out of the kitchen. He gave her the space. She dragged in a five-metre oak table salvaged from a decommissioned fishing vessel, set twelve mismatched chairs around it, and cooked the first dinner from whatever she pulled out of the river that morning. There was no menu card — she told each course to the table as she set it down. That format has not changed. Every Friday at seven, twelve strangers sit, eat seven courses, and leave knowing each other's names. The table does the work.",
    sortOrder: 1,
  },
];

const faq = [
  { question: "How do I get a reservation?", answer: "Reservations open exactly 14 days before each dinner at 12:00. Sign up for the drop alert on our homepage and you will get an email the moment seats go live. Twelve seats, first come, first served.", sortOrder: 1 },
  { question: "What does the seven-course menu include?", answer: "The menu changes every week based on what the chef forages from the river and the mountains nearby. You will receive a menu preview 48 hours before dinner. We accommodate allergies with advance notice — note them when you book.", sortOrder: 2 },
  { question: "Is there a wine pairing?", answer: "Yes. An optional seven-glass pairing matched to each course costs ₴750 on top of the dinner ticket. You can add it during checkout or at the table, but adding it in advance helps us prepare the right quantities.", sortOrder: 3 },
  { question: "Can I book the entire table for a private event?", answer: "You can. Fill out the private dining form on our contact page with your preferred date and group size. Private buyouts are priced separately and include a custom menu consultation with the chef.", sortOrder: 4 },
  { question: "Where exactly is the boathouse?", answer: "We are on the Dnipro river in central Kyiv, a short walk from the city centre. The exact address and a map are on our contact page. There is no sign on the door — look for the timber frame with the single lit window.", sortOrder: 5 },
  { question: "Do you ship products outside Ukraine?", answer: "Currently we ship pantry goods and ceramics within Ukraine only. Gift vouchers are delivered digitally and can be purchased from anywhere.", sortOrder: 6 },
];

async function main() {
  console.log("Creating collections…");
  for (const c of collections) await createCollection(c);

  // schema propagation can lag a beat after collection create
  await new Promise((r) => setTimeout(r, 3000));

  console.log("Inserting items…");
  const out = {};
  out.Dinners = await bulkInsert("Dinners", dinners);
  out.Testimonials = await bulkInsert("Testimonials", testimonials);
  out.Story = await bulkInsert("Story", story);
  out.FaqItems = await bulkInsert("FaqItems", faq);

  const summary = {
    collectionIds: { dinners: "Dinners", testimonials: "Testimonials", story: "Story", faq: "FaqItems", waitlist: "Waitlist" },
    itemIds: out,
    counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])),
  };
  const fs = await import("node:fs");
  fs.writeFileSync(new URL("./cms-seeded.json", import.meta.url), JSON.stringify(summary, null, 2));
  console.log("DONE:", JSON.stringify(summary.counts));
}

main().catch((e) => { console.error(e); process.exit(1); });
