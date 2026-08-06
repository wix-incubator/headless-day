/**
 * Game purchase catalog/settings.
 *
 * Each game gets an inventory slot on the account page. Games without premium
 * items simply return an empty catalog until their paid items are wired later.
 */

import { PREMIUM_SKINS } from "../../game/arena/cosmetic";

export type GamePurchaseKind = "skin" | "cosmetic" | "upgrade" | "pass";

export interface GamePurchaseCatalogItem {
  gameId: string;
  itemId: string;
  name: string;
  description: string;
  imageSrc: string;
  kind: GamePurchaseKind;
  priceLabel: string;
}

const priceLabel = (priceCents: number) =>
  priceCents % 100 === 0
    ? `$${priceCents / 100}`
    : `$${(priceCents / 100).toFixed(2)}`;

export const GAME_PURCHASE_CATALOG: GamePurchaseCatalogItem[] = [
  ...PREMIUM_SKINS.map((skin) => ({
    gameId: "arena",
    itemId: skin.id,
    name: skin.name,
    description: skin.blurb,
    imageSrc: skin.preview,
    kind: "skin" as const,
    priceLabel: priceLabel(skin.priceCents),
  })),
];

export function purchaseCatalogForGame(gameId: string): GamePurchaseCatalogItem[] {
  return GAME_PURCHASE_CATALOG.filter((item) => item.gameId === gameId);
}

export function purchaseCatalogItem(
  gameId: string,
  itemId: string,
): GamePurchaseCatalogItem | undefined {
  return GAME_PURCHASE_CATALOG.find(
    (item) => item.gameId === gameId && item.itemId === itemId,
  );
}
