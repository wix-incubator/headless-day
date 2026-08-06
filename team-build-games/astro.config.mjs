// @ts-check
import { defineConfig } from "astro/config";
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";
import react from "@astrojs/react";

import tailwindcss from "@tailwindcss/vite";

import cloudProviderFetchAdapter from "@wix/cloud-provider-fetch-adapter";
const isBuild = process.env.NODE_ENV == "production";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },

  image: {
    domains: ["static.wixstatic.com"],
  },

  vite: {
    plugins: [tailwindcss()],
    // Agent worktrees live below the repo and may add tsconfig files while this server runs.
    // They are separate projects; watching them causes Vite to invalidate optimized deps mid-page.
    server: {
      watch: {
        ignored: ["**/.claude/**"],
      },
    },
  },

  ...(isBuild && { adapter: cloudProviderFetchAdapter({}) }),
});
