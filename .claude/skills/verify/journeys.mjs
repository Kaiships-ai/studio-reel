// journeys.mjs: every feature in features/ driven for real, one after another, on throwaway films/verify-run*. Run from the library root:
//   node .claude/skills/verify/journeys.mjs [run-id] [--only=new-film,voice,...] [--full] [--any=<finished reel in another style>]
// Each step prints `ok:` or `FAIL:`; exit 1 when any failed. Writes films/verify-evidence/<run-id>/: transcript.txt,
// summary.json, sheet.jpg, draft.mp4, designer.mp4 and flow.mp4, the video a person watches. Needs internet (edge-tts).
// In a worktree the evidence is also copied to ~/.claude/orchestrate/proof/evidence/<branch>/<run-id>/.
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { run, start } from '../../../kit/env.mjs';
import { EXE, ARGS } from '../../../core/render/browser.mjs';
import { serve } from '../../../core/render/serve.mjs';

const argv = process.argv.slice(2), pos = argv.filter(a => !a.startsWith('--'));
const flag = k => argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1];
const RUN = pos[0] || new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
const FILMS = resolve('films'), EV = join(FILMS, 'verify-evidence', RUN), MAKE = 'styles/kai-hand-draw/tools/make.mjs', DRAFT = '.claude/skills/verify/draft.mjs';
const FILM = 'films/verify-run', TEST = 'films/verify-run-test', COPY = 'films/verify-run-copy';
// One run on this machine at a time: it uses every core.
const LOCK = join(tmpdir(), 'studio-reel-journeys.lock');
if (existsSync(LOCK)) {
  const other = +readFileSync(LOCK, 'utf8');
  let alive = true; try { process.kill(other, 0); } catch { alive = false; }
  if (alive) { console.error(`✗ another journeys run (pid ${other}) is using this machine. Wait for it.`); process.exit(2); }
}
writeFileSync(LOCK, String(process.pid));
process.on('exit', () => rmSync(LOCK, { force: true }));
mkdirSync(EV, { recursive: true });
const TRANSCRIPT = join(EV, 'transcript.txt'), results = [];
const log = s => appendFileSync(TRANSCRIPT, s + '\n');

// A command as the user types it. Returns { code, out }; the transcript keeps every line.
function node(...args) {
  log(`$ node ${args.join(' ')}`);
  const r = run('node', args, { capture: true });
  const out = (r.stdout || '') + (r.stderr || ''); log(out);
  return { code: r.status, out };
}
const has = (r, re, what = re) => { if (!(re instanceof RegExp ? re.test(r.out) : r.out.includes(re))) throw new Error(`expected ${what}`); return r; };
const ok = r => { if (r.code !== 0) throw new Error(`exit ${r.code}`); return r; };
const no = r => { if (r.code === 0) throw new Error('expected a failure, got exit 0'); return r; };
const job = f => JSON.parse(readFileSync(join(f, 'job.json'), 'utf8'));
const st = (f, s) => job(f).steps.find(x => x.name === s);
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what}: ${a} is not ${b}`); };
const edit = (f, from, to) => { const t = readFileSync(f, 'utf8'); if (!t.includes(from)) throw new Error(`${f} has no ${from}`); writeFileSync(f, t.replace(from, to)); };
const copy = (from = FILM) => { rmSync(COPY, { recursive: true, force: true }); cpSync(from, COPY, { recursive: true, filter: s => !s.endsWith('/out') }); return COPY; };

let feature = '';
async function step(label, fn) {
  try { await fn(); results.push({ feature, label, ok: true }); console.log(`ok: ${feature} · ${label}`); log(`ok: ${label}`); }
  catch (e) { results.push({ feature, label, ok: false, why: e.message }); console.log(`FAIL: ${feature} · ${label}: ${e.message}`); log(`FAIL: ${label}: ${e.message}`); }
}
const SKIP = (label, why) => { results.push({ feature, label, skipped: why }); console.log(`skip: ${feature} · ${label}: ${why}`); log(`skip: ${label}: ${why}`); };
const clean = () => { for (const f of [FILM, TEST, COPY]) rmSync(f, { recursive: true, force: true }); };

const JOURNEYS = {
  async setup() {
    await step('doctor is six ✓, exit 0', () => has(ok(node('kit/studio.mjs', 'doctor')), 'All good.'));
    await step('a second install keeps the test render and the packages', () => has(has(ok(node('kit/studio.mjs', 'install')), 'already installed'), 'passed before'));
    await step('the verify doctor sees the tools and a GPU', () => has(ok(node(DRAFT, 'doctor')), 'page opens, READY, GPU:'));
  },
  async 'new-film'() {
    await step('new makes a film', () => has(ok(node(MAKE, 'new', 'verify-run')), `✓ ${FILM}/ ready`));
    await step('its name is set', () => { if (!readFileSync(`${FILM}/src/config.js`, 'utf8').includes("name: 'verify-run'")) throw new Error('name not set'); });
    await step('job.json starts with script running', () => eq(st(FILM, 'script').status, 'running', 'script'));
    await step('an existing film is refused', () => has(no(node(MAKE, 'new', 'verify-run')), 'already exists'));
    await step('a bad name is refused', () => has(no(node(MAKE, 'new', 'Bad_Name')), 'usage:'));
    await step('the presenter is the starter one, never kai-v3', () => { if (!existsSync(`${FILM}/src/character.js`) || readFileSync(`${FILM}/index.html`, 'utf8').includes('kai-v3')) throw new Error('wrong presenter'); });
  },
  async voice() {
    await step('vo: rules pass, every line transcribes back', () => has(has(ok(node(MAKE, FILM, 'vo')), 'voice rules pass'), 'mismatches: 0'));
    await step('it writes the timings', () => { for (const f of ['vo/vo.wav', 'vo/vo.json', 'src/vo.js', 'vo/word_times.txt']) if (!existsSync(join(FILM, f))) throw new Error(`${f} missing`); });
  },
  async 'sound-mix'() {
    await step('audio: −14.0 LUFS mix', () => has(ok(node(MAKE, FILM, 'audio')), /reel-audio\.wav.*-14\.0 LUFS/));
    await step('ffmpeg measures −14 LUFS on the file', () => {
      const r = run('ffmpeg', ['-hide_banner', '-nostats', '-i', `${FILM}/assets/reel-audio.wav`, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { capture: true });
      const I = +[...(r.stderr || '').matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop()?.[1]; log(`measured ${I} LUFS`);
      if (!(Math.abs(I + 14) <= .5)) throw new Error(`${I} LUFS`);
    });
  },
  async chapters() {
    await step('the draft passes', () => has(ok(node(DRAFT, FILM)), 'draft verify PASSED'));
    await step('the evidence is kept', () => { for (const f of ['draft.mp4', 'sheet.jpg', 'report.json']) cpSync(`${FILM}/out/verify/${f}`, join(EV, f)); });
    const hook = 'src/ch/c1_hook.js', breaks = [
      ['an undefined helper stops the draft', hook, 'set(t);', 'set(t); noSuchHelper();', 'noSuchHelper is not defined'],
      ['a word nobody says fails it', hook, "const T1 = vo('Clawd')", "vo('NOT_SPOKEN'); const T1 = vo('Clawd')", 'NOT_SPOKEN'],
      ['a scene that draws nothing fails it', hook, "chapter('hook', 0, END, [[0, t => {", "chapter('hook', 0, END, [[0, t => { return;", /✗ no empty scene/],
      ['a presenter option that does not exist fails it', 'src/character.js', "hair: 'curly'", "hair: 'mohawk'", '[character] hair'],
    ];
    for (const [label, file, from, to, want] of breaks) await step(label, () => { const c = copy(); edit(join(c, file), from, to); has(no(node(DRAFT, c)), want); });
  },
  async 'job-json'() {
    await step('voice, audio and draft are done, the draft files in outputs', () => { for (const s of ['voice', 'audio', 'draft']) eq(st(FILM, s).status, 'done', s); if (!job(FILM).outputs.some(f => f.endsWith('draft.mp4'))) throw new Error('no draft.mp4 in outputs'); });
    await step('a done step has started and ended', () => { const s = st(FILM, 'draft'); if (!s.started || !s.ended) throw new Error(JSON.stringify(s)); });
    await step('--change is stored, a new deliver clears it', () => {
      ok(node('core/job.mjs', FILM, 'deliver', 'running')); ok(node('core/job.mjs', FILM, 'deliver', 'done', '--change=hook shorter'));
      eq(job(FILM).change, 'hook shorter', 'change'); ok(node('core/job.mjs', FILM, 'deliver', 'running')); eq(job(FILM).change, undefined, 'change');
    });
    await step('an unknown preset is refused', () => has(no(node('core/job.mjs', FILM, 'script', 'done', '--preset=nope')), 'unknown preset'));
    await step('a tool that fails marks its step failed', () => { const c = copy(); rmSync(`${c}/vo/vo.json`); no(node(MAKE, c, 'audio')); eq(st(c, 'audio').status, 'failed', 'audio'); });
    await step('the unit tests pass (campaign, the literal file)', () => ok(node('--test', 'test/unit/job.test.mjs')));
  },
  async 'full-render'() {
    await step('a test-preset film gets its voice and mix', () => { ok(node(MAKE, 'new', 'verify-run-test', '--preset=test')); ok(node(MAKE, TEST, 'vo', 'audio')); });
    await step('killing a render leaves the step running with its pid', async () => {
      const p = start('node', [MAKE, TEST, 'render'], { stdio: 'ignore' });
      for (let i = 0; i < 300 && st(TEST, 'render').status !== 'running'; i++) await new Promise(r => setTimeout(r, 100));
      const gone = new Promise(r => p.on('close', r)); p.kill(); await gone;
      eq(st(TEST, 'render').status, 'running', 'render'); eq(st(TEST, 'render').pid, p.pid, 'pid');
      // the kill leaves video.mjs drawing and holding its lock (features/job-json.md): stop it, or the next render is refused
      const lock = `${TEST}/out/video.mp4.lock`;
      for (let i = 0; i < 100 && !existsSync(lock); i++) await new Promise(r => setTimeout(r, 100));
      if (existsSync(lock)) { try { process.kill(+readFileSync(lock, 'utf8')); } catch {} for (let i = 0; i < 100 && existsSync(lock); i++) await new Promise(r => setTimeout(r, 100)); rmSync(lock, { force: true }); }
    });
    await step('test preset: 270×480 at 12 fps, verified', () => has(has(ok(node(MAKE, TEST, 'render', 'verify')), 'preset test: 270×480 at 12 fps'), '✓ 270×480 at 12 fps'));
    await step('ffprobe agrees', () => { const r = run('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'csv=p=0', `${TEST}/verify-run-test.mp4`], { capture: true }); log(r.stdout); eq(r.stdout.trim(), '270,480,12/1', 'ffprobe'); });
    if (!argv.includes('--full')) return SKIP('full 1080×1920 render', 'only with --full');
    await step('full: 1080×1920 MP4 and cover, every check ✓', () => { ok(node(MAKE, FILM, 'render', 'verify')); for (const f of ['verify-run.mp4', 'verify-run-cover.png']) if (!existsSync(join(FILM, f))) throw new Error(`${f} missing`); });
  },
  async presenter() {
    const dir = join(EV, 'designer-frames'); mkdirSync(dir, { recursive: true });
    let spec = '';
    await step('the designer works, offline, on a phone, and is recorded', async () => {
      const browser = await chromium.launch({ executablePath: EXE, args: ARGS }), page = await browser.newPage({ viewport: { width: 390, height: 800 } }), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      const cdp = await page.context().newCDPSession(page), frames = [];
      cdp.on('Page.screencastFrame', f => { frames.push([f.metadata.timestamp, Buffer.from(f.data, 'base64')]); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
      await page.goto('file://' + resolve('character-designer.html'));
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80 });
      const beat = () => page.waitForTimeout(900);
      await beat(); for (let i = 0; i < 3; i++) { await page.click('#rand'); await beat(); }
      spec = await page.inputValue('#spec'); await page.click('#copy'); await beat();
      await page.click('#reset'); await beat(); await page.click('#rand'); await beat();
      spec = await page.inputValue('#spec'); await beat();
      if (!spec.includes('character-spec v1')) throw new Error(spec.slice(0, 80));
      if (errors.length) throw new Error(errors[0]);
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)) throw new Error('scrolls sideways at 390 px');
      await cdp.send('Page.stopScreencast'); await browser.close();
      const list = frames.map(([t, data], i) => { const f = `f${String(i).padStart(4, '0')}.jpg`; writeFileSync(join(dir, f), data); return `file '${f}'\nduration ${((frames[i + 1]?.[0] ?? t + 1) - t).toFixed(3)}`; });
      writeFileSync(join(dir, 'list.txt'), list.join('\n') + '\n');
      run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-i', join(dir, 'list.txt'), '-vf', 'fps=24,scale=540:960:force_original_aspect_ratio=decrease,pad=540:960:(ow-iw)/2:(oh-ih)/2:white', '-pix_fmt', 'yuv420p', join(EV, 'designer.mp4')], { capture: true });
      rmSync(dir, { recursive: true, force: true }); log(spec);
    });
    await step('the spec from the page draws in a film, no warning', () => {
      const c = copy(), values = Object.fromEntries(spec.split('\n').map(l => /^(\w+): (.*)$/.exec(l)).filter(Boolean).map(m => [m[1], m[2]]));
      writeFileSync(`${c}/src/character.js`, `const CHARACTER = ${JSON.stringify(values, null, 1)};\n`);
      has(ok(node(DRAFT, c)), 'draft verify PASSED');
      cpSync(`${c}/out/verify/draft.mp4`, join(EV, 'presenter-draft.mp4')); cpSync(`${c}/out/verify/sheet.jpg`, join(EV, 'presenter-sheet.jpg'));
    });
  },
  async 'any-style'() {
    const film = flag('any');
    if (!film) return SKIP('a reel in another style', 'needs --any=<a finished reel made with core/render/reel.mjs>');
    await step('reel.mjs builds it and checks it: size, colour, loudness', () => {
      const name = film.split('/').filter(Boolean).pop();
      rmSync(COPY, { recursive: true, force: true }); cpSync(film, COPY, { recursive: true, filter: s => !/\/out$/.test(s) && !s.includes(`/${name}.`) && !s.includes(`/${name}-cover`) });
      // the exit code also judges this film's own pacing and text, which is not what this step proves
      const r = node('core/render/reel.mjs', COPY, 'audio', 'render', 'check', '--no-asr', '--cover', '1');
      for (const row of ['✓ 1080×1920 at 30 fps', '✓ BT.709 limited range', '✓ loudness −14 ± 1 LUFS']) has(r, row);
      if (!existsSync(`${COPY}/verify-run-copy.mp4`) || !existsSync(`${COPY}/verify-run-copy-cover.png`)) throw new Error('no mp4 or cover');
    });
  },
  // The paid TMV kit, as a buyer gets it: build the zip, unzip into a fresh folder (a space in its path), install,
  // which renders the sample episode as its test render; then the character designer and a planted break.
  async 'tmv-episode'() {
    // under /tmp: the macOS tmpdir is too long for espeak-ng's 159-byte data path (the offline voice)
    const BOX = join(process.platform === 'win32' ? tmpdir() : '/tmp', `tmv verify ${RUN}`), KIT = join(BOX, 'tmv-studio');
    let zip = flag('zip');
    await step('the tmv zip builds and passes its gate', () => {
      if (zip) return;
      const r = has(ok(node('release/build.mjs', '--tier', 'tmv', '--out', join(EV, 'dist'))), /✓ tmv: .* every check passed/);
      zip = /→ (.*tmv-studio-.*\.zip)/.exec(r.out)[1];
    });
    await step('it unzips into a fresh folder with a space in its path', () => {
      rmSync(BOX, { recursive: true, force: true }); mkdirSync(BOX, { recursive: true });
      ok(node('-e', `const z=require('node:child_process').spawnSync('python3',['-m','zipfile','-e',process.argv[1],process.argv[2]],{stdio:'inherit'});process.exit(z.status)`, zip, BOX));
      if (!existsSync(join(KIT, 'episodes/sample/episode.json')) || existsSync(join(KIT, 'kit/check-reel'))) throw new Error('not the tmv layout');
    });
    await step('install renders the sample episode as its test render, every check ✓', () => {
      // test/clean-install.mjs = what a buyer types: pixi run studio install, doctor, install again (a no-op)
      has(ok(node('test/clean-install.mjs', KIT)), '✓ clean install passed');
      const rep = JSON.parse(readFileSync(join(KIT, 'episodes/sample/out/check.json'), 'utf8'));
      const bad = rep.checks.filter(c => !c.ok); if (bad.length) throw new Error(bad.map(c => c.name).join(', '));
      for (const f of ['sample.mp4', 'out/sheet.jpg', 'out/check.json']) cpSync(join(KIT, 'episodes/sample', f), join(EV, 'tmv-' + f.split('/').pop()));
    });
    await step('doctor is all ✓ in the unzipped kit', () => has(ok(node(join(KIT, 'kit/studio.mjs'), 'doctor')), 'All good.'));
    await step('the character designer (served from the kit, no network) drives the 3D figures and copies a cast entry', async () => {
      const { server, port } = await serve(KIT);   // what pixi run designer does (episode/designer.mjs)
      const b = await chromium.launch({ executablePath: EXE, args: ARGS }), p = await b.newPage({ viewport: { width: 1100, height: 900 } }), errs = [];
      p.on('pageerror', e => errs.push(e.message));
      await p.goto(`http://127.0.0.1:${port}/character-designer.html`); await p.waitForFunction(() => window.READY === true, null, { timeout: 60000 });
      const shot = async (name) => { await p.waitForTimeout(600); await p.locator('[data-testid=preview]').screenshot({ path: join(EV, `tmv-char-${name}.png`) }); };
      for (const s of ['nova', 'theo', 'blip']) { await p.click(`[data-testid=seed-${s}]`); await shot(s); }
      await p.click('[data-testid=seed-nova]'); await p.fill('[data-testid=field-name]', 'Juno'); await p.selectOption('[data-testid=field-hair]', 'curly');
      await p.selectOption('[data-testid=field-extra]', 'glasses'); await shot('designed');
      await p.click('[data-testid=copy]'); await p.waitForTimeout(200);
      const txt = await p.textContent('[data-testid=json]'), st = await p.textContent('#status'); await b.close(); server.close();
      if (errs.length) throw new Error(errs.join('; '));
      const c = JSON.parse(txt.slice(txt.indexOf('\n\n') + 2));
      if (c.id !== 'juno' || c.hair !== 'curly' || !c.voice) throw new Error('copied cast entry is wrong');
      if (!/Copied Juno|copy it by hand/.test(st)) throw new Error(`status: ${st}`);
    });
    await step('planted break: a beat for someone not in the cast fails with its own message', () => {
      const bad = join(KIT, 'episodes/broken'); cpSync(join(KIT, 'episodes/sample'), bad, { recursive: true });
      const f = join(bad, 'episode.json'); writeFileSync(f, readFileSync(f, 'utf8').replace(/"who": "theo"/g, '"who": "nobody"'));
      has(no(node(join(KIT, 'episode/make.mjs'), join(KIT, 'episodes/broken'), 'render')), '"who": "nobody" is not in the cast');
    });
    await step('planted break: a changed line without a new voice fails and names the vo step', () => {
      const f = join(KIT, 'episodes/broken/episode.json'); cpSync(join(KIT, 'episodes/sample/episode.json'), f);
      writeFileSync(f, readFileSync(f, 'utf8').replace('Two hundred views.', 'Three hundred views.'));
      has(no(node(join(KIT, 'episode/make.mjs'), join(KIT, 'episodes/broken'), 'render')), 'changed since its voice was made');
    });
    // slice 4: a series. Ep1 = the sample; the vote winner B writes Ep2's PREVIOUSLY opening; Ep2's story is the fixture
    // tmv-series-ep2.json (what /series has Claude write); Ep2 gets its own voice and renders with every check ✓
    await step('series: new from the sample, next --winner B writes ep2 with the PREVIOUSLY · EP 1 opening', () => {
      const SD = join(KIT, 'episodes/night-build');
      has(ok(node(join(KIT, 'episode/series.mjs'), 'new', SD, '--from', join(KIT, 'episodes/sample'))), 'series.json');
      has(ok(node(join(KIT, 'episode/series.mjs'), 'next', SD, '--winner', 'B')), 'ep1 winner: B · the story');
      has(no(node(join(KIT, 'episode/series.mjs'), 'next', SD, '--winner', 'C')), '--winner must be A or B');
      const e2 = JSON.parse(readFileSync(join(SD, 'ep2/episode.json'), 'utf8')), sj = JSON.parse(readFileSync(join(SD, 'series.json'), 'utf8'));
      if (e2.previously?.winner?.text !== 'the story' || e2.beats[0].shot !== 'previously' || sj.episodes[0].winner !== 'B' || e2.cast) throw new Error('ep2 is not linked to ep1');
      const fx = JSON.parse(readFileSync('.claude/skills/verify/features/tmv-series-ep2.json', 'utf8'));
      writeFileSync(join(SD, 'ep2/episode.json'), JSON.stringify({ ...fx, previously: e2.previously }, null, 2));
    });
    const kt = (...a) => node('test/kit-pixi.mjs', KIT, ...a);   // pixi run in the kit, as a buyer types it
    await step('series: ep2 gets its own voice and renders, every check ✓ (faces included)', () => {
      const M = join(KIT, 'core/tts/kokoro-v1.0.onnx');
      if (!existsSync(M)) { if (existsSync('core/tts/kokoro-v1.0.onnx')) for (const f of ['kokoro-v1.0.onnx', 'voices-v1.0.bin']) cpSync(join('core/tts', f), join(KIT, 'core/tts', f));
        else throw new Error('no Kokoro model: run pixi run fetch voice in the kit (about 350 MB)'); }
      const SD = join(KIT, 'episodes/night-build');
      ok(kt('-e', 'full', 'node', 'episode/make.mjs', join(SD, 'ep2'), 'vo'));
      ok(kt('node', 'episode/make.mjs', join(SD, 'ep2'), 'render', 'check'));
      const rep = JSON.parse(readFileSync(join(SD, 'ep2/out/check.json'), 'utf8')), bad = rep.checks.filter(c => !c.ok);
      if (bad.length) throw new Error(bad.map(c => c.name).join(', '));
      cpSync(join(SD, 'ep1/ep1.mp4'), join(EV, 'tmv-series-ep1.mp4')); cpSync(join(SD, 'ep2/ep2.mp4'), join(EV, 'tmv-series-ep2.mp4')); cpSync(join(SD, 'series.json'), join(EV, 'tmv-series.json'));
    });
    rmSync(BOX, { recursive: true, force: true });
  },
};

const only = flag('only')?.split(','), order = Object.keys(JOURNEYS).filter(j => !only || only.includes(j));
if (!only) clean();
for (feature of order) { console.log(`--- ${feature}`); log(`\n=== ${feature}`); await JOURNEYS[feature](); }

// flow.mp4: the designer, then the reel with its voice: what a person would watch to believe the run.
if (existsSync(join(EV, 'designer.mp4')) && existsSync(join(EV, 'presenter-draft.mp4')))
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', join(EV, 'designer.mp4'), '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', '-i', join(EV, 'presenter-draft.mp4'),
    '-filter_complex', '[0:v]setsar=1[a];[2:v]scale=540:960,fps=24,setsar=1[b];[1:a]atrim=duration=0.01[s];[0:v]null[n];[a][s][b][2:a]concat=n=2:v=1:a=1[v][au]'.replace('[0:v]null[n];', ''),
    '-map', '[v]', '-map', '[au]', '-c:v', 'libx264', '-crf', '28', '-pix_fmt', 'yuv420p', '-c:a', 'aac', join(EV, 'flow.mp4')], { capture: true });

const failed = results.filter(r => r.ok === false), skipped = results.filter(r => r.skipped);
writeFileSync(join(EV, 'summary.json'), JSON.stringify({ run: RUN, pass: !failed.length, results }, null, 1));
if (!only) clean();

// Evidence outlives the worktree; never copied in the main checkout.
if (statSync('.git').isFile()) {   // a worktree's .git is a file naming its git dir
  const head = readFileSync(join(readFileSync('.git', 'utf8').replace('gitdir:', '').trim(), 'HEAD'), 'utf8').trim();
  const dest = join(homedir(), '.claude/orchestrate/proof/evidence', head.replace('ref: refs/heads/', '').replaceAll('/', '-'), RUN);
  mkdirSync(dest, { recursive: true }); cpSync(EV, dest, { recursive: true }); console.log(`evidence kept: ${dest}`);
}
console.log(`${failed.length ? '✗' : '✓'} ${results.length - failed.length - skipped.length} ok, ${failed.length} failed, ${skipped.length} skipped · ${EV}`);
process.exit(failed.length ? 1 : 0);
