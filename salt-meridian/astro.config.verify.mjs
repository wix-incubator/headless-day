// LOCAL VERIFICATION ONLY — not used for deployment.
// Builds the site without the @wix/astro integration so it compiles to fully
// static HTML (every page is `prerender`) and the CMS layer exercises its
// seed-data fallback. Production uses astro.config.mjs via `npx wix build`.
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://salt-meridian.wix-site-host.com',
  integrations: [react()],
  vite: { plugins: [tailwindcss()] },
});
