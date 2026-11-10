// Frame capture for the stick-man pages: headless Chromium (Metal ANGLE), one worker, JPEG q92 or PNG by extension.
//   node styles/stick-man/tools/shot.mjs --view a --frames 0 --out films/stick-p0/out/a.png          (p0 page)
//   node styles/stick-man/tools/shot.mjs --view front --probe 1
//   node styles/stick-man/tools/shot.mjs --view a --speed 60 --stats films/stick-p0/out/speed.txt
// Reel page (styles/stick-man/reel.html) when --film is given:
//   --film films/stick01-dye-pack --frames 0-344 --out f_%d.jpg        stills
//   --film ... --frames 0-344 --mp4 renders/p1.mp4 [--w 540 --h 960]    mp4 with the voice from the right offset
//   --film ... --frames 0-344 --dbg dbg.jsonl                          __dbg + motion per frame, no render
//   --film ... --frames 0-344 --report review/p1-stats.txt --in renders/p1.mp4
//   --film ... --serve 1                                               keep a server up and print the URL
//   --film ... --cues audio/cues.json                                  sound cues from the picture: [{t, name, strength}]
//   --mp4 ... --audio films/x/audio/mix.wav                           mux this track instead of vo/vo.wav
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { start, run } from '../../../kit/env.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');                     // repo root: serves the page and node_modules/three
const A = {}; for (let i = 2; i < process.argv.length; i += 2) A[process.argv[i].replace(/^--/, '')] = process.argv[i + 1];
const W = Number(A.w || 1080), H = Number(A.h || 1920);
const REEL = !!A.film, page = A.page || (REEL ? 'styles/stick-man/reel.html' : 'styles/stick-man/p0.html');
const frames = (A.frames || '0').split(',').flatMap(s => { const [a, b] = s.split('-').map(Number); return b == null ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(Number(A.port || 0), '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/${page}`;
if (A.serve) { console.log(`${base}?film=${A.film}`); await new Promise(() => {}); }
const url = REEL ? `${base}?film=${A.film}&capture=1${A.query ? '&' + A.query : ''}` : `${base}?view=${A.view || 'a'}${A.query ? '&' + A.query : ''}`;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
p.on('pageerror', e => { console.error('pageerror', e.stack); process.exit(1); });
p.on('console', m => { if (m.type() === 'error') console.error('console', m.text()); });
await p.goto(url); await p.waitForFunction(() => window.__ready === true, null, { timeout: 180000 });
const shot = file => p.screenshot(/\.png$/i.test(file) ? { path: file } : { path: file, type: 'jpeg', quality: 92 });
const render = f => p.evaluate(f => window.__frame(f), f);

async function speed(list) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-shot-'));
  for (const f of list.slice(0, 5)) await render(f);                                       // warm-up
  const pageMs = [];
  for (const f of list) pageMs.push(await render(f));
  const t0 = Date.now();
  for (const f of list) { await render(f); await shot(path.join(tmp, `${f}.jpg`)); }
  fs.rmSync(tmp, { recursive: true, force: true });
  return { page: pageMs.reduce((a, b) => a + b, 0) / list.length, jpeg: (Date.now() - t0) / list.length };
}
// __dbg plus the page's motion numbers (camera px/frame at 720 wide, foot slide px/frame under the same camera)
const dbgAll = () => p.evaluate(fr => fr.map(f => ({ ...JSON.parse(window.__dbg(f)), motion: window.__motion(f) })), frames);
const compress = list => {
  const o = []; for (let i = 0; i < list.length; i++) { let j = i; while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++; o.push(i === j ? `${list[i]}` : `${list[i]}-${list[j]}`); i = j; }
  return o.join(', ');
};

// Acting numbers for one actor from __dbg rows (frames where it is in frame, cut frames left out):
// frozen = longest run of frames with every joint within 2 mm and every angle within 0.5 deg of the frame before;
// ratio = (shoulder-elbow + elbow-hand) / rest arm length; jump = largest one-frame change of a flex, a foot pitch,
// the torso lean or roll, or a limb segment's direction (deg).
const JOINTS = ['hip', 'knee', 'ankle', 'toe', 'shoulder', 'elbow', 'hand'], ANG = ['kneeFlex', 'elbowFlex', 'footPitch'];
const SEGS = [['shoulder', 'elbow'], ['elbow', 'hand'], ['hip', 'knee'], ['knee', 'ankle']], ARM = 2 * 0.41 * 0.60;
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dirAng = (a0, b0, a1, b1) => { const u = b0.map((x, i) => x - a0[i]), v = b1.map((x, i) => x - a1[i]), lu = Math.hypot(...u), lv = Math.hypot(...v);
  return lu < 1e-6 || lv < 1e-6 ? 0 : Math.acos(Math.max(-1, Math.min(1, u.reduce((s, x, i) => s + x * v[i], 0) / (lu * lv)))) * 180 / Math.PI; };
function acting(rows, n) {
  let run = 1, frozen = 0, frozenAt = null, ratio = 0, ratioAt = null, jump = 0, jumpAt = null; const per = [];   // per = worst joint change of each frame
  for (let i = 0; i < rows.length; i++) {
    const a = rows[i].actors[n], l = a.limbs; if (!a.inFrame || !l) { run = 1; continue; }
    for (const s of ['L', 'R']) { const q = (dist(l[s].shoulder, l[s].elbow) + dist(l[s].elbow, l[s].hand)) / ARM; if (q > ratio) { ratio = q; ratioAt = rows[i].f; } }
    const p = rows[i - 1]?.actors[n];
    // a sleeping face is meant to be still: it never counts toward a frozen run
    if (!p || !p.inFrame || !p.limbs || rows[i].motion.cut || rows[i].act !== rows[i - 1].act || a.expr === 'sleep') { run = 1; continue; }
    const m = p.limbs; let moved = dist(a.headW, p.headW) > 0.002 || Math.abs(l.torsoLean - m.torsoLean) > 0.5 || Math.abs(l.torsoRoll - m.torsoRoll) > 0.5;
    const chg = [['torsoLean', Math.abs(l.torsoLean - m.torsoLean)], ['torsoRoll', Math.abs(l.torsoRoll - m.torsoRoll)]];
    for (const s of ['L', 'R']) {
      for (const j of JOINTS) if (dist(l[s][j], m[s][j]) > 0.002) moved = true;
      for (const k of ANG) { const d = Math.abs(l[s][k] - m[s][k]); if (d > 0.5) moved = true; chg.push([k + s, d]); }
      for (const [x, y] of SEGS) chg.push([x + '-' + y + s, dirAng(m[s][x], m[s][y], l[s][x], l[s][y])]);
    }
    for (const [k, d] of chg) if (d > jump) { jump = d; jumpAt = `frame ${rows[i].f}, ${k}`; }
    const w = chg.reduce((a, b) => (b[1] > a[1] ? b : a), ['', 0]); per.push({ f: rows[i].f, k: w[0], d: w[1] });
    run = moved ? 1 : run + 1;
    if (run > frozen) { frozen = run; frozenAt = rows[i].f; }
  }
  // the five worst frames (not only the max: fixing one pop otherwise reveals the next) and how many frames are over 25 deg
  const top = [...per].sort((a, b) => b.d - a.d).slice(0, 5), over = per.filter(x => x.d > 25).map(x => x.f);
  return { frozen: frozen > 1 ? frozen : 0, frozenAt, ratio, ratioAt, jump, jumpAt, top, over };
}

if (A.speed && !REEL) {
  const n = Number(A.speed), r = await speed(Array.from({ length: n }, (_, i) => i));
  const txt = `view ${A.view || 'a'}, ${W}x${H}, ${n} frames, 1 worker: page-side render ${r.page.toFixed(1)} ms/frame (mean), render + JPEG q92 capture ${r.jpeg.toFixed(1)} ms/frame\n`;
  if (A.stats) fs.appendFileSync(A.stats, txt);
  process.stdout.write(txt);
} else if (A.probe) {                                           // --probe 1: print the page's measurements, no file
  await render(frames[0]);
  console.log(await p.evaluate(f => window.__probe ? JSON.stringify(window.__probe()) : window.__dbg(f), frames[0]));
} else if (A.cues) {
  const c = await p.evaluate(() => window.__cues());
  fs.mkdirSync(path.dirname(path.resolve(A.cues)), { recursive: true });
  fs.writeFileSync(A.cues, '[\n' + c.map(x => JSON.stringify(x)).join(',\n') + '\n]\n');
  console.log(`${A.cues}  ${c.length} cues`);
} else if (A.dbg) {
  const rows = await dbgAll();
  fs.mkdirSync(path.dirname(A.dbg), { recursive: true });
  fs.writeFileSync(A.dbg, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log(`${A.dbg}  ${rows.length} frames`);
} else if (A.mp4) {
  const fps = 30, f0 = frames[0], n = frames.length, wav = A.audio ? path.resolve(A.audio) : path.join(ROOT, A.film, 'vo', 'vo.wav');
  fs.mkdirSync(path.dirname(path.resolve(A.mp4)), { recursive: true });
  const ff = start('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    '-ss', (f0 / fps).toFixed(4), '-t', (n / fps).toFixed(4), '-i', wav, '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(fps), '-c:a', 'aac', '-b:a', '192k',
    '-shortest', '-movflags', '+faststart', path.resolve(A.mp4)], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg ' + c)) : res())));
  const t0 = Date.now(); let ms = 0;
  for (const f of frames) {
    ms += await render(f);
    const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}\n`);
  }
  ff.stdin.end(); await done;
  console.log(`${A.mp4}  ${n} frames ${W}x${H}  page ${(ms / n).toFixed(1)} ms/frame, with JPEG ${((Date.now() - t0) / n).toFixed(1)} ms/frame`);
} else if (A.report) {
  const L = [], pct = (a, b) => (100 * a / b).toFixed(1) + ' %';
  // (a) clear / small / still frames, measured on the mp4 exactly as specified (skipped without --in)
  if (A.in) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stick-diff-')), dtxt = path.join(tmp, 'd.txt');
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', path.resolve(A.in), '-vf',
    `crop=iw:ih*0.6:0:0,scale=270:288,tblend=all_mode=difference,signalstats,metadata=print:file=${dtxt.replace(/\\/g, '/').replace(/:/g, '\\:')}`, '-f', 'null', '-']);
  const yavg = fs.readFileSync(dtxt, 'utf8').split('\n').filter(l => l.includes('YAVG=')).map(l => Number(l.split('=')[1]));
  fs.rmSync(tmp, { recursive: true, force: true });
  const still = yavg.filter(y => y < 0.2).length, small = yavg.filter(y => y >= 0.2 && y < 1.0).length, clear = yavg.length - still - small;
  L.push(`(a) frame-to-frame difference on ${path.basename(A.in)} (${yavg.length} diffs, top 60 %, 270x288, YAVG):`,
    `    clear (>= 1.0) ${clear}  ${pct(clear, yavg.length)}   small (0.2-1.0) ${small}  ${pct(small, yavg.length)}   still (< 0.2) ${still}  ${pct(still, yavg.length)}`,
    `    YAVG median ${[...yavg].sort((a, b) => a - b)[yavg.length >> 1].toFixed(2)}, min ${Math.min(...yavg).toFixed(2)}`);
  const weak = yavg.map((y, i) => [i + 1 + frames[0], y]).filter(([, y]) => y < 1.0).map(([f]) => f);
  L.push(`    frames not clear: ${compress(weak) || 'none'}`);
  }
  // (b) from __dbg
  const rows = await dbgAll();
  let run0 = 0, best = 0, bestAt = 0; const camPx = rows.map(r => r.motion.cut ? NaN : r.motion.cam);
  camPx.forEach((v, i) => { if (i === 0 || Number.isNaN(v)) return; if (v < 0.01) { run0++; if (run0 > best) { best = run0; bestAt = rows[i].f; } } else run0 = 0; });
  const live = camPx.slice(1).filter(x => !Number.isNaN(x)), peak = Math.max(...live), peakAt = rows[camPx.indexOf(peak)].f;
  const fast = rows.filter((r, i) => i > 0 && camPx[i] > 25).map(r => r.f), cuts = rows.filter(r => r.motion.cut).map(r => r.f);
  L.push(`(b) from __dbg over frames ${frames[0]}-${frames[frames.length - 1]}:`,
    `    longest run with no camera motion: ${best} frames${best ? ' (ends ' + bestAt + ')' : ''}; camera speed at 720p: peak ${peak.toFixed(1)} px/frame (frame ${peakAt}), median ${[...live].sort((a, b) => a - b)[live.length >> 1].toFixed(2)}`,
    `    (dissolve and flash-cut frames left out of the camera numbers: ${compress(cuts) || 'none'}; frames over 25 px/frame: ${compress(fast) || 'none'})`);
  for (const n of Object.keys(rows[0].actors)) {
    const starts = rows.filter((r, i) => i > 0 && r.actors[n].blink === 1 && rows[i - 1].actors[n].blink === 0).map(r => r.f);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]);
    let slide = 0, slideAt = null;
    rows.forEach(r => { for (const s of ['L', 'R']) { const m = r.motion.feet[n]?.[s]; if (m && m.planted && m.px > slide) { slide = m.px; slideAt = r.f; } } });
    const out = rows.filter(r => { const a = r.actors[n]; return a.inFrame && (a.head[0] < 0.08 * W || a.head[2] > 0.92 * W); }).map(r => r.f);
    const band = rows.filter(r => { const a = r.actors[n]; return a.inFrame && a.head[3] > 0.66 * H && a.head[1] < 0.78 * H; }).map(r => r.f);
    L.push(`    ${n}: blinks ${starts.length}, gaps ${gaps.length ? Math.min(...gaps) + '-' + Math.max(...gaps) : '-'} frames (${gaps.join(' ')}); in frame ${rows.filter(r => r.actors[n].inFrame).length}/${rows.length}`,
      `      largest stance-foot slide ${slide.toFixed(2)} px/frame at 720p${slideAt != null ? ' (frame ' + slideAt + ')' : ''}`,
      `      head box in caption band 66-78 %: ${compress(band) || 'never'}; head box outside x 8-92 %: ${compress(out) || 'never'}`);
    const ac = acting(rows, n);
    L.push(`      acting: longest frozen run ${ac.frozen} frames${ac.frozen ? ' (ends ' + ac.frozenAt + ')' : ''}; largest arm length ratio ${ac.ratio.toFixed(3)}${ac.ratioAt != null ? ' (frame ' + ac.ratioAt + ')' : ''}; largest one-frame joint change ${ac.jump.toFixed(1)} deg${ac.jumpAt ? ' (' + ac.jumpAt + ')' : ''}`,
      `      joint change top 5: ${ac.top.map(x => `${x.d.toFixed(1)} (frame ${x.f}, ${x.k})`).join('; ') || '-'}; frames over 25 deg: ${compress(ac.over) || 'none'}`,
      `      head cut by the top edge: ${compress(rows.filter(r => { const a = r.actors[n]; return a.inFrame && a.head[1] < 0; }).map(r => r.f)) || 'never'}`);
  }
  // the largest figure in frame under 30 % of the frame height (sole to head top), longest run over --small (default all)
  const [s0, s1] = (A.small || `${frames[0]}-${frames[frames.length - 1]}`).split('-').map(Number);
  let sr = 0, sBest = 0, sAt = null; const smallF = [];
  for (const r of rows) {
    if (r.f < s0 || r.f > s1) continue;
    const seen = Object.values(r.actors).filter(a => a.inFrame && a.figH != null);
    if (!seen.length) { sr = 0; continue; }   // a prop-only cutaway has no figure to be small
    const big = Math.max(...seen.map(a => a.figH));
    if (big < 0.30) { sr++; smallF.push(r.f); if (sr > sBest) { sBest = sr; sAt = r.f; } } else sr = 0;
  }
  L.push(`    largest figure under 30 % of frame height in ${s0}-${s1}: longest run ${sBest} frames${sAt != null ? ' (ends ' + sAt + ')' : ''}; frames: ${compress(smallF) || 'none'}`);
  // (d) contact: hand dot to held prop's grip socket, px at this frame size (on screen only), per actor
  const k1080 = 1080 / W, gaps = {};
  for (const r of rows) for (const h of r.held || []) {
    if (!h.onScreen || r.motion.cut) continue;
    const g = (gaps[h.actor] ||= { max: 0, at: null, props: new Set(), n: 0 }); g.n++; g.props.add(h.prop);
    if (h.gapPx * k1080 > g.max) { g.max = h.gapPx * k1080; g.at = `${r.f} ${h.prop}`; }
  }
  L.push(`(d) hand to held prop (grip socket), max gap px at 1080p (target <= 2):`);
  for (const [n, g] of Object.entries(gaps)) L.push(`    ${n}: ${g.max.toFixed(2)} px${g.at ? ' (frame ' + g.at + ')' : ''} over ${g.n} held frames, props ${[...g.props].join(', ')}`);
  if (!Object.keys(gaps).length) L.push('    no held props on screen');
  // (e) bodies inside set geometry (and torso in torso)
  const hits = rows.filter(r => r.collide?.length);
  const kinds = {}; for (const r of hits) for (const c of r.collide) (kinds[c] ||= []).push(r.f);
  L.push(`(e) actor body inside set collision boxes (target none): ${hits.length ? hits.length + ' frames' : 'none'}`);
  for (const [c, fs] of Object.entries(kinds)) L.push(`    ${c}: ${compress(fs)}`);
  // (f) close-ups: head centre x of the shot's subject (settled frames, glide done), % of the width (target 45-55)
  const cus = {};
  for (const r of rows) {
    const m = /^cu\(([^)]*)\)/.exec(r.camera.shot || ''); if (!m || r.camera.glide != null || r.motion.cut) continue;
    const a = r.actors[m[1].split(',')[0]]; if (!a?.inFrame) continue;
    (cus[r.shotI + ' ' + r.act + ' ' + m[1]] ||= []).push([r.f, 100 * (a.head[0] + a.head[2]) / 2 / W]);
  }
  L.push(`(f) close-ups, subject head centre x (% of width, settled frames):`);
  for (const [k, xs] of Object.entries(cus)) { const v = xs.map(x => x[1]).sort((a, b) => a - b);
    L.push(`    shot ${k}, frames ${xs[0][0]}-${xs[xs.length - 1][0]}: min ${v[0].toFixed(1)}, median ${v[v.length >> 1].toFixed(1)}, max ${v[v.length - 1].toFixed(1)}`); }
  if (A.fast) { fs.mkdirSync(path.dirname(A.report), { recursive: true }); fs.writeFileSync(A.report, L.join('\n') + '\n'); console.log(L.join('\n')); await browser.close(); server.close(); process.exit(0); }
  // (c) speed
  const sp = await speed(frames.filter((_, i) => i % Math.max(1, Math.floor(frames.length / 60)) === 0).slice(0, 60));
  L.push(`(c) speed, ${W}x${H}, 1 worker: page-side render ${sp.page.toFixed(1)} ms/frame, render + JPEG q92 capture ${sp.jpeg.toFixed(1)} ms/frame`);
  fs.mkdirSync(path.dirname(A.report), { recursive: true });
  fs.writeFileSync(A.report, L.join('\n') + '\n'); console.log(L.join('\n'));
} else {
  const out = A.out || 'shot.jpg'; fs.mkdirSync(path.dirname(out), { recursive: true });
  for (const f of frames) {
    const ms = await render(f);
    const file = out.replace('%d', String(f)); await shot(file);
    console.log(`${file}  frame ${f}  ${ms.toFixed(1)} ms`);
  }
}
await browser.close(); server.close();
