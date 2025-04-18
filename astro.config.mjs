import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
// Import the typography plugin
import typography from '@tailwindcss/typography';

export default defineConfig({
  compressHTML: false,
  vite: {
    build: {
      minify: false,
      cssMinify: false,
    },
    plugins: [
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': '/src'
      }
    }
  },
  build: {
    inlineStylesheets: 'always', // Ensures all styles are inlined
  },
});
