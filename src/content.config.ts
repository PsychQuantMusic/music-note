import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// theory 筆記：正本在 music workspace notes/theory/（Dropbox），此處為 Phase A 快照
// （遷移策略見 issue #1 開放決策；轉換規則見 issue #2 與 scripts/migrate_notes.py）。
const theory = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/theory' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    series: z.enum(['framing', 'epistemology']),
    order: z.number(),
  }),
});

export const collections = { theory };
