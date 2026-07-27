// ============================================================
// Bus Conversions — single source of truth for site content.
// CMS-backed lists (builds, reviews, story) keep a copy here as a
// graceful fallback so pages render even before the Wix CMS
// collections are seeded. See src/lib/cms.ts.
// ============================================================

export const BUSINESS = {
  name: "Bus Conversions",
  tagline: "Retired city buses become rolling homes",
  city: "Portland, OR",
  established: "2018",
  email: "hello@busconversions.com",
  phone: "(503) 555-0114",
  routeNo: "14",
  social: { instagram: "@busconversions", secondary: "@therollsign" },
  hours: {
    shop: "Tue–Fri 9am–5pm",
    tours: "Open-build tours Sat 10am–2pm",
    closed: "Closed Sun–Mon",
  },
  priceRange: "$$$",
} as const;

export const NAV = [
  { label: "Packages", href: "/packages" },
  { label: "Builds", href: "/builds" },
  { label: "Process", href: "/process" },
  { label: "The Shop", href: "/about" },
  { label: "Questions", href: "/faq" },
] as const;

// ---------- Conversion packages (3 build levels) ----------
export interface BuildLevel {
  level: string;
  name: string;
  slug: "shell-out" | "road-ready" | "full-home";
  priceLow: number;
  priceHigh: number;
  duration: string;
  blurb: string;
  includes: string[];
  featured?: boolean;
}

export const BUILD_LEVELS: BuildLevel[] = [
  {
    level: "Level 01",
    name: "Shell-Out",
    slug: "shell-out",
    priceLow: 35000,
    priceHigh: 55000,
    duration: "6–8 weeks · you finish the inside",
    blurb: "We gut, insulate, and weatherize. You finish the inside on your own time.",
    includes: [
      "Full teardown to the steel ribs",
      "Closed-cell spray-foam insulation",
      "New welded subfloor & flooring",
      "Windows resealed, roof weatherproofed",
      "Electrical & plumbing rough-in",
    ],
  },
  {
    level: "Level 02",
    name: "Road-Ready",
    slug: "road-ready",
    priceLow: 85000,
    priceHigh: 110000,
    duration: "3–4 months · move in now, refine later",
    blurb: "Livable systems and a basic interior. Everything you need to live in it today.",
    includes: [
      "Everything in Shell-Out",
      "Working galley, sink & propane",
      "12V + shore power, water tanks",
      "Bed platform & fold-flat dinette",
      "Optional roof solar array",
    ],
    featured: true,
  },
  {
    level: "Level 03",
    name: "Full Home",
    slug: "full-home",
    priceLow: 130000,
    priceHigh: 185000,
    duration: "6–9 months · titled & move-in ready",
    blurb: "Everything titled and move-in ready, down to the glowing route sign.",
    includes: [
      "Everything in Road-Ready",
      "Custom reclaimed-fir cabinetry",
      "Full wet bath & kitchen",
      "Titled as a motorhome via Oregon DMV",
      "Destination roll sign rewired & lit",
    ],
  },
];

// ---------- Finished builds (CMS: FinishedBuild ×12) ----------
export interface FinishedBuild {
  slug: string;
  busName: string;
  originalRoute: string;
  busModelYear: string;
  lengthFeet: number;
  buildLevel: "Shell-Out" | "Road-Ready" | "Full Home";
  sleeps: number;
  priceBuilt: number;
  ownerNote: string;
  floorPlanImage?: string;
  destination: string; // roll-sign text it now glows
}

export const FINISHED_BUILDS: FinishedBuild[] = [
  { slug: "the-cascadia", busName: "The Cascadia", originalRoute: "ex-Route 4 Fessenden", busModelYear: "2006 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 2, priceBuilt: 142000, destination: "Downtown", ownerNote: "Reclaimed-fir galley, a wet bath behind the old farebox wall, and the destination sign rewired to glow above the bed." },
  { slug: "linework", busName: "Linework", originalRoute: "ex-Route 72 Killingsworth", busModelYear: "2009 New Flyer", lengthFeet: 35, buildLevel: "Road-Ready", sleeps: 4, priceBuilt: 98500, destination: "Killingsworth", ownerNote: "Bunk-over-cab for the kids, a fold-flat dinette, and off-grid solar on the roof where the AC unit used to bolt down." },
  { slug: "the-fareless", busName: "The Fareless", originalRoute: "ex-Route 20 Burnside", busModelYear: "2004 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 2, priceBuilt: 156000, destination: "Burnside", ownerNote: "A wood-stove corner, a soaking tub over the rear axle, and the original Burnside blind framed above the desk." },
  { slug: "the-stanchion", busName: "The Stanchion", originalRoute: "ex-Route 15 Belmont", busModelYear: "2007 Gillig Low Floor", lengthFeet: 40, buildLevel: "Full Home", sleeps: 3, priceBuilt: 168000, destination: "Belmont", ownerNote: "A standing-height office mid-coach, library walls along the curb side, and the Belmont blind lit over a drafting table." },
  { slug: "transfer", busName: "Transfer", originalRoute: "ex-Route 6 Martin Luther King", busModelYear: "2010 New Flyer", lengthFeet: 35, buildLevel: "Road-Ready", sleeps: 2, priceBuilt: 104000, destination: "MLK Jr Blvd", ownerNote: "Convertible everything — a dinette that's a bed, a desk that's a table, built for two who work from the road." },
  { slug: "the-last-run", busName: "The Last Run", originalRoute: "ex-Route 75 César Chávez", busModelYear: "2005 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 2, priceBuilt: 149000, destination: "Cesar Chavez", ownerNote: "A full chef's galley with a propane range and a copper hood, and a queen suite where the rear bench line used to be." },
  { slug: "deadhead", busName: "Deadhead", originalRoute: "ex-Route 33 McLoughlin", busModelYear: "2008 New Flyer", lengthFeet: 40, buildLevel: "Shell-Out", sleeps: 2, priceBuilt: 48000, destination: "McLoughlin", ownerNote: "Gutted, foamed, and weatherized — the owner is finishing the fir interior themselves over the winter." },
  { slug: "the-night-owl", busName: "The Night Owl", originalRoute: "ex-Route 57 TV Highway", busModelYear: "2003 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 4, priceBuilt: 162000, destination: "TV Highway", ownerNote: "Blackout cabin for a night-shift nurse — heavy curtains, a deep sleeping nook, and amber reading lights throughout." },
  { slug: "request-stop", busName: "Request Stop", originalRoute: "ex-Route 12 Sandy", busModelYear: "2009 New Flyer", lengthFeet: 35, buildLevel: "Road-Ready", sleeps: 3, priceBuilt: 96000, destination: "Sandy Blvd", ownerNote: "A compact two-plus-one with a fold-down kid's bunk and a gear garage where the rear door used to fold open." },
  { slug: "the-interurban", busName: "The Interurban", originalRoute: "ex-Route 19 Woodstock", busModelYear: "2006 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 2, priceBuilt: 158000, destination: "Woodstock", ownerNote: "A wide-open salon layout — no walls, just zones — anchored by a wood stove and the Woodstock blind over the bed." },
  { slug: "headway", busName: "Headway", originalRoute: "ex-Route 9 Powell", busModelYear: "2011 New Flyer", lengthFeet: 40, buildLevel: "Road-Ready", sleeps: 4, priceBuilt: 112000, destination: "Powell Blvd", ownerNote: "A family hauler with two bunks, a convertible dinette, and a roof deck where you climb out the old escape hatch." },
  { slug: "the-terminus", busName: "The Terminus", originalRoute: "ex-Route 8 Jackson Park", busModelYear: "2002 Gillig Phantom", lengthFeet: 40, buildLevel: "Full Home", sleeps: 2, priceBuilt: 174000, destination: "Jackson Park", ownerNote: "Top of the line — heated fir floors, a full wet bath in teak, and the Jackson Park blind glowing over a marble-top galley." },
];

// ---------- Interior model layouts (the "customize" picker) ----------
export interface InteriorModel {
  slug: string;
  name: string;
  sleeps: string;
  blurb: string;
}

export const INTERIOR_MODELS: InteriorModel[] = [
  { slug: "the-studio", name: "The Studio", sleeps: "Sleeps 1–2", blurb: "Work-from-the-road. An L-desk under the curb windows, a monitor wall, full bookshelf, and a murphy bed that folds up by day." },
  { slug: "the-galley", name: "The Galley", sleeps: "Sleeps 2", blurb: "Cook's kitchen. A long reclaimed-fir counter, propane range, deep sink, and a fold-out table that seats four for dinner." },
  { slug: "the-bunkhouse", name: "The Bunkhouse", sleeps: "Sleeps 4", blurb: "Family layout. A bunk-over-cab for the kids, a convertible dinette, and a wall of gear storage where the rear seats used to bolt down." },
  { slug: "the-den", name: "The Den", sleeps: "Sleeps 2", blurb: "Slow living. A wood-stove corner, a soaking nook over the rear axle, and a deep reading bench framed by the old destination blind." },
];

// ---------- Interactive floor plan (bonus) — The Cascadia ----------
export interface FloorZone {
  id: string;
  label: string;
  name: string;
  flex: number;
  desc: string;
}

export const FLOOR_ZONES: FloorZone[] = [
  { id: "galley", label: "01", name: "Galley", flex: 1.5, desc: "Reclaimed-fir counter along the curb side, a two-burner propane range, and a deep farmhouse sink. The original farebox wall is reborn as a pantry — coins out, mason jars in." },
  { id: "dinette", label: "02", name: "Dinette", flex: 1.2, desc: "A fold-flat dinette under three original transit windows. Drops to a guest bed when friends visit; the table stows the route map of the #4 Fessenden line it used to run." },
  { id: "bath", label: "03", name: "Wet Bath", flex: 0.95, desc: "A full wet bath tucked behind the old farebox wall — composting head, teak floor grate, and a skylight where a roof escape hatch used to bolt down." },
  { id: "bed", label: "04", name: "Bedroom", flex: 1.7, desc: "A queen laid across the rear bench line, storage drawers below in the old wheel-well bays. The destination roll sign is rewired to glow DOWNTOWN above the headboard." },
];

// ---------- Build process timeline ----------
export const PROCESS_STEPS = [
  { n: "01", title: "Auction Lot", body: "We find a decommissioned transit bus at a regional surplus auction — usually a Gillig or New Flyer with a million-mile chassis and a body built to carry sixty people standing up." },
  { n: "02", title: "Teardown", body: "Seats, stanchions, fareboxes, flooring — out. We strip the bus to its bare steel ribs and pressure-wash twenty years of road off the bones." },
  { n: "03", title: "Insulate & Weatherproof", body: "Closed-cell spray foam in every cavity, a new welded subfloor, and every window reseated. This is the step that makes a bus a home instead of an oven." },
  { n: "04", title: "Systems", body: "Plumbing, 12V and shore electrical, roof solar where the AC unit used to bolt down, fresh and grey water tanks slung under the frame." },
  { n: "05", title: "Interior Build", body: "Cabinetry, galley, bed platform, wet bath. Reclaimed fir and steel, built to flex with the chassis instead of cracking on the road." },
  { n: "06", title: "Title & Inspection", body: "We title every build as a motorhome through Oregon DMV's RV conversion process. Inspection, paperwork, plates — it leaves the shop road-legal and recognized as a dwelling." },
  { n: "07", title: "Keys", body: "We rewire the destination roll sign one last time, hand you the keys, and the bus stops being a bus." },
];

// ---------- FAQ ----------
export const FAQS = [
  { q: "Is a converted bus actually legal to live in and drive?", a: "Yes. We title every build as a motorhome through Oregon DMV's RV conversion process, which means it's road-legal to drive and recognized as a dwelling. We handle the inspection and paperwork as part of every full build." },
  { q: "What does a conversion cost?", a: "Three levels. Shell-out (we gut, insulate, and weatherize, you finish) runs $35,000–$55,000. Road-Ready (livable systems, basic interior) runs $85,000–$110,000. Full Home (everything titled and move-in) runs $130,000–$185,000, not counting the bus itself." },
  { q: "Do I buy the bus or do you?", a: "Either works. We source decommissioned transit buses from regional surplus auctions and can buy one to your spec, or you bring your own and we build it out. We'll tell you honestly whether a bus is worth converting before you spend a dime." },
  { q: "How long does a build take?", a: "A shell-out is six to eight weeks. A full home is six to nine months depending on the systems you choose. We post the build timeline on every project so you always know what stage your bus is in." },
  { q: "What's an open-build Saturday?", a: "Every Saturday the shop doors are open and you can walk through buses at every stage, from stripped-to-the-ribs to nearly finished. It's the best way to understand what you're buying. Book a spot so we know to expect you." },
  { q: "Where can I park and live in it?", a: "That depends on your county and zoning, and it's the part people underestimate. We can't promise a parking spot, but we walk every client through the realities of full-time bus living, RV parks, and private land before you commit." },
];

// ---------- Reviews (CMS: Review ×2) ----------
export interface Review {
  name: string;
  quote: string;
  detail: string;
}

export const REVIEWS: Review[] = [
  { name: "Dana Reyes", quote: "I toured a half-gutted bus on a Saturday, saw exactly how the wall went in, and signed two weeks later. No surprises.", detail: "Lives full-time in The Cascadia, parked on five acres outside Bend." },
  { name: "Marcus Oyelaran", quote: "They kept the old route sign over my stove. Strangers at campgrounds still ask which line it ran.", detail: "Took delivery of Linework after a seven-month build." },
];

// ---------- Story (CMS: StoryBlock ×1) ----------
export const STORY = {
  heading: "It started in a leaking Portland warehouse with one bus nobody wanted.",
  body: "Bus Conversions started with one decommissioned Gillig that the transit agency nearly scrapped. We'd both done van builds and both hit the same wall: vans run out of room and run out of road before the rust even starts. A retired transit bus is the opposite. The chassis is rated for a million miles, the floor is already flat steel, and the frame was engineered to carry sixty people standing up. We bought that first bus at a surplus auction for less than a used pickup, gutted it down to the ribs, and spent eight months learning what it takes to title a forty-foot vehicle as a legal home. We kept the destination roll sign because it felt wrong to throw away the part that told you where the bus was going. Now every build keeps its sign, and every Saturday the doors are open so you can see the work before it's yours.",
};

export function formatPrice(n: number): string {
  return "$" + n.toLocaleString("en-US");
}
