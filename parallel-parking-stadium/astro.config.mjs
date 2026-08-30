// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import wix from '@wix/astro';
import wixCloudProviderFetchAdapter from '@wix/cloud-provider-fetch-adapter';

// @wix/astro wires auth/session + the `wix build`/`wix release` pipeline.
// The Wix Cloud Provider Fetch adapter bundles the app into the self-contained
// entry module the Wix runtime loads. React powers the interactive islands.
export default defineConfig({
  output: 'server',
  adapter: wixCloudProviderFetchAdapter(),
  integrations: [wix(), react()],
});
