import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://zhaopeng-portfolio.pages.dev',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    {
      // 每次构建都自动压缩后台上传的图片，不依赖构建命令是怎么写的
      name: 'optimize-images',
      hooks: {
        'astro:build:start': async () => {
          const { optimizeImages } = await import(
            new URL('./scripts/optimize-images.mjs', import.meta.url).href
          );
          await optimizeImages();
        },
      },
    },
  ],
});
