// Render a stick-man film (films/<name>/reel.js) in headless Chromium. Run from the library root.
//   node styles/stick-man/tools/pack/render.mjs --film films/<name> --frames 0,60,120 --out films/<name>/stills/f_%d.jpg
//   node styles/stick-man/tools/pack/render.mjs --film films/<name> --mp4 films/<name>/renders/draft.mp4 [--audio films/<name>/audio/mix.wav]
//   node styles/stick-man/tools/pack/render.mjs --film films/<name> --dbg films/<name>/review/frames.jsonl   (data for check.mjs, no pictures)
//   node styles/stick-man/tools/pack/render.mjs --film films/<name> --cues films/<name>/audio/cues.json     (sound cues from the picture and
//        audio/cues-extra.json, for tools/run/mix.py)
//   node styles/stick-man/tools/pack/render.mjs --page faces --out faces.jpg                               (the 64 kit faces on one sheet)
// --size 720 (default, 720x1280: drafts and review) | 1080 (1080x1920: the final export). --frames a-b, a,b,c or all (default all).
// The mp4 carries vo/vo.wav unless --audio names another track. Every frame is a pure function of its number, so a
// render can be stopped and run again at any time.
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { start } from '../../../../kit/env.mjs';
import { EXE, ARGS } from '../../../../core/render/browser.mjs';
import { serveFiles } from '../render/pageserver.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help')) {
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n'));
  process.exit(argv.length ? 0 : 2);
}
const A = {}; for (let i = 0; i < argv.length; i += 2) A[argv[i].replace(/^--/, '')] = argv[i + 1];
const SIZE = { 720: [720, 1280], 1080: [1080, 1920], 540: [540, 960] }[A.size || '720'];
if (!SIZE) { console.error(`--size ${A.size}: use 720 or 1080`); process.exit(2); }
const [W, H] = SIZE;
const film = A.film?.replace(/\/$/, '');
if (film) {
  for (const f of ['reel.js', 'vo/words.json']) if (!fs.existsSync(path.join(ROOT, film, f))) { console.error(`${film}/${f} is missing (make-reel-stick-man step 4 writes it)`); process.exit(1); }
  const { status, stderr } = await import('node:child_process').then(c => c.spawnSync(process.execPath, ['--check', path.join(ROOT, film, 'reel.js')], { encoding: 'utf8' }));
  if (status) { console.error(`${film}/reel.js does not parse:\n${stderr.trim()}`); process.exit(1); }
} else if (A.page !== 'faces') { console.error('give --film films/<name> (or --page faces)'); process.exit(2); }

const server = await serveFiles(ROOT);
const port = server.address().port;
const url = film ? `http://127.0.0.1:${port}/styles/stick-man/reel.html?film=${film}&capture=1` : `http://127.0.0.1:${port}/styles/stick-man/faces.html?view=a`;
const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
const page = await (await browser.newContext({ viewport: film ? { width: W, height: H } : { width: 1560, height: 1300 }, deviceScaleFactor: 1 })).newPage();
let failed = false;
page.on('pageerror', e => { failed = true; console.error(`the page failed: ${e.message}`); });
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) console.error('page:', m.text()); });
const done = async code => { await browser.close(); server.close(); process.exit(code); };
await page.goto(url);
// ready, or a page error (a mistake in reel.js shows here with its message), or 3 minutes
for (let t = 0; !failed && !(await page.evaluate(() => window.__ready === true)); t += 250) {
  if (t > 180000) { console.error('the page did not get ready in 3 minutes'); await done(1); }
  await page.waitForTimeout(250);
}
if (failed) await done(1);

if (!film) {                                                     // the face sheet
  await page.waitForTimeout(500); await page.screenshot({ path: path.resolve(A.out || 'faces.jpg'), type: 'jpeg', quality: 92 });
  console.log(path.resolve(A.out || 'faces.jpg')); await done(0);
}
const [F0, F1] = await page.evaluate(() => window.__F);
const pick = s => !s || s === 'all' ? Array.from({ length: F1 - F0 + 1 }, (_, i) => F0 + i)
  : s.split(',').flatMap(p => { const [a, b] = p.split('-').map(Number); return b == null ? [a] : Array.from({ length: b - a + 1 }, (_, i) => a + i); });
const frames = pick(A.frames);
const draw = f => page.evaluate(f => window.__frame(f), f);
const mkdir = f => fs.mkdirSync(path.dirname(path.resolve(f)), { recursive: true });
const t0 = Date.now(), eta = i => { const s = (Date.now() - t0) / 1000 / i * (frames.length - i); return s > 60 ? `${Math.round(s / 60)} min` : `${Math.round(s)} s`; };

if (A.cues) {
  // the engine's own cues (impacts, set beats with a sound-bank name), footsteps where a foot lands on the floor in view,
  // and the film's hand-placed sounds from audio/cues-extra.json ([{ t, name, strength }], any name in sound/library.json)
  const c = await page.evaluate(() => window.__cues());
  const steps = await page.evaluate(fr => { const out = [], was = {}; let n = 0;
    // a foot lands: its ankle drops from over 8 cm back to the floor (under 3 cm; the ankle rests 1.6 cm up)
    for (const f of fr) { const d = JSON.parse(window.__dbg(f));
      for (const [who, a] of Object.entries(d.actors)) for (const s of ['L', 'R']) { const k = who + s, z = a.feet?.[s]?.[2] ?? 0, on = z < 0.03;
        if (on && was[k] > 0.08 && a.inFrame) out.push({ t: +(f / 30).toFixed(4), name: n++ % 2 ? 'step_r' : 'step_l', strength: 0.45 }); if (on) was[k] = 0; else was[k] = Math.max(was[k] ?? 0, z); } }
    return out; }, frames);
  const extra = path.join(ROOT, film, 'audio', 'cues-extra.json');
  c.push(...steps, ...(fs.existsSync(extra) ? JSON.parse(fs.readFileSync(extra, 'utf8')) : []));
  c.sort((a, b) => a.t - b.t); mkdir(A.cues);
  fs.writeFileSync(A.cues, '[\n' + c.map(x => JSON.stringify(x)).join(',\n') + '\n]\n'); console.log(`${A.cues}: ${c.length} sound cues`);
} else if (A.dbg) {
  mkdir(A.dbg); const out = fs.createWriteStream(A.dbg);
  for (const f of frames) { const row = await page.evaluate(f => { const motion = window.__motion(f); return { ...JSON.parse(window.__dbg(f)), motion }; }, f); out.write(JSON.stringify(row) + '\n'); }
  await new Promise(r => out.end(r)); console.log(`${A.dbg}: ${frames.length} frames`);
} else if (A.mp4) {
  const wav = path.resolve(A.audio || path.join(ROOT, film, 'vo', 'vo.wav')), fps = 30; mkdir(A.mp4);
  const audio = fs.existsSync(wav) ? ['-ss', (frames[0] / fps).toFixed(4), '-t', (frames.length / fps).toFixed(4), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k'] : [];
  const ff = start('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', ...audio,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', W >= 1080 ? '16' : '19', '-pix_fmt', 'yuv420p', '-r', String(fps), '-movflags', '+faststart', '-shortest', path.resolve(A.mp4)], { stdio: ['pipe', 'inherit', 'inherit'] });
  let i = 0;
  for (const f of frames) {
    await draw(f); const jpg = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(jpg)) await new Promise(r => ff.stdin.once('drain', r));
    if (++i % 60 === 0) console.log(`  ${i}/${frames.length} frames, about ${eta(i)} left`);
  }
  ff.stdin.end(); const code = await new Promise(r => ff.on('close', r));
  if (code) { console.error(`ffmpeg stopped (${code})`); await done(1); }
  console.log(`${A.mp4}: ${frames.length} frames, ${W}x${H}${audio.length ? '' : ' (no audio: vo/vo.wav is missing)'}`);
} else {
  const out = A.out || path.join(film, 'stills', 'f_%d.jpg');
  for (const f of frames) { await draw(f); const file = path.resolve(out.replace('%d', String(f))); mkdir(file); await page.screenshot({ path: file, type: 'jpeg', quality: 92 }); }
  console.log(`${frames.length} still(s): ${out}`);
}
await done(failed ? 1 : 0);
