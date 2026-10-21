// make.mjs: the production steps, one command each, on any OS.
//   node make.mjs            everything: voiceover → music + SFX → render → verify
//   node make.mjs vo         vo/script.json → vo/vo.wav, src/vo.js, vo/vo.json, vo/word_times.txt   (needs internet)
//   node make.mjs audio      audio/cues.json + vo/vo.wav → assets/reel-audio.wav (music + SFX + voice, mixed)
//   node make.mjs render     every frame + audio → out/<name>.mp4 and out/<name>-cover.png   [--workers=4]
//   node make.mjs verify     checks the MP4 (size, audio, length) and pulls frames into out/check/ to look at   [--n=4]
// Runs setup first if it has not been run.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnv, ROOT, ENV_FILE } from './kitenv.mjs';

process.chdir(ROOT);
const argv = process.argv.slice(2), steps = argv.filter(a => !a.startsWith('--')), extra = argv.filter(a => a.startsWith('--'));
const sh = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT });
  if (r.error || r.status !== 0) { console.error(`\n✗ failed: ${[cmd, ...args].join(' ')}${r.error ? '\n  ' + r.error.message : ''}`); process.exit(1); }
};
let env = loadEnv();
if (!existsSync(ENV_FILE) || !env.python || !env.chrome || !env.ffmpeg) { sh(process.execPath, ['setup.mjs']); env = loadEnv(); }

const projectName = () => (readFileSync('src/config.js', 'utf8').match(/\bname:\s*['"]([^'"]+)['"]/) || [])[1] || 'reel';
const flag = (name, def) => { const f = extra.find(a => a.startsWith(`--${name}=`)); return f ? f.split('=')[1] : def; };

const STEP = {
  vo() { sh(env.python, [join('scripts', 'make_vo.py')]); },
  audio() { sh(env.python, [join('scripts', 'make_audio.py')]); },
  render() { sh(process.execPath, ['render.mjs', '--reel', ...extra.filter(a => /^--(workers|resume|soft-gl|gpu-angle|chrome|out)/.test(a))]); },
  verify() {
    const mp4 = flag('out', `out/${projectName()}.mp4`), n = +flag('n', 4);
    if (!existsSync(mp4)) { console.error(`✗ ${mp4} does not exist: run "node make.mjs render" first`); process.exit(1); }
    // `ffmpeg -i file` prints the container and stream summary to stderr (no ffprobe needed)
    const info = spawnSync(env.ffmpeg || 'ffmpeg', ['-hide_banner', '-i', mp4], { encoding: 'utf8' }).stderr || '';
    const vm = info.match(/Stream #\d+:\d+.*Video: (\w+).*?\b(\d{2,5})x(\d{2,5})\b.*?([\d.]+) fps/), am = info.match(/Stream #\d+:\d+.*Audio: (\w+)/), dm = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
    if (!dm) { console.error('✗ could not read ' + mp4 + '\n' + info); process.exit(1); }
    const v = vm && { codec: vm[1], width: +vm[2], height: +vm[3], fps: vm[4] }, a = am && { codec: am[1] }, dur = +dm[1] * 3600 + +dm[2] * 60 + +dm[3];
    const voData = existsSync('vo/vo.json') ? JSON.parse(readFileSync('vo/vo.json', 'utf8')) : null, want = voData ? voData.duration : null;
    const checks = [
      ['video is 1080x1920', v && v.width === 1080 && v.height === 1920, v ? `${v.codec} ${v.width}x${v.height} @ ${v.fps} fps` : 'no video stream'],
      ['has an audio stream', !!a, a ? a.codec : 'none'],
      ['length matches the voiceover', want == null || Math.abs(dur - want) < .15, `${dur.toFixed(2)} s` + (want != null ? ` (voiceover + tail: ${want.toFixed(2)} s)` : '')],
    ];
    for (const [name, good, detail] of checks) console.log(`${good ? '✓' : '✗'} ${name}: ${detail}`);
    mkdirSync('out/check', { recursive: true });
    const files = [];
    for (let i = 0; i < n; i++) {
      // the middle of a voiceover line (a caption is on screen and no wipe is), spread across the reel
      const L = voData && voData.lines.length ? voData.lines[Math.min(voData.lines.length - 1, Math.floor((i + .5) / n * voData.lines.length))] : null;
      const t = L ? Math.min(dur - .1, (L.s + L.e) / 2 + (i % 2 ? .35 : 0)) : (i + .5) / n * dur, f = `out/check/final_${String(i + 1).padStart(2, '0')}_${t.toFixed(2).replace('.', '_')}s.jpg`;
      const r = spawnSync(env.ffmpeg || 'ffmpeg', ['-y', '-loglevel', 'error', '-ss', t.toFixed(3), '-i', mp4, '-frames:v', '1', '-vf', 'scale=540:-1', '-q:v', '3', f]);
      if (r.status === 0) files.push(f);
    }
    console.log(`frames pulled from the MP4 (open them and look):\n  ${files.join('\n  ')}`);
    if (checks.some(c => !c[1]) || files.length < n) process.exit(1);
  },
};
for (const s of steps.length ? steps : ['vo', 'audio', 'render', 'verify']) {
  if (!STEP[s]) { console.error(`unknown step "${s}": use vo, audio, render or verify`); process.exit(1); }
  console.log(`\n=== ${s} ===`);
  STEP[s]();
}
