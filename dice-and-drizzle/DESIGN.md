---
version: alpha
name: "Dice & Drizzle"
colors:
  paper: "#F5F0E8"
  paper-warm: "#FDFAF5"
  ink: "#2A2118"
  ink-soft: "#8B7355"
  mute: "#6B5D52"
  rule: "#D9CFC2"
  accent: "#E8A87C"
  cream: "#FAF7F2"
  error: "#C0392B"
typography:
  display: { fontFamily: "Cormorant Garamond" }
  body: { fontFamily: "Outfit" }
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
containers:
  prose: "65ch"
  md: "768px"
  3xl: "1280px"
  6xl: "1536px"
googleFontsHref: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Outfit:wght@400;500;600&display=swap"
---
# Dice & Drizzle — design tokens

The YAML frontmatter above is the canonical, machine-read design spec
(format: `references/shared/DESIGN_MD.md`). This body is documentation only
and is never parsed.

## Brand

Dice & Drizzle is a board game cafe in Reykjavik, Iceland. 1,200+ tabletop games,
hourly pricing, Icelandic hot chocolates and craft sodas, felt-lined dice trays,
brass d20 call bells.

## Aesthetic direction

Nordic hygge minimal — warm wood tones, soft textures, generous negative space.
Cozy, playful, unhurried, gently nerdy, dry-wit Icelandic. Not corporate, not
hard-sell, not childish.

## Palette rationale

Warm cream background (`paper: #F5F0E8`) throughout. Dark sections use `ink`
(`#2A2118`) with `paper` text — footer, hero overlay. Accent `#E8A87C` for
interactive elements, highlights, hover states. Surface `paper-warm: #FDFAF5`
for card and section backgrounds. `ink-soft: #8B7355` is a warm mid-tone for
secondary fills and subheadings. `#5B4A3F` (primary button dark fill) is a
tonal variant within the `ink` hue family and is consumed as `ink` downstream.

## Typography rationale

`Cormorant Garamond` (Bold 700) as the display face brings old-world warmth and
editorial weight to headlines. `Outfit` (Regular 400 / Medium 500) is clean and
contemporary for body copy and UI labels — a legible, unhurried pairing.

## Page color strategy

Uniform Light with defined dark sections. Primary background is warm cream
(`paper`). Hero overlays and the footer use `ink` (#2A2118) as the fill with
`paper` (#F5F0E8) text. Cards and section surfaces use `paper-warm` (#FDFAF5).
