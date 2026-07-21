import { createClient } from '@wix/sdk';
import { subscriptionOptions } from '@wix/stores';
import fs from 'fs';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { subscriptionOptions }, auth });
async function mk(title, frequency, interval, discountPct) {
  const settings = { frequency, interval, autoRenewal: true };
  const arg = { title, subscriptionSettings: settings };
  if (discountPct) arg.discount = { type: 'PERCENT', percentValue: discountPct };
  const res = await c.subscriptionOptions.createSubscriptionOption(arg);
  const o = res.subscriptionOption||res;
  return { id: o._id||o.id, title: o.title };
}
const out = {};
try { out.weekly = await mk('Every week','WEEK',1,10); console.log('weekly:', out.weekly.id); } catch(e){ console.log('weekly ERR:', (e.message||'').slice(0,300)); }
try { out.biweekly = await mk('Every 2 weeks','WEEK',2,10); console.log('biweekly:', out.biweekly.id); } catch(e){ console.log('biweekly ERR:', (e.message||'').slice(0,300)); }
fs.writeFileSync('/private/tmp/claude-501/-Users-yuvalbl-Headless/9ee6cf0f-5ba8-4f4f-b9ec-0541fabda200/scratchpad/suboptions.json', JSON.stringify(out,null,2));
