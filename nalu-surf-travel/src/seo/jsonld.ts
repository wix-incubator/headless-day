import { DESTINATIONS } from '../data/destinations';
import { AGENCY } from '../data/agency';
import { SERVICE_NAME } from '../bookings/api';

const AGENCY_NAME = 'Nalu Surf Travel';

interface TravelAgency {
  '@type': 'TravelAgency';
  name: string;
  description: string;
  email: string;
  telephone: string;
}

interface Service {
  '@type': 'Service';
  name: string;
  description: string;
  provider: { '@type': 'TravelAgency'; name: string };
  areaServed: string;
}

interface TouristDestination {
  '@type': 'TouristDestination';
  name: string;
  description: string;
}

interface ItemList {
  '@type': 'ItemList';
  name: string;
  itemListElement: { '@type': 'ListItem'; position: number; item: TouristDestination }[];
}

export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': [TravelAgency, Service, ItemList];
}

function destinationDescription(d: (typeof DESTINATIONS)[number]): string {
  const spots = d.spots.map((s) => s.name).join(', ');
  return `${d.blurb} ${d.country} — best ${d.bestWindow.months} (${d.bestWindow.windNotes}, ${d.bestWindow.tideNotes}). Spots: ${spots}. Skill: ${d.skillLevel}, water ${d.waterTemp}.`;
}

/** Pure builder for the homepage's schema.org graph — single source of truth is DESTINATIONS/AGENCY/SERVICE_NAME. */
export function buildJsonLd(): JsonLdGraph {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TravelAgency',
        name: AGENCY_NAME,
        description: AGENCY.about,
        email: AGENCY.email,
        telephone: AGENCY.phone,
      },
      {
        '@type': 'Service',
        name: SERVICE_NAME,
        description: 'A 30-minute online video call with a real surf-travel agent to plan your trip.',
        provider: { '@type': 'TravelAgency', name: AGENCY_NAME },
        areaServed: 'Worldwide',
      },
      {
        '@type': 'ItemList',
        name: 'Surf destinations',
        itemListElement: DESTINATIONS.map((d, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'TouristDestination',
            name: d.name,
            description: destinationDescription(d),
          },
        })),
      },
    ],
  };
}
