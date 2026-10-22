// make.mjs: the production steps of a kai-hand-draw reel, one command each. Run from the library root.
//   node styles/kai-hand-draw/tools/make.mjs new <name>       films/<name>/ from the starter (nothing else is touched)
//   node styles/kai-hand-draw/tools/make.mjs <film>            everything: vo → audio → render → verify
//   node styles/kai-hand-draw/tools/make.mjs <film> vo         vo/script.json → voice, timings, voice rules, Whisper check
//   node styles/kai-hand-draw/tools/make.mjs <film> audio      audio/cues.json → assets/reel-audio.wav (music + SFX + voice)
//   node styles/kai-hand-draw/tools/make.mjs <film> render     frames (core/render/video.mjs) + mux (core/render/mux.mjs,
//                                                              BT.709, −14 LUFS) → <film>/<name>.mp4 and <name>-cover.png
//   node styles/kai-hand-draw/tools/make.mjs <film> verify     checks the MP4 and writes out/check/verify.json
// Options: --workers=4 (render) · --no-asr (skip the Whisper checks) · --no-camscan (skip the camera speed scan)
// A film is any folder with index.html, src/config.js, vo/script.json and audio/cues.json: films/<name>/ in this repo
// (git ignores it), or styles/kai-hand-draw/demo.
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { env, run, requireReady } from '../../../kit/env.mjs';
import { mux } from '../../../core/render/mux.mjs';

const STYLE = resolve(dirname(fileURLToPath(import.meta.url)), '..'), LIB = resolve(STYLE, '../..'), TOOLS = join(STYLE, 'tools');
const argv = process.argv.slice(2), pos = argv.filter(a => !a.startsWith('--')), flags = argv.filter(a => a.startsWith('--'));
const flag = (k, d) => { const f = flags.find(a => a === `--${k}` || a.startsWith(`--${k}=`)); return f ? (f.includes('=') ? f.split('=')[1] : true) : d; };
const die = m => { console.error('✗ ' + m); process.exit(1); };
// tool is 'node', 'python', 'ffmpeg' or 'ffprobe' (kit/env.mjs finds it in this folder's pixi environment)
const sh = (tool, args, o = {}) => {
  const r = run(tool, args, o);
  if (r.error || r.status !== 0) { if (o.soft) return false; die(`failed: ${[tool, ...args].join(' ')}${r.error ? '\n  ' + r.error.message : ''}`); }
  return true;
};
const out = (tool, args) => run(tool, args, { capture: true });

// ---------- new ----------
if (pos[0] === 'new') {
  const name = pos[1];
  if (!name || !/^[a-z0-9][a-z0-9-]*$/.test(name)) die('usage: make.mjs new <name>   (lowercase letters, digits and dashes)');
  const dest = join(LIB, 'films', name);
  if (existsSync(dest)) die(`${dest} already exists`);
  cpSync(join(STYLE, 'starter'), dest, { recursive: true });
  const cfg = join(dest, 'src/config.js');
  writeFileSync(cfg, readFileSync(cfg, 'utf8').replace(/name: '[^']*'/, `name: '${name}'`));
  console.log(`✓ films/${name}/ ready. Next: write vo/script.json, then  node styles/kai-hand-draw/tools/make.mjs films/${name} vo`);
  process.exit(0);
}

// ---------- a film ----------
requireReady(env());
const film = pos[0] && resolve(pos[0]);
if (!film || !existsSync(join(film, 'index.html'))) die('usage: make.mjs <film folder> [vo|audio|render|verify]   or   make.mjs new <name>');
const cfgSrc = readFileSync(join(film, 'src/config.js'), 'utf8');
const NAME = (cfgSrc.match(/\bname:\s*['"]([^'"]+)['"]/) || [])[1] || basename(film);
const FPS = +((cfgSrc.match(/\bfps:\s*(\d+)/) || [])[1] || 30), COVER = +((cfgSrc.match(/\bcover:\s*([\d.]+)/) || [])[1] || 1);
const MP4 = join(film, `${NAME}.mp4`), COVER_PNG = join(film, `${NAME}-cover.png`), CHECK = join(film, 'out/check');
const hasWhisper = () => out('python', ['-c', 'import faster_whisper']).status === 0;

const STEP = {
  vo() {
    sh('python', [join(TOOLS, 'make_vo.py'), film]);
    sh('python', [join(TOOLS, 'check_vo.py'), film]);
    if (flag('no-asr')) return console.log('(Whisper check skipped: --no-asr)');
    if (!hasWhisper()) return console.log('⚠ Whisper check skipped: faster-whisper is not installed (pixi run studio install)');
    // every line must transcribe back to its words; a name Whisper spells its own way goes in the line's "asr" field
    if (!sh('python', ['core/tts/asr_check.py', join(film, 'vo/lines/lines.json'), join(film, 'vo/lines'), '--lang', 'en'], { soft: true }))
      die('a line did not transcribe back to its words (above). Listen to it: fix the text or "say", or put what Whisper hears in that line\'s "asr" field');
  },
  audio() { sh('python', [join(TOOLS, 'make_audio.py'), film]); },
  render() {
    const audio = join(film, 'assets/reel-audio.wav');
    if (!existsSync(audio)) die(`${audio} is missing: run the audio step first`);
    mkdirSync(join(film, 'out'), { recursive: true });
    sh('node', ['core/render/video.mjs', film, '--size', '1080x1920', '--fps', String(FPS), '--workers', String(flag('workers', env().workers)), '--out', join(film, 'out/video.mp4')]);
    // grain 0: the page paints its own paper grain. BT.709 limited range, as the published reels.
    try { mux({ video: join(film, 'out/video.mp4'), audio, out: MP4, fps: FPS, grain: 0, color: 'bt709' }); } catch (e) { die(e.message); }
    sh('node', [join(TOOLS, 'look.mjs'), film, `--stills=${COVER}`, '--no-captions', `--out=${join(film, 'out/cover')}`]);
    const png = readdirSync(join(film, 'out/cover')).filter(f => f.endsWith('.png')).sort().pop();
    cpSync(join(film, 'out/cover', png), COVER_PNG);
    console.log(`✓ ${MP4}\n✓ ${COVER_PNG} (frame ${COVER} s, no captions)`);
  },
  verify() {
    if (!existsSync(MP4)) die(`${MP4} does not exist: run the render step first`);
    mkdirSync(CHECK, { recursive: true });
    const vo = JSON.parse(readFileSync(join(film, 'vo/vo.json'), 'utf8'));
    const probe = JSON.parse(out('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', MP4]).stdout || '{}');
    const v = (probe.streams || []).find(s => s.codec_type === 'video'), a = (probe.streams || []).find(s => s.codec_type === 'audio');
    const dur = +(probe.format || {}).duration, fr = v ? eval(v.r_frame_rate) : 0;
    const ff = (args) => out('ffmpeg', ['-hide_banner', '-nostats', '-i', MP4, ...args, '-f', 'null', '-']).stderr || '';
    const eb = ff(['-af', 'ebur128=peak=true', '-vn']), I = +((eb.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop() || '').replace(/[^\d.-]/g, ''), TP = +((eb.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop() || '').replace(/[^\d.-]/g, '');
    const fz = ff(['-vf', 'freezedetect=n=0.003:d=0.7', '-an']), freezes = [...fz.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map(m => [+m[1], +m[2]]);
    const bk = ff(['-vf', 'blackdetect=d=0.1:pix_th=0.1', '-an']), blacks = [...bk.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => [+m[1], +m[2]]);
    const checks = [
      ['1080×1920 at ' + FPS + ' fps', v && v.width === 1080 && v.height === 1920 && Math.abs(fr - FPS) < .01, v ? `${v.codec_name} ${v.width}×${v.height} @ ${fr.toFixed(2)} fps, ${v.color_space || '?'} ${v.color_range || ''}` : 'no video stream'],
      ['BT.709 limited range', v && v.color_space === 'bt709' && v.color_range === 'tv', v ? `${v.color_space} / ${v.color_range}` : ''],
      ['has an audio stream', !!a, a ? `${a.codec_name} ${a.sample_rate} Hz` : 'none'],
      ['length = voiceover ± 1 frame', Math.abs(dur - vo.duration) <= 1 / FPS + 1e-3, `${dur.toFixed(3)} s vs ${vo.duration.toFixed(3)} s`],
      ['loudness −14 ± 1 LUFS, peak ≤ −1 dBTP', Math.abs(I + 14) <= 1 && TP <= -1, `${I} LUFS, ${TP} dBTP`],
      ['no frozen stretch (freezedetect n=0.003 d=0.7)', !freezes.length, freezes.length ? freezes.map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s`).join(', ') : 'none'],
      ['no black frames', !blacks.length, blacks.length ? blacks.map(([s, e]) => `${s.toFixed(2)}–${e.toFixed(2)} s`).join(', ') : 'none'],
    ];
    if (!flag('no-camscan')) {
      sh('node', [join(TOOLS, 'look.mjs'), film, '--camscan', `--workers=${flag('workers', env().workers)}`, `--out=${join(CHECK, 'camscan.json')}`]);
      const cs = JSON.parse(readFileSync(join(CHECK, 'camscan.json'), 'utf8'));
      checks.push(['camera moves ≤ 20 px per frame (hit shakes of 1–2 frames allowed)', !cs.over.length, `max ${cs.maxPxPerFrame} px/frame at ${cs.at} s, ${cs.shakes.length} shake(s)` + (cs.over.length ? ' · too fast: ' + cs.over.map(o => `${o.from}–${o.to} s (${o.max})`).join(', ') : '')]);
    }
    // the keyword must be heard: Whisper on the final mix, around the last line
    const last = vo.lines[vo.lines.length - 1], lw = vo.words.filter(w => w.line === last.id);
    const k = lw.findIndex(w => /^comment\b/i.test(w.w)), keyword = k >= 0 && lw[k + 1] ? lw[k + 1].w.replace(/[^\w-]/g, '') : null;
    if (keyword && !flag('no-asr') && hasWhisper()) {
      const wav = join(CHECK, 'cta.wav');
      out('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(Math.max(0, last.s - .6)), '-to', String(last.e + .6), '-i', MP4, '-vn', '-ac', '1', '-ar', '16000', wav]);
      const r = out('python', ['-c', 'import sys, soundfile as sf; from faster_whisper import WhisperModel as M; a, _ = sf.read(sys.argv[1], dtype="float32"); s, _ = M("base.en").transcribe(a, language="en"); print(" ".join(x.text for x in s))', wav]);
      const heard = (r.stdout || '').trim(), norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      checks.push([`keyword "${keyword.toUpperCase()}" heard in the CTA`, norm(heard).includes(norm(keyword)), `Whisper: "${heard}"`]);
    } else checks.push(['keyword heard in the CTA', null, keyword ? 'skipped (no Whisper or --no-asr)' : 'no "Comment <KEYWORD>" in the last line']);
    for (const [name, good, detail] of checks) console.log(`${good === null ? '–' : good ? '✓' : '✗'} ${name}: ${detail}`);
    // frames from the MP4, mid-line so a caption is on screen, spread across the reel
    const files = [], n = +flag('n', 6);
    for (let i = 0; i < n; i++) {
      const L = vo.lines[Math.min(vo.lines.length - 1, Math.floor((i + .5) / n * vo.lines.length))];
      const t = Math.min(dur - .1, (L.s + L.e) / 2), f = join(CHECK, `final_${String(i + 1).padStart(2, '0')}_${t.toFixed(2).replace('.', '_')}s.jpg`);
      if (out('ffmpeg', ['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', MP4, '-frames:v', '1', '-vf', 'scale=540:-1', '-q:v', '3', f]).status === 0) files.push(f);
    }
    writeFileSync(join(CHECK, 'verify.json'), JSON.stringify({ mp4: MP4, checks: checks.map(([name, ok, detail]) => ({ name, ok, detail })), frames: files }, null, 1));
    console.log(`frames from the MP4 (open them and look):\n  ${files.join('\n  ')}\n${join(CHECK, 'verify.json')}`);
    if (checks.some(c => c[1] === false)) process.exit(1);
  },
};
const steps = pos.slice(1);
for (const s of steps.length ? steps : ['vo', 'audio', 'render', 'verify']) {
  if (!STEP[s]) die(`unknown step "${s}": use vo, audio, render or verify`);
  console.log(`\n=== ${s} · ${film} ===`);
  STEP[s]();
}
