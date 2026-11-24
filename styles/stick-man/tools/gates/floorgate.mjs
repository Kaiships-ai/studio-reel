// Sound floor gate on a render: the film never goes empty under its words. Measured on the final mix and the kit mixer's
// stems as they sit in the mix (audio/stems/{vo_m,sfx,music,amb}.wav, tools/run/mix.py).
//   node styles/stick-man/tools/gates/floorgate.mjs films/<slug>                -> review/floorgate.md, exit 1 unless PASS
//   node styles/stick-man/tools/gates/floorgate.mjs --mp4 <file> [--vo <wav>] [--bed <wav>[,<wav>...]] [--silences a-b,..] [--json 1]
// F1 holes: the whole mix under -30 dBFS (100 ms RMS) for 0.3 s or more, outside a planned silence (sound-plan.json
//    "silences") and the first and last 0.2 s
// F2 bed under the voice: while the voice speaks, the effects + music + ambience (the bed) more than 18 dB under the voice,
//    2 s windows, held 4 s or more
// F3 the close: the bed over the last 6 s at least as loud as the film's median bed (a closing question that lands)
// With no stems only F1 is measured and the verdict is PARTIAL. The film behind each limit is its `source` in LIMITS.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { finalRender } from '#tools/render/renders.mjs';
import { pcm, SR } from './soundgate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const HOLE_DB = -30, HOLE_S = 0.3, EDGE_S = 0.2, GAP_DB = 18, GAP_S = 4, WIN_S = 2, CLOSE_S = 6, CLOSE_DB = 0, VOICE_ON_DB = 20;
export const LIMITS = [
  { id: 'F1', what: `holes: the mix under ${HOLE_DB} dBFS for ${HOLE_S} s or more`, key: 'holes', max: 0,
    source: 'Ep1 (24/11), this meter on the mix: v15 19 holes (9.6 s); H2 V2.1 0 (its mixer fills them); a blind viewer named the half-second holes of the cut before V2.1' },
  { id: 'F2', what: `bed under the voice by more than ${GAP_DB} dB for ${GAP_S} s or more`, key: 'thin', max: 0,
    source: 'Ep1, this meter: v15 0-25.5 s and 52-90 s (worst 34 dB; the bank explanation, where the YouTube audience dropped at 0:53); H2 V2.1 none' },
  { id: 'F3', what: `the last ${CLOSE_S} s: bed vs the film's median bed (dB)`, key: 'close', min: -CLOSE_DB,
    source: 'Ep1, this meter: v15 -1.6 dB ("the film asks and nobody feels asked", the cold watch of 24/11); H2 V2.1 +4.2 dB' },
];

const db = x => 10 * Math.log10(Math.max(x, 1e-12));
// mean power per block of n samples, mono
export function blocks(x, n) { const out = []; for (let i = 0; i + n <= x.length; i += n) { let s = 0; for (let k = i; k < i + n; k++) s += x[k] * x[k]; out.push(s / n); } return out; }
export function sumMono(list) { const n = Math.min(...list.map(x => x.length)), out = new Float32Array(n); for (const x of list) for (let i = 0; i < n; i++) out[i] += x[i]; return out; }
const inside = (t, spans) => spans.some(([a, b]) => t >= a && t <= b);

export function holes(mix, silences = []) {
  const P = blocks(mix, SR / 10), runs = []; let a = -1;
  for (let i = 0; i <= P.length; i++) {
    const t = i / 10, low = i < P.length && db(P[i]) < HOLE_DB && t >= EDGE_S && t <= P.length / 10 - EDGE_S - 0.1 && !inside(t, silences);
    if (low && a < 0) a = i;
    if (!low && a >= 0) { if ((i - a) / 10 >= HOLE_S) runs.push({ from: a / 10, to: i / 10 }); a = -1; }
  }
  return runs;
}
// 2 s windows every 0.5 s: the voice level where it speaks (blocks within VOICE_ON_DB of its loud level) and the bed's
export function gaps(vo, bed) {
  const P = blocks(vo, SR / 20), loud = [...P].sort((p, q) => p - q)[Math.floor(0.95 * (P.length - 1))] ?? 0;
  const on = P.map(p => db(p) >= db(loud) - VOICE_ON_DB), B = blocks(bed, SR / 20), out = [];
  for (let i = 0; i + WIN_S * 20 <= P.length; i += 10) {
    let v = 0, nv = 0, b = 0; for (let k = i; k < i + WIN_S * 20; k++) { b += B[k] ?? 0; if (on[k]) { v += P[k]; nv++; } }
    out.push({ t: i / 20, gap: nv >= 8 ? db(v / nv) - db(b / (WIN_S * 20)) : null });
  }
  return out;
}
export function thinRuns(G) {
  const runs = []; let a = null;
  for (let i = 0; i <= G.length; i++) {
    const bad = i < G.length && G[i].gap != null && G[i].gap > GAP_DB;
    if (bad && a == null) a = i;
    if (!bad && a != null) { const from = G[a].t, to = G[i - 1].t + WIN_S; if (to - from >= GAP_S) runs.push({ from, to, worst: Math.max(...G.slice(a, i).map(g => g.gap)) }); a = null; }
  }
  return runs;
}
export function closing(bed) {
  const median = a => [...a].sort((p, q) => p - q)[Math.floor(a.length / 2)];
  const P = blocks(bed, SR / 2).map(db), med = median(P), end = median(P.slice(-CLOSE_S * 2));
  return { end, median: med, close: end - med };
}

export function measure({ mix, vo = null, beds = [], silences = [] }) {
  const m = pcm(mix), H = holes(m, silences), out = { holes: H.length, holeRuns: H, holeS: +H.reduce((s, r) => s + r.to - r.from, 0).toFixed(1), thin: null, thinRuns: [], close: null };
  if (vo && beds.length) {
    const bed = sumMono(beds.map(f => pcm(f))), runs = thinRuns(gaps(pcm(vo), bed)), c = closing(bed);
    Object.assign(out, { thin: runs.length, thinRuns: runs, close: +c.close.toFixed(1), closeEnd: +c.end.toFixed(1), bedMedian: +c.median.toFixed(1) });
  }
  return out;
}
export function judge(m) {
  return LIMITS.map(l => { const got = m[l.key]; if (got == null) return { ...l, got, ok: null }; return { ...l, got, ok: l.max != null ? got <= l.max : got >= l.min }; });
}
export const verdict = res => res.some(r => r.ok === false) ? 'FAIL' : res.some(r => r.ok == null) ? 'PARTIAL' : 'PASS';
export function table(m, res) {
  const s = x => x.toFixed(1);
  return ['| Check | Got | Result | Limit from |', '| --- | --- | --- | --- |',
    ...res.map(r => `| ${r.id} ${r.what} | ${r.got == null ? 'n/a' : r.got} | ${r.ok == null ? 'not measured' : r.ok ? 'PASS' : 'FAIL'} | ${r.source} |`), '',
    `Holes: ${m.holes} (${m.holeS} s)${m.holeRuns.length ? `: ${m.holeRuns.slice(0, 12).map(r => `${s(r.from)}-${s(r.to)}`).join(', ')}` : ''}`,
    m.thin == null ? 'Bed under the voice: not measured (no voice stem or bed stems)' : `Bed more than ${GAP_DB} dB under the voice: ${m.thin} run(s)${m.thinRuns.length ? `: ${m.thinRuns.map(r => `${s(r.from)}-${s(r.to)} s (worst ${s(r.worst)} dB)`).join(', ')}` : ''}`,
    m.close == null ? '' : `The last ${CLOSE_S} s: bed ${m.closeEnd} dBFS, film median ${m.bedMedian} dBFS (${m.close > 0 ? '+' : ''}${m.close} dB)`];
}

function filmMode(film) {
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), final = finalRender(F('renders'));
  if (!final) { console.error(`${film}: no final render in renders/`); process.exit(1); }
  const has = p => (fs.existsSync(F(p)) ? F(p) : null), plan = has('audio/sound-plan.json') ? JSON.parse(fs.readFileSync(F('audio/sound-plan.json'), 'utf8')) : {};
  const m = measure({ mix: F(`renders/${final}`), vo: has('audio/stems/vo_m.wav'), beds: ['sfx', 'music', 'amb'].map(k => has(`audio/stems/${k}.wav`)).filter(Boolean), silences: (plan.silences || []).map(x => x.t) });
  const res = judge(m), v = verdict(res);
  fs.mkdirSync(F('review'), { recursive: true });
  fs.writeFileSync(F('review/floorgate.md'), [`# Sound floor gate · ${final}`, '', `**${v}**`, '', ...table(m, res)].join('\n') + '\n');
  console.log(`review/floorgate.md: ${v} · ${res.map(r => `${r.id} ${r.got ?? 'n/a'}`).join(', ')}`);
  process.exit(v === 'PASS' ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2), USAGE = 'usage: floorgate.mjs films/<slug> | floorgate.mjs --mp4 <file> [--vo <wav>] [--bed <wav>[,<wav>...]] [--silences a-b,c-d] [--json 1]';
  if (!args[0] || args[0] === '--help') { console[args[0] ? 'log' : 'error'](USAGE); process.exit(args[0] ? 0 : 2); }
  if (!args[0].startsWith('--')) filmMode(args[0]);
  else {
    const A = {}; for (let i = 0; i < args.length; i += 2) A[args[i].replace(/^--/, '')] = args[i + 1];
    if (!A.mp4) { console.error(USAGE); process.exit(2); }
    const m = measure({ mix: path.resolve(A.mp4), vo: A.vo ? path.resolve(A.vo) : null, beds: A.bed ? A.bed.split(',').map(f => path.resolve(f)) : [],
      silences: A.silences ? A.silences.split(',').map(s => s.split('-').map(Number)) : [] });
    const res = judge(m), v = verdict(res);
    console.log(A.json ? JSON.stringify({ file: A.mp4, ...m, verdict: v, results: res }) : [`${path.basename(A.mp4)}: ${v}`, ...table(m, res)].join('\n'));
    process.exit(v === 'PASS' ? 0 : 1);
  }
}
