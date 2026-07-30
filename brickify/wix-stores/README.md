# Wix Stores integration (ready to enable)

This folder holds the shop page. It's kept **out of `src/pages`** so it can't break your
build before the Stores SDKs are installed and Stores is enabled.

## Turn it on

1. **Enable Stores** on the site (dashboard → Add Business Solutions → Wix Stores), add products + a payment method.
2. **Install the SDKs** in the project:
   ```bash
   npm install @wix/stores @wix/ecom @wix/redirects
   ```
3. **Move the page into the build:**
   ```bash
   mv wix-stores/shop.astro src/pages/shop.astro
   ```
4. **Allowed redirect domain** — so Wix checkout can return to your site, add your published
   domain under the project's Headless / OAuth allowed-redirect settings (dashboard).
5. **Deploy:** `npm run build && npm run release`. Your shop is at `/shop`.

## What it does

- Lists products (`@wix/stores` → `products.queryProducts()`), auto-authenticated by the Wix Astro integration.
- Add to cart (`@wix/ecom` → `currentCart.addToCurrentCart`).
- Checkout (`currentCart.createCheckoutFromCurrentCart` → `redirects.createRedirectSession`) → Wix-hosted secure checkout.

## Hooking the builder's "buy" button

In `src/pages/builder.astro`, the bill-of-materials already lists each part + colour + qty.
Map each part → a Wix Store product (or a single "custom pack" product with a computed price),
then call `currentCart.addToCurrentCart({ lineItems: [...] })` with those items and reuse the
same checkout redirect as above.
