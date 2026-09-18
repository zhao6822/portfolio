import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zhaopeng-portfolio.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
});
