// Camera and cut gate (◇5) on the final render. Cuts and takes are measured on the mp4's pixels; camera height and faces
// come from the film's camera data (__dbg), because the mp4 alone cannot tell how high the camera is or where a head is.
//   node styles/stick-man/tools/cutgate.mjs films/<slug>          -> review/cutgate.md, exit 1 unless PASS
// A film rendered in parts (a stub reel.js, the parts in s4/, s5/, s6/ ...) is read part by part, the parts back to back
// in the render in the order of their names. PARTIAL: no FAIL, but the camera could not be read, so C3 and C4 are not
// measured; it blocks the gate like a FAIL, with the reason.
//   node styles/stick-man/tools/cutgate.mjs --mp4 <file> [--dbg <jsonl> --w 720 --h 1280] [--json 1]
//        any mp4 (a reference clip, an old cut); --dbg adds the camera rows, --w/--h are the size the rows were made at
// A hard cut: the frame-to-frame scene score of ffmpeg (frames scaled to 270 wide) at or over 0.30; frames over it less
// than 0.2 s apart are one cut. Low camera: the camera looks up at the lead's head by more than 5°. Face cut off: less
// than half the lead's head box inside the frame. Cuts are counted in the worst 15 s window, not over the film.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalRender } from './renders.mjs';
import { run } from '../../../kit/env.mjs';
import { compress } from './faults.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const CUT_SCORE = 0.30, CUT_MERGE_S = 0.2, WINDOW_S = 15, LOW_DEG = 5, FACE_VISIBLE = 0.5;
// an angle family: where the camera stands around the lead (front, left, back, right: 90° sectors of the lead's facing),
// how it looks (low: up at the head over LOW_DEG, high: down over HIGH_DEG, else eye) and how big the head is (close:
// 20 % of the frame height or more, wide: under 8 %, else medium), read at the middle lead frame of each take
export const HIGH_DEG = 20, CLOSE_H = 0.2, WIDE_H = 0.08, ANGLE_WINDOW = 5;

const KAI_PICK = 'Kai 17/11 picked the bible escape cut (4 cuts in 15.4 s, longest take 6.7 s) over v7 (11 cuts, 2.3 s)';
export const LIMITS = [
  { id: 'C1', what: `hard cuts in the worst ${WINDOW_S} s`, key: 'worstWindow', max: 4,
    source: `${KAI_PICK}; v002 (16 in its worst 15 s) "cắt cảnh quá nhiều" 16/11; Rick clips 0-1` },
  { id: 'C2', what: 'longest take (s)', key: 'longestTake', min: 6.5,
    source: `${KAI_PICK}; v002's longest is 4.8 s; Rick clips 38-64 s` },
  { id: 'C3', what: 'low camera, share of lead frames', key: 'lowShare', max: 0.25,
    source: 'rejected: v002 16/11 "góc máy toàn góc máy thấp" (about half its shots labelled low or dutch; its reel data is gone), an old pilot film 53 % (real low shots); passed without a note: v7 5 %, its escape cut 10 %, the bible cut 1 %; a low angle stays a beat tool (animation-camera-pass), so not 0' },
  { id: 'C4', what: 'longest face cut off (s)', key: 'faceCutRun', max: 1,
    source: '"cam lia dưới, mà mặt nhân vật lại ở trên?" 12/11 (a held shot with the head out of frame, not measured); v7 0.1 s, the bible cut 0.03 s; a frame or two passing during a flight is not seen' },
  { id: 'C5', what: `takes in one angle family, most in any ${ANGLE_WINDOW} in a row`, key: 'angleRepeat', max: 3,
    source: 'was the AI review\'s "angle" row (S3-060 hit 2 of 2, no camera rows then); a film Kai approved (its A v9) banks run three back, eye-level, medium takes in a row (58.6-73.5 s) inside the 80 % Kai approved; four is a pattern a viewer reads as the same shot' },
];

export function sceneScores(mp4) {
  const r = run('ffmpeg', ['-hide_banner', '-nostats', '-loglevel', 'info', '-nostdin', '-i', mp4, '-an',
    '-vf', "scale=270:-2,select='gte(scene,0)',metadata=print:key=lavfi.scene_score", '-f', 'null', '-'], { capture: true });
  if (r.status) throw new Error(`ffmpeg could not read ${mp4}: ${(r.stderr || '').trim().split('\n').at(-1)}`);
  const out = []; let t = null;
  for (const l of r.stderr.split('\n')) {
    const pt = l.match(/pts_time:([\d.]+)/); if (pt) { t = Number(pt[1]); continue; }
    const s = l.match(/lavfi\.scene_score=([\d.]+)/); if (s && t != null) out.push({ t, score: Number(s[1]) });
  }
  return out;
}

export function duration(mp4) {
  const r = run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], { capture: true });
  const d = Number(r.stdout);
  if (r.status || !(d > 0)) throw new Error(`ffprobe could not read the duration of ${mp4}`);
  return d;
}

export function hardCuts(scores) {
  const cuts = []; let last = -Infinity;
  for (const { t, score } of scores) {
    if (score < CUT_SCORE) continue;
    if (t - last > CUT_MERGE_S) cuts.push({ t, score });
    last = t;
  }
  return cuts;
}

export function longestTake(cuts, dur) {
  const edges = [0, ...cuts.map(c => c.t), dur];
  let best = { s: 0, from: 0, to: 0 };
  for (let i = 1; i < edges.length; i++) if (edges[i] - edges[i - 1] > best.s) best = { s: edges[i] - edges[i - 1], from: edges[i - 1], to: edges[i] };
  return best;
}

const visible = ([x0, y0, x1, y1], W, H) =>
  Math.max(0, Math.min(x1, W) - Math.max(x0, 0)) * Math.max(0, Math.min(y1, H) - Math.max(y0, 0)) / ((x1 - x0) * (y1 - y0));
const lookUp = (cam, head) => Math.atan2(head[2] - cam[2], Math.hypot(head[0] - cam[0], head[1] - cam[1])) * 180 / Math.PI;

export function viewRows(rows, W, H) {
  return rows.flatMap(r => {
    const leads = Object.values(r.actors).filter(a => a.lead && a.inFrame && a.headW);
    if (!leads.length) return [];
    return [{ f: r.f, up: Math.max(...leads.map(a => lookUp(r.camera.pos, a.headW))), face: Math.min(...leads.map(a => visible(a.head, W, H))) }];
  });
}

const SIDES = ['front', 'left', 'back', 'right'];
export function angleFamily(r, H) {
  const a = Object.values(r.actors).find(x => x.lead && x.inFrame && x.headW && x.head && x.pos);
  if (!a) return null;
  const c = r.camera.pos, rel = ((Math.atan2(c[1] - a.pos[1], c[0] - a.pos[0]) * 180 / Math.PI - (a.yaw ?? 0)) % 360 + 360) % 360;
  const up = lookUp(c, a.headW), h = (a.head[3] - a.head[1]) / H;
  return `${SIDES[Math.round(rel / 90) % 4]} ${up > LOW_DEG ? 'low' : up < -HIGH_DEG ? 'high' : 'eye'} ${h >= CLOSE_H ? 'close' : h < WIDE_H ? 'wide' : 'medium'}`;
}

// per take (render frames between cuts), its angle family; the most takes of one family in any ANGLE_WINDOW in a row
export function angles(rows, cuts, dur, H, fps = 30) {
  const edges = [0, ...cuts.map(c => Math.round(c.t * fps)), Math.round(dur * fps)], byF = new Map(rows.map(r => [r.f, r]));
  const takes = edges.slice(1).map((b, k) => {
    const lead = []; for (let f = edges[k]; f < b; f++) { const r = byF.get(f); if (r && angleFamily(r, H)) lead.push(r); }
    return { t0: edges[k] / fps, t1: b / fps, family: lead.length ? angleFamily(lead[lead.length >> 1], H) : null };
  });
  let worst = { n: 0, family: null, from: 0 };
  takes.forEach((_, i) => {
    const win = takes.slice(i, i + ANGLE_WINDOW).filter(t => t.family), n = {};
    for (const t of win) { n[t.family] = (n[t.family] || 0) + 1; if (n[t.family] > worst.n) worst = { n: n[t.family], family: t.family, from: takes[i].t0 }; }
  });
  return { takes, worst };
}

export function worstWindow(cuts) {
  let best = { n: 0, from: 0 };
  for (const c of cuts) { const n = cuts.filter(d => d.t >= c.t && d.t < c.t + WINDOW_S).length; if (n > best.n) best = { n, from: c.t }; }
  return best;
}

function longestRun(frames) {
  let best = 0, run0 = 0;
  frames.forEach((f, i) => { run0 = i && f === frames[i - 1] + 1 ? run0 + 1 : 1; best = Math.max(best, run0); });
  return best;
}

export function measure({ dur, scores, rows = null, W, H, fps = 30 }) {
  const cuts = hardCuts(scores), take = longestTake(cuts, dur), win = worstWindow(cuts);
  const m = { dur, cuts, cutsPerMin: cuts.length * 60 / dur, worstWindow: win.n, win, longestTake: take.s, take };
  if (!rows) return m;
  const v = viewRows(rows, W, H), low = v.filter(x => x.up > LOW_DEG).map(x => x.f), faceCut = v.filter(x => x.face < FACE_VISIBLE).map(x => x.f);
  const ang = angles(rows, cuts, dur, H, fps);
  return { ...m, leadFrames: v.length, low, lowShare: v.length ? low.length / v.length : 0, faceCut, faceCutRun: longestRun(faceCut) / fps,
    angleTakes: ang.takes, angleRepeat: ang.worst.n, angleWorst: ang.worst };
}

export function judge(m) {
  return LIMITS.map(l => {
    const got = m[l.key];
    if (got == null) return { ...l, got: null, ok: null };
    return { ...l, got, ok: l.max != null ? got <= l.max : got >= l.min };
  });
}

const fmt = (key, v) => v == null ? 'n/a' : /Share/.test(key) ? `${Math.round(v * 100)}%` : Number.isInteger(v) ? String(v) : v.toFixed(1);
const want = l => l.max != null ? `≤ ${fmt(l.key, l.max)}` : `≥ ${fmt(l.key, l.min)}`;

export function table(m, rows) {
  return ['| Check | Got | Limit | Result | Limit from |', '| --- | --- | --- | --- | --- |',
    ...rows.map(r => `| ${r.id} ${r.what} | ${fmt(r.key, r.got)} | ${want(r)} | ${r.ok == null ? 'not measured' : r.ok ? 'PASS' : 'FAIL'} | ${r.source} |`), '',
    `Hard cuts (${m.cuts.length} in ${m.dur.toFixed(1)} s, ${m.cutsPerMin.toFixed(1)} a minute): ${m.cuts.map(c => c.t.toFixed(2)).join(' ') || 'none'}.`,
    `Worst ${WINDOW_S} s from ${m.win.from.toFixed(1)} s. Longest take ${m.take.from.toFixed(1)}-${m.take.to.toFixed(1)} s.`,
    ...(m.angleTakes ? ['', `Angle families by take: ${m.angleTakes.map(t => `${t.t0.toFixed(1)} ${t.family ?? 'no lead'}`).join(' · ')}.${m.angleWorst.n ? ` Most: ${m.angleWorst.n} x ${m.angleWorst.family} from ${m.angleWorst.from.toFixed(1)} s.` : ''}`] : [])];
}

const readRows = f => fs.readFileSync(f, 'utf8').trim().split('\n').map(l => JSON.parse(l)).sort((a, b) => a.f - b.f);

// Where the render's frames come from: [{ dir, f0, f1, at }], reel frames f0-f1 of dir are render frames at, at + 1, ...
export async function segments(DIR, dur, reelSpan) {
  const [r0, r1] = await reelSpan(DIR);
  let segs = [{ dir: DIR, f0: r0, f1: r1, at: 0 }];
  if (r1 - r0 < 30) {
    const parts = fs.readdirSync(DIR).filter(d => /^s\d+$/.test(d) && fs.existsSync(path.join(DIR, d, 'reel.js'))).sort((a, b) => a.slice(1) - b.slice(1));
    if (!parts.length) throw new Error(`the reel spans frames ${r0}-${r1} and there are no parts (s<n>/reel.js)`);
    let at = 0; segs = [];
    for (const d of parts) { const [f0, f1] = await reelSpan(path.join(DIR, d)); segs.push({ dir: path.join(DIR, d), f0, f1, at }); at += f1 - f0 + 1; }
  }
  const n = segs.reduce((a, s) => a + s.f1 - s.f0 + 1, 0);
  if (Math.abs(n / 30 - dur) > 1) throw new Error(`${segs.map(s => `${path.relative(DIR, s.dir) || 'reel'} ${s.f0}-${s.f1}`).join(' + ')} is ${(n / 30).toFixed(1)} s, the render ${dur.toFixed(1)} s`);
  return segs;
}

export const verdict = res => res.some(r => r.ok === false) ? 'FAIL' : res.some(r => r.ok == null) ? 'PARTIAL' : 'PASS';
const unmeasured = res => res.filter(r => r.ok == null).map(r => r.id).join(', ');

async function filmMode(film) {
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p);
  const final = finalRender(F('renders'));
  if (!final) { console.error(`${film}: no final render in renders/`); process.exit(1); }
  const { reelSpan, cachedReelDbg, DBG_W, DBG_H } = await import('./reel_load.mjs');
  const mp4 = F(`renders/${final}`), dur = duration(mp4);
  let rows = null, unread = '';
  try {
    rows = (await segments(DIR, dur, reelSpan)).flatMap(s => cachedReelDbg(s.dir, s.f0, s.f1)
      .filter(r => r.f >= s.f0 && r.f <= s.f1).map(r => ({ ...r, f: s.at + r.f - s.f0 })));
  } catch (e) { unread = e.message.split('\n')[0]; }
  const m = measure({ dur, scores: sceneScores(mp4), rows, W: DBG_W, H: DBG_H }), res = judge(m), v = verdict(res);
  const nF = res.filter(r => r.ok === false).length;
  fs.mkdirSync(F('review'), { recursive: true });
  fs.writeFileSync(F('review/cutgate.md'), [`# Camera and cut gate · ${final}`, '',
    v === 'PARTIAL' ? `**PARTIAL**: cuts pass, ${unmeasured(res)} not measured, so this is not a PASS` : `**${v}**: ${nF} FAIL`, '', ...table(m, res),
    unread ? `Camera not read: ${unread}.` : '',
    m.low?.length ? `Low camera, render frames: ${compress(m.low)}.` : '', m.faceCut?.length ? `Face cut off, render frames: ${compress(m.faceCut)}.` : ''].join('\n') + '\n');
  console.log(`review/cutgate.md: ${v} · ${res.map(r => `${r.id} ${fmt(r.key, r.got)}`).join(', ')} · ${final}${unread ? ` · camera not read: ${unread}` : ''}`);
  process.exit(v === 'PASS' ? 0 : 1);
}

function fileMode(A) {
  const mp4 = path.resolve(A.mp4), rows = A.dbg ? readRows(path.resolve(A.dbg)) : null;
  const m = measure({ dur: duration(mp4), scores: sceneScores(mp4), rows, W: Number(A.w || 540), H: Number(A.h || 960) }), res = judge(m);
  const v = verdict(res);
  if (A.json) console.log(JSON.stringify({ file: mp4, ...m, verdict: v, results: res }));
  else console.log([`${path.basename(mp4)}: ${v}${v === 'PARTIAL' ? ` (${unmeasured(res)} not measured: give --dbg)` : ''}`, ...table(m, res)].join('\n'));
  process.exit(v === 'PASS' ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [first, ...rest] = process.argv.slice(2);
  const USAGE = 'usage: cutgate.mjs films/<slug> | cutgate.mjs --mp4 <file> [--dbg <jsonl> --w <px> --h <px>] [--json 1]';
  if (!first || first === '--help' || first === '-h') { console[first ? 'log' : 'error'](USAGE); process.exit(first ? 0 : 2); }
  if (first.startsWith('--')) {
    const A = {}, args = [first, ...rest]; for (let i = 0; i < args.length; i += 2) A[args[i].replace(/^--/, '')] = args[i + 1];
    if (!A.mp4) { console.error(USAGE); process.exit(2); }
    fileMode(A);
  } else await filmMode(first);
}
