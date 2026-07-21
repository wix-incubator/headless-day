# Exploded Horology Lab — an interactive watch-atelier template

An interactive, single-page luxury-watch storefront: a Three.js **exploded-view 3D lab** where you
scroll to take a mechanical movement apart plate by plate, click any component to read its story, a
**live configurator** (bezel · dial · strap · crown · movement with running pricing), and a
**reserve → checkout** flow.

It works **standalone out of the box** (open `index.html` and the 3D lab, configurator and reserve
modal all run client-side). It's also **pre-wired for [Wix Headless](https://www.wix-headless.dev)**
— drop in your own IDs and every reservation records to a Wix CMS collection and the buy flow
redirects to a real Wix hosted checkout.

> Built with [Claude Design](https://claude.ai) + [Wix Headless](https://www.wix-headless.dev).

**Live site:** https://www.disacustomwatch.com/

## Quick start (design only)

```bash
# any static server works
npx serve .
# or
python3 -m http.server 8000
```

Open the URL. No build step, no dependencies — it's static HTML + JS. `support.js` is the Claude
Design runtime; `watch-lab.js` is the Three.js scene.

## Files

| File | What it is |
|---|---|
| `index.html` | The page: markup, styles, the configurator/reserve logic, SEO `<head>`, and the (inert-by-default) Wix wiring. |
| `watch-lab.js` | The Three.js exploded-view 3D watch. |
| `support.js` | Claude Design client runtime (renders the `x-dc` component + `{{bindings}}`). |
| `og.jpg` | 1200×630 social/link-preview image. |
| `wix.config.example.json` | Template for the Wix project config (`init` generates the real one). |
| `AGENTS.md` | Full architecture docs, REST setup calls, and known gotchas for Wix Headless wiring. |

## Connect it to your own Wix Headless (optional)

The Wix wiring in `index.html` stays **inert** until you fill in your own IDs — until then the
"Reserve" flow shows the built-in front-end confirmation only. To make it live:

1. **Create a Wix Headless project** over this folder:
   ```bash
   npm create @wix/new@latest init
   ```
   This creates a site under your Wix account and writes `wix.config.json` (with your `appId` +
   `siteId`). Set `site.outputDirectory` to `"."`.

   The fastest path is the **Wix Headless skill** at <https://www.wix-headless.dev/skill.md>, which
   automates install + wiring; the steps below are the manual equivalent.

2. **Install the apps** you want: Wix Stores (+ eCommerce), Wix CMS (Wix Data). See
   [AGENTS.md](AGENTS.md) for the exact REST calls.

3. **Create the backend:**
   - A **Wix Stores** product for the watch (base price + option groups).
   - A **`Reservations` CMS collection** (`insert: ANYONE`, `read: ADMIN`) with columns:
     `title, fullName, email, bezel, dial, strap, crown, movement, total, downpaymentPaid, delta, status`.

4. **Fill the placeholders** at the top of the injected `<script type="module">` in `index.html`:
   ```js
   const APP_ID     = "YOUR_WIX_APP_ID";   // OAuth clientId from wix.config.json
   const PRODUCT_ID = "YOUR_PRODUCT_ID";   // your Stores product
   const VARIANT_ID = "YOUR_VARIANT_ID";   // the variant to check out (products with options need this)
   ```
   Also replace `https://your-site.example` in the SEO/OG tags with your published URL.

5. **Publish:**
   ```bash
   npx @wix/cli@latest release
   ```

Full architecture, the reserve/checkout model, and gotchas are documented in [AGENTS.md](AGENTS.md).

## SEO / GEO

`index.html` ships with `<title>`, meta description, canonical, Open Graph + Twitter tags, an inline
SVG favicon, and **JSON-LD** (`Organization` + `Product`). `robots.txt` and `llms.txt` are set via
the Wix SEO REST endpoints (Wix intercepts those root paths) — see AGENTS.md.

## License

[MIT](LICENSE) — use it, remix it, ship your own atelier.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.
