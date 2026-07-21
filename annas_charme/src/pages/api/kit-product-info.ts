import type { APIRoute } from "astro";
import { productsV3 } from "@wix/stores";
import { auth } from "@wix/essentials";
import { ensureKitInventory } from "../../lib/wix/kit-inventory";

const elevatedGetProductBySlug = auth.elevate(productsV3.getProductBySlug);

// GET — returns product ID + variant IDs for the bracelet kit (elevated for hidden product)
export const GET: APIRoute = async () => {
  try {
    await ensureKitInventory();

    const { product } = await elevatedGetProductBySlug("diy-bracelet-kit", {
      fields: ["VARIANT_OPTION_CHOICE_NAMES"] as any,
    });

    const productId = product?._id;
    if (!productId) {
      return new Response(JSON.stringify({ error: "Product not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const variants: Record<string, string> = {};
    const inStock: Record<string, boolean> = {};
    product?.variantsInfo?.variants?.forEach((v) => {
      const choiceName = v.choices?.find((c) => c.optionChoiceNames?.choiceName)
        ?.optionChoiceNames?.choiceName;
      if (choiceName && v._id) {
        variants[choiceName] = v._id;
        inStock[choiceName] = v.inventoryStatus?.inStock ?? false;
      }
    });

    return new Response(JSON.stringify({ productId, variants, inStock }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
