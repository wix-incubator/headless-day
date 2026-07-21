import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Wix hosts this as a static Site — export a fully static build to `out/`.
  // Live Wix Events data is fetched at build time and baked into the HTML
  // (re-run `wix release` to refresh); booking + member auth stay client-side.
  output: "export",
  // Wix static hosting currently serves exported secondary pages as flat
  // `/foo.html` files. Bare `/foo` routes fall through to Wix runtime and can
  // return 504, so internal links use the flat exported files.
  trailingSlash: false,
  images: { unoptimized: true },
};

export default nextConfig;
