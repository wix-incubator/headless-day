# Deploy Brickify on Wix + add Wix Stores

This project is a **Wix-managed headless** Astro app (`@wix/astro`). Wix hosts it, builds it, gives it a global CDN + SSL, and it is the *same entity* as a Wix site with a dashboard, billing, and business solutions (Stores, etc.). Run `npm create @wix/new@latest init` to generate a local `wix.config.json` (git-ignored) linked to your site.

## What only you can run (needs your Wix login)

The Wix CLI ties every command to *your* Wix account, so these run on your Mac (they can't run from an automated sandbox):

- **Build + release** the site.
- **Enable the Wix Stores** business solution and set up billing/payments.

Everything else (the app code, the Stores integration) is in the repo and ready.

## Prerequisites

- Node.js **v20.11+** (you have v20.19 ✓).
- Logged into Wix: `npx @wix/cli login`, then `npm create @wix/new@latest init` if you have not linked this folder yet.

## 1 — Deploy the site

From the project folder on your Mac:

```bash
npm install        # make sure deps are installed for your OS
npm run build      # = wix build  (compiles the Astro app)
npm run preview    # optional — shareable preview URLs for the site + dashboard
npm run release    # = wix release  → publishes; prints your LIVE site URL + dashboard URL
```

`wix release` pushes to Wix's servers and publishes. It prints:
- your **published site URL**,
- your **dashboard URL** (used in step 2).

## 2 — Add Wix Stores (eCommerce)

Your headless project is also a Wix site with a dashboard, so you add Stores there:

1. Open your **site dashboard** (the URL printed by `release`/`preview`, or go to `manage.wix.com` → this site).
2. Add the **Wix Stores / eCommerce** business solution (Dashboard → **Add Apps / Business Solutions → Wix Stores**).
3. In the Stores dashboard, add your **products, prices, inventory, shipping**, and connect a **payment method** (needed for real checkout).

This provisions the Stores backend: products, cart, checkout, and orders APIs on the same site.

## 3 — Wire Stores into the app (code)

Install the eCommerce SDKs:

```bash
npm install @wix/stores @wix/ecom
```

Then the integration is:

- **List products** — `@wix/stores` → `products.queryProducts()`.
- **Cart** — `@wix/ecom` → `currentCart.addToCurrentCart({ lineItems })`.
- **Checkout** — `@wix/ecom` → `currentCart.createCheckoutFromCurrentCart()` then redirect to the returned Wix checkout URL.
- **Builder → buy** — map each part in the bill-of-materials to a Store product/variant ID and add them all to the cart, then check out.

> I'll finalize this code (a `/shop` page + hooking the builder's "buy" button into add-to-cart/checkout) **after Stores is enabled**, so it's written against your real product catalog and the exact client API — not guessed.

## What Wix handles for you

Hosting, builds, deployments, global CDN, SSL, autoscaling, environment config, and secure checkout + automated sales tax (via Stores). You don't need any other infra.
