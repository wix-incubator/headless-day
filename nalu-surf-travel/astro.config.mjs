// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";

import react from "@astrojs/react";
import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";
const isBuild = process.env.NODE_ENV == "production";

// https://astro.build/config
export default defineConfig({
  // Canonical public origin. Absolute URLs (og:image etc.) must derive from this,
  // not Astro.url: the Wix SSR runtime reports request URLs as http:// even when
  // the site is served over https, which breaks strict-https social-card crawlers.
  site: "https://birdie-bre-2b166b6a-giladi47.wix-site-host.com",
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),

  image: {
    domains: ["static.wixstatic.com"],
  },

  output: "server",
});