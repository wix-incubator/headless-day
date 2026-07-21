import { createClient } from '@wix/sdk';
import { subscriptionOptions } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { subscriptionOptions }, auth });
const SMALL='fd6d5459-caba-409a-9b27-ad378fb3586d';
try {
  const r = await c.subscriptionOptions.getSubscriptionOptionsForProduct(SMALL);
  console.log('via SDK:', JSON.stringify(r).slice(0,800));
} catch(e){ console.log('SDK ERR:', (e.message||'').split('\n')[0].slice(0,160)); }
