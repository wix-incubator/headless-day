/**
 * Trust boundary for the optional print visual (player's fighter sprite + avatar photo)
 * that rides through the merch funnel as query/form params. Both are attacker-controllable
 * (they're in the URL), so every page that renders or stores them validates here:
 *   - warrior must be one of the known same-origin sprite paths (no arbitrary <image href>)
 *   - avatar must be a first-party Wix CDN URL (never a peer-supplied link)
 */

import { BODY_ASSET } from "../../game/arena/cosmetic";

const ALLOWED_WARRIORS = new Set<string>(Object.values(BODY_ASSET));
const WIX_CDN = /^https:\/\/static\.wixstatic\.com\//;

export interface PrintVisual {
  warriorSrc?: string;
  avatarUrl?: string;
}

/** Validate a raw (untrusted) warrior/avatar pair; anything unrecognized becomes undefined. */
export function sanitizeVisual(raw: {
  warrior?: string | null;
  avatar?: string | null;
}): PrintVisual {
  const warriorSrc =
    raw.warrior && ALLOWED_WARRIORS.has(raw.warrior) ? raw.warrior : undefined;
  const avatarUrl = raw.avatar && WIX_CDN.test(raw.avatar) ? raw.avatar : undefined;
  return { warriorSrc, avatarUrl };
}
