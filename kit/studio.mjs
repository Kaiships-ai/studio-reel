// kit/studio.mjs: set up and check this Kaiships Studio folder. Buyers run it through pixi (the `studio` task):
//   pixi run studio install      first-time setup; safe to run again (finished steps are skipped)
//   pixi run studio doctor       read-only check, a few seconds: ✓/✗ per item, one fix line per ✗
//   pixi run studio key          TMV kit only: opens .env (GOOGLE_API_KEY=) in a text editor for the voice key
//   pixi run studio linux-deps   Linux only: the system libraries the headless browser needs (asks for your password)
// `pixi run` itself installs node, python and ffmpeg from pixi.lock before this file runs.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { env, run, ROOT, lockHash, installMarker, openInEditor } from './env.mjs';

const [verb = 'doctor', ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const ok = (n, d = '') => { console.log(`  ✓ ${n}${d ? '  ' + d : ''}`); return true; };   // true: callers return ok(...) as a pass
const bad = (n, what, fix) => { console.log(`  ✗ ${n}: ${what}\n    fix: ${fix}`); return false; };
const hash = f => { try { return createHash('sha256').update(readFileSync(f)).digest('hex').slice(0, 16); } catch { return ''; } };

// npm ships next to node: <bin>/node_modules/npm on Windows, <prefix>/lib/node_modules/npm elsewhere.
function npmCli() {
  const d = dirname(process.execPath);
  return [join(d, 'node_modules/npm/bin/npm-cli.js'), join(d, '../lib/node_modules/npm/bin/npm-cli.js')].find(existsSync);
}

async function browserCheck() {
  const { ARGS, EXE } = await import('../core/render/browser.mjs');
  const { chromium } = await import('playwright-core');
  const b = await chromium.launch({ executablePath: EXE, args: ARGS });
  try {
    const p = await b.newPage();
    return await p.evaluate(() => {
      const g = document.createElement('canvas').getContext('webgl2'); if (!g) return null;
      const e = g.getExtension('WEBGL_debug_renderer_info'); return e ? String(g.getParameter(e.UNMASKED_RENDERER_WEBGL)) : 'webgl2';
    });
  } finally { await b.close(); }
}
const gpuName = r => /swiftshader|llvmpipe|software/i.test(r) ? 'software (no GPU found: works, renders slower)' : /metal|apple/i.test(r) ? 'metal' : 'gpu';
const browserFix = () => process.platform === 'linux' ? 'pixi run studio linux-deps   then   pixi run studio install' : 'pixi run studio install';

// npm ci when node_modules is missing or package-lock.json changed since the last install.
function ensureNpm() {
  const lock = join(ROOT, 'package-lock.json'), mark = join(ROOT, 'node_modules', '.studio-hash');
  if (!force && existsSync(join(ROOT, 'node_modules/p5.brush/package.json')) && hash(lock) === (existsSync(mark) ? readFileSync(mark, 'utf8').trim() : '')) { ok('drawing packages', 'already installed'); return true; }
  const cli = npmCli();
  if (!cli) return bad('drawing packages', 'npm was not found next to node', 'pixi install   then   pixi run studio install');
  console.log('  … installing drawing packages (npm ci)');
  if (run('node', [cli, 'ci', '--no-audit', '--no-fund', '--loglevel=error']).status !== 0) return bad('drawing packages', 'npm ci failed (its message is above)', 'check your internet connection, then run: pixi run studio install');
  writeFileSync(mark, hash(lock)); ok('drawing packages', 'installed'); return true;
}


// The offline voice (espeak-ng inside the full environment) cannot open its data under a real path of 160+ bytes
// (core/tts/tts.py). Say so at install, before minutes of downloads, not first at the voice step.
function pathCheck() {
  const toml = existsSync(join(ROOT, 'pixi.toml')) ? readFileSync(join(ROOT, 'pixi.toml'), 'utf8') : '';
  if (!toml.includes('[feature.full]')) return true;
  const py = /^python = "(\d+\.\d+)/m.exec(toml)?.[1] ?? '3.12';
  const tail = process.platform === 'win32' ? '\\.pixi\\envs\\full\\Lib\\site-packages\\espeakng_loader\\espeak-ng-data'
    : `/.pixi/envs/full/lib/python${py}/site-packages/espeakng_loader/espeak-ng-data`;
  const root = realpathSync(ROOT), max = 159 - Buffer.byteLength(tail), n = Buffer.byteLength(root);
  if (n <= max) { ok('folder path', `${n} of ${max} characters`); return true; }
  return bad('folder path', `this folder's path is ${n} characters, the offline voice allows ${max}: ${root}`,
    'unzip the studio again into a short folder (for example ~/tmv-studio), then run pixi run studio install there (a moved folder does not work)');
}

async function install() {
  console.log(`Kaiships Studio · setup (first time ${TMV ? '2-4' : 'about 5'} minutes; everything stays inside this folder)`);
  const E = env();
  for (const t of ['python', 'ffmpeg', 'ffprobe']) if (!E.tools[t]) return bad(t, 'missing from the pixi environment', 'pixi install   then   pixi run studio install');
  ok(`node ${process.versions.node} · python · ffmpeg`, 'locked versions from pixi.lock');
  if (!pathCheck()) return false;

  if (!ensureNpm()) return false;

  console.log('  … browser (chromium-headless-shell; nothing happens if it is already there)');
  if (run('node', ['node_modules/playwright-core/cli.js', 'install', 'chromium-headless-shell']).status !== 0) return bad('browser', 'download failed (message above)', 'check your internet connection, then run: pixi run studio install');
  let r;
  try { r = await browserCheck(); } catch (e) { return bad('browser', `it does not start (${String(e.message).split('\n')[0].slice(0, 120)})`, browserFix()); }
  if (!r) return bad('browser', 'WebGL is not available', browserFix());
  ok('browser', `GPU: ${gpuName(r)}`);

  if (!force && existsSync(installMarker()) && readFileSync(installMarker(), 'utf8').trim() === lockHash()) { ok('test render', 'passed before with these versions'); return done(); }
  rmSync(installMarker(), { force: true });   // an old marker would make the test render itself refuse as "tool versions changed"
  // The TMV kit has no check reel. The sample episode ships rendered (episodes/sample/sample.mp4), so the buyer sees it at
  // once; the test render draws its first 2 seconds (about 20 s) to prove the browser, ffmpeg and the Python audio tools
  // work, instead of the whole 44 s (4-5 minutes, the slowest part of the first install in P16's buyer run)
  if (!existsSync(join(ROOT, 'kit', 'check-reel')) && existsSync(join(ROOT, 'episodes', 'sample', 'episode.json'))) {
    const soft = /swiftshader|llvmpipe|software/i.test(r);
    console.log('  … test render (the first 2 s of the sample episode: it checks the tools, about 20 seconds)');
    const tmp = join(ROOT, 'episodes', 'sample', 'out', '_test'), mp4 = join(tmp, 'test.mp4');
    rmSync(tmp, { recursive: true, force: true }); mkdirSync(tmp, { recursive: true });
    if (run('node', ['core/render/video.mjs', join(ROOT, 'episodes', 'sample'), '--size', '720x1280', '--fps', '10', '--seconds', '2', '--workers', '1', '--out', mp4]).status !== 0)
      return bad('test render', 'the drawing step failed (message above)', 'pixi run studio doctor');
    const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', mp4], { capture: true }).stdout || '{}');
    const v = (pr.streams || []).find(s => s.codec_type === 'video');
    if (!(v && v.width === 720 && v.height === 1280 && +v.nb_read_frames === 20))
      return bad('test render', `unexpected result (${v ? `${v.width}x${v.height}, ${v.nb_read_frames} frames` : 'no video'})`, 'pixi run studio doctor');
    if (run('python', ['-c', 'import numpy, scipy, soundfile, soxr, PIL']).status !== 0)
      return bad('audio tools', 'the Python audio packages do not load (message above)', 'pixi install   then   pixi run studio install');
    rmSync(tmp, { recursive: true, force: true });
    ok('test render', `720x1280, 20 frames${soft ? '  (no GPU found: this machine renders slowly, a 40 s episode takes about an hour)' : ''}`);
    if (!existsSync(join(ROOT, 'episodes', 'sample', 'sample.mp4'))) {   // only if the buyer deleted the shipped one
      console.log('  … the sample episode is missing: rendering it again (2-5 minutes with a GPU)');
      if (run('node', ['episode/make.mjs', 'episodes/sample', 'render', 'check', ...(soft ? ['--fps', '8'] : [])]).status !== 0) return bad('sample episode', 'it did not render (message above)', 'pixi run studio doctor');
    }
    ok('sample episode', 'episodes/sample/sample.mp4');
    writeFileSync(installMarker(), lockHash());
    return done();
  }
  const tmp = join(ROOT, 'films', '_studio-check');
  rmSync(tmp, { recursive: true, force: true }); mkdirSync(join(ROOT, 'films'), { recursive: true });
  cpSync(join(ROOT, 'kit', 'check-reel'), tmp, { recursive: true });
  console.log('  … test render (5 s at 4 frames a second: it checks the tools, not the motion)');
  const video = join(tmp, 'out', 'video.mp4'), mp4 = join(tmp, 'check.mp4');
  mkdirSync(join(tmp, 'out'), { recursive: true });
  if (run('node', ['core/render/video.mjs', tmp, '--size', '1080x1920', '--fps', '4', '--workers', String(Math.min(2, env().workers)), '--out', video]).status !== 0)
    return bad('test render', 'the drawing step failed (message above)', 'pixi run studio doctor');
  const { mux } = await import('../core/render/mux.mjs');
  let m; try { m = mux({ video, audio: join(tmp, 'assets', 'reel-audio.wav'), out: mp4, fps: 30, grain: 0, color: 'bt709' }); }
  catch (e) { return bad('test render', e.message, 'pixi run studio doctor'); }
  const pr = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', mp4], { capture: true }).stdout || '{}');
  const v = (pr.streams || []).find(s => s.codec_type === 'video'), a = (pr.streams || []).find(s => s.codec_type === 'audio');
  if (!(v && v.width === 1080 && v.height === 1920 && a && Math.abs(+pr.format.duration - 5.1) < 0.2 && Math.abs(m.I + 14) <= 1))
    return bad('test render', `unexpected result (${v ? v.width + 'x' + v.height : 'no video'}, ${a ? 'audio' : 'no audio'}, ${pr.format?.duration} s, ${m.I} LUFS)`, 'pixi run studio doctor');
  ok('test render', `1080x1920, ${(+pr.format.duration).toFixed(1)} s, sound ${m.I} LUFS`);
  rmSync(tmp, { recursive: true, force: true });
  writeFileSync(installMarker(), lockHash());
  return done();
}
// The TMV kit (sample episode, no check reel) voices with Gemini: its key lives in .env, never in git, the zip or the chat
const TMV = existsSync(join(ROOT, 'episodes', 'sample', 'episode.json')) && !existsSync(join(ROOT, 'kit', 'check-reel'));
function key() {
  if (!TMV) { console.log('Nothing to do: only the TMV kit needs a voice key.'); return true; }
  const f = join(ROOT, '.env');
  if (!existsSync(f) || !/^GOOGLE_API_KEY=/m.test(readFileSync(f, 'utf8'))) {
    const old = existsSync(f) ? readFileSync(f, 'utf8') : '# Paste your Google AI Studio key after the = sign, then save (Cmd+S or Ctrl+S)\n';
    writeFileSync(f, old + (old && !old.endsWith('\n') ? '\n' : '') + 'GOOGLE_API_KEY=\n', { mode: 0o600 });
  }
  console.log(`Opening ${f}: paste the key from https://aistudio.google.com/apikey after GOOGLE_API_KEY=, save, then say "xong" (done).`);
  if (process.env.TMV_VO_TAKE || process.env.STUDIO_NO_EDITOR) return true;   // tests: no editor (a buyer-run driver writes .env itself)
  openInEditor(f, () => console.log(`Could not open an editor: open ${f} yourself.`));
  return true;
}
async function voiceKey() {
  if (process.env.TMV_VO_TAKE) return ok('voice key', 'skipped: TMV_VO_TAKE test take');
  const { speak } = await import('../episode/gemini.mjs');
  try { const r = await speak(['Hi.']); return ok('voice key', `Gemini TTS answered (Achird, ${r.seconds.toFixed(1)} s)`); }
  catch (e) {
    // a used-up daily quota means the key itself works: not a ✗ (re-pasting the key would not help)
    if (/Gemini 429/.test(e.message)) return ok('voice key', "valid; today's free voice quota is used up (resets about 14:00-15:00 Vietnam time)");
    console.log(`  ✗ ${e.message.replace(/\n  fix:/, '\n    fix:').replace(/\n  \(/g, '\n    (')}`); return false; }
}
const NEXT = () => existsSync(join(ROOT, 'kit', 'check-reel')) ? '/make-reel <your topic>' : 'open episodes/sample/sample.mp4';
function done() { console.log(`\nReady. Next: ${NEXT()}`); return true; }

async function doctor() {
  console.log('Kaiships Studio · check');
  const E = env(); let good = true;
  const tool = t => E.tools?.[t] ? ok(t) : (good = bad(t, 'not installed in this folder', 'pixi run studio install'));
  ['python', 'ffmpeg', 'ffprobe'].forEach(tool);
  if (!pathCheck()) good = false;
  if (existsSync(join(ROOT, 'node_modules/p5.brush/package.json'))) ok('drawing packages'); else good = bad('drawing packages', 'not installed', 'pixi run studio install');
  if (good) {
    try { const r = await browserCheck(); if (r) ok('browser', `GPU: ${gpuName(r)}`); else good = bad('browser', 'WebGL is not available', browserFix()); }
    catch (e) { good = bad('browser', `it does not start (${String(e.message).split('\n')[0].slice(0, 120)})`, browserFix()); }
  }
  if (TMV && !(await voiceKey())) good = false;
  const marker = existsSync(installMarker()) ? readFileSync(installMarker(), 'utf8').trim() : '';
  if (marker === lockHash()) ok('setup finished', 'test render passed with these versions');
  else good = bad('setup finished', marker ? 'the tool versions changed (normal after an update)' : 'setup has not finished yet', 'pixi run studio install');
  console.log(good ? `\nAll good. Next: ${NEXT()}` : '\nFix the ✗ lines above, then run this check again.');
  return good;
}

function linuxDeps() {
  if (process.platform !== 'linux') { console.log('Nothing to do: only Linux needs extra system libraries.'); return true; }
  if (!ensureNpm()) return false;
  console.log('Installing the system libraries the headless browser needs. This step asks for your password (sudo).');
  return run('node', ['node_modules/playwright-core/cli.js', 'install-deps', 'chromium-headless-shell']).status === 0;
}

const verbs = { install, doctor, key, 'linux-deps': linuxDeps };
if (!verbs[verb]) { console.log('usage: pixi run studio install | doctor | key | linux-deps'); process.exit(2); }
process.exit((await verbs[verb]()) ? 0 : 1);
