export interface DestinationPhoto { src: string; alt: string; credit: string }

/**
 * One licensed, self-hosted photo per destination (files under public/images/,
 * sourced from Pexels — free for commercial use). Full attribution in
 * docs/photo-credits.md.
 */
export const DESTINATION_PHOTOS: Record<string, DestinationPhoto> = {
  oahu: {
    src: '/images/dest-oahu.jpg',
    alt: "Surfers sharing a turquoise wave off Oahu, Hawaii",
    credit: 'Photo by Jess Loiterton / Pexels',
  },
  bali: {
    src: '/images/dest-bali.jpg',
    alt: 'Waves breaking below the cliffs of Uluwatu, Bali at sunset',
    credit: 'Photo by Saksham Vikram / Pexels',
  },
  ericeira: {
    src: '/images/dest-ericeira.jpg',
    alt: 'Surfers carrying boards through a cobblestone street in Ericeira, Portugal',
    credit: 'Photo by Jose Cruz / Pexels',
  },
  taghazout: {
    src: '/images/dest-taghazout.jpg',
    alt: 'Surfers walking the beach at sunset in Taghazout, Morocco',
    credit: 'Photo by Liliane Buntinx / Pexels',
  },
  nosara: {
    src: '/images/dest-nosara.jpg',
    alt: 'Surfer carrying a board along a quiet tropical beach near Nosara, Costa Rica',
    credit: 'Photo by Tomi Saputra / Pexels',
  },
  jbay: {
    src: '/images/dest-jbay.jpg',
    alt: 'Surfer riding a wave at Jeffreys Bay, South Africa',
    credit: 'Photo by Lara van der Walt / Pexels',
  },
  teahupoo: {
    src: '/images/dest-teahupoo.jpg',
    alt: 'A surfer silhouetted at the base of a massive, heavy barreling wave',
    credit: 'Photo by Daniel Torobekov / Pexels',
  },
  snapper: {
    src: '/images/dest-snapper.jpg',
    alt: 'Surfers catching waves near a rocky point with the Gold Coast skyline behind them',
    credit: 'Photo by Marcus Ireland / Pexels',
  },
  puerto: {
    src: '/images/dest-puerto.jpg',
    alt: 'Rocky cove and beach at Puerto Escondido, Oaxaca, Mexico',
    credit: 'Photo by Lucie Burlet / Pexels',
  },
  cloudbreak: {
    src: '/images/dest-cloudbreak.jpg',
    alt: 'A powerful wave breaking off the coast of Fiji',
    credit: 'Photo by Bradley Hook / Pexels',
  },
  raglan: {
    src: '/images/dest-raglan.jpg',
    alt: 'A surfer riding a wave along the rocky, hill-backed coastline of Raglan, New Zealand',
    credit: 'Photo by Tom Macret / Pexels',
  },
  hossegor: {
    src: '/images/dest-hossegor.jpg',
    alt: 'A surfer walking along the sandy beach of Hossegor, France, with waves rolling in',
    credit: 'Photo by Mike Balzer / Pexels',
  },
};
