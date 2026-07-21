// @ts-check
import { defineConfig, envField } from 'astro/config';
import wix from '@wix/astro';
import react from "@astrojs/react";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  output: "server",
  adapter: cloudflare({ workerEntryPoint: { path: "./src/worker.ts" } }),
  integrations: [wix(), react()],
  // The app only verifies bearer tokens and does not persist Astro sessions.
  // Avoid requiring a Cloudflare KV namespace that Wix App hosting does not bind.
  session: { driver: "memory" },
  env: {
    schema: {
      WIX_API_KEY: envField.string({ context: "server", access: "secret" }),
      WIX_SITE_ID: envField.string({ context: "server", access: "secret" }),
    },
  },
  image: { domains: ["static.wixstatic.com"] },
  security: { checkOrigin: false },
  devToolbar: { enabled: false }
});
