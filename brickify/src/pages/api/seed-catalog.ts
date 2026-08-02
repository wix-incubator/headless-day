import type { APIRoute } from 'astro';
import { auth } from '@wix/essentials';
import { productsV3 } from '@wix/stores';
import { PARTS, COLOURS, priceOf, COLOUR_OPTION_NAME } from '../../lib/parts';

export const prerender = false;

// One-time catalog seeder. Creates one Wix Stores product per brick part, each
// with a "Colour" swatch option + one variant per colour, using Bulk Create
// (one request per batch — avoids the per-request timeout of creating products
// one by one). Idempotent: parts whose product name already exists are skipped.
//
// Query params (all require ?key=<SEED_KEY>):
//   dryRun=1  — list what would be created, create nothing
//   reset=1   — DELETE every product in the catalog (use to clear duplicates)
//
// SECURITY: runs with elevated (admin) permissions, so it's gated behind a
// token. Set BRICKIFY_SEED_KEY in .env.local, then DELETE this file once seeded.
const SEED_KEY = process.env.BRICKIFY_SEED_KEY?.trim() || '';

// 1000-variant-per-bulk-call limit ÷ 28 colours ⇒ ≤35 products per batch.
const BATCH = 30;

function buildProduct(part: (typeof PARTS)[number]) {
  const price = String(priceOf(part.fam, part.w, part.d));
  return {
    name: part.name,
    productType: 'PHYSICAL',
    physicalProperties: {},
    visible: true,
    options: [
      {
        name: COLOUR_OPTION_NAME,
        optionRenderType: 'SWATCH_CHOICES',
        choicesSettings: {
          choices: COLOURS.map((c) => ({ choiceType: 'ONE_COLOR', name: c.name, colorCode: c.hex })),
        },
      },
    ],
    variantsInfo: {
      variants: COLOURS.map((c) => ({
        visible: true,
        sku: `${part.id}-${c.key}`,
        choices: [
          { optionChoiceNames: { optionName: COLOUR_OPTION_NAME, choiceName: c.name, renderType: 'SWATCH_CHOICES' } },
        ],
        price: { actualPrice: { amount: price } },
        physicalProperties: {},
        // stock the variant so it's purchasable (otherwise "out of stock" blocks checkout)
        inventoryItem: { quantity: 99999 },
      })),
    },
  };
}

async function queryPage(cursor?: string): Promise<any> {
  const query: any = { filter: {}, cursorPaging: { limit: 100, ...(cursor ? { cursor } : {}) } };
  return await auth.elevate(productsV3.queryProducts)(query);
}

async function allProducts(): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 12; i++) {
    const res: any = await queryPage(cursor);
    for (const p of res?.products || res?.items || []) out.push(p);
    const meta = res?.pagingMetadata || {};
    cursor = meta?.cursors?.next;
    if (!meta?.hasNext || !cursor) break;
  }
  return out;
}

async function handle(url: URL): Promise<Response> {
  if (!SEED_KEY || url.searchParams.get('key') !== SEED_KEY) {
    return json({ error: 'Forbidden — set BRICKIFY_SEED_KEY and pass ?key=…' }, 403);
  }

  // diagnostic: show exactly what queryProducts + getProduct return (variant structure)
  if (url.searchParams.get('debug') === '1') {
    try {
      const res: any = await queryPage();
      const arr = res?.products || res?.items || [];
      const first = arr[0];
      let variantDump: any = null;
      if (first?._id) {
        const gp: any = await auth.elevate(productsV3.getProduct)(first._id);
        const prod = gp?.product || gp;
        const v0 = prod?.variantsInfo?.variants?.[0];
        variantDump = {
          getProductKeys: Object.keys(gp || {}),
          prodKeys: Object.keys(prod || {}),
          variantCount: prod?.variantsInfo?.variants?.length ?? null,
          variant0Keys: v0 ? Object.keys(v0) : [],
          variant0: v0 ?? null,
        };
      }
      return json({
        productsLen: res?.products?.length ?? null,
        firstProductId: first?._id ?? null,
        firstProductName: first?.name ?? null,
        variantDump,
      }, 200);
    } catch (e: any) {
      return json({ debugError: String(e?.message || e).slice(0, 400) }, 200);
    }
  }

  // reset: wipe the whole catalog (clears any duplicates)
  if (url.searchParams.get('reset') === '1') {
    try {
      const prods = await allProducts();
      const ids = prods.map((p) => p._id || p.id).filter(Boolean);
      let deleted = 0;
      for (let i = 0; i < ids.length; i += 100) {
        await auth.elevate(productsV3.bulkDeleteProducts)(ids.slice(i, i + 100) as any);
        deleted += Math.min(100, ids.length - i);
      }
      return json({ reset: true, deleted }, 200);
    } catch (e: any) {
      return json({ error: 'reset failed: ' + (e?.message || e) }, 500);
    }
  }

  const dryRun = url.searchParams.get('dryRun') === '1';

  let existing = new Set<string>();
  try {
    (await allProducts()).forEach((p) => p?.name && existing.add(p.name));
  } catch (e: any) {
    return json({ error: 'Could not list existing products: ' + (e?.message || e) }, 500);
  }

  const todo = PARTS.filter((p) => !existing.has(p.name));
  if (dryRun) {
    return json({ dryRun: true, alreadyPresent: existing.size, wouldCreate: todo.length, names: todo.map((p) => p.name) }, 200);
  }

  const withInv = auth.elevate(productsV3.bulkCreateProductsWithInventory);
  const plain = auth.elevate(productsV3.bulkCreateProducts);
  let created = 0;
  let withoutInventory = 0;
  const errors: any[] = [];
  const clip = (e: any) => String(e?.message || e).slice(0, 300);
  for (let i = 0; i < todo.length; i += BATCH) {
    const slice = todo.slice(i, i + BATCH);
    const products = slice.map(buildProduct);
    try {
      await withInv(products as any, { returnEntity: false } as any);
      created += slice.length;
    } catch (e1: any) {
      // fallback: create without inventory so the catalog still populates
      try {
        const noInv = products.map((p: any) => ({
          ...p,
          variantsInfo: { variants: p.variantsInfo.variants.map(({ inventoryItem, ...v }: any) => v) },
        }));
        await plain(noInv as any, { returnEntity: false } as any);
        created += slice.length;
        withoutInventory += slice.length;
        errors.push({ batchStart: slice[0]?.name, note: 'created WITHOUT inventory', withInventoryError: clip(e1) });
      } catch (e2: any) {
        errors.push({ batchStart: slice[0]?.name, error: clip(e2) });
      }
    }
  }

  return json({
    ok: created > 0,
    alreadyPresent: existing.size,
    created,
    withoutInventory,
    stillMissing: PARTS.length - existing.size - created,
    errors: errors.length,
    errorDetail: errors.slice(0, 5),
  }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), { status, headers: { 'content-type': 'application/json' } });
}

export const GET: APIRoute = ({ request }) => handle(new URL(request.url));
export const POST: APIRoute = ({ request }) => handle(new URL(request.url));
