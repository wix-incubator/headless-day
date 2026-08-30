/** Single source of truth for business facts, nav, and contact details. */

export const SITE = {
  name: 'Salt Meridian',
  tagline: 'Coastal Basque cooking, fired over driftwood',
  description:
    'A 30-seat driftwood asador above the harbor in San Sebastián, grilling whole turbot and aged txuleta over open flame. The chalkboard menu changes with the morning catch.',
  url: 'https://www.thesaltmeridian.com',
  locality: 'San Sebastián',
  region: 'Gipuzkoa',
  country: 'ES',
  street: 'Kaiako Pasealekua 12',
  postalCode: '20003',
  phone: '+34 943 000 142',
  phoneHref: '+34943000142',
  email: 'reservations@saltmeridian.example',
  priceRange: '$$$',
  established: '2017',
  geo: { lat: 43.3232, lng: -1.9851 },
  hours: [
    { days: 'Wednesday – Sunday', service: 'Lunch', time: '1:00 – 4:00 pm' },
    { days: 'Wednesday – Sunday', service: 'Dinner', time: '8:00 – 11:00 pm' },
    { days: 'Monday – Tuesday', service: 'Closed', time: '—' },
  ],
  social: {
    instagram: 'https://instagram.com/saltmeridian.asador',
    instagramHandle: '@saltmeridian.asador',
    secondary: 'https://instagram.com/thedriftwoodfire',
    secondaryHandle: '@thedriftwoodfire',
  },
} as const;

export const NAV = [
  { label: 'The Board', href: '/menu' },
  { label: 'The Fire', href: '/about' },
  { label: 'The Grill & Room', href: '/gallery' },
  { label: 'Find Us', href: '/contact' },
] as const;

/** schema.org opening hours specification, reused across JSON-LD blocks. */
export const OPENING_HOURS_SPEC = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '13:00',
    closes: '16:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '20:00',
    closes: '23:00',
  },
];
