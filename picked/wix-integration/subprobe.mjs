import { createClient } from '@wix/sdk';
import { subscriptionOptions } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { subscriptionOptions }, auth });
// SubscriptionFrequency enum
console.log('freq enum:', JSON.stringify(subscriptionOptions.SubscriptionFrequency||{}));
// Try creating a weekly option (guessing shape from typical Wix subscription model)
try {
  const res = await c.subscriptionOptions.createSubscriptionOption({ subscriptionOption: {
    title: 'Every week',
    subscriptionSettings: { frequency: 'WEEK', interval: 1, billingCycles: null, autoRenewal: true },
  }});
  const o = res.subscriptionOption||res;
  console.log('WEEKLY created id:', o._id||o.id, '| title:', o.title);
} catch(e){ console.log('weekly ERR:', (e.message||'').slice(0,400)); }
