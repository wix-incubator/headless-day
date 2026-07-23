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
└── wix.config.example.json    # Copy to wix.config.json and fill in your values
```

## How to Create This Yourself

### Prerequisites

- Node.js 18+
- A [Wix account](https://manage.wix.com)
- [Wix CLI](https://dev.wix.com/docs/build-apps/developer-tools/cli/get-started/install-the-wix-cli) installed globally:
  ```bash
  npm install -g @wix/cli
  ```

---

### Option A: Download & Run This Project

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

3. **Connect to your own Wix site:**
   ```bash
   wix init
   ```
   This generates a local `wix.config.json` with your site's `appId` and `siteId`. When prompted, select an existing Wix site or create a new one. Make sure the following are installed on it from the [App Market](https://www.wix.com/app-market):
   - **Wix Stores**
   - **Wix Portfolio**
   - **Wix Forms**

4. **Set up the Reviews CMS collection** (one-time, run after `wix dev` starts):
   ```bash
   curl -X POST http://localhost:3000/api/admin/setup-reviews
   ```
   You can delete `src/pages/api/admin/setup-reviews.ts` after running this.

5. **Run locally:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

6. **Deploy:**
   ```bash
   npm run build
   npm run release
   ```

---

### Option B: Build It From Scratch

1. **Scaffold a new Wix Managed Headless Astro project:**
   ```bash
   npm create @wix/app@latest
   ```
   Choose **Headless** and **Astro** as the framework.

2. **Install the required Wix SDK packages:**
   ```bash
   npm install @wix/stores @wix/ecom @wix/redirects @wix/portfolio @wix/forms @wix/data @wix/media @wix/essentials @wix/sdk
   ```

3. **Set up Wix Business Solutions** on your site in [manage.wix.com](https://manage.wix.com):
   - Add **Wix Stores** and create your products with variants (size, style options)
   - Add **Wix Portfolio** and create collections with gallery images
   - Add **Wix Forms** and create a contact form

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

For full SDK reference, see the [Wix Headless docs](https://dev.wix.com/docs/go-headless).

---

## Disclaimer

This is a Wix Headless project created for demonstration purposes only. Cloning or copying this repo is encouraged, but is done on the responsibility of the user.
