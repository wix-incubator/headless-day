import { createClient, OAuthStrategy, type Tokens } from "@wix/sdk";
import { wixEventsV2, orders, ticketDefinitions } from "@wix/events";
import { redirects } from "@wix/redirects";
import { members } from "@wix/members";
import { WIX_CLIENT_ID, isWixConfigured } from "./config";

const TOKENS_KEY = "wix:member-tokens";

/** Persisted member tokens keep a sign-in alive across reloads. */
export function loadTokens(): Tokens | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : undefined;
  } catch {
    return undefined;
  }
}
export function saveTokens(tokens: Tokens) {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    /* storage unavailable — session stays in-memory only */
  }
}
export function clearTokens() {
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* ignore */
  }
}

let cached: ReturnType<typeof build> | null = null;

function build() {
  return createClient({
    modules: { wixEventsV2, orders, ticketDefinitions, redirects, members },
    auth: OAuthStrategy({ clientId: WIX_CLIENT_ID, tokens: loadTokens() }),
  });
}

/**
 * Singleton browser client. Boots with any stored member tokens, so ticketing
 * and member queries run under the signed-in identity when there is one, and
 * fall back to anonymous visitor tokens otherwise. `null` when unconfigured.
 */
export function getBrowserClient() {
  if (!isWixConfigured) return null;
  if (!cached) cached = build();
  return cached;
}

/** Drop the cached client so the next call rebuilds with current tokens. */
export function resetBrowserClient() {
  cached = null;
}
