# Shop New-Tab Links + Warrior/Avatar on Product Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open all 4 merch card links in a new tab and composite the player's warrior sprite + avatar photo onto the `MerchPreview` SVG on the shop product page.

**Architecture:** Warrior/avatar travel as URL query params (`warrior`, `avatar`) from `buildShopUrl` → shop page → `MerchPreview.astro`. The shop page preserves these params when the user switches between product tabs. `MerchPreview.astro` gains optional props and inserts an `<image>` warrior + circular-clipped `<image>` avatar into each product SVG, rendered between the garment layer and the print text so text sits on top. All existing behaviour when params are absent is unchanged.

**Tech Stack:** TypeScript, Astro (SSR templates), React (Arena.tsx), Vitest

## Global Constraints

- No new dependencies
- `warrior` and `avatar` are the URL param names (not `warriorSrc`/`avatarUrl`)
- Backwards-compatible: omitting `visual` from `buildShopUrl` produces an identical URL to today
- Text renders on top of warrior (SVG paint order: garment → warrior → avatar → text)
- Warrior/avatar absent → MerchPreview renders exactly as before (no visual change)
- `clip-path` attribute (hyphenated) in Astro SVG templates; `clipPath` element name stays camelCase
- clipPath id `"shop-av"` — one product SVG renders per page, no collision
- Poster: podium decorations hidden when `warriorSrc` present (`{!warriorSrc && ...}`)
- `npx astro check` must pass after each task; `npx vitest run --project merch` after Task 1

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/merch/print.ts` | Modify | Add optional `visual` 3rd arg to `buildShopUrl` |
| `src/lib/merch/print.test.ts` | Modify | 2 new tests for warrior/avatar URL encoding |
| `src/components/game/Arena.tsx` | Modify | Pass `{ warriorSrc, avatarUrl }` to `buildShopUrl`; add `target`/`rel` |
| `src/pages/shop/[product].astro` | Modify | Read `warrior`/`avatar` params; preserve in `tabParams`; pass to `MerchPreview` |
| `src/components/merch/MerchPreview.astro` | Modify | Add `warriorSrc`/`avatarUrl` optional props; composite into all 4 SVG branches |

---

### Task 1: Extend buildShopUrl and wire Arena.tsx (TDD)

**Files:**
- Modify: `src/lib/merch/print.ts`
- Modify: `src/lib/merch/print.test.ts`
- Modify: `src/components/game/Arena.tsx`

**Interfaces:**
- Produces: `buildShopUrl(product, payload, visual?)` where `visual?: { warriorSrc?: string | null; avatarUrl?: string | null }`
- Consumed by: Task 2 (`[product].astro` reads the `warrior`/`avatar` params the URL now carries)

- [ ] **Step 1: Write the two failing tests**

Add to the bottom of `src/lib/merch/print.test.ts`, inside a new `describe("buildShopUrl visual params")` block:

```ts
describe("buildShopUrl visual params", () => {
  it("includes warrior and avatar query params when visual is provided", () => {
    const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" }, {
      warriorSrc: "/assets/arena/warriors/swordsman.png",
      avatarUrl: "https://cdn.example.com/avatar.jpg",
    });
    expect(url).toContain("warrior=");
    expect(url).toContain("avatar=");
    expect(url).toContain("swordsman");
    expect(url).toContain("cdn.example.com");
  });

  it("omits warrior and avatar params when visual is not provided", () => {
    const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" });
    expect(url).not.toContain("warrior");
    expect(url).not.toContain("avatar");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && npx vitest run --project merch
```

Expected: FAIL — `buildShopUrl` does not accept a 3rd argument yet (TypeScript error or test assertion failure).

- [ ] **Step 3: Update buildShopUrl in print.ts**

Open `src/lib/merch/print.ts`. Replace the existing `buildShopUrl` function (lines 48–51):

```ts
/** Build the shop URL that carries a payload into the merch funnel. */
export function buildShopUrl(product: string, payload: PrintPayload): string {
  const params = new URLSearchParams({ title: payload.title, sub: payload.sub });
  return `/shop/${product}?${params.toString()}`;
}
```

With:

```ts
/** Build the shop URL that carries a payload (and optional visual) into the merch funnel. */
export function buildShopUrl(
  product: string,
  payload: PrintPayload,
  visual?: { warriorSrc?: string | null; avatarUrl?: string | null },
): string {
  const params = new URLSearchParams({ title: payload.title, sub: payload.sub });
  if (visual?.warriorSrc) params.set("warrior", visual.warriorSrc);
  if (visual?.avatarUrl) params.set("avatar", visual.avatarUrl);
  return `/shop/${product}?${params.toString()}`;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && npx vitest run --project merch
```

Expected: all merch tests pass (previously passing tests + 2 new ones).

- [ ] **Step 5: Update Arena.tsx — pass visual + add new-tab attributes**

Open `src/components/game/Arena.tsx`. Find line 447 (the `href={buildShopUrl(slug, matchPayload)}` line) and the surrounding `<a>` element:

```tsx
                    <a
                      key={slug}
                      href={buildShopUrl(slug, matchPayload)}
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 p-2 text-neutral-300 no-underline transition hover:border-cyan-400/50 hover:bg-white/5"
                      style={{ width: 90 }}
                    >
```

Replace with:

```tsx
                    <a
                      key={slug}
                      href={buildShopUrl(slug, matchPayload, { warriorSrc, avatarUrl })}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center gap-1 rounded-lg border border-white/10 p-2 text-neutral-300 no-underline transition hover:border-cyan-400/50 hover:bg-white/5"
                      style={{ width: 90 }}
                    >
```

- [ ] **Step 6: TypeScript check**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && npx astro check
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && git add src/lib/merch/print.ts src/lib/merch/print.test.ts src/components/game/Arena.tsx
git commit -m "feat: pass warrior/avatar to shop URL; open merch cards in new tab"
```

---

### Task 2: Shop page reads params + MerchPreview.astro compositing

**Files:**
- Modify: `src/pages/shop/[product].astro`
- Modify: `src/components/merch/MerchPreview.astro`

**Interfaces:**
- Consumes: `warrior` and `avatar` URL query params produced by Task 1
- Produces: `MerchPreview` accepts `warriorSrc?: string` and `avatarUrl?: string`; renders warrior + circular-clipped avatar inside each product SVG when present

- [ ] **Step 1: Update [product].astro frontmatter**

Open `src/pages/shop/[product].astro`. After line 22 (the closing `}`  of the `sanitizePayload` call), add:

```ts
const warriorSrc = Astro.url.searchParams.get("warrior") ?? undefined;
const avatarUrl  = Astro.url.searchParams.get("avatar")  ?? undefined;
```

Then find line 39 (the `tabParams` declaration):

```ts
// keep the payload when hopping between products
const tabParams = new URLSearchParams({ title: payload.title, sub: payload.sub });
```

Replace with:

```ts
// keep the payload (and optional visual) when hopping between products
const tabParams = new URLSearchParams({ title: payload.title, sub: payload.sub });
if (warriorSrc) tabParams.set("warrior", warriorSrc);
if (avatarUrl)  tabParams.set("avatar",  avatarUrl);
```

- [ ] **Step 2: Pass warriorSrc and avatarUrl to MerchPreview in [product].astro**

Find the `<MerchPreview` component call (around line 94). Currently:

```astro
        <MerchPreview
          product={product.slug as "tee" | "mug" | "keychain" | "poster"}
          garmentColor={garmentColor}
          printColor={printColor}
          title={payload.title}
          sub={payload.sub}
        />
```

Replace with:

```astro
        <MerchPreview
          product={product.slug as "tee" | "mug" | "keychain" | "poster"}
          garmentColor={garmentColor}
          printColor={printColor}
          title={payload.title}
          sub={payload.sub}
          warriorSrc={warriorSrc}
          avatarUrl={avatarUrl}
        />
```

- [ ] **Step 3: Update MerchPreview.astro Props type and frontmatter**

Open `src/components/merch/MerchPreview.astro`. Replace the entire frontmatter block (lines 1–16) with:

```astro
---
/**
 * Live product mockup: a pixel-style SVG garment with the score print on it.
 * Parts carry data attributes so the product page's script can restyle them
 * when the buyer flips options: [data-garment] (fill), [data-print] (fill),
 * [data-print-title] / [data-print-sub] (text). `textLength` force-fits any
 * payload into the print area, so long titles squeeze instead of overflowing.
 * Optional warriorSrc/avatarUrl composite the player's character onto the preview.
 */
type Props = {
  product: "tee" | "mug" | "keychain" | "poster";
  garmentColor: string;
  printColor: string;
  title: string;
  sub: string;
  /** Warrior sprite path, e.g. /assets/arena/warriors/swordsman.png */
  warriorSrc?: string;
  /** Player avatar photo URL (first-party Wix CDN) */
  avatarUrl?: string;
};
const { product, garmentColor, printColor, title, sub, warriorSrc, avatarUrl } = Astro.props;

// Warrior placement and avatar clip — same coordinates as MerchPreviewInline.tsx
const W = {
  tee:      { x: 72,  y: 103, w: 56, h: 58  },
  mug:      { x: 50,  y: 72,  w: 60, h: 70  },
  keychain: { x: 68,  y: 58,  w: 64, h: 82  },
  poster:   { x: 55,  y: 56,  w: 90, h: 110 },
} as const;
const AV = {
  tee:      { cx: 100, cy: 113, r: 9  },
  mug:      { cx: 80,  cy: 84,  r: 8  },
  keychain: { cx: 100, cy: 73,  r: 9  },
  poster:   { cx: 100, cy: 70,  r: 11 },
} as const;
---
```

- [ ] **Step 4: Add warrior/avatar layer to the tee SVG**

In the tee SVG branch (currently lines 20–57), insert the warrior/avatar layer between the `<path data-garment .../>` and the first `<text data-print-title .../>`. The tee branch becomes:

```astro
{
  product === "tee" && (
    <svg viewBox="0 0 200 200" class="h-full w-full" role="img" aria-label="T-shirt preview">
      <path
        data-garment
        fill={garmentColor}
        stroke="rgba(255,255,255,0.25)"
        stroke-width="2"
        d="M50 52 H80 V62 H120 V52 H150 L172 88 L146 103 L140 91 V172 H60 V91 L54 103 L28 88 Z"
      />
      {warriorSrc && (
        <>
          {avatarUrl && (
            <defs>
              <clipPath id="shop-av">
                <circle cx={AV.tee.cx} cy={AV.tee.cy} r={AV.tee.r} />
              </clipPath>
            </defs>
          )}
          <image href={warriorSrc} x={W.tee.x} y={W.tee.y} width={W.tee.w} height={W.tee.h} preserveAspectRatio="xMidYMin meet" />
          {avatarUrl && (
            <image href={avatarUrl} x={AV.tee.cx - AV.tee.r} y={AV.tee.cy - AV.tee.r} width={AV.tee.r * 2} height={AV.tee.r * 2} clip-path="url(#shop-av)" preserveAspectRatio="xMidYMid slice" />
          )}
        </>
      )}
      <text
        data-print-title
        x="100"
        y="108"
        fill={printColor}
        font-size="9"
        text-anchor="middle"
        textLength="72"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {title}
      </text>
      <text
        data-print-sub
        x="100"
        y="126"
        fill={printColor}
        opacity="0.75"
        font-size="5.5"
        text-anchor="middle"
        textLength="68"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {sub}
      </text>
    </svg>
  )
}
```

- [ ] **Step 5: Add warrior/avatar layer to the mug SVG**

In the mug SVG branch, insert the warrior/avatar layer after the steam rects (`{[0,1,2].map...}` block) and before the first `<text>`. The mug branch becomes:

```astro
{
  product === "mug" && (
    <svg viewBox="0 0 200 200" class="h-full w-full" role="img" aria-label="Mug preview">
      <rect x="120" y="78" width="34" height="54" rx="10" fill="none" stroke={garmentColor} stroke-width="10" data-garment-stroke />
      <rect data-garment fill={garmentColor} stroke="rgba(255,255,255,0.25)" stroke-width="2" x="46" y="58" width="86" height="96" rx="6" />
      <rect x="46" y="58" width="86" height="10" fill="rgba(255,255,255,0.15)" />
      {[0, 1, 2].map((i) => (
        <rect
          class="animate-float"
          style={`animation-delay:-${i * 1.6}s`}
          x={64 + i * 22}
          y="34"
          width="6"
          height="12"
          fill="rgba(255,255,255,0.25)"
        />
      ))}
      {warriorSrc && (
        <>
          {avatarUrl && (
            <defs>
              <clipPath id="shop-av">
                <circle cx={AV.mug.cx} cy={AV.mug.cy} r={AV.mug.r} />
              </clipPath>
            </defs>
          )}
          <image href={warriorSrc} x={W.mug.x} y={W.mug.y} width={W.mug.w} height={W.mug.h} preserveAspectRatio="xMidYMin meet" />
          {avatarUrl && (
            <image href={avatarUrl} x={AV.mug.cx - AV.mug.r} y={AV.mug.cy - AV.mug.r} width={AV.mug.r * 2} height={AV.mug.r * 2} clip-path="url(#shop-av)" preserveAspectRatio="xMidYMid slice" />
          )}
        </>
      )}
      <text
        data-print-title
        x="89"
        y="102"
        fill={printColor}
        font-size="8"
        text-anchor="middle"
        textLength="64"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {title}
      </text>
      <text
        data-print-sub
        x="89"
        y="120"
        fill={printColor}
        opacity="0.75"
        font-size="5"
        text-anchor="middle"
        textLength="60"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {sub}
      </text>
    </svg>
  )
}
```

- [ ] **Step 6: Add warrior/avatar layer to the keychain SVG**

In the keychain SVG branch, insert the warrior/avatar layer after the tag body `<rect data-garment .../>` and before the first `<text>`. The keychain branch becomes:

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
      {warriorSrc && (
        <>
          {avatarUrl && (
            <defs>
              <clipPath id="shop-av">
                <circle cx={AV.keychain.cx} cy={AV.keychain.cy} r={AV.keychain.r} />
              </clipPath>
            </defs>
          )}
          <image href={warriorSrc} x={W.keychain.x} y={W.keychain.y} width={W.keychain.w} height={W.keychain.h} preserveAspectRatio="xMidYMin meet" />
          {avatarUrl && (
            <image href={avatarUrl} x={AV.keychain.cx - AV.keychain.r} y={AV.keychain.cy - AV.keychain.r} width={AV.keychain.r * 2} height={AV.keychain.r * 2} clip-path="url(#shop-av)" preserveAspectRatio="xMidYMid slice" />
          )}
        </>
      )}
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

- [ ] **Step 7: Add warrior/avatar layer to the poster SVG**

In the poster SVG branch, insert the warrior/avatar layer after the background rects and before the text elements. Also hide the podium decorations (circle/rect/path/rect) when `warriorSrc` is present. The poster branch becomes:

```astro
{
  product === "poster" && (
    <svg viewBox="0 0 200 200" class="h-full w-full" role="img" aria-label="Poster preview">
      <rect x="40" y="20" width="120" height="160" fill="#0b0b1a" stroke="rgba(255,255,255,0.4)" stroke-width="3" />
      <rect x="48" y="28" width="104" height="144" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" />
      {warriorSrc && (
        <>
          {avatarUrl && (
            <defs>
              <clipPath id="shop-av">
                <circle cx={AV.poster.cx} cy={AV.poster.cy} r={AV.poster.r} />
              </clipPath>
            </defs>
          )}
          <image href={warriorSrc} x={W.poster.x} y={W.poster.y} width={W.poster.w} height={W.poster.h} preserveAspectRatio="xMidYMin meet" />
          {avatarUrl && (
            <image href={avatarUrl} x={AV.poster.cx - AV.poster.r} y={AV.poster.cy - AV.poster.r} width={AV.poster.r * 2} height={AV.poster.r * 2} clip-path="url(#shop-av)" preserveAspectRatio="xMidYMid slice" />
          )}
        </>
      )}
      <text
        data-print-title
        x="100"
        y="82"
        fill={printColor}
        font-size="10"
        text-anchor="middle"
        textLength="88"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {title}
      </text>
      <text
        data-print-sub
        x="100"
        y="102"
        fill={printColor}
        opacity="0.75"
        font-size="5.5"
        text-anchor="middle"
        textLength="80"
        lengthAdjust="spacingAndGlyphs"
        style="font-family: var(--font-display)"
      >
        {sub}
      </text>
      {/* podium decorations — only when no warrior is composited */}
      {!warriorSrc && (
        <>
          <circle cx="100" cy="136" r="7" fill="#22d3ee" />
          <rect x="70" y="136" width="12" height="12" fill="#e879f9" transform="rotate(45 76 142)" />
          <path d="M118 148 L125 134 L132 148 Z" fill="#fcd34d" />
          <rect x="60" y="152" width="80" height="4" fill="rgba(255,255,255,0.25)" />
        </>
      )}
    </svg>
  )
}
```

- [ ] **Step 8: TypeScript check**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && npx astro check
```

Expected: 0 errors.

- [ ] **Step 9: Run full test suite**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && npx vitest run
```

Expected: all suites pass (same count as before — no new unit tests for Astro templates).

- [ ] **Step 10: Commit**

```bash
cd /Users/kyryloi/wix/wix-headless-masterclass/team-build-games && git add src/pages/shop/[product].astro src/components/merch/MerchPreview.astro
git commit -m "feat: composite warrior sprite and avatar photo on shop product page preview"
```

---

## Self-Review

### Spec coverage

| Requirement | Task |
|-------------|------|
| `target="_blank" rel="noopener noreferrer"` on 4-card links | Task 1, Step 5 |
| `buildShopUrl` optional `visual` 3rd arg | Task 1, Step 3 |
| `warrior`/`avatar` URL params set when visual provided | Task 1, Step 3 |
| Tests: visual params present/absent | Task 1, Steps 1–4 |
| Shop page reads `warrior`/`avatar` from searchParams | Task 2, Step 1 |
| `tabParams` preserves `warrior`/`avatar` when hopping tabs | Task 2, Step 1 |
| `MerchPreview` receives `warriorSrc`/`avatarUrl` | Task 2, Steps 2–3 |
| Warrior + avatar composited in all 4 SVG branches | Task 2, Steps 4–7 |
| Poster: podium decorations hidden when warrior present | Task 2, Step 7 |
| No new dependencies | Both tasks ✓ |
| Backwards compat: absent params → no change | Both tasks (optional types + `??undefined`) ✓ |

### Placeholder scan

No TBDs, TODOs, or vague steps. All steps contain exact code.

### Type consistency

- `buildShopUrl(slug, matchPayload, { warriorSrc, avatarUrl })` — `warriorSrc: string` and `avatarUrl: string | null` from Arena.tsx. The 3rd arg type is `{ warriorSrc?: string | null; avatarUrl?: string | null }` — `string` satisfies `string | null` ✓
- `warriorSrc?: string` in MerchPreview Props — `Astro.url.searchParams.get(...)` returns `string | null`, `?? undefined` converts null → undefined → satisfies `string | undefined` ✓
- `W[product]` and `AV[product]` — `product` is `"tee" | "mug" | "keychain" | "poster"`, all 4 keys exist in both const objects ✓
