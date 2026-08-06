import { describe, expect, it } from "vitest";
import {
  GAME_PURCHASE_CATALOG,
  purchaseCatalogForGame,
  purchaseCatalogItem,
} from "./purchases";

describe("game purchase catalog", () => {
  it("registers Arena premium skins as account-visible purchases", () => {
    expect(purchaseCatalogForGame("arena").map((item) => item.itemId)).toEqual([
      "neon-ronin",
      "solar-warden",
    ]);
    expect(purchaseCatalogItem("arena", "neon-ronin")).toMatchObject({
      gameId: "arena",
      name: "Neon Ronin",
      priceLabel: "$2",
      kind: "skin",
    });
  });

  it("keeps games with no paid items empty until they opt in", () => {
    expect(purchaseCatalogForGame("overrun")).toEqual([]);
    expect(purchaseCatalogForGame("squid")).toEqual([]);
    expect(GAME_PURCHASE_CATALOG.every((item) => item.gameId && item.itemId)).toBe(true);
  });
});
