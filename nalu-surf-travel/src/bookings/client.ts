import { createClient, OAuthStrategy } from '@wix/sdk';
import { services, availabilityCalendar, bookings } from '@wix/bookings';
import { cartV2 } from '@wix/ecom';
import { CLIENT_ID } from './config';

/**
 * The single seam that touches `@wix/sdk` — every other bookings module (and
 * every test) mocks this factory instead of the transitive `@wix/bookings`/
 * `@wix/ecom` modules. The whole game is a `client:only` React island (no SSR
 * pages), so this uses the "own/static build" visitor-client pattern
 * (OAuthStrategy), not the astro-ambient client the SSR-page pattern would use.
 */
export function createWixClient() {
  return createClient({
    modules: { services, availabilityCalendar, bookings, cartV2 },
    auth: OAuthStrategy({ clientId: CLIENT_ID }),
  });
}

export type WixClient = ReturnType<typeof createWixClient>;
