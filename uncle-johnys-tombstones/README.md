# Uncle Johny's Tombstones

> **Live Site:** [www.uncle-johny-tombstones.com](https://www.uncle-johny-tombstones.com/)

A horror-themed tombstone shop built with Astro on Wix Managed Headless. Browse the spooky catalogue, add a tombstone to your cart, and check out through a Wix-hosted checkout — complete with an ambient graveyard soundtrack and a suitably grim success/failure flow.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (server output) + React for interactive islands
- **Wix Integration:** Wix Managed Headless — [Wix Stores](https://support.wix.com/en/article/wix-stores-about-wix-stores) (catalogue & cart) + [Wix eCommerce](https://dev.wix.com/docs/rest/business-solutions/e-commerce/introduction) (checkout redirects)
- **Styling:** Vanilla CSS with custom keyframe animations (no external CSS framework)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix build` / `wix release`) — hosted on Wix's cloud infrastructure

## Project Structure

```
uncle-johnys-tombstones/
├── public/              # Static assets (images, audio, SVGs)
├── src/
│   ├── components/      # Page sections: Hero, Pitch, Testimonials, Welcome, footers
│   ├── layouts/         # Shared Layout.astro (nav, cart badge, audio player)
│   ├── lib/
│   │   └── shop.ts      # Server-side helpers for Wix Stores catalogue & cart
│   └── pages/
│       ├── index.astro       # Landing page
│       ├── shop.astro        # Product listing
│       ├── product/[id].astro # Product detail
│       ├── success.astro     # Post-checkout success
│       ├── failure.astro     # Post-checkout failure / abandonment
│       └── api/
│           ├── cart.ts       # GET item count / POST add to cart
│           └── checkout.ts   # Redirect to Wix-hosted checkout
├── astro.config.mjs
└── package.json
```

## How to Create This Yourself

### Prerequisites

- Node.js v20.11.0+
- A [Wix account](https://manage.wix.com)
- [Wix CLI](https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli) installed globally:
  ```bash
  npm install -g @wix/cli
  ```

---

### Option A: Download & Run This Project

> **Important:** All commands below must be run from inside the `uncle-johnys-tombstones/` folder, **not** the monorepo root. The Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set uncle-johnys-tombstones
   cd uncle-johnys-tombstones
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Log in and connect to your own Wix site:**
   ```bash
   wix login
   npm create @wix/new@latest init
   ```
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific, gitignored — not committed to this repo). The business name is derived from the folder name.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Install required Wix Business Solutions** on your new site — install **Wix Stores** from the App Market in [manage.wix.com](https://manage.wix.com) and add products in the Stores dashboard.

5. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

6. **Build and deploy:**
   ```bash
   npm run build
   npm run release
   ```
   Your site will be live on Wix's infrastructure under your site's domain.

---

### Option B: Build It From Scratch

1. **Create a new Wix Managed Headless project:**
   ```bash
   npm create @wix/new@latest -- headless
   ```
   Follow the prompts for business name, folder name, and site template. For a store like this one, choose the `commerce` template.

2. **Install Wix business solution packages:**
   ```bash
   npm install @wix/stores @wix/ecom @wix/redirects @wix/essentials
   ```

3. **Set up Wix Stores on your site:**
   - Go to [manage.wix.com](https://manage.wix.com), open your site, and install **Wix Stores** from the App Market.
   - Add products with images and prices in the Stores dashboard.

4. **Configure Astro for server-side rendering:**
   In `astro.config.mjs`, set `output: "server"` and add the `@wix/astro` and `@wix/astro-pages` integrations:
   ```js
   import wix from "@wix/astro";
   import wixPages from "@wix/astro-pages";

   export default defineConfig({
     integrations: [wix(), wixPages()],
     output: "server",
   });
   ```

5. **Fetch products server-side** using the Wix Stores SDK (no API key needed — authentication is ambient in Managed Headless):
   ```ts
   import { productsV3 } from "@wix/stores";

   const { items } = await productsV3.queryProducts().limit(100).find();
   ```

6. **Wire up cart and checkout** using `@wix/ecom`:
   - `currentCart.addToCurrentCart(...)` to add items
   - `currentCart.createCheckoutFromCurrentCart(...)` + `redirects.createRedirectSession(...)` to send the buyer to Wix-hosted checkout
   - Handle `/success` and `/failure` callback pages

7. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
