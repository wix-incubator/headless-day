import { services } from "@wix/bookings";

export const RENTALS_APP_ID = "ff5d6eb1-65e4-4f9a-8b14-64d34c12cc2e";

export type RentalView = {
  id: string;
  name: string;
  slug: string;
  category: string;
  pricePerDay: number;
  currency: string;
  description: string;
  tagLine: string;
  image?: string;
  scheduleId?: string;
  primaryResourceType?: string;
  unitType: "HOUR" | "DAY";
  minDays: number;
  maxDays: number;
  sortOrder: number;
  hasResource: boolean;
};

const FALLBACK_RENTALS: RentalView[] = [
  {
    id: "<surfboardRentalId>",
    name: "Surfboards",
    slug: "surfboards",
    category: "Surfboards",
    pricePerDay: 65,
    currency: "EUR",
    description: "Soft-top and shortboard rentals from the TIDE shack.",
    tagLine: "Catch waves. Not commitments.",
    scheduleId: "<scheduleId>",
    primaryResourceType: "<resourceTypeId>",
    unitType: "DAY",
    minDays: 1,
    maxDays: 8,
    sortOrder: 1,
    hasResource: true,
  },
  {
    id: "<supRentalId>",
    name: "SUPs",
    slug: "sups",
    category: "SUPs",
    pricePerDay: 55,
    currency: "EUR",
    description: "Stand-up paddleboards for mellow beachside touring.",
    tagLine: "Catch waves. Not commitments.",
    scheduleId: "<scheduleId>",
    primaryResourceType: "<resourceTypeId>",
    unitType: "HOUR",
    minDays: 1,
    maxDays: 8,
    sortOrder: 2,
    hasResource: true,
  },
  {
    id: "<wetsuitRentalId>",
    name: "Wetsuits",
    slug: "wetsuits",
    category: "Wetsuits",
    pricePerDay: 25,
    currency: "EUR",
    description: "Fullsuit steamers. Mixed sizes at pickup.",
    tagLine: "Stay in. Stay warm.",
    scheduleId: "<scheduleId>",
    primaryResourceType: "<resourceTypeId>",
    unitType: "HOUR",
    minDays: 1,
    maxDays: 8,
    sortOrder: 3,
    hasResource: true,
  },
  {
    id: "<bodyboardRentalId>",
    name: "Bodyboards",
    slug: "bodyboards",
    category: "Bodyboards",
    pricePerDay: 20,
    currency: "EUR",
    description: "Bodyboards for steep, fast beachbreak days.",
    tagLine: "Catch waves. Not commitments.",
    scheduleId: "<scheduleId>",
    primaryResourceType: "<resourceTypeId>",
    unitType: "HOUR",
    minDays: 1,
    maxDays: 8,
    sortOrder: 4,
    hasResource: true,
  },
  {
    id: "<surfKitRentalId>",
    name: "Surf Kits",
    slug: "surf-kits",
    category: "Surf Kits",
    pricePerDay: 80,
    currency: "EUR",
    description: "Board plus suit bundle so you can skip the gear spiral.",
    tagLine: "Board + suit. You're in.",
    scheduleId: "<scheduleId>",
    primaryResourceType: "<resourceTypeId>",
    unitType: "HOUR",
    minDays: 1,
    maxDays: 8,
    sortOrder: 5,
    hasResource: true,
  },
];

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function clampDays(min?: number | null, max?: number | null): { minDays: number; maxDays: number } {
  const rawMin = typeof min === "number" && min > 0 ? min : 1;
  const rawMax = typeof max === "number" && max > 0 ? max : 3;
  const minDays = Math.min(8, Math.max(1, rawMin));
  const maxDays = Math.min(8, Math.max(minDays, rawMax));
  return { minDays, maxDays };
}

function clampHours(minMinutes?: number | null, maxMinutes?: number | null): { minDays: number; maxDays: number } {
  const rawMin = typeof minMinutes === "number" && minMinutes > 0 ? Math.round(minMinutes / 60) : 1;
  const rawMax = typeof maxMinutes === "number" && maxMinutes > 0 ? Math.round(maxMinutes / 60) : 8;
  const minDays = Math.min(8, Math.max(1, rawMin));
  const maxDays = Math.min(8, Math.max(minDays, rawMax));
  return { minDays, maxDays };
}

function mediaUrl(value?: string): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("wix:image://") ||
    raw.startsWith("/")
  ) {
    return raw;
  }
  return `https://static.wixstatic.com/media/${raw}`;
}

function imageUrl(raw: unknown): string | undefined {
  if (typeof raw === "string") return mediaUrl(raw);
  if (raw && typeof raw === "object") {
    const rec = raw as { id?: string; url?: string };
    return mediaUrl(rec.url) ?? mediaUrl(rec.id);
  }
  return undefined;
}

function serviceId(service: any): string | undefined {
  const id = service?._id ?? service?.id;
  return typeof id === "string" && id ? id : undefined;
}

function serviceSlugs(service: any): string[] {
  return [
    service?.mainSlug?.name,
    service?.slug,
    ...(service?.supportedSlugs ?? []).map((entry: any) => entry?.name),
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

function hasAssignedResource(service: any): boolean {
  return (service?.serviceResources ?? []).some((group: any) => {
    const ids = group?.resourceIds?.values ?? group?.resourceIds ?? [];
    return Array.isArray(ids) && ids.length > 0;
  });
}

export function mapService(service: any): RentalView | null {
  const id = serviceId(service);
  const name = typeof service?.name === "string" ? service.name.trim() : "";
  const slug = serviceSlugs(service)[0];
  if (!id || !name || !slug) return null;

  const fallback = FALLBACK_RENTALS.find((item) => item.id === id || item.slug === slug);
  const priceValue = Number(service?.payment?.fixed?.price?.value ?? 0);
  const durationRange = service?.schedule?.availabilityConstraints?.durationRange;
  const unitType: "HOUR" | "DAY" =
    durationRange?.unitType === "HOUR"
      ? "HOUR"
      : durationRange?.unitType === "DAY"
        ? "DAY"
        : (fallback?.unitType ?? "DAY");
  const days =
    unitType === "HOUR"
      ? clampHours(durationRange?.hourOptions?.minDurationInMinutes, durationRange?.hourOptions?.maxDurationInMinutes)
      : clampDays(durationRange?.dayOptions?.minDurationInDays, durationRange?.dayOptions?.maxDurationInDays);
  const category =
    typeof service?.category?.name === "string" && service.category.name.trim()
      ? service.category.name.trim()
      : (fallback?.category ?? name);

  return {
    id,
    name,
    slug,
    category,
    pricePerDay: Number.isFinite(priceValue) && priceValue > 0 ? priceValue : (fallback?.pricePerDay ?? 0),
    currency: service?.payment?.fixed?.price?.currency ?? fallback?.currency ?? "EUR",
    description:
      (typeof service?.description === "string" ? service.description.trim() : "") ||
      fallback?.description ||
      "",
    tagLine:
      (typeof service?.tagLine === "string" ? service.tagLine.trim() : "") ||
      fallback?.tagLine ||
      "",
    image:
      imageUrl(service?.media?.mainMedia?.image ?? service?.media?.items?.[0]?.image) ??
      fallback?.image,
    scheduleId: service?.schedule?._id ?? service?.schedule?.id ?? fallback?.scheduleId,
    primaryResourceType: service?.primaryResourceType ?? fallback?.primaryResourceType,
    unitType,
    minDays: days.minDays,
    maxDays: days.maxDays,
    sortOrder:
      typeof service?.sortOrder === "number" ? service.sortOrder : (fallback?.sortOrder ?? 0),
    hasResource: hasAssignedResource(service) || Boolean(fallback?.hasResource),
  };
}

async function queryLiveServices(): Promise<any[]> {
  const result = await services
    .queryServices()
    .eq("appId", RENTALS_APP_ID)
    .limit(50)
    .find();
  return (result.items ?? []).filter((item: any) => item?.hidden !== true);
}

function byDashboardOrder(items: RentalView[]): RentalView[] {
  return items.slice().sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function listingScore(item: RentalView): number {
  return (item.hasResource ? 4 : 0) + (item.image ? 2 : 0) + (item.description ? 1 : 0);
}

function uniqueDashboardProducts(items: RentalView[]): RentalView[] {
  const byName = new Map<string, RentalView>();
  for (const item of byDashboardOrder(items)) {
    const key = item.name.trim().toLowerCase();
    const current = byName.get(key);
    if (!current || listingScore(item) > listingScore(current)) {
      byName.set(key, item);
    }
  }
  return byDashboardOrder([...byName.values()]);
}

export async function queryRentalServices(): Promise<RentalView[]> {
  try {
    const items = await queryLiveServices();
    const mapped = items.map(mapService).filter((item): item is RentalView => item !== null);
    const withImages = mapped.filter((item) => Boolean(item.image));
    if (withImages.length > 0) return uniqueDashboardProducts(withImages);
    if (mapped.length > 0) return uniqueDashboardProducts(mapped);
  } catch (err) {
    console.error("[rentals] listing query failed:", err);
  }
  return FALLBACK_RENTALS;
}

export async function getRentalBySlug(slug: string): Promise<RentalView | null> {
  try {
    const items = await queryLiveServices();
    const matches = items.filter((item: any) => serviceSlugs(item).includes(slug));
    const mapped = matches
      .map(mapService)
      .filter((item): item is RentalView => item !== null);
    if (mapped.length === 1) return mapped[0];
    if (mapped.length > 1) return uniqueDashboardProducts(mapped)[0];
  } catch (err) {
    console.error("[rentals] slug query failed:", err);
  }

  return FALLBACK_RENTALS.find((item) => item.slug === slug) ?? null;
}

export function kitPalette(slug: string): string {
  const key = slug.toLowerCase();
  if (key.includes("funboard") || key.includes("surfboard") || key.includes("board-rental") || key.includes("hire-board")) {
    return "kit-teal";
  }
  if (key.includes("sup")) return "kit-pink";
  if (key.includes("steamer") || key.includes("wetsuit")) return "kit-ink";
  if (key.includes("bodyboard")) return "kit-sun";
  if (key.includes("kit")) return "kit-coral";
  return "kit-cream";
}

export function uniqueCategories(rentals: RentalView[]): string[] {
  return [...new Set(rentals.map((item) => item.category).filter(Boolean))];
}
