// reelcheck.mjs: the delivery checks for a finished vertical reel, in any style. Run from the library root.
//   node core/render/reelcheck.mjs <film> [--mp4 file] [--length s] [--keyword WORD] [--fps 30] [--size 1080x1920] [--n 6] [--no-files] [--no-asr]
// <film> is the project folder (films/<name>/); the MP4 defaults to <film>/<name>.mp4. Checks, each ✓ / ✗ / – (not run):
//   1080×1920 at the fps · BT.709 limited range · an audio stream · length = --length ± 1 frame (else 15–90 s) ·
//   −14 ± 1 LUFS and peak ≤ −1 dBTP · no frozen stretch · no black frames · the CTA keyword heard by Whisper in the final
//   mix around the last voice line (vo/vo.json; else the last 4 s) (--keyword) · the deliverables next to it: <name>-cover.png, CAPTION.md, REVIEW.md, QA-REPORT.md
//   (--no-files skips them, for a check before review).
// Then the checks for what reviewers kept catching by eye:
//   · the spoken hook (line 1 of vo/vo.json) ends by 3.5 s
//   · something new on screen at least every 0.6 s in the hook (0–3 s) and every 1.5 s after it: the MP4's frames
//     above the caption band, 90×107 cells, a change = ≥ 1 % of cells moving > 16 levels over 0.1 s
//   · from the page (<film>/index.html): every window.TEXTS(t) box and every window.BOXES(t) box (the subject, props,
//     anything that matters) inside x 60–960, y 250–1320, and an entry marked caption: true inside x 60–960,
//     y 1320–1470, for no more than 0.3 s at a time; and never 0.3 s with only a bare number (a "3" badge) on screen
// --length defaults to vo/vo.json's "duration" when that file exists, --keyword to the word after "Comment" in its last
// line. Writes <film>/out/check/reelcheck.json and n frames pulled from the MP4 (open them and look). Exit 1 if any
// check is ✗. What these cannot see is printed last, as the checks that still need eyes.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from '../../kit/env.mjs';

const out = (tool, args) => run(tool, args, { capture: true });
export const hasWhisper = () => out('python', ['-c', 'import faster_whisper']).status === 0;

/** The picture and sound checks on one MP4: [[name, ok, detail], …] and the measured duration. */
export function mp4Checks(mp4, { fps = 30, length = null, w = 1080, h = 1920 } = {}) {
  const probe = JSON.parse(out('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]).stdout || '{}');
  const v = (probe.streams || []).find(s => s.codec_type === 'video'), a = (probe.streams || []).find(s => s.codec_type === 'audio');
  const [num, den] = v ? v.r_frame_rate.split('/').map(Number) : [0, 1];
  const dur = +(probe.format || {}).duration, fr = num / (den || 1);
  const ff = (args) => out('ffmpeg', ['-hide_banner', '-nostats', '-i', mp4, ...args, '-f', 'null', '-']).stderr || '';
  const eb = ff(['-af', 'ebur128=peak=true', '-vn']), I = +((eb.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop() || '').replace(/[^\d.-]/g, ''), TP = +((eb.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop() || '').replace(/[^\d.-]/g, '');
  const fz = ff(['-vf', 'freezedetect=n=0.003:d=0.7', '-an']), freezes = [...fz.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const bk = ff(['-vf', 'blackdetect=d=0.1:pix_th=0.1', '-an']), blacks = [...bk.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const checks = [
    [`${w}×${h} at ${fps} fps`, v && v.width === w && v.height === h && Math.abs(fr - fps) < .01, v ? `${v.codec_name} ${v.width}×${v.height} @ ${fr.toFixed(2)} fps, ${v.color_space || '?'} ${v.color_range || ''}` : 'no video stream'],
    ['BT.709 limited range', v && v.color_space === 'bt709' && v.color_range === 'tv', v ? `${v.color_space} / ${v.color_range}` : ''],
    ['has an audio stream', !!a, a ? `${a.codec_name} ${a.sample_rate} Hz` : 'none'],
    length != null
      ? ['length = voiceover ± 1 frame', Math.abs(dur - length) <= 1 / fps + 1e-3, `${dur.toFixed(3)} s vs ${length.toFixed(3)} s`]
      : ['length 15–90 s', dur >= 15 && dur <= 90, `${dur.toFixed(3)} s`],
    ['loudness −14 ± 1 LUFS, peak ≤ −1 dBTP', Math.abs(I + 14) <= 1 && TP <= -1, `${I} LUFS, ${TP} dBTP`],
    ['no frozen stretch (freezedetect n=0.003 d=0.7)', !freezes.length, freezes.length ? freezes.map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s`).join(', ') : 'none'],
    ['no black frames', !blacks.length, blacks.length ? blacks.map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s`).join(', ') : 'none'],
  ];
  return { checks, dur };
}

/** Whisper on the final mix between from and to (s): is the keyword heard? Writes the clip to wav. */
export function keywordCheck(mp4, keyword, from, to, wav) {
  out('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, from)), '-to', String(to), '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', wav]);
  const r = out('python', ['-c', 'import sys, soundfile as sf; from faster_whisper import WhisperModel as M; a, _ = sf.read(sys.argv[1], dtype="float32"); s, _ = M("base.en").transcribe(a, language="en"); print(" ".join(x.text for x in s))', wav]);
  const heard = (r.stdout || '').trim(), norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return [`keyword "${keyword.toUpperCase()}" heard in the CTA`, norm(heard).includes(norm(keyword)), `Whisper: "${heard}"`];
}

/** Frames from the MP4 at the given times, 540 px wide, into dir. Returns the files written. */
export function pullFrames(mp4, times, dir) {
  const files = [];
  times.forEach((t, i) => {
    const f = join(dir, `final_${String(i + 1).padStart(2, '0')}_${t.toFixed(2).replace('.', '_')}s.jpg`);
    if (out('ffmpeg', ['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1', '-vf', 'scale=540:-1', '-q:v', '3', f]).status === 0) files.push(f);
  });
  return files;
}

export const SAFE = { x0: 60, x1: 960, y0: 250, y1: 1320, capY1: 1470 };
export const HOOK_LINE_MAX = 3.5;
const span = r => `${r.t0.toFixed(2)}–${r.t1.toFixed(2)} s`;

/** Gaps between frames that changed: [{t0, t1, d}] over the limit (hookMax for a gap that starts in the hook). */
export function quietStretches(changed, fps, { hook = 3, hookMax = .6, max = 1.5 } = {}) {
  const out = []; let last = 0;
  for (let f = 1; f <= changed.length; f++) if (f === changed.length || changed[f]) {
    const t0 = last / fps, t1 = f / fps, d = t1 - t0;
    if (d > (t0 < hook ? hookMax : max) + 1e-6) out.push({ t0, t1, d, hook: t0 < hook });
    last = f;
  }
  return out;
}

/** Per frame of the MP4: did the picture above the caption band change over the last 0.1 s? */
export function changedFrames(mp4, fps = 30) {
  const W = 90, H = 107, K = Math.max(1, Math.round(fps / 10)), N = W * H;
  const r = run('ffmpeg', ['-v', 'error', '-i', mp4, '-vf', `crop=${SAFE.x1 - SAFE.x0}:${SAFE.y1 - SAFE.y0}:${SAFE.x0}:${SAFE.y0},scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { capture: true, encoding: 'buffer' });
  const buf = r.stdout, n = Math.floor(buf.length / N), changed = [];
  for (let f = 0; f < n; f++) {
    if (f < K) { changed.push(true); continue; }
    let c = 0; for (let i = 0, a = f * N, b = (f - K) * N; i < N; i++) if (Math.abs(buf[a + i] - buf[b + i]) > 16) c++;
    changed.push(c >= N * .01);
  }
  return changed;
}

const bareNumber = s => /^\s*[#№]?\d{1,2}[.:)]?\s*$/.test(s);
/** From page samples [{t, texts, boxes}]: boxes outside their zone and bare-number stretches, each ≥ hold s. */
export function pageFindings(samples, step, { hold = .3, W = 1080, H = 1920 } = {}) {
  const runs = new Map(), outside = [], lone = []; let alone = null;
  const close = (k, r) => { if (r.t1 - r.t0 >= hold - 1e-6) outside.push(r); runs.delete(k); };
  for (const { t, texts = [], boxes = [] } of samples) {
    const seen = new Set();
    for (const b of [...texts.map(x => ({ ...x, kind: 'text' })), ...boxes.map(x => ({ ...x, kind: 'box' }))]) {
      if (b.x1 <= 0 || b.y1 <= 0 || b.x0 >= W || b.y0 >= H) continue;   // off frame: not visible
      const y0 = b.caption ? SAFE.y1 : SAFE.y0, y1 = b.caption ? SAFE.capY1 : SAFE.y1;
      if (b.x0 >= SAFE.x0 && b.x1 <= SAFE.x1 && b.y0 >= y0 && b.y1 <= y1) continue;
      const k = `${b.kind}:${b.id}`; seen.add(k);
      const r = runs.get(k) || { id: String(b.id), kind: b.kind, text: b.text, t0: t, box: [b.x0, b.y0, b.x1, b.y1].map(Math.round) };
      r.t1 = t + step; runs.set(k, r);
    }
    for (const [k, r] of runs) if (!seen.has(k)) close(k, r);
    const words = texts.filter(x => !x.caption);
    if (words.length && words.every(x => bareNumber(x.text))) { alone ??= { t0: t, texts: words.map(x => x.text) }; alone.t1 = t + step; }
    else if (alone) { if (alone.t1 - alone.t0 >= hold - 1e-6) lone.push(alone); alone = null; }
  }
  for (const [k, r] of runs) close(k, r);
  if (alone && alone.t1 - alone.t0 >= hold - 1e-6) lone.push(alone);
  return { outside, lone };
}

/** Render the page every step s and collect window.TEXTS(t) and window.BOXES(t). */
export async function pageSamples(film, step = .1) {
  const { openDemo, closeServer } = await import('./page.mjs');
  const { browser, page } = await openDemo(film, { w: 1080, h: 1920 });
  const res = await page.evaluate(step => {
    const hasTexts = typeof window.TEXTS === 'function', hasBoxes = typeof window.BOXES === 'function', samples = [];
    if (hasTexts || hasBoxes) for (let i = 0; i * step < window.DUR; i++) {
      const t = i * step; window.render(t);
      samples.push({ t, texts: hasTexts ? window.TEXTS(t) || [] : [], boxes: hasBoxes ? window.BOXES(t) || [] : [] });
    }
    return { hasTexts, hasBoxes, samples };
  }, step);
  await browser.close(); closeServer();
  return res;
}

/** The checks for what reviewers caught by eye, as [name, ok, detail] rows. */
export async function eyeChecks({ mp4, film, vo, fps = 30 }) {
  const checks = [];
  if (vo && vo.lines && vo.lines.length) {
    const h = vo.lines[0];
    checks.push([`spoken hook ends by ${HOOK_LINE_MAX} s`, h.e <= HOOK_LINE_MAX, `line ${h.id} ${h.s.toFixed(2)}–${h.e.toFixed(2)} s`]);
  } else checks.push([`spoken hook ends by ${HOOK_LINE_MAX} s`, null, 'no vo/vo.json']);
  const quiet = quietStretches(changedFrames(mp4, fps), fps);
  checks.push(['something new every ≤ 0.6 s in the hook, ≤ 1.5 s after', !quiet.length,
    quiet.length ? 'nothing new ' + quiet.map(q => `${span(q)} (${q.d.toFixed(2)} s${q.hook ? ', hook' : ''})`).join(', ') : 'yes']);
  if (!film || !existsSync(join(film, 'index.html'))) {
    checks.push(['text and key objects inside the safe zone', null, 'no index.html']);
    return checks;
  }
  const step = .1, P = await pageSamples(film, step);
  const what = P.hasTexts && P.hasBoxes ? 'TEXTS + BOXES' : P.hasTexts ? 'TEXTS only (add window.BOXES for the subject and props)' : P.hasBoxes ? 'BOXES only' : '';
  if (!what) {
    checks.push(['text and key objects inside the safe zone', null, 'the page has no window.TEXTS or window.BOXES']);
    checks.push(['no bare number on screen without its words', null, 'the page has no window.TEXTS']);
    return checks;
  }
  const { outside, lone } = pageFindings(P.samples, step);
  checks.push([`text and key objects inside the safe zone (x ${SAFE.x0}–${SAFE.x1}, y ${SAFE.y0}–${SAFE.y1}; captions to ${SAFE.capY1})`, !outside.length,
    (outside.length ? outside.map(r => `${r.kind} ${r.id}${r.text ? ` "${r.text}"` : ''} [${r.box.join(', ')}] ${span(r)}`).join(' · ') : 'yes') + ` · ${what}`]);
  checks.push(P.hasTexts
    ? ['no bare number on screen without its words', !lone.length, lone.length ? lone.map(r => `${r.texts.join(' ')} alone ${span(r)}`).join(', ') : 'yes']
    : ['no bare number on screen without its words', null, 'the page has no window.TEXTS']);
  return checks;
}

export const NEEDS_EYES = [
  'every prop and screen is finished: no empty placeholder box, no blank page waiting for its content',
  'the hook is scored on its own (≥ 8/10), and the picture follows each spoken word',
  'captions match the voice word for word; every number, name and claim has a source',
  'the mix: every visible action has its sound, and nothing masks a spoken word',
];

export const printChecks = checks => { for (const [name, good, detail] of checks) console.log(`${good === null ? '–' : good ? '✓' : '✗'} ${name}: ${detail}`); };

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv.splice(i, 2)[1] : null; };
  const has = k => { const i = argv.indexOf(`--${k}`); return i >= 0 && !!argv.splice(i, 1); };
  const mp4Opt = opt('mp4'), lenOpt = opt('length'), fps = +(opt('fps') || 30), n = +(opt('n') || 6);
  const [w, h] = (opt('size') || '1080x1920').split('x').map(Number);
  let keyword = opt('keyword');
  const noFiles = has('no-files'), noAsr = has('no-asr');
  const film = argv[0] && resolve(argv[0]);
  if (!film || !existsSync(film)) { console.error('usage: node core/render/reelcheck.mjs <film> [--mp4 file] [--length s] [--keyword WORD] [--fps 30] [--n 6] [--no-files] [--no-asr]'); process.exit(2); }
  const name = basename(film), mp4 = mp4Opt ? resolve(mp4Opt) : join(film, `${name}.mp4`), check = join(film, 'out/check');
  if (!existsSync(mp4)) { console.error(`✗ ${mp4} does not exist: render and mux the reel first`); process.exit(1); }
  mkdirSync(check, { recursive: true });
  const voJson = join(film, 'vo/vo.json');
  const vo = existsSync(voJson) ? JSON.parse(readFileSync(voJson, 'utf8')) : null, last = vo && vo.lines && vo.lines[vo.lines.length - 1];
  const length = lenOpt != null ? +lenOpt : vo ? vo.duration : null;
  keyword ??= last && ((last.text.match(/\bcomment\s+([\w-]+)/i) || [])[1] || null);
  const { checks, dur } = mp4Checks(mp4, { fps, length, w, h });
  if (!keyword) checks.push(['keyword heard in the CTA', null, 'no --keyword given and no "Comment <KEYWORD>" in the last voice line']);
  else if (noAsr || !hasWhisper()) checks.push([`keyword "${keyword.toUpperCase()}" heard in the CTA`, null, 'skipped (no Whisper or --no-asr)']);
  else checks.push(keywordCheck(mp4, keyword, last ? last.s - .6 : dur - 4, last ? last.e + .6 : dur, join(check, 'cta.wav')));
  if (!noFiles) for (const f of [`${name}-cover.png`, 'CAPTION.md', 'REVIEW.md', 'QA-REPORT.md'])
    checks.push([`${f} delivered`, existsSync(join(film, f)), existsSync(join(film, f)) ? 'yes' : `missing in ${film}`]);
  checks.push(...await eyeChecks({ mp4, film, vo, fps }));
  printChecks(checks);
  console.log(`still needs eyes (no check can see these):\n  · ${NEEDS_EYES.join('\n  · ')}`);
  const frames = pullFrames(mp4, Array.from({ length: n }, (_, i) => Math.min(dur - .1, (i + .5) / n * dur)), check);
  writeFileSync(join(check, 'reelcheck.json'), JSON.stringify({ mp4, checks: checks.map(([name, ok, detail]) => ({ name, ok, detail })), needsEyes: NEEDS_EYES, frames }, null, 1));
  console.log(`frames from the MP4 (open them and look):\n  ${frames.join('\n  ')}\n${join(check, 'reelcheck.json')}`);
  if (checks.some(c => c[1] === false)) process.exit(1);
}
