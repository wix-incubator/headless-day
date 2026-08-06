/**
 * Pure ICE-server assembly for the WebRTC transport.
 *
 * STUN alone lets peers discover their public address, but two devices behind the SAME home NAT
 * (or any strict/symmetric NAT) frequently can't form a direct candidate pair — mDNS `.local` host
 * candidates don't resolve across devices and same-NAT reflexive pairs need router hairpinning. A
 * **TURN relay** is the fallback that makes those connections work, so cross-device play needs one.
 *
 * TURN creds are provisioned per-deployment via `PUBLIC_*` env vars (see `.env.example`); they're
 * client-visible by nature (they ship in the browser bundle), which is expected for TURN.
 */

export interface TurnConfig {
  urls: string | string[];
  username: string;
  credential: string;
}

export interface IceConfig {
  /** STUN servers for public-address discovery. Defaults to Google's public STUN. */
  stunUrls?: string[];
  /** TURN relay for NAT traversal fallback, or null when none is provisioned. */
  turn?: TurnConfig | null;
}

const DEFAULT_STUN_URLS = ["stun:stun.l.google.com:19302"];

/** Assemble the `iceServers` array: STUN first, then TURN (if configured) as the relay fallback. */
export function buildIceServers(config: IceConfig = {}): RTCIceServer[] {
  const servers: RTCIceServer[] = [{ urls: config.stunUrls ?? DEFAULT_STUN_URLS }];
  if (config.turn) {
    servers.push({ urls: config.turn.urls, username: config.turn.username, credential: config.turn.credential });
  }
  return servers;
}

/** Split a comma/whitespace-separated env value into a trimmed, non-empty list. */
function splitList(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Read ICE config from a `PUBLIC_*` env bag (`import.meta.env` in the browser). TURN is emitted only
 * when url + username + credential are ALL present, so a half-set deployment falls back to STUN-only
 * rather than shipping a broken TURN entry.
 */
export function iceConfigFromEnv(env: Record<string, string | undefined>): IceConfig {
  const stunUrls = splitList(env.PUBLIC_STUN_URLS);
  const turnUrls = splitList(env.PUBLIC_TURN_URLS ?? env.PUBLIC_TURN_URL);
  const username = env.PUBLIC_TURN_USERNAME?.trim();
  const credential = env.PUBLIC_TURN_CREDENTIAL?.trim();

  const turn: TurnConfig | null = turnUrls && username && credential ? { urls: turnUrls, username, credential } : null;

  return stunUrls ? { stunUrls, turn } : { turn };
}
