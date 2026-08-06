# Merch Preview on Game Finished Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single "Print this result on a tee" link in the game-ended overlay with 4 personalized merchandise preview cards (tee, mug, keychain, poster), each showing the player's warrior sprite + avatar photo with personalized win/loss text.

**Architecture:** All data is already in scope in `Arena.tsx` at game end — no new network calls. A new pure helper `matchResultPayload` generates personalized text from match outcome + stats. A new React component `MerchPreviewInline` renders inline SVG previews (warrior + avatar composited via SVG `<image>` + `<clipPath>`) for all 4 products. The existing server-rendered `MerchPreview.astro` (used on the shop page) gains only a keychain text-only SVG branch.

**Tech Stack:** React 18 (TSX), Astro, inline SVG, Vitest

## Global Constraints

- All print text passes through `sanitizePayload` (uppercase, charset-restricted, length-clamped to TITLE_MAX=24 / SUB_MAX=36, profanity-masked)
- No new dependencies — inline SVG only, no canvas, no image libraries
- `MerchPreview.astro` keeps text-only previews (SSR has no session avatar/warrior data)
- Shop page (`[product].astro`) works for keychain automatically via the dynamic `[product]` route

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/game/arena/cosmetic.ts` | Modify | Add + export `BODY_ASSET` (shape→warrior PNG path) |
| `src/game/arena/render/scene.ts` | Modify | Import `BODY_ASSET` from cosmetic, remove local decl |
| `src/lib/merch/print.ts` | Modify | Add `matchResultPayload(opts): PrintPayload` |
| `src/lib/merch/print.test.ts` | Modify | Tests for `matchResultPayload` |
| `src/lib/merch/catalog.ts` | Modify | Add `keychain` product to `MERCH_PRODUCTS` |
| `src/lib/merch/catalog.test.ts` | Modify | Tests for keychain product |
| `src/components/merch/MerchPreview.astro` | Modify | Add `keychain` SVG branch (text-only for SSR shop page) |
| `src/pages/shop/[product].astro` | Modify | Widen cast to include `"keychain"` |
| `src/components/merch/MerchPreviewInline.tsx` | **Create** | React SVG previews with warrior + avatar compositing |
| `src/components/game/Arena.tsx` | Modify | Personalized text computation + 4-card merch row |

---

### Task 1: Export BODY_ASSET from cosmetic.ts and update scene.ts

**Files:**
- Modify: `src/game/arena/cosmetic.ts`
- Modify: `src/game/arena/render/scene.ts`

**Interfaces:**
- Produces: `BODY_ASSET: Record<Shape, string>` exported from `cosmetic.ts`
- Consumed by: Task 4 (MerchPreviewInline) and Task 5 (Arena.tsx)

- [ ] **Step 1: Add BODY_ASSET to cosmetic.ts**

Open `src/game/arena/cosmetic.ts`. The file currently has `Shape`, `SHAPES`, `DEFAULT_SHAPE`, and `coerceShape`. Add the mapping at the bottom:

```ts
export const BODY_ASSET: Record<Shape, string> = {
  circle:   "/assets/arena/warriors/swordsman.png",
  square:   "/assets/arena/warriors/spearman.png",
  triangle: "/assets/arena/warriors/knife-fighter.png",
  diamond:  "/assets/arena/warriors/archer.png",
};
```

- [ ] **Step 2: Update scene.ts to import from cosmetic**

Open `src/game/arena/render/scene.ts`. Find the local `BODY_ASSET` declaration (around line 20):

```ts
const BODY_ASSET: Record<Shape, string> = {
  circle: "/assets/arena/warriors/swordsman.png",
  square: "/assets/arena/warriors/spearman.png",
  triangle: "/assets/arena/warriors/knife-fighter.png",
  diamond: "/assets/arena/warriors/archer.png",
};
```

Replace it by importing from cosmetic. Change the existing cosmetic import line from:

```ts
import type { Shape } from "../cosmetic";
```

to:

```ts
import { BODY_ASSET, type Shape } from "../cosmetic";
```

Then delete the local `BODY_ASSET` const declaration entirely.

- [ ] **Step 3: Run arena tests to verify no regression**

```bash
cd team-build-games && npx vitest run --project arena
```

Expected: all arena tests pass (same count as before).

- [ ] **Step 4: Commit**

```bash
cd team-build-games && git add src/game/arena/cosmetic.ts src/game/arena/render/scene.ts
git commit -m "refactor: export BODY_ASSET from cosmetic so Arena can resolve warrior paths without importing the Phaser scene"
```

---

### Task 2: Add matchResultPayload to print.ts (TDD)

**Files:**
- Modify: `src/lib/merch/print.ts`
- Modify: `src/lib/merch/print.test.ts`

**Interfaces:**
- Consumes: `sanitizePayload`, `PrintPayload` (already in `print.ts`)
- Produces: `matchResultPayload(opts: MatchResultOptions): PrintPayload` and `MatchResultOptions` interface, both exported from `print.ts`
- Consumed by: Task 5 (Arena.tsx)

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `src/lib/merch/print.test.ts`:

```ts
import { matchResultPayload } from "./print";

describe("matchResultPayload", () => {
  const BASE = {
    winnerId: null,
    winnerName: null,
    loserNames: [],
    localHits: 5,
    localDistanceM: 80.4,
    date: "JUL 9 2026",
  };

  it("produces ARENA CHAMPION title when you won", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: ["Alice", "Bob"] });
    expect(out.title).toBe("ARENA CHAMPION");
  });

  it("lists up to 2 defeated opponents in the sub line when you won", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: ["Alice", "Bob", "Carol"] });
    expect(out.sub).toContain("I BEAT ALICE & BOB");
    expect(out.sub).not.toContain("CAROL");
  });

  it("produces ELIMINATED WITH HONOR and lost-to line when you lost", () => {
    const out = matchResultPayload({ ...BASE, youWon: false, winnerId: "x", winnerName: "Alice" });
    expect(out.title).toBe("ELIMINATED WITH HONOR");
    expect(out.sub).toContain("LOST TO ALICE");
  });

  it("produces MUTUAL DESTRUCTION on a draw", () => {
    const out = matchResultPayload({ ...BASE, youWon: false });
    expect(out.title).toBe("MUTUAL DESTRUCTION");
  });

  it("includes hit count and rounded distance in sub", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, localHits: 7, localDistanceM: 123.9 });
    expect(out.sub).toContain("7 HITS");
    expect(out.sub).toContain("124M");
  });

  it("includes the date when draw (no winner line to use)", () => {
    const out = matchResultPayload({ ...BASE, youWon: false });
    expect(out.sub).toContain("JUL 9 2026");
  });

  it("output respects SUB_MAX length", () => {
    const longName = "A".repeat(30);
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: [longName, longName] });
    expect(out.sub.length).toBeLessThanOrEqual(SUB_MAX);
  });

  it("falls back to stat line when winner has no name", () => {
    const out = matchResultPayload({ ...BASE, youWon: false, winnerId: "x", winnerName: null });
    expect(out.title).toBe("ELIMINATED WITH HONOR");
    expect(out.sub).toContain("HITS");
  });

  it("falls back to stat line when winner won but loserNames is empty", () => {
    const out = matchResultPayload({ ...BASE, youWon: true, loserNames: [] });
    expect(out.title).toBe("ARENA CHAMPION");
    expect(out.sub).toContain("HITS");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd team-build-games && npx vitest run --project merch
```

Expected: FAIL — `matchResultPayload is not a function` (or similar import error).

- [ ] **Step 3: Add MatchResultOptions interface and matchResultPayload to print.ts**

Open `src/lib/merch/print.ts`. Add after the `sanitizePayload` function:

```ts
export interface MatchResultOptions {
  youWon: boolean;
  /** null when draw */
  winnerId: string | null;
  /** display name of winner; null when draw */
  winnerName: string | null;
  /** display names of non-winners in standings order */
  loserNames: string[];
  localHits: number;
  localDistanceM: number;
  /** pre-formatted date, e.g. "JUL 9 2026" */
  date: string;
}

/**
 * Build a personalized PrintPayload from a match outcome.
 * Text is sanitized (uppercase, charset-restricted, length-clamped) via sanitizePayload.
 */
export function matchResultPayload(opts: MatchResultOptions): PrintPayload {
  const { youWon, winnerId, winnerName, loserNames, localHits, localDistanceM, date } = opts;
  const statPart = `${localHits} HITS · ${Math.round(localDistanceM)}M`;

  let rawTitle: string;
  let rawSub: string;

  if (youWon) {
    rawTitle = "ARENA CHAMPION";
    const beaten = loserNames.slice(0, 2).join(" & ");
    rawSub = beaten ? `I BEAT ${beaten} · ${statPart}` : statPart;
  } else if (winnerId) {
    rawTitle = "ELIMINATED WITH HONOR";
    rawSub = winnerName ? `LOST TO ${winnerName} · ${statPart}` : statPart;
  } else {
    rawTitle = "MUTUAL DESTRUCTION";
    rawSub = `${statPart} · ${date}`;
  }

  return sanitizePayload({ title: rawTitle, sub: rawSub });
}
```

- [ ] **Step 4: Run tests and confirm they pass**

```bash
cd team-build-games && npx vitest run --project merch
```

Expected: all merch tests pass, including the new `matchResultPayload` suite.

- [ ] **Step 5: Commit**

```bash
cd team-build-games && git add src/lib/merch/print.ts src/lib/merch/print.test.ts
git commit -m "feat: add matchResultPayload — personalized win/loss print text from match outcome"
```

---

### Task 3: Add keychain to catalog and MerchPreview.astro (TDD)

**Files:**
- Modify: `src/lib/merch/catalog.ts`
- Modify: `src/lib/merch/catalog.test.ts`
- Modify: `src/components/merch/MerchPreview.astro`
- Modify: `src/pages/shop/[product].astro`

**Interfaces:**
- Produces: `productBySlug("keychain")` returns a valid `MerchProduct`
- Consumed by: `[product].astro` shop page, `MerchPreviewInline.tsx` (slug list in Task 5)

- [ ] **Step 1: Write failing catalog tests for keychain**

Add to the bottom of `src/lib/merch/catalog.test.ts`:

```ts
describe("keychain product", () => {
  const keychain = productBySlug("keychain");

  it("exists in the catalog", () => {
    expect(keychain).toBeDefined();
  });

  it("has material and printColor options", () => {
    const keys = keychain!.options.map((o) => o.key);
    expect(keys).toContain("material");
    expect(keys).toContain("printColor");
  });

  it("metal material adds a price delta", () => {
    const metalChoice = keychain!.options
      .find((o) => o.key === "material")!
      .choices.find((c) => c.value === "metal")!;
    expect(metalChoice.priceDeltaCents).toBeGreaterThan(0);
  });

  it("base price is correct", () => {
    expect(keychain!.basePriceCents).toBe(900);
  });

  it("default selection includes material=acrylic", () => {
    expect(defaultSelection(keychain!)).toMatchObject({ material: "acrylic" });
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd team-build-games && npx vitest run --project merch
```

Expected: FAIL — keychain is undefined.

- [ ] **Step 3: Add keychain to MERCH_PRODUCTS in catalog.ts**

Open `src/lib/merch/catalog.ts`. Find the closing `];` of the `MERCH_PRODUCTS` array (after the poster entry). Insert before that closing bracket:

```ts
  {
    slug: "keychain",
    name: "Fighter Keychain",
    tagline: "Your character, pocket-sized and battle-hardened.",
    basePriceCents: 900,
    options: [
      {
        key: "material",
        label: "Material",
        choices: [
          { value: "acrylic", label: "Clear acrylic" },
          { value: "metal", label: "Brushed metal", priceDeltaCents: 600 },
        ],
      },
      { key: "printColor", label: "Print color", choices: PRINT_COLORS },
    ],
  },
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd team-build-games && npx vitest run --project merch
```

Expected: all merch tests pass.

- [ ] **Step 5: Add keychain SVG to MerchPreview.astro**

Open `src/components/merch/MerchPreview.astro`. The `Props` type currently is:

```ts
type Props = {
  product: "tee" | "mug" | "poster";
  ...
};
```

Change `product` to:

```ts
  product: "tee" | "mug" | "keychain" | "poster";
```

Then add the keychain SVG branch after the mug block and before the poster block:

```astro
{
  product === "keychain" && (
    <svg viewBox="0 0 200 200" class="h-full w-full" role="img" aria-label="Keychain preview">
      <circle cx="100" cy="44" r="10" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="4" />
      <rect
        data-garment
        fill={garmentColor}
        stroke="rgba(255,255,255,0.25)"
        stroke-width="2"
        x="65"
        y="54"
        width="70"
        height="110"
        rx="10"
      />
      <text
        data-print-title
        x="100"
        y="105"
        fill={printColor}
        font-size="7"
        text-anchor="middle"
        textLength="58"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {title}
      </text>
      <text
        data-print-sub
        x="100"
        y="120"
        fill={printColor}
        opacity="0.75"
        font-size="5"
        text-anchor="middle"
        textLength="54"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {sub}
      </text>
    </svg>
  )
}
```

- [ ] **Step 6: Fix the cast in [product].astro**

Open `src/pages/shop/[product].astro`. Find line ~95:

```astro
<MerchPreview
  product={product.slug as "tee" | "mug" | "poster"}
```

Change to:

```astro
<MerchPreview
  product={product.slug as "tee" | "mug" | "keychain" | "poster"}
```

- [ ] **Step 7: Verify shop page builds**

```bash
cd team-build-games && npx astro check
```

Expected: no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
cd team-build-games && git add src/lib/merch/catalog.ts src/lib/merch/catalog.test.ts src/components/merch/MerchPreview.astro src/pages/shop/[product].astro
git commit -m "feat: add keychain product to catalog and MerchPreview (text-only SSR variant)"
```

---

### Task 4: Create MerchPreviewInline.tsx

**Files:**
- Create: `src/components/merch/MerchPreviewInline.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks at type level (warrior paths passed as string prop)
- Produces:
  ```ts
  export default function MerchPreviewInline(props: MerchPreviewInlineProps): JSX.Element
  interface MerchPreviewInlineProps {
    product: "tee" | "mug" | "keychain" | "poster";
    title: string;
    sub: string;
    garmentColor?: string;
    printColor?: string;
    warriorSrc: string;
    avatarUrl?: string | null;
  }
  ```
- Consumed by: Task 5 (Arena.tsx)

- [ ] **Step 1: Create the component**

Create `src/components/merch/MerchPreviewInline.tsx` with the following content:

```tsx
/**
 * Inline React SVG merch previews for the game-ended overlay.
 * Composites the player's warrior sprite and avatar photo onto each product shape.
 * The server-rendered MerchPreview.astro (shop page) is separate — no session data there.
 */

type Product = "tee" | "mug" | "keychain" | "poster";

interface MerchPreviewInlineProps {
  product: Product;
  title: string;
  sub: string;
  garmentColor?: string;
  printColor?: string;
  warriorSrc: string;
  avatarUrl?: string | null;
}

const DEFAULT_GARMENT: Record<Product, string> = {
  tee:      "#15151f",
  mug:      "#15151f",
  keychain: "#1d2a4d",
  poster:   "#0b0b1a",
};

// Warrior sprite placement within the 200×200 viewBox for each product
const WARRIOR: Record<Product, { x: number; y: number; w: number; h: number }> = {
  tee:      { x: 72,  y: 103, w: 56, h: 58  },
  mug:      { x: 50,  y: 72,  w: 60, h: 70  },
  keychain: { x: 68,  y: 58,  w: 64, h: 82  },
  poster:   { x: 55,  y: 56,  w: 90, h: 110 },
};

// Avatar circle clip — center and radius in the same viewBox coordinate space
const AVATAR: Record<Product, { cx: number; cy: number; r: number }> = {
  tee:      { cx: 100, cy: 113, r: 9  },
  mug:      { cx: 80,  cy: 84,  r: 8  },
  keychain: { cx: 100, cy: 73,  r: 9  },
  poster:   { cx: 100, cy: 70,  r: 11 },
};

const textStyle = { fontFamily: "var(--font-display)" } as const;

export default function MerchPreviewInline({
  product,
  title,
  sub,
  garmentColor,
  printColor = "#22d3ee",
  warriorSrc,
  avatarUrl,
}: MerchPreviewInlineProps) {
  const gColor = garmentColor ?? DEFAULT_GARMENT[product];
  const wr = WARRIOR[product];
  const av = AVATAR[product];
  const clipId = `merch-av-${product}`;

  const defs = avatarUrl ? (
    <defs>
      <clipPath id={clipId}>
        <circle cx={av.cx} cy={av.cy} r={av.r} />
      </clipPath>
    </defs>
  ) : null;

  const warrior = (
    <image
      href={warriorSrc}
      x={wr.x}
      y={wr.y}
      width={wr.w}
      height={wr.h}
      preserveAspectRatio="xMidYMin meet"
    />
  );

  const avatar = avatarUrl ? (
    <image
      href={avatarUrl}
      x={av.cx - av.r}
      y={av.cy - av.r}
      width={av.r * 2}
      height={av.r * 2}
      clipPath={`url(#${clipId})`}
      preserveAspectRatio="xMidYMid slice"
    />
  ) : null;

  if (product === "tee") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="T-shirt preview">
        {defs}
        <path
          fill={gColor}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          d="M50 52 H80 V62 H120 V52 H150 L172 88 L146 103 L140 91 V172 H60 V91 L54 103 L28 88 Z"
        />
        <text x="100" y="100" fill={printColor} fontSize="8" textAnchor="middle" textLength="72" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {title}
        </text>
        {warrior}
        {avatar}
        <text x="100" y="166" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="68" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  if (product === "mug") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Mug preview">
        {defs}
        <rect x="120" y="78" width="34" height="54" rx="10" fill="none" stroke={gColor} strokeWidth="10" />
        <rect fill={gColor} stroke="rgba(255,255,255,0.25)" strokeWidth="2" x="46" y="58" width="86" height="96" rx="6" />
        <rect x="46" y="58" width="86" height="10" fill="rgba(255,255,255,0.15)" />
        {warrior}
        {avatar}
        <text x="89" y="148" fill={printColor} fontSize="7" textAnchor="middle" textLength="64" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {title}
        </text>
        <text x="89" y="158" fill={printColor} fontSize="4.5" opacity="0.8" textAnchor="middle" textLength="60" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  if (product === "keychain") {
    return (
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Keychain preview">
        {defs}
        {/* ring loop at top */}
        <circle cx="100" cy="44" r="10" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="4" />
        {/* tag body */}
        <rect fill={gColor} stroke="rgba(255,255,255,0.25)" strokeWidth="2" x="65" y="54" width="70" height="110" rx="10" />
        {warrior}
        {avatar}
        <text x="100" y="149" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="58" lengthAdjust="spacingAndGlyphs" style={textStyle}>
          {sub}
        </text>
      </svg>
    );
  }

  // poster
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Poster preview">
      {defs}
      <rect x="40" y="20" width="120" height="160" fill="#0b0b1a" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
      <rect x="48" y="28" width="104" height="144" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
      {/* arena grid — subtle vertical lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line key={`v${i}`} x1={56 + i * 22} y1={29} x2={56 + i * 22} y2={171} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      {/* arena grid — subtle horizontal lines */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={`h${i}`} x1={49} y1={36 + i * 24} x2={151} y2={36 + i * 24} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
      ))}
      <text x="100" y="42" fill={printColor} fontSize="8" textAnchor="middle" textLength="88" lengthAdjust="spacingAndGlyphs" style={textStyle}>
        {title}
      </text>
      {warrior}
      {avatar}
      <text x="100" y="172" fill={printColor} fontSize="5" opacity="0.8" textAnchor="middle" textLength="80" lengthAdjust="spacingAndGlyphs" style={textStyle}>
        {sub}
      </text>
    </svg>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd team-build-games && npx astro check
```

Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
cd team-build-games && git add src/components/merch/MerchPreviewInline.tsx
git commit -m "feat: add MerchPreviewInline — React SVG merch previews with warrior sprite and avatar compositing"
```

---

### Task 5: Wire up Arena.tsx ended overlay

**Files:**
- Modify: `src/components/game/Arena.tsx`

**Interfaces:**
- Consumes:
  - `BODY_ASSET: Record<Shape, string>` from `src/game/arena/cosmetic` (Task 1)
  - `matchResultPayload(opts: MatchResultOptions): PrintPayload` from `src/lib/merch/print` (Task 2)
  - `MerchPreviewInline` default export from `src/components/merch/MerchPreviewInline` (Task 4)
  - `buildShopUrl` (already imported)

- [ ] **Step 1: Update imports**

In `src/components/game/Arena.tsx`, find line 19:

```ts
import { buildShopUrl, sanitizePayload } from "../../lib/merch/print";
```

Replace with:

```ts
import { buildShopUrl, matchResultPayload } from "../../lib/merch/print";
```

Then add two more imports after the existing import block (after line 23, before the ICE_SERVERS block):

```ts
import { BODY_ASSET } from "../../game/arena/cosmetic";
import MerchPreviewInline from "../merch/MerchPreviewInline";
```

- [ ] **Step 2: Replace the teeSub block with matchPayload + warriorSrc**

Find lines ~245-248 in `Arena.tsx` (the `teeSub` computation):

```ts
  const teeSub = `${name} · ${new Date()
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase()}`;
```

Replace those lines with:

```ts
  const localStats = board?.stats[localId];
  const losers = standingsOrder.filter((id) => id !== matchWinnerId);
  const matchPayload = matchResultPayload({
    youWon: youWonMatch,
    winnerId: matchWinnerId,
    winnerName: matchWinnerId ? nameOf(matchWinnerId) : null,
    loserNames: losers.map(nameOf),
    localHits: localStats?.hits ?? 0,
    localDistanceM: localStats?.distance ?? 0,
    date: new Date()
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      .toUpperCase(),
  });
  const warriorSrc = BODY_ASSET[shape];
```

- [ ] **Step 3: Replace the amber "Print this result on a tee" link with the 4-card row**

Find this block in the `phase === "ended"` overlay (around lines 391-405):

```tsx
              <a
                href={buildShopUrl(
                  "tee",
                  sanitizePayload({
                    title: youWonMatch ? "ARENA CHAMPION" : matchWinnerId ? "ELIMINATED WITH HONOR" : "MUTUAL DESTRUCTION",
                    sub: teeSub,
                  }),
                )}
                className="mt-1 rounded-lg border border-amber-300/60 px-5 py-2 font-semibold text-amber-300 hover:bg-amber-300/10"
              >
                🏆 Print this result on a tee
              </a>
              <p className="text-xs text-neutral-400">Test-mode store — nothing is charged or shipped.</p>
```

Replace the entire block above with:

```tsx
              <div className="w-full">
                <p className="mb-2 text-center font-display text-[9px] uppercase tracking-widest text-neutral-500">
                  Immortalise your result
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {(["tee", "mug", "keychain", "poster"] as const).map((slug) => (
                    <a
                      key={slug}
                      href={buildShopUrl(slug, matchPayload)}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 p-2 text-neutral-300 no-underline transition hover:border-cyan-400/50 hover:bg-white/5"
                      style={{ width: 90 }}
                    >
                      <div style={{ width: 80, height: 80 }}>
                        <MerchPreviewInline
                          product={slug}
                          title={matchPayload.title}
                          sub={matchPayload.sub}
                          warriorSrc={warriorSrc}
                          avatarUrl={avatarUrl}
                        />
                      </div>
                      <span className="text-center font-display text-[8px] leading-tight text-neutral-300">
                        {slug === "tee"
                          ? "Score Tee"
                          : slug === "mug"
                            ? "Victory Mug"
                            : slug === "keychain"
                              ? "Fighter Key"
                              : "Match Poster"}
                      </span>
                      <span className="font-display text-[8px] text-cyan-400">Shop →</span>
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-center text-xs text-neutral-500">
                  Test-mode store — nothing is charged or shipped.
                </p>
              </div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd team-build-games && npx astro check
```

Expected: no errors.

- [ ] **Step 5: Run all tests**

```bash
cd team-build-games && npx vitest run
```

Expected: all test suites pass (arena, members, merch).

- [ ] **Step 6: Commit**

```bash
cd team-build-games && git add src/components/game/Arena.tsx
git commit -m "feat: replace tee link with 4-card merch preview row on game ended screen — personalized text + warrior+avatar composited SVGs"
```

---

## Self-Review Checklist

### Spec coverage

| Spec requirement | Covered by |
|-----------------|-----------|
| Tee preview with warrior + avatar + win/loss text | Task 4 (tee SVG), Task 5 (wired in overlay) |
| Mug preview — same content as tee | Task 4 (mug SVG), Task 5 |
| Keychain — character image + highscore on back | Task 4 (keychain SVG with sub stats at bottom), Task 3 (catalog + shop page SSR variant) |
| Poster — background + character + highscore on top | Task 4 (poster SVG with grid bg + title at top) |
| Personalized text: "I won / I lost to" | Task 2 (matchResultPayload) |
| Highscores shown | Task 2 (hits + distance in sub line) |
| Links to shop | Task 5 (buildShopUrl per slug) |
| Warrior path from shape | Task 1 (BODY_ASSET exported) |

### No placeholders

All steps contain exact code. No TBDs.

### Type consistency

- `BODY_ASSET` exported as `Record<Shape, string>` in Task 1 — consumed as `BODY_ASSET[shape]` in Task 5 (`shape: Shape` is in Arena.tsx state).
- `matchResultPayload` returns `PrintPayload` (`{ title: string; sub: string }`) — `buildShopUrl(slug, matchPayload)` accepts `PrintPayload` ✓.
- `MerchPreviewInline` `product` prop is `"tee" | "mug" | "keychain" | "poster"` — the `as const` array in Task 5 satisfies this ✓.
- `avatarUrl` passed from Arena to `MerchPreviewInline` is `string | null` (from `avatarUrlRef.current`) — prop type is `string | null | undefined` ✓.
