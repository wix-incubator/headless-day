import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { productsV3 } from '@wix/stores';
import { checkout } from '@wix/ecom';
import { redirects } from '@wix/redirects';
import { STORES_APP_ID, COLOUR_OPTION_NAME } from '../../lib/parts';

export const prerender = false;

/**
 * Builds a real Wix Stores checkout from the bill of materials the builder sends:
 *   { items: [{ name: "Brick 1×2", colour: "Red", qty: 8 }, ...] }
 * Each part maps to a catalog product; each colour maps to a product variant.
 * Creating a checkout needs admin permissions, so calls are elevated.
 */

// cache the name -> productId map across requests (same worker instance)
const productIdByName = new Map<string, string>();
// cache productId -> (choiceName -> variantId)
const variantCache = new Map<string, Record<string, string>>();
let catalogLoaded = false;

// Query Products (V3) can't filter by name, so load the whole catalog once
// (there are only ~62 products) and build a name -> id map.
async function loadCatalog(): Promise<void> {
  if (catalogLoaded) return;
  let cursor: string | undefined;
  for (let i = 0; i < 12; i++) {
    const query: any = { filter: {}, cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } };
    const res: any = await auth.elevate(productsV3.queryProducts)(query);
    for (const p of res?.products || res?.items || []) {
      const id = p?._id || p?.id;
      if (p?.name && id) productIdByName.set(p.name, id);
    }
    const meta = res?.pagingMetadata || {};
    cursor = meta?.cursors?.next;
    if (!meta?.hasNext || !cursor) break;
  }
  catalogLoaded = true;
}

async function resolveProductId(name: string): Promise<string | null> {
  if (productIdByName.has(name)) return productIdByName.get(name)!;
  await loadCatalog();
  return productIdByName.get(name) || null;
}

async function resolveVariantId(productId: string, choiceName: string): Promise<string | null> {
  let map = variantCache.get(productId);
  if (!map) {
    const res: any = await auth.elevate(productsV3.getProduct)(productId);
    const prod = res?.product || res;
    // getProduct returns variant choices as optionChoiceIds (optionId + choiceId),
    // so first map each choiceId -> colour name from the option definition.
    const opt = (prod?.options || []).find((o: any) => o?.name === COLOUR_OPTION_NAME) || prod?.options?.[0];
    const idToName: Record<string, string> = {};
    for (const c of opt?.choicesSettings?.choices || []) if (c?.choiceId && c?.name) idToName[c.choiceId] = c.name;
    map = {};
    for (const v of prod?.variantsInfo?.variants || []) {
      const vid = v?._id || v?.id;
      const ch = v?.choices?.[0];
      const nm = (ch?.optionChoiceIds?.choiceId && idToName[ch.optionChoiceIds.choiceId]) || ch?.optionChoiceNames?.choiceName;
      if (nm && vid) map[nm] = vid;
    }
    variantCache.set(productId, map);
  }
  return map[choiceName] || null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({} as any));
    const items: Array<{ name: string; colour: string; qty: number }> = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ error: 'No items in bill of materials.' }, 400);

    const lineItems: any[] = [];
    const unresolved: string[] = [];

    for (const it of items) {
      const qty = Math.max(1, parseInt(String(it.qty), 10) || 1);
      const productId = await resolveProductId(it.name);
      if (!productId) { unresolved.push(`${it.name} (no product — run /api/seed-catalog?)`); continue; }
      const variantId = await resolveVariantId(productId, it.colour);
      const options = variantId ? { variantId } : { options: { [COLOUR_OPTION_NAME]: it.colour } };
      lineItems.push({ catalogReference: { appId: STORES_APP_ID, catalogItemId: productId, options }, quantity: qty });
    }

    if (!lineItems.length) return json({ error: 'Could not resolve any parts to products.', unresolved }, 422);

    const created = await auth.elevate(checkout.createCheckout)({
      channelType: checkout.ChannelType.WEB,
      lineItems,
    } as any);

    const { redirectSession } = await redirects.createRedirectSession({
      ecomCheckout: { checkoutId: created._id! },
      callbacks: { postFlowUrl: new URL(request.url).origin },
    });

    return json({ url: redirectSession?.fullUrl, resolved: lineItems.length, unresolved }, 200);
  } catch (e: any) {
    return json({ error: e?.message || 'checkout failed' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
