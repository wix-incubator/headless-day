// The pickable "field" — individual stems a visitor gathers into a custom bouquet.
// Illustrated (watercolor SVG) in FlowerArt.tsx; priced per stem.
export type Stem = {
  id: string;
  name: string;
  kind: 'green' | 'flower';
  price: number;
  // taste-profile keywords used to match a bouquet to a cow's favoriteGreens
  match: string[];
};

export const STEMS: Stem[] = [
  // greens
  { id: 'timothy', name: 'Golden Timothy', kind: 'green', price: 9, match: ['timothy', 'premium timothy', 'hay', 'alfalfa'] },
  { id: 'wheat', name: 'Wild Wheat', kind: 'green', price: 9, match: ['timothy', 'premium timothy', 'hay', 'alfalfa'] },
  { id: 'ryegrass', name: 'Fresh Ryegrass', kind: 'green', price: 7, match: ['grass', 'ryegrass', 'fresh grass', 'fresh ryegrass'] },
  { id: 'alfalfa', name: 'Tender Alfalfa', kind: 'green', price: 8, match: ['alfalfa', 'clover', 'timothy'] },
  // flowers
  { id: 'clover', name: 'Sweet Clover', kind: 'flower', price: 8, match: ['clover', 'wildflowers', 'meadow blooms'] },
  { id: 'dandelion', name: 'Bright Dandelion', kind: 'flower', price: 8, match: ['dandelion', 'wildflowers', 'meadow blooms'] },
  { id: 'buttercup', name: 'Golden Buttercup', kind: 'flower', price: 10, match: ['wildflowers', 'meadow blooms'] },
  { id: 'daisy', name: 'Meadow Daisy', kind: 'flower', price: 10, match: ['wildflowers', 'meadow blooms', 'daisy'] },
  { id: 'poppy', name: 'Field Poppy', kind: 'flower', price: 12, match: ['wildflowers', 'meadow blooms'] },
  { id: 'blush', name: 'Blush Wildflower', kind: 'flower', price: 12, match: ['wildflowers', 'meadow blooms'] },
  { id: 'harebell', name: 'Pasture Harebell', kind: 'flower', price: 11, match: ['wildflowers', 'meadow blooms'] },
  { id: 'lavender', name: 'Meadow Lavender', kind: 'flower', price: 11, match: ['wildflowers', 'meadow blooms'] },
];

// Signature arrangements → a starting handful of stems ("Build with this" on a bouquet card).
export const PRESETS: Record<string, string[]> = {
  'meadow-timothy': ['timothy', 'wheat', 'timothy', 'alfalfa'],
  'wildflower-grazing-mix': ['clover', 'dandelion', 'daisy', 'blush', 'harebell', 'ryegrass'],
  'morning-pasture': ['ryegrass', 'ryegrass', 'clover', 'dandelion'],
  'first-cut-reserve': ['timothy', 'wheat', 'timothy', 'alfalfa', 'ryegrass'],
  'full-meadow': ['blush', 'poppy', 'daisy', 'buttercup', 'lavender', 'clover', 'harebell', 'ryegrass'],
  'clover-dandelion-posy': ['clover', 'dandelion', 'clover'],
};
