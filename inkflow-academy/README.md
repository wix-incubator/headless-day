# Inkflow Academy

> **Live site:** [incflow-ac-d99bac1d-liorbar0.wix-site-host.com](https://incflow-ac-d99bac1d-liorbar0.wix-site-host.com/)

A single-page marketing site for **Inkflow Academy** — a Chinese calligraphy and brush-arts studio in Chengdu. The page includes a brush-painting hero, ink-garden storytelling, an interactive **practice pad**, a bilingual **Inkling** assistant, a Wix-powered **store** with cart checkout, **Wix Bookings** course reservation, gallery, CMS-driven testimonials, FAQ, contact CRM capture, and ambient audio.

## Technologies

- **Framework:** Astro 5 + Wix Managed Headless (`@wix/astro`, `@wix/astro-pages`)
- **Wix integrations:** Stores catalog + hosted checkout, Bookings (availability + confirm), CRM (contact + leads), Members (login/logout), CMS (testimonials)
- **Styling:** CSS custom properties, Google Fonts (Ma Shan Zheng, Cormorant Garamond, Hanken Grotesk, Noto Serif SC)
- **Deployment:** `wix dev` / `wix release`

## Project structure

```
inkflow-academy/
├── src/
│   ├── pages/
│   │   ├── index.astro          # full marketing page
│   │   └── api/
│   │       ├── checkout.ts      # Wix eCommerce hosted checkout
│   │       ├── store-products.ts
│   │       ├── services.ts
│   │       ├── availability.ts
│   │       ├── booking.ts
│   │       ├── contact.ts
│   │       ├── me.ts
│   │       └── testimonials.ts
│   └── lib/
├── public/
│   ├── images/
│   ├── audio/
│   └── video/
├── astro.config.mjs
├── package.json
├── wix.config.json
└── README.md
```

## Setup

```bash
cd inkflow-academy
npm install
Edit `wix.config.json`   # fill in appId + siteId from Wix dashboard
npm run dev
```

Open the local URL printed by the CLI (typically `http://localhost:4321`).

## Features

| Feature | How it works |
|---|---|
| **Try the Brush** | Canvas practice pad — trace 永/道/心/山/水/書 with pressure-like strokes |
| **Inkling (墨童)** | Bilingual concierge — ~70-topic knowledge base, no external API |
| **Store cart** | Nav basket → add products → **Checkout** → Wix hosted payment (`POST /api/checkout`) |
| **Courses** | Select a course → **Reserve a Spot** → Wix Bookings modal with live slots |
| **Contact** | Nav Contact / footer email → CRM modal (`POST /api/contact`) |
| **Members** | Nav **Log in** / **Log out** via `@wix/astro-pages` OAuth routes |
| **Gallery** | Fan layout, filters, lightbox |
| **Students** | Drag divider + CMS testimonials (`GET /api/testimonials`) |
| **EN / 中文** | Language toggle across copy and Inkling |

## API routes (match live deployment)

| Route | Purpose |
|---|---|
| `GET /api/store-products` | Wix Stores catalog (syncs store cards + cart product IDs) |
| `POST /api/checkout` | Create checkout → redirect URL |
| `GET /api/services` | Bookings services list |
| `GET /api/availability?serviceId=` | Open slots for a service |
| `POST /api/booking` | Confirm a selected slot |
| `POST /api/contact` | CRM contact + note (general + course lead forms) |
| `GET /api/me` | Current member session |
| `GET /api/testimonials` | CMS testimonials |
| `/api/auth/login`, `/api/auth/logout` | Members OAuth (auto-registered by `@wix/astro-pages`) |

## Source note

The public GitHub repo [`liorbar777/inkflow_academy`](https://github.com/liorbar777/inkflow_academy) is a static `index.html` snapshot with mailto checkout. This monorepo copy is rebuilt as **Managed Headless Astro** to match the live Wix-hosted site.

---

> **Disclaimer:** This is a Wix Headless project created for demonstration purposes only.
> Cloning or copying this repository is encouraged, but is done entirely at the responsibility
> of the user. Wix provides no warranties or guarantees regarding fitness for any particular purpose.
> Always review and test the code before deploying to a production environment.
