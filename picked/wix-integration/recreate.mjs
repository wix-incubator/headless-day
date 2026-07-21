import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const client = createClient({ modules: { productsV3 }, auth });
const old = ['b871045d-ebb2-468d-bfa9-77a7c8a5c3ad','193320a4-3432-492b-af6c-84ad01929110','d45e8240-421e-40c7-88c9-ed8756d9d345'];
for (const id of old) { try { await client.productsV3.deleteProduct(id); console.log('deleted', id); } catch(e){ console.log('delete fail', id, e.message); } }
const defs = [
  ['small','Small veg box','18','A weekly box of farm-fresh seasonal veg. Perfect for 1-2 people (5 items).'],
  ['medium','Medium veg box','26','A weekly box of farm-fresh seasonal veg. Great for 2-3 people (8 items).'],
  ['large','Large veg box','38','A weekly box of farm-fresh seasonal veg. Feeds a family of 4 (12 items).'],
];
const out = {};
for (const [k,name,price,desc] of defs) {
  const res = await client.productsV3.createProduct({ product: {
    name, productType: 'PHYSICAL', physicalProperties: {}, plainDescription: desc,
    variantsInfo: { variants: [{ price: { actualPrice: { amount: price } }, physicalProperties: {}, inventoryItem: { trackQuantity: false } }] },
  }});
  const p = res.product || res;
  out[k] = { productId: p._id, availability: p.inventory?.availabilityStatus };
  console.log(k, '->', p._id, '| avail:', p.inventory?.availabilityStatus);
}
import fs from 'fs'; fs.writeFileSync('/private/tmp/claude-501/-Users-yuvalbl-Headless/9ee6cf0f-5ba8-4f4f-b9ec-0541fabda200/scratchpad/products.json', JSON.stringify(out,null,2));
