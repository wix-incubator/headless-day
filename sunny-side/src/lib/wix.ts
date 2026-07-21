import { items } from "@wix/data";
import { productsV3, readOnlyVariantsV3 } from "@wix/stores";
import { services } from "@wix/bookings";
import { media } from "@wix/sdk";

export const BOOKINGS_APP_ID = "13d21c63-b5ec-5912-8397-c3a5ddb27a97";
export const STAFF_RESOURCE_TYPE_ID = "1cd44cf8-756f-41c3-bd90-3e2ffcaf1155";

/** Each city's guided crawl: the exact seeded Service title + the city timezone (for availability). */
export const CRAWLS: Record<string, { title: string; timezone: string }> = {
  "tel-aviv":  { title: "White City Morning Crawl",     timezone: "Asia/Jerusalem" },
  "kyiv":      { title: "Podil Sunrise Crawl",          timezone: "Europe/Kyiv" },
  "krakow":    { title: "Old Town & Kazimierz Crawl",   timezone: "Europe/Warsaw" },
  "dublin":    { title: "Capel Street Crawl",           timezone: "Europe/Dublin" },
  "miami":     { title: "Wynwood & Edgewater Crawl",    timezone: "America/New_York" },
  "vilnius":   { title: "Old Town Cathedral Crawl",     timezone: "Europe/Vilnius" },
  "sao-paulo": { title: "Vila Madalena & Jardins Crawl", timezone: "America/Sao_Paulo" },
};

export type CrawlService = {
  _id: string;
  name: string;
  slug: string;
  durationMin: number;
  price: string;      // e.g. "29.00" ("" when free)
  currency: string;
  formatted: string;  // e.g. "€29"
  description: string;
  tagLine: string;
  citySlug: string;
};

function crawlCitySlug(name: string): string {
  for (const [slug, c] of Object.entries(CRAWLS)) if (c.title === name) return slug;
  return "";
}
function mapService(s: any): CrawlService {
  const price: string = s?.payment?.fixed?.price?.value ?? "";
  const currency: string = s?.payment?.fixed?.price?.currency ?? "EUR";
  return {
    _id: s._id,
    name: s.name ?? "",
    slug: s?.mainSlug?.name ?? "",
    durationMin: s?.schedule?.availabilityConstraints?.sessionDurations?.[0] ?? 180,
    price,
    currency,
    formatted: price ? formatPrice(price, currency) : "Free",
    description: s.description ?? "",
    tagLine: s.tagLine ?? "",
    citySlug: crawlCitySlug(s.name ?? ""),
  };
}

/** All guided-crawl services, discovered live. Ordered to match the 7 cities. */
export async function getCrawlServices(): Promise<CrawlService[]> {
  try {
    const { items: rows } = await services
      .queryServices({ conditionalFields: ["STAFF_MEMBER_DETAILS"] } as any)
      .eq("appId", BOOKINGS_APP_ID)
      .limit(100)
      .find();
    const order = Object.keys(CRAWLS);
    const mapped = (rows as any[])
      .filter((s) => !s.hidden)
      .map(mapService)
      .filter((s) => s.citySlug)
      .sort((a, b) => order.indexOf(a.citySlug) - order.indexOf(b.citySlug));
    // Safeguard: exactly one crawl per city, even if a re-provision ever leaves a
    // duplicate service (prefer a live/bookable one — here, the first after sort).
    const seen = new Set<string>();
    return mapped.filter((s) => (seen.has(s.citySlug) ? false : (seen.add(s.citySlug), true)));
  } catch (e) {
    console.error("getCrawlServices failed", e);
    return [];
  }
}

/** The crawl service for one city (matched by its seeded title). Null if not found. */
export async function getCrawlForCity(citySlug: string): Promise<CrawlService | null> {
  const title = CRAWLS[citySlug]?.title;
  if (!title) return null;
  const all = await getCrawlServices();
  return all.find((s) => s.name === title) || null;
}

export const STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";
export const CITIES_COLLECTION = "Cities";

export type Spot = {
  name: string;
  neighborhood: string;
  hook?: string;      // legacy short line (premium spots)
  order?: string;     // "what to order"
  blurb?: string;     // editorial 2–3 sentences
  vibe?: string;      // vibe tag
  bestTime?: string;  // best-time tag
  image?: string;
  lat?: number;       // persisted geocode (morning-crawl map)
  lng?: number;
};
export type City = {
  _id: string;
  name: string;
  country: string;
  slug: string;
  intro: string;
  heroImage?: string;
  freeSpots: Spot[];
  premiumTeaser: string;
  premiumSpots: Spot[];
  crawlRoute: string;
  tips: string[];
  order: number;
};

/** Resolve + scale a Wix image reference to an optimized URL (serves AVIF/WebP via enc_auto). */
export function imgSrc(v: unknown, w = 900, h = 600): string {
  if (!v) return "";
  const val = typeof v === "string" ? v : ((v as any)?.url ?? (v as any)?.image ?? "");
  if (typeof val !== "string" || !val) return "";
  // Already a Wix media identifier → scale directly.
  if (val.startsWith("wix:image://")) {
    try { return media.getScaledToFillImageUrl(val, w, h, {}); } catch { return val; }
  }
  // Absolute Wix media URL (what site-media import stores) → scale via the SDK
  // by reconstructing the wix:image:// id, so we serve a compressed, sized image
  // instead of the multi-MB original PNG.
  const m = val.match(/static\.wixstatic\.com\/media\/([^/?#]+)/);
  if (m && !val.includes("/v1/")) {
    const id = m[1];
    try { return media.getScaledToFillImageUrl(`wix:image://v1/${id}/${id}`, w, h, {}); } catch { return val; }
  }
  return val; // some other absolute URL — pass through
}

/** OBJECT fields come back as objects; be defensive about strings / shapes. */
function readSpots(v: unknown): Spot[] {
  if (!v) return [];
  let obj: any = v;
  if (typeof v === "string") {
    try { obj = JSON.parse(v); } catch { return []; }
  }
  const arr = Array.isArray(obj) ? obj : obj?.items;
  return Array.isArray(arr) ? (arr as Spot[]) : [];
}

function normalizeCity(item: any): City {
  return {
    _id: item._id,
    name: item.name ?? "",
    country: item.country ?? "",
    slug: item.slug ?? "",
    intro: item.intro ?? "",
    heroImage: item.heroImage ?? "",
    freeSpots: readSpots(item.freeSpots),
    premiumTeaser: item.premiumTeaser ?? "",
    premiumSpots: readSpots(item.premiumSpots),
    crawlRoute: item.crawlRoute ?? "",
    tips: Array.isArray(item.tips) ? item.tips : [],
    order: typeof item.order === "number" ? item.order : 999,
  };
}

/** All cities, ordered. Never throws — returns [] on error (SSR guard). */
export async function getCities(): Promise<City[]> {
  try {
    const { items: rows } = await items.query(CITIES_COLLECTION).ascending("order").limit(50).find();
    return rows.map(normalizeCity);
  } catch (e) {
    console.error("getCities failed", e);
    return [];
  }
}

/** One city by slug. Null if not found / error. */
export async function getCityBySlug(slug: string): Promise<City | null> {
  try {
    const { items: rows } = await items.query(CITIES_COLLECTION).eq("slug", slug).limit(1).find();
    if (!rows.length) return null;
    return normalizeCity(rows[0]);
  } catch (e) {
    console.error("getCityBySlug failed", e);
    return null;
  }
}

export type PassProduct = {
  _id: string;
  name: string;
  slug: string;
  amount: string;      // e.g. "9.00"
  currency: string;    // e.g. "EUR"
  formatted: string;   // e.g. "€9" — matches the checkout currency exactly
  plainDescription: string;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", ILS: "₪", PLN: "zł", UAH: "₴", BRL: "R$", CAD: "$", AUD: "$",
};

/** Format an amount in the store's real currency (so marketing == checkout). */
export function formatPrice(amount: string, currency: string): string {
  const num = Number(amount);
  const sym = CURRENCY_SYMBOLS[currency] || "";
  const body = Number.isFinite(num) ? (num % 1 === 0 ? String(num) : num.toFixed(2)) : amount;
  if (sym === "zł") return `${body} zł`;
  return sym ? `${sym}${body}` : `${body} ${currency}`;
}

/** The single All-Access Pass digital product, discovered live. Null on error. */
export async function getPass(): Promise<PassProduct | null> {
  try {
    const { items: products } = await productsV3.queryProducts().limit(5).find();
    if (!products.length) return null;
    let p: any =
      products.find((x: any) => (x.slug || "").includes("all-access")) ||
      products.find((x: any) => /pass/i.test(x.name || "")) ||
      products[0];
    const amount: string = p?.actualPriceRange?.minValue?.amount ?? "9.00";
    // Currency only comes back with the CURRENCY fieldset (omitted here to keep the
    // request fast); the store is configured in EUR, so default to it.
    const currency: string = p?.currency || "EUR";
    return {
      _id: p._id,
      name: p.name ?? "All-Access Pass",
      slug: p.slug ?? "all-access-pass",
      amount,
      currency,
      formatted: formatPrice(amount, currency),
      plainDescription: p.plainDescription ?? "",
    };
  } catch (e) {
    console.error("getPass failed", e);
    return null;
  }
}

/** Resolve the mandatory variantId for the Pass product. */
export async function getPassVariantId(productId: string): Promise<string | null> {
  try {
    const { items: variants } = await readOnlyVariantsV3
      .queryVariants()
      .eq("productData.productId", productId)
      .find();
    const v: any = variants[0];
    if (!v) return null;
    return v.variantId ?? v._id ?? null;
  } catch (e) {
    console.error("getPassVariantId failed", e);
    return null;
  }
}
