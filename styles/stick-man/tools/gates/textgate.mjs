// Text gate on the render's rows: everything a viewer reads (each overlay's words and the caption, as boxes the engine
// lays out on every frame: engine/overlays.js boxes(), engine/captions.js boxAt(), rows field `text`) must sit where a
// phone shows it, off the faces, apart from each other, and without a middle dot.
//   node styles/stick-man/tools/gates/textgate.mjs films/<slug>          rows from review/shot-rows.jsonl -> review/textgate.md
//   node styles/stick-man/tools/gates/textgate.mjs --rows <rows.jsonl> [--json 1]                       -> exit 1 unless PASS
// T1 under the app's buttons and labels: a word inside UI_BANDS (top 7 %, bottom 25 %, right 13 %, left 4 %), held
// T2 outside the text-safe box (x 6-87 %, y 14-65 %): an overlay word, held; a warning only (a heads-up clock at the very
//    top is a choice; the captions have their own band and are not checked here)
// T3 on a face: a box covering 20 % or more of a face the lens sees (faceVis >= 0.3), held 0.5 s
// T4 stacked: two boxes from different overlays (or one and the caption) overlapping by 15 % of the smaller one, held
// T5 a middle dot or a bullet in anything a viewer reads (Kai's rule, H2 V2.1)
// T6 hard to read: a box's WCAG contrast `cr` under 4.5:1 for 6 frames while fully shown (alpha >= 0.6). The film measures
//    it where it draws the glyphs: ratio(relLum(text), relLum(back)) with the text's luminance (its opaque glyph fill)
//    against the 90th percentile of the picture in a ring round the glyphs (busy bright detail counts). The rows only
//    carry boxes, not glyphs, so the gate cannot measure it from the mp4; a shown box without `cr` (or the prototype's
//    `cr1`) is unmeasured and the gate reads PARTIAL, never PASS
// The film behind each limit is its `source` in LIMITS below.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { UI_BANDS, TEXT_SAFE } from '../run/shotlist.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const HOLD = 8, FACE_HOLD = 15, FACE_SHARE = 0.2, STACK_SHARE = 0.15, FACE_VIS = 0.3, EDGE = 0.01;
export const DOTS = /[·•∙]/;
export const CR_MIN = 4.5, CR_HOLD = 6, CR_ALPHA = 0.6;
// WCAG 2.x relative luminance of an sRGB colour (0-255) and the contrast ratio of two luminances
const lin = c => (c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
export const relLum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
const crOf = t => t.cr ?? t.cr1;
const shown = t => (t.alpha ?? 1) >= CR_ALPHA;
export const LIMITS = [
  { id: 'T1', what: 'a word under the app\'s buttons or labels, held 8 frames', fail: true,
    source: 'H2 V2.1 1080 post copy (24/11): DECIDES EPISODE 2 at y 77-83 % and half of COMMENT sat in the bottom band, "= REPORTED" and BAIT? reached x 95-97 %; tools/run/shotlist.mjs UI_BANDS' },
  { id: 'T2', what: 'an overlay word outside the text-safe box, held 8 frames (warning)', fail: false,
    source: 'Meta Reels/Stories safe zone as tools/run/shotlist.mjs TEXT_SAFE; prepro C9 checks it before the render, this after' },
  { id: 'T3', what: 'a word over 20 % of a visible face, held 0.5 s', fail: true,
    source: 'Kai: a list over the face (BAIT LIST, 22/11), the HUD on the cap and forehead (blind viewer, V2.1 round 3)' },
  { id: 'T4', what: 'two cards stacked on each other, held 8 frames', fail: true,
    source: 'blind viewer, V2.1 round 3: "the red OVER $10,000 = REPORTED banner and the $27,000 tag are stacked"' },
  { id: 'T5', what: 'a middle dot or bullet in a word on screen', fail: true,
    source: 'Kai, H2 V2 brief (24/11): "No · in anything a viewer reads"; V2.1 found one on a bank sign' },
  { id: 'T6', what: 'a line of words under 4.5:1 WCAG contrast against the picture behind it, held 6 frames while fully shown', fail: true,
    source: 'Studio, What if 1 REMIX v5 (27/11): pale gold "87%" on a bright warm wall (34.9 s), a white line on red ticker numbers (52.5 s), gold "90%" over a bright shop window (58.5 s); WCAG 2.x AA 4.5:1' },
];

const area = b => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
const inter = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
// a face, as shares of the frame: the head box less its crown and its sides (the face plate), when the lens sees it
export function faces(row) {
  const [w, h] = row.px ?? [1080, 1920], out = [];
  for (const [name, a] of Object.entries(row.actors || {})) {
    if (!a.inFrame || !a.head || (a.faceVis ?? 1) < FACE_VIS) continue;
    const [x0, y0, x1, y1] = a.head, hw = x1 - x0, hh = y1 - y0; if (hw <= 1 || hh <= 1) continue;
    out.push({ name, box: [(x0 + 0.15 * hw) / w, (y0 + 0.3 * hh) / h, (x1 - 0.15 * hw) / w, (y1 - 0.05 * hh) / h] });
  }
  return out;
}
export function bandHit(b) {
  const B = UI_BANDS, hit = [];
  if (b[1] < B.top - EDGE) hit.push('top'); if (b[3] > 1 - B.bottom + EDGE) hit.push('bottom');
  if (b[2] > 1 - B.right + EDGE) hit.push('right'); if (b[0] < B.left - EDGE) hit.push('left');
  return hit;
}
export const outsideSafe = b => b[0] < TEXT_SAFE.x0 - EDGE || b[2] > TEXT_SAFE.x1 + EDGE || b[1] < TEXT_SAFE.y0 - EDGE || b[3] > TEXT_SAFE.y1 + EDGE;

// per frame, the problems found: [{ id, key, what }] (key joins one problem across frames)
export function frameFaults(row) {
  const T = row.text || [], out = [];
  for (const t of T) {
    const name = t.text ? `"${t.text}"` : t.kind;
    const bands = bandHit(t.box); if (bands.length) out.push({ id: 'T1', key: `T1 ${t.kind} ${t.i ?? ''} ${bands}`, what: `${name} (${t.kind}) in the ${bands.join(' and ')} band` });
    if (t.kind !== 'caption' && outsideSafe(t.box)) out.push({ id: 'T2', key: `T2 ${t.kind} ${t.i ?? ''}`, what: `${name} (${t.kind}) outside the text-safe box` });
    for (const fc of faces(row)) { const s = inter(t.box, fc.box) / Math.max(1e-6, area(fc.box)); if (s >= FACE_SHARE) out.push({ id: 'T3', key: `T3 ${t.kind} ${t.i ?? ''} ${fc.name}`, what: `${name} (${t.kind}) over ${fc.name}'s face (${Math.round(100 * s)} %)` }); }
    if (DOTS.test(t.text || '')) out.push({ id: 'T5', key: `T5 ${t.text}`, what: `${name} has a middle dot or bullet` });
    const cr = crOf(t); if (shown(t) && cr != null && cr < CR_MIN) out.push({ id: 'T6', key: `T6 ${t.kind} ${t.i ?? ''} ${t.text}`, cr, what: `${name} (${t.kind}) at ${cr.toFixed(2)}:1 against the picture behind it` });
  }
  for (let a = 0; a < T.length; a++) for (let b = a + 1; b < T.length; b++) {
    if (T[a].kind !== 'caption' && T[a].i === T[b].i && T[b].kind !== 'caption') continue;
    const s = inter(T[a].box, T[b].box) / Math.max(1e-6, Math.min(area(T[a].box), area(T[b].box)));
    if (s >= STACK_SHARE) out.push({ id: 'T4', key: `T4 ${T[a].kind}${T[a].i ?? ''} ${T[b].kind}${T[b].i ?? ''}`, what: `"${T[a].text}" and "${T[b].text}" overlap (${Math.round(100 * s)} % of the smaller)` });
  }
  return out;
}
// runs of one problem over consecutive rows, kept when held long enough: [{ id, what, from, to, frames }]
export function textgate(rows) {
  const open = new Map(), runs = [];
  const close = (key, r) => { if (r.frames >= (r.id === 'T3' ? FACE_HOLD : r.id === 'T5' ? 1 : r.id === 'T6' ? CR_HOLD : HOLD)) runs.push(r); open.delete(key); };
  let prev = null, crMeasured = 0, crUnmeasured = 0;
  for (const row of rows) {
    const seen = new Set(), on = (row.text || []).filter(shown);
    if (on.length) { if (on.every(t => crOf(t) != null)) crMeasured++; else crUnmeasured++; }
    for (const p of frameFaults(row)) {
      seen.add(p.key); const r = open.get(p.key);
      if (r && prev != null && row.f === prev + 1) { r.to = row.f; r.frames++; if (p.cr < r.cr) { r.cr = p.cr; r.what = p.what; } } else { if (r) close(p.key, r); open.set(p.key, { id: p.id, what: p.what, from: row.f, to: row.f, frames: 1, ...(p.cr != null && { cr: p.cr }) }); }
    }
    for (const [key, r] of [...open]) if (!seen.has(key)) close(key, r);
    prev = row.f;
  }
  for (const [key, r] of [...open]) close(key, r);
  const fails = runs.filter(r => LIMITS.find(l => l.id === r.id).fail);
  const measured = rows.filter(r => r.text).length;
  const verdict = !measured ? 'PARTIAL' : fails.length ? 'FAIL' : crUnmeasured ? 'PARTIAL' : 'PASS';
  return { ok: !fails.length, verdict, runs: runs.sort((a, b) => a.from - b.from), measured, crMeasured, crUnmeasured };
}
export function report(R, fps = 30) {
  const t = f => (f / fps).toFixed(2);
  const L = [`# Text gate`, '', R.measured ? `**${R.verdict}**: ${R.runs.length} finding(s) over ${R.measured} frames with text rows` : '**PARTIAL**: the rows carry no `text` field (render them with this kit)', '',
    ...(R.crUnmeasured ? [`T6 contrast unmeasured on ${R.crUnmeasured} frame(s): a shown box carries no \`cr\` (measured on ${R.crMeasured})`, ''] : []),
    '| Check | Frames | Time | What |', '| --- | --- | --- | --- |'];
  for (const r of R.runs) L.push(`| ${r.id}${LIMITS.find(l => l.id === r.id).fail ? '' : ' (warn)'} | ${r.from}-${r.to} | ${t(r.from)}-${t(r.to + 1)} s | ${r.what} |`);
  L.push('', ...LIMITS.map(l => `- ${l.id} ${l.what}. Source: ${l.source}`));
  return L.join('\n') + '\n';
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {}; let film = null;
  if (argv[0] && !argv[0].startsWith('--')) film = path.resolve(ROOT, argv.shift());
  for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  const file = A.rows || (film && path.join(film, 'review', 'shot-rows.jsonl'));
  if (!file || !fs.existsSync(file)) { console.error('usage: textgate.mjs films/<slug> | --rows <rows.jsonl> [--json 1]  (no rows found)'); process.exit(2); }
  const rows = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
  const R = textgate(rows), md = report(R);
  if (film) fs.writeFileSync(path.join(film, 'review', 'textgate.md'), md);
  console.log(A.json ? JSON.stringify(R, null, 1) : md.trim());
  console.log(`textgate ${R.verdict} (${R.measured} frames${R.crUnmeasured ? `, contrast unmeasured on ${R.crUnmeasured}` : ''})`);
  process.exit(R.verdict === 'PASS' ? 0 : 1);
}
