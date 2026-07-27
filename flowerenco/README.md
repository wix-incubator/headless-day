# Flowerenco

> **Live Site:** [www.flowerenco.com](https://www.flowerenco.com/)

A handmade ceramic studio storefront for whimsical character and portrait bud vases, made to order from a photo of a person or pet. Customers pick a vase size and style, upload a reference photo, add notes, and check out — all within a custom Wix Headless Astro site.

## Technologies

- **Framework:** [Astro](https://astro.build) 5 (server output) + React for interactive islands
- **Wix Integration:** Wix Managed Headless — hosted and deployed via the Wix CLI
- **Wix Business Solutions:**
  - [Wix Stores](https://support.wix.com/en/article/wix-stores-about-wix-stores) + [Wix eCommerce](https://dev.wix.com/docs/rest/business-solutions/e-commerce/introduction) — products, cart, and checkout
  - [Wix Portfolio](https://support.wix.com/en/article/wix-portfolio-about-wix-portfolio) — gallery of past commissions
  - [Wix Forms](https://support.wix.com/en/article/wix-forms-about-wix-forms) — contact/inquiry form
  - [Wix Data](https://dev.wix.com/docs/sdk/api-reference/data/introduction) — Reviews CMS collection
  - [Wix Media](https://dev.wix.com/docs/sdk/api-reference/media/introduction) — buyer reference photo uploads
- **Styling:** Vanilla CSS
- **Language:** TypeScript
- **Deployment:** Wix CLI (`wix build` / `wix release`)

## Project Structure

```
flowerenco/
├── public/                    # Static assets (favicon)
├── src/
│   ├── components/
│   │   ├── CartView.tsx        # Cart with per-item photo, quantity, and remove
│   │   ├── ContactForm.tsx     # Wix Forms inquiry form
│   │   ├── ProductGallery.tsx  # Style example carousel on product pages
│   │   ├── ReviewForm.tsx      # Submit a review with photo upload
│   │   ├── ReviewList.tsx      # Approved reviews display
│   │   ├── VaseOrder.tsx       # Custom order widget (size → style → photo → notes)
│   │   └── Welcome.astro       # Homepage hero
│   ├── layouts/
│   │   └── Layout.astro        # Shared layout (nav, cart badge)
│   ├── lib/
│   │   ├── styleImages.ts      # Gallery style-image helpers
│   │   └── wix.ts              # Shared media/image URL helpers
│   └── pages/
│       ├── index.astro          # Homepage
│       ├── shop.astro           # Product listing
│       ├── product/[slug].astro # Product detail + custom order widget
│       ├── cart.astro           # Cart page
│       ├── gallery.astro        # Portfolio gallery index
│       ├── gallery/[slug].astro # Portfolio collection detail
│       ├── reviews.astro        # Reviews page
│       ├── about.astro          # About page
│       ├── contact.astro        # Contact / Say Hi page
│       ├── faq.astro            # FAQ page
│       ├── thank-you.astro      # Post-checkout (shows real order number)
│       └── api/
│           ├── cart/            # add / get / remove / update / checkout
│           ├── review/          # list / submit
│           ├── contact.ts       # Wix Forms submission
│           ├── upload.ts        # Reference photo upload to Wix Media Manager
│           ├── order-summary.ts # Fetch order details for thank-you page
│           └── admin/
│               └── setup-reviews.ts  # One-time: creates the Reviews CMS collection
├── astro.config.mjs
├── package.json
├── .env.example                 # Optional: Wix Form ID for CRM contact sync
└── wix.config.example.json      # Reference only — generated locally by init
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

> **Important:** All commands below must be run from inside the `flowerenco/` folder, **not** the monorepo root. The monorepo is a collection of projects — the Wix CLI only works inside an individual project directory.

1. **Sparse-clone just this folder** from the monorepo:
   ```bash
   git clone --filter=blob:none --sparse https://github.com/wix-incubator/headless-day.git
   cd headless-day
   git sparse-checkout set flowerenco
   cd flowerenco
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
   This provisions a **new** Wix site for your account and writes a local `wix.config.json` (site-specific, gitignored — not committed to this repo). The business name is derived from the folder name.

   > **Do not run `wix init`** — that command does not exist. Project linking is done via `npm create @wix/new@latest init` (from the `@wix/create-new` package, not `@wix/cli`).

   If provisioning fails with an `INTERNAL` error, retry shortly or escalate with the Request ID from the error output.

4. **Set up your Wix dashboard content** — see [Dashboard setup](#dashboard-setup) below. Install **Wix Stores**, **Wix Portfolio**, and **Wix Forms** from the [App Market](https://www.wix.com/app-market).

5. **Configure environment variables** (optional, for CRM contact sync):
   ```bash
   cp .env.example .env.local
   ```
   Paste your Wix Form ID into `.env.local`. Without this, contact messages still save to the `StudioMessages` CMS collection if you create it.

6. **Set up the Reviews CMS collection** (one-time, run after `npm run dev` starts):
   ```bash
   curl -X POST http://localhost:3000/api/admin/setup-reviews
   ```
   You can delete `src/pages/api/admin/setup-reviews.ts` after running this.

7. **Run locally:**
   ```bash
   npm run dev
   ```
   Open the local URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)).

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

2. **Install the required Wix SDK packages:**
   ```bash
   npm install @wix/stores @wix/ecom @wix/redirects @wix/portfolio @wix/forms @wix/data @wix/media @wix/essentials @wix/sdk
   ```

3. **Set up Wix Business Solutions** on your site in [manage.wix.com](https://manage.wix.com) — see [Dashboard setup](#dashboard-setup) below.

4. **Build the custom order flow** in a React island:
   - Render size and style options from the product's variants
   - Upload the buyer's reference photo to Wix Media Manager:
     ```ts
     import { files } from "@wix/media";
     import { auth } from "@wix/essentials";

     const generate = auth.elevate(files.generateFileUploadUrl);
     const { uploadUrl } = await generate(mimeType, { fileName });
     await fetch(`${uploadUrl}?filename=${encodeURIComponent(fileName)}`, { method: "PUT", body: fileBytes });
     ```
   - Attach size, style, notes, and photo URL to the cart as a buyer note

5. **Wire up cart and checkout:**
   ```ts
   import { currentCart } from "@wix/ecom";
   import { redirects } from "@wix/redirects";

   await currentCart.addToCurrentCart({ lineItems: [...] });

   const checkout = await currentCart.createCheckoutFromCurrentCart({
     channelType: currentCart.ChannelType.WEB,
   });
   const session = await redirects.createRedirectSession({
     ecomCheckout: { checkoutId: checkout.checkoutId },
     callbacks: { thankYouPageUrl: `${origin}/thank-you`, postFlowUrl: `${origin}/cart` },
   });
   window.location.href = session.redirectSession.fullUrl;
   ```

6. **Create the Reviews CMS collection** using `auth.elevate(collections.createDataCollection)` with `insert: "ANYONE"` and `read/update/remove: "ADMIN"` permissions.

7. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

For full docs, see [Quick Start with the Wix CLI](https://dev.wix.com/docs/go-headless/get-started/quick-starts/wix-managed-headless/quick-start-with-the-wix-cli).

---

### Dashboard setup

After linking your site, configure the following in [manage.wix.com](https://manage.wix.com):

| What | Where | Details |
|------|-------|---------|
| **Wix Stores** | App Market | Create three products with these URL slugs (used by `styleImages.ts` for style previews): `custom-portrait-vase`, `custom-pet-vase`, `custom-duo-vase`. Each product needs size and style variants. |
| **Wix Portfolio** | App Market | Create collections with gallery images for the `/gallery` pages. |
| **Wix Forms** | App Market | Create a contact form with fields: `first_name`, `email`, `phone` (optional), `message`. Copy the form ID into `.env.local` as `WIX_FORM_ID`. |
| **StudioMessages** | CMS (Content Manager) | Optional collection for storing contact inquiries. Fields: `name` (Text), `email` (Text), `phone` (Text), `message` (Text), `submittedAt` (Text). Created automatically if missing when a message is sent. |
| **Reviews** | CMS | Run the one-time setup endpoint (step 6 in Option A) or create manually with fields: `name`, `email`, `rating`, `review`, `photoUrl`, `productName`, `approved` (Boolean). |
| **Wix Payments** | Settings → Accept Payments | Required for live card checkout. See `PAYMENTS.md` for policy notes. |

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
