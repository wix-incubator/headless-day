import { createClient, OAuthStrategy } from "@wix/sdk";
import { currentCart, checkout } from "@wix/ecom";
import { redirects } from "@wix/redirects";

const WIX_CLIENT_ID = import.meta.env.PUBLIC_WIX_CLIENT_ID as string;

function getSessionTokens() {
  if (typeof document === "undefined") return undefined;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith("wixSession="))
    ?.slice("wixSession=".length);
  if (!raw) return undefined;
  try {
    const session = JSON.parse(decodeURIComponent(raw));
    return session.tokens ?? session;
  } catch {
    return undefined;
  }
}

let _client: ReturnType<typeof createClient> | null = null;

export function getWixClient() {
  if (_client) return _client;
  _client = createClient({
    modules: { currentCart, checkout, redirects },
    auth: OAuthStrategy({
      clientId: WIX_CLIENT_ID,
      tokens: getSessionTokens(),
    }),
  });
  return _client;
}
