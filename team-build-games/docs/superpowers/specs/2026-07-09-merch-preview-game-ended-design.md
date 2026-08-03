# Merch Preview on Game Finished Screen

**Date:** 2026-07-09  
**Status:** Approved

## Goal

Replace the single amber "Print this result on a tee" text link in the `ended` overlay with a row of 4 personalized merchandise preview cards — tee, mug, keychain, poster — each showing the local player's warrior sprite + avatar photo composited inline as an SVG.

## Scope

- Game finished screen (the `phase === "ended"` overlay inside `Arena.tsx`)
- 4 products: existing tee, mug, poster + new keychain
- Inline SVG previews only — the shop page (`[product].astro`) keeps its existing text-only `MerchPreview.astro` for SSR
- No new API calls; all data already in Arena component scope at game end

## Personalized Text

Computed from match result at game end:

| Outcome | Title (max 24 chars) | Sub (max 36 chars) |
|---------|---------------------|-------------------|
| Winner | `ARENA CHAMPION` | `I BEAT [name1] & [name2] · N HITS · Xm` |
| Loser | `ELIMINATED WITH HONOR` | `LOST TO [winner] · N HITS · Xm` |
| Draw | `MUTUAL DESTRUCTION` | `N HITS · Xm · [DATE]` |

All text is run through existing `sanitizePayload` (uppercase, charset filter, length clamp, profanity filter).

Winner's loser list: up to 2 names from `standingsOrder` excluding the winner, joined with ` & `.  
Key stat pulled from `board.stats[localId]`: `hits` and `Math.round(distance)`.

## Warrior Sprite Lookup

`BODY_ASSET` mapping (shape → warrior PNG) moves from `scene.ts` to `cosmetic.ts` (already the home of the `Shape` type):

```ts
export const BODY_ASSET: Record<Shape, string> = {
  circle:   "/assets/arena/warriors/swordsman.png",
  square:   "/assets/arena/warriors/spearman.png",
  triangle: "/assets/arena/warriors/knife-fighter.png",
  diamond:  "/assets/arena/warriors/archer.png",
};
```

`scene.ts` imports this constant instead of re-declaring it. `Arena.tsx` reads `shape` (already in state) and looks up the warrior path.

## New Component: `MerchPreviewInline.tsx`

React component — used only in the Arena overlay, not on the shop page.

```ts
type Props = {
  product: "tee" | "mug" | "keychain" | "poster";
  title: string;
  sub: string;
  garmentColor?: string;   // product-specific default
  printColor?: string;     // default "#22d3ee"
  warriorSrc: string;      // e.g. "/assets/arena/warriors/swordsman.png"
  avatarUrl?: string | null;
};
```

All SVGs use `viewBox="0 0 200 200"`.

### Per-product SVG layout

**Tee** — existing shirt path kept as-is:
- Warrior `<image>` at chest print area: x=72, y=92, width=56, height=63
- Avatar `<image>` clipped to circle r=10, positioned at warrior head (x=100, y=105)
- Title text at y=140, sub text at y=152 (below warrior)

**Mug** — existing mug rect kept as-is:
- Warrior `<image>` inside mug face: x=50, y=72, width=56, height=70
- Avatar circle r=9 at warrior head (x=78, y=85)
- Title text at y=148, sub at y=160

**Keychain** — new shape:
- Ring loop: `<circle cx=100 cy=44 r=10>` (stroke only)
- Tag body: `<rect x=65 y=54 width=70 height=110 rx=10>`
- Warrior `<image>`: x=68, y=58, width=64, height=85
- Avatar circle r=9 at warrior head (x=100, y=72)
- Sub stats text at y=148 (bottom of tag, small font)

**Poster** — restructured from existing:
- Full dark background rect (existing x=40, y=20 w=120 h=160)
- Border frame (existing)
- Arena grid: subtle 10px grid lines at low opacity inside the background
- Title text moved up to y=40 (above warrior)
- Warrior `<image>` centered: x=50, y=48, width=100, height=110
- Avatar circle r=12 at warrior head (x=100, y=62)
- Sub stats text at y=175 (bottom)

## New Keychain Product

Added to `MERCH_PRODUCTS` in `catalog.ts`:

```ts
{
  slug: "keychain",
  name: "Fighter Keychain",
  tagline: "Your character, pocket-sized and battle-hardened.",
  basePriceCents: 900,
  options: [
    { key: "material", label: "Material", choices: [
      { value: "acrylic", label: "Clear acrylic" },
      { value: "metal",   label: "Brushed metal", priceDeltaCents: 600 },
    ]},
    { key: "printColor", label: "Print color", choices: PRINT_COLORS },
  ],
}
```

`MerchPreview.astro` gets a `keychain` SVG branch — charm tag shape + text only (no warrior, since SSR has no session data). The shop page routes to it automatically via the existing dynamic `[product].astro`.

## Arena Ended Overlay Layout

The amber link block is replaced by a compact merch section below the stats table:

```
─── Immortalise your result ───

[👕 Score Tee ]  [☕ Victory Mug]  [🔑 Keychain ]  [🖼 Poster   ]
 ~90px preview    ~90px preview     ~90px preview    ~90px preview
  Shop →            Shop →            Shop →           Shop →

[Play again]  [Back to room]
[test-mode note — unchanged]
```

Each card: fixed width ~90px, SVG preview + small label + "Shop →" link. The full card is clickable. Cards wrap on narrow viewports.

Each card links to `buildShopUrl(slug, sanitizePayload({ title, sub }))` with the personalized payload.

## Files Changed

| File | Change |
|------|--------|
| `src/game/arena/cosmetic.ts` | Add + export `BODY_ASSET` |
| `src/game/arena/render/scene.ts` | Import `BODY_ASSET` from cosmetic, remove local decl |
| `src/components/merch/MerchPreviewInline.tsx` | **NEW** — React inline SVG for all 4 products |
| `src/components/game/Arena.tsx` | Personalized text + 4-card merch row in ended overlay |
| `src/lib/merch/catalog.ts` | Add `keychain` product entry |
| `src/components/merch/MerchPreview.astro` | Add `keychain` SVG branch (text-only) |

## Out of Scope

- Avatar/warrior on the shop product page (SSR; no session data available there)
- Avatar URL passed as query param to shop URL (URLs stay short)
- Any changes to the checkout, order, or print API flows
