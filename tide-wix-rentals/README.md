# TIDE Surf Rentals

> **Live Site:** [https://tide-1-hanag82-0607.wix-site-host.com/](https://tide-1-hanag82-0607.wix-site-host.com/)

A Wix Managed Headless surf rental shop. Visitors browse boards, SUPs, wetsuits, and kits, pick a date and duration, and check out through Wix Rentals.

## Technologies

- **Framework:** Astro 5 with React islands
- **Wix Integration:** Wix Managed Headless — Wix Rentals, eCommerce checkout, CMS, and Forms
- **Styling:** Tailwind CSS 4 and custom CSS
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
tide-wix-rentals/
├── public/                 # Static assets
├── src/
│   ├── components/         # Rental cards, checkout form, contact form, layout chrome
│   ├── layouts/            # Shared page layout
│   ├── pages/              # Home, rentals, about, FAQ, contact
│   ├── styles/             # Global and page styles
│   └── utils/              # Wix Rentals mapping and helpers
├── astro.config.mjs
├── package.json
├── wix.config.json         # Placeholders only — replace with your own site
└── .env.example            # Env var names; copy to .env.local
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

1. **Clone this repo:**
   ```bash
   git clone https://github.com/hanag-wix/tide-wix-rentals.git
   cd tide-wix-rentals
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json`. The committed file in this repo uses placeholders (`<appId>`, `<siteId>`) only — do not commit your real IDs.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Install Wix Rentals** on your new site from the App Market in [manage.wix.com](https://manage.wix.com). Add rental products (boards, SUPs, wetsuits, kits) and availability in the dashboard. Optionally add a contact form and CMS testimonials collection.

5. **Generate local env** (creates `.env.local` — gitignored, do not commit):
   ```bash
   npm run env
   ```

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
   Follow the prompts for business name, folder name, and site template.

2. **Install additional Wix packages** used by this project:
   ```bash
   npm install @wix/bookings @wix/ecom @wix/redirects @wix/forms @wix/data @wix/wix-data-items-sdk
   ```

3. **Configure Astro** with `@wix/astro` and `@wix/astro-pages` integrations, `output: "server"`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Install Wix Rentals** in the dashboard and wire listing, availability, and checkout with the Wix SDK in server-side code (and a React island for the rental form).

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
