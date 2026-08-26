/* schema.org builders. SportsActivityLocation is the site-wide type;
   pages add SportsEvent / FAQPage as the spec's JSON-LD plan requires. */
import { business } from '../data/seed';
import type { Tournament } from '../data/seed';

export const SITE_NAME = 'Parallel Parking Stadium';
export const SITE_TAGLINE = 'Competitive parking as a spectator sport';
// Canonical origin for structured-data URLs (the live deploy). Update here if a
// custom domain is mapped.
export const SITE_URL = 'https://parallel-p-e706ec61-yulia004.wix-site-host.com';

export function sportsActivityLocation() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsActivityLocation',
    name: SITE_NAME,
    description:
      'Buenos Aires arena for competitive parallel parking — centimeter-measured clearance scoring, live elimination brackets, and a hall of fame topped by an 11cm park.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: business.city,
      addressCountry: business.country,
    },
    areaServed: 'Buenos Aires',
    priceRange: business.priceRange,
    foundingDate: String(business.established),
    sport: 'Parallel Parking',
    openingHours: ['We-Sa 14:00-22:00'],
    sameAs: [
      'https://instagram.com/parkingstadium',
      'https://instagram.com/el11cm',
    ],
  };
}

export function sportsEvent(t: Tournament) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: t.title,
    sport: 'Parallel Parking',
    startDate: t.isoDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description: t.matchup,
    location: {
      '@type': 'SportsActivityLocation',
      name: SITE_NAME,
      address: {
        '@type': 'PostalAddress',
        addressLocality: business.city,
        addressCountry: business.country,
      },
    },
    offers: {
      '@type': 'Offer',
      availability:
        t.status === 'Sold out'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/InStock',
      url: `${SITE_URL}/tickets`,
      priceCurrency: 'USD',
      price: 18,
    },
  };
}

export function faqPage(faqs: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}
