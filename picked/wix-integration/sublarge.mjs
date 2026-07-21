import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { productsV3 }, auth });
const SMALL='fd6d5459-caba-409a-9b27-ad378fb3586d';
const small = await c.productsV3.getProduct(SMALL);
const subs = small.subscriptionDetails.subscriptions.map(s=>({ title:s.title, description:s.description||'', visible:s.visible, frequency:s.frequency, interval:s.interval, autoRenewal:s.autoRenewal }));
const subscriptionDetails = { subscriptions: subs, allowOneTimePurchases: true };
const id='3cd978e8-bff9-4829-831f-d19c7e40381b'; // large
const p = await c.productsV3.getProduct(id);
const res = await c.productsV3.updateProduct(id, { revision: String(p.revision), subscriptionDetails });
console.log('large -> subs:', (res.subscriptionDetails?.subscriptions||res.product?.subscriptionDetails?.subscriptions||[]).length);
