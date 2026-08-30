import { createClient, OAuthStrategy } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
import { checkout } from '@wix/ecom';

// The fixed app ID Wix assigns to the Stores catalog — required on every
// checkout line item's catalogReference so eCom knows which catalog to look up.
export const STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

// In production the adapter exposes env vars on Astro.locals (direct pattern);
// import.meta.env only works locally, where Vite injects .env.local.
export function getWixClient(locals?: App.Locals) {
  const clientId = (locals as Record<string, string>)?.WIX_CLIENT_ID ?? import.meta.env.WIX_CLIENT_ID ?? '';
  return createClient({
    modules: { productsV3, checkout },
    auth: OAuthStrategy({ clientId }),
  });
}
