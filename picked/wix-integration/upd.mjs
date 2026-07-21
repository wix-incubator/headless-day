import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { productsV3 }, auth });
console.log('updateProduct arg count:', c.productsV3.updateProduct.length);
const SMALL='fd6d5459-caba-409a-9b27-ad378fb3586d';
const small = await c.productsV3.getProduct(SMALL);
const subs = small.subscriptionDetails.subscriptions.map(s=>({ title:s.title, description:s.description||'', visible:s.visible, frequency:s.frequency, interval:s.interval, autoRenewal:s.autoRenewal }));
const subscriptionDetails = { subscriptions: subs, allowOneTimePurchases: true };
const id='3d7d6e53-82c0-454f-b9a0-6823d777dda5';
const p = await c.productsV3.getProduct(id);
// try positional: updateProduct(_id, product)
try {
  const res = await c.productsV3.updateProduct(id, { revision: String(p.revision), subscriptionDetails });
  const prod=res.product||res;
  console.log('positional(id, {revision,...}) OK. subs:', (prod.subscriptionDetails?.subscriptions||[]).length);
} catch(e){ console.log('positional ERR:', e.message.split('\n')[0].slice(0,180)); }
