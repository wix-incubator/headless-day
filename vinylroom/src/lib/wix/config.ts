/**
 * Wix Headless configuration.
 *
 * The only thing you have to provide is a Headless OAuth **Client ID** from your
 * site's dashboard (Settings → Headless → OAuth apps). Put it in `.env.local`:
 *
 *     NEXT_PUBLIC_WIX_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 *
 * Until it's set, the whole app runs on the built-in demo data — nothing breaks.
 * See WIX_SETUP.md for the step-by-step.
 */
export const WIX_CLIENT_ID = process.env.NEXT_PUBLIC_WIX_CLIENT_ID?.trim() || "";

export const isWixConfigured = WIX_CLIENT_ID.length > 0;
