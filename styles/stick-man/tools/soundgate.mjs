// Sound gate on a render: the loudness order of the hero hits and each hit's sync with the picture.
//   node styles/stick-man/tools/soundgate.mjs films/<slug>       -> review/soundgate.md, exit 1 unless PASS
//        the final render's mix, audio/cues.json, audio/stems/sfx.wav and vo_m.wav, and the order in audio/sound-plan.json
//        ("order": [{ "class": "gun", "match": ["gunshot"] }, ...], loudest first; default ORDER below)
//   node styles/stick-man/tools/soundgate.mjs --mp4 <file> --cues <cues.json> [--sfx <wav>] [--vo <wav>] [--order gun,crash,...] [--json 1]
// cues: [{ at | t, name, lock?, keep? }]: at is the picture time of the hit (shot.mjs --cues writes t). A cue belongs to the
// first class of the order whose match is in its name. S1 order: each class's loudest true peak in the mix (0.03 s before
// the cue to 0.45 s after, a crash peaks about 0.2 s in) above the next class, and last the voice: the 95th percentile of
// the mix's 50 ms peaks while the voice speaks, outside every hit (0.03 s before it or its sound's start, to 1 s after).
// S2 sync: each hit's onset in the sfx stem against its picture time (in a mix the music and the voice hide the attacks,
// so with no stem it is not measured).
// S3 missing: a hit whose window in the sfx stem stays under -40 dBFS. A hit is a cue with lock or keep, or, when no cue
// has either, every cue of an ordered class.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from '../../../kit/env.mjs';
import { finalRender } from './renders.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const SR = 48000, PRE_S = 0.03, BODY_S = 0.45, TAIL_S = 0.55, SEARCH_PRE = 0.25, SEARCH_POST = 0.5, MISSING_DB = -40, FPS = 30;
export const ORDER = [
  { class: 'gun', match: ['gunshot'] }, { class: 'crash', match: ['crash'] },
  { class: 'break', match: ['smash', 'shatter', 'break'] }, { class: 'slam', match: ['slam'] },
];
export const EARLY_MS = 90, LATE_MS = 185;
const SYNC_SRC = 'ITU-R BT.1359: sound 90 ms before or 185 ms after the picture is where viewers find it unacceptable (they notice from 45 / 125 ms); Kai 19/11 A v3 s2 "mất phần slam, âm thanh lạ" at the first trunk slam, whose old sound sat 100 ms early (audio/sfx/slam-swap.json)';

export const LIMITS = [
  { id: 'S1', what: 'loudness order of the classes, then the voice', key: 'orderOk',
    source: 'Hot Money r5 sound plan: gunshot > crash > smash > slam > voice (r5/tools/hierarchy.py), Kai 18/11 "cheap SFX"; the order is the film\'s, from audio/sound-plan.json "order"' },
  { id: 'S2', what: `hits off the picture (early > ${EARLY_MS} ms or late > ${LATE_MS} ms)`, key: 'offSync', max: 0, source: SYNC_SRC },
  { id: 'S3', what: `hits missing from the sfx stem (window under ${MISSING_DB} dBFS)`, key: 'missing', max: 0, source: 'Kai 19/11 A v3 s2: "tự nhiên mất phần slam"' },
];

// mono samples, or with ch 2 both channels interleaved (a peak of either channel, as a true-peak meter reads it)
export function pcm(file, sr = SR, ch = 1) {
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'error', '-i', file, '-vn', '-ac', String(ch), '-ar', String(sr), '-f', 'f32le', '-'], { capture: true, encoding: 'buffer', maxBuffer: 1 << 30 });
  if (r.status) throw new Error(`ffmpeg could not decode the audio of ${file}`);
  const b = r.stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length - (b.length % 4)));
}

const db = x => 20 * Math.log10(Math.max(x, 1e-9));
export const pictureT = c => c.at ?? c.t;
export const classOf = (name, order) => order.find(o => o.match.some(m => name.includes(m)))?.class ?? null;
export function hits(cues, order) {
  const marked = cues.some(c => c.lock || c.keep);
  return cues.filter(c => (marked ? c.lock || c.keep : classOf(c.name, order))).sort((a, b) => pictureT(a) - pictureT(b));
}

// the peak of x (two channels interleaved, sr samples a second each) from a to b seconds; at 4 x 48 kHz this is the true peak (dBTP)
const peakDb = (x, sr, a, b) => { let pk = 0; for (let i = Math.max(0, 2 * Math.round(a * sr)); i < Math.min(x.length, 2 * Math.round(b * sr)); i++) pk = Math.max(pk, Math.abs(x[i])); return db(pk); };

// onset of the hit at picture time t in samples x, in 10 ms blocks from SEARCH_PRE before t to SEARCH_POST after, never
// nearer the cue before or after than to this one: the first block that rises from under half the window's peak to over
// it (align_hits' half-peak onset) and at least RISE x (6 dB) over the quietest block of the 50 ms before: an attack. So a
// tail of the sound before that hovers at half does not count, and a crash whose body peaks late counts from its attack.
// A window with no such rise counts from its start.
export const BLOCK_S = 0.01, RISE = 2;
export function onset(x, t, prev = -Infinity, next = Infinity) {
  const n = Math.round(BLOCK_S * SR), from = Math.max(t - SEARCH_PRE, (prev + t) / 2), to = Math.min(t + SEARCH_POST, (t + next) / 2);
  const a = Math.max(0, Math.round(from * SR)), b = Math.min(x.length, Math.round(to * SR));
  const env = []; for (let i = a; i + n <= b; i += n) { let m = 0; for (let k = i; k < i + n; k++) m = Math.max(m, Math.abs(x[k])); env.push(m); }
  const pk = Math.max(0, ...env);
  if (!(pk > 0)) return { at: null, peakDb: -Infinity };
  const j = env.findIndex((v, i) => i > 0 && v >= pk / 2 && env[i - 1] < pk / 2 && v >= RISE * Math.min(...env.slice(Math.max(0, i - 5), i)));
  return { at: (a + Math.max(j, 0) * n) / SR, peakDb: db(pk) };
}

// levels: { class: dB } (classes with no cue absent); rest: [label, dB], the loudest peak outside the hits
export function orderCheck(levels, rest, order) {
  const seq = [...order.filter(o => levels[o.class] != null).map(o => [o.class, levels[o.class]]), ...(rest ? [rest] : [])];
  const wrong = seq.slice(1).flatMap(([k, v], i) => (v >= seq[i][1] ? [`${k} ${v.toFixed(1)} ≥ ${seq[i][0]} ${seq[i][1].toFixed(1)}`] : []));
  return { seq, wrong, ok: seq.length >= 2 ? !wrong.length : null };
}

export function syncRows(list, all, x) {
  const times = all.map(pictureT).sort((a, b) => a - b);
  return list.map(c => {
    const t = pictureT(c), prev = times.filter(u => u < t - 1e-3).at(-1) ?? -Infinity, next = times.find(u => u > t + 1e-3) ?? Infinity;
    const o = onset(x, t, prev, next), ms = o.at == null ? null : (o.at - t) * 1000;
    return { name: c.name, t, onset: o.at, ms, peakDb: o.peakDb, off: ms != null && (ms < -EARLY_MS || ms > LATE_MS), missing: o.peakDb < MISSING_DB };
  });
}

// where the voice speaks, from its stem (any level: a stem before the mix's voice gain): 50 ms blocks within VOICE_ON_DB
// of the stem's own peak
export const VOICE_ON_DB = 20, VOICE_BLOCK_S = 0.05, REST_P = 0.95;
export function voiceBlocks(v) {
  const n = Math.round(VOICE_BLOCK_S * SR), env = [];
  for (let i = 0; i < v.length; i += n) { let m = 0; for (let k = i; k < Math.min(v.length, i + n); k++) m = Math.max(m, Math.abs(v[k])); env.push(m); }
  const top = Math.max(0, ...env);
  return env.map(m => top > 0 && db(m) >= db(top) - VOICE_ON_DB);
}

// mix: the render (its audio); sfx: the effects stem, for sync and missing hits; vo: the voice stem, for where the voice speaks. True
// peaks are read on the mix at 4 x 48 kHz; the last step of the order is the mix's peak while the voice speaks outside
// the hits, or with no voice stem of everything outside the hits (the voice and the beds): the 95th percentile of its 50 ms
// block peaks, its loud words, not one stray sample where a bed sums over a word
export function measure({ mix, cues, sfx = null, vo = null, order = ORDER }) {
  const TP = 4 * SR, x = pcm(mix, TP, 2), list = hits(cues, order), levels = {}, win = [];
  for (const c of cues) {
    const k = classOf(c.name, order), t = pictureT(c);
    if (k) levels[k] = Math.max(levels[k] ?? -Infinity, peakDb(x, TP, t - PRE_S, t + BODY_S));
    if (k || c.lock || c.keep) win.push([Math.min(t, c.t ?? t) - PRE_S, t + BODY_S + TAIL_S]);
  }
  const hit = new Uint8Array(x.length / 2);
  for (const [a, b] of win) hit.fill(1, Math.max(0, Math.round(a * TP)), Math.min(hit.length, Math.round(b * TP)));
  const speaks = vo ? voiceBlocks(pcm(vo)) : null, perBlock = VOICE_BLOCK_S * TP, blocks = [];
  for (let k = 0; k * perBlock < hit.length; k++) {
    if (speaks && !speaks[k]) continue;
    let m = 0, clear = true;
    for (let i = Math.round(k * perBlock); i < Math.min(hit.length, Math.round((k + 1) * perBlock)); i++) { if (hit[i]) { clear = false; break; } m = Math.max(m, Math.abs(x[2 * i]), Math.abs(x[2 * i + 1])); }
    if (clear && m > 0) blocks.push([db(m), k * VOICE_BLOCK_S]);
  }
  blocks.sort((p, q) => p[0] - q[0]);
  const top = blocks.length ? blocks[Math.min(blocks.length - 1, Math.floor(REST_P * blocks.length))] : null, restAt = top ? top[1] : null;
  const ord = orderCheck(levels, top ? [speaks ? 'voice' : 'voice and beds', top[0]] : null, order);
  const sync = sfx ? syncRows(list, cues, pcm(sfx)) : [];
  return { levels, order: ord.seq, restAt, wrongOrder: ord.wrong, orderOk: ord.ok, sync,
    offSync: sfx ? sync.filter(s => s.off).length : null, missing: sfx ? sync.filter(s => s.missing).length : null };
}

export function judge(m) {
  return LIMITS.map(l => {
    const got = m[l.key];
    if (got == null) return { ...l, got: null, ok: null };
    return { ...l, got, ok: l.key === 'orderOk' ? got : got <= l.max };
  });
}

export const verdict = res => res.some(r => r.ok === false) ? 'FAIL' : res.some(r => r.ok == null) ? 'PARTIAL' : 'PASS';
const shown = r => r.got == null ? 'n/a' : r.key === 'orderOk' ? (r.got ? 'in order' : 'out of order') : String(r.got);

export function table(m, res) {
  const ms = s => s.ms == null ? 'n/a' : `${s.ms > 0 ? '+' : ''}${s.ms.toFixed(0)} ms (${(s.ms / 1000 * FPS).toFixed(1)} f)`;
  return ['| Check | Got | Result | Limit from |', '| --- | --- | --- | --- |',
    ...res.map(r => `| ${r.id} ${r.what} | ${shown(r)} | ${r.ok == null ? 'not measured' : r.ok ? 'PASS' : 'FAIL'} | ${r.source} |`), '',
    `Order (true peak, dBTP): ${m.order.map(([k, v]) => `${k} ${v.toFixed(1)}`).join(' > ') || 'no class'}${m.restAt != null ? ` (the last one at ${m.restAt.toFixed(2)} s)` : ''}${m.wrongOrder.length ? `; wrong: ${m.wrongOrder.join('; ')}` : ''}.`, '',
    '| Hit | Picture (s) | Onset in the sfx stem | Peak (dBFS) | Result |', '| --- | --- | --- | --- | --- |',
    ...m.sync.map(s => `| ${s.name} | ${s.t.toFixed(2)} | ${ms(s)} | ${s.peakDb === -Infinity ? '-inf' : s.peakDb.toFixed(1)} | ${s.missing ? 'missing' : s.off ? 'off' : 'ok'} |`)];
}

const parseOrder = s => s.split(',').map(k => ({ class: k, match: [k === 'gun' ? 'gunshot' : k] }));
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));

function filmMode(film) {
  const DIR = path.resolve(ROOT, film), F = p => path.join(DIR, p), final = finalRender(F('renders'));
  if (!final) { console.error(`${film}: no final render in renders/`); process.exit(1); }
  if (!fs.existsSync(F('audio/cues.json'))) { console.error(`${film}: no audio/cues.json`); process.exit(1); }
  const plan = fs.existsSync(F('audio/sound-plan.json')) ? readJson(F('audio/sound-plan.json')) : {};
  const has = p => (fs.existsSync(F(p)) ? F(p) : null);
  const m = measure({ mix: F(`renders/${final}`), cues: readJson(F('audio/cues.json')), sfx: has('audio/stems/sfx.wav'), vo: has('audio/stems/vo_m.wav'), order: plan.order || ORDER });
  const res = judge(m), v = verdict(res);
  fs.mkdirSync(F('review'), { recursive: true });
  fs.writeFileSync(F('review/soundgate.md'), [`# Sound gate · ${final}`, '', `**${v}**`, '', ...table(m, res)].join('\n') + '\n');
  console.log(`review/soundgate.md: ${v} · ${res.map(r => `${r.id} ${shown(r)}`).join(', ')}`);
  process.exit(v === 'PASS' ? 0 : 1);
}

function fileMode(A) {
  const R = f => (f ? path.resolve(f) : null);
  const m = measure({ mix: R(A.mp4), cues: readJson(R(A.cues)), sfx: R(A.sfx), vo: R(A.vo), order: A.order ? parseOrder(A.order) : ORDER });
  const res = judge(m), v = verdict(res);
  if (A.json) console.log(JSON.stringify({ file: R(A.mp4), ...m, verdict: v, results: res }));
  else console.log([`${path.basename(A.mp4)}: ${v}`, ...table(m, res)].join('\n'));
  process.exit(v === 'PASS' ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), USAGE = 'usage: soundgate.mjs films/<slug> | soundgate.mjs --mp4 <file> --cues <json> [--sfx <wav>] [--vo <wav>] [--order gun,crash,break,slam] [--json 1]';
  if (!args[0] || args[0] === '--help' || args[0] === '-h') { console[args[0] ? 'log' : 'error'](USAGE); process.exit(args[0] ? 0 : 2); }
  if (args[0].startsWith('--')) {
    const A = {}; for (let i = 0; i < args.length; i += 2) A[args[i].replace(/^--/, '')] = args[i + 1];
    if (!A.mp4 || !A.cues) { console.error(USAGE); process.exit(2); }
    fileMode(A);
  } else filmMode(args[0]);
}
