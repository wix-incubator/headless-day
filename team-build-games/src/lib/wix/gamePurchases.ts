/**
 * Member-owned game purchases.
 *
 * This is intentionally game-agnostic at the account-page boundary. Arena is
 * backed by `ArenaSkinPurchases` today; other games can add adapters without
 * changing the account UI.
 */

import { GAMES } from "../members/games";
import {
  purchaseCatalogForGame,
  purchaseCatalogItem,
  type GamePurchaseCatalogItem,
} from "../members/purchases";
import { getOwnedArenaSkins } from "./arenaSkins";

export interface MemberGamePurchaseGroup {
  gameId: string;
  gameName: string;
  availableItems: GamePurchaseCatalogItem[];
  ownedItems: GamePurchaseCatalogItem[];
}

async function ownedArenaItems(memberId: string): Promise<GamePurchaseCatalogItem[]> {
  const owned = await getOwnedArenaSkins(memberId);
  return owned
    .map((skin) => purchaseCatalogItem("arena", skin))
    .filter((item): item is GamePurchaseCatalogItem => !!item);
}

export async function getMemberGamePurchases(
  memberId: string,
): Promise<MemberGamePurchaseGroup[]> {
  const ownedByGame = new Map<string, GamePurchaseCatalogItem[]>([
    ["arena", await ownedArenaItems(memberId)],
  ]);

  return GAMES.map((game) => ({
    gameId: game.id,
    gameName: game.name,
    availableItems: purchaseCatalogForGame(game.id),
    ownedItems: ownedByGame.get(game.id) ?? [],
  }));
}
