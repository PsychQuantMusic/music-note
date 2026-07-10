// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://psychquantmusic.github.io',
  base: '/music-note',
  markdown: {
    shikiConfig: {
      // 雙主題跟隨系統色系（切換的 media query 在 global.css）
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
});
