/**
 * Trophy-shop catalog (pure): three print-on-demand products with their
 * options and price math. This is the sandbox stand-in for a real store —
 * swap the slugs/prices for Wix Stores products when the shop goes live.
 */

export interface OptionChoice {
  value: string;
  label: string;
  /** css color used by swatches/preview where relevant */
  swatch?: string;
  /** price added on top of the base price, in cents */
  priceDeltaCents?: number;
}

export interface ProductOption {
  key: string;
  label: string;
  choices: OptionChoice[];
}

export interface MerchProduct {
  slug: string;
  name: string;
  tagline: string;
  basePriceCents: number;
  options: ProductOption[];
}

const PRINT_COLORS: OptionChoice[] = [
  { value: "cyan", label: "Neon cyan", swatch: "#22d3ee" },
  { value: "fuchsia", label: "Neon fuchsia", swatch: "#e879f9" },
  { value: "amber", label: "Coin gold", swatch: "#fcd34d" },
];

export const MERCH_PRODUCTS: MerchProduct[] = [
  {
    slug: "tee",
    name: "Score Tee",
    tagline: "Wear the receipt of your finest office battle.",
    basePriceCents: 2500,
    options: [
      {
        key: "shirtColor",
        label: "Shirt color",
        choices: [
          { value: "black", label: "Arcade black", swatch: "#15151f" },
          { value: "navy", label: "Night navy", swatch: "#1d2a4d" },
          { value: "white", label: "Whiteboard white", swatch: "#e8e8ee" },
        ],
      },
      { key: "printColor", label: "Print color", choices: PRINT_COLORS },
      {
        key: "size",
        label: "Size",
        choices: ["XS", "S", "M", "L", "XL", "XXL"].map((s) => ({ value: s, label: s })),
      },
    ],
  },
  {
    slug: "mug",
    name: "Victory Mug",
    tagline: "Every standup coffee becomes a victory lap.",
    basePriceCents: 1400,
    options: [
      {
        key: "mugColor",
        label: "Mug color",
        choices: [
          { value: "black", label: "Arcade black", swatch: "#15151f" },
          { value: "white", label: "Whiteboard white", swatch: "#e8e8ee" },
        ],
      },
      { key: "printColor", label: "Print color", choices: PRINT_COLORS },
    ],
  },
  {
    slug: "poster",
    name: "Match Poster",
    tagline: "The war room needs a war record.",
    basePriceCents: 1900,
    options: [
      {
        key: "posterSize",
        label: "Poster size",
        choices: [
          { value: "a3", label: "A3 (30×42 cm)" },
          { value: "a2", label: "A2 (42×59 cm)", priceDeltaCents: 600 },
        ],
      },
      { key: "printColor", label: "Print color", choices: PRINT_COLORS },
    ],
  },
  {
    slug: "keychain",
    name: "Fighter Keychain",
    tagline: "Your character, pocket-sized and battle-hardened.",
    basePriceCents: 900,
    options: [
      {
        key: "material",
        label: "Material",
        choices: [
          { value: "acrylic", label: "Clear acrylic" },
          { value: "metal", label: "Brushed metal", priceDeltaCents: 600 },
        ],
      },
      { key: "printColor", label: "Print color", choices: PRINT_COLORS },
    ],
  },
];

export const MAX_QTY = 16; // one full room, twice over

export function productBySlug(slug: string): MerchProduct | undefined {
  return MERCH_PRODUCTS.find((p) => p.slug === slug);
}

/** First choice of every option — the default selection. */
export function defaultSelection(product: MerchProduct): Record<string, string> {
  return Object.fromEntries(product.options.map((o) => [o.key, o.choices[0]!.value]));
}

/** Validate + normalize a raw selection; unknown keys dropped, bad values → error. */
export function normalizeSelection(
  product: MerchProduct,
  raw: Record<string, string | undefined>,
): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const option of product.options) {
    const value = raw[option.key] ?? option.choices[0]!.value;
    if (!option.choices.some((c) => c.value === value)) return null;
    out[option.key] = value;
  }
  return out;
}

export function clampQty(raw: unknown): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(n, 1), MAX_QTY);
}

export function unitPriceCents(product: MerchProduct, selection: Record<string, string>): number {
  let cents = product.basePriceCents;
  for (const option of product.options) {
    const choice = option.choices.find((c) => c.value === selection[option.key]);
    cents += choice?.priceDeltaCents ?? 0;
  }
  return cents;
}

export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Resolve the garment + print swatch colors for a selection, for the SVG preview.
 * garment = the first non-print option that carries swatches (shirt/mug color);
 * products without one (poster, keychain) fall back to a dark default.
 */
export function selectionColors(
  product: MerchProduct,
  selection: Record<string, string>,
): { garmentColor: string; printColor: string } {
  const swatchOf = (key: string) =>
    product.options.find((o) => o.key === key)?.choices.find((c) => c.value === selection[key])?.swatch;
  const garmentKey = product.options.find((o) => o.key !== "printColor" && o.choices[0]?.swatch)?.key;
  return {
    garmentColor: (garmentKey && swatchOf(garmentKey)) || "#0b0b1a",
    printColor: swatchOf("printColor") || "#22d3ee",
  };
}

/** Human-readable "Arcade black · Neon cyan · L" line for order summaries. */
export function describeSelection(
  product: MerchProduct,
  selection: Record<string, string>,
): string {
  return product.options
    .map((o) => o.choices.find((c) => c.value === selection[o.key])?.label ?? "?")
    .join(" · ");
}
