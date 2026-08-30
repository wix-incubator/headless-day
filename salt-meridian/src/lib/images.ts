/**
 * Image source resolution.
 *
 * The site ships with verified Unsplash CDN URLs so it renders and deploys
 * immediately. Once you generate on-brand imagery and import it to Wix Media
 * (see `scripts/generate-images.mjs`), paste the resulting media id into
 * `wixMediaId` for a key — the resolver switches to a permanent, format-
 * negotiated `static.wixstatic.com` URL automatically. Nothing else changes.
 */

type ImageDef = {
  /** Unsplash photo id (the `photo-...` slug). Immediate, always-on fallback. */
  unsplash: string;
  /**
   * Wix Media id, e.g. `nsplsh_abc123~mv2.jpg` (the `id` returned by the
   * Media import API). When set, takes precedence over `unsplash`.
   */
  wixMediaId?: string;
  /** Default alt text. Components may override per usage. */
  alt: string;
};

export const IMAGES = {
  hero: {
    unsplash: '1556814901-18c866c057da',
    wixMediaId: 'a7fb22_8496f0ef0ce4406398f098b89400c60b~mv2.jpg',
    alt: 'A whole fish laid skin-down over glowing coals, smoke curling off the grill bars',
  },
  catch: {
    unsplash: '1744971699638-447a8581aa3a',
    wixMediaId: 'a7fb22_6c6b5a3cde1a413a9c374f381f423f4b~mv2.jpg',
    alt: 'Fish and vegetables cooking above a bed of glowing coals',
  },
  txuleta: {
    unsplash: '1759382904778-6994716b1aa1',
    wixMediaId: 'a7fb22_d567d31b49f542879f62eb4002dfc7a3~mv2.jpg',
    alt: 'Thick bone-in steaks searing over open flames on the grill',
  },
  embers: {
    unsplash: '1762202742459-4fcdc4beaab4',
    wixMediaId: 'a7fb22_b2f8fadfa6c34782b302f50cce48091c~mv2.jpg',
    alt: 'Close-up of glowing amber embers in a wood fire',
  },
  room: {
    unsplash: '1758243488328-148e39e5e6b1',
    wixMediaId: 'a7fb22_26388227c368422d81ee4446b01004fd~mv2.jpg',
    alt: 'A warm rustic dining room with wooden beams and large windows at dusk',
  },
  harbor: {
    unsplash: '1663845074983-9a1a04604470',
    wixMediaId: 'a7fb22_58d21e5c62b94077bd054e7d49f0e3d1~mv2.jpg',
    alt: 'Fishing boats moored along the harbor on the Basque coast',
  },
  grillBars: {
    unsplash: '1626323418665-8cf7dfb52904',
    wixMediaId: 'a7fb22_c7344756d15b46209ffb72c0eddc92f0~mv2.jpg',
    alt: 'Charred meat resting on the bars of a charcoal grill',
  },
  vegetables: {
    unsplash: '1570481060336-9c82d078588e',
    wixMediaId: 'a7fb22_3ca9cc552fc4417488f5e1162376d694~mv2.jpg',
    alt: 'A steak and vegetables charring over the coals of an open grill',
  },
  coals: {
    unsplash: '1735887879121-eb3ca3ee03b6',
    wixMediaId: 'a7fb22_a8f466aa3b314447bb685eb7d09dc4d5~mv2.jpg',
    alt: 'A close-up of an open fire with bright hot coals',
  },
  pour: {
    // tall cutout of the meter-high cider pour on a black ground; generated only.
    unsplash: '1514362545857-3bc16c4c7d1b',
    wixMediaId: 'a7fb22_305990b6f2364315b85626f15e7aaf0a~mv2.jpg',
    alt: 'Natural Basque cider poured from a meter up in one long stream into a glass',
  },
  place: {
    // full-bleed moody Basque location hero (the coast at dusk).
    unsplash: '1558642891-54be180ea339',
    wixMediaId: 'a7fb22_67df02d75918435385ff6281d77f77d6~mv2.jpg',
    alt: 'The Basque coast at San Sebastián at dusk — the headland and bay under a moody sky',
  },
  bottle: {
    // top cap of the full-page pour: bottle pouring, stream exits bottom-center.
    unsplash: '1514362545857-3bc16c4c7d1b',
    wixMediaId: 'a7fb22_8387a19204d6483b881c617f5891d734~mv2.jpg',
    alt: 'A green cider bottle tilted, pouring a thin stream straight down',
  },
  glass: {
    // bottom cap of the full-page pour: glass receiving, stream enters top-center.
    unsplash: '1514362545857-3bc16c4c7d1b',
    wixMediaId: 'a7fb22_5a7732c148a04f0b8080c603698b13cd~mv2.jpg',
    alt: 'A glass of cider filling, a thin stream splashing in from above',
  },
  fisherman: {
    unsplash: '1542856391-010fb87dcfed',
    wixMediaId: 'a7fb22_9e7b140f0a8f476c9e700af01ecc6f74~mv2.jpg',
    alt: 'A Basque fisherman hauling a line at dawn off the boat',
  },
  hookfish: {
    unsplash: '1444390052740-eadf4d1a3a3a',
    wixMediaId: 'a7fb22_dd3e1b8681384365888eb884761b03ef~mv2.jpg',
    alt: 'A fresh line-caught fish on the hook, just off the water',
  },
} satisfies Record<string, ImageDef>;

export type ImageKey = keyof typeof IMAGES;

type Opts = { w: number; h?: number; q?: number };

/** Build a single sized URL for an image key. */
export function img(key: ImageKey, { w, h, q = 68 }: Opts): string {
  const def = IMAGES[key];
  if (def.wixMediaId) {
    const fill = h ? `w_${w},h_${h},al_c` : `w_${w}`;
    // enc_auto negotiates AVIF/WebP per the requesting browser.
    return `https://static.wixstatic.com/media/${def.wixMediaId}/v1/fill/${fill},q_82,enc_auto/${def.wixMediaId}`;
  }
  const params = new URLSearchParams({
    w: String(w),
    q: String(q),
    auto: 'format',
    fit: 'crop',
  });
  if (h) params.set('h', String(h));
  return `https://images.unsplash.com/photo-${def.unsplash}?${params}`;
}

/** Build a `srcset` across widths for responsive delivery. */
export function srcset(key: ImageKey, widths: number[], ratio?: number): string {
  return widths
    .map((w) => {
      const h = ratio ? Math.round(w * ratio) : undefined;
      return `${img(key, { w, h })} ${w}w`;
    })
    .join(', ');
}

export function alt(key: ImageKey): string {
  return IMAGES[key].alt;
}

/** True once an image has been generated + imported to Wix Media. */
export function hasGenerated(key: ImageKey): boolean {
  return Boolean(IMAGES[key].wixMediaId);
}
