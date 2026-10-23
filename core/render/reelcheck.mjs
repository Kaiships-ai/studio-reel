// reelcheck.mjs: the delivery checks for a finished vertical reel, in any style. Run from the library root.
//   node core/render/reelcheck.mjs <film> [--mp4 file] [--length s] [--keyword WORD] [--fps 30] [--n 6] [--no-files] [--no-asr]
// <film> is the project folder (films/<name>/); the MP4 defaults to <film>/<name>.mp4. Checks, each ✓ / ✗ / – (not run):
//   1080×1920 at the fps · BT.709 limited range · an audio stream · length = --length ± 1 frame (else 15–90 s) ·
//   −14 ± 1 LUFS and peak ≤ −1 dBTP · no frozen stretch · no black frames · the CTA keyword heard by Whisper in the final
//   mix around the last voice line (vo/vo.json; else the last 4 s) (--keyword) · the deliverables next to it: <name>-cover.png, CAPTION.md, REVIEW.md, QA-REPORT.md
//   (--no-files skips them, for a check before review).
// --length defaults to vo/vo.json's "duration" when that file exists (kai-hand-draw films). Writes <film>/out/check/
// reelcheck.json and n frames pulled from the MP4 (open them and look). Exit 1 if any check is ✗.
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import { run } from '../../kit/env.mjs';

const out = (tool, args) => run(tool, args, { capture: true });
export const hasWhisper = () => out('python', ['-c', 'import faster_whisper']).status === 0;

/** The picture and sound checks on one MP4: [[name, ok, detail], …] and the measured duration. */
export function mp4Checks(mp4, { fps = 30, length = null } = {}) {
  const probe = JSON.parse(out('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4]).stdout || '{}');
  const v = (probe.streams || []).find(s => s.codec_type === 'video'), a = (probe.streams || []).find(s => s.codec_type === 'audio');
  const [num, den] = v ? v.r_frame_rate.split('/').map(Number) : [0, 1];
  const dur = +(probe.format || {}).duration, fr = num / (den || 1);
  const ff = (args) => out('ffmpeg', ['-hide_banner', '-nostats', '-i', mp4, ...args, '-f', 'null', '-']).stderr || '';
  const eb = ff(['-af', 'ebur128=peak=true', '-vn']), I = +((eb.match(/I:\s+(-?[\d.]+) LUFS/g) || []).pop() || '').replace(/[^\d.-]/g, ''), TP = +((eb.match(/Peak:\s+(-?[\d.]+) dBFS/g) || []).pop() || '').replace(/[^\d.-]/g, '');
  const fz = ff(['-vf', 'freezedetect=n=0.003:d=0.7', '-an']), freezes = [...fz.matchAll(/freeze_start: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const bk = ff(['-vf', 'blackdetect=d=0.1:pix_th=0.1', '-an']), blacks = [...bk.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(m => [+m[1], +m[2]]);
  const checks = [
    ['1080×1920 at ' + fps + ' fps', v && v.width === 1080 && v.height === 1920 && Math.abs(fr - fps) < .01, v ? `${v.codec_name} ${v.width}×${v.height} @ ${fr.toFixed(2)} fps, ${v.color_space || '?'} ${v.color_range || ''}` : 'no video stream'],
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

export const printChecks = checks => { for (const [name, good, detail] of checks) console.log(`${good === null ? '–' : good ? '✓' : '✗'} ${name}: ${detail}`); };

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv.splice(i, 2)[1] : null; };
  const has = k => { const i = argv.indexOf(`--${k}`); return i >= 0 && !!argv.splice(i, 1); };
  const mp4Opt = opt('mp4'), lenOpt = opt('length'), keyword = opt('keyword'), fps = +(opt('fps') || 30), n = +(opt('n') || 6);
  const noFiles = has('no-files'), noAsr = has('no-asr');
  const film = argv[0] && resolve(argv[0]);
  if (!film || !existsSync(film)) { console.error('usage: node core/render/reelcheck.mjs <film> [--mp4 file] [--length s] [--keyword WORD] [--fps 30] [--n 6] [--no-files] [--no-asr]'); process.exit(2); }
  const name = basename(film), mp4 = mp4Opt ? resolve(mp4Opt) : join(film, `${name}.mp4`), check = join(film, 'out/check');
  if (!existsSync(mp4)) { console.error(`✗ ${mp4} does not exist: render and mux the reel first`); process.exit(1); }
  mkdirSync(check, { recursive: true });
  const voJson = join(film, 'vo/vo.json');
  const vo = existsSync(voJson) ? JSON.parse(readFileSync(voJson, 'utf8')) : null, last = vo && vo.lines && vo.lines[vo.lines.length - 1];
  const length = lenOpt != null ? +lenOpt : vo ? vo.duration : null;
  const { checks, dur } = mp4Checks(mp4, { fps, length });
  if (!keyword) checks.push(['keyword heard in the CTA', null, 'no --keyword given']);
  else if (noAsr || !hasWhisper()) checks.push([`keyword "${keyword.toUpperCase()}" heard in the CTA`, null, 'skipped (no Whisper or --no-asr)']);
  else checks.push(keywordCheck(mp4, keyword, last ? last.s - .6 : dur - 4, last ? last.e + .6 : dur, join(check, 'cta.wav')));
  if (!noFiles) for (const f of [`${name}-cover.png`, 'CAPTION.md', 'REVIEW.md', 'QA-REPORT.md'])
    checks.push([`${f} delivered`, existsSync(join(film, f)), existsSync(join(film, f)) ? 'yes' : `missing in ${film}`]);
  printChecks(checks);
  const frames = pullFrames(mp4, Array.from({ length: n }, (_, i) => Math.min(dur - .1, (i + .5) / n * dur)), check);
  writeFileSync(join(check, 'reelcheck.json'), JSON.stringify({ mp4, checks: checks.map(([name, ok, detail]) => ({ name, ok, detail })), frames }, null, 1));
  console.log(`frames from the MP4 (open them and look):\n  ${frames.join('\n  ')}\n${join(check, 'reelcheck.json')}`);
  if (checks.some(c => c[1] === false)) process.exit(1);
}
