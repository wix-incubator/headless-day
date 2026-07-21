export interface Coin { id: string; lat: number; lng: number }

/** Angular distance (deg) within which a coin may be collected — tighter than
 * `LANDING_RANGE_DEG` (14) so a hidden coin still takes a deliberate close pass. */
export const COIN_COLLECT_RANGE_DEG = 7;

// 8 hidden coins in open-ocean gaps along the natural flight routes between the 12
// destinations (mid-latitude, reachable — NOT parked at the poles), each well clear
// of every destination's landing range (verified in coins.test.ts).
export const COINS: Coin[] = [
  { id: 'mid-pacific', lat: 5, lng: -148 },
  { id: 'east-pacific', lat: 18, lng: -128 },
  { id: 'south-pacific', lat: -40, lng: -155 },
  { id: 'indian', lat: -18, lng: 95 },
  { id: 'north-atlantic', lat: 28, lng: -45 },
  { id: 'south-atlantic', lat: -25, lng: -18 },
  { id: 'equatorial-atlantic', lat: 2, lng: -30 },
  { id: 'north-pacific', lat: 40, lng: -168 },
];
