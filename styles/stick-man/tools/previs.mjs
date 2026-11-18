// Previs and the temp-music animatic: a grey three.js blockout of a scene or the whole film, captured headless, with the
// camera path, a Vietnamese label bar per stage (tall red tick + CẮT = hard cut, small tick = a camera flight) and the
// recorded voice under it. Cheap to make and to note, so cuts and camera are judged before any render.
//   node styles/stick-man/tools/previs.mjs films/<slug> --scene bank       -> review/previs/bank.mp4 from previs/bank.json
//   node styles/stick-man/tools/previs.mjs films/<slug> --scene S6         -> review/previs/S6.mp4 from the storyboard shots
//   node styles/stick-man/tools/previs.mjs films/<slug> --film             -> review/previs/animatic.mp4, the whole film with
//                                                                             temp music (audio/stems/music.wav or --music)
//   options: --join scene|none|all (cut policy for storyboard shots; default scene: flights inside a scene, cuts between)
//            --music <wav> --music-db -14 --stills 0,90,300 (png frames only) --size 540x960 --out <mp4> --world-only 1
// A hand spec (films/<slug>/previs/<name>.json) is a world in previs-core.mjs's shape on its own clock from 0, plus
// `shots` (the storyboard shots it replaces in --film) and optional `clock` / `audio_t0`. Every run rewrites
// review/previs/previs.md (the evidence ◇2b asks for): one row per previs video with its takes and cut rhythm.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { boundaries, cameraKeys, rhythm, warp, SIZE_VI, moveVi, WALKS, track } from './previs-core.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../../..');
const BENCH = path.join(HERE, '../bench');

// ---- the film's shots on the voice's clock
export function filmShots(sb, words, dur) {
  const fps = sb.fps ?? 30, shots = sb.shots ?? [];
  const lineStart = {}; for (const w of words ?? []) lineStart[w.line] ??= w.t0;
  const firstFrame = {}; for (const s of shots) for (const l of s.lines ?? []) firstFrame[l] ??= s.f0;
  const anchors = [[0, 0], ...Object.entries(firstFrame).filter(([l]) => lineStart[l] != null).map(([l, f]) => [f, lineStart[l]])
    .sort((a, b) => a[0] - b[0]), [sb.last ?? shots.at(-1).f0 + 90, dur ?? (sb.last ?? 0) / fps]];
  const at = words?.length ? warp(anchors) : f => f / fps;
  return shots.map((s, i) => ({ ...s, t0: +at(s.f0).toFixed(3), t1: +at(shots[i + 1]?.f0 ?? sb.last).toFixed(3) }));
}

// ---- an automatic blockout for storyboard shots: one grey zone per set, the cast on marks, the camera from each shot's
// size / angle / lens / move. Zones sit 40 m apart so a flight between sets reads as the camera travelling.
const hash = s => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const LOOKS = { you: { body: '#34363a', pants: '#2b2c2f', cap: '#c8302a' }, cop: { body: '#2c3442', pants: '#262b34', cap: '#1d222b', h: 1.85 } };
const lookOf = id => LOOKS[/^you/i.test(id) ? 'you' : /^(cop|c\d|g)$/i.test(id) ? 'cop' : ''] ?? { body: ['#8a8f96', '#7f8790', '#9a8f8a', '#6f7a70'][hash(id) % 4], h: 1.7 };
const VEHICLES = [
  { key: 'cruiser', re: /cruiser/i, s: [4.6, 1.45, 1.9], c: '#1f2a3c', text: 'POLICE', rest: (p, st) => [p[0] - 4.5 * st, p[1] - 1.8], drive: (p, st) => [p[0] - 7 * st, p[1] - 0.4] },
  { key: 'car', re: /\bcar\b/i, s: [4.4, 1.35, 1.8], c: '#5b2b28', text: 'CAR', rest: p => [p[0] + 2.4, p[1] - 1.3], drive: p => p }];
const setKey = s => String(s ?? 'set').toLowerCase().replace(/\(.*?\)/g, '').split(',')[0].trim();
const STOP = new Set(['the', 'a', 'an', 'of', 'at', 'in', 'by', 'behind', 'inside', 'near', 'to']);
const words = s => setKey(s).split(/\s+/).filter(w => w && !STOP.has(w));
// One zone per place: "back lot (motel)" and "motel back lot" are one zone when one name's words hold the other's.
export function zonesOf(sets) {
  const zones = [], of = new Map();
  for (const set of sets) {
    const w = words(set), hit = zones.find(z => z.w.every(x => w.includes(x)) || w.every(x => z.w.includes(x)));
    of.set(set, (hit ?? zones[zones.push({ name: setKey(set), w }) - 1]).name);
  }
  return of;
}

export function autoWorld(shots, { join = 'scene', dir = 'L>R', x0 = 1000 } = {}) {
  const zoneOf = zonesOf(shots.map(s => s.set)), zones = [...new Set(zoneOf.values())], zx = z => x0 + zones.indexOf(z) * 40;
  const blocks = [], figures = {}, props = [], placed = [];
  zones.forEach(z => {
    const x = zx(z), h = hash(z), tone = ['#a3a19c', '#9c9a94', '#a7a39a'][h % 3];
    blocks.push({ s: [20, 0, 14], p: [x, 0, 1], c: tone, floor: { tiles: [16, 11], c2: '#97958f' } },
      { s: [20, 3.4, 0.2], p: [x, 1.7, -3.2], c: '#b9b7b2' }, { s: [0.2, 3.4, 14], p: [x - 10, 1.7, 1], c: '#9a9996' },
      { s: [4.2, 0.5, 0.01], p: [x, 2.7, -3.08], label: { text: z.toUpperCase() } });
    for (let i = 0; i < 4; i++) { const k = (h >> (i * 3)) & 7; blocks.push({ s: [0.8 + k * 0.15, 0.6 + (k % 3) * 0.5, 0.8], p: [x - 7 + i * 4.6, 0.3 + (k % 3) * 0.25, -2.2 + (k % 2) * 0.6], c: '#8e8d8a' }); }
  });
  const pos = {}, veh = {};                           // where each figure and vehicle is now, per zone: id -> [x, z]
  for (const s of shots) {
    const z = zoneOf.get(s.set), x = zx(z), cast = (s.cast ?? []).filter(Boolean), sub = cast[0], step = dir === 'R>L' ? -1 : 1;
    const vk = VEHICLES.filter(v => (s.props ?? []).some(p => v.re.test(p)));
    const drives = /^you/i.test(sub ?? '') && WALKS.test(s.move ?? '') && vk.some(v => v.key === 'car');   // the lead drives
    if (drives && sub && veh[`car@${z}`]) pos[`${sub}@${z}`] = veh[`car@${z}`].at;      // you get in the car
    let subFrom = [x, 0], subTo = [x, 0];
    cast.forEach((id, k) => {
      const key = `${id}@${z}`;
      const f = figures[key] ??= { id: key, tag: id, look: lookOf(id), path: [], face: [], show: [s.t0, s.t1] };
      f.show[1] = s.t1;
      const p = pos[key] ??= s.size === 'OTS' && k ? [x, -1.4] : [x + k * 1.1 - (cast.length - 1) * 0.3, 0];
      const walks = k === 0 && WALKS.test(s.move ?? ''), end = walks ? [p[0] + (drives ? 10 : 3) * step, p[1]] : p;
      if (k === 0) { subFrom = p; subTo = end; }
      const face = s.size === 'OTS' ? (k ? 0 : 180) : walks ? 90 * step : 0;
      f.path.push([s.t0, ...p], [s.t1, ...end]); f.face.push([s.t0, face], [s.t1, face]);
      pos[key] = end;
    });
    for (const v of vk) {
      const o = veh[`${v.key}@${z}`] ??= { at: v.rest(subFrom, step), box: { s: v.s, c: v.c, keys: [], show: [s.t0, s.t1] },
        tag: { s: [1.6, 0.42, 0], label: { text: v.text, bg: '#202224', fg: '#ffffff' }, keys: [], show: [s.t0, s.t1] } };
      if (!o.box.keys.length) props.push(o.box, o.tag);
      const [a, b] = drives ? [v.drive(subFrom, step), v.drive(subTo, step)] : [o.at, o.at];
      o.box.keys.push([s.t0, a[0], v.s[1] / 2, a[1]], [s.t1, b[0], v.s[1] / 2, b[1]]);
      o.tag.keys.push([s.t0, a[0], v.s[1] + 0.4, a[1]], [s.t1, b[0], v.s[1] + 0.4, b[1]]);
      o.box.show[1] = o.tag.show[1] = s.t1; o.at = b;
    }
    const lookAt = s.size === 'OTS' && cast[1] ? cast[1] : sub, subj = lookAt ? `${lookAt}@${z}` : null;
    if (!subj) props.push({ s: [0.3, 0.06, 0.2], c: '#9fb79a', keys: [[s.t0, x, 0.98, 0.4]], show: [s.t0, s.t1], label: null },
      { s: [0.9, 0.9, 0.6], c: '#7d7c79', keys: [[s.t0, x, 0.45, 0.4]], show: [s.t0, s.t1] });
    const at = t => subj ? track(figures[subj].path, t) : [x, 0.4];
    placed.push({ ...s, ots: s.size === 'OTS', from: at(s.t0), to: at(s.t1) });
  }
  for (const f of Object.values(figures)) { f.path = dedupe(f.path); f.face = dedupe(f.face); }
  for (const p of props) p.keys = dedupe(p.keys);
  const kinds = boundaries(placed, join);
  return { blocks, figures: Object.values(figures), props, camera: cameraKeys(placed, kinds, { dir }), kinds, shots: placed };
}
const dedupe = keys => keys.filter((k, i) => !(i && k[0] === keys[i - 1][0] && k.slice(1).join() === keys[i - 1].slice(1).join()));

export function stagesFor(shots, kinds) {
  return shots.map((s, i) => {
    const kind = i === 0 ? 'start' : kinds[i - 1];
    return { t: s.t0, kind, title: `${s.id} ${SIZE_VI[s.size] ?? s.size}`, sub: `${moveVi(s.move)} · ${kind === 'cut' ? 'CẮT' : kind === 'flight' ? 'bay tiếp' : 'mở'}` };
  });
}

// ---- shift a hand spec onto the film clock, clipped to its window
const shiftKeys = (keys, dt) => keys.map(([t, ...v]) => [t + dt, ...v]);
export function placeSpec(spec, t0, t1) {
  const show = o => ({ ...o, show: o.show ? [o.show[0] + t0, Math.min(o.show[1] + t0, t1)] : [t0, t1] });
  const cam = shiftKeys(spec.camera, t0).filter(k => k[0] <= t1);
  return {
    blocks: spec.blocks.map(show),
    figures: spec.figures.map(f => show({ ...f, path: shiftKeys(f.path, t0), face: f.face && shiftKeys(f.face, t0), head: f.head && shiftKeys(f.head, t0), arms: f.arms && shiftKeys(f.arms, t0) })),
    props: spec.props.map(p => show({ ...p, keys: shiftKeys(p.keys, t0) })),
    camera: [...cam, [t1, ...track(spec.camera, t1 - t0)]],
    stages: spec.stages.map(s => ({ ...s, t: s.t + t0 })),
  };
}

// ---- the whole film: storyboard shots on the voice clock, hand specs replacing the shots they claim, cuts between parts
export function filmWorld(sb, words, dur, specs, { join = 'scene' } = {}) {
  const shots = filmShots(sb, words, dur), claimed = new Map();
  for (const sp of specs) for (const id of sp.shots ?? []) claimed.set(id, sp);
  const parts = [];
  for (const s of shots) {
    const sp = claimed.get(s.id), last = parts.at(-1);
    if (sp) { if (last?.spec === sp) last.t1 = s.t1; else parts.push({ spec: sp, t0: s.t0, t1: s.t1 }); }
    else if (last && !last.spec) last.shots.push(s); else parts.push({ shots: [s] });
  }
  const W = { blocks: [], figures: [], props: [], camera: [], stages: [] };
  const take = p => { W.blocks.push(...p.blocks); W.figures.push(...p.figures); W.props.push(...p.props); W.camera.push(...p.camera); W.stages.push(...p.stages); };
  parts.forEach((p, i) => {
    let part;
    if (p.spec) part = placeSpec(p.spec, p.t0, p.t1);
    else { const a = autoWorld(p.shots, { join, dir: sb.convention?.includes('R>L') && !sb.convention.includes('L>R') ? 'R>L' : 'L>R', x0: 1000 + i * 400 }); part = { ...a, stages: stagesFor(a.shots, a.kinds) }; }
    if (i > 0) { part.stages[0] = { ...part.stages[0], kind: 'cut', sub: part.stages[0].sub.replace(/ · (mở|bay tiếp)$/, '') + ' · CẮT' }; }
    take(part);
  });
  W.camera.sort((a, b) => a[0] - b[0]);
  const lines = Object.entries(Object.fromEntries((words ?? []).map(w => [w.line, null]))).map(([l]) => [words.find(w => w.line === l).t0, l]);
  const cuts = W.stages.filter(s => s.kind === 'cut').map(s => s.t);
  return { ...W, lines, cuts, dur };
}

export function refs() {
  const rows = dir => { try { return fs.readdirSync(path.join(BENCH, dir)).filter(f => f.endsWith('.json')).map(f => JSON.parse(fs.readFileSync(path.join(BENCH, dir, f), 'utf8'))); } catch { return []; } };
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : null; };
  const rick = rows('rick'), ours = rows('ours').at(-1);
  if (!rick.length) return '';
  return `Rick ${med(rick.map(r => r.film.cutsPerMin)).toFixed(1)}/phút · ${med(rick.map(r => r.film.medianTake)).toFixed(0)} s` +
    (ours ? `   ·   ${ours.id} ${ours.film.cutsPerMin.toFixed(1)}/phút · ${ours.film.medianTake.toFixed(1)} s` : '');
}

// ---- tools: ffmpeg (pixi first), the page, headless capture
function ffmpeg() {
  const pixi = path.join(ROOT, '.pixi/envs/default/bin/ffmpeg'), ok = b => spawnSync(b, ['-version']).status === 0;
  const ff = fs.existsSync(pixi) && ok(pixi) ? pixi : 'ffmpeg';
  if (!ok(ff)) throw new Error('ffmpeg not found (pixi env or PATH)');
  return ff;
}
const probeDur = (ff, f) => { const r = spawnSync(ff, ['-i', f], { encoding: 'utf8' }); const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; };

async function capture(worldFile, n, framesDir, only) {
  const { chromium } = await import('playwright-core');
  const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json' };
  const srv = http.createServer((q, s) => {
    const p = path.join(ROOT, decodeURIComponent(new URL(q.url, 'http://x').pathname));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { s.writeHead(404).end(); return; }
    s.writeHead(200, { 'content-type': MIME[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(s);
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const b = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
  try {
    const pg = await b.newPage({ viewport: { width: 720, height: 1280 } });
    let err; pg.on('pageerror', e => { err = e; });
    await pg.goto(`http://127.0.0.1:${srv.address().port}/${path.relative(ROOT, path.join(HERE, 'previs.html'))}?world=${encodeURIComponent(path.relative(ROOT, worldFile))}`);
    await pg.waitForFunction('window.ready', null, { timeout: 30000 }).catch(e => { throw err ?? e; });
    const list = only ?? [...Array(n).keys()];
    for (const f of list) {
      const d = await pg.evaluate(f => window.frame(f), f);
      fs.writeFileSync(path.join(framesDir, `f${String(f).padStart(5, '0')}.jpg`), Buffer.from(d.split(',')[1], 'base64'));
    }
    if (err) throw err;
    return list;
  } finally { await b.close(); srv.close(); }
}

function writeEvidence(dir, name, row) {
  const file = path.join(dir, 'review/previs/previs.md'), rows = {};
  if (fs.existsSync(file)) for (const m of fs.readFileSync(file, 'utf8').matchAll(/^\| `(.+?)` \|.*$/gm)) rows[m[1]] = m[0];
  rows[name] = `| \`${name}\` | ${row.video} | ${row.dur.toFixed(1)} | ${row.r.cuts} | ${row.r.cutsPerMin} | ${row.r.medianTake} | ${row.r.longestTake} | ${row.r.worst15} | ${row.stages} |`;
  fs.writeFileSync(file, ['by: self', `of: previs.mjs on ${path.basename(dir)}, ${new Date().toISOString().slice(0, 16)}Z`, '',
    '# Previs and animatic', '', 'Grey blockouts with the camera path and the voice, made by `styles/stick-man/tools/previs.mjs`.', '',
    '## Takes', '', '| Previs | Video | Length (s) | Hard cuts | Cuts / min | Median take (s) | Longest take (s) | Most cuts in 15 s | Stages |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |', ...Object.values(rows), ''].join('\n'));
}

// ---- CLI
async function main() {
  const argv = process.argv.slice(2), A = {};
  const film = argv[0];
  for (let i = 1; i < argv.length; i++) { const k = argv[i].replace(/^--/, ''); A[k] = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : '1'; }
  const USAGE = 'usage: previs.mjs films/<slug> --scene <spec name | scene id> | --film [--join scene|none|all] [--music <wav>] [--stills 0,90] [--out <mp4>]';
  if (!film || film.startsWith('-') || (!A.scene && !A.film)) { console.error(USAGE); process.exit(2); }
  const DIR = path.resolve(ROOT, film), F = p => path.resolve(DIR, p);
  if (!fs.existsSync(F('storyboard.json'))) { console.error(`${film}: no storyboard.json\n${USAGE}`); process.exit(2); }
  const ff = ffmpeg(), t00 = Date.now();
  const sb = JSON.parse(fs.readFileSync(F('storyboard.json'), 'utf8'));
  const words = fs.existsSync(F('vo/words.json')) ? JSON.parse(fs.readFileSync(F('vo/words.json'), 'utf8')) : null;
  const voice = fs.existsSync(F('vo/vo.wav')) ? F('vo/vo.wav') : null;
  const filmDur = (voice && probeDur(ff, voice)) || (sb.last ?? 0) / (sb.fps ?? 30);
  const specs = fs.existsSync(F('previs')) ? fs.readdirSync(F('previs')).filter(f => f.endsWith('.json')).map(f => ({ name: f.slice(0, -5), ...JSON.parse(fs.readFileSync(F(`previs/${f}`), 'utf8')) })) : [];
  const fps = sb.fps ?? 30, join = A.join || 'scene';
  let name, world, audioT0 = 0, music = null;
  if (A.film) {
    name = 'animatic';
    const w = filmWorld(sb, words, filmDur, specs, { join });
    world = { ...w, clock: { name: 'film', t0: 0 } };
    music = A.music ? F(A.music) : fs.existsSync(F('audio/stems/music.wav')) ? F('audio/stems/music.wav') : null;
  } else {
    name = A.scene;
    const spec = specs.find(s => s.name === A.scene);
    const shots = filmShots(sb, words, filmDur);
    if (spec) {
      const first = shots.find(s => s.id === spec.shots?.[0]);
      audioT0 = spec.audio_t0 ?? first?.t0 ?? 0;
      world = { ...spec, clock: spec.clock ?? { name: path.basename(DIR).replace(/^.*-(r\d+)$/, '$1'), t0: audioT0 }, lines: [] };
    } else {
      const sc = shots.filter(s => s.scene === A.scene);
      if (!sc.length) { console.error(`no previs/${A.scene}.json and no storyboard scene ${A.scene}`); process.exit(2); }
      audioT0 = sc[0].t0;
      const local = sc.map(s => ({ ...s, t0: s.t0 - audioT0, t1: s.t1 - audioT0 }));
      const a = autoWorld(local, { join });
      world = { blocks: a.blocks, figures: a.figures, props: a.props, camera: a.camera, stages: stagesFor(a.shots, a.kinds), dur: local.at(-1).t1, clock: { name: 'film', t0: audioT0 }, lines: [] };
    }
    if (words) world.lines = [...new Set(words.map(w => w.line))].map(l => [words.find(w => w.line === l).t0 - audioT0, l]).filter(([t]) => t >= -0.01 && t < world.dur);
    if (A.music) music = F(A.music);
  }
  world.fps = fps; world.bg ??= '#8a8c90'; world.fog ??= [12, 30];
  const cuts = world.stages.filter(s => s.kind === 'cut').map(s => s.t), r = rhythm(cuts, world.dur);
  if (A.film) world.rhythm = { plan: r, refs: refs() };
  const outDir = F('review/previs'); fs.mkdirSync(outDir, { recursive: true });
  const worldFile = path.join(outDir, `.${name}.world.json`);
  fs.writeFileSync(worldFile, JSON.stringify(world));
  const n = Math.round(world.dur * fps);
  console.log(`${name}: ${n} frames, ${world.stages.length} stages, ${r.cuts} hard cuts (${r.cutsPerMin}/min, median take ${r.medianTake} s, longest ${r.longestTake} s)`);
  if (A['world-only']) return;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'previs-'));
  try {
    if (A.stills) {
      const list = A.stills.split(',').map(Number);
      await capture(worldFile, n, tmp, list);
      for (const f of list) spawnSync(ff, ['-v', 'error', '-y', '-i', path.join(tmp, `f${String(f).padStart(5, '0')}.jpg`), path.join(outDir, `${name}_f${f}.png`)]);
      console.log(`stills: ${list.map(f => path.relative(ROOT, path.join(outDir, `${name}_f${f}.png`))).join(' ')}`);
      return;
    }
    await capture(worldFile, n, tmp);
    const out = A.out ? F(A.out) : path.join(outDir, `${name}.mp4`), [w, h] = String(A.size || '720x1280').split('x');
    const ins = ['-framerate', String(fps), '-i', path.join(tmp, 'f%05d.jpg')], maps = [], filt = [];
    if (voice) { ins.push('-ss', String(Math.max(0, audioT0)), '-t', String(world.dur), '-i', voice); filt.push('[1:a]aresample=48000[v]'); }
    if (music) { ins.push('-ss', String(Math.max(0, audioT0)), '-t', String(world.dur), '-i', music); filt.push(`[${voice ? 2 : 1}:a]aresample=48000,volume=${A['music-db'] ?? 0}dB[m]`); }
    if (voice && music) filt.push('[v][m]amix=inputs=2:duration=first:normalize=0[a]'); else if (voice) filt.push('[v]anull[a]'); else if (music) filt.push('[m]anull[a]');
    if (filt.length) maps.push('-filter_complex', filt.join(';'), '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '160k');
    const res = spawnSync(ff, ['-v', 'error', '-y', ...ins, ...maps, '-vf', `scale=${w}:${h}`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-t', String(world.dur), out], { encoding: 'utf8' });
    if (res.status !== 0) throw new Error(`ffmpeg: ${res.stderr}`);
    writeEvidence(DIR, name, { video: `\`${path.relative(DIR, out)}\``, dur: world.dur, r, stages: world.stages.length });
    console.log(`${path.relative(ROOT, out)} in ${((Date.now() - t00) / 1000).toFixed(1)} s · review/previs/previs.md`);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

if (path.resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message || e); process.exit(1); });
