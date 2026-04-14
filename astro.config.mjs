// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.similartobooks.com',
  output: 'static',
  trailingSlash: 'always',
  adapter: cloudflare(),

  integrations: [
    sanity({
      projectId: 'f1038281',
      dataset: 'production',
      useCdn: false,
    }),
    sitemap(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
});