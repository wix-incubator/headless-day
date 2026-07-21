import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const client = createClient({ modules: { productsV3 }, auth });
const products = { small:'b871045d-ebb2-468d-bfa9-77a7c8a5c3ad', medium:'193320a4-3432-492b-af6c-84ad01929110', large:'d45e8240-421e-40c7-88c9-ed8756d9d345' };
for (const [k,id] of Object.entries(products)) {
  try {
    const p = await client.productsV3.getProduct(id);
    const variants = (p.variantsInfo?.variants||[]).map(v=>({ _id: v._id, price: v.price, physicalProperties: v.physicalProperties||{}, inventoryItem: { trackQuantity: false } }));
    const res = await client.productsV3.updateProductWithInventory(id, { product: { revision: String(p.revision), variantsInfo: { variants } } });
    const prod = res.product || res;
    console.log(k, '-> availability:', prod.inventory?.availabilityStatus || '(unknown)');
  } catch (e) { console.log(k, '-> ERROR:', e.message||String(e)); if(e.details) console.log('   ', JSON.stringify(e.details).slice(0,400)); }
}
