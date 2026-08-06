# Fix the "site won't serve" (404 ConnectYourDomain) — migrate to a proper Wix headless (Astro) project

## Root cause (confirmed)
A Wix **headless Site created with the Wix CLI is an Astro project**, and its **routes are file-based: each file in `src/pages/` is a route.** This site is a **bare static `index.html`** (created via the headless *skill* prompt, not the CLI), so it has **no `src/pages` → no routes → nothing for `router-server` to serve → 404 `ConnectYourDomain`** on every URL. That matches Genry's "3 routes were created at project init, now there are none."

Docs:
- Create headless: `npm create @wix/new@latest headless` — scaffolds an **Astro** project, provisions the business/site, installs deps, inits git.
- Project structure: Astro + Wix files; **routes = `src/pages/` (Astro file-based routing)**; `wix.config.json` holds `appId` + `projectId`.

## Decision to confirm with @baseld first
Ask: *"Can you re-register the routes on the existing project `e7c52e5b-…`, or must I recreate it as a proper Astro headless project (`npm create @wix/new@latest headless`)? Recreating changes the siteId."*
- If they can re-provision routes → no migration needed.
- If not → do the migration below (new project, new siteId).

## Migration steps (once confirmed)

### 1. Create the proper project (INTERACTIVE — you must run this in your terminal)
```bash
npm create @wix/new@latest headless
# choose the headless site template; name it "Inkflow Academy"
cd <the-new-folder>
```
This gives you an Astro project with `src/pages/`, `public/`, `package.json`, `astro.config.*`, and a `wix.config.json` bound to a NEW site.

### 2. Bring the page in
- Copy the **body content + one `<style>` + one `<script>`** from the current `index.html` into `src/pages/index.astro`:
  - Put the CSS in `<style is:global> … </style>` (so Astro doesn't scope it away).
  - Put the JS in `<script is:inline> … </script>` (so Astro serves it as-is instead of bundling it as a module).
  - The `<head>` tags (fonts, meta, favicon, JSON-LD) go in the Astro page head or a layout.
- Copy **`images/`, `audio/`, `video/` into the new project's `public/`** (they're already release-safe WebP/mp3/mp4).
  - Asset URLs become root-absolute: `images/x.webp` → `/images/x.webp` (public assets serve from `/`). Update refs in the page. (Keep `ink-orchid.jpg`/`.png` naming rules — extension must match bytes.)

### 3. Test locally, then publish
```bash
wix dev        # local preview with hot reload
wix release    # publishes; now there ARE routes (src/pages), so it should serve
```

## Guardrails (learned the hard way this session)
- **Every asset's file extension must match its actual bytes** (`file --mime-type`). A `.jpg` that is really PNG breaks the S3 upload with `403 SignatureDoesNotMatch`. All current images are correctly-labeled WebP.
- After release, verify serving: `curl -sI https://<your-site-host-url>` should be **200**, not `404 ConnectYourDomain`.
- The whole visible site is self-contained in `index.html` (one style block, one script block) + `images/`,`audio/`,`video/` — nothing else to port.
