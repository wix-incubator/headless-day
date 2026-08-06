/**
 * Game likes (impure Wix adapter): one like per member per game, stored in the
 * `GameLikes` collection `{ gameId, memberId }`. All writes go through trusted
 * API routes with elevated app creds; reads are best-effort — the home page
 * must render even if Wix Data is unreachable or the collection doesn't exist yet.
 */

import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import { createAdminCollection, withCollection } from "./wixData";

const COLLECTION_ID = "GameLikes";

const ensureCollection = () =>
  createAdminCollection(COLLECTION_ID, "Game Likes", ["gameId", "memberId"]);

async function countLikes(gameId: string, consistentRead = false): Promise<number> {
  const { totalCount } = await auth.elevate(items.countDataItems)({
    dataCollectionId: COLLECTION_ID,
    filter: { gameId },
    consistentRead,
  });
  return totalCount ?? 0;
}

/** Like counts per game slug; missing collection / read errors count as 0. */
export async function getLikeCounts(slugs: string[]): Promise<Record<string, number>> {
  const counts = await Promise.all(
    slugs.map(async (slug) => {
      try {
        return await countLikes(slug);
      } catch {
        return 0;
      }
    }),
  );
  return Object.fromEntries(slugs.map((slug, i) => [slug, counts[i] ?? 0]));
}

/** Game slugs the member has liked (empty on any read error). */
export async function getMemberLikedSet(memberId: string): Promise<Set<string>> {
  try {
    const { items: rows } = await auth
      .elevate(items.queryDataItems)({ dataCollectionId: COLLECTION_ID })
      .eq("memberId", memberId)
      .limit(100)
      .find();
    return new Set(rows.map((r) => String(r.data?.gameId ?? "")).filter(Boolean));
  } catch {
    return new Set();
  }
}

/** Toggle the member's like for a game; returns the new state + fresh count. */
export async function toggleGameLike(
  gameId: string,
  memberId: string,
): Promise<{ liked: boolean; count: number }> {
  const existing = await withCollection(
    async () =>
      (
        await auth
          .elevate(items.queryDataItems)({ dataCollectionId: COLLECTION_ID })
          .eq("gameId", gameId)
          .eq("memberId", memberId)
          .limit(1)
          .find()
      ).items[0],
    ensureCollection,
  );

  let liked: boolean;
  if (existing?._id) {
    await auth.elevate(items.removeDataItem)(existing._id, { dataCollectionId: COLLECTION_ID });
    liked = false;
  } else {
    await auth.elevate(items.insertDataItem)({
      dataCollectionId: COLLECTION_ID,
      dataItem: { data: { gameId, memberId } },
    });
    liked = true;
  }

  const count = await countLikes(gameId, true);
  return { liked, count };
}
