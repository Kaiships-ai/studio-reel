// Blind A|B of two cuts of one reel, at phone size. ADVISORY: it never blocks a render or a merge; the verdict is one
// more opinion beside Kai's own look (the reviewer is not calibrated).
//   node styles/stick-man/tools/abtest.mjs <old.mp4> <new.mp4> --out <dir> [--seed n]
//     -> <dir>/sbs.mp4      the two cuts side by side, 360 wide each, A left and B right
//        <dir>/sheet.jpg    contact sheet: 8 frames of A on the top row, 8 of B below
//        <dir>/key.json     which side is the new cut (only for us; the reviewer never sees it)
//        <dir>/verdict.json { winner: "A"|"B", new_wins: bool, reasons: [...], key }
// The sides are shuffled by --seed (random when absent), so the reviewer cannot learn "the new one is on the right".
// The reviewer is the shared headless one (claude_headless.mjs): a fresh sonnet with no tools that sees the sheet only.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { claudeJson } from './claude_headless.mjs';

const W = 360, H = 640, TILES = 8;
const SYSTEM = 'You are a viewer scrolling short vertical videos on a phone. You are shown a contact sheet of two cuts of the same reel: row A on top, row B below, 8 frames each, left to right in time. You do not know which is newer. Judge as a viewer at phone size: is the picture clear, the character readable, the shot varied, the colour steady and pleasant, the story easy to follow. Pick one winner; there are no ties. Reply with JSON only: {"winner": "A" | "B", "reasons": ["short reason", ...]}';

// seeded coin: a small LCG so a test can fix the sides; without a seed it is random
export function pickSides(seed) {
  const s = seed == null ? Math.floor(Math.random() * 2 ** 31) : Number(seed);
  const x = (Math.imul(s >>> 0, 1664525) + 1013904223) >>> 0;
  return { seed: s, A: (x >>> 16) & 1 ? 'new' : 'old', get B() { return this.A === 'new' ? 'old' : 'new'; } };
}
export const sbsArgs = (a, b, out) => ['-y', '-v', 'error', '-i', a, '-i', b, '-filter_complex',
  `[0:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[a];` +
  `[1:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[b];[a][b]hstack=inputs=2[v]`,
  '-map', '[v]', '-an', '-shortest', '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-crf', '28', out];
export const rowArgs = (mp4, dur, out) => ['-y', '-v', 'error', '-i', mp4, '-vf',
  `fps=${TILES / dur},scale=${W / 2}:${H / 2}:force_original_aspect_ratio=decrease,pad=${W / 2}:${H / 2}:(ow-iw)/2:(oh-ih)/2,tile=${TILES}x1`, '-frames:v', '1', '-q:v', '4', out];

const must = (r, what) => { if (r.status) throw new Error(`${what} failed: ${String(r.stderr || '').slice(0, 300)}`); };
function duration(mp4) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { capture: true });
  must(r, 'ffprobe'); const d = Number(String(r.stdout).trim());
  if (!(d > 0)) throw new Error(`no duration in ${mp4}`); return d;
}

// the verdict from the reviewer's raw answer and the key; throws on an answer that is not A or B
export function verdictOf(raw, key) {
  const winner = String(raw?.winner || '').toUpperCase();
  if (winner !== 'A' && winner !== 'B') throw new Error(`reviewer winner is not A or B: ${JSON.stringify(raw?.winner)}`);
  const reasons = Array.isArray(raw.reasons) ? raw.reasons.map(String) : raw.reasons ? [String(raw.reasons)] : [];
  return { winner, new_wins: key[winner] === 'new', reasons, advisory: true, key };
}

export async function abtest({ old, new: neu, out, seed, review = claudeJson }) {
  for (const f of [old, neu]) if (!fs.existsSync(f)) throw new Error(`missing ${f}`);
  fs.mkdirSync(out, { recursive: true });
  const side = pickSides(seed), key = { seed: side.seed, A: side.A, B: side.B };
  const file = { old: path.resolve(old), new: path.resolve(neu) };
  const a = file[side.A], b = file[side.B];
  fs.writeFileSync(path.join(out, 'key.json'), JSON.stringify(key, null, 2) + '\n');
  must(run('ffmpeg', sbsArgs(a, b, path.join(out, 'sbs.mp4')), { capture: true }), 'side by side');
  const rows = [a, b].map((m, i) => { const r = path.join(out, `.row${i}.jpg`); must(run('ffmpeg', rowArgs(m, duration(m), r), { capture: true }), 'contact row'); return r; });
  must(run('ffmpeg', ['-y', '-v', 'error', '-i', rows[0], '-i', rows[1], '-filter_complex', 'vstack=inputs=2', '-q:v', '4', path.join(out, 'sheet.jpg')], { capture: true }), 'contact sheet');
  for (const r of rows) fs.rmSync(r, { force: true });
  const jpg = fs.readFileSync(path.join(out, 'sheet.jpg')).toString('base64');
  const raw = await review([{ type: 'text', text: 'Which cut is better for a viewer at phone size, and why? Row A on top, row B below.' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: jpg } }], SYSTEM);
  const v = verdictOf(raw, key);
  fs.writeFileSync(path.join(out, 'verdict.json'), JSON.stringify(v, null, 2) + '\n');
  return v;
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) {
  const [old, neu] = process.argv.slice(2).filter((x, i, a) => !x.startsWith('--') && !(a[i - 1] || '').startsWith('--'));
  const opt = n => { const i = process.argv.indexOf(`--${n}`); return i > 1 ? process.argv[i + 1] : undefined; };
  const out = opt('out');
  if (!old || !neu || !out) { console.error('usage: abtest.mjs <old.mp4> <new.mp4> --out <dir> [--seed n]'); process.exit(2); }
  abtest({ old, new: neu, out: path.resolve(out), seed: opt('seed') })
    .then(v => { console.log(`${v.new_wins ? 'NEW wins' : 'OLD wins'} (advisory, sides ${v.key.A}|${v.key.B}): ${v.reasons.join('; ')}`); })
    .catch(e => { console.error(e.message); process.exit(1); });
}
