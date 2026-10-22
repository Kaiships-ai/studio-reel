// look.mjs: check images of a kai-hand-draw film, on the shared renderer (core/render/page.mjs). Run from the library
// root. <film> is the film's folder (films/<name>, or styles/kai-hand-draw/demo).
//
//   node styles/kai-hand-draw/tools/look.mjs <film> --sheet=0.5,1,1.5,2 [--cols=4] [--w=270] --out=<film>/out/check/a.jpg
//       contact sheet of chosen times
//   … --strip=2.0:2.5 [--cols=6] [--w=216] --out=…/strip.jpg      EVERY frame in a stretch (motion)
//   … --sheet=2.1,2.2 --crop=300,700,480,480 --w=480 --out=…       full-res crops (faces, hands, contacts)
//   … --strip=2.0:2.5 --crop-at=540,1200,500,400 --out=…           crops that follow a WORLD point through each frame's
//       camera (x,y in world px, may be page expressions; w,h in screen px)
//   … --stills=1.2,3.4 [--out=<film>/out/stills]                    full-res PNGs
//   … --clip=2:6 [--out=<film>/out/check/part.mp4]                  a stretch straight to MP4, with the film's audio
//   … --camscan [--workers=4]                                       camera speed: px per frame on screen, every frame
//   Any of them: --safe (Instagram UI, safe zone, caption band) · --no-captions · --loop=<name> (sheets.js: kai,
//   clawd, cast; times are then loop times).
import { start } from '../../../kit/env.mjs';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { openDemo, closeServer, requireDemo } from '../../../core/render/page.mjs';

const argv = process.argv.slice(2), film = argv.find(a => !a.startsWith('--'));
const args = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true]; }));
requireDemo(film);
const cfgFps = (readFileSync(join(film, 'src/config.js'), 'utf8').match(/\bfps:\s*(\d+)/) || [])[1];
const fps = +(args.fps || cfgFps || 30);
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);
// comma-separated fields, keeping commas inside parentheses ('PLK.MX(1.38),PLK.WL,500,300'); numbers stay numbers
const fields = s => { const out = []; let d = 0, cur = ''; for (const ch of String(s)) { if (ch === ',' && !d) { out.push(cur); cur = ''; continue; } d += ch === '(' ? 1 : ch === ')' ? -1 : 0; cur += ch; } out.push(cur); return out.map(v => isNaN(+v) ? v : +v); };
const q = [args.safe && 'safe', args['no-captions'] && 'nocap', args.loop && 'loop=' + args.loop].filter(Boolean).join('&');
const open = () => openDemo(film, { w: 1080, h: 1920, q });
const dataURL = url => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
const opened = [];
const page = async () => { const o = await open(); opened.push(o.browser); if (args.loop && !(await o.page.evaluate(() => !!window.LOOP))) { console.error(`no loop named "${args.loop}" (sheets.js)`); process.exit(1); } return o.page; };

if (args.sheet || args.strip) {
  const p = await page(), out = args.out || join(film, 'out/check/sheet.jpg'); mkdirSync(dirname(out), { recursive: true });
  let ts;
  if (args.strip) { const [a, b] = span(args.strip); ts = []; for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps); }
  else ts = times(args.sheet);
  const crop = args.crop ? times(args.crop) : null, at = args['crop-at'] ? fields(args['crop-at']) : null;
  const { url, ms } = await p.evaluate(([ts, c, w, crop, at]) => window.renderSheet(ts, c, w, crop, at), [ts, +(args.cols || (args.strip ? 6 : 4)), +(args.w || (args.strip ? 216 : 270)), crop, at]);
  writeFileSync(out, dataURL(url));
  console.log(`${out}  (${ts.length} frames)  ms/frame: ${ms.join(' ')}`);
} else if (args.stills) {
  const p = await page(), out = args.out || join(film, 'out/stills'); mkdirSync(out, { recursive: true });
  for (const s of times(args.stills)) {
    const t0 = Date.now(), url = await p.evaluate(t => window.renderAt(t, 'image/png'), s);
    const f = join(out, `t${s.toFixed(2).replace('.', '_')}.png`); writeFileSync(f, dataURL(url));
    console.log(`${f}  ${Date.now() - t0} ms`);
  }
} else if (args.clip) {
  const p = await page(), [a, b] = span(args.clip), out = args.out || join(film, 'out/check/clip.mp4'); mkdirSync(dirname(out), { recursive: true });
  const audio = join(film, 'assets/reel-audio.wav'), withAudio = existsSync(audio);
  if (!withAudio) console.log(`note: ${audio} does not exist yet, the clip has no sound (make.mjs ${film} audio)`);
  const ff = start('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
    ...(withAudio ? ['-ss', String(a), '-t', String(b - a), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const n = Math.round((b - a) * fps);
  for (let i = 0; i < n; i++) {
    const buf = dataURL(await p.evaluate(t => window.renderAt(t, 'image/jpeg', .93), a + i / fps));
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  console.log(`wrote ${out}`);
} else if (args.camscan) {
  // How far the picture slides on screen from one frame to the next, from the camera each frame used (LAST_CAM).
  // Five screen points (safe-zone corners and centre) are carried through both cameras; the largest move counts.
  // Frames across a shot change or under a chapter wipe are skipped: those are cuts, not camera moves. Over the limit
  // for 3+ frames in a row is a move that is too fast; 1–2 frames is a hit shake, which the style allows.
  const probe = await page(), len = await probe.evaluate(() => window.DUR), n = Math.round(len * fps), workers = +(args.workers || 4);
  const cams = new Array(n); let next = 0;
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const p = k ? await page() : probe;
    while (next < n) {
      const i = next++;
      cams[i] = await p.evaluate(async t => {
        T = t; await redraw();
        let shot = 0; while (shot + 1 < SHOTS.length && t >= SHOTS[shot + 1][0]) shot++;
        const wipe = (typeof WIPES !== 'undefined') && WIPES.some(w => Math.abs(t - w.t) < WIPE_HALF + .05);
        return { t, cam: LAST_CAM && { ...LAST_CAM }, shot, wipe };
      }, i / fps);
    }
  }));
  const pts = [[60, 250], [960, 250], [60, 1300], [960, 1300], [540, 775]];
  const toWorld = (c, [x, y]) => { const dx = (x - 540) / c.zoom, dy = (y - 960) / c.zoom, cs = Math.cos(-c.rot), sn = Math.sin(-c.rot); return [c.cx + dx * cs - dy * sn, c.cy + dx * sn + dy * cs]; };
  const toScr = (c, [x, y]) => { const dx = (x - c.cx) * c.zoom, dy = (y - c.cy) * c.zoom, cs = Math.cos(c.rot), sn = Math.sin(c.rot); return [540 + dx * cs - dy * sn, 960 + dx * sn + dy * cs]; };
  const rows = [];
  for (let i = 1; i < n; i++) {
    const A = cams[i - 1], B = cams[i];
    if (!A.cam || !B.cam || A.shot !== B.shot || A.wipe || B.wipe) continue;
    const d = Math.max(...pts.map(s => { const [x, y] = toScr(B.cam, toWorld(A.cam, s)); return Math.hypot(x - s[0], y - s[1]); }));
    rows.push({ t: B.t, d });
  }
  const over = rows.filter(r => r.d > 20), max = rows.reduce((m, r) => r.d > m.d ? r : m, { t: 0, d: 0 });
  // a stretch of 3+ frames over the limit is a camera move that is too fast; 1–2 frames is a hit shake (allowed)
  const spans = []; for (const r of over) { const s = spans[spans.length - 1]; if (s && r.t - s.b < 1.5 / fps) { s.b = r.t; s.n++; s.max = Math.max(s.max, r.d); } else spans.push({ a: r.t, b: r.t, n: 1, max: r.d }); }
  const fmt = s => ({ from: +s.a.toFixed(2), to: +s.b.toFixed(2), frames: s.n, max: +s.max.toFixed(1) });
  const report = { frames: n, measured: rows.length, maxPxPerFrame: +max.d.toFixed(1), at: +max.t.toFixed(2), limit: 20,
    over: spans.filter(s => s.n >= 3).map(fmt), shakes: spans.filter(s => s.n < 3).map(fmt) };
  const out = args.out || join(film, 'out/check/camscan.json'); mkdirSync(dirname(out), { recursive: true }); writeFileSync(out, JSON.stringify(report, null, 1));
  console.log(`camera: max ${report.maxPxPerFrame} px/frame at ${report.at} s (limit 20) · ${rows.length} frames measured · ${report.over.length} move(s) too fast · ${report.shakes.length} hit shake(s)`);
  for (const s of report.over) console.log(`  too fast ${s.from.toFixed(2)}–${s.to.toFixed(2)} s (${s.frames} frames)  max ${s.max} px/frame`);
  for (const s of report.shakes) console.log(`  shake    ${s.from.toFixed(2)} s (${s.frames} frame${s.frames > 1 ? 's' : ''})  ${s.max} px/frame`);
  console.log(out);
} else {
  console.log('nothing to do: see the usage notes at the top of look.mjs');
}
for (const b of opened) await b.close();
closeServer();
