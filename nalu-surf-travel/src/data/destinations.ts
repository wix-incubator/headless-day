export interface SurfSpot { name: string; note: string }

export interface Destination {
  id: string; name: string; country: string; emoji: string;
  lat: number; lng: number;
  bestWindow: { months: string; windNotes: string; tideNotes: string };
  spots: SurfSpot[];
  skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'All levels';
  waterTemp: string;
  blurb: string;
}

/** Angular distance (deg) within which the bird may land at a marker. */
export const LANDING_RANGE_DEG = 14;

export const DESTINATIONS: Destination[] = [
  { id: 'oahu', name: 'Oahu — North Shore', country: 'Hawaii, USA', emoji: '🌺',
    lat: 21.6, lng: -158.1,
    bestWindow: { months: 'Nov – Feb', windNotes: 'NE trade winds groom the faces', tideNotes: 'Best around mid tide' },
    spots: [
      { name: 'Pipeline', note: "the world's barrel" },
      { name: 'Sunset Beach', note: 'big open walls' },
      { name: 'Waimea Bay', note: 'the big-wave classic' }],
    skillLevel: 'Advanced', waterTemp: '25°C',
    blurb: "Winter's proving ground — when the North Pacific fires, the world's best paddle out here while the rest of us watch from the sand, jaws on the floor." },
  { id: 'bali', name: 'Bali — Uluwatu', country: 'Indonesia', emoji: '🌴',
    lat: -8.8, lng: 115.1,
    bestWindow: { months: 'Apr – Oct', windNotes: 'SE trades blow offshore all dry season', tideNotes: 'Mid-to-high — the reef is sharp below' },
    spots: [
      { name: 'Uluwatu', note: 'long walls under the temple' },
      { name: 'Padang Padang', note: 'the Balinese Pipeline' }],
    skillLevel: 'Advanced', waterTemp: '28°C',
    blurb: 'Cliffside temples above, mechanical left-handers below. Dry-season Uluwatu is the trip that turns a surfer into a pilgrim.' },
  { id: 'ericeira', name: 'Ericeira', country: 'Portugal', emoji: '🐚',
    lat: 38.99, lng: -9.42,
    bestWindow: { months: 'Sep – Nov', windNotes: 'E winds are offshore in the mornings', tideNotes: 'Coxos turns on at mid tide' },
    spots: [
      { name: "Ribeira d'Ilhas", note: 'rippable rights all day' },
      { name: 'Coxos', note: 'world-class point when it lines up' }],
    skillLevel: 'Intermediate', waterTemp: '18°C',
    blurb: "Europe's only World Surfing Reserve — a fishing town with a dozen world-class reefs a short drive apart, and good coffee between sessions." },
  { id: 'taghazout', name: 'Taghazout', country: 'Morocco', emoji: '🐪',
    lat: 30.54, lng: -9.71,
    bestWindow: { months: 'Oct – Mar', windNotes: 'NE mornings hold the points offshore', tideNotes: 'Points line up low-to-mid' },
    spots: [
      { name: 'Anchor Point', note: 'the endless right' },
      { name: 'Killer Point', note: 'bigger, longer, emptier' }],
    skillLevel: 'Intermediate', waterTemp: '19°C',
    blurb: 'A sleepy Berber fishing village that wakes each winter for the long, peeling right at Anchor Point. Warm sun, cheap tagine, endless walls.' },
  { id: 'nosara', name: 'Nosara', country: 'Costa Rica', emoji: '🦥',
    lat: 9.98, lng: -85.65,
    bestWindow: { months: 'Dec – Apr', windNotes: 'Offshore every dry-season morning', tideNotes: 'Guiones works on all tides' },
    spots: [
      { name: 'Playa Guiones', note: 'friendly beach-break machine' },
      { name: 'Ostional', note: 'punchier peaks up the coast' }],
    skillLevel: 'All levels', waterTemp: '28°C',
    blurb: 'Jungle meets a golden beach break that works on any tide. Howler monkeys for an alarm clock, offshore mornings, no bad days for learning.' },
  { id: 'jbay', name: 'Jeffreys Bay', country: 'South Africa', emoji: '🐋',
    lat: -34.05, lng: 24.93,
    bestWindow: { months: 'Jun – Aug', windNotes: 'W winds offshore with winter swells', tideNotes: 'Lower tide makes it race' },
    spots: [
      { name: 'Supertubes', note: 'the fastest wall on earth' },
      { name: 'Boneyards', note: 'the take-off above Supers' }],
    skillLevel: 'Advanced', waterTemp: '17°C',
    blurb: "The fastest wave on Earth. Supertubes doesn't ask if you're ready — it just races, and if you make the drop it's the ride of your life." },
  { id: 'teahupoo', name: "Teahupo'o", country: 'French Polynesia', emoji: '🌋',
    lat: -17.85, lng: -149.27,
    bestWindow: { months: 'May – Sep', windNotes: 'Light morning offshores over the reef', tideNotes: 'Mid tide — the reef is razor-shallow' },
    spots: [
      { name: "Teahupo'o", note: 'the heaviest wave on Earth' },
      { name: 'The Channel', note: 'watch the pros from a boat' }],
    skillLevel: 'Advanced', waterTemp: '27°C',
    blurb: "The end of the road, literally — a reef so shallow the wave folds into a slab of pure Pacific. Watch from the channel unless you truly know what you're doing." },
  { id: 'snapper', name: 'Snapper Rocks', country: 'Australia', emoji: '🦘',
    lat: -28.16, lng: 153.55,
    bestWindow: { months: 'Feb – Jun', windNotes: 'SW winds groom the bank', tideNotes: 'Runs best mid-to-high' },
    spots: [
      { name: 'Superbank', note: 'one of the longest rides on Earth' },
      { name: 'Kirra', note: 'the barrel at the end' }],
    skillLevel: 'All levels', waterTemp: '24°C',
    blurb: "The Superbank funnels sand into one of the longest rides on the planet. On its day you can run from Snapper all the way to Kirra with your legs screaming." },
  { id: 'puerto', name: 'Puerto Escondido', country: 'Mexico', emoji: '🌮',
    lat: 15.86, lng: -97.07,
    bestWindow: { months: 'Apr – Oct', windNotes: 'Offshore in the mornings', tideNotes: 'Heavy on all tides' },
    spots: [
      { name: 'Zicatela', note: 'the Mexican Pipeline' },
      { name: 'La Punta', note: 'a mellow left down the beach' }],
    skillLevel: 'Advanced', waterTemp: '28°C',
    blurb: "Mexico's Pipeline — Zicatela throws heavy sand-bottom barrels and doesn't care who's paddling out. Warm water, cold beers, real consequences." },
  { id: 'cloudbreak', name: 'Cloudbreak', country: 'Fiji', emoji: '🐠',
    lat: -17.85, lng: 177.19,
    bestWindow: { months: 'Apr – Oct', windNotes: 'SE trades blow it clean', tideNotes: 'Mid tide over the reef' },
    spots: [
      { name: 'Cloudbreak', note: 'a perfect reef left' },
      { name: 'Restaurants', note: 'a shorter, sharper wall' }],
    skillLevel: 'Advanced', waterTemp: '27°C',
    blurb: 'A boat ride from anywhere, breaking over living reef in the middle of the Pacific. Perfect, powerful, and worth every mile to get there.' },
  { id: 'raglan', name: 'Raglan', country: 'New Zealand', emoji: '🥝',
    lat: -37.80, lng: 174.83,
    bestWindow: { months: 'Mar – Sep', windNotes: 'E winds hold up the points', tideNotes: 'Mid tide links the sections' },
    spots: [
      { name: 'Manu Bay', note: 'an endless left point' },
      { name: 'Whale Bay', note: 'the next point down' }],
    skillLevel: 'Intermediate', waterTemp: '17°C',
    blurb: 'One of the longest left-hand points on Earth, peeling down a black-sand coast. Pull on a wetsuit and settle in for the long walk back up the point.' },
  { id: 'hossegor', name: 'Hossegor', country: 'France', emoji: '🥖',
    lat: 43.66, lng: -1.44,
    bestWindow: { months: 'Sep – Oct', windNotes: 'E offshores at dawn', tideNotes: 'Banks fire around mid tide' },
    spots: [
      { name: 'La Gravière', note: 'heaving autumn barrels' },
      { name: 'La Nord', note: "the tour's beach-break stage" }],
    skillLevel: 'Advanced', waterTemp: '18°C',
    blurb: "Europe's beach-break capital — when the autumn sandbanks line up, La Gravière throws barrels that pull the whole world tour into town." },
];

export function destinationById(id: string): Destination | undefined {
  return DESTINATIONS.find(d => d.id === id);
}
