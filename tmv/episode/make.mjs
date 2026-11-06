// make.mjs: one episode folder (episode.json + index.html) to a preview MP4. Run from the library root:
//   pixi run -e full node episode/make.mjs <episode> vo     Kokoro voice for every beat → vo/vo.wav + vo/vo.json
//   pixi run node episode/make.mjs <episode> render         frames + voice + bed (room tone, music, hits) → <episode>/<name>.mp4 (720x1280, 30 fps)
//   pixi run node episode/make.mjs <episode> check          size, length, sound, no black or frozen stretch, faces not blown out, stills sheet
// No step = render check. Options: --fps N (default 30) · --workers N. Preview size only (720x1280, ST-77). The vo step needs the full environment and the voice model (pixi run fetch voice, once, about 350 MB).
// <name> is the folder's name. Writes <episode>/out/check.json and <episode>/out/sheet.jpg (open it to look).
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, realpathSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { env, run, requireReady, ROOT } from '../kit/env.mjs';
import { mux } from '../core/render/mux.mjs';

const argv = process.argv.slice(2), steps = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { steps.push(argv[i]); continue; }
  const [k, v] = argv[i].slice(2).split('='); opt[k] = v ?? (['fps', 'workers'].includes(k) ? argv[++i] : true);
}
const die = m => { console.error('✗ ' + m); process.exit(1); };
const ep = steps.length && (p => existsSync(p) ? realpathSync(p) : p)(resolve(steps.shift()));   // real path: /tmp is /private/tmp on macOS, and the server needs the episode under the library root
if (!ep || !existsSync(join(ep, 'episode.json'))) { console.error('usage: node episode/make.mjs <episode folder with episode.json> [vo] [render] [check] [--fps N] [--full]'); process.exit(2); }
requireReady(env());
const NAME = basename(ep), MP4 = join(ep, `${NAME}.mp4`), OUT = join(ep, 'out');
const FPS = +(opt.fps ?? 30), [W, H] = [720, 1280];
const sh = (tool, args) => { const r = run(tool, args); if (r.error || r.status !== 0) die(`failed: ${tool} ${args.join(' ')}`); };
const probe = f => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { capture: true }).stdout || '{}');

// every field the engine reads is checked here, so a typo in episode.json stops with its own line instead of a broken frame
const SHOTS = ['room', 'close', 'two', 'wide', 'phone', 'card', 'stats', 'previously'];
const EXPS = ['angry', 'determined', 'doubt', 'excited', 'grin', 'guilty', 'laugh', 'nervous', 'proud', 'relieved', 'sad', 'shock', 'smirk', 'surprise', 'teary', 'thinking', 'tired', 'worried'];
const HEX = /^#[0-9a-fA-F]{6}$/;
function episode() {
  let e; try { e = JSON.parse(readFileSync(join(ep, 'episode.json'), 'utf8')); } catch (x) { die(`episode.json is not valid JSON: ${x.message}`); }
  // in a series (episode/series.mjs) the show's name, cast, palette and texts come from ../series.json unless the episode sets them
  const sf = join(ep, '..', 'series.json');
  if (existsSync(sf)) { let s; try { s = JSON.parse(readFileSync(sf, 'utf8')); } catch (x) { die(`${sf} is not valid JSON: ${x.message}`); }
    e = { ...e, series: e.series ?? s.series, cast: e.cast ?? s.cast, palette: { ...(s.palette ?? {}), ...(e.palette ?? {}) }, texts: { ...(s.texts ?? {}), ...(e.texts ?? {}) } }; }
  const window = {}; new Function('window', readFileSync(join(ROOT, 'characters/cast.js'), 'utf8'))(window);
  const P = window.TMV_PARTS, errs = [], err = m => errs.push(m), str = v => typeof v === 'string' && v.trim() !== '';
  if (!str(e.series)) err('"series" must be a text (the show name, in the kicker)');
  if (!Number.isInteger(e.ep) || e.ep < 1) err('"ep" must be a whole number from 1');
  if (!str(e.title)) err('"title" must be a text (the episode title over the first shot)');
  for (const [k, v] of Object.entries(e.palette ?? {})) { if (!['neon', 'left', 'right', 'card'].includes(k)) err(`palette "${k}" is unknown (neon, left, right, card)`); else if (!HEX.test(v)) err(`palette "${k}": "${v}" is not a colour like "#FF3D8B"`); }
  const TXK = ['handle', 'sign', 'kicker', 'phoneLabel', 'phoneHud', 'phoneFoot', 'or', 'voteFooter', 'previously', 'youPicked'];
  for (const [k, v] of Object.entries(e.texts ?? {})) { if (!TXK.includes(k)) err(`texts "${k}" is unknown (${TXK.join(', ')})`); else if (typeof v !== 'string') err(`texts "${k}" must be a text`); }
  if (!Array.isArray(e.cast) || !e.cast.length) err('"cast" must list at least one character');
  const cast = {};
  for (const [i, m] of (Array.isArray(e.cast) ? e.cast : []).entries()) {
    const at = `cast ${i + 1}`;
    if (!m || typeof m !== 'object') { err(`${at} must be an object like {"id": "nova", "seed": "nova"}`); continue; }
    if (!str(m.id)) { err(`${at} has no "id"`); continue; }
    if (cast[m.id]) err(`${at}: "id": "${m.id}" is used twice`);
    if (m.seed !== undefined && !window.TMV_SEEDS[m.seed]) err(`${at}: "seed": "${m.seed}" is not a seed (${Object.keys(window.TMV_SEEDS).join(', ')})`);
    const c = { ...(window.TMV_SEEDS[m.seed] || {}), ...m }; cast[m.id] = c;
    for (const k of ['kind', 'build', 'hair', 'top', 'eyes', 'extra', 'voice']) if (c[k] !== undefined && !P[k].includes(c[k])) err(`${at} (${m.id}): "${k}": "${c[k]}" is not one of ${P[k].join(', ')}`);
    if (!c.kind) err(`${at} (${m.id}) needs a "seed" or "kind" (human or bot)`);
    for (const k of ['skin', 'hairColor', 'topColor', 'legs']) if (c[k] !== undefined && !HEX.test(c[k])) err(`${at} (${m.id}): "${k}": "${c[k]}" is not a colour like "#C9663A"`);
    if (c.place !== undefined && !['room', 'corner'].includes(c.place)) err(`${at} (${m.id}): "place" must be "room" or "corner"`);
  }
  const room = Object.values(cast).filter(c => c.kind === 'human' && (c.place ?? (c.role === 'rival' ? 'corner' : 'room')) === 'room');
  if (Object.keys(cast).length && !room.length) err('the cast needs one human in the room (not "role": "rival" or "place": "corner"): the lead who sits at the desk');
  if (!Array.isArray(e.beats) || !e.beats.length) err('"beats" must list at least one beat');
  (Array.isArray(e.beats) ? e.beats : []).forEach((b, i) => {
    const at = `beat ${i + 1}`;
    if (!b || typeof b !== 'object') return err(`${at} must be an object`);
    if (!cast[b.who]) err(`${at}: "who": "${b.who}" is not in the cast (${Object.keys(cast).join(', ')})`);
    if (!str(b.line)) err(`${at} has no "line"`);
    if (b.shot !== undefined && !SHOTS.includes(b.shot)) err(`${at}: "shot": "${b.shot}" is not one of ${SHOTS.join(', ')}`);
    if (b.exp !== undefined && !EXPS.includes(b.exp)) err(`${at}: "exp": "${b.exp}" is not a face (${EXPS.join(', ')})`);
    if (b.shot === 'card' && (!Array.isArray(b.card) || !b.card.length || !b.card.every(str))) err(`${at} is a card: it needs "card": ["LINE ONE", "LINE TWO"]`);
    if (b.shot === 'stats' && (!Array.isArray(b.stats) || !b.stats.length || !b.stats.every(r => r && str(r.label) && r.value != null && (r.bar === undefined || (typeof r.bar === 'number' && r.bar >= 0 && r.bar <= 1))))) err(`${at} is a stats card: it needs "stats": [{"label": "views", "value": "212"}]`);
    if (b.hot !== undefined && !(Array.isArray(b.hot) && b.hot.every(str))) err(`${at}: "hot" must be a list of words`);
    for (const [k, v] of Object.entries(b.hud ?? {})) if (!(typeof v === 'string' || typeof v === 'number' || (v && typeof v === 'object' && v.value != null && (v.bar === undefined || (typeof v.bar === 'number' && v.bar >= 0 && v.bar <= 1)))))
      err(`${at}: hud "${k}" must be "212" or {"value": "212", "bar": 0..1, "style": "danger"}`);
  });
  if ((e.beats ?? []).some(b => b?.shot === 'previously')) { const p = e.previously;
    if (!p || !Number.isInteger(p.ep) || !str(p.question) || !str(p.winner?.tag) || !str(p.winner?.text) || !str(p.loser?.tag) || !str(p.loser?.text))
      err('a "previously" beat needs "previously": {"ep": 1, "question", "winner": {"tag", "text"}, "loser": {"tag", "text"}} (episode/series.mjs next writes it)'); }
  const ph = e.texts?.phoneHud ?? 'VIEWS';
  if ((e.beats ?? []).some(b => b?.shot === 'phone') && !(e.beats ?? []).some(b => b?.hud && ph in b.hud)) err(`a phone shot shows the HUD label "${ph}" (texts.phoneHud), but no beat sets it in "hud"`);
  const v = e.vote ?? {};
  if (!str(v.question) || !str(v.a) || !str(v.b)) err('"vote" needs "question", "a" and "b" (the vote is the last frame)');
  const last = (e.beats ?? []).at(-1)?.line ?? '', words = last.split(/\s+/).map(w => w.replace(/[^\w]/g, ''));
  for (const tag of [v.tagA ?? 'A', v.tagB ?? 'B']) if (!String(tag).replace(/[^\w]/g, '')) err(`vote tag "${tag}" needs a letter or digit (A-Z, 0-9)`); else if (!words.includes(String(tag).replace(/[^\w]/g, ''))) err(`the last beat's line must say the vote word "${tag}" (its button lands on that word)`);
  if (errs.length) die(`episode.json has ${errs.length} problem${errs.length > 1 ? 's' : ''}:\n  - ${errs.join('\n  - ')}`);
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
    sh('python', ['episode/bed.py', ep]);   // room tone + music bed + hits under the voice, all code-made
    const m = mux({ video: join(OUT, 'video.mp4'), audio: join(OUT, 'mix.wav'), out: MP4, fps: FPS, grain: 0, color: 'bt709' });
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
    const silent = [...(run('ffmpeg', ['-hide_banner', '-nostats', '-i', MP4, '-af', 'silencedetect=n=-50dB:d=0.15', '-vn', '-f', 'null', '-'], { capture: true }).stderr || '').matchAll(/silence_start: ([\d.]+)/g)].map(x => +x[1]);
    const frozen = filt('freezedetect=n=0.002:d=1.5', /freeze_start: ([\d.]+)/g).map(x => +x[1]);
    const checks = [
      { name: `${W}x${H} video`, ok: v?.width === W && v?.height === H, got: v ? `${v.width}x${v.height}` : 'no video' },
      { name: 'has sound', ok: !!a, got: a ? a.codec_name : 'no audio' },
      { name: `length = voice + 1.4 s (${want.toFixed(2)} s ± 0.2)`, ok: Math.abs(dur - want) <= 0.2, got: `${dur.toFixed(2)} s` },
      { name: 'loudness -14 ± 1.5 LUFS', ok: Math.abs(I + 14) <= 1.5, got: `${I} LUFS` },
      { name: 'no black stretch', ok: !black.length, got: black.length ? `black at ${black.join(', ')} s` : 'none' },
      { name: 'no silent gap (-50 dB, 0.15 s)', ok: !silent.length, got: silent.length ? `silent at ${silent.join(', ')} s` : 'none' },
      { name: 'no frozen stretch (1.5 s)', ok: !frozen.length, got: frozen.length ? `frozen at ${frozen.join(', ')} s` : 'none' },
    ];
    // faces not blown out: frames at 2 per second from every shot with people (not cards), the vote frame only above its buttons;
    // fail when more than 2 % of the skin pixels are washed to a pale blank (faceluma.py, the show's rule)
    const { e } = episode(), FD = join(OUT, 'faces'), lastS = vo.lines.at(-1).s;
    rmSync(FD, { recursive: true, force: true }); mkdirSync(FD, { recursive: true });
    const ft = [];
    for (let t = 0.25; t < dur - 0.1; t += 0.5) {
      const i = vo.lines.findLastIndex(l => l.s - 0.12 <= t), shot = e.beats[Math.max(i, 0)]?.shot;
      if (shot === 'card' || shot === 'stats' || shot === 'previously') continue;
      const f = join(FD, `f${ft.length}.png`);
      run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', MP4, '-frames:v', '1', '-vf', t >= lastS ? 'crop=iw:ih*0.5:0:0,scale=360:-2' : 'scale=360:-2', f]); ft.push(f);
    }
    const fl = JSON.parse(run('python', ['episode/faceluma.py', ...ft], { capture: true }).stdout || '{}');
    checks.push({ name: 'faces not blown out (< 2 % of skin clipped)', ok: fl.pct < 2, got: `${fl.pct}% of ${fl.skin} skin px over ${ft.length} frames (worst ${fl.worstPct}%)` });
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
