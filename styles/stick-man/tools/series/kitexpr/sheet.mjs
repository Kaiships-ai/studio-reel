// The kit expression sheets (dev only) from the kitexpr film's stills (reel.js in this folder):
//   node styles/stick-man/tools/series/kitexpr/sheet.mjs frames            -> the peak frames (expressions, then marks), for shot.mjs --frames
//   node styles/stick-man/tools/series/kitexpr/sheet.mjs --stills <dir> --sil <dir> --rows <dbg.jsonl> --out <dir> [--old <dir>] [--faces <dir>] [--h 1280]
//     (old: the marks frames with --query marks=classic)
//     stills/e_<f>.jpg (the film), sil/e_<f>.jpg (the same frames with --query sil=1), rows: shot.mjs --dbg of those frames
//     -> expr-sheet.jpg (one labelled tile per expression at its peak), expr-silhouettes.jpg (the same, filled black),
//        expr-sheet-120.jpg (scaled so the head is ~120 px: the phone read), and with --old (the marks frames rendered with
//        the marks as they were) marks-before-after.jpg (each mark old above new, head ~120 px) and
//        (faces: stills f_<i>.jpg of `kitfaces-age --query age=adult&faces=<sheet.mjs faces>` -> face-only-120.jpg: the same
//        faces, in the same order, on one neutral adult head, no pose, no mark, head ~120 px)
//        anger-old-new.jpg (the old anger mark | the new one, the same head at ~120 px and large)
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { run } from '../../../../../kit/env.mjs';
import { EXPRESSIONS, EXPRESSION_NAMES } from '#engine/expressions.js';
import { POSES } from '#engine/poses.js';
import { MOVE_T } from '#engine/acting.js';
import { BOLD_MARKS as MARK_NAMES } from '#engine/headmarks.js';

// (reel.js in this folder places the beats the same way: keep the two in step)
const SLOT = 80, MARK_SLOT = 40, M0 = EXPRESSION_NAMES.length * SLOT;
export const PEAKS = EXPRESSION_NAMES.map((n, i) => { const P = POSES[EXPRESSIONS[n].pose]; return i * SLOT + 6 + (P.A ?? 3) + Math.max(MOVE_T, P.T ?? 9) + (n === 'excited' ? 18 : 26); });   // (26 f in, excited blinks)
export const MARK_PEAKS = MARK_NAMES.map((m, i) => M0 + i * MARK_SLOT + 20);
// read 3 (25/11) tags, shown on the sheet; SCORE fills the sheet's last empty cells
const TAGS = { guilty: 'still weak 0/5', proud: 'still weak 3/5', shy: '4/5', bored: 'read-2 pose' };
const SCORE = ['Blind read 3 (5 viewers, held stills)', 'expressions 81.5 %, the bar (90) was missed', 'ages 5 of 10, the bar was missed', '9 of 13 expressions read 5/5', 'bored is back to its read 2 pose (5/5 there),', 'not read again since read 3 (1/5)'];
const OLD_MARKS = ['sweat', 'anger', 'sparkle', 'question', 'exclaim', 'steam', 'stars', 'zzz'];

const ff = (args, what) => { const r = run('ffmpeg', ['-nostdin', '-y', '-v', 'error', ...args], { capture: true }); if (r.status) throw new Error(`ffmpeg ${what}: ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`); };
const txt = s => s.replace(/[':\\]/g, ' ');
const FONT = path.relative(process.cwd(), new URL('../../../fonts/Inter.ttf', import.meta.url).pathname);   // (named: a font looked up by the system took 10 s a tile)
const PAGE = '0xF5F5F2', DARK = '0x141414';   // the page: empty cells and margins are its colour, never a dark or grey slab
const label = (s, size, y = 8, color = 'white', x = 8) => `drawtext=fontfile='${FONT}':expansion=none:text='${txt(s)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}:box=1:boxcolor=black@0.65:boxborderw=4`;
// a tile's label: its name, what it is made of, and (TAGS) what its last blind read said
const labels = (n, size, detail) => [[n, size], [detail, Math.round(size * 0.7)], [TAGS[n], Math.round(size * 0.8), '0xFFD84A']].filter(l => l[0])
  .reduce(([out, y], [t, z, c]) => [[...out, label(t, z, y, c)], y + z + 11], [[], 8])[0].join(',');
function grid(tiles, cols, out, tw, th) {
  const lay = tiles.map((_, i) => `${(i % cols) * tw}_${Math.floor(i / cols) * th}`).join('|');
  ff([...tiles.flatMap(t => ['-i', t]), '-filter_complex', `xstack=inputs=${tiles.length}:layout=${lay}:fill=${PAGE}`, '-q:v', '3', out], 'grid');
}

if (process.argv[2] === 'faces') { console.log(EXPRESSION_NAMES.map(n => EXPRESSIONS[n].face).join(',')); process.exit(0); }
if (process.argv[2] === 'frames') { console.log([...PEAKS, ...MARK_PEAKS].join(',')); process.exit(0); }
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
if (!A.stills || !A.out) { console.error('usage: sheet.mjs frames | --stills <dir> --sil <dir> --rows <dbg.jsonl> --out <dir> [--old <dir>] [--h 1280]'); process.exit(2); }
const H = Number(A.h || 1280), W = Math.round(H * 9 / 16), tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'kitexpr-'));
fs.mkdirSync(A.out, { recursive: true });
const rows = A.rows && fs.existsSync(A.rows) ? fs.readFileSync(A.rows, 'utf8').trim().split('\n').map(l => JSON.parse(l)) : [];
const headAt = f => { const a = Object.values(rows.find(r => r.f === f)?.actors || {})[0]; return a?.head || null; };
const headPx = PEAKS.map(f => headAt(f)).filter(Boolean).map(h => h[3] - h[1]).sort((a, b) => a - b);
const hpx = headPx.length ? headPx[headPx.length >> 1] : H * 0.14;   // the median head height on the peaks (px at H)
const parts = n => `${EXPRESSIONS[n].face} + ${EXPRESSIONS[n].pose}${EXPRESSIONS[n].mark ? ' + ' + [].concat(EXPRESSIONS[n].mark).join(' ') : ''}`;
// the note in the empty cells after the last tile: 2 cells wide, dark text on the page colour
const note = (w, h, size, o) => { ff(['-f', 'lavfi', '-i', `color=c=${PAGE}:s=${w}x${h}`, '-frames:v', '1', '-vf', SCORE.map((t, i) => `drawtext=fontfile='${FONT}':expansion=none:text='${txt(t)}':x=${size}:y=${size * 2 + Math.round(i * size * 1.7)}:fontsize=${size}:fontcolor=${DARK}`).join(','), o], 'note'); return o; };

// the peaks, half size, labelled
const TW = W / 2, TH = H / 2;
const tiles = EXPRESSION_NAMES.map((n, i) => { const o = path.join(tmp, `p_${i}.jpg`);
  ff(['-i', path.join(A.stills, `e_${PEAKS[i]}.jpg`), '-vf', `scale=${TW}:${TH},${labels(n, 20, parts(n))}`, o], n); return o; });
grid([...tiles, note(TW * 2, TH, 24, path.join(tmp, 'note.png'))], 5, path.join(A.out, 'expr-sheet.jpg'), TW, TH);
// the silhouettes: everything that is not the key green filled black, on white
if (A.sil) {
  const sil = EXPRESSION_NAMES.map((n, i) => { const o = path.join(tmp, `s_${i}.jpg`);
    ff(['-i', path.join(A.sil, `e_${PEAKS[i]}.jpg`), '-vf', `scale=${TW}:${TH},format=rgb24,geq=r='if(gt(g(X,Y),150)*lt(r(X,Y),110)*lt(b(X,Y),110),245,10)':g='if(gt(g(X,Y),150)*lt(r(X,Y),110)*lt(b(X,Y),110),245,10)':b='if(gt(g(X,Y),150)*lt(r(X,Y),110)*lt(b(X,Y),110),242,10)',${label(n, 16)}`, o], n + ' sil'); return o; });
  grid(sil, 5, path.join(A.out, 'expr-silhouettes.jpg'), TW, TH);
}
// the phone read: the whole frame scaled so the head is ~120 px
const k = 120 / hpx, PW = 2 * Math.round(W * k / 2), PH = 2 * Math.round(H * k / 2);
const small = EXPRESSION_NAMES.map((n, i) => { const o = path.join(tmp, `q_${i}.jpg`);
  ff(['-i', path.join(A.stills, `e_${PEAKS[i]}.jpg`), '-vf', `scale=${PW}:${PH},${labels(n, 18)}`, o], n + ' 120'); return o; });
grid([...small, note(PW * 2, PH, 22, path.join(tmp, 'note120.png'))], 5, path.join(A.out, 'expr-sheet-120.jpg'), PW, PH);
// the faces alone: the age sheet's close head (288 x 270 px, its middle at 352, 654 of 720 x 1280) scaled to ~120 px
if (A.faces) {
  const f = EXPRESSION_NAMES.map((n, i) => { const o = path.join(tmp, `f_${i}.jpg`);
    ff(['-i', path.join(A.faces, `f_${i}.jpg`), '-vf', `crop=456:372:124:468,scale=190:156,pad=190:184:0:28:color=${PAGE},${label(n, 14).replace('y=8', 'y=5')}`, o], n + ' face'); return o; });
  grid(f, 5, path.join(A.out, 'face-only-120.jpg'), 190, 184);
}
console.log(`head ${hpx.toFixed(0)} px at ${H}: 120 px sheet at x${k.toFixed(2)}`);

// marks, old above new, each cropped round the head and scaled; then the marks that have no old version, in their own row
if (A.old) {
  // the crop: a 4:5 box as wide as the frame allows (no bars: it never leaves the frame), the head low in it (the "!" and "?" need the room above)
  const box = f => { const h = headAt(f) || [W / 2 - hpx / 2, H * 0.2, W / 2 + hpx / 2, H * 0.2 + hpx], s = h[3] - h[1], w = 2 * Math.floor(Math.min(W, 2.8 * s) / 2), ht = 2 * Math.floor(1.1 * w / 2);
    const x = (h[0] + h[2]) / 2 - w / 2, y = (h[1] + h[3]) / 2 - 0.68 * ht;
    return [w, ht, Math.min(W - w, Math.max(0, x)), Math.max(0, y)].map(Math.round); };
  const MW = 336, MH = 370, crop = f => { const [w, h, x, y] = box(f); return `crop=${w}:${h}:${x}:${y}`; };
  const cut = (src, f, lab, o) => { ff(['-i', src, '-vf', `${crop(f)},scale=${MW}:${MH},${label(lab, 18)}`, o], lab); return o; };
  const old = OLD_MARKS.map((m, i) => cut(path.join(A.old, `e_${MARK_PEAKS[MARK_NAMES.indexOf(m)]}.jpg`), MARK_PEAKS[MARK_NAMES.indexOf(m)], `${m}  old`, path.join(tmp, `mo_${i}.jpg`)));
  const now = OLD_MARKS.map((m, i) => cut(path.join(A.stills, `e_${MARK_PEAKS[MARK_NAMES.indexOf(m)]}.jpg`), MARK_PEAKS[MARK_NAMES.indexOf(m)], `${m}  new`, path.join(tmp, `mn_${i}.jpg`)));
  const fresh = MARK_NAMES.filter(m => !OLD_MARKS.includes(m)).map((m, i) => cut(path.join(A.stills, `e_${MARK_PEAKS[MARK_NAMES.indexOf(m)]}.jpg`), MARK_PEAKS[MARK_NAMES.indexOf(m)], `${m}  new mark, no old one`, path.join(tmp, `mf_${i}.jpg`)));
  grid([...old, ...now, ...fresh], OLD_MARKS.length, path.join(A.out, 'marks-before-after.jpg'), MW, MH);
  // the anger mark alone: old | new, large, above the same head at ~120 px (centred on the page colour)
  const f = MARK_PEAKS[MARK_NAMES.indexOf('anger')], [w, h] = box(f), BW = 900, BH = Math.round(BW * h / w / 2) * 2, hh = headAt(f), SW = 2 * Math.round(w * 120 / (hh ? hh[3] - hh[1] : hpx) / 2), SH = 2 * Math.round(SW * h / w / 2);
  const big = (src, lab, n) => { const o = path.join(tmp, `ab_${n}.jpg`), sm = path.join(tmp, `as_${n}.jpg`);
    ff(['-i', src, '-vf', `${crop(f)},scale=${BW}:${BH}:flags=lanczos,${label(lab, 30)},${label('mark only, neutral face', 20, 52)}`, o], lab);
    ff(['-i', src, '-vf', `${crop(f)},scale=${SW}:${SH},pad=${BW}:${SH + 64}:(ow-iw)/2:48:color=${PAGE},drawtext=fontfile='${FONT}':expansion=none:text='${txt(lab)}, head 120 px':x=(w-tw)/2:y=14:fontsize=22:fontcolor=${DARK}`, sm], lab); return [o, sm]; };
  const a = big(path.join(A.old, `e_${f}.jpg`), 'anger  old (every film today)', 'old'), b = big(path.join(A.stills, `e_${f}.jpg`), 'anger  new (bold set)', 'new');
  const t1 = path.join(tmp, 'ag1.jpg'), t2 = path.join(tmp, 'ag2.jpg');
  grid([a[0], b[0]], 2, t1, BW, BH); grid([a[1], b[1]], 2, t2, BW, SH + 64);
  ff(['-i', t1, '-i', t2, '-filter_complex', 'vstack', '-q:v', '3', path.join(A.out, 'anger-old-new.jpg')], 'anger');
}
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`sheets in ${A.out}`);
