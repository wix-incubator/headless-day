# Salt Meridian

> Coastal Basque cooking, fired over driftwood

**HEADLESS DAY brief spec-0101** · Category: **Restaurant & Food** · Difficulty: **easy**

A 30-seat asador perched above the harbor in San Sebastián, grilling whole turbot and txuleta over open flame. The chalkboard menu changes with the morning catch, and the cider is poured from a meter up.

---

## Requirements

Your build is judged against these. All of them.

- [ ] Menu page with at least 8 dishes, prices, and short descriptions
- [ ] Photo gallery of the grill and dining room — minimum 6 images
- [ ] Contact page with map, hours, and phone number
- [ ] Mobile-first responsive design

## Art direction

| | |
|---|---|
| Mood | smoky · coastal · rustic · warm |
| Primary color | `#1F2A30` |
| Accent color | `#E0A458` |

Treat the palette as a starting point — interpret the mood, don't paint by numbers.

## Bonus challenge

Add a 'Today's Catch' banner that the owner can update from the CMS

---

# Creative brief

A richer brief to build from — structure, content, design, SEO, and performance. Hit the requirements above; let this guide how.

## Audience & voice

**Audience.** Travelers and locals in San Sebastián, 30-60, who plan dinner around the day's catch and the open fire — people who would rather watch a turbot turn over coals than read a tasting-menu manifesto, and who book ahead because thirty seats go fast.

**Voice.** smoky · plainspoken · coast-worn · unhurried · fire-certain

**Avoid.** chef-speak, tasting-note adjectives stacked three deep, luxury hospitality clichés, exclamation hype

## Hero

**Headline.** “Whatever the boats brought in, it goes over driftwood tonight.”

**Layout.** Full-bleed atmospheric food-and-fire image with a low-left headline anchor

**Focal / LCP element.** One macro shot of a whole turbot laid skin-down over glowing driftwood coals, smoke curling off the bars

**Treatment.** Display serif set large in warm bronze, the word 'driftwood' broken to its own line and weighted heaviest, kerned tight against the dark image

**On load.** Hero image fades up from charcoal first, then the headline rises and settles line by line over ~600ms, then the single CTA fades in last; with prefers-reduced-motion the image and full headline render in final position instantly with no movement

**Atmosphere.** Near-black smoke-graded photograph with embers glowing amber low in the frame, a soft warm vignette pulling the eye to the fish

**Primary CTA.** Request a table

**Mobile.** Image crops to a tall portrait of the fish on the coals, headline stacks to three lines above a full-width CTA, and a sticky Request a table bar pins to the bottom

**The one thing they'll remember.** The image of a whole fish blistering over sea-bleached driftwood, smoke rising — you can almost smell it before you read a word.

## Sitemap (6 pages)

| Page | Route | Purpose | CTA |
|---|---|---|---|
| Home | `/` | Sell the fire-and-catch promise in one breath and push to book a table | Request a table |
| The Board | `/menu` | The chalkboard menu as a CMS collection — whole fish and txuleta priced by the day, with the morning's catch flagged on top | Request a table |
| The Fire | `/about` | How a driftwood asador above the harbor works, and why the menu changes every morning | See the board |
| Book a Table | `/reservations` | Reservation request into a Wix CMS inquiry collection — date, party size, seating preference | Request a table |
| The Grill & Room | `/gallery` | Smoke-lit close-ups of the grill bars, charred turbot, and the thirty-seat room above the water | Request a table |
| Find Us | `/contact` | Hours, the harbor location, map facade, tap-to-call | Request a table |

## Homepage flow

1. **Hero** — Whatever the boats brought in, it goes over driftwood tonight.
2. **Today's Catch banner** — This morning's board: whole turbot, line-caught hake, and a txuleta worth the wait.
3. **How the fire works** — We cook over wood the sea sent back, and pour the cider from a meter up.
4. **From the board** — Three plates off the board. The fourth depends on the tide.
5. **What regulars say** — People who came back, and what they came back for.
6. **The room above the harbor** — Thirty seats, one fire, and the harbor going dark through the glass.
7. **Book CTA band** — The catch changes daily. Get a seat before it's gone.

## Content to create

Seed these into the CMS — counts and sample rows are the minimum bar.

- **8× BoardDish** (on The Board) — fields: name, section, price, catchTag, tastingDescription, image
  - e.g. Whole Grilled Turbot | From the Sea | €58 / kg | Today's Catch | A flat fish laid skin-down over driftwood coals, basted with a vinegar-and-garlic refrito, the skin blistered, the flesh peeling off the bone in slabs. Priced by weight, split easily between two.
  - e.g. Txuleta, Aged Rib | From the Fire | €68 / kg | Signature | A thick bone-in rib chop from an old dairy cow, salted heavy, seared hard on the bars until the fat runs and the crust cracks, rested and sliced to the bone. Served rare in the middle, charred at the edge, the way the fire wants it.
- **1× StoryBlock** (on The Fire) — fields: heading, body
  - e.g. Salt Meridian sits thirty seats deep above the harbor, and the menu is written every morning in chalk because we don't know what we're cooking until the boats come in. We grill over driftwood — wood the sea worked smooth and salt-cured, which burns hotter and throws a smoke you can't fake with charcoal. The whole turbot goes skin-down over the coals; the txuleta sears hard on the bars and rests to the bone. The cider gets poured from a meter up, splashed against the inside of the glass to wake it, the way it's done across this coast. Nothing here is plated to be photographed. It's cooked to be eaten while it's hot, with your hands if that's faster, before the harbor goes fully dark through the glass.
- **3× Review** (on Home) — fields: name, quote, detail
  - e.g. Maite Errazti | 'The turbot came off the fire with skin like glass. I've stopped ordering fish anywhere else.' | Books the corner table every time she's back in town.
  - e.g. Iñaki Bordagaray | 'The txuleta is charred the way my grandfather argued it should be. They got it right.' | Drove from Bilbao for a Sunday lunch and stayed for the cider.

## Design system

**Aesthetic direction.** Rustic-coastal with an industrial-fire edge — heavy charred textures, smoke-stained warmth, and chalkboard rawness, because the room is a working grill above a working harbor, not a polished dining concept.

**Spatial composition.** Negative-space-forward and asymmetric: the day's catch and a single fire image dominate one side of each section while text hugs a generous margin, so the layout breathes like the unhurried room and never feels like a busy menu page.

**Typography.** Display: `Fraunces` · Body: `Source Serif 4` · Fraunces 9pt-optical Black 900 for headlines and dish names against Source Serif 4 Regular 400 / Medium 500 for body and descriptions
_Source:_ Both via Google Fonts, self-hosted as preloaded woff2 subsets
_Why:_ Fraunces carries an old-coast, hand-set warmth with high optical contrast that suits a chalkboard-and-fire room without tipping into luxury polish; Source Serif 4 keeps long dish descriptions readable and warm at small sizes, holding the rustic register where a sans would feel too clean.

**Color system** — paste into your Tailwind v4 `@theme`:

```css
@theme {
  --color-background: #F3EBDD;
  --color-surface: #FBF5EA;
  --color-text: #1F2A30;
  --color-text-muted: #54616A;
  --color-border: #D8C7AE;
  --color-primary: #1F2A30;
  --color-accent: #A86B1F;
  --color-dark: #171F24;
  --color-on-dark: #F3EBDD;
}
```

**Signature device.** An ember-glow underline that warms from slate to amber on scroll beneath each section heading, like a coal catching — and the Today's Catch banner carries the same glowing edge to mark it as the live, daily element.

**Motion.** CSS-first and restrained: scroll-driven ember-glow sweeps, gentle image fade-ups, no parallax or autoplay video; prefers-reduced-motion snaps every glow and fade to its final state.

**Imagery.** Warm smoke-graded photography pushed toward amber and deep slate: glowing coals, blistered fish skin, charred txuleta crust, the cider arcing from a meter up, the dark harbor through glass as a recurring cool counterpoint to the fire.

**Avoid in imagery.** cool blue or teal grading · soft-focus glamour plating · staged cutlery-and-napkin flatlays · stock-photo smiling diners · neon or purple accents

## Conversion & forms

**Primary action.** Request a table — via @wix/data (CMS Reservations inquiry collection) → `/reservations`

**Repeat at.** hero · how the fire works band · mobile sticky bar · footer

**Secondary (ghost).** Call the harbor line

**Form fields.** name, phone, date, partySize, seatingPreference, note

**Success message.** “Request in. We'll call to confirm and tell you what's looking good on tomorrow's board. Come hungry.”

**Reassurance.** No deposit, no account. Just your number so we can confirm the table and the time.

## FAQ

Real questions to answer on the site (and feed FAQPage JSON-LD).

**Do you take reservations?**

Yes, and you'll want one — thirty seats fill fast. Send a request with your date and party size and we'll call to confirm. Walk-ins get seated only if the fire's quiet, which it rarely is.

**How do I know what's on the menu tonight?**

You don't, exactly, and neither do we until the boats come in. The board changes every morning with the catch. Whatever's freshest goes over the fire — check the Today's Catch banner for the latest.

**Why are the fish priced by the kilo?**

Because we grill them whole and weigh them whole. A turbot or a txuleta is priced by weight and easily split between two or three. We'll talk you through portions when you sit down.

**Is there anything for people who don't eat fish or meat?**

There's always a grilled vegetable plate and whatever the garden sent us that week, cooked over the same coals. Tell us in the booking note and we'll set it aside.

**Where do we park near the harbor?**

There's a public lot two minutes up the hill and metered street parking along the front. The walk down to the window is short and worth it for the view.

**What is the cider pour about?**

It's a coast tradition — the cider gets poured from a meter above the glass so it splashes against the side and opens up. We do it tableside. It's not a trick; it's how the cider's meant to be drunk here.

## SEO

**Primary keyword.** Basque asador San Sebastián

**Secondary.** grilled turbot San Sebastián · driftwood grill restaurant · txuleta steak Basque · harbor seafood San Sebastián

**Schema.org type.** `Restaurant`

**JSON-LD per page.** Restaurant (The Board) · Menu (The Board) · Restaurant (Find Us) · FAQPage (FAQ)

**Business facts.** San Sebastián · Wed-Sun 1pm-4pm and 8pm-11pm, closed Monday and Tuesday · $$$ · est. 2017

**Differentiators.** Driftwood-fired open grill; a chalkboard menu rewritten every morning with the catch; whole fish and aged txuleta priced by weight; tableside meter-high cider pour

**Socials.** @saltmeridian.asador · @thedriftwoodfire

## Performance & accessibility

**LCP element.** Hero macro photograph of a whole turbot skin-down over glowing driftwood coals

**Top moves.**
- Serve the hero as a responsive AVIF/WebP with explicit width/height and fetchpriority=high
- Self-host Fraunces and Source Serif 4 as preloaded woff2 subsets with font-display:swap
- Drive the ember-glow underline with CSS scroll-driven animations instead of a JS scroll listener

**Hydration plan.**
- `MobileBookStickyBar` → `client:load` (Above-fold per-visitor conversion control that must be tappable immediately)
- `NavBookButton` → `client:load` (Primary reservation CTA in the header, interactive on first paint)
- `TodaysCatchBanner` → `client:visible` (CMS-fed daily strip that only needs to read its value as it enters view)
- `ReservationForm` → `client:idle` (Below-fold form can defer hydration until the main thread is free)

**Defer as facades.** Map of the harbor neighborhood loaded as a static image facade that swaps to interactive on click · Optional grill loop video loaded as a poster-image facade on tap

**Targets.** LCP < 2.5s · INP < 200ms · CLS < 0.1 · Lighthouse mobile ≥ 90

**Accessibility baseline.** Text contrast 4.5:1 · UI 3:1 · 44px tap targets · visible focus · honor reduced-motion · alt text required · semantic landmarks

---

# How to build this with Wix Headless

This is the same flow HEADLESS DAY itself was built and deployed with.
Any frontend framework works; the steps below use Astro + React.

## 1. Create the project

```bash
npm create @wix/new@latest my-site
cd my-site
```

This scaffolds an Astro project preconfigured with the `@wix/astro`
integration and links it to a new Wix Headless project in your account
(it will open a browser to authenticate). Already have a project?
Run `npm create @wix/new@latest -- headless link` inside it instead.

## 2. Develop

```bash
npm run dev
```

- Pages live in `src/pages/` (Astro routes). Use React islands
  (`client:load`) for interactive pieces.
- Talk to Wix from code with the SDK:

```ts
import { createClient, OAuthStrategy } from '@wix/sdk';
import { items } from '@wix/data';

const wix = createClient({
  modules: { items },
  auth: OAuthStrategy({ clientId: import.meta.env.PUBLIC_WIX_CLIENT_ID }),
});
```

- Need content collections (menus, galleries, listings)? Create CMS
  collections in your project dashboard (CMS → Collections) and query
  them with `@wix/data`. Need bookings, stores, or events? Install the
  app on the project and use the matching `@wix/...` SDK module.
- Your OAuth client ID is in the dashboard under
  **Settings → Headless Settings → OAuth apps**; put it in `.env.local`
  as `PUBLIC_WIX_CLIENT_ID`.

## 3. Deploy on Wix

```bash
npx wix build
npx wix release
```

`release` prints your live `*.wix-site-host.com` URL. Redeploys are the
same two commands. That URL is what you submit.

## 4. Submit

Paste your live URL into **My Spec → Submit your build** on the
HEADLESS DAY site before 16:00. Good luck. 🎰
