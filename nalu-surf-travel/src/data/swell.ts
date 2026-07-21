/** Storm-swell trains (thesis §2C): curated, plausible storm sources feeding the
 * destinations they realistically swell toward. A stylized teaching visual, not live
 * marine data — but kept honest to each region's actual dominant swell origin. */
export interface SwellSource {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Destination ids (see `data/destinations.ts`) this source's swell reaches. */
  feeds: string[];
}

export const SWELL_SOURCES: SwellSource[] = [
  { id: 'aleutian', name: 'Aleutian Low', lat: 48, lng: -175, feeds: ['oahu'] },
  { id: 'natlantic', name: 'North Atlantic Low', lat: 55, lng: -28, feeds: ['ericeira', 'hossegor', 'taghazout'] },
  { id: 'sindian', name: 'Southern Ocean (Indian)', lat: -50, lng: 70, feeds: ['jbay', 'bali'] },
  { id: 'spacific', name: 'Southern Ocean (Pacific)', lat: -52, lng: -130, feeds: ['teahupoo', 'cloudbreak', 'raglan', 'snapper', 'puerto', 'nosara'] },
];
