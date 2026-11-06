// make.mjs: one episode folder (episode.json + index.html) to a preview MP4. Run from the library root:
//   pixi run -e full node episode/make.mjs <episode> vo     Kokoro voice for every beat → vo/vo.wav + vo/vo.json
//   pixi run node episode/make.mjs <episode> render         frames + voice → <episode>/<name>.mp4 (540x960, 30 fps)
//   pixi run node episode/make.mjs <episode> check          size, length, sound, no black or frozen stretch, stills sheet
// No step = render check. Options: --fps N (default 30) · --workers N. Preview size only (540x960, ST-77). The vo step needs the full environment and the voice model (pixi run fetch voice, once, about 350 MB).
// <name> is the folder's name. Writes <episode>/out/check.json and <episode>/out/sheet.jpg (open it to look).
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { env, run, requireReady, ROOT } from '../kit/env.mjs';
import { mux } from '../core/render/mux.mjs';

const argv = process.argv.slice(2), steps = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { steps.push(argv[i]); continue; }
  const [k, v] = argv[i].slice(2).split('='); opt[k] = v ?? (['fps', 'workers'].includes(k) ? argv[++i] : true);
}
const die = m => { console.error('✗ ' + m); process.exit(1); };
const ep = steps.length && resolve(steps.shift());
if (!ep || !existsSync(join(ep, 'episode.json'))) { console.error('usage: node episode/make.mjs <episode folder with episode.json> [vo] [render] [check] [--fps N] [--full]'); process.exit(2); }
requireReady(env());
const NAME = basename(ep), MP4 = join(ep, `${NAME}.mp4`), OUT = join(ep, 'out');
const FPS = +(opt.fps ?? 30), [W, H] = [540, 960];
const sh = (tool, args) => { const r = run(tool, args); if (r.error || r.status !== 0) die(`failed: ${tool} ${args.join(' ')}`); };
const probe = f => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { capture: true }).stdout || '{}');

function episode() {
  const e = JSON.parse(readFileSync(join(ep, 'episode.json'), 'utf8')), window = {};
  new Function('window', readFileSync(join(ROOT, 'characters/cast.js'), 'utf8'))(window);
  const cast = Object.fromEntries(e.cast.map(m => [m.id, { ...(window.TMV_SEEDS[m.seed] || {}), ...m }]));
  e.beats.forEach((b, i) => {
    if (!cast[b.who]) die(`episode.json beat ${i + 1}: "who": "${b.who}" is not in the cast (${Object.keys(cast).join(', ')})`);
    if (!b.line?.trim()) die(`episode.json beat ${i + 1} has no "line"`);
  });
  if (!e.vote?.a || !e.vote?.b || !e.vote?.question) die('episode.json needs "vote": {"question", "a", "b"} (the vote is the last frame)');
  return { e, cast };
}

const STEP = {
  vo() {
    const { e, cast } = episode();
    const lines = e.beats.map((b, i) => ({ id: `b${String(i + 1).padStart(2, '0')}`, who: b.who, text: b.line, voice: cast[b.who].voice || 'af_heart', speed: cast[b.who].speed || 1 }));
    // build in vo.new/ and swap it in only when it worked: a failed voice never deletes the one that renders
    const nv = join(ep, 'vo.new'); rmSync(nv, { recursive: true, force: true }); mkdirSync(join(nv, 'vo', 'lines'), { recursive: true });
    writeFileSync(join(nv, 'vo', 'lines.json'), JSON.stringify(lines, null, 1));
    sh('python', ['core/tts/tts.py', join(nv, 'vo', 'lines.json'), join(nv, 'vo', 'lines')]);
    sh('python', ['episode/voice.py', nv]);
    rmSync(join(ep, 'vo'), { recursive: true, force: true }); renameSync(join(nv, 'vo'), join(ep, 'vo')); rmSync(nv, { recursive: true, force: true });
  },
  render() {
    const { e } = episode();
    if (existsSync(join(ep, 'vo/lines.json'))) {   // the voice must say exactly the beats, or captions and sound drift
      const said = JSON.parse(readFileSync(join(ep, 'vo/lines.json'), 'utf8'));
      if (said.length !== e.beats.length || said.some((l, i) => l.text !== e.beats[i].line || l.who !== e.beats[i].who))
        die(`episode.json changed since its voice was made: run pixi run -e full node episode/make.mjs ${NAME} vo`);
    }
    if (!existsSync(join(ep, 'vo/vo.wav'))) die(`${join(ep, 'vo/vo.wav')} is missing: run the vo step first (pixi run -e full node episode/make.mjs ${NAME} vo)`);
    mkdirSync(OUT, { recursive: true });
    sh('node', ['core/render/video.mjs', ep, '--size', `${W}x${H}`, '--fps', String(FPS), '--workers', String(opt.workers ?? env().workers), '--out', join(OUT, 'video.mp4')]);
    const m = mux({ video: join(OUT, 'video.mp4'), audio: join(ep, 'vo/vo.wav'), out: MP4, fps: FPS, grain: 0, color: 'bt709' });
    writeFileSync(join(OUT, 'loudness.json'), JSON.stringify({ I: m.I }));
    console.log(`✓ ${MP4}`);
  },
  check() {
    if (!existsSync(MP4)) die(`${MP4} is missing: run the render step first`);
    const vo = JSON.parse(readFileSync(join(ep, 'vo/vo.json'), 'utf8')), want = vo.duration + 1.4;
    const p = probe(MP4), v = (p.streams || []).find(s => s.codec_type === 'video'), a = (p.streams || []).find(s => s.codec_type === 'audio');
    const dur = +p.format?.duration, I = existsSync(join(OUT, 'loudness.json')) ? JSON.parse(readFileSync(join(OUT, 'loudness.json'), 'utf8')).I : NaN;
    const filt = (f, pat) => [...(run('ffmpeg', ['-hide_banner', '-nostats', '-i', MP4, '-vf', f, '-an', '-f', 'null', '-'], { capture: true }).stderr || '').matchAll(pat)];
    const black = filt('blackdetect=d=0.2:pix_th=0.05', /black_start:([\d.]+)/g).map(x => +x[1]);
    const frozen = filt('freezedetect=n=0.002:d=1.5', /freeze_start: ([\d.]+)/g).map(x => +x[1]);
    const checks = [
      { name: `${W}x${H} video`, ok: v?.width === W && v?.height === H, got: v ? `${v.width}x${v.height}` : 'no video' },
      { name: 'has sound', ok: !!a, got: a ? a.codec_name : 'no audio' },
      { name: `length = voice + 1.4 s (${want.toFixed(2)} s ± 0.2)`, ok: Math.abs(dur - want) <= 0.2, got: `${dur.toFixed(2)} s` },
      { name: 'loudness -14 ± 1.5 LUFS', ok: Math.abs(I + 14) <= 1.5, got: `${I} LUFS` },
      { name: 'no black stretch', ok: !black.length, got: black.length ? `black at ${black.join(', ')} s` : 'none' },
      { name: 'no frozen stretch (1.5 s)', ok: !frozen.length, got: frozen.length ? `frozen at ${frozen.join(', ')} s` : 'none' },
    ];
    // six stills spread over the episode, to look at
    const stills = [0.1, 0.25, 0.4, 0.55, 0.75, 0.97].map((k, i) => {
      const f = join(OUT, `still-${i}.jpg`); run('ffmpeg', ['-v', 'error', '-y', '-ss', (dur * k).toFixed(2), '-i', MP4, '-frames:v', '1', f]); return f;
    });
    run('python', ['core/render/sheet.py', join(OUT, 'sheet.jpg'), ...stills, '--cols', '6', '--w', '270'], { capture: true });
    for (const c of checks) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}: ${c.got}`);
    writeFileSync(join(OUT, 'check.json'), JSON.stringify({ mp4: MP4, checks }, null, 1));
    console.log(`  stills: ${join(OUT, 'sheet.jpg')}`);
    if (checks.some(c => !c.ok)) die('a check failed (above)');
  },
};
for (const s of steps.length ? steps : ['render', 'check']) {
  if (!STEP[s]) die(`unknown step "${s}": use vo, render or check`);
  console.log(`\n=== ${s} · ${ep} ===`);
  STEP[s]();
}
