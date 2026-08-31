// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";

import react from "@astrojs/react";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";
import tailwindcss from "@tailwindcss/vite";

// `process.env` guarded so strict `tsc --noEmit` does not fail with
// "Cannot find name 'process'" without an @types/node dependency.
const isBuild =
  (/** @type {any} */ (globalThis)).process?.env?.NODE_ENV === "production";

// https://astro.build/config
export default defineConfig({
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },
  adapter: wixHostingAdapter(),

  image: {
    domains: ["static.wixstatic.com"],
  },

  vite: {
    plugins: [tailwindcss()],
  },

  output: "server",
});
