// draft.mjs: fast draft verify of a kai-hand-draw film. Run from the library root.
//   node .claude/skills/verify/draft.mjs doctor [<film>]       is this machine (and film) ready to verify?
//   node .claude/skills/verify/draft.mjs <film> [--fps=8] [--w=270] [--n=6] [--workers=4] [--out=<film>/out/verify]
// The page always renders at 1080x1920: page.css pins #out to 1080x1920 px, so a smaller viewport (core/render
// --size 270x480) screenshots only the top-left corner. Instead each frame is drawn full size and scaled down inside
// the page (window.renderSheet), then encoded small and muxed with the film's assets/reel-audio.wav.
// A film with a preset (core/preset.mjs; job.json `preset: test` or REEL_PRESET=test) is drafted only up to the
// preset's maxDur seconds.
// Writes <film>/out/verify/{draft.mp4, sheet.jpg, report.json}. Exit 0 = every check passed, 1 = a check failed or the
// page threw. Reads core/ and the engine; edits nothing outside the film's out/verify/.
import { env, start, run as runTool } from '../../../kit/env.mjs';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { openDemo, closeServer, ROOT } from '../../../core/render/page.mjs';
import { step as job } from '../../../core/job.mjs';
import { presetOf } from '../../../core/preset.mjs';

const argv = process.argv.slice(2), pos = argv.filter(a => !a.startsWith('--'));
const flag = (k, d) => { const f = argv.find(a => a.startsWith(`--${k}=`)); return f ? f.split('=')[1] : d; };
const run = (tool, args) => runTool(tool, args, { capture: true });
const t0 = Date.now(), secs = () => ((Date.now() - t0) / 1000).toFixed(1) + ' s';

if (pos[0] === 'doctor') {
  const film = pos[1] && resolve(pos[1]);
  const rows = [
    ['node_modules (p5.brush, playwright-core)', existsSync(join(ROOT, 'node_modules/p5.brush')) && existsSync(join(ROOT, 'node_modules/playwright-core'))],
    ...['python', 'ffmpeg', 'ffprobe'].map(t => [`${t} (pixi env)`, !!env().tools?.[t]]),
  ];
  if (film) for (const f of ['index.html', 'src/config.js', 'src/vo.js', 'vo/vo.json', 'assets/reel-audio.wav']) rows.push([`${pos[1]}/${f}`, existsSync(join(film, f))]);
  for (const [n, ok] of rows) console.log(`${ok ? '✓' : '✗'} ${n}`);
  try { const { browser, page } = await openDemo(film || join(ROOT, 'styles/kai-hand-draw/demo'), { w: 1080, h: 1920 }); console.log(`✓ page opens, READY, GPU: ${await page.evaluate(() => window.gpuInfo?.() || '?')}`); await browser.close(); }
  catch (e) { rows.push(['page opens', false]); console.log(`✗ page opens: ${e.message}`); }
  closeServer();
  process.exit(rows.every(r => r[1]) ? 0 : 1);
}

const film = pos[0] && resolve(pos[0]);
if (!film || !existsSync(join(film, 'index.html'))) { console.error('usage: node .claude/skills/verify/draft.mjs <film> | doctor [<film>]'); process.exit(2); }
const FPS = +flag('fps', 8), W = +flag('w', 270), H = Math.round(W * 16 / 9 / 2) * 2, N = +flag('n', 6), WK = +flag('workers', 4);
let P; try { P = presetOf(film); } catch (e) { console.error('✗ ' + e.message); process.exit(2); }
const OUT = resolve(flag('out', join(film, 'out/verify'))), MP4 = join(OUT, 'draft.mp4'), AUDIO = join(film, 'assets/reel-audio.wav');
mkdirSync(OUT, { recursive: true });
job(film, 'draft', 'running', { pct: 0 });   // films/<slug>/job.json: the draft step, its pct in tens while frames draw

// openDemo prints page console errors and exits 1 on an uncaught page error; count the console ones here too
const pageErrors = [], err = console.error;
// (warnings too: a vo('word') missing from the voiceover is a warning; the WebGL ones when a page opens are harmless)
console.error = (...a) => { const s = a.join(' '); if (s.startsWith('[page]') && !/optional file missing|WebGL: INVALID_OPERATION|GL Driver Message \(.*Performance/.test(s)) pageErrors.push(s); err(...a); };
const open = () => openDemo(film, { w: 1080, h: 1920, warnings: true });
const threw = (at, e) => { console.error(`✗ the page threw at ${typeof at === 'number' ? 't = ' + at.toFixed(3) + ' s' : at}: ${String(e.message || e).split('\n')[0]}`); process.exit(1); };
let finished = false;
process.on('exit', code => { if (code === 1 && !finished) err(`✗ draft verify FAILED after ${secs()} (reason above)`); });

const dataURL = u => Buffer.from(u.slice(u.indexOf(',') + 1), 'base64');
const probe = await open(), DUR = await probe.page.evaluate(() => window.DUR);
if (!(DUR > 0)) { console.error(`window.DUR must be a positive number (got ${DUR})`); process.exit(1); }
const LEN = P ? Math.min(DUR, P.maxDur) : DUR;   // the seconds drafted
if (P) console.log(`preset ${P.name}: drafting ${LEN.toFixed(2)} of ${DUR.toFixed(2)} s`);
const times = [...Array(N)].map((_, i) => +((i + .5) / N * LEN).toFixed(2));
const sheet = await probe.page.evaluate(([ts, c]) => window.renderSheet(ts, c, 270), [times, Math.ceil(N / 2)]).catch(e => threw(`the stills sheet (${times.join(', ')} s)`, e));
writeFileSync(join(OUT, 'sheet.jpg'), dataURL(sheet.url));
await probe.browser.close();

const TOTAL = Math.round(LEN * FPS), per = Math.ceil(TOTAL / WK), frames = new Array(TOTAL), ink = new Array(TOTAL);
let drawn = 0, pct = 0;
await Promise.all([...Array(WK)].map(async (_, w) => {
  const a = w * per, b = Math.min(TOTAL, a + per); if (a >= b) return;
  const { browser, page } = await open();
  // window.render paints #out at 1080x1920; copy it down to W×H in the page (renderSheet would burn a time label in,
  // which hides frozen stretches from freezedetect). ink = share of dark pixels outside the caption band (y 1300–1490):
  // the cast and props are outlined in ink, bare paper with only a caption has almost none.
  for (let f = a; f < b; f++) {
    const r = await page.evaluate(async ([t, w, h]) => {
      await window.render(t);
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), x = c.getContext('2d', { willReadFrequently: true });
      x.drawImage(document.getElementById('out'), 0, 0, w, h);
      const d = x.getImageData(0, 0, w, h).data, b0 = Math.floor(h * 1300 / 1920), b1 = Math.ceil(h * 1490 / 1920);
      let dark = 0, n = 0;
      for (let y = 0; y < h; y++) { if (y >= b0 && y < b1) continue; for (let i = y * w * 4, e = i + w * 4; i < e; i += 4, n++) if (.299 * d[i] + .587 * d[i + 1] + .114 * d[i + 2] < 80) dark++; }
      return { url: c.toDataURL('image/jpeg', .85), ink: dark / n };
    }, [f / FPS, W, H]).catch(e => threw(f / FPS, e));
    frames[f] = dataURL(r.url); ink[f] = r.ink;
    const p = Math.floor(++drawn / TOTAL * 10) * 10;
    if (p > pct) job(film, 'draft', 'running', { pct: pct = p });
  }
  await browser.close();
}));
closeServer();

const hasAudio = existsSync(AUDIO);
await new Promise((ok, no) => {
  const ff = start('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...(hasAudio ? ['-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '96k'] : []),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', ...(P ? ['-t', String(LEN)] : []), MP4], { stdio: ['pipe', 'inherit', 'inherit'] });
  ff.on('close', c => c === 0 ? ok() : no(new Error('ffmpeg exit ' + c)));
  for (const f of frames) ff.stdin.write(f);
  ff.stdin.end();
});

const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4]).stdout || '{}');
const v = (pr.streams || []).find(s => s.codec_type === 'video'), au = (pr.streams || []).find(s => s.codec_type === 'audio');
const vdur = v ? +v.duration : 0, adur = au ? +au.duration : 0;
const vo = existsSync(join(film, 'vo/vo.json')) ? JSON.parse(readFileSync(join(film, 'vo/vo.json'), 'utf8')) : null;
const ff = vf => run('ffmpeg', ['-hide_banner', '-nostats', '-i', MP4, '-vf', vf, '-an', '-f', 'null', '-']).stderr || '';
const freezes = [...ff('freezedetect=n=0.003:d=0.7').matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map(m => `${(+m[1]).toFixed(2)}–${(+m[2]).toFixed(2)} s`);
const blacks = [...ff('blackdetect=d=0.1:pix_th=0.1').matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => `${(+m[1]).toFixed(2)}–${(+m[2]).toFixed(2)} s`);
// VERIFY_INK=1 prints every frame's ink %, to recalibrate EMPTY on a film whose look differs
if (process.env.VERIFY_INK) console.log(ink.map((v, f) => `${(f / FPS).toFixed(2)}:${(v * 100).toFixed(2)}`).join(' '));
const EMPTY = .002, empties = [];   // a stretch ≥ 0.5 s with under 0.2 % ink = a scene that drew nothing
for (let f = 0, s = -1; f <= TOTAL; f++) {
  if (f < TOTAL && ink[f] < EMPTY) { if (s < 0) s = f; continue; }
  if (s >= 0 && (f - s) / FPS >= .5) empties.push(`${(s / FPS).toFixed(2)}–${(f / FPS).toFixed(2)} s`); s = -1;
}
const checks = [
  ['no page errors', !pageErrors.length, pageErrors.length ? pageErrors.slice(0, 5).join(' | ') : 'none'],
  [`draft video ${W}×${H} @ ${FPS} fps`, !!v && v.width === W && v.height === H, v ? `${v.width}×${v.height} ${v.r_frame_rate}` : 'no video stream'],
  ['has an audio stream', !!au, au ? `${au.codec_name} ${adur.toFixed(2)} s` : hasAudio ? 'none' : `none: ${AUDIO} missing (make.mjs <film> audio)`],
  [P ? `video length = min(window.DUR, ${P.maxDur} s) ± 1 frame` : `video length = window.DUR ± 1 frame`, Math.abs(vdur - LEN) <= 1 / FPS + 1e-3, `${vdur.toFixed(3)} s vs ${LEN.toFixed(3)} s`],
  ['picture length = voiceover ± 1/30 s', !!vo && Math.abs(DUR - vo.duration) <= 1 / 30 + 1e-3, vo ? `${DUR.toFixed(3)} s vs vo ${vo.duration.toFixed(3)} s` : 'vo/vo.json missing (make.mjs <film> vo)'],
  ['audio length = picture ± 0.1 s', !!au && Math.abs(adur - LEN) <= .1, au ? `${adur.toFixed(3)} s vs ${LEN.toFixed(3)} s` : 'no audio'],
  ['no frozen stretch (freezedetect n=0.003 d=0.7)', !freezes.length, freezes.join(', ') || 'none'],
  ['no black frames', !blacks.length, blacks.join(', ') || 'none'],
  ['no empty scene (≥ 0.5 s with < 0.2 % ink outside the captions)', !empties.length, empties.join(', ') || `min ink ${(Math.min(...ink) * 100).toFixed(2)} %`],
];
for (const [n, ok, d] of checks) console.log(`${ok ? '✓' : '✗'} ${n}: ${d}`);
const pass = checks.every(c => c[1]);
writeFileSync(join(OUT, 'report.json'), JSON.stringify({ film, pass, ...(P && { preset: P.name }), seconds: +((Date.now() - t0) / 1000).toFixed(1), fps: FPS, size: `${W}x${H}`, sheetTimes: times, checks: checks.map(([name, ok, detail]) => ({ name, ok, detail })) }, null, 1));
finished = true;
job(film, 'draft', pass ? 'done' : 'failed', { files: [MP4, join(OUT, 'sheet.jpg'), join(OUT, 'report.json')] });
console.log(`${pass ? '✓ draft verify PASSED' : '✗ draft verify FAILED'} in ${secs()}\n  ${MP4}\n  ${join(OUT, 'sheet.jpg')}  (open it: stills at ${times.join(', ')} s)\n  ${join(OUT, 'report.json')}`);
process.exit(pass ? 0 : 1);
