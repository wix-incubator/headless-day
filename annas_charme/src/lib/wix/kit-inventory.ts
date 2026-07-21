import { inventoryItemsV3, productsV3 } from "@wix/stores";
import { auth } from "@wix/essentials";

const KIT_PRODUCT_SLUG = "diy-bracelet-kit";

const elevatedGetProductBySlug = auth.elevate(productsV3.getProductBySlug);
const elevatedQueryInventory = auth.elevate(inventoryItemsV3.queryInventoryItems);
const elevatedBulkCreate = auth.elevate(inventoryItemsV3.bulkCreateInventoryItems);
const elevatedBulkUpdate = auth.elevate(inventoryItemsV3.bulkUpdateInventoryItems);

let ensurePromise: Promise<void> | null = null;

async function queryKitInventoryItems(productId: string) {
  const query = elevatedQueryInventory();
  const builder =
    typeof query.eq === "function"
      ? query.eq("productId", productId)
      : query;
  const { items = [] } = await builder.find();
  return items;
}

export async function ensureKitInventory(): Promise<void> {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const { product } = await elevatedGetProductBySlug(KIT_PRODUCT_SLUG, {
      fields: ["VARIANT_OPTION_CHOICE_NAMES"] as any,
    });

    const productId = product?._id;
    const variantIds =
      product?.variantsInfo?.variants?.map((v) => v._id!).filter(Boolean) ?? [];

    if (!productId || variantIds.length === 0) return;

    const items = await queryKitInventoryItems(productId);

    if (items.length === 0) {
      await elevatedBulkCreate(
        variantIds.map((variantId) => ({
          productId,
          variantId,
          inStock: true,
          trackQuantity: false,
        })),
      );
      return;
    }

    const needsUpdate = items.some((item) => item.inStock !== true);
    if (!needsUpdate) return;

    await elevatedBulkUpdate({
      inventoryItems: items.map((item) => ({
        inventoryItem: {
          id: item._id!,
          revision: item.revision!,
          inStock: true,
          trackQuantity: false,
        },
      })),
    });
  })().catch((e) => {
    ensurePromise = null;
    console.warn("ensureKitInventory failed:", e?.message ?? e);
  });

  return ensurePromise;
}

export function isUnavailableCartLineItem(item: {
  _id?: string | null;
  quantity?: number | null;
}) {
  return (item.quantity ?? 0) < 1;
}
