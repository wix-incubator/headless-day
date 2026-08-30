# Wixsus Quest

> **Live Site:** [https://vixik-ques-73059abc-tetianast.wix-site-host.com](https://vixik-ques-73059abc-tetianast.wix-site-host.com)

A multilingual RPG-style browser game where players answer design and trivia questions to "build" their dream website level by level. At the end, the game generates a shareable URL with a live preview of the site the player designed — palette, fonts, business type, imagery style, and Wix Business Solutions all chosen through gameplay.

## Technologies

- **Framework:** Astro 5 + React 18
- **Wix Integration:** Wix Managed Headless — Wix Data CMS (game content + player saves)
- **Styling:** Vanilla CSS with CSS custom properties
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
wixsus-quest/
├── src/
│   ├── game/
│   │   ├── WixikQuest.tsx     # Main game component (all phases & dialogue)
│   │   ├── SitePreview.tsx    # Live site preview rendered from player choices
│   │   ├── quest.ts           # Level definitions, questions, fallback data
│   │   ├── design.ts          # Design token types and site-part definitions
│   │   ├── i18n.ts            # UI strings for Ukrainian, English, Hebrew
│   │   ├── sfx.ts             # Sound effects (sword hit, laugh, music)
│   │   └── game.css           # All game styles
│   ├── pages/
│   │   ├── index.astro        # Home page — fetches CMS data, renders game
│   │   ├── world/[id].astro   # Shareable world page for a completed game
│   │   └── api/save-world.ts  # API route — saves player result to Wix Data
│   └── layouts/
│       └── Layout.astro       # HTML shell
├── astro.config.mjs
├── wix.config.json    # Rename to wix.config.json after running init
└── package.json
```

## CMS Collections

The game loads content from three Wix Data collections. If the CMS fetch fails, it falls back to the hardcoded data in `quest.ts` — so the game works out-of-the-box, but for a fully editable experience you need to create these collections on your site:

| Collection | Fields | Purpose |
|---|---|---|
| `quest-levels` | `levelNumber`, `slug`, `title`, `intro`, `sitePart`, `bossName`, `bossIntro`, `bossImage`, `translations` | One entry per game level |
| `quest-questions` | `levelSlug`, `order`, `kind`, `question`, `options` (JSON), `effectKey`, `explain`, `translations` | Quiz, logic, and boss questions |
| `player-worlds` | `playerName`, `businessType`, `designTokens`, `answers`, `score`, `progress`, `completed` | Saves player results for sharing |

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

> **Important:** All commands below must be run from inside the `wixsus-quest/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set wixsus-quest
   cd wixsus-quest
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific, gitignored — not committed to this repo).

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

   The game will run with fallback data. To use live CMS content, create the `quest-levels`, `quest-questions`, and `player-worlds` collections on your site and populate them.

5. **Build and deploy:**
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
   Follow the prompts. Choose the blank Astro template.

2. **Add React support:**
   ```bash
   npx astro add react
   npm install @astrojs/react @types/react @types/react-dom react react-dom
   ```

3. **Build the game UI** in `src/game/` using React components served from Astro pages with `client:only="react"`.

4. **Set up Wix Data CMS collections** (`quest-levels`, `quest-questions`, `player-worlds`) from the Wix dashboard.

5. **Query CMS data** server-side in `src/pages/index.astro` using `@wix/data`:
   ```ts
   import { items } from '@wix/data';
   const result = await items.query('quest-levels').ascending('levelNumber').find();
   ```

6. **Create an API route** at `src/pages/api/save-world.ts` to write player results to the `player-worlds` collection.

7. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
