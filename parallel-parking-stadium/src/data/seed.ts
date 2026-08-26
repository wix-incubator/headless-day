/* ============================================================
   Seed content — the source of truth for the CMS.
   These rows are imported into Wix CMS collections (see /data/cms/*.csv
   or `npm run seed`) AND act as the offline fallback in src/lib/content.ts
   so the site renders before the collections exist.
   ============================================================ */

export type Tournament = {
  id: string;
  title: string;
  date: string; // display, e.g. "Fri 17 Jul"
  isoDate: string; // ISO 8601 for JSON-LD + countdown
  time: string;
  format: string;
  bracket: string;
  seats: number;
  status: 'On sale' | 'Almost sold out' | 'Sold out';
  matchup: string;
};

export type Competitor = {
  rank: number;
  name: string;
  margin: number; // best clearance in cm (smaller is better)
  clean: number; // clean parks
  touches: number;
  pts: number;
  note: string;
};

export type LegendaryPark = {
  no: string;
  driver: string;
  car: string;
  space: string;
  clearance: number; // cm
  year: number;
  story: string;
};

export type Testimonial = {
  name: string;
  quote: string;
  detail: string;
};

export type Tier = {
  name: string;
  price: number;
  desc: string;
};

// 8 tournaments (spec: "8× Tournament"). The next one drives the countdown.
export const tournaments: Tournament[] = [
  {
    id: 'copa',
    title: 'Copa Microcentro',
    date: 'Fri 17 Jul',
    isoDate: '2026-07-17T20:00:00-03:00',
    time: '20:00',
    format: 'Single-elimination',
    bracket: 'Bracket of 16',
    seats: 212,
    status: 'On sale',
    matchup:
      'Defending champ Lucía Vega draws the rookie who cleared by 7cm in qualifiers.',
  },
  {
    id: 'derby',
    title: 'Derby del Retroceso',
    date: 'Sat 1 Aug',
    isoDate: '2026-08-01T21:00:00-03:00',
    time: '21:00',
    format: 'Double-elimination',
    bracket: 'Bracket of 32',
    seats: 38,
    status: 'Almost sold out',
    matchup:
      'The grudge rematch nobody touched a cone in last year. Both reversers are back.',
  },
  {
    id: 'cordon',
    title: 'Clásico del Cordón',
    date: 'Fri 14 Aug',
    isoDate: '2026-08-14T20:00:00-03:00',
    time: '20:00',
    format: 'Single-elimination',
    bracket: 'Bracket of 16',
    seats: 0,
    status: 'Sold out',
    matchup:
      'The kerb-line classic. Sixteen drivers, one painted box, zero tolerance for a wheel on the line.',
  },
  {
    id: 'milimetro',
    title: 'Gran Premio del Milímetro',
    date: 'Sat 29 Aug',
    isoDate: '2026-08-29T21:00:00-03:00',
    time: '21:00',
    format: 'Single-elimination',
    bracket: 'Bracket of 16',
    seats: 304,
    status: 'On sale',
    matchup:
      'The marquee night. The tightest sanctioned spaces of the season, down to single-digit centimeters.',
  },
  {
    id: 'nocturna',
    title: 'Copa Nocturna',
    date: 'Fri 11 Sep',
    isoDate: '2026-09-11T20:00:00-03:00',
    time: '20:00',
    format: 'Double-elimination',
    bracket: 'Bracket of 32',
    seats: 120,
    status: 'On sale',
    matchup:
      'Headlights only. The deck lights cut to a single stadium wash and the parking gets quiet.',
  },
  {
    id: 'final',
    title: 'Final de Temporada',
    date: 'Sat 26 Sep',
    isoDate: '2026-09-26T21:00:00-03:00',
    time: '21:00',
    format: 'Single-elimination',
    bracket: 'Bracket of 8',
    seats: 18,
    status: 'Almost sold out',
    matchup:
      'Eight reversers left. One title. The bracket that decides who tops the board into winter.',
  },
  {
    id: 'apertura',
    title: 'Apertura Primavera',
    date: 'Fri 9 Oct',
    isoDate: '2026-10-09T20:00:00-03:00',
    time: '20:00',
    format: 'Single-elimination',
    bracket: 'Bracket of 16',
    seats: 260,
    status: 'On sale',
    matchup:
      'The spring opener. New deck lights, new seeds, the same painted box that forgives nothing.',
  },
  {
    id: 'maestros',
    title: 'Copa de los Maestros',
    date: 'Sat 24 Oct',
    isoDate: '2026-10-24T21:00:00-03:00',
    time: '21:00',
    format: 'Double-elimination',
    bracket: 'Bracket of 32',
    seats: 74,
    status: 'Almost sold out',
    matchup:
      'Veterans only. Every driver in the bracket has held a sanctioned record at least once.',
  },
];

export const competitors: Competitor[] = [
  { rank: 1, name: 'Lucía Vega', margin: 6, clean: 24, touches: 1, pts: 1840, note: 'Defending champion' },
  { rank: 2, name: 'Tomás Iriarte', margin: 7, clean: 9, touches: 0, pts: 1610, note: '▲ Qualifier sensation' },
  { rank: 3, name: 'Paula Bracco', margin: 8, clean: 19, touches: 2, pts: 1555, note: 'Two finals this season' },
  { rank: 4, name: 'Néstor Ovalle', margin: 9, clean: 21, touches: 3, pts: 1490, note: 'Most clean parks, 2025' },
  { rank: 5, name: 'Camila Furió', margin: 10, clean: 17, touches: 1, pts: 1422, note: 'Never forfeited' },
  { rank: 6, name: 'Rodrigo Sanz', margin: 11, clean: 15, touches: 4, pts: 1360, note: 'The crowd favourite' },
  { rank: 7, name: 'Inés Caraballo', margin: 12, clean: 14, touches: 2, pts: 1298, note: 'Fastest clock, R1' },
  { rank: 8, name: 'Marco Pelliza', margin: 13, clean: 12, touches: 5, pts: 1240, note: 'Big van specialist' },
  { rank: 9, name: 'Sofía Rendón', margin: 14, clean: 11, touches: 3, pts: 1185, note: 'Rookie of the year' },
  { rank: 10, name: 'Julián Vera', margin: 15, clean: 10, touches: 4, pts: 1120, note: 'Up four places' },
];

export const legendaryParks: LegendaryPark[] = [
  {
    no: '001',
    driver: 'Hernán “El Milímetro” Sosa',
    car: 'Renault Trafic, 4.99m',
    space: '5.10m',
    clearance: 11,
    year: 2023,
    story:
      'The park that built this stadium. A van slid into a gap eleven centimeters longer than itself, one continuous motion, no correction, both bumpers untouched. The crowd went silent before it roared. We measured it three times because nobody believed the first two. People drive in from Rosario just to stand where the van stood.',
  },
  {
    no: '002',
    driver: 'Lucía Vega',
    car: 'Peugeot 208, 3.96m',
    space: '4.10m',
    clearance: 14,
    year: 2024,
    story:
      'The title-clincher, measured twice under protest. The protest was withdrawn.',
  },
  {
    no: '003',
    driver: '“La Doble” Acuña',
    car: 'Fiat Ducato, 5.41m',
    space: '5.58m',
    clearance: 17,
    year: 2022,
    story:
      'The first sanctioned record. A panel van where a hatchback would have flinched.',
  },
  {
    no: '004',
    driver: 'Tomás Iriarte',
    car: 'VW Gol, 3.80m',
    space: '3.97m',
    clearance: 17,
    year: 2025,
    story:
      'The rookie qualifier nobody saw coming, into a space barely wider than the doors.',
  },
  {
    no: '005',
    driver: 'Beatriz Lomas',
    car: 'Ford Transit, 5.59m',
    space: '5.79m',
    clearance: 20,
    year: 2023,
    story: 'Reverse in the rain, no wipers, no second look over the shoulder.',
  },
  {
    no: '006',
    driver: '“El Reloj” Damiani',
    car: 'Renault Kangoo, 4.28m',
    space: '4.46m',
    clearance: 18,
    year: 2024,
    story:
      'Eight seconds flat — the fastest clean park ever entered into the record.',
  },
];

export const testimonials: Testimonial[] = [
  {
    name: 'Mariana Pas',
    quote:
      'I came to laugh. By the semifinal I was on my feet screaming at a hatchback to straighten up.',
    detail: 'Season-pass holder, front row, section B.',
  },
  {
    name: 'Diego Funes',
    quote:
      'My father parked trucks for thirty years. I brought him. He cried at the 11cm replay.',
    detail: 'Brought eleven relatives to the August derby.',
  },
  {
    name: 'Valentina Ruiz',
    quote:
      'I don’t even drive. I have a season pass and I have opinions about everyone’s mirror work.',
    detail: 'Section A regular, never missed a final.',
  },
];

export const tiers: Tier[] = [
  { name: 'General Deck', price: 18, desc: 'Standing, behind the box line. The roar, full volume.' },
  { name: 'Grandstand', price: 34, desc: 'Seated, square to the slot. The full tale of the tape.' },
  { name: 'The Curb', price: 52, desc: 'Front row, meters from the bumper. Hear the judges call clearance.' },
  { name: 'Judges’ Table', price: 88, desc: 'Beside the officials. The measurement in your hands.' },
];

export const faqs: { q: string; a: string }[] = [
  {
    q: 'Is this a real sport or a bit?',
    a: 'It is real. Drivers compete in elimination brackets, judges measure the clearance to the centimeter, and the leaderboard is live. The fact that it is parking does not make the margins any less brutal.',
  },
  {
    q: 'How is a round scored?',
    a: 'Three things: the gap the driver clears by, the number of touches or corrections, and the clock. Smallest clean clearance wins. A touch on a cone or bumper is a penalty. A second attempt is a forfeit.',
  },
  {
    q: 'Can I compete?',
    a: 'Open qualifiers run before every tournament. Bring a license and a car you trust. The bracket is seeded by your qualifier margin, so park tight.',
  },
  {
    q: 'What’s the 11cm park?',
    a: 'In 2023 Hernán Sosa slid a 4.99m van into a 5.10m space in one motion, no correction. Eleven centimeters of clearance. It tops the hall of fame and the replay still opens every final.',
  },
  {
    q: 'Are the tournaments family-friendly?',
    a: 'Yes. It is loud and it is tense, but it is a car parking in a marked box. Bring the kids. The only thing they will learn is patience and how to judge a gap.',
  },
  {
    q: 'What happens if a tournament sells out?',
    a: 'Most do. Once a date shows sold out the only way in is a released seat, which we post to the schedule. Buy early. The last bracket of sixteen cleared the seat list in nine minutes.',
  },
];

// Business facts (footer, JSON-LD, Visit page).
export const business = {
  name: 'Parallel Parking Stadium',
  city: 'Buenos Aires',
  country: 'AR',
  neighborhood: 'Microcentro, Buenos Aires',
  boxOffice: 'Wed–Sat 14:00–22:00',
  doors: 'Fri–Sat from 19:00',
  tournamentNights: 'Tournament nights Fri–Sat from 20:00',
  priceRange: '$$',
  established: 2022,
  socials: ['@parkingstadium', '@el11cm'],
};
