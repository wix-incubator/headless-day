// Stub — no live discount rules wired for this site yet.
// fetchLiveOffers returns an empty array; offersForProduct always returns [].

export interface LiveOffer {
  name: string;
  offer?: string;
  productIds?: string[];
}

export async function fetchLiveOffers(): Promise<LiveOffer[]> {
  return [];
}

export function offersForProduct(
  offers: LiveOffer[],
  productId?: string,
): LiveOffer[] {
  if (!productId) return [];
  return offers.filter(
    (o) => !o.productIds || o.productIds.includes(productId),
  );
}
