/**
 * Arena paid cosmetics ownership. Rows live in `ArenaSkinPurchases` as
 * `{ memberId, skin }`; trusted API routes perform elevated reads/writes.
 */

import { auth } from "@wix/essentials";
import { items } from "@wix/data";
import {
  PREMIUM_SHAPES,
  coerceShape,
  premiumSkinById,
  type Shape,
} from "../../game/arena/cosmetic";
import { createAdminCollection, withCollection } from "./wixData";

const COLLECTION_ID = "ArenaSkinPurchases";

const ensureCollection = () =>
  createAdminCollection(COLLECTION_ID, "Arena Skin Purchases", [
    "memberId",
    "skin",
    "checkoutId",
  ]);

export function isArenaPremiumSkinId(raw: string | null): raw is Shape {
  if (!raw) return false;
  const skin = coerceShape(raw);
  return PREMIUM_SHAPES.includes(skin) && !!premiumSkinById(skin);
}

export async function getOwnedArenaSkins(memberId: string): Promise<Shape[]> {
  try {
    const { items: rows } = await auth
      .elevate(items.queryDataItems)({ dataCollectionId: COLLECTION_ID })
      .eq("memberId", memberId)
      .limit(100)
      .find();
    return rows
      .map((row) => coerceShape(row.data?.skin))
      .filter((skin) => PREMIUM_SHAPES.includes(skin));
  } catch {
    return [];
  }
}

export async function memberOwnsArenaSkin(
  memberId: string,
  skin: Shape,
): Promise<boolean> {
  return (await getOwnedArenaSkins(memberId)).includes(skin);
}

export async function grantArenaSkin(
  memberId: string,
  skin: Shape,
  checkoutId = "",
): Promise<void> {
  await withCollection(async () => {
    const existing = (
      await auth
        .elevate(items.queryDataItems)({ dataCollectionId: COLLECTION_ID })
        .eq("memberId", memberId)
        .eq("skin", skin)
        .limit(1)
        .find()
    ).items[0];
    if (existing) return;
    await auth.elevate(items.insertDataItem)({
      dataCollectionId: COLLECTION_ID,
      dataItem: { data: { memberId, skin, checkoutId } },
    });
  }, ensureCollection);
}
