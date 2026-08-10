# Scaffold notes (Task 1 — facts later tasks depend on)

- FRAMEWORK: Astro 5.18.2 SSR (`output: "server"`, `@wix/astro` template) + `@astrojs/react` (React 18.3.1) + TypeScript. The game mounts as a single `client:only="react"` island — there is no Vite config file; Astro owns Vite via `astro.config.mjs` (integrations: `wix()`, `wixPages()`, `react()`).
- DEV_CMD: `npm run dev` (→ `wix dev`, serves at http://localhost:4321/; requires Node 20: `eval "$(fnm env)" && fnm use 20`)
- BUILD_CMD: `npm run build` (→ `wix build` → astro build; output in `dist/`, adapter `wix-runtime-fetch-adapter`)
- DEPLOY_CMD: `npm run build && npm run release -- --version-type minor --comment "..."` (release fails with "Project build output is missing" unless build ran first; `--version-type`/`--comment` flags make it non-interactive)
- CLIENT_ID_SOURCE: `wix.config.json` → `"appId"` (public OAuth client id; set in `wix.config.json` after `npm create @wix/new@latest init` or edit placeholders directly). Optional server secret in `.env.local` → `WIX_CLIENT_SECRET` (gitignored). Site id: `wix.config.json` → `"siteId"`.
- ENTRY_COMPONENT: `src/pages/index.astro` (the only page in `src/pages/`; currently renders `<Layout><Welcome /></Layout>` — this is where `<App client:only="react" />` will mount)
- LIVE_URL: https://birdie-bre-2b166b6a-giladi47.wix-site-host.com
