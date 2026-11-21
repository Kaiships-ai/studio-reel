// Render by purpose: what each tier of tools/shot.mjs --tier makes, and what a pixel gate may read.
//   T0 dbg     data only (__dbg rows, reports, cues): no pixels
//   T1 still   one sharp frame per storyboard shot (--scenes 1) or the --frames given, full quality with lens blur, 1080x1920
//   T2 proof   480x854, engine/look.js QUALITY.proof (no MSAA, small shadow map, no lens blur, 4 lights): a cheap 1x watch
//   T3 review  720x1280, full quality: what Kai watches and what the pixel gates (colourgate, refbench) read
//   T4 final   1080x1920, full quality, only with --kai-ok "<Kai's words>"
import fs from 'node:fs'; import path from 'node:path';
import { run } from '../../../../kit/env.mjs';
import { loadFilm } from '../shotlist.mjs';

export const TIERS = {
  dbg: { id: 'T0', pixels: false },
  still: { id: 'T1', pixels: true, w: 1080, h: 1920, stillsOnly: true },
  proof: { id: 'T2', pixels: true, w: 480, h: 854, query: 'q=proof' },
  review: { id: 'T3', pixels: true, w: 720, h: 1280 },
  final: { id: 'T4', pixels: true, w: 1080, h: 1920, needsKai: true },
};
// a gate that measures pixels needs at least this many pixels across (T3)
export const GATE_MIN_W = TIERS.review.w;

const DATA_MODES = ['dbg', 'report', 'vis', 'cues', 'probe'];

// A: shot.mjs's parsed flags. Returns { tier, w, h, query } or { error } (a refusal to print). No --tier: null.
export function resolveTier(A) {
  if (A.tier == null) return null;
  const t = TIERS[A.tier];
  if (!t) return { error: `--tier ${A.tier}: pick one of ${Object.keys(TIERS).join(', ')}` };
  if (A.w || A.h) return { error: `--tier ${A.tier} sets the size (${t.w ? t.w + 'x' + t.h : 'no pixels'}): drop --w/--h` };
  const mode = DATA_MODES.find(m => A[m] != null);
  if (!t.pixels && !mode) return { error: `--tier dbg (T0) makes data only: add --dbg <rows.jsonl> (or --report, --vis, --cues), no --mp4 or --out` };
  if (!t.pixels && (A.mp4 || A.out)) return { error: '--tier dbg (T0) makes no pixels: drop --mp4/--out' };
  if (t.stillsOnly && A.mp4) return { error: '--tier still (T1) makes stills: use --out <dir>/f_%d.png, or --tier proof|review for an mp4' };
  if (t.needsKai && !String(A['kai-ok'] || '').trim()) return { error: '--tier final (T4, 1080x1920) renders only on Kai\'s ask: add --kai-ok "<his words>"' };
  if (A.scenes && A.tier !== 'still') return { error: '--scenes picks one still per shot: use it with --tier still' };
  return { tier: A.tier, id: t.id, pixels: t.pixels, w: t.w, h: t.h, query: t.query || null };
}

// T1: the middle frame of every storyboard shot, kept when it falls inside `range` ([a, b], or null for all). A part folder
// (films/<ep>/parts/<p>) has no storyboard of its own: the episode's storyboard.json is used, in the same frame numbers.
export function sceneFrames(filmDir, range = null) {
  let dir = path.resolve(filmDir);
  while (!fs.existsSync(path.join(dir, 'storyboard.json'))) {
    const up = path.dirname(dir);
    if (path.basename(up) === 'films' || up === dir) throw new Error(`no storyboard.json in ${filmDir} or the folders above it`);
    dir = up;
  }
  const { shots } = loadFilm(dir);
  return shots.map(s => ({ id: s.id, f: Math.floor((s.a + s.b - 1) / 2) })).filter(s => !range || (s.f >= range[0] && s.f <= range[1]));
}

// what a render is: the cache sidecar's tier (tools/render/cache.mjs) when there is one, else the width ffprobe reads
export function renderInfo(mp4) {
  let tier = null;
  try { tier = JSON.parse(fs.readFileSync(mp4 + '.json', 'utf8')).tier ?? null; } catch {}
  const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', mp4], { capture: true });
  const [w, h] = String(r.stdout || '').trim().split(',').map(Number);
  return { tier, w: w || null, h: h || null };
}

// a pixel gate's refusal for a render below T3 (a T2 proof, or anything under 720 wide); null when it may measure it
export function pixelGateError(info, gate) {
  const low = info.tier === 'proof' || info.tier === 'dbg' || (info.w != null && info.w < GATE_MIN_W);
  if (!low) return null;
  return `${gate} measures final-look pixels and needs a T3 review render (720x1280 or larger, full quality); this one is ` +
    `${info.tier ? 'tier ' + info.tier + ', ' : ''}${info.w ?? '?'}x${info.h ?? '?'}. Render it with shot.mjs --tier review.`;
}
