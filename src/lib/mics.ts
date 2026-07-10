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

export interface PolarCurve {
  file: string;
  condition: string;
  /** 頻率族：Hz 數值；pattern 族（如 C414 的 omni/cardioid/figure8）：null */
  freqHz: number | null;
  /** legend 短名：頻率族 "125 Hz"；pattern 族 "Omni" 等 */
  label: string;
  /** [angle_deg, level_db]，半平面 0–180（發表圖左右對稱，半平面即完整） */
  points: [number, number][];
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
  polarCurves: PolarCurve[];
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

function readPolarCsv(path: string): [number, number][] {
  const lines = readFileSync(path, 'utf8').trim().split('\n');
  if (lines[0] !== 'angle_deg,level_db') {
    throw new Error(`${path}: unexpected header ${lines[0]}`);
  }
  return lines.slice(1).map((line) => {
    const [a, d] = line.split(',');
    return [Number(a), Number(d)];
  });
}

/** polar 檔名 → 頻率/pattern 標籤（polar-pattern--125hz → 125 Hz；--omni-1khz → Omni @1 kHz） */
function parsePolarName(file: string): { freqHz: number | null; label: string } {
  const base = file.replace('polar-pattern--', '').replace('.csv', '');
  const freqM = /^(\d+)hz$/.exec(base);
  if (freqM) {
    const hz = Number(freqM[1]);
    return { freqHz: hz, label: hz >= 1000 ? `${hz / 1000} kHz` : `${hz} Hz` };
  }
  // pattern 族（如 omni-1khz / figure8-1khz）
  const patM = /^([a-z0-9]+)-1khz$/.exec(base);
  if (patM) {
    const name = patM[1] === 'figure8' ? 'Figure-8' : patM[1].charAt(0).toUpperCase() + patM[1].slice(1);
    return { freqHz: null, label: `${name} @1 kHz` };
  }
  return { freqHz: null, label: base };
}

function loadMic(slug: string): Mic | null {
  const dir = join(DATA_ROOT, slug);
  // js-yaml v4 load() = 舊 safeLoad（DEFAULT_SCHEMA 不建構任意型別，無 code-exec 面）
  const meta = yamlLoad(readFileSync(join(dir, 'meta.yaml'), 'utf8')) as MetaYaml;
  const frEntries = (meta.curves ?? []).filter(
    (c) => c.file?.startsWith('frequency-response--') &&
      (c.kind === undefined || c.kind === 'frequency-response'),
  );
  if (frEntries.length === 0) return null; // polar-only mic：不出頁（FR 是單支頁主體）
  const curves: FrCurve[] = frEntries.map((c) => ({
    file: c.file!,
    condition: c.condition ?? '',
    points: readCsv(join(dir, c.file!)),
  }));
  const polarCurves: PolarCurve[] = (meta.curves ?? [])
    .filter((c) => c.kind === 'polar-pattern' && c.file)
    .map((c) => ({
      file: c.file!,
      condition: c.condition ?? '',
      ...parsePolarName(c.file!),
      points: readPolarCsv(join(dir, c.file!)),
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
    polarCurves,
  };
}

/** polar 分圖（vendor 慣例）：頻率族 ≤1 kHz / >1 kHz 各一圖；pattern 族一圖 */
export function polarGroups(polarCurves: PolarCurve[]): { title: string; curves: PolarCurve[] }[] {
  const freqFam = polarCurves.filter((c) => c.freqHz !== null).sort((a, b) => a.freqHz! - b.freqHz!);
  const patFam = polarCurves.filter((c) => c.freqHz === null);
  const groups: { title: string; curves: PolarCurve[] }[] = [];
  const lo = freqFam.filter((c) => c.freqHz! <= 1000);
  const hi = freqFam.filter((c) => c.freqHz! > 1000);
  if (lo.length) groups.push({ title: '低頻（≤1 kHz）', curves: lo });
  if (hi.length) groups.push({ title: '高頻（>1 kHz）', curves: hi });
  if (patFam.length) groups.push({ title: '指向性（@1 kHz）', curves: patFam });
  return groups;
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
