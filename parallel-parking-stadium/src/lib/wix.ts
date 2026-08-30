/* ============================================================
   Wix Headless client.
   One OAuth (visitor) client, reused across requests. The CMS collections
   are read with public ("Anyone") read permission; the booking endpoint
   inserts into a collection that allows "Anyone" to add items.
   ============================================================ */
import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';

const clientId = import.meta.env.PUBLIC_WIX_CLIENT_ID;

let _client: ReturnType<typeof createClient> | null = null;

/**
 * Returns the shared Wix client, or `null` when no client ID is configured.
 * Callers fall back to local seed data when this is null, so the site renders
 * end-to-end before the Wix project is linked.
 */
export function getWixClient() {
  if (!clientId) return null;
  if (!_client) {
    _client = createClient({
      modules: { items },
      auth: OAuthStrategy({ clientId }),
    });
  }
  return _client;
}

export const isWixConfigured = Boolean(clientId);
