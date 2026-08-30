// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import wix from '@wix/astro';
import tailwindcss from '@tailwindcss/vite';

import cloudProviderFetchAdapter from '@wix/cloud-provider-fetch-adapter';
const isBuild = process.env.NODE_ENV == "production";

// https://astro.build/config
export default defineConfig({
  site: 'https://www.thesaltmeridian.com',
  integrations: [react(), wix()],

  vite: {
    plugins: [tailwindcss()],
  },

  image: {
    // Allow the curated remote imagery to be optimized by Astro.
    domains: ['images.unsplash.com', 'static.wixstatic.com'],
  },

  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),
  output: 'server',
});