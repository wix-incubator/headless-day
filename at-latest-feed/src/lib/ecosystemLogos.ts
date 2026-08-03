export interface EcosystemLogo {
  name: string;
  src: string;
  category: string;
  /** Intrinsic width / height. Near 1 = square mark. */
  aspectRatio: number;
}

export const ECOSYSTEM_LOGOS: EcosystemLogo[] = [
  // Existing
  { name: "Etsy", src: "/logos/Etsy_icon.svg", category: "commerce", aspectRatio: 1 },
  { name: "Stripe", src: "/logos/Stripe_Logo,_revised_2016.svg", category: "payments", aspectRatio: 2.403 },
  { name: "WordPress", src: "/logos/WordPress_blue_logo.svg", category: "builder", aspectRatio: 1 },
  { name: "DeepSeek", src: "/logos/deepseek-icon.svg", category: "ai", aspectRatio: 1.354 },
  { name: "Google", src: "/logos/google-icon.svg", category: "ai", aspectRatio: 0.977 },
  { name: "Grok", src: "/logos/grok-icon.svg", category: "ai", aspectRatio: 1.041 },
  { name: "Hugging Face", src: "/logos/hugging-face-icon.svg", category: "ai", aspectRatio: 1.076 },
  { name: "Model Context Protocol", src: "/logos/model-context-protocol-icon.svg", category: "protocol", aspectRatio: 0.898 },
  { name: "PayPal", src: "/logos/paypal.svg", category: "payments", aspectRatio: 0.848 },
  { name: "Shopify", src: "/logos/shopify.svg", category: "commerce", aspectRatio: 0.877 },
  { name: "Squarespace", src: "/logos/squarespace.svg", category: "builder", aspectRatio: 1.255 },
  { name: "Webflow", src: "/logos/webflow-icon.svg", category: "builder", aspectRatio: 1.603 },
  { name: "WooCommerce", src: "/logos/woocommerce-icon.svg", category: "commerce", aspectRatio: 1.673 },
  // From Downloads/logos
  { name: "Adobe", src: "/logos/adobe-icon.svg", category: "creative", aspectRatio: 1.128 },
  { name: "Automattic", src: "/logos/automattic-icon.svg", category: "builder", aspectRatio: 1 },
  { name: "AWS", src: "/logos/aws.svg", category: "infra", aspectRatio: 1.673 },
  { name: "BigCommerce", src: "/logos/bigcommerce-icon.svg", category: "commerce", aspectRatio: 1 },
  { name: "Canva", src: "/logos/canva.svg", category: "creative", aspectRatio: 3.119 },
  { name: "Cloudflare", src: "/logos/cloudflare-icon.svg", category: "infra", aspectRatio: 2.188 },
  { name: "Contentful", src: "/logos/contentful.svg", category: "cms", aspectRatio: 0.886 },
  { name: "Figma", src: "/logos/figma.svg", category: "creative", aspectRatio: 0.667 },
  { name: "Framer", src: "/logos/framer-icon.svg", category: "builder", aspectRatio: 1 },
  { name: "GitHub", src: "/logos/github-icon.svg", category: "dev", aspectRatio: 1.024 },
  { name: "GoDaddy", src: "/logos/godaddy.svg", category: "hosting", aspectRatio: 1.127 },
  { name: "Hostinger", src: "/logos/hostinger.svg", category: "hosting", aspectRatio: 0.845 },
  { name: "HubSpot", src: "/logos/hubspot-icon.svg", category: "marketing", aspectRatio: 1.001 },
  { name: "Meta", src: "/logos/meta-icon.svg", category: "social", aspectRatio: 1.497 },
  { name: "Printful", src: "/logos/printful.svg", category: "commerce", aspectRatio: 1.338 },
  { name: "Storyblok", src: "/logos/storyblok-icon.svg", category: "cms", aspectRatio: 0.848 },
  { name: "Swell", src: "/logos/swell.svg", category: "commerce", aspectRatio: 1 },
  { name: "Tailwind CSS", src: "/logos/tailwindcss-icon.svg", category: "dev", aspectRatio: 1.662 },
  { name: "Vercel", src: "/logos/vercel.svg", category: "infra", aspectRatio: 5.032 },
  { name: "Weebly", src: "/logos/weebly.svg", category: "builder", aspectRatio: 1.299 },
  { name: "Wix", src: "/logos/wix.svg", category: "builder", aspectRatio: 2.535 },
  { name: "WP Engine", src: "/logos/wp-engine.svg", category: "hosting", aspectRatio: 1 },
];

const SQUARE_RATIO_MIN = 0.82;
const SQUARE_RATIO_MAX = 1.22;

/**
 * Mid-point sizing between "fit height" and "fit width".
 * Square marks fill the tile; wide/tall marks keep visual weight without
 * either exploding to full tile height or shrinking to full tile width alone.
 */
export function logoDisplaySize(
  aspectRatio: number,
  tileSize: number,
): { width: number; height: number } {
  const r = aspectRatio > 0 ? aspectRatio : 1;

  if (r >= SQUARE_RATIO_MIN && r <= SQUARE_RATIO_MAX) {
    return { width: tileSize, height: tileSize };
  }

  // k=0 → fit width; k=1 → fit height; 0.42 leans slightly toward width control
  const k = 0.42;
  let width = tileSize * Math.pow(r, k);
  let height = tileSize * Math.pow(r, k - 1);

  const maxLong = tileSize * 1.4;
  const minShort = tileSize * 0.5;

  if (r >= 1) {
    if (width > maxLong) {
      const scale = maxLong / width;
      width *= scale;
      height *= scale;
    }
    if (height < minShort && minShort * r <= maxLong * 1.05) {
      height = minShort;
      width = Math.min(maxLong, height * r);
      height = width / r;
    }
  } else {
    if (height > maxLong) {
      const scale = maxLong / height;
      width *= scale;
      height *= scale;
    }
    if (width < minShort && minShort / r <= maxLong * 1.05) {
      width = minShort;
      height = Math.min(maxLong, width / r);
      width = height * r;
    }
  }

  return { width, height };
}
