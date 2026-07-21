import { buildJsonLd } from './jsonld';
import { DESTINATIONS } from '../data/destinations';
import { SERVICE_NAME } from '../bookings/api';

function graphItems(): any[] {
  const graph = buildJsonLd() as { '@graph': any[] };
  return graph['@graph'];
}

test('graph contains a TravelAgency named "Nalu Surf Travel"', () => {
  const agency = graphItems().find((item) => item['@type'] === 'TravelAgency');
  expect(agency?.name).toBe('Nalu Surf Travel');
});

test('graph contains a Service named exactly SERVICE_NAME', () => {
  const service = graphItems().find((item) => item['@type'] === 'Service');
  expect(service?.name).toBe(SERVICE_NAME);
});

test('graph contains exactly 12 TouristDestination items, one per destination', () => {
  const list = graphItems().find((item) => item['@type'] === 'ItemList');
  const destinationItems = (list?.itemListElement ?? []).map((li: any) => li.item);
  expect(destinationItems).toHaveLength(12);
  expect(destinationItems.every((d: any) => d['@type'] === 'TouristDestination')).toBe(true);
});

test('every destination name is present in the ItemList', () => {
  const list = graphItems().find((item) => item['@type'] === 'ItemList');
  const names = (list?.itemListElement ?? []).map((li: any) => li.item.name);
  for (const d of DESTINATIONS) {
    expect(names).toContain(d.name);
  }
});

test('serializes to JSON with no undefined values', () => {
  const json = JSON.stringify(buildJsonLd());
  expect(json).not.toContain('undefined');
  expect(json.length).toBeGreaterThan(0);
});

test('every TouristDestination description leads with its blurb', () => {
  const list = graphItems().find((item) => item['@type'] === 'ItemList');
  const items = (list?.itemListElement ?? []) as { item: { name: string; description: string } }[];
  for (const d of DESTINATIONS) {
    const match = items.find((li) => li.item.name === d.name);
    expect(match?.item.description.startsWith(d.blurb)).toBe(true);
  }
});
