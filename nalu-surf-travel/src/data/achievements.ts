import { DESTINATIONS } from './destinations';
import { COINS } from './coins';

/** Everything the secret achievement rules read. Persisted fields are owned by
 * `useAchievements` (src/game/achievements.ts); this module only evaluates them —
 * no store/UI access, so every rule stays a pure, unit-testable function. */
export interface AchievementState {
  unlocked: string[];
  coins: string[];
  visitedSpots: string[];
  lngTravelledDeg: number;
  northPoleReached: boolean;
  southPoleReached: boolean;
  booked: boolean;
  idleMs: number;
}

export interface Achievement {
  id: string;
  title: string;
  /** Short past-tense "how you earned it" line, shown only after unlock. */
  earnedHint: string;
  emoji: string;
  isUnlocked: (state: AchievementState) => boolean;
}

const JUST_CHILLIN_IDLE_MS = 30_000;
const AROUND_THE_WORLD_DEG = 360;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-landing',
    title: 'First Landing',
    earnedHint: 'Touched down at your first break',
    emoji: '🛬',
    isUnlocked: (s) => s.visitedSpots.length >= 1,
  },
  {
    id: 'globetrotter',
    title: 'Globetrotter',
    earnedHint: 'Landed at every destination on the map',
    emoji: '🌍',
    isUnlocked: (s) => DESTINATIONS.every((d) => s.visitedSpots.includes(d.id)),
  },
  {
    id: 'around-the-world',
    title: 'Around the World',
    earnedHint: 'Flew a full lap of the globe',
    emoji: '🧭',
    isUnlocked: (s) => s.lngTravelledDeg >= AROUND_THE_WORLD_DEG,
  },
  {
    id: 'first-coin',
    title: 'First Coin',
    earnedHint: 'Found a hidden coin out on the ocean',
    emoji: '🪙',
    isUnlocked: (s) => s.coins.length >= 1,
  },
  {
    id: 'treasure-hunter',
    title: 'Treasure Hunter',
    earnedHint: 'Collected every hidden coin',
    emoji: '💰',
    isUnlocked: (s) => s.coins.length === COINS.length,
  },
  {
    id: 'top-of-the-world',
    title: 'Top of the World',
    earnedHint: 'Reached the North Pole',
    emoji: '🏔️',
    isUnlocked: (s) => s.northPoleReached,
  },
  {
    id: 'bottom-of-the-world',
    title: 'Bottom of the World',
    earnedHint: 'Reached the South Pole',
    emoji: '🐧',
    isUnlocked: (s) => s.southPoleReached,
  },
  {
    id: 'booked-it',
    title: 'Booked It',
    earnedHint: 'Booked your first trip',
    emoji: '🤙',
    isUnlocked: (s) => s.booked,
  },
  {
    id: 'just-chillin',
    title: "Just Chillin'",
    earnedHint: 'Hovered in place and took in the view',
    emoji: '😎',
    isUnlocked: (s) => s.idleMs >= JUST_CHILLIN_IDLE_MS,
  },
];

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
