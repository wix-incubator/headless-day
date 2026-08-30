# Tidal Coding Camp

> **Live Site:** [tidal-codi-8d0dc8a1-shaykovach.wix-site-host.com](https://tidal-codi-8d0dc8a1-shaykovach.wix-site-host.com/)

A teen summer coding camp on a Brittany tidal island — sessions timed to the tide tables. Visitors browse the program and camper projects, watch a live tide clock, and submit an application that lands in Wix CMS.

## Technologies

- **Framework:** Astro 5 (server output)
- **Wix Integration:** Wix Managed Headless — **Wix CMS (Data)** for `CamperProjects`, `Applications`, and `SessionSeats` (apply form insert + live seat counts). `@wix/essentials` elevates seat writes on apply.
- **Styling:** Custom coastal-cartographic CSS (Gloock + Spline Sans)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
tidal-coding-camp/
├── public/assets/               # Causeway / camp photography
├── src/
│   ├── pages/
│   │   ├── index.astro          # Home
│   │   ├── program.astro
│   │   ├── schedule.astro       # Live tide clock
│   │   ├── island.astro
│   │   ├── projects.astro       # CMS gallery + seed fallback
│   │   ├── apply.astro          # Application form
│   │   ├── faq.astro
│   │   └── api/
│   │       ├── apply.ts         # Validates + inserts Applications
│   │       ├── seats.ts         # Public SessionSeats read
│   │       └── setup-seats.ts   # Token-guarded one-time seat seed
│   ├── components/
│   ├── data/projects.ts         # Local project seed
│   └── styles/global.css
├── .env.example                 # SETUP_TOKEN placeholder
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

> **Important:** All commands below must be run from inside the `tidal-coding-camp/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set tidal-coding-camp
   cd tidal-coding-camp
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

4. **Copy env placeholders:**
   ```bash
   cp .env.example .env.local
   ```
   Set `SETUP_TOKEN` to a random string. Used only to guard the one-time seat bootstrap endpoint.

5. **Create the Wix CMS collections** in **Dashboard → CMS**. Field ids must match exactly.

   - **`CamperProjects`** — gallery on `/projects` (falls back to `src/data/projects.ts` if empty)
   - **`Applications`** — apply-form target. Set **Anyone can add** (or rely on the server insert). Fields include `camperFirstName`, `camperAge`, `parentName`, `parentEmail`, `preferredSession`, `codingExperience`, `parentConsentAcknowledged`, `questionForUs`, `status`
   - **`SessionSeats`** — live seat counts. Create via the guarded endpoint once, after linking:
     ```bash
     # from a logged-in `wix dev` session
     curl "http://localhost:3000/api/setup-seats?token=YOUR_SETUP_TOKEN_HERE"
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

2. **Install additional Wix packages** as needed (`@wix/data`, `@wix/essentials`).

3. **Configure Astro** with `@wix/astro` and `@wix/astro-pages`, `output: "server"`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix CMS (Data)** for the project gallery, applications, and session seat counts.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
