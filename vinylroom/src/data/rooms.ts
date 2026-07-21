export type Genre =
  | "Jazz"
  | "Soul"
  | "Hip-Hop"
  | "Ambient"
  | "Indie"
  | "City Pop"
  | "Electronic"
  | "Classic Rock";

export type Sleeve = {
  /** two-stop warm gradient for the CSS album cover */
  from: string;
  to: string;
  /** accent used for label dot + motif */
  accent: string;
  /** abstract motif drawn on the sleeve */
  motif: "circle" | "bars" | "horizon" | "split" | "grid" | "arc";
};

export type Room = {
  id: string;
  title: string;
  genre: Genre;
  mood: string;
  host: string;
  hostInitials: string;
  city: string;
  venue: string;
  day: string;
  /** Full calendar label for Wix-backed events, for example "Wed, Jul 22". */
  dateLabel?: string;
  /** ISO start moment used by calendar exports and other exact-date flows. */
  startDate?: string;
  time: string;
  price: string;
  capacity: number;
  seatsLeft: number;
  nowSpinning?: string;
  featured?: boolean;
  records: string[];
  equipment: string[];
  sleeve: Sleeve;
  blurb: string;

  /** Populated when the room is backed by a live Wix Events entity. */
  wixEventId?: string;
  wixEventSlug?: string;
  wixTicketDefinitionId?: string;
  /** "wix" once real data is flowing; "mock" for the built-in demo set. */
  source?: "wix" | "mock";
};

export const GENRES: (Genre | "All")[] = [
  "All",
  "Jazz",
  "Soul",
  "Hip-Hop",
  "Ambient",
  "Indie",
  "City Pop",
  "Electronic",
  "Classic Rock",
];

export const rooms: Room[] = [
  {
    id: "blue-note-after-dark",
    title: "Blue Note After Dark",
    genre: "Jazz",
    mood: "Warm · Slow · Intimate",
    host: "Mara K.",
    hostInitials: "MK",
    city: "Warsaw",
    venue: "A candlelit loft in Praga",
    day: "Fri",
    time: "21:00",
    price: "$18",
    capacity: 8,
    seatsLeft: 3,
    nowSpinning: "Miles Davis — Kind of Blue",
    featured: true,
    records: [
      "Miles Davis — Kind of Blue",
      "John Coltrane — Blue Train",
      "Bill Evans Trio — Waltz for Debby",
      "Chet Baker — Sings",
    ],
    equipment: ["Technics SL-1200", "Marantz PM6007", "Klipsch Heresy IV"],
    sleeve: { from: "#1b3a5c", to: "#0a1420", accent: "#7fa8e8", motif: "circle" },
    blurb: "Four seminal records, one dim room, and the kind of silence a needle earns.",
  },
  {
    id: "in-rainbows",
    title: "Radiohead: In Rainbows, Full Album",
    genre: "Indie",
    mood: "Cerebral · Nocturnal · Deep",
    host: "Julian V.",
    hostInitials: "JV",
    city: "Berlin",
    venue: "A soundproofed studio in Kreuzberg",
    day: "Sat",
    time: "20:30",
    price: "$18",
    capacity: 12,
    seatsLeft: 5,
    nowSpinning: "Radiohead — In Rainbows",
    featured: true,
    records: [
      "Radiohead — In Rainbows",
      "Thom Yorke — The Eraser",
      "Radiohead — Amnesiac (side B)",
    ],
    equipment: ["Rega Planar 3", "Cambridge Audio CXA81", "KEF LS50 Meta"],
    sleeve: { from: "#6a2d8f", to: "#1a0a26", accent: "#c58bff", motif: "bars" },
    blurb: "The whole album, side to side, no skips. We talk after the last note fades.",
  },
  {
    id: "90s-hip-hop-on-wax",
    title: "90s Hip-Hop on Wax",
    genre: "Hip-Hop",
    mood: "Golden Era · Heavy · Loose",
    host: "DeShawn R.",
    hostInitials: "DR",
    city: "London",
    venue: "A basement bar in Peckham",
    day: "Thu",
    time: "22:00",
    price: "$15",
    capacity: 20,
    seatsLeft: 8,
    nowSpinning: "Nas — Illmatic",
    featured: true,
    records: [
      "Nas — Illmatic",
      "A Tribe Called Quest — Midnight Marauders",
      "Wu-Tang Clan — Enter the Wu-Tang",
      "J Dilla — Donuts",
    ],
    equipment: ["Pair of Technics SL-1210", "Rane MP2015 mixer", "Funktion-One F81"],
    sleeve: { from: "#c25a1e", to: "#2a1006", accent: "#f0a850", motif: "grid" },
    blurb: "Original pressings, crackle and all. Bring your head-nod.",
  },
  {
    id: "ambient-sunday",
    title: "Ambient Sunday Session",
    genre: "Ambient",
    mood: "Weightless · Quiet · Restorative",
    host: "Ines M.",
    hostInitials: "IM",
    city: "Lisbon",
    venue: "A plant-filled atelier in Alfama",
    day: "Sun",
    time: "17:00",
    price: "$12",
    capacity: 10,
    seatsLeft: 2,
    nowSpinning: "Brian Eno — Music for Airports",
    featured: true,
    records: [
      "Brian Eno — Ambient 1: Music for Airports",
      "Hiroshi Yoshimura — Green",
      "Gigi Masin — Wind",
    ],
    equipment: ["Pro-Ject Debut Carbon", "Naim Nait 5si", "Harbeth P3ESR"],
    sleeve: { from: "#2f6b52", to: "#0a1712", accent: "#8fd6a8", motif: "horizon" },
    blurb: "Lie down. Say nothing. Let a Sunday afternoon dissolve.",
  },
  {
    id: "japanese-city-pop",
    title: "Japanese City Pop Evening",
    genre: "City Pop",
    mood: "Neon · Breezy · Bittersweet",
    host: "Aya T.",
    hostInitials: "AT",
    city: "Amsterdam",
    venue: "A rooftop apartment on the canals",
    day: "Fri",
    time: "20:00",
    price: "$20",
    capacity: 14,
    seatsLeft: 6,
    nowSpinning: "Mariya Takeuchi — Variety",
    featured: true,
    records: [
      "Mariya Takeuchi — Variety",
      "Tatsuro Yamashita — For You",
      "Anri — Timely!!",
      "Taeko Ohnuki — Sunshower",
    ],
    equipment: ["Technics SL-1500C", "Yamaha A-S801", "JBL 4309"],
    sleeve: { from: "#d4507e", to: "#2a0a1c", accent: "#ff9ec4", motif: "arc" },
    blurb: "Sunset chords and city lights, pressed in Tokyo, spun over the water.",
  },
  {
    id: "wine-soul-motown",
    title: "Wine, Soul & Motown",
    genre: "Soul",
    mood: "Warm · Romantic · Alive",
    host: "Grace O.",
    hostInitials: "GO",
    city: "Paris",
    venue: "A wine cellar in the Marais",
    day: "Sat",
    time: "19:30",
    price: "$28",
    capacity: 16,
    seatsLeft: 4,
    nowSpinning: "Marvin Gaye — What's Going On",
    featured: true,
    records: [
      "Marvin Gaye — What's Going On",
      "Aretha Franklin — I Never Loved a Man",
      "The Temptations — Cloud Nine",
      "Curtis Mayfield — Curtis",
    ],
    equipment: ["Linn Sondek LP12", "McIntosh MA252", "Tannoy Cheviot"],
    sleeve: { from: "#7a1f2b", to: "#22070a", accent: "#e8a04a", motif: "split" },
    blurb: "A glass in hand, the low lights, and every reason to stay a little longer.",
  },
  {
    id: "kraftwerk-machines",
    title: "Man·Machine: Kraftwerk & Kin",
    genre: "Electronic",
    mood: "Precise · Hypnotic · Retro-future",
    host: "Lena F.",
    hostInitials: "LF",
    city: "Düsseldorf",
    venue: "A concrete gallery near the river",
    day: "Wed",
    time: "21:30",
    price: "$16",
    capacity: 18,
    seatsLeft: 9,
    nowSpinning: "Kraftwerk — Trans-Europe Express",
    records: [
      "Kraftwerk — Trans-Europe Express",
      "Kraftwerk — The Man-Machine",
      "Neu! — Neu! 75",
    ],
    equipment: ["Technics SL-1210 GR", "Musical Fidelity M6si", "ATC SCM19"],
    sleeve: { from: "#c22b3a", to: "#1a1a1c", accent: "#ff6b78", motif: "bars" },
    blurb: "Motorik pulses on original German pressings. Precision as a mood.",
  },
  {
    id: "fleetwood-canyon",
    title: "Laurel Canyon: Rumours & Friends",
    genre: "Classic Rock",
    mood: "Golden · Sun-worn · Honest",
    host: "Theo B.",
    hostInitials: "TB",
    city: "Kraków",
    venue: "A tenement flat off the square",
    day: "Sun",
    time: "18:30",
    price: "$15",
    capacity: 12,
    seatsLeft: 7,
    nowSpinning: "Fleetwood Mac — Rumours",
    records: [
      "Fleetwood Mac — Rumours",
      "Joni Mitchell — Blue",
      "Neil Young — Harvest",
    ],
    equipment: ["Thorens TD 1601", "Leben CS300", "Spendor Classic 3/1"],
    sleeve: { from: "#c98a2e", to: "#2a1607", accent: "#f5c96b", motif: "horizon" },
    blurb: "Warm 70s pressings and the songs that were written about each other.",
  },
];

export const featuredEvent = rooms[0];

export const stats = [
  { value: "2,400+", label: "records played" },
  { value: "180", label: "intimate rooms hosted" },
  { value: "12", label: "cities" },
  { value: "4.9", label: "average guest rating" },
];

export const testimonials = [
  {
    quote:
      "I've been to a hundred gigs. This is the first time in years I actually heard the album.",
    name: "Sofia R.",
    role: "Guest · Lisbon",
    initials: "SR",
    accent: "#8fd6a8",
  },
  {
    quote:
      "Eight strangers, one pressing of Kind of Blue, and a conversation that ran until 1am.",
    name: "Mara K.",
    role: "Host · Warsaw",
    initials: "MK",
    accent: "#7fa8e8",
  },
  {
    quote:
      "No phones out, no talking over the music. My collection finally has somewhere to live.",
    name: "DeShawn R.",
    role: "Host · London",
    initials: "DR",
    accent: "#f0a850",
  },
];

export const timeline = [
  { time: "19:30", label: "Doors open", note: "A drink, low light, first hellos" },
  { time: "20:00", label: "Side A", note: "Kind of Blue, start to finish" },
  { time: "20:30", label: "Short discussion", note: "What did that do to you?" },
  { time: "20:45", label: "Side B", note: "We turn the record over" },
  { time: "21:15", label: "Bonus records & drinks", note: "Requests from the crate" },
];

export const roomRules = [
  "Phones on silent, screens away once the needle drops.",
  "Talk between sides, listen during them.",
  "Arrive within 15 minutes of doors — late entry breaks the spell.",
  "Bring one record you'd love the room to hear.",
];
