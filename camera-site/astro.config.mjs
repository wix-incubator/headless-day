import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import wix from '@wix/astro';
import cloudProviderFetchAdapter from '@wix/cloud-provider-fetch-adapter';
const isBuild = process.env.NODE_ENV == "production";

export default defineConfig({
  output: 'static',
  integrations: [react(), wix()],
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),

  image: {
    domains: ['static.wixstatic.com'],
  },
});