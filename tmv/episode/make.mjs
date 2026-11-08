// make.mjs: one episode folder (episode.json + index.html) to a preview MP4. Run from the library root:
//   pixi run node episode/make.mjs <episode> vo     one Gemini call, the narrator reads every beat → vo/take.wav, cut into vo/vo.wav + vo/vo.json
//   pixi run node episode/make.mjs <episode> render         frames in its style (episode/engines.mjs) + voice + bed (room tone, music, hits) → <episode>/<name>.mp4 (720x1280, 30 fps)
//   pixi run node episode/make.mjs new <name>             episodes/<name> from the sample (episode.json + page), ready to rewrite
//   pixi run node episode/make.mjs styles <card>          the card's character in 3D, hand-draw and paper side by side → workspace/<name>-styles.png (1280 wide)
//                                                         <card> = a seed (nova, theo, blip) or a .json file: a cast entry, {"seed": ...} or every part; --out <file.png>
//   pixi run node episode/make.mjs <episode> check          size, length, sound, no black or frozen stretch, faces not blown out, stills sheet
//   pixi run node episode/make.mjs <episode> script         the script rules of the real season (episode/script.mjs): 12 words a sentence, BUT/SO, sources, the vote, "you"
//   pixi run node episode/make.mjs <episode> gates          the 11 gates the real season passed (episode/gates.py) → out/gates.json
// No step = render check. Options: --fps N (default 30) · --workers N. Preview size only (720x1280, ST-77). The vo step needs GOOGLE_API_KEY in .env (pixi run studio key) and the internet; TMV_VO_TAKE=<wav> cuts that take instead (tests).
// <name> is the folder's name. Writes <episode>/out/check.json and <episode>/out/sheet.jpg (open it to look).
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, realpathSync, cpSync } from 'node:fs';
import { join, resolve, basename, relative, dirname } from 'node:path';
import { env, run, requireReady, ROOT } from '../kit/env.mjs';
import { mux } from '../core/render/mux.mjs';
import { speak, VOICE } from './gemini.mjs';
import { checkCard } from '../core/character-card.mjs';
import { shapeErrors, checkScript, RULES } from './script.mjs';
import { DEFAULT_STYLE, ENGINES, enginePage } from './engines.mjs';

const argv = process.argv.slice(2), steps = [], opt = {};
for (let i = 0; i < argv.length; i++) {
  if (!argv[i].startsWith('--')) { steps.push(argv[i]); continue; }
  const [k, v] = argv[i].slice(2).split('='); opt[k] = v ?? (['fps', 'workers', 'out'].includes(k) ? argv[++i] : true);
}
const die = m => { console.error('✗ ' + m); process.exit(1); };
const castJs = () => { const window = {}; new Function('window', readFileSync(join(ROOT, 'characters/cast.js'), 'utf8'))(window); return window; };
// new <name>: episodes/<name> = the sample's episode.json and page, no voice yet (write the story, then vo and render)
if (steps[0] === 'new') {
  const name = steps[1]; if (!name || !/^[\w-]+$/.test(name)) die('usage: node episode/make.mjs new <name>   (letters, digits, - and _)');
  const to = join(ROOT, 'episodes', name); if (existsSync(to)) die(`${to} already exists`);
  mkdirSync(to, { recursive: true });
  for (const f of ['episode.json', 'index.html']) writeFileSync(join(to, f), readFileSync(join(ROOT, 'episodes', 'sample', f)));
  console.log(`✓ ${to}: write its story in episode.json (README.md lists every field), then vo and render`); process.exit(0);
}
if (steps[0] === 'styles') {
  const arg = steps[1]; if (!arg) die('usage: node episode/make.mjs styles <seed or card.json> [--out <file.png>]');
  const SEEDS = castJs().TMV_SEEDS, seeds = Object.keys(SEEDS).join(', ');
  const seed = k => Object.hasOwn(SEEDS, k) ? SEEDS[k] : undefined;
  if (argv.some(a => a === '--out' || a.startsWith('--out=')) && !String(opt.out ?? '').endsWith('.png')) die('--out needs a file name ending in .png');
  let c = seed(arg);
  if (!c) { if (!existsSync(arg)) die(`"${arg}" is not a seed (${seeds}) or a card file`);
    try { c = JSON.parse(readFileSync(arg, 'utf8')); } catch (x) { die(`${arg} is not valid JSON: ${x.message}`); }
    if (c?.seed !== undefined && !seed(c.seed)) die(`"seed": "${c.seed}" is not a seed (${seeds})`);
    if (c && typeof c === 'object') { const { seed: s, ...own } = c; c = { ...seed(s), ...own, name: c.name ?? c.id }; } }
  const errs = checkCard(c); if (errs.length) die(`the card has ${errs.length} problem${errs.length > 1 ? 's' : ''}:\n  - ${errs.join('\n  - ')}`);
  requireReady(env());
  const out = resolve(opt.out ?? join(ROOT, 'workspace', `${c.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'character'}-styles.png`));
  const { openDemo, closeServer } = await import('../core/render/page.mjs');
  const { browser, page } = await openDemo(join(ROOT, 'episode', 'three-styles'), { w: 1280, h: 860, q: 'card=' + encodeURIComponent(JSON.stringify(c)) });
  mkdirSync(dirname(out), { recursive: true }); await page.screenshot({ path: out, fullPage: true });
  await browser.close(); closeServer();
  console.log(`✓ ${out}: ${c.name.trim()} in 3D, hand-draw and paper. Open it and pick a style.`); process.exit(0);
}
const ep = steps.length && (p => existsSync(p) ? realpathSync(p) : p)(resolve(steps.shift()));   // real path: /tmp is /private/tmp on macOS, and the server needs the episode under the library root
if (!ep || !existsSync(join(ep, 'episode.json'))) { console.error('usage: node episode/make.mjs <episode folder with episode.json> [script] [vo] [render] [check] [gates] [--fps N] [--full]'); process.exit(2); }
// every render is the 720x1280 review copy; a full-quality render needs the buyer's go (APPROVED-FULL, core/approve-full.mjs)
if (opt.full) die(existsSync(join(ep, 'APPROVED-FULL'))
  ? 'the full-quality render of an episode is not in this kit yet: the 720x1280 MP4 is the one to post'
  : `the full render needs the buyer's go: ask them, then run pixi run node core/approve-full.mjs ${ep} --by "<who asked, when>"`);
if (steps.join() !== 'script') requireReady(env());
const NAME = basename(ep), MP4 = join(ep, `${NAME}.mp4`), OUT = join(ep, 'out');
const FPS = +(opt.fps ?? 30), [W, H] = [720, 1280];
const sh = (tool, args) => { const r = run(tool, args); if (r.error || r.status !== 0) die(`failed: ${tool} ${args.join(' ')}`); };
const probe = f => JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { capture: true }).stdout || '{}');

// every field the engine reads is checked here, so a typo in episode.json stops with its own line instead of a broken frame
function episode() {
  let e; try { e = JSON.parse(readFileSync(join(ep, 'episode.json'), 'utf8')); } catch (x) { die(`episode.json is not valid JSON: ${x.message}`); }
  // in a series (episode/series.mjs) the show's name, cast, style, palette and texts come from ../series.json unless the episode sets them
  const sf = join(ep, '..', 'series.json');
  if (existsSync(sf)) { let s; try { s = JSON.parse(readFileSync(sf, 'utf8')); } catch (x) { die(`${sf} is not valid JSON: ${x.message}`); }
    e = { ...e, series: e.series ?? s.series, cast: e.cast ?? s.cast, style: e.style ?? s.style, narrator: e.narrator ?? s.narrator, model: e.model ?? s.model, palette: { ...(s.palette ?? {}), ...(e.palette ?? {}) }, texts: { ...(s.texts ?? {}), ...(e.texts ?? {}) } }; }
  const window = castJs();
  const shape = shapeErrors(e);
  if (shape.length) die(`episode.json has ${shape.length} problem${shape.length > 1 ? 's' : ''}:\n  - ${shape.join('\n  - ')}`);
  const P = window.TMV_PARTS, errs = [], err = m => errs.push(m);
  if (/WRITE THE (TITLE|RECAP LINE|NEXT QUESTION)/.test(JSON.stringify(e))) err('episode.json still has a WRITE ... placeholder (from series.mjs next): write the title, the recap line and the vote');
  const cast = {};
  for (const [i, m] of e.cast.entries()) {
    const at = `cast ${i + 1}`;
    if (cast[m.id]) err(`${at}: "id": "${m.id}" is used twice`);
    if (m.seed !== undefined && !window.TMV_SEEDS[m.seed]) err(`${at}: "seed": "${m.seed}" is not a seed (${Object.keys(window.TMV_SEEDS).join(', ')})`);
    const c = { ...(window.TMV_SEEDS[m.seed] || {}), ...m }; cast[m.id] = c;
    for (const k of ['kind', 'build', 'hair', 'top', 'eyes', 'extra']) if (c[k] !== undefined && !P[k].includes(c[k])) err(`${at} (${m.id}): "${k}": "${c[k]}" is not one of ${P[k].join(', ')}`);
    if (!c.kind) err(`${at} (${m.id}) needs a "seed" or "kind" (human or bot)`);
  }
  const room = Object.values(cast).filter(c => c.kind === 'human' && (c.place ?? (c.role === 'rival' ? 'corner' : 'room')) === 'room');
  if (Object.keys(cast).length && !room.length) err('the cast needs one human in the room (not "role": "rival" or "place": "corner"): the lead who sits at the desk');
  e.beats.forEach((b, i) => {
    const at = `beat ${i + 1}`;
    if (!cast[b.who]) err(`${at}: "who": "${b.who}" is not in the cast (${Object.keys(cast).join(', ')})`);
    if (b.shot === 'card' && !b.card) err(`${at} is a card: it needs "card": ["LINE ONE", "LINE TWO"]`);
    if (b.shot === 'stats' && !b.stats) err(`${at} is a stats card: it needs "stats": [{"label": "views", "value": "212"}]`);
  });
  if (e.beats.some(b => b.shot === 'previously') && !e.previously)
    err('a "previously" beat needs "previously": {"ep": 1, "question", "winner": {"tag", "text"}, "loser": {"tag", "text"}} (episode/series.mjs next writes it)');
  const ph = e.texts?.phoneHud ?? 'VIEWS';
  if (e.beats.some(b => b.shot === 'phone') && !e.beats.some(b => b.hud && ph in b.hud)) err(`a phone shot shows the HUD label "${ph}" (texts.phoneHud), but no beat sets it in "hud"`);
  const v = e.vote, last = e.beats.at(-1).line, words = last.split(/\s+/).map(w => w.replace(/[^\w]/g, ''));
  for (const tag of [v.tagA ?? 'A', v.tagB ?? 'B']) if (!String(tag).replace(/[^\w]/g, '')) err(`vote tag "${tag}" needs a letter or digit (A-Z, 0-9)`); else if (!words.includes(String(tag).replace(/[^\w]/g, ''))) err(`the last beat's line must say the vote word "${tag}" (its button lands on that word)`);
  if (errs.length) die(`episode.json has ${errs.length} problem${errs.length > 1 ? 's' : ''}:\n  - ${errs.join('\n  - ')}`);
  return { e, cast, lead: [room[0].id, room[0].name].filter(Boolean) };
}

const STEP = {
  script() {
    const { e, lead } = episode(), found = checkScript(e, { lead });
    for (const r of RULES) {
      const mine = found.filter(f => f.rule === r.id);
      console.log(`  ${mine.length ? '✗' : '✓'} ${r.id}: ${r.what}`);
      for (const f of mine) console.log(`      ${f.beat ? `beat ${f.beat}: ` : ''}${f.got}`);
      if (mine.length) console.log(`      fix: ${r.fix}`);
    }
    const bad = new Set(found.map(f => f.rule)).size;
    if (bad) die(`${bad} of ${RULES.length} script rules failed (above)`);
    console.log(`✓ ${RULES.length} of ${RULES.length} script rules pass`);
  },
  async vo() {
    const { e } = episode();
    const lines = e.beats.map((b, i) => ({ id: `b${String(i + 1).padStart(2, '0')}`, who: b.who, text: b.line }));
    const n = e.narrator ?? {}, voice = n.voice || VOICE;
    // build in vo.new/ and swap it in only when it worked: a failed voice never deletes the one that renders
    const nv = join(ep, 'vo.new'); rmSync(nv, { recursive: true, force: true }); mkdirSync(join(nv, 'vo'), { recursive: true });
    writeFileSync(join(nv, 'vo', 'lines.json'), JSON.stringify(lines, null, 1));
    if (process.env.TMV_VO_TAKE) { cpSync(process.env.TMV_VO_TAKE, join(nv, 'vo', 'take.wav')); console.log(`✓ test take ${process.env.TMV_VO_TAKE} (no Gemini call)`); }
    else {
      let r; try { r = await speak(lines.map(l => l.text), { voice, style: n.style ?? '', model: e.model, where: relative(ROOT, join(ep, 'episode.json')).replaceAll('\\', '/') }); }
      catch (x) { rmSync(nv, { recursive: true, force: true }); die(x.message); }
      writeFileSync(join(nv, 'vo', 'take.wav'), r.wav);
      console.log(`✓ Gemini ${voice} · 1 call · ${r.model} · ${r.seconds.toFixed(1)} s · ${lines.length} lines`);
    }
    sh('python', ['episode/voice.py', nv]);
    rmSync(join(ep, 'vo'), { recursive: true, force: true }); renameSync(join(nv, 'vo'), join(ep, 'vo')); rmSync(nv, { recursive: true, force: true });
  },
  render() {
    const { e } = episode();
    let page; try { page = enginePage(e.style, ROOT); } catch (x) { die(x.message); }
    if (existsSync(join(ep, 'vo/lines.json'))) {   // the voice must say exactly the beats, or captions and sound drift
      const said = JSON.parse(readFileSync(join(ep, 'vo/lines.json'), 'utf8'));
      if (said.length !== e.beats.length || said.some((l, i) => l.text !== e.beats[i].line || l.who !== e.beats[i].who))
        die(`episode.json changed since its voice was made: run pixi run node episode/make.mjs ${NAME} vo`);
    }
    if (!existsSync(join(ep, 'vo/vo.wav'))) die(`${join(ep, 'vo/vo.wav')} is missing: run the vo step first (pixi run node episode/make.mjs ${NAME} vo)`);
    cpSync(page, join(ep, 'index.html'));   // the style's page plays this folder's episode.json and voice
    mkdirSync(OUT, { recursive: true });
    sh('node', ['core/render/video.mjs', ep, '--size', `${W}x${H}`, '--fps', String(FPS), '--workers', String(opt.workers ?? env().workers), '--out', join(OUT, 'video.mp4')]);
    sh('python', ['episode/bed.py', ep]);   // room tone + music bed + hits under the voice, all code-made
    const m = mux({ video: join(OUT, 'video.mp4'), audio: join(OUT, 'mix.wav'), out: MP4, fps: FPS, grain: 0, color: 'bt709' });
    writeFileSync(join(OUT, 'loudness.json'), JSON.stringify({ I: m.I }));
    console.log(`✓ ${MP4}`);
  },
  gates() {
    if (!existsSync(MP4)) die(`${MP4} is missing: run the render step first`);
    const r = run('python', ['episode/gates.py', ep]);   // prints its own lines, writes out/gates.json
    if (r.error || r.status !== 0) die('a gate failed (above): out/gates.json lists each one');
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
    // fail when more than 2 % of the skin pixels are washed to a pale blank (faceluma.py, the show's rule). Only 3D lights faces.
    const { e } = episode(), FACES = 'faces not blown out (< 2 % of skin clipped)', flat = ENGINES[e.style ?? DEFAULT_STYLE].skip.faces;
    if (flat) checks.push({ name: FACES, ok: null, got: `skipped: ${flat}` });
    else {
      const FD = join(OUT, 'faces'), lastS = vo.lines.at(-1).s;
      rmSync(FD, { recursive: true, force: true }); mkdirSync(FD, { recursive: true });
      const ft = [];
      for (let t = 0.25; t < dur - 0.1; t += 0.5) {
        // a sample a frame or two from a cut can land on the other shot (16.25 s vs a cut at 16.37 - 0.12 hit a blank card):
        // skip it when the shot 0.1 s either side is a paper one
        const shotAt = x => e.beats[Math.max(vo.lines.findLastIndex(l => l.s - 0.12 <= x), 0)]?.shot;
        if ([t - 0.1, t, t + 0.1].some(x => ['card', 'stats', 'previously'].includes(shotAt(x)))) continue;
        const f = join(FD, `f${ft.length}.png`);
        run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(2), '-i', MP4, '-frames:v', '1', '-vf', t >= lastS ? 'crop=iw:ih*0.5:0:0,scale=360:-2' : 'scale=360:-2', f]); ft.push(f);
      }
      const fl = JSON.parse(run('python', ['episode/faceluma.py', ...ft], { capture: true }).stdout || '{}');
      checks.push({ name: FACES, ok: fl.pct < 2, got: `${fl.pct}% of ${fl.skin} skin px over ${ft.length} frames (worst ${fl.worstPct}%)` });
    }
    // six stills spread over the episode, to look at
    const stills = [0.1, 0.25, 0.4, 0.55, 0.75, 0.97].map((k, i) => {
      const f = join(OUT, `still-${i}.jpg`); run('ffmpeg', ['-v', 'error', '-y', '-ss', (dur * k).toFixed(2), '-i', MP4, '-frames:v', '1', f]); return f;
    });
    run('python', ['core/render/sheet.py', join(OUT, 'sheet.jpg'), ...stills, '--cols', '6', '--w', '270'], { capture: true });
    for (const c of checks) console.log(`  ${c.ok ? '✓' : c.ok === null ? '–' : '✗'} ${c.name}: ${c.got}`);
    writeFileSync(join(OUT, 'check.json'), JSON.stringify({ mp4: MP4, checks }, null, 1));
    console.log(`  stills: ${join(OUT, 'sheet.jpg')}`);
    if (checks.some(c => c.ok === false)) die('a check failed (above)');
  },
};
for (const s of steps.length ? steps : ['render', 'check']) {
  if (!STEP[s]) die(`unknown step "${s}": use script, vo, render, check or gates`);
  console.log(`\n=== ${s} · ${ep} ===`);
  await STEP[s]();
}
