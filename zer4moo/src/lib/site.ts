// Static, non-content site constants + the one media asset not stored on a CMS item.

export const SITE = {
  name: 'ZER4MOO',
  tagline: 'A bouquet for moo.',
  description:
    'Hand-tied, food-grade bouquets — premium hay, fresh pasture grass, and wildflower grazing mixes — delivered to the cow of your choosing. Because joy shouldn’t be limited to those who can hold a vase.',
  url: 'https://zer4moo.com',
  founded: '2023',
  location: 'Greenfield Farm, outside the city',
  hours: 'Open daily, dawn to dusk',
  priceRange: '₪₪',
  currency: '₪',
  socials: { instagram: '@zer4moo', field: '@thedailygraze' },
  minDeliveryFee: 18,
};

// Hero LCP illustration — generated via Wix AI, imported to the site media library.
export const MEDIA = {
  hero: 'https://static.wixstatic.com/media/a7fb22_820883292c084128bf8477c26220630b~mv2.png',
};

// The boutique category strip on the home page (illustrated as CSS tiles — no credits).
export const CATEGORIES = [
  { name: 'Hay Bouquets', blurb: 'Sun-dried, first-cut, timeless.', tint: 'linear-gradient(150deg,#F3E7C9,#E9D6A6)' },
  { name: 'Fresh Grass Arrangements', blurb: 'Cool from the dawn, loose and generous.', tint: 'linear-gradient(150deg,#DCE7CE,#B9CE9E)' },
  { name: 'Wildflower Grazing Mixes', blurb: 'Clover, dandelion, edible blooms.', tint: 'linear-gradient(150deg,#F6DDDF,#EBB9BE)' },
  { name: 'Salt-Lick Gift Sets', blurb: 'The finishing touch, gift-wrapped.', tint: 'linear-gradient(150deg,#EFE3D0,#DFC79C)' },
];

export function money(n: number): string {
  if (n == null || Number.isNaN(n)) return '';
  return `${SITE.currency}${Number(n).toLocaleString('en-US')}`;
}

export function jsonLdScript(obj: unknown): string {
  return JSON.stringify(obj);
}

// Serve a resized, format-negotiated (AVIF/WebP) version of a Wix media image
// via the CDN fill transform — huge weight savings vs the raw PNG. Non-Wix URLs pass through.
export function wixThumb(url: string, w: number, h: number, q = 74): string {
  if (typeof url !== 'string' || !url.includes('static.wixstatic.com/media/')) return url || '';
  const file = url.split('/media/')[1].split('/')[0]; // filename before any existing transform
  return `https://static.wixstatic.com/media/${file}/v1/fill/w_${Math.round(w)},h_${Math.round(h)},al_c,q_${q},enc_auto/${file}`;
}
