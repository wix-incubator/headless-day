import { SITE, OPENING_HOURS_SPEC } from './site';
import { img } from './images';
import type { BoardDish, Faq } from '../data/content';

const heroImage = img('hero', { w: 1200, h: 800 });

export function restaurantSchema(extra: Record<string, unknown> = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: SITE.name,
    description: SITE.description,
    url: SITE.url,
    image: heroImage,
    telephone: SITE.phone,
    priceRange: SITE.priceRange,
    servesCuisine: ['Basque', 'Seafood', 'Grill'],
    foundingDate: SITE.established,
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITE.street,
      addressLocality: SITE.locality,
      addressRegion: SITE.region,
      postalCode: SITE.postalCode,
      addressCountry: SITE.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: SITE.geo.lat,
      longitude: SITE.geo.lng,
    },
    openingHoursSpecification: OPENING_HOURS_SPEC,
    sameAs: [SITE.social.instagram, SITE.social.secondary],
    acceptsReservations: 'https://www.thesaltmeridian.com/reservations',
    ...extra,
  };
}

export function menuSchema(dishes: BoardDish[]) {
  const bySection = new Map<string, BoardDish[]>();
  for (const d of dishes) {
    if (!bySection.has(d.section)) bySection.set(d.section, []);
    bySection.get(d.section)!.push(d);
  }
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'The Board',
    description: 'The chalkboard menu, rewritten every morning with the catch.',
    hasMenuSection: [...bySection.entries()].map(([section, items]) => ({
      '@type': 'MenuSection',
      name: section,
      hasMenuItem: items.map((d) => ({
        '@type': 'MenuItem',
        name: d.name,
        description: d.tastingDescription,
        offers: { '@type': 'Offer', price: d.price, priceCurrency: 'EUR' },
      })),
    })),
  };
}

export function faqSchema(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}
