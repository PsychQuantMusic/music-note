// 比較視圖資料（#4）：45 支 typical 曲線的靜態 JSON asset（client fetch）。
// 只出 typical——比較用 canonical；proximity/voicing 變體在單支頁。
import type { APIRoute } from 'astro';
import { getAllMics } from '../../lib/mics';

export const GET: APIRoute = () => {
  const mics = getAllMics()
    .map((m) => {
      const typical = m.curves.find((c) => c.file === 'frequency-response--typical.csv')
        ?? m.curves[0]; // 無 typical 者（如 SM7B 以 flat 為主曲線）取第一條
      return {
        slug: m.slug,
        name: `${m.brand} ${m.model}`,
        type: m.type,
        curve: typical.file,
        points: typical.points.map((p) => [p.freq, p.db]),
      };
    });
  return new Response(JSON.stringify({ mics }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
