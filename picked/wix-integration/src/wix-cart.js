// PICKED — Wix eCommerce cart bridge.
//
// Bundled (by esbuild) into ../picked/wix-cart.js as an IIFE that also exposes
// window.wixCart. The static PICKED site calls this tiny API; all @wix/sdk
// machinery is hidden here.
//
// Auth: a browser-safe OAuth "visitor" client. The clientId is a PUBLIC value
// (safe to ship in the page) — it is NOT a secret API key. Real payment is
// collected on Wix's hosted checkout page, which we redirect to.
//
// Config is read from window.WIX_CART_CONFIG (set inline in the HTML before this
// script loads) so the built bundle is generic and the site owner only edits IDs
// in one place. Each box maps to a Wix Stores product id, plus an optional
// subscriptionOptionId (created in the dashboard) that enables "subscribe & save":
//   window.WIX_CART_CONFIG = {
//     clientId: '<oauth-app-client-id>',
//     products: {
//       small:  { productId: '<id>', subscriptionOptionId: '<subId>' },
//       medium: { productId: '<id>', subscriptionOptionId: '<subId>' },
//       large:  { productId: '<id>', subscriptionOptionId: '<subId>' }
//     }
//   }
// (A bare string value, products.small = '<id>', is also accepted = one-time only.)

import { createClient, OAuthStrategy } from '@wix/sdk';
import { currentCart, checkout } from '@wix/ecom';

let _client = null;
let _cfg = null;

function config() {
  if (_cfg) return _cfg;
  _cfg = (typeof window !== 'undefined' && window.WIX_CART_CONFIG) || null;
  return _cfg;
}

// True only when a real clientId + product map are present. The site guards on
// this so it can fall back to its built-in mock cart until Wix is configured.
function isConfigured() {
  const c = config();
  return !!(c && c.clientId && c.products && Object.keys(c.products).length);
}

function client() {
  if (_client) return _client;
  const c = config();
  if (!c || !c.clientId) throw new Error('wixCart: WIX_CART_CONFIG.clientId is not set');
  _client = createClient({
    modules: { currentCart, checkout },
    auth: OAuthStrategy({ clientId: c.clientId }),
  });
  return _client;
}

// Normalize a product config entry to { productId, subscriptionOptionId? }.
// Accepts either an object or a bare string (= one-time-only product id).
function productFor(sizeKey) {
  const c = config();
  const entry = c && c.products && c.products[sizeKey];
  if (!entry) throw new Error('wixCart: no product mapped for basket size "' + sizeKey + '"');
  return (typeof entry === 'string') ? { productId: entry } : entry;
}

// True if this box has a subscription option configured (so the UI can show a
// "subscribe & save" choice only where it's actually available).
function canSubscribe(sizeKey) {
  try { return !!productFor(sizeKey).subscriptionOptionId; } catch (e) { return false; }
}

// Wix Stores catalog app id (constant across all Wix Stores sites).
const WIX_STORES_APP_ID = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

// Add one box to the visitor's real Wix cart.
//   sizeKey  : 'small' | 'medium' | 'large'
//   opts.mode: 'once' (default) or 'subscribe'
// A subscription adds catalogReference.options.subscriptionOptionId so Wix bills
// it on the option's cadence; one-time omits it.
async function addBox(sizeKey, opts = {}) {
  const { productId, subscriptionOptionId } = productFor(sizeKey);
  const quantity = opts.quantity || 1;
  const subscribe = opts.mode === 'subscribe';
  if (subscribe && !subscriptionOptionId) {
    throw new Error('wixCart: basket "' + sizeKey + '" has no subscriptionOptionId configured');
  }
  const catalogReference = {
    appId: WIX_STORES_APP_ID,
    catalogItemId: productId,
  };
  if (subscribe) catalogReference.options = { subscriptionOptionId };
  const { cart } = await client().currentCart.addToCurrentCart({
    lineItems: [{ quantity, catalogReference }],
  });
  return cart;
}

// Fetch the current cart (line items + totals) for syncing the UI. Returns null
// if there is no cart yet (visitor hasn't added anything).
async function getCart() {
  try {
    return await client().currentCart.getCurrentCart();
  } catch (e) {
    // NOT_FOUND is normal for an empty/never-created cart.
    if (e && (e.details?.applicationError?.code === 'OWNED_CART_NOT_FOUND' || /not.?found/i.test(String(e.message)))) {
      return null;
    }
    throw e;
  }
}

// Turn the current cart into a checkout and return the hosted Wix checkout URL
// the browser should navigate to for real payment.
async function getCheckoutUrl() {
  const { checkoutId } = await client().currentCart.createCheckoutFromCurrentCart({
    channelType: currentCart.ChannelType.WEB,
  });
  const { checkoutUrl } = await client().checkout.getCheckoutUrl(checkoutId);
  return checkoutUrl;
}

// Convenience: add a box then immediately go to hosted checkout.
async function checkoutBox(sizeKey, opts = {}) {
  await addBox(sizeKey, opts);
  const url = await getCheckoutUrl();
  if (url && typeof window !== 'undefined') window.location.assign(url);
  return url;
}

const api = { isConfigured, canSubscribe, addBox, getCart, getCheckoutUrl, checkoutBox };

if (typeof window !== 'undefined') window.wixCart = api;

export default api;
