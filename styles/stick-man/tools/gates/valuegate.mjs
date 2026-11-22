// Value gate (Kai 22/11, Hot Money ep01 A v9: "the burnt patch around the door" in segment 3, subjects that must read):
// two faults of the picture's values that a grade or a light can make, measured on the final mp4.
//   glare   a blown area: the picture blurred over ~1/20 of its width is bright (luma >= 200) AND a hot pool against its own
//           frame (>= GLARE.over above the frame's median luma: a lit white lobby by day is bright but even) on more than
//           GLARE.share of the frame, or pixels at the clip (luma >= 250) cover more than CLIP.share; held >= HOLD s (a muzzle flash
//           or a lamp's spark is shorter, a lamp's hot core smaller)
//   blown object (Kai 22/11, "the money bags and the lamps keep blowing out"): any one object, whatever share of the frame
//           it is. A connected region (after a 3x3 opening, so caption and HUD strokes drop out; the figures' own white is
//           left out: head, hood, torso and sleeves, projected from the rows' joints (FIGURE), so a bag in the hand still counts) of colourless (saturation < BLOWN.sat), detail-less (3x3 luma
//           range <= BLOWN.lc) pixels as bright as BLOWN.white or BLOWN.over above the frame's median, of BLOWN.area px or
//           more at W x H, or of clipped pixels (>= BLOWN.clip) of BLOWN.clipArea px or more, held >= HOLD s. A bag at 1 % of the
//           frame passes the glare share and fails here.
//   light rides a figure (Kai 23/11, A v11 0:16: "light comes FROM the character"): from the rows' `lights` alone, a light
//           that is not a lamp the figure carries and travels with a figure's head (RIDE): its pool slides over every wall
//   crushed shadows on a subject: inside the subject's box (from the render's rows: each actor's head box, widened 1.6x and
//           run down 3 head heights for the body) more than CRUSH.share of the pixels are near black (luma <= 10)
// Pictures are sampled at FPS a second at W x H with the HUD bands cropped (top 10 %, bottom 12 %).
//   node styles/stick-man/tools/gates/valuegate.mjs films/<slug>       the final render in renders/, rows from review/shot-rows.jsonl
//   node styles/stick-man/tools/gates/valuegate.mjs --mp4 <file> [--rows <rows.jsonl>] [--crop-top 0.25] [--json 1]   -> exit 1 on a fault
// Run at ◇5 (GATES.json, beside colourgate). Without rows the subjects are not checked (the report says so).
import fs from 'node:fs'; import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { run } from '../../../../kit/env.mjs';
import { finalRender } from '#tools/render/renders.mjs';
import { project } from './shotfaults.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

export const W = 180, H = 320, FPS = 4, CROP = { top: 0.10, bottom: 0.12 };
export const GLARE = { luma: 200, over: 90, share: 0.03, radius: 9 }, CLIP = { luma: 250, share: 0.01 }, CRUSH = { luma: 10, share: 0.08 }, HOLD = 0.5;
export const BLOWN = { white: 200, over: 80, sat: 0.2, lc: 4, area: 30, clip: 248, clipArea: 6 };
// the white of a stick figure the blown check leaves out, in metres round the rows' joints: the head and hood, the neck, the
// hoodie's torso, the sleeves to just short of the hand (whatever the hand holds still counts)
export const FIGURE = { hood: 0.36, neck: 0.12, torso: 0.13, sleeve: 0.075, sleeveTo: 0.75 };
// light rides a figure: a light that is no carried lamp keeps within RIDE.near m of a figure's head while the head travels
// RIDE.move m or more in RIDE.span frames, and the light travels with it (its path off the head's by <= RIDE.slack of the move)
export const RIDE = { near: 3, move: 0.6, span: 15, slack: 0.3 };

const lum = (p, i) => 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
// a box blur of the luma plane (two passes of a running mean), so one bright edge does not count as an area
function blur(Y, w, h, r) {
  const t = new Float32Array(Y.length), o = new Float32Array(Y.length);
  for (let y = 0; y < h; y++) { let s = 0; for (let x = -r; x <= r; x++) s += Y[y * w + Math.min(w - 1, Math.max(0, x))];
    for (let x = 0; x < w; x++) { t[y * w + x] = s / (2 * r + 1); s += Y[y * w + Math.min(w - 1, x + r + 1)] - Y[y * w + Math.max(0, x - r)]; } }
  for (let x = 0; x < w; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[Math.min(h - 1, Math.max(0, y)) * w + x];
    for (let y = 0; y < h; y++) { o[y * w + x] = s / (2 * r + 1); s += t[Math.min(h - 1, y + r + 1) * w + x] - t[Math.max(0, y - r) * w + x]; } }
  return o;
}
// mask (Uint8Array w x h) -> the same after a 3x3 erode then dilate (thin strokes go, solid shapes stay)
function open3(m, w, h) {
  const pass = (src, keep) => { const o = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let all = 1, any = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const yy = y + dy, xx = x + dx;
        const v = yy >= 0 && yy < h && xx >= 0 && xx < w ? src[yy * w + xx] : 0; all &= v; any |= v; }
      o[y * w + x] = keep ? all : any; }
    return o; };
  return pass(pass(m, 1), 0);
}
// connected regions (4-neighbour) of a mask -> [{ n, box: [x0, y0, x1, y1] }], largest first
export function regions(m, w, h) {
  const seen = new Uint8Array(m.length), out = [], st = [];
  for (let i = 0; i < m.length; i++) { if (!m[i] || seen[i]) continue;
    let n = 0, x0 = w, y0 = h, x1 = 0, y1 = 0; st.push(i); seen[i] = 1;
    while (st.length) { const j = st.pop(), x = j % w, y = (j - x) / w; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const k of [j - 1, j + 1, j - w, j + w]) if (k >= 0 && k < m.length && m[k] && !seen[k] && Math.abs((k % w) - x) <= 1) { seen[k] = 1; st.push(k); } }
    out.push({ n, box: [x0, y0, x1, y1] }); }
  return out.sort((a, b) => b.n - a.n);
}
// the largest blown object of one frame (BLOWN above): { n, box, kind: 'clipped' | 'white' } or null; boxes = the figures' heads and torsos to skip
export function blownObject(px, Y, w, h, boxes = [], crop = CROP) {
  const y0 = Math.floor(crop.top * h), y1 = Math.ceil((1 - crop.bottom) * h), inFig = boxes instanceof Uint8Array ? boxes : new Uint8Array(w * h);
  if (!(boxes instanceof Uint8Array)) for (const [a, b, e, d] of boxes) for (let y = Math.max(0, Math.floor(b)); y < Math.min(h, Math.ceil(d)); y++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(w, Math.ceil(e)); x++) inFig[y * w + x] = 1;
  const hist = new Uint32Array(256); let n = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { hist[Math.min(255, Y[y * w + x] | 0)]++; n++; }
  let med = 0, acc = hist[0]; while (med < 255 && acc < n / 2) acc += hist[++med];
  const bright = Math.min(BLOWN.white, med + BLOWN.over), white = new Uint8Array(w * h), clip = new Uint8Array(w * h);
  for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x; if (inFig[i]) continue;
    const v = Y[i]; if (v >= BLOWN.clip) clip[i] = 1;
    if (v < bright) continue;
    let lo = 255, hi = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const u = Y[i + dy * w + dx]; if (u < lo) lo = u; if (u > hi) hi = u; }
    const r = px[3 * i], g = px[3 * i + 1], b = px[3 * i + 2], mx = Math.max(r, g, b), sat = mx ? (mx - Math.min(r, g, b)) / mx : 0;
    if (hi - lo <= BLOWN.lc && sat < BLOWN.sat) white[i] = 1; }
  const c = regions(open3(clip, w, h), w, h)[0], wr = regions(open3(white, w, h), w, h)[0];
  if (c && c.n >= BLOWN.clipArea) return { ...c, kind: 'clipped' };
  if (wr && wr.n >= BLOWN.area) return { ...wr, kind: 'white' };
  return null;
}
// one rgb24 frame -> { glare, clip, crush: [per subject share], blown }; boxes in this frame's pixels [x0, y0, x1, y1]
export function frameValues(px, w, h, boxes = [], crop = CROP, heads = []) {
  const Y = new Float32Array(w * h); for (let i = 0; i < w * h; i++) Y[i] = lum(px, 3 * i);
  const B = blur(Y, w, h, GLARE.radius), y0 = Math.floor(crop.top * h), y1 = Math.ceil((1 - crop.bottom) * h);
  const hist = new Uint32Array(256); let n = 0, g = 0, c = 0;
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { hist[Math.min(255, Y[y * w + x] | 0)]++; n++; }
  let med = 0, acc = hist[0]; while (med < 255 && acc < n / 2) acc += hist[++med];
  const hot = Math.max(GLARE.luma, med + GLARE.over);
  for (let y = y0; y < y1; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (B[i] >= hot) g++; if (Y[i] >= CLIP.luma) c++; }
  const crush = boxes.map(([a, b, e, d]) => { let m = 0, k = 0;
    for (let y = Math.max(y0, Math.floor(b)); y < Math.min(y1, Math.ceil(d)); y++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(w, Math.ceil(e)); x++) { m++; if (Y[y * w + x] <= CRUSH.luma) k++; }
    return m > 40 ? k / m : 0; });
  return { glare: g / n, clip: c / n, crush, blown: blownObject(px, Y, w, h, heads, crop) };
}
// the subject boxes of a rows line (head boxes in the render's 1080 x 1920 pixels) in a w x h frame
export function subjectBoxes(row, w = W, h = H, RW = row?.px?.[0] ?? 1080, RH = row?.px?.[1] ?? 1920) {
  return Object.values(row?.actors || {}).filter(a => a.inFrame !== false && a.head).map(a => {
    const [x0, y0, x1, y1] = a.head, cx = (x0 + x1) / 2, hw = (x1 - x0) * 0.8, hh = y1 - y0;
    return [(cx - hw) * w / RW, y0 * h / RH, (cx + hw) * w / RW, (y1 + 3 * hh) * h / RH];
  });
}
// the figures' heads and torsos (a stick head and the white hoodie are flat by design: the toon ramp's lit band); the box
// stops 1.6 head-heights below the head, so a bag held at the waist or in a hand still counts
export function headBoxes(row, w = W, h = H, RW = row?.px?.[0] ?? 1080, RH = row?.px?.[1] ?? 1920) {
  return Object.values(row?.actors || {}).filter(a => a.inFrame !== false && a.head).map(({ head: [x0, y0, x1, y1] }) => {
    const cx = (x0 + x1) / 2, hw = (x1 - x0) * 0.8, hh = y1 - y0;   // 1.6 head widths: the hoodie's shoulders
    return [(cx - hw) * w / RW, y0 * h / RH, (cx + hw) * w / RW, (y1 + 1.6 * hh) * h / RH]; });
}
// the figures' own white, from the rows' joints through the row's camera (FIGURE): a mask w x h, or the head boxes for rows
// without joints. A held bag is outside it: the sleeve stops short of the hand (Kai 23/11: the bag in the hand at 0:12 was a
// glowing white block, and the old box, 1.6 head heights under the head, hid it)
export function figureMask(row, w = W, h = H) {
  const A = Object.values(row?.actors || {}).filter(a => a.inFrame !== false);
  const cam = row?.camera, F = cam && cam.target.map((x, i) => x - cam.pos[i]);
  if (!cam || !A.length || A.some(a => !a.headW || !a.limbs?.L?.shoulder) || Math.abs(F[2]) > 0.995 * Math.hypot(...F)) return headBoxes(row, w, h);   // straight down: project() has no right vector
  const m = new Uint8Array(w * h), [ox, oy] = (cam.offset || [0, 0]).map(v => v * h / 1920);   // play.js setViewOffset: the picture moves by -offset (1920-px units)
  const px = P => { const n = project(cam, P, w, h); return n && [(n[0] + 1) / 2 * w - ox, (1 - n[1]) / 2 * h - oy]; };
  const rad = (P, r) => { const a = px(P); if (!a) return 0;   // the longest of the three axes on screen: a top-down shot sees x, y, not z
    return Math.max(...[[r, 0, 0], [0, r, 0], [0, 0, r]].map(d => { const b = px(P.map((x, i) => x + d[i])); return b ? Math.hypot(b[0] - a[0], b[1] - a[1]) : 0; })); };
  const capsule = (P, Q, r) => { const a = px(P), b = px(Q), R = rad(mixP(P, Q, 0.5), r); if (!a || !b || !R) return;
    const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
    for (let y = Math.max(0, Math.floor(Math.min(a[1], b[1]) - R)); y <= Math.min(h - 1, Math.ceil(Math.max(a[1], b[1]) + R)); y++)
      for (let x = Math.max(0, Math.floor(Math.min(a[0], b[0]) - R)); x <= Math.min(w - 1, Math.ceil(Math.max(a[0], b[0]) + R)); x++) {
        const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / L2));
        if (Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy) <= R) m[y * w + x] = 1; } };
  for (const a of A) { const { L, R } = a.limbs, sh = mixP(L.shoulder, R.shoulder, 0.5), hip = mixP(L.hip, R.hip, 0.5);
    capsule(a.headW, a.headW, FIGURE.hood); capsule(a.headW, sh, FIGURE.neck);
    for (const [p, q] of [[L.shoulder, R.shoulder], [L.hip, R.hip], [sh, hip], [L.shoulder, L.hip], [R.shoulder, R.hip], [L.shoulder, R.hip], [R.shoulder, L.hip]]) capsule(p, q, FIGURE.torso);
    for (const S of [L, R]) if (S.elbow && S.hand) { capsule(S.shoulder, S.elbow, FIGURE.sleeve); capsule(S.elbow, mixP(S.elbow, S.hand, FIGURE.sleeveTo), FIGURE.sleeve); } }
  return m;
}
const mixP = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);
// rows -> [{ kind: 'light rides a figure', from, to, peak, who }]: a light (rows' `lights`, engine/play.js) that is not a carried
// lamp and travels with a figure's head (RIDE). Kai 23/11, A v11 0:16: "light comes FROM the character" (a film's key light
// that followed the hero's head pooled on every wall, door and lid he passed)
export function lightRides(rows) {
  const out = [], byId = new Map();
  rows.forEach((r, i) => { for (const l of r.lights || []) if (!l.carried) (byId.get(l.id) || byId.set(l.id, []).get(l.id)).push({ i, f: r.f, pos: l.pos, r }); });
  for (const [id, seq] of byId) { let run = null;
    for (let k = 0, j = 0; k < seq.length; k++) { const a = seq[k]; while (j < seq.length && seq[j].f - a.f < RIDE.span) j++;
      const b = seq[j]; if (!b || b.f - a.f > 2 * RIDE.span) continue;
      const who = Object.entries(a.r.actors || {}).find(([n, x]) => x.headW && b.r.actors?.[n]?.headW && Math.hypot(...x.headW.map((v, i) => v - a.pos[i])) <= RIDE.near);
      if (!who) continue;
      const dA = b.r.actors[who[0]].headW.map((v, i) => v - who[1].headW[i]), dL = b.pos.map((v, i) => v - a.pos[i]), mv = Math.hypot(...dA);
      const rides = mv >= RIDE.move && Math.hypot(...dL.map((v, i) => v - dA[i])) <= RIDE.slack * mv;
      if (rides && run && a.f - run.to <= RIDE.span) { run.to = b.f; run.peak = Math.max(run.peak, mv); }
      else if (rides) { if (run) out.push(run); run = { kind: 'light rides a figure', from: a.f, to: b.f, peak: mv, unit: 'm', who: who[0], id }; } }
    if (run) out.push(run); }
  return out;
}
// samples [{ t, glare, clip, crush }] -> faults held >= HOLD s: [{ kind, from, to, peak }]
export function faults(S) {
  const out = [], need = Math.max(1, Math.round(HOLD * FPS));
  const runs = (kind, bad, val) => { let a = -1;
    for (let i = 0; i <= S.length; i++) { const b = i < S.length && bad(S[i]);
      if (b && a < 0) a = i;
      if (!b && a >= 0) { if (i - a >= need) out.push({ kind, from: +S[a].t.toFixed(2), to: +S[i - 1].t.toFixed(2), peak: +Math.max(...S.slice(a, i).map(val)).toFixed(3) }); a = -1; } } };
  runs('glare', s => s.glare > GLARE.share || s.clip > CLIP.share, s => Math.max(s.glare, s.clip));
  runs('crushed subject', s => s.crush.some(x => x > CRUSH.share), s => Math.max(0, ...s.crush));
  runs('blown object', s => !!s.blown, s => s.blown ? s.blown.n / (W * H) : 0);
  for (const f of out) if (f.kind === 'blown object') { const s = S.find(x => x.blown && x.t >= f.from); if (s) f.where = { kind: s.blown.kind, px: s.blown.n, box: s.blown.box }; }
  return out;
}
export function valuegate(mp4, rows = [], crop = CROP) {
  const r = run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', mp4, '-an', '-vf', `fps=${FPS},scale=${W}:${H},format=rgb24`, '-f', 'rawvideo', '-'],
    { capture: true, encoding: 'buffer', maxBuffer: 2 ** 31 });
  if (r.status) throw new Error(`ffmpeg could not read ${mp4}`);
  const F = W * H * 3, byF = new Map(rows.map(x => [x.f, x])), S = [];
  for (let i = 0; (i + 1) * F <= r.stdout.length; i++) { const t = (i + 0.5) / FPS, row = byF.get(Math.round(t * 30));
    S.push({ t, ...frameValues(r.stdout.subarray(i * F, (i + 1) * F), W, H, subjectBoxes(row), crop, figureMask(row)) }); }
  const found = [...faults(S), ...lightRides(rows).map(x => ({ ...x, from: +(x.from / 30).toFixed(2), to: +(x.to / 30).toFixed(2) }))];
  return { ok: !found.length, faults: found, samples: S.length };
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), A = {};
  let mp4, rowsFile;
  if (argv[0] && !argv[0].startsWith('--')) {
    const DIR = path.resolve(ROOT, argv[0]), final = finalRender(path.join(DIR, 'renders'));
    if (!final) { console.error(`${argv[0]}: no final render in renders/`); process.exit(1); }
    mp4 = path.join(DIR, 'renders', final); const r = path.join(DIR, 'review', 'shot-rows.jsonl'); rowsFile = fs.existsSync(r) ? r : null;
    for (let i = 1; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
  } else {
    for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
    mp4 = A.mp4; rowsFile = A.rows;
  }
  if (!mp4) { console.error('usage: valuegate.mjs films/<slug> | --mp4 <file> [--rows <rows.jsonl>] [--crop-top 0.25] [--json 1]'); process.exit(2); }
  const rows = rowsFile ? fs.readFileSync(rowsFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const R = valuegate(mp4, rows, A['crop-top'] ? { ...CROP, top: Number(A['crop-top']) } : CROP);   // --crop-top: a HUD lower than the default band
  if (A.json) console.log(JSON.stringify(R, null, 1));
  else { for (const f of R.faults) console.log(f.kind === 'light rides a figure' ? `FAIL light rides a figure ${f.from}-${f.to} s: a light travels with ${f.who} (${f.peak.toFixed(1)} m); no light follows a figure unless it is a lamp the figure carries` : `FAIL ${f.kind} ${f.from}-${f.to} s (peak ${(f.peak * 100).toFixed(1)} %)${f.where ? ` ${f.where.kind} ${f.where.px} px at ${f.where.box.join(',')} (${W}x${H})` : ''}`); if (R.faults.some(f => f.kind === 'blown object')) console.log('why: node styles/stick-man/tools/gates/blame.mjs --film <part> --frame <f> --box <the box above> (one render per light source, ranked)'); console.log(`valuegate ${R.ok ? 'PASS' : 'FAIL'} (${R.samples} samples${rows.length ? '' : ', no rows: subjects not checked'})`); }
  process.exit(R.ok ? 0 : 1);
}
