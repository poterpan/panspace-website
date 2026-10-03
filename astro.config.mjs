import { defineConfig, fontProviders } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://panspace.me',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [
    react(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/og/') && !page.includes('/404') && page !== 'https://panspace.me/' && page !== 'https://panspace.me',
      i18n: { defaultLocale: 'zh', locales: { zh: 'zh-Hant', en: 'en' } },
    }),
  ],
  markdown: { shikiConfig: { theme: 'github-dark-dimmed' } },
  fonts: [
    {
      name: 'Geist',
      cssVariable: '--font-geist',
      provider: fontProviders.local(),
      fallbacks: ['system-ui', 'sans-serif'],
      options: {
        variants: [
          { weight: '100 900', style: 'normal', src: ['./node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2'] },
        ],
      },
    },
    {
      name: 'Geist Mono',
      cssVariable: '--font-geist-mono',
      provider: fontProviders.local(),
      fallbacks: ['ui-monospace', 'monospace'],
      options: {
        variants: [
          { weight: '100 900', style: 'normal', src: ['./node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2'] },
        ],
      },
    },
  ],
  vite: { plugins: [tailwindcss()] },
});
