// 麥克風資料層（#3）：build 時讀 submodule data/mic-frequency-response/data/
// （CSV = source of truth，meta.yaml 為曲線目錄）。唯讀消費，不回寫。
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { load as yamlLoad } from 'js-yaml';

const DATA_ROOT = join(process.cwd(), 'data', 'mic-frequency-response', 'data');

export interface CurvePoint {
  freq: number;
  db: number;
}

export interface FrCurve {
  file: string;
  /** meta.yaml curves[].condition — 曲線的量測條件描述 */
  condition: string;
  points: CurvePoint[];
}

export interface Mic {
  slug: string;
  brand: string;
  model: string;
  type: string;
  polarPatterns: string[];
  /** [low, high] Hz（官方公稱範圍），meta 缺項時為 null */
  frequencyRange: [number, number] | null;
  sourceUrl: string;
  curves: FrCurve[];
}

interface MetaCurveEntry {
  file?: string;
  kind?: string;
  condition?: string;
}

interface MetaYaml {
  brand?: string;
  model?: string;
  type?: string;
  polar_patterns?: string[];
  frequency_range_hz?: [number, number];
  source?: { url?: string };
  curves?: MetaCurveEntry[];
}

function readCsv(path: string): CurvePoint[] {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  if (lines[0] !== 'freq_hz,level_db') {
    throw new Error(`${path}: unexpected header ${lines[0]}`);
  }
  return lines.slice(1).map((line) => {
    const [f, d] = line.split(',');
    return { freq: Number(f), db: Number(d) };
  });
}

function loadMic(slug: string): Mic | null {
  const dir = join(DATA_ROOT, slug);
  // js-yaml v4 load() = 舊 safeLoad（DEFAULT_SCHEMA 不建構任意型別，無 code-exec 面）
  const meta = yamlLoad(readFileSync(join(dir, 'meta.yaml'), 'utf8')) as MetaYaml;
  const frEntries = (meta.curves ?? []).filter(
    (c) => c.file?.startsWith('frequency-response--') &&
      (c.kind === undefined || c.kind === 'frequency-response'),
  );
  if (frEntries.length === 0) return null; // polar-only mic：Phase B 不出頁
  const curves: FrCurve[] = frEntries.map((c) => ({
    file: c.file!,
    condition: c.condition ?? '',
    points: readCsv(join(dir, c.file!)),
  }));
  return {
    slug,
    brand: meta.brand ?? '',
    model: meta.model ?? '',
    type: meta.type ?? '',
    polarPatterns: meta.polar_patterns ?? [],
    frequencyRange: meta.frequency_range_hz ?? null,
    sourceUrl: meta.source?.url ?? '',
    curves,
  };
}

let cache: Mic[] | null = null;

export function getAllMics(): Mic[] {
  if (cache) return cache;
  cache = readdirSync(DATA_ROOT)
    .filter((d) => statSync(join(DATA_ROOT, d)).isDirectory())
    .map(loadMic)
    .filter((m): m is Mic => m !== null)
    .sort((a, b) => a.slug.localeCompare(b.slug));
  return cache;
}

export function getMic(slug: string): Mic | undefined {
  return getAllMics().find((m) => m.slug === slug);
}

/** Legend/說明表用短名：由檔名衍生（condition 全文過長） */
export function curveLabel(file: string): string {
  return file
    .replace('frequency-response--', '')
    .replace('.csv', '')
    .split('-')
    .map((w) => (/^\d/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}
