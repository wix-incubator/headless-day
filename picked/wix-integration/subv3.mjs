import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { productsV3 }, auth });
const SMALL='fd6d5459-caba-409a-9b27-ad378fb3586d';
const targets = { medium:'3d7d6e53-82c0-454f-b9a0-6823d777dda5', large:'3cd978e8-bff9-4829-831f-d19c7e40381b' };
// read the working small box's subscriptionDetails, minus the ids (let Wix mint new ones)
const small = await c.productsV3.getProduct(SMALL);
const src = small.subscriptionDetails;
const subs = src.subscriptions.map(s=>({ title:s.title, description:s.description||'', visible:s.visible, frequency:s.frequency, interval:s.interval, autoRenewal:s.autoRenewal }));
const subscriptionDetails = { subscriptions: subs, allowOneTimePurchases: true };
for (const [k,id] of Object.entries(targets)) {
  try {
    const p = await c.productsV3.getProduct(id);
    const res = await c.productsV3.updateProduct(id, { product: { revision: String(p.revision), subscriptionDetails } });
    const prod = res.product||res;
    const n = (prod.subscriptionDetails?.subscriptions||[]).length;
    console.log(k, '-> OK, subscriptions:', n, '| allowOneTime:', prod.subscriptionDetails?.allowOneTimePurchases);
  } catch(e){ console.log(k,'ERR:', e.message); }
}
