# Interior model renders — drop-in slot

Put cozy isometric room renders here and they appear automatically on
`/builds` (the "Same shell. Pick how you live in it." section), replacing
the placeholder frames. No code change needed.

**Filenames must match the model slug** (png / webp / jpg, square works best):

- `the-studio.png`
- `the-galley.png`
- `the-bunkhouse.png`
- `the-den.png`

These are matched by `src/components/InteriorModels.astro` via
`import.meta.glob`, optimized by Astro's image pipeline at build.

## Generation prompts (Midjourney / DALL·E / etc.)

Shared style suffix — append to each:
> cozy isometric 3D cutaway diorama, blender clay render, soft global
> illumination, rounded edges, warm reclaimed-fir wood + deep olive green
> (#273B1F) + cream, one small glowing lime (#DFFF4F) destination roll-sign,
> plain pale sage background, centered, soft contact shadow, high detail,
> square 1:1 --ar 1:1

- **the-studio** — "interior of a converted transit bus set up as a work-from-the-road studio: an L-shaped desk under the curb-side windows, a monitor wall, a full bookshelf, a murphy bed folded up against the wall, …<suffix>"
- **the-galley** — "interior of a converted transit bus as a cook's kitchen: a long reclaimed-fir counter, a propane range, a deep farmhouse sink, a fold-out dining table seating four, hanging copper pots, …<suffix>"
- **the-bunkhouse** — "interior of a converted transit bus as a family bunkhouse: a bunk-over-cab bed for kids, a convertible dinette, a wall of gear storage cubbies, warm string lights, …<suffix>"
- **the-den** — "interior of a converted transit bus as a slow-living den: a small wood-stove in the corner, a soaking-tub nook, a deep reading bench with cushions, the original destination blind framed on the wall, …<suffix>"
