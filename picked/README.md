# PICKED

A static site for **PICKED**, a fresh-produce veg-box shop, powered by [Wix Headless](https://www.wix.com/studio/developers/headless) eCommerce.

**Live site:** https://headless-752d6639-yuvalbl47.wix-site-host.com/PICKED.dc.html

## What's here

- **`picked/`** — the built static site (`index.html`, `PICKED.dc.html`), 3D produce models (`.glb`), imagery, and the bundled browser cart module (`wix-cart.js`).
- **`wix-integration/`** — the Wix eCommerce integration source. `src/wix-cart.js` is bundled with esbuild into `picked/wix-cart.js`, wiring the static site to Wix Stores + Checkout via the `@wix/sdk`.
- **`wix.config.json`** — template for the Wix CLI project config (`init` generates the real `wix.config.json`, git-ignored).
- **`bootstrap.mjs`** — helper for verifying the Wix CLI and handling device-code login.

## Run locally (design only)

> All commands below must be run from inside the `picked/` folder, not the monorepo root.

```bash
npx serve picked
# or: python3 -m http.server 8000 --directory picked
```

Open `http://localhost:3000/PICKED.dc.html` (or the port `serve` prints). Until Wix IDs are configured, the site uses its built-in mock cart.

## Connect to your own Wix Headless site

1. **Link this folder to a Wix site:**
   ```bash
   npx @wix/cli login
   npm create @wix/new@latest init
   ```
   Set `site.outputDirectory` to `"./picked"` in the generated `wix.config.json`.

2. **Install Wix Stores** on your site and create three veg-box products (small / medium / large) with subscription options for "subscribe & save".

3. **Edit `picked/PICKED.dc.html`** — uncomment `window.WIX_CART_CONFIG` and replace the `YOUR_*` placeholders with your OAuth Client ID, product IDs, and subscription option IDs.

4. **Build the cart bundle** (after editing `wix-integration/src/wix-cart.js`):
   ```bash
   cd wix-integration
   npm install
   npm run build   # → ../picked/wix-cart.js
   ```

5. **Publish:**
   ```bash
   npx @wix/cli release
   ```

Register your deployed domain in the Headless OAuth app's allowed origins so visitor cart calls succeed.

## Cart integration

`wix-integration/src/wix-cart.js` uses a browser-safe **OAuth visitor client**. The `clientId` is a public value, safe to ship in the page — it is not a secret API key. Real payment is collected on Wix's hosted checkout page.

Admin utility scripts in `wix-integration/` (`probe-get.mjs`, `setstock.mjs`, etc.) read `TOKEN` and `SITE_ID` from the environment — never commit credentials.

## Notes

- `node_modules/` and local Wix logs are gitignored.
- `wix.config.json` is site-specific and must not be committed.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.
