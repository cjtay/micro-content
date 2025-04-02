import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import purgecss from 'astro-purgecss';

export default defineConfig({
  compressHTML: false,
  vite: {
    build: {
      minify: false, // Disable JS/HTML minification
      cssMinify: false, // Disable CSS minification
    },
    plugins: [
      tailwindcss(), // Tailwind integration
    ],
  },
  integrations: [
    purgecss({
      content: ['./src/**/*.{astro,html,jsx,tsx}'], // Scan for classes in source files
      safelist: [/^astro-/], // Preserve Astro-specific classes
      extractors: [
        {
          extractor: (content) => content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
          extensions: ['astro', 'html'],
        },
      ],
    }),
  ],
  build: {
    inlineStylesheets: 'always', // Ensures all styles are inlined into HTML
  },
});
