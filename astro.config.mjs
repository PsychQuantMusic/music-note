// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Vercel 部署於根路徑（#6）；模板連結用 BASE_URL 動態組、筆記互連為相對路由，
  // 故移除 base 即自動全站根路徑化。
  // 注意：music-note.vercel.app 為他人 project（撞名），勿誤用。
  site: 'https://music-note-psych-quant.vercel.app',
  markdown: {
    shikiConfig: {
      // 雙主題跟隨系統色系（切換的 media query 在 global.css）
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
});
