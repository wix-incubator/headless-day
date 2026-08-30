/**
 * Seed content — the canonical local copy of everything that also lives in the
 * CMS. The CMS layer (`src/lib/cms.ts`) reads collections at runtime and falls
 * back to these arrays, so the site renders fully before any collection exists.
 * The shapes here match the CMS collection field ids exactly (see README).
 */
import type { ImageKey } from '../lib/images';

export type BoardDish = {
  _id: string;
  name: string;
  section: string;
  price: string;
  catchTag: string; // 'Today\'s Catch' | 'Signature' | ''
  tastingDescription: string;
  image: ImageKey;
  order: number;
};

export type Review = {
  _id: string;
  name: string;
  quote: string;
  detail: string;
};

export type StoryBlock = {
  _id: string;
  heading: string;
  body: string;
};

export type TodaysCatch = {
  _id: string;
  heading: string;
  body: string;
  updatedLabel: string; // owner-facing "as of" label
};

export type Faq = { question: string; answer: string };

export const SECTION_ORDER = [
  'From the Sea',
  'From the Fire',
  'From the Garden',
  'To Drink',
  'To Finish',
];

export const DISHES: BoardDish[] = [
  {
    _id: 'turbot',
    name: 'Whole Grilled Turbot',
    section: 'From the Sea',
    price: '€58 / kg',
    catchTag: "Today's Catch",
    image: 'hero',
    order: 1,
    tastingDescription:
      'A flat fish laid skin-down over driftwood coals, basted with a vinegar-and-garlic refrito, the skin blistered, the flesh peeling off the bone in slabs. Priced by weight, split easily between two.',
  },
  {
    _id: 'hake',
    name: 'Line-Caught Hake & Kokotxas',
    section: 'From the Sea',
    price: '€34',
    catchTag: "Today's Catch",
    image: 'catch',
    order: 2,
    tastingDescription:
      'A thick loin off the morning boats, grilled hard on the skin, served with the throat collars cooked down soft in their own gelatin. Plain, and better for it.',
  },
  {
    _id: 'bream',
    name: 'Salt-Crusted Sea Bream',
    section: 'From the Sea',
    price: '€38',
    catchTag: '',
    image: 'grillBars',
    order: 3,
    tastingDescription:
      'Packed whole in coarse salt and set at the edge of the fire until the crust sets hard. Cracked open at the table, the flesh steams off the bone, clean and barely seasoned because it does not need more.',
  },
  {
    _id: 'sardines',
    name: 'Sardines on the Bars',
    section: 'From the Sea',
    price: '€16',
    catchTag: '',
    image: 'coals',
    order: 4,
    tastingDescription:
      'Six fat sardines laid straight across the hottest bars, skin split and charred, eaten with your fingers and a heel of bread to catch the oil. The smell of summer on this coast.',
  },
  {
    _id: 'txuleta',
    name: 'Txuleta, Aged Rib',
    section: 'From the Fire',
    price: '€68 / kg',
    catchTag: 'Signature',
    image: 'txuleta',
    order: 5,
    tastingDescription:
      'A thick bone-in rib chop from an old dairy cow, salted heavy, seared hard on the bars until the fat runs and the crust cracks, rested and sliced to the bone. Served rare in the middle, charred at the edge, the way the fire wants it.',
  },
  {
    _id: 'lamb',
    name: 'Milk-Fed Lamb Ribs',
    section: 'From the Fire',
    price: '€26',
    catchTag: '',
    image: 'vegetables',
    order: 6,
    tastingDescription:
      'Small ribs cooked slow at the cool end of the grill, then pushed into the heat to crisp. Salt, fire, and the time it takes — nothing else on the plate.',
  },
  {
    _id: 'leeks',
    name: 'Grilled Leeks & Romesco',
    section: 'From the Garden',
    price: '€14',
    catchTag: '',
    image: 'embers',
    order: 7,
    tastingDescription:
      'Whole leeks charred black in the coals, the burnt outer leaves stripped away to the sweet centers, dressed with a romesco worked from grilled peppers and almonds. Cooked over the same fire as the fish.',
  },
  {
    _id: 'lettuce',
    name: 'Charred Hearts of Lettuce',
    section: 'From the Garden',
    price: '€11',
    catchTag: '',
    image: 'room',
    order: 8,
    tastingDescription:
      'Halved romaine hearts grilled cut-side down until the edges catch and the core stays cool and crisp, anchovy and lemon over the top. Whatever else the garden sent us that week sits alongside.',
  },
  {
    _id: 'cider',
    name: 'Sagardo, Poured From a Meter',
    section: 'To Drink',
    price: '€18 / bottle',
    catchTag: '',
    image: 'harbor',
    order: 9,
    tastingDescription:
      'Natural Basque cider, poured tableside from a meter up so it splashes against the side of the glass and opens. Dry, a little wild, the right thing against the fire. We pour it for you.',
  },
  {
    _id: 'cheese',
    name: 'Idiazabal & Membrillo',
    section: 'To Finish',
    price: '€12',
    catchTag: '',
    image: 'coals',
    order: 10,
    tastingDescription:
      'A wedge of smoked sheep\'s-milk cheese from the hills behind the city, quince paste, a few walnuts. The end of the meal, the way it has always ended here.',
  },
];

export const REVIEWS: Review[] = [
  {
    _id: 'maite',
    name: 'Maite Errazti',
    quote:
      "The turbot came off the fire with skin like glass. I've stopped ordering fish anywhere else.",
    detail: 'Books the corner table every time she\'s back in town.',
  },
  {
    _id: 'inaki',
    name: 'Iñaki Bordagaray',
    quote:
      'The txuleta is charred the way my grandfather argued it should be. They got it right.',
    detail: 'Drove from Bilbao for a Sunday lunch and stayed for the cider.',
  },
  {
    _id: 'clara',
    name: 'Clara Mendiola',
    quote:
      'No menu, no manifesto. They told us what the boats brought and we ate all of it.',
    detail: 'Came for one plate, stayed until the harbor went dark.',
  },
];

export const STORY: StoryBlock = {
  _id: 'story',
  heading: 'We cook what the sea sends, over the wood it sends back.',
  body: "Salt Meridian sits thirty seats deep above the harbor, and the menu is written every morning in chalk because we don't know what we're cooking until the boats come in. We grill over driftwood — wood the sea worked smooth and salt-cured, which burns hotter and throws a smoke you can't fake with charcoal. The whole turbot goes skin-down over the coals; the txuleta sears hard on the bars and rests to the bone. The cider gets poured from a meter up, splashed against the inside of the glass to wake it, the way it's done across this coast. Nothing here is plated to be photographed. It's cooked to be eaten while it's hot, with your hands if that's faster, before the harbor goes fully dark through the glass.",
};

export const TODAYS_CATCH: TodaysCatch = {
  _id: 'catch',
  heading: "This morning's board",
  body: 'Whole turbot, line-caught hake, and a txuleta worth the wait.',
  updatedLabel: 'Updated this morning',
};

export const FAQS: Faq[] = [
  {
    question: 'Do you take reservations?',
    answer:
      "Yes, and you'll want one — thirty seats fill fast. Send a request with your date and party size and we'll call to confirm. Walk-ins get seated only if the fire's quiet, which it rarely is.",
  },
  {
    question: 'How do I know what\'s on the menu tonight?',
    answer:
      "You don't, exactly, and neither do we until the boats come in. The board changes every morning with the catch. Whatever's freshest goes over the fire — check the Today's Catch banner for the latest.",
  },
  {
    question: 'Why are the fish priced by the kilo?',
    answer:
      "Because we grill them whole and weigh them whole. A turbot or a txuleta is priced by weight and easily split between two or three. We'll talk you through portions when you sit down.",
  },
  {
    question: 'Is there anything for people who don\'t eat fish or meat?',
    answer:
      'There\'s always a grilled vegetable plate and whatever the garden sent us that week, cooked over the same coals. Tell us in the booking note and we\'ll set it aside.',
  },
  {
    question: 'Where do we park near the harbor?',
    answer:
      'There\'s a public lot two minutes up the hill and metered street parking along the front. The walk down to the window is short and worth it for the view.',
  },
  {
    question: 'What is the cider pour about?',
    answer:
      "It's a coast tradition — the cider gets poured from a meter above the glass so it splashes against the side and opens up. We do it tableside. It's not a trick; it's how the cider's meant to be drunk here.",
  },
];

export type GalleryImage = { image: ImageKey; caption: string };

export const GALLERY: GalleryImage[] = [
  { image: 'hero', caption: 'Whole turbot, skin-down over driftwood coals' },
  { image: 'fisherman', caption: 'The morning boats, before the board is written' },
  { image: 'harbor', caption: 'The harbor going dark through the glass' },
  { image: 'hookfish', caption: 'Line-caught, straight off the water' },
  { image: 'txuleta', caption: 'Txuleta searing hard on the bars' },
  { image: 'catch', caption: "This morning's catch on ice" },
  { image: 'room', caption: 'Thirty seats above the water' },
  { image: 'coals', caption: 'Driftwood burned down to working heat' },
];

/** Homepage section copy (not CMS-backed). */
export const HOME = {
  /** Hero headline split for line-by-line rise; `emphasis` sets in italic cider. */
  hero: {
    lines: ['Whatever the', 'boats brought in,', 'it goes over'],
    emphasis: 'driftwood',
    tail: 'tonight.',
  },
  heroKicker: 'Coastal Basque · San Sebastián · est. 2017',
  /** Kinetic marquee words (driftwood / salt / smoke ticker). */
  marquee: ['Driftwood Fire', 'Whole Turbot', 'Aged Txuleta', 'The Morning Catch', 'Sagardo Poured From A Meter', 'Above The Harbor'],
  fire: {
    heading: 'How the fire works',
    body: 'We cook over wood the sea sent back, and pour the cider from a meter up. The board is chalk because the boats decide, not us.',
  },
  board: {
    heading: 'From the board',
    body: 'Three plates off the board. The fourth depends on the tide.',
  },
  reviewsHeading: 'What regulars say',
  room: {
    heading: 'The room above the harbor',
    body: 'Thirty seats, one fire, and the harbor going dark through the glass.',
  },
  bookBand: {
    heading: "The catch changes daily.",
    body: "Get a seat before it's gone.",
  },
};
