# Jewelry Try-On

> **Live Site:** [camera-sit-9611d6a2-kerenvi.wix-site-host.com](https://camera-sit-9611d6a2-kerenvi.wix-site-host.com/)

A Mac-desktop jewelry try-on. Visitors enable the webcam, MediaPipe maps face and pose landmarks, and Wix Stores products overlay on ears, neck, and head. Checkout sends selected items to Wix eCommerce hosted checkout.

## Technologies

- **Framework:** Astro 5 (static shell + server checkout route)
- **Wix Integration:** Wix Managed Headless — **Wix Stores** (`productsV3.queryProducts`) and **Wix eCommerce** (`checkout.createCheckout` / `getCheckoutUrl`)
- **Styling:** Inline classic-Mac window chrome + GSAP dock
- **Language:** TypeScript / JavaScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
camera-site/
├── src/
│   ├── pages/
│   │   ├── index.astro          # Try-on UI; loads Stores products into zone trays
│   │   └── api/checkout.ts      # Creates an eCom checkout and returns the URL
│   └── lib/wix-client.ts        # OAuth client with Stores + eCom modules
├── .env.example                 # WIX_CLIENT_ID placeholder
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

> **Important:** All commands below must be run from inside the `camera-site/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set camera-site
   cd camera-site
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

4. **Install Wix Stores** from the App Market in [manage.wix.com](https://manage.wix.com). Add products whose **names** contain a zone keyword so they land in the right tray:
   - `ear` → Ears
   - `neck` → Neck
   - `hat` or `head` → Head
   - `wrist` or `bracelet` → Wrist overlay (no dedicated tray in the UI)

   Each product needs a main image (used both as the tray icon and the AR overlay).

5. **Set the OAuth client ID:**
   ```bash
   cp .env.example .env.local
   ```
   Fill in `WIX_CLIENT_ID` from **Dashboard → Settings → Headless Settings → OAuth Apps**.

6. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)). Allow camera access to try items on.

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

2. **Install additional Wix packages** (`@wix/stores`, `@wix/ecom`, `@wix/sdk`).

3. **Configure Astro** with `@wix/astro`, `output: "static"` (checkout route is `prerender: false`). See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix Stores** for the product trays and **Wix eCommerce** for hosted checkout.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
