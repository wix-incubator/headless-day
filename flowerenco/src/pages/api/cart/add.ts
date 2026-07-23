import type { APIRoute } from "astro";
import { productsV3, readOnlyVariantsV3 } from "@wix/stores";
import { currentCart } from "@wix/ecom";

const STORES_APP_ID = "215238eb-22a5-4c36-9e7b-e7c08025e04e";

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json" } });
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const { productId, productName, size, style, notes, photoUrl, quantity = 1 } = await request.json();
    if (!productId) return json({ error: "Missing product." }, 400);

    // Resolve the variant that matches the chosen size (variants are a separate resource).
    let variantId: string | undefined;
    try {
      const { items: variants } = await readOnlyVariantsV3
        .queryVariants()
        .eq("productData.productId", productId)
        .find();
      let variant = variants?.[0];
      if (size && variants?.length) {
        const match = variants.find((v: any) =>
          (v.optionChoices || []).some((c: any) => c?.optionChoiceNames?.choiceName === size)
        );
        if (match) variant = match;
      }
      variantId = variant?.variantId ?? variant?._id;
    } catch {
      /* single-variant / no variants — fall through without variantId */
    }

    await currentCart.addToCurrentCart({
      lineItems: [
        {
          quantity,
          catalogReference: {
            catalogItemId: productId,
            appId: STORES_APP_ID,
            ...(variantId ? { options: { variantId } } : {}),
          },
        },
      ],
    });

    // Attach the buyer's custom brief (size + notes + reference photo) to the order via the buyer note.
    try {
      const cart = await currentCart.getCurrentCart();
      const prev = cart?.buyerNote ? cart.buyerNote + "\n" : "";
      const parts = [
        `• ${productName || "Vase"}`,
        `Size: ${size || "one size"}`,
        `Style: ${style || "—"}`,
      ];
      if (notes) parts.push(`Notes: ${notes}`);
      if (photoUrl) parts.push(`Photo: ${photoUrl}`);
      const line = parts.join(" | ");
      const buyerNote = (prev + line).slice(0, 1000);
      await currentCart.updateCurrentCart({ cartInfo: { buyerNote } });
    } catch {
      /* buyer-note is best-effort; the line item is already in the cart */
    }

    let count = quantity;
    try {
      const c = await currentCart.getCurrentCart();
      count = (c?.lineItems || []).reduce((a: number, l: any) => a + (l.quantity || 1), 0);
    } catch {}

    return json({ ok: true, count });
  } catch (e: any) {
    return json({ error: e?.message || "Could not add to cart." }, 500);
  }
};
