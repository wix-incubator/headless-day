// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";

import react from "@astrojs/react";
import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
const isBuild =
  (/** @type {any} */ (globalThis)).process?.env?.NODE_ENV === "production";

// The deployed Wix runtime exposes NO user env vars (pods carry only infra
// vars; `wix env set` values surface solely via `wix env pull` → .env.local).
// Wix inlines its own credentials at build time, so we do the same for the
// concierge key: loadEnv reads .env.local and `define` bakes the value into
// the SERVER bundle. Only reference this variable from server-side code —
// a client-component reference would inline the secret into public JS.
const secretEnv = loadEnv(isBuild ? "production" : "development", process.cwd(), "");

// https://astro.build/config
export default defineConfig({
  // Update to your production URL after `npm create @wix/new@latest init`
  site: "https://www.apex-drive.co",
  vite: {
    plugins: [tailwindcss()],
    define: {
      // A raw define constant — Astro's env plugin rewrites import.meta.env.*
      // to process.env lookups (empty on Wix pods), so that namespace can't
      // carry the secret; a bare identifier is replaced verbatim by Vite.
      __ANTHROPIC_API_KEY__: JSON.stringify(secretEnv.ANTHROPIC_API_KEY ?? ""),
    },
  },
  // Ship the (single, site-wide) stylesheet inside the HTML instead of as a
  // render-blocking /_astro/*.css request — one less critical-path round
  // trip (~600ms mobile), and styles can't 404 from a stale edge-cached
  // page after a release purges old hashed assets.
  build: { inlineStylesheets: "always" },
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },
  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),

  image: {
    domains: ["static.wixstatic.com"],
  },

  output: "server",
});