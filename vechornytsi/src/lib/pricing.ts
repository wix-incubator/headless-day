// Display pricing. The payment provider charges in USD (products are priced in
// USD in the Wix catalog), but the storefront shows the original hryvnia prices.
// These are the exact ₴ amounts shown on the pages; Wix charges the USD
// equivalent (see scripts-seed/reprice-usd.mjs, rate below) at checkout.
export const UAH_PER_USD = 41;

export const UAH_PRICES: Record<string, number> = {
  // Shop
  "fermented-cabbage-500ml": 145,
  "birch-syrup-200ml": 195,
  "pickled-sea-buckthorn-250ml": 165,
  "cloudberry-birch-preserve-200ml": 210,
  "stoneware-dinner-bowl-ash-glaze": 420,
  "beeswax-taper-candles-set-of-six": 180,
  "linen-napkin-set-set-of-four": 260,
  "gift-voucher-one-seat": 1950,
  // Reservation seats (₴1,950) + deposits (₴390)
  "reserve-midsummer-forage": 1950, "reserve-deposit-midsummer-forage": 390,
  "reserve-late-cod-season": 1950, "reserve-deposit-late-cod-season": 390,
  "reserve-birch-ember": 1950, "reserve-deposit-birch-ember": 390,
  "reserve-mushroom-table": 1950, "reserve-deposit-mushroom-table": 390,
  "reserve-sea-buckthorn": 1950, "reserve-deposit-sea-buckthorn": 390,
  "reserve-cabbage-feast": 1950, "reserve-deposit-cabbage-feast": 390,
  "reserve-stone-sorrel": 1950, "reserve-deposit-stone-sorrel": 390,
  "reserve-last-light": 1950, "reserve-deposit-last-light": 390,
};

/** ₴ label for a product slug; falls back to the Wix-formatted amount if unknown. */
export function uahLabel(slug?: string, fallback?: string): string {
  const v = slug ? UAH_PRICES[slug] : undefined;
  return v != null ? `₴${v.toLocaleString("en-US")}` : (fallback ?? "");
}
