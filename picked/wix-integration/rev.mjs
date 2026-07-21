import { createClient } from '@wix/sdk';
import { productsV3 } from '@wix/stores';
const auth = { getAuthHeaders: async () => ({ headers: { Authorization: process.env.TOKEN, 'wix-site-id': process.env.SITE_ID } }) };
const c = createClient({ modules: { productsV3 }, auth });
const r = await c.productsV3.getProduct('3d7d6e53-82c0-454f-b9a0-6823d777dda5');
console.log('typeof r:', typeof r, '| keys:', Object.keys(r).slice(0,8).join(','));
console.log('r.revision:', r.revision, '| r.product?.revision:', r.product?.revision, '| r._id:', r._id);
