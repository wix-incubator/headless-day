# PICKED

A static site for **PICKED**, a fresh-produce veg-box shop, powered by [Wix Headless](https://www.wix.com/studio/developers/headless) eCommerce.

## What's here

- **`picked/`** — the built static site (`index.html`, `PICKED.dc.html`), 3D produce models (`.glb`), imagery, and the bundled browser cart module (`wix-cart.js`).
- **`wix-integration/`** — the Wix eCommerce integration source. `src/wix-cart.js` is bundled with esbuild into `picked/wix-cart.js`, wiring the static site to Wix Stores + Checkout via the `@wix/sdk`.
- **`wix.config.json`** / **`.wix/`** — Wix CLI project config and deployment topology.
- **`bootstrap.mjs`** — helper for verifying the Wix CLI and handling device-code login.

## Cart integration

`wix-integration/src/wix-cart.js` uses a browser-safe **OAuth visitor client**. The `clientId` is a public value, safe to ship in the page — it is *not* a secret API key. Build the bundle with:

```bash
cd wix-integration
npm install
npm run build   # → ../picked/wix-cart.js
```

## Notes

- No credentials are committed. The admin utility scripts (`probe-get.mjs`, `setstock.mjs`) read `TOKEN` and `SITE_ID` from the environment.
- `node_modules/` and local Wix logs are gitignored.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.
