# Hero bus render — drop-in slot

Save a cut-away bus render here as **`bus.png`** (transparent background
preferred; `.webp`/`.jpg` also work) and it appears overlapping the homepage
headline, with an idle bob + subtle scroll parallax. Until then the hero is
text-only. Matched by `src/pages/index.astro` via `import.meta.glob`.

After adding the file: `npm run build` then `npx wix release` to publish.

## Generation prompt (Wix Media Manager "Create with AI", Midjourney, DALL·E, etc.)

> 3D isometric clay render of a retired city transit bus converted into a tiny
> home, **cut away on the long side like a dollhouse so you can see the cozy
> interior** — reclaimed-fir galley with a little sink and stove, a made bed, a
> warm wood floor, a few tiny potted plants, soft cabin lighting, and a glowing
> lime-yellow (#DFFF4F) destination roll-sign reading "DOWNTOWN" above the
> windshield. Deep olive-green exterior (#273B1F), warm wood + cream interior,
> soft global illumination, rounded soft-body edges, Blender clay style, high
> detail, 3/4 isometric view, transparent background. --ar 3:2

Tips:
- **Transparent background** lets it sit cleanly over the olive hero. If your
  tool can't do transparent, set the background to the olive `#273B1F` and it
  blends in.
- Keep the same look across the four model rooms (`src/assets/models/`) so the
  hero bus and the layout cards feel like one set.
