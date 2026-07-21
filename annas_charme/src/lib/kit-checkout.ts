import { DIY_KIT_PRODUCT_TITLE } from "./constants";
import type { Cart, CartItem } from "./wix/types";

export const KIT_PRODUCT_SLUG = "diy-bracelet-kit";

export type KitCheckoutItem = {
  type: string;
  strandCount: number;
  quantity: number;
  kitItems: string[];
};

export function isDiyKitLine(line: CartItem): boolean {
  const title = line.merchandise.product.title || "";
  const handle = line.merchandise.product.handle || "";
  const lower = title.toLowerCase();

  return (
    handle === KIT_PRODUCT_SLUG ||
    title.includes(DIY_KIT_PRODUCT_TITLE) ||
    (lower.includes("diy") &&
      (lower.includes("kit") || lower.includes("bracelet")))
  );
}

function kitCheckoutItemFromLine(line: CartItem): KitCheckoutItem {
  const desc = line.merchandise.title || "";
  const parts = desc.split(" / ").filter(Boolean);
  const styleText = parts[0] ?? desc;
  const multiMatch =
    styleText.match(/(\d+)\s*strands?/i) ?? desc.match(/(\d+)\s*strands?/i);
  const isMulti =
    styleText.toLowerCase().includes("multi") || !!multiMatch;

  return {
    type: isMulti ? "multi" : "single",
    strandCount: multiMatch ? Number(multiMatch[1]) : 5,
    quantity: line.quantity,
    kitItems: parts.slice(1),
  };
}

export function kitCheckoutItemsFromCart(
  cart: Cart | undefined,
): KitCheckoutItem[] {
  if (!cart) return [];

  return cart.lines.filter(isDiyKitLine).map(kitCheckoutItemFromLine);
}
