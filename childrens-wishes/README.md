# Children's Wishes

> **Live Site:** [childrens-8eb43195-vadymb.wix-site-host.com](https://childrens-8eb43195-vadymb.wix-site-host.com/)

A wish-granting storefront — each Wix Stores product is a child's wish. Visitors browse wishes, add one to the cart, and complete a Wix hosted checkout so the gift can be fulfilled.

## Technologies

- **Framework:** Astro 5 (server output) + React islands
- **Wix Integration:** Wix Managed Headless — **Wix Stores** catalog (`productsV3`) and **Wix eCommerce** cart + hosted checkout (`currentCart`, `redirects`)
- **Styling:** Custom CSS (Plus Jakarta Sans, Playfair Display, JetBrains Mono)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
childrens-wishes/
├── public/                      # Favicon
├── src/
│   ├── pages/
│   │   ├── index.astro          # Home — live wishes from Wix Stores
│   │   ├── about.astro
│   │   ├── cart.astro           # Cart + hosted checkout redirect
│   │   └── products/
│   │       ├── index.astro      # All wishes
│   │       └── [slug].astro     # Wish detail + add to cart
│   ├── components/
│   │   ├── AddToCartButton.tsx  # Wix eCommerce addToCurrentCart
│   │   └── ProductCard.astro
│   ├── layouts/Layout.astro
│   ├── lib/wix-browser-client.ts
│   ├── utils/wix-image.ts
│   └── styles/global.css
├── .env.example                 # PUBLIC_WIX_CLIENT_ID placeholder
├── wix.config.json              # Placeholder appId / siteId — run `init` locally
└── package.json
```

## How to Create This Yourself

### Prerequisites

- Node.js v20.11.0+
- A [Wix account](https://manage.wix.com)
- [Wix CLI](https://dev.wix.com/docs/wix-cli/guides/about-the-wix-cli) — install globally or use via `npx`:
  ```bash
  npm install -g @wix/cli
  ```

---

### Option A: Download & Run This Project

> **Important:** All commands below must be run from inside the `childrens-wishes/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set childrens-wishes
   cd childrens-wishes
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific — replace the `YOUR_APP_ID_HERE` / `YOUR_SITE_ID_HERE` placeholders). The business name is derived from the folder name.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Install Wix Stores** from the App Market in [manage.wix.com](https://manage.wix.com). Add products — each product is a "wish" (name, description, price, image).

5. **Copy env placeholders and add your OAuth client ID:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `PUBLIC_WIX_CLIENT_ID` from **Dashboard → Settings → Headless Settings → OAuth apps**. Required for add-to-cart and checkout in the browser.

6. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

7. **Build and deploy:**
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
   Follow the prompts for business name, folder name, and site template. For a stores project, choose the `commerce` template.

2. **Install additional Wix packages** as needed (`@wix/stores`, `@wix/ecom`).

3. **Configure Astro** with `@wix/astro` and `@wix/astro-pages` integrations, `output: "server"`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix Stores** for the wish catalog and **Wix eCommerce** for cart + hosted checkout.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
