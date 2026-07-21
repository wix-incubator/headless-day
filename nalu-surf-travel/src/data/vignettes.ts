/** Per-destination vignette placement data (art-direction §5d). Water bearing is a
 * human-readable label only — the offsets are the numbers that matter. */
export interface VignetteInfo {
  waterBearing: string;
  waveOffset: { dLat: number; dLng: number };
  landmarkOffset: { dLat: number; dLng: number };
  touchdown: { lat: number; lng: number };
}

export const VIGNETTES: Record<string, VignetteInfo> = {
  oahu: {
    waterBearing: 'N',
    waveOffset: { dLat: 3.5, dLng: 0 },
    landmarkOffset: { dLat: -3, dLng: -1.5 },
    touchdown: { lat: 20.2, lng: -157.4 },
  },
  bali: {
    waterBearing: 'SW',
    waveOffset: { dLat: -2.5, dLng: -2.5 },
    landmarkOffset: { dLat: 2.5, dLng: 2 },
    touchdown: { lat: -7.5, lng: 116.2 },
  },
  ericeira: {
    waterBearing: 'W',
    waveOffset: { dLat: 0, dLng: -3.5 },
    landmarkOffset: { dLat: 1, dLng: 3 },
    touchdown: { lat: 38.2, lng: -8.2 },
  },
  taghazout: {
    waterBearing: 'W',
    waveOffset: { dLat: 0, dLng: -3.5 },
    landmarkOffset: { dLat: 1, dLng: 3 },
    touchdown: { lat: 29.8, lng: -8.5 },
  },
  nosara: {
    waterBearing: 'SW',
    waveOffset: { dLat: -2.5, dLng: -2.5 },
    landmarkOffset: { dLat: 2, dLng: 2.5 },
    touchdown: { lat: 10.8, lng: -84.6 },
  },
  jbay: {
    waterBearing: 'SE',
    waveOffset: { dLat: -3, dLng: 2 },
    landmarkOffset: { dLat: 2.5, dLng: -2 },
    touchdown: { lat: -33.2, lng: 24.1 },
  },
  teahupoo: {
    waterBearing: 'S',
    waveOffset: { dLat: -3, dLng: 0 },
    landmarkOffset: { dLat: 2.5, dLng: 1.5 },
    touchdown: { lat: -17.6, lng: -149.4 },
  },
  snapper: {
    waterBearing: 'E',
    waveOffset: { dLat: 0, dLng: 3 },
    landmarkOffset: { dLat: 1.5, dLng: -2.5 },
    touchdown: { lat: -28.0, lng: 153.3 },
  },
  puerto: {
    waterBearing: 'S',
    waveOffset: { dLat: -3, dLng: 0 },
    landmarkOffset: { dLat: 2.5, dLng: 1.5 },
    touchdown: { lat: 16.1, lng: -97.1 },
  },
  cloudbreak: {
    waterBearing: 'S',
    waveOffset: { dLat: -3, dLng: 0 },
    landmarkOffset: { dLat: 2.5, dLng: 1.5 },
    touchdown: { lat: -17.9, lng: 177.3 },
  },
  raglan: {
    waterBearing: 'W',
    waveOffset: { dLat: 0, dLng: -3 },
    landmarkOffset: { dLat: 1.5, dLng: 2.5 },
    touchdown: { lat: -37.9, lng: 175.0 },
  },
  hossegor: {
    waterBearing: 'W',
    waveOffset: { dLat: 0, dLng: -3 },
    landmarkOffset: { dLat: 1, dLng: 2.5 },
    touchdown: { lat: 43.7, lng: -1.3 },
  },
};
