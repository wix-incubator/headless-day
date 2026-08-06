import type { APIRoute } from "astro";
import {
  clampQty,
  describeSelection,
  formatPrice,
  normalizeSelection,
  productBySlug,
  selectionColors,
  unitPriceCents,
} from "../../lib/merch/catalog";
import { sanitizePayload } from "../../lib/merch/print";
import { sanitizeVisual } from "../../lib/merch/visual";
import { submitToPrintful } from "../../lib/merch/printfulStub";
import { insertMerchOrder } from "../../lib/wix/merchOrders";
import { getSessionMember } from "../../lib/wix/members";

/**
 * Places a TEST-MODE merch order: validates the checkout form, records the
 * order in the `MerchOrders` collection (elevated — trusted route), and runs
 * the stubbed print-on-demand submission. Sandbox by design: no payment is
 * taken, nothing ships. Anonymous ordering is allowed (it's an office demo);
 * signed-in members get their id attached.
 */
export const POST: APIRoute = async ({ request, redirect }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return redirect("/shop/tee?error=input", 303);
  }
  const read = (key: string) => String(form.get(key) ?? "").trim();

  const product = productBySlug(read("product"));
  if (!product) return redirect("/shop/tee?error=input", 303);

  const selection = normalizeSelection(
    product,
    Object.fromEntries(product.options.map((o) => [o.key, read(o.key) || undefined])),
  );
  const payload = sanitizePayload({ title: read("title"), sub: read("sub") });
  const { warriorSrc, avatarUrl } = sanitizeVisual({ warrior: read("warrior"), avatar: read("avatar") });
  const qty = clampQty(read("qty"));
  const buyerName = read("name").slice(0, 80) || "Anonymous player";
  const buyerEmail = read("email").slice(0, 120);
  if (!selection) return redirect(`/shop/${product.slug}?error=input`, 303);

  const member = await getSessionMember();
  const { garmentColor, printColor } = selectionColors(product, selection);
  const unit = unitPriceCents(product, selection);
  const orderNumber = `TBG-${Date.now().toString(36).toUpperCase()}`;
  const pod = submitToPrintful(orderNumber);

  try {
    await insertMerchOrder({
      orderNumber,
      product: product.slug,
      productName: product.name,
      optionsSummary: describeSelection(product, selection),
      printTitle: payload.title,
      printSub: payload.sub,
      printWarrior: warriorSrc ?? "",
      printAvatar: avatarUrl ?? "",
      garmentColor,
      printColor,
      qty: String(qty),
      unitPrice: formatPrice(unit),
      total: formatPrice(unit * qty),
      buyerName,
      buyerEmail,
      memberId: member?.id ?? "",
      status: "TEST ORDER — no payment taken",
      podProvider: pod.provider,
      podOrderId: pod.podOrderId,
      podStatus: pod.podStatus,
    });
  } catch {
    return redirect(`/shop/${product.slug}?error=save`, 303);
  }

  return redirect(`/shop/confirmed?n=${encodeURIComponent(orderNumber)}`, 303);
};
