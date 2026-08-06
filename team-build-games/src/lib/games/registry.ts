/**
 * The arcade roster — single source of truth for the cabinets on the home page,
 * the /games/* pages, and the prev/next game switcher. Registry order is the
 * stable "cabinet order" used for navigation; the home page re-sorts by likes.
 */

export type GameStatus = "live" | "soon" | "mystery";

export interface ArcadeGame {
  slug: string;
  name: string;
  kind: string;
  players: string;
  blurb: string;
  href: string;
  status: GameStatus;
  chip: string; // full tailwind classes for the kind chip (literal so the compiler sees them)
}

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    slug: "arena",
    name: "Arena",
    kind: "Realtime PvP",
    players: "1–8 players",
    blurb:
      "Last one standing. Dash, swing, and outlive your coworkers on a 30 m battlefield — practice against bots or brawl live, peer-to-peer.",
    href: "/games/arena",
    status: "live",
    chip: "border-cyan-400/40 text-cyan-300",
  },
  {
    slug: "overrun",
    name: "Overrun",
    kind: "Co-op horde shooter",
    players: "1–8 players",
    blurb:
      "The waves don't stop. Scavenge guns, pick perks on the run, and keep your team standing — Crimsonland energy, office-friendly rounds.",
    href: "/games/overrun",
    status: "live",
    chip: "border-red-400/40 text-red-300",
  },
  {
    slug: "squid",
    name: "Squid",
    kind: "Co-op walker",
    players: "1–8 players",
    blurb:
      "One octopus, eight legs, zero coordination. Grab a leg each and walk the beast 5 m to the finish arch — mind the gap, and race the team clock.",
    href: "/games/squid",
    status: "live",
    chip: "border-violet-400/40 text-violet-300",
  },
  {
    slug: "road-madness",
    name: "Road Madness",
    kind: "Arcade driving",
    players: "1-player alpha",
    blurb:
      "Speed, steel, and very bad parking. Enter the playable demolition-derby alpha now; live rooms, Race, Carnage, and Bomb Tag are on the road ahead.",
    href: "/games/road-madness",
    status: "live",
    chip: "border-amber-300/40 text-amber-200",
  },
  {
    slug: "survival",
    name: "Survival",
    kind: "Co-op horde",
    players: "1–8 players",
    blurb:
      "Back to back against the swarm. Waves crawl in from the dark — hold the center, revive your allies, or wipe as a team.",
    href: "/games/survival",
    status: "soon",
    chip: "border-emerald-400/40 text-emerald-300",
  },
  {
    slug: "mystery",
    name: "???",
    kind: "Your call",
    players: "Whole team",
    blurb:
      "An empty cabinet with your team's name on it. Sign in, pitch the next game, and the best ideas get built into the pack.",
    href: "/suggest",
    status: "mystery",
    chip: "border-amber-300/40 text-amber-200",
  },
];

export const GAME_SLUGS = ARCADE_GAMES.map((g) => g.slug);

export function gameBySlug(slug: string): ArcadeGame | undefined {
  return ARCADE_GAMES.find((g) => g.slug === slug);
}

/** Wrap-around neighbors in cabinet (registry) order. */
export function gameNeighbors(slug: string): { prev: ArcadeGame; next: ArcadeGame } {
  const i = ARCADE_GAMES.findIndex((g) => g.slug === slug);
  const at = i === -1 ? 0 : i;
  const n = ARCADE_GAMES.length;
  return {
    prev: ARCADE_GAMES[(at + n - 1) % n]!,
    next: ARCADE_GAMES[(at + 1) % n]!,
  };
}
