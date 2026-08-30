# joke·exchange

> **Live Site:** [joke-excha-c4620941-vytenisu.wix-site-host.com](https://joke-excha-c4620941-vytenisu.wix-site-host.com/)

A give-to-get joke trading floor as a 3D stage. Visitors submit a joke, roll the dice, and receive someone else's — never their own. Reactions, flags, and a Members leaderboard all persist in Wix CMS.

## Technologies

- **Framework:** Astro 5 + React 18 (server output)
- **Wix Integration:** Wix Managed Headless — **Wix CMS (Data)** for `Jokes`, `Reactions`, `Flags`, and `Seen`; **Wix Members** for leaderboard handles (`/api/auth/login`)
- **Styling:** Custom HUD CSS + WebGL (three.js / react-three-fiber / drei)
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix release`)

## Project Structure

```
joke-exchange/
├── public/favicon.svg
├── src/
│   ├── pages/
│   │   ├── index.astro          # 3D app island + no-JS sample from CMS
│   │   └── api/
│   │       ├── submit.ts        # Validate, classify, insert Jokes, pick a reward
│   │       ├── react.ts         # One 😂 per visitor per joke
│   │       ├── flag.ts          # Auto-hide at threshold
│   │       ├── leaderboard.ts   # Top jokes + comedians
│   │       └── me.ts            # Current Wix member (or anonymous)
│   ├── components/client/       # 3D scene + HUD
│   ├── lib/
│   │   ├── jokes.ts             # Pool pick, hash, pre-filters
│   │   ├── classify.ts          # Keyword category + content flags
│   │   ├── aiModerate.ts        # Optional Prompt Hub gate (off by default)
│   │   └── member.ts            # members.getCurrentMember()
│   └── layouts/Layout.astro
├── .env.example                 # Optional AI_MODERATION / PROMPT_HUB_PROMPT_ID
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

> **Important:** All commands below must be run from inside the `joke-exchange/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set joke-exchange
   cd joke-exchange
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

4. **Install Wix Members** on the new site from the App Market in [manage.wix.com](https://manage.wix.com).

5. **Create the Wix CMS collections** in **Dashboard → CMS**. Field ids must match exactly. Set collection permissions so the Astro server routes can insert/update (typically **Anyone can add** for a demo).

   - **`Jokes`** — `text`, `category`, `dark` (boolean), `contentFlags` (array), `textHash`, `authorVisitorId`, `authorMemberId`, `authorHandle`, `score`, `reactionCount`, `flagCount`, `status` (`approved` / `hidden`), `moderationTag`, `moderatedBy`
   - **`Reactions`** — `jokeId`, `visitorId`, `reactionType`
   - **`Flags`** — `jokeId`, `visitorId`, `reason`
   - **`Seen`** — `visitorId`, `jokeId`

6. **Optional AI gate:** copy `.env.example` to `.env.local`. Leave `AI_MODERATION=off` to use keyword heuristics. To enable Prompt Hub classification, set `AI_MODERATION=on` and `PROMPT_HUB_PROMPT_ID` to your prompt id.

7. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000); this project may print `http://localhost:4321`).

8. **Build and deploy:**
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

2. **Install additional packages** (`@wix/data`, `@wix/members`, `@wix/essentials`, three.js / react-three-fiber).

3. **Configure Astro** with `@wix/astro` and `@wix/astro-pages`, `output: "server"`. See [Wix CLI project structure](https://dev.wix.com/docs/wix-cli/guides/project-structure/project-structure).

4. **Wire Wix CMS (Data)** for jokes/reactions/flags/seen and **Wix Members** for login + leaderboard identity.

5. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
