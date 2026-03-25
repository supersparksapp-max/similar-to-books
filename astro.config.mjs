// @ts-check
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://similartobooks.com',
  output: 'static',
  adapter: cloudflare(),
  integrations: [
    sanity({
      projectId: 'f1038281',
      dataset: 'production',
      useCdn: false,
    }),
    sitemap(),
  ],
});
