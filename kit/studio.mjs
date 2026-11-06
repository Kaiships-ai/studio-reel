// kit/studio.mjs: set up and check this Kaiships Studio folder. Buyers run it through pixi (the `studio` task):
//   pixi run studio install      first-time setup; safe to run again (finished steps are skipped)
//   pixi run studio doctor       read-only check, a few seconds: ✓/✗ per item, one fix line per ✗
//   pixi run studio linux-deps   Linux only: the system libraries the headless browser needs (asks for your password)
// `pixi run` itself installs node, python and ffmpeg from pixi.lock before this file runs.
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, cpSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { env, run, ROOT, lockHash, installMarker } from './env.mjs';

const [verb = 'doctor', ...rest] = process.argv.slice(2);
const force = rest.includes('--force');
const ok = (n, d = '') => console.log(`  ✓ ${n}${d ? '  ' + d : ''}`);
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

async function install() {
  console.log('Kaiships Studio · setup (first time about 5 minutes; everything stays inside this folder)');
  const E = env();
  for (const t of ['python', 'ffmpeg', 'ffprobe']) if (!E.tools[t]) return bad(t, 'missing from the pixi environment', 'pixi install   then   pixi run studio install');
  ok(`node ${process.versions.node} · python · ffmpeg`, 'locked versions from pixi.lock');

  if (!ensureNpm()) return false;

  console.log('  … browser (chromium-headless-shell; nothing happens if it is already there)');
  if (run('node', ['node_modules/playwright-core/cli.js', 'install', 'chromium-headless-shell']).status !== 0) return bad('browser', 'download failed (message above)', 'check your internet connection, then run: pixi run studio install');
  let r;
  try { r = await browserCheck(); } catch (e) { return bad('browser', `it does not start (${String(e.message).split('\n')[0].slice(0, 120)})`, browserFix()); }
  if (!r) return bad('browser', 'WebGL is not available', browserFix());
  ok('browser', `GPU: ${gpuName(r)}`);

  if (!force && existsSync(installMarker()) && readFileSync(installMarker(), 'utf8').trim() === lockHash()) { ok('test render', 'passed before with these versions'); return done(); }
  // The TMV kit has no check reel: its test render is the sample episode itself (preview, 720x1280), which the buyer keeps
  if (!existsSync(join(ROOT, 'kit', 'check-reel')) && existsSync(join(ROOT, 'episodes', 'sample', 'episode.json'))) {
    console.log('  … test render: the sample episode (preview 720x1280, a minute or two)');
    if (run('node', ['episode/make.mjs', 'episodes/sample', 'render', 'check']).status !== 0) return bad('test render', 'the sample episode did not render (message above)', 'pixi run studio doctor');
    ok('test render', 'episodes/sample/sample.mp4');
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
const NEXT = () => existsSync(join(ROOT, 'kit', 'check-reel')) ? '/make-reel <your topic>' : 'open episodes/sample/sample.mp4';
function done() { console.log(`\nReady. Next: ${NEXT()}`); return true; }

async function doctor() {
  console.log('Kaiships Studio · check');
  const E = env(); let good = true;
  const tool = t => E.tools?.[t] ? ok(t) : (good = bad(t, 'not installed in this folder', 'pixi run studio install'));
  ['python', 'ffmpeg', 'ffprobe'].forEach(tool);
  if (existsSync(join(ROOT, 'node_modules/p5.brush/package.json'))) ok('drawing packages'); else good = bad('drawing packages', 'not installed', 'pixi run studio install');
  if (good) {
    try { const r = await browserCheck(); if (r) ok('browser', `GPU: ${gpuName(r)}`); else good = bad('browser', 'WebGL is not available', browserFix()); }
    catch (e) { good = bad('browser', `it does not start (${String(e.message).split('\n')[0].slice(0, 120)})`, browserFix()); }
  }
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

const verbs = { install, doctor, 'linux-deps': linuxDeps };
if (!verbs[verb]) { console.log('usage: pixi run studio install | doctor | linux-deps'); process.exit(2); }
process.exit((await verbs[verb]()) ? 0 : 1);
