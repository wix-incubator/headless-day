# Shop Link: New Tab + Warrior/Avatar Preview on Product Page

**Date:** 2026-07-09  
**Status:** Approved

## Goal

1. The 4 merch card links on the game-ended overlay open in a new browser tab.
2. The shop product page (`/shop/[product]`) optionally shows the player's warrior sprite + avatar photo composited onto the `MerchPreview` SVG, using the same coordinates as `MerchPreviewInline.tsx`.

## Scope

Both changes are additive and backwards-compatible. If warrior/avatar params are absent the shop page renders text-only (existing behaviour preserved). No new dependencies.

---

## Change 1 — New Tab Links

In `src/components/game/Arena.tsx`, add `target="_blank" rel="noopener noreferrer"` to the `<a>` element inside the `(["tee", "mug", "keychain", "poster"] as const).map(...)` block.

---

## Change 2 — Warrior + Avatar on Shop Page

### Data Flow

```
Arena.tsx
  └─ buildShopUrl(slug, matchPayload, { warriorSrc, avatarUrl })
       └─ URL: /shop/tee?title=...&sub=...&warrior=/assets/arena/warriors/swordsman.png&avatar=https://...

[product].astro (SSR)
  ├─ warriorSrc = searchParams.get("warrior") ?? undefined
  ├─ avatarUrl  = searchParams.get("avatar")  ?? undefined
  └─ <MerchPreview ... warriorSrc={warriorSrc} avatarUrl={avatarUrl} />
```

URL param names: `warrior` (short relative path) and `avatar` (Wix CDN URL, may be long but within browser URL limits).

### buildShopUrl extension (`src/lib/merch/print.ts`)

```ts
export function buildShopUrl(
  product: string,
  payload: PrintPayload,
  visual?: { warriorSrc?: string | null; avatarUrl?: string | null }
): string {
  const params = new URLSearchParams({ title: payload.title, sub: payload.sub });
  if (visual?.warriorSrc) params.set("warrior", visual.warriorSrc);
  if (visual?.avatarUrl)  params.set("avatar",  visual.avatarUrl);
  return `/shop/${product}?${params.toString()}`;
}
```

Existing callers that omit `visual` produce identical URLs — no breaking change.

### print.test.ts addition

```ts
it("includes warrior and avatar params when visual is provided", () => {
  const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" }, {
    warriorSrc: "/assets/arena/warriors/swordsman.png",
    avatarUrl: "https://cdn.example.com/avatar.jpg",
  });
  expect(url).toContain("warrior=%2Fassets%2Farena%2Fwarriors%2Fswordsman.png");
  expect(url).toContain("avatar=https");
});

it("omits visual params when not provided", () => {
  const url = buildShopUrl("tee", { title: "CHAMPION", sub: "JUL 9" });
  expect(url).not.toContain("warrior");
  expect(url).not.toContain("avatar");
});
```

### Arena.tsx change

```tsx
href={buildShopUrl(slug, matchPayload, { warriorSrc, avatarUrl })}
target="_blank"
rel="noopener noreferrer"
```

### [product].astro change

```ts
const warriorSrc = Astro.url.searchParams.get("warrior") ?? undefined;
const avatarUrl  = Astro.url.searchParams.get("avatar")  ?? undefined;

// preserve visual params when hopping between product tabs:
const tabParams = new URLSearchParams({ title: payload.title, sub: payload.sub });
if (warriorSrc) tabParams.set("warrior", warriorSrc);
if (avatarUrl)  tabParams.set("avatar",  avatarUrl);
```

Pass to MerchPreview:
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

### MerchPreview.astro changes

Add two optional props to the `Props` type:

```ts
type Props = {
  product: "tee" | "mug" | "keychain" | "poster";
  garmentColor: string;
  printColor: string;
  title: string;
  sub: string;
  warriorSrc?: string;
  avatarUrl?: string;
};
```

Warrior + avatar coordinates — same values as `MerchPreviewInline.tsx`:

| Product  | warrior x,y,w,h          | avatar cx,cy,r  |
|----------|--------------------------|-----------------|
| tee      | 72, 103, 56, 58          | 100, 113, 9     |
| mug      | 50, 72, 60, 70           | 80, 84, 8       |
| keychain | 68, 58, 64, 82           | 100, 73, 9      |
| poster   | 55, 56, 90, 110          | 100, 70, 11     |

Added to each product SVG branch (when `warriorSrc` is defined):

```astro
{warriorSrc && (
  <>
    {avatarUrl && (
      <defs>
        <clipPath id="shop-av">
          <circle cx={AV[product].cx} cy={AV[product].cy} r={AV[product].r} />
        </clipPath>
      </defs>
    )}
    <image href={warriorSrc} x={W[product].x} y={W[product].y}
           width={W[product].w} height={W[product].h}
           preserveAspectRatio="xMidYMin meet" />
    {avatarUrl && (
      <image href={avatarUrl}
             x={AV[product].cx - AV[product].r}
             y={AV[product].cy - AV[product].r}
             width={AV[product].r * 2} height={AV[product].r * 2}
             clip-path="url(#shop-av)"
             preserveAspectRatio="xMidYMid slice" />
    )}
  </>
)}
```

`W` and `AV` are plain JS objects defined in the Astro frontmatter — no TypeScript generics needed.

Since only one product SVG renders per page load, the clipPath id `"shop-av"` is unique per page — no collision risk.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/merch/print.ts` | `buildShopUrl` gains optional `visual` 3rd arg |
| `src/lib/merch/print.test.ts` | 2 new tests for warrior/avatar URL params |
| `src/components/game/Arena.tsx` | `target`/`rel` on card links; pass `visual` to `buildShopUrl` |
| `src/pages/shop/[product].astro` | Read + forward `warrior`/`avatar` params; preserve in `tabParams` |
| `src/components/merch/MerchPreview.astro` | Optional `warriorSrc`/`avatarUrl` props + SVG compositing |

## Out of Scope

- Avatar URL sanitisation on the shop page (avatarUrl comes from the game session's own Wix media; the SVG renders it as an `<image href>` only, not innerHTML)
- Caching or storing the warrior/avatar server-side
