/**
 * Server-side adapter for the `PlayerAvatars` collection (per-game avatar overrides).
 *
 * The collection is ADMIN-only, so every call is elevated — clients never read/write it directly
 * (writes go through `/api/avatar`, reads happen during SSR / API routes). We key each row by a
 * DETERMINISTIC id `<gameSlug>-<memberId>`, which makes get/upsert O(1) by id and avoids a query
 * (queries + `auth.elevate` don't compose cleanly, since a query builder's HTTP fires later).
 */

import { auth } from "@wix/essentials";
import { items } from "@wix/data";

const COLLECTION = "PlayerAvatars";

export interface GameAvatarSetting {
  /** Custom per-game image. Null means this game has no custom image. */
  url: string | null;
  /** Explicitly keep the illustrated fighter head, even when the member has a profile photo. */
  disabled: boolean;
}

/** Stable row id for a (member, game) pair. Games use short alnum slugs; member ids are GUIDs. */
export function playerAvatarId(memberId: string, gameId: string): string {
  const slug = gameId.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return `${slug}-${memberId}`;
}

/** The member's per-game avatar preference, including an explicit "no photo" choice. */
export async function getGameAvatarSetting(memberId: string, gameId: string): Promise<GameAvatarSetting> {
  try {
    const item = await auth.elevate(items.getDataItem)(playerAvatarId(memberId, gameId), {
      dataCollectionId: COLLECTION,
    });
    if (item?.data?.disabled === true) return { url: null, disabled: true };
    const url = item?.data?.url;
    return {
      url: typeof url === "string" && url.trim() !== "" ? url : null,
      disabled: false,
    };
  } catch {
    return { url: null, disabled: false }; // no row or transient — caller falls back to profile photo
  }
}

/** Insert or replace the member's per-game avatar URL (server-authoritative, elevated). */
export async function setGameAvatarUrl(memberId: string, gameId: string, url: string): Promise<void> {
  const _id = playerAvatarId(memberId, gameId);
  await auth.elevate(items.saveDataItem)({
    dataCollectionId: COLLECTION,
    dataItem: { _id, data: { _id, memberId, gameId, url, disabled: false } },
  });
}

/** Persist an explicit per-game choice to render the illustrated fighter without a face photo. */
export async function disableGameAvatar(memberId: string, gameId: string): Promise<void> {
  const _id = playerAvatarId(memberId, gameId);
  await auth.elevate(items.saveDataItem)({
    dataCollectionId: COLLECTION,
    dataItem: { _id, data: { _id, memberId, gameId, disabled: true } },
  });
}
