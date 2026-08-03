# Inkflow Academy

> **Live site:** [incflow-ac-d99bac1d-liorbar0.wix-site-host.com](https://incflow-ac-d99bac1d-liorbar0.wix-site-host.com/)

A single-page marketing site for **Inkflow Academy** — a Chinese calligraphy and brush-arts studio in Chengdu. One self-contained `index.html` delivers a brush-painting hero, ink-garden storytelling, an interactive **practice pad**, a bilingual **Inkling** assistant, a brush **store** with cart, **course** selection, gallery, testimonials, FAQ, and ambient audio.

## Technologies

- **Framework:** Vanilla HTML + CSS + JavaScript (no build step)
- **Wix integration:** Deployed on **Wix Managed Headless**; the **live** site adds Wix Stores checkout, Wix Bookings, Wix CRM (contact), and Wix Members (see note below)
- **Styling:** CSS custom properties, Google Fonts (Ma Shan Zheng, Cormorant Garamond, Hanken Grotesk, Noto Serif SC)
- **Language:** JavaScript (inline)
- **Deployment:** Static files, or Wix CLI after migrating to Astro (see `MIGRATION.md`)

## Project structure

```
inkflow-academy/
├── index.html          # entire site — markup, styles, scripts
├── images/             # WebP photography
├── audio/              # ambient theme (theme.mp3)
├── video/              # hero motion background (motion.mp4)
├── MIGRATION.md        # notes on Astro + file-based routing for Wix CLI
└── README.md
```

## Run locally

No install step. For fonts and audio, serve over HTTP rather than `file://`:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Features in this folder

| Feature | How it works |
|---|---|
| **Try the Brush** | Canvas practice pad — trace 永/道/心/山/水/書 with pressure-like strokes |
| **Inkling (墨童)** | Bilingual concierge — ~70-topic knowledge base, no external API |
| **Store cart** | Add brush sets, open cart from nav basket icon, **Checkout** at bottom of cart panel |
| **Courses** | Select a course card → **Reserve a Spot** |
| **Gallery** | Fan layout, filters, lightbox |
| **Students** | Drag divider to reveal student work behind testimonials |
| **EN / 中文** | Language toggle across copy and Inkling |

### Cart checkout (this repo)

Store checkout in this static source uses a **mailto** order summary to the studio. The **live** deployment uses **Wix Stores + eCommerce** (`POST /api/checkout` → hosted payment page). To match production, migrate to an Astro headless project with API routes — see `MIGRATION.md`.

### Course booking (this repo)

Course reservation uses a prefilled **mailto** when a course is selected. The **live** site opens a **Wix Bookings** modal with live availability and CRM lead capture when no slots exist.

## Connect to Wix Managed Headless

This folder is a static page. To deploy like the live site (with Stores, Bookings, Members):

1. Scaffold with `npm create @wix/new@latest -- headless`
2. Move page content into `src/pages/index.astro` (`<style is:global>`, `<script is:inline>`)
3. Copy `images/`, `audio/`, `video/` into `public/`
4. Add server API routes for store catalog, checkout, bookings, contact, and members
5. `npm run dev` → `npm run release`

See `MIGRATION.md` for routing context and guardrails.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.
