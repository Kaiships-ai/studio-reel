// The look bench, headless: the golden fingerprint of every look at this checkout shown as tiles (tools/run/lookbench.html),
// and the hair-swap journey on the GPU. Every scenario writes a JSON report and its screenshots into --out.
//   node styles/stick-man/tools/run/lookbench.mjs serve [--port 8765]      a server on the repo; prints the bench URL, then "lookbench ready"
//   node styles/stick-man/tools/run/lookbench.mjs doctor                   read-only: the checkout's SHA, the machine, the browser, the GPU (ANGLE Metal), the port
//   node styles/stick-man/tools/run/lookbench.mjs golden --out <dir> [--mutate coral]   fingerprint + judge + the in-place hair swaps -> golden.json, bench.png; exit 1 on a lệch tile
//   node styles/stick-man/tools/run/lookbench.mjs hair-swap --out <dir>    the 110 in-place hair swaps against fresh builds (headless) -> swaps.json, hair-swap-110.png; exit 1 on a lệch pair
//   node styles/stick-man/tools/run/lookbench.mjs hairswap --out <dir> [--styles side,afro] [--loops 50]   one figure on the GPU, its toon hair swapped in place to each style in turn -> hair-<style>.png, hairswap.json (with --loops: the live geometry count after each loop)
//   node styles/stick-man/tools/run/lookbench.mjs lanes --out <dir>      GPU: an in-place change beside a fresh build, pixel by pixel -> hat-afro.png, child-hair.png, elder-hair.png, girth-bent.png, and swap-50.png (live geometries over 50 loops), lanes.json; exit 1 on a lệch lane
//   node styles/stick-man/tools/run/lookbench.mjs perf-build [--root <checkout>] [--reps 3]   headless: makeStick ms for each toon hair (median, p95), and an in-place swap's when the checkout has S.bakeHair; JSON on the last line
// --console prints the page's console. GPU scenarios (hairswap) belong on the Mac Pro; golden draws only HTML tiles.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import net from 'node:net';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serveFiles, launchGpu } from '../render/pageserver.mjs';
import { APPROVALS, GOLDEN, fingerprintAll, judge, readJSON, stickBuilder } from '../../../../test/unit/look-fingerprint.mjs';
import { SCORES } from './codescore.mjs';
import { swapAll } from '../../../../test/unit/hair-swap.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const PAGE = 'styles/stick-man/tools/run/lookbench.html';
export const PRO_HOST = 'hermes-mac';   // the Mac Pro (paired Orca env mac-pro): the one machine pixel baselines are captured on
const [cmd, ...rest] = process.argv.slice(2), A = {};
for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) A[rest[i].slice(2)] = rest[i + 1]?.startsWith('--') || rest[i + 1] == null ? true : rest[++i];
const sha = () => execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const out = () => { if (!A.out || A.out === true) { console.error('give --out <dir>'); process.exit(2); } const d = path.resolve(A.out); fs.mkdirSync(d, { recursive: true }); return d; };

async function withPage(dir, query, size, fn) {
  const server = await serveFiles(ROOT, { mounts: { '/__bench/': dir } }), browser = await launchGpu();
  try {
    const p = await (await browser.newContext({ viewport: size, deviceScaleFactor: 1 })).newPage(), errors = [];
    p.on('pageerror', e => errors.push(e.message));
    p.on('console', m => { if (A.console || m.type() === 'error') console.error(`console ${m.type()}: ${m.text()}`); if (m.type() === 'error') errors.push(m.text()); });
    await p.goto(`http://127.0.0.1:${server.address().port}/${PAGE}?${query}`);
    await p.waitForFunction(() => window.__ready === true || window.__ready === 'error', null, { timeout: 180000 });
    if (errors.length || (await p.evaluate(() => window.__ready)) !== true) throw new Error(`the bench page failed: ${errors.join(' | ')}`);
    return await fn(p);
  } finally { await browser.close(); server.close(); }
}

async function golden() {
  const dir = out(), t0 = performance.now(), mutate = typeof A.mutate === 'string' ? A.mutate : null;
  const [{ cases }, { pairs }] = await Promise.all([fingerprintAll({ mutate }), swapAll()]), G = readJSON(GOLDEN), fails = judge(G, readJSON(APPROVALS), cases);
  const report = { sha: sha(), mutate, ms: Math.round(performance.now() - t0), golden: G.cases, cases, fails, scores: SCORES, swaps: pairs };
  fs.writeFileSync(path.join(dir, 'golden.json'), JSON.stringify(report, null, 1) + '\n');
  await withPage(dir, 'view=bench&report=/__bench/golden.json', { width: 1200, height: 900 }, p => p.screenshot({ path: path.join(dir, 'bench.png'), fullPage: true }));
  const bad = [...fails.map(f => f.case), ...pairs.filter(p => !p.ok).map(p => `${p.from}>${p.to}`)];
  console.log(`${Object.keys(cases).length} cases + ${pairs.length} hair swaps, ${bad.length} lệch${bad.length ? ': ' + bad.join(', ') : ''} · ${path.join(dir, 'bench.png')}`);
  process.exitCode = bad.length ? 1 : 0;
}

async function hairSwap110() {
  const dir = out(), t0 = performance.now(), { pairs } = await swapAll();
  fs.writeFileSync(path.join(dir, 'swaps.json'), JSON.stringify({ sha: sha(), ms: Math.round(performance.now() - t0), pairs }, null, 1) + '\n');
  await withPage(dir, 'view=swaps&report=/__bench/swaps.json', { width: 1200, height: 900 }, p => p.screenshot({ path: path.join(dir, 'hair-swap-110.png'), fullPage: true }));
  const bad = pairs.filter(p => !p.ok);
  console.log(`${pairs.length} hair swaps, ${pairs.length - bad.length} khớp, ${bad.length} lệch${bad.length ? ': ' + bad.map(p => `${p.from}>${p.to}`).join(', ') : ''} · ${path.join(dir, 'hair-swap-110.png')}`);
  process.exitCode = bad.length ? 1 : 0;
}

async function hairswap() {
  const dir = out(), { HAIR_STYLES } = await import('#kit/cast/hair.js');
  const styles = typeof A.styles === 'string' ? A.styles.split(',') : HAIR_STYLES, rows = [], loops = Number(A.loops || 0), geometries = [];
  await withPage(dir, 'view=swap', { width: 720, height: 1280 }, async p => {
    for (const style of styles) {
      const swapMs = await p.evaluate(s => window.__swap(s), style), file = path.join(dir, `hair-${style}.png`);
      await p.screenshot({ path: file }); rows.push({ style, swapMs, png: file });
      console.log(`${style}: swapped in place in ${swapMs} ms`);
    }
    for (let k = 0; k < loops; k++) { for (const style of styles) await p.evaluate(s => window.__swap(s), style); geometries.push(await p.evaluate(() => window.__geometries())); }
    if (loops) console.log(`geometries after each of ${loops} loops: ${geometries.join(' ')}`);
  });
  fs.writeFileSync(path.join(dir, 'hairswap.json'), JSON.stringify({ sha: sha(), machine: os.hostname(), rows, geometries }, null, 1) + '\n');
}

async function perfBuild() {
  const root = path.resolve(typeof A.root === 'string' ? A.root : ROOT), reps = Number(A.reps || 3), { pathToFileURL } = await import('node:url');
  const stick = await stickBuilder(root);
  const S_ = p => import(pathToFileURL(path.join(root, 'styles/stick-man', p)).href);
  const { S: base } = await (await S_('tools/gates/motionlib.mjs')).rigStick('adult'), { toonHair, HAIR_STYLES } = await S_('kit/cast/hair.js');
  const q = (xs, p) => { const a = [...xs].sort((x, y) => x - y); return Math.round(a[Math.min(a.length - 1, Math.floor(p * a.length))] * 10) / 10; };
  const build = [], swap = [];
  for (let r = 0; r < reps; r++) for (const st of HAIR_STYLES) {
    const t0 = performance.now(), S = stick({ ...base.spec, hair: [toonHair(st)] }); build.push(performance.now() - t0);
    if (S.bakeHair) { const next = HAIR_STYLES[(HAIR_STYLES.indexOf(st) + 1) % HAIR_STYLES.length], t1 = performance.now(); S.bakeHair([toonHair(next)]); swap.push(performance.now() - t1); }
  }
  console.log(JSON.stringify({ root, sha: execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), n: build.length, makeStick: { median: q(build, 0.5), p95: q(build, 0.95) }, ...(swap.length ? { swap: { median: q(swap, 0.5), p95: q(swap, 0.95) } } : {}) }));
}

const savePng = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
async function lanes() {
  const dir = out(), rows = [];
  const pair = async (name, query, change, fresh, labels) => withPage(dir, `view=swap&${query}`, { width: 540, height: 960 }, async p => {
    await p.evaluate(change); const a = await p.evaluate(() => window.__grab());
    await p.evaluate(fresh); const b = await p.evaluate(() => window.__grab());
    const { diff, png } = await p.evaluate(([x, y, la, lb]) => window.__pair(x, y, la, lb), [a, b, ...labels]);
    savePng(path.join(dir, `${name}.png`), png); rows.push({ lane: name, diff, ok: diff === 0 }); console.log(`${name}: ${diff} px differ`);
  });
  await pair('hat-afro', 'wear=cap:police&hair=pompadour', () => window.__swap('afro'), () => window.__fresh('afro'), ['police cap: pompadour -> afro tại chỗ', 'dựng mới: afro']);
  for (const body of ['child', 'elder']) await pair(`${body}-hair`, `body=${body}&wear=&hair=side`, () => window.__swap('afro'), () => window.__fresh('afro'), [`${body}: side -> afro tại chỗ`, 'dựng mới: afro']);
  await pair('girth-bent', 'frame=body&wear=', () => window.__girth(1.3), () => window.__fresh(null, 1.3), ['girth 1 -> 1.3 tại chỗ', 'dựng mới: girth 1.3']);
  const { HAIR_STYLES } = await import('#kit/cast/hair.js');
  await withPage(dir, `view=swap&hair=${HAIR_STYLES[0]}`, { width: 540, height: 960 }, async p => {
    const ys = [await p.evaluate(() => window.__geometries())];
    for (let k = 0; k < 50; k++) { for (const st of [...HAIR_STYLES.slice(1), HAIR_STYLES[0]]) await p.evaluate(s => window.__swap(s), st); ys.push(await p.evaluate(() => window.__geometries())); }
    savePng(path.join(dir, 'swap-50.png'), await p.evaluate(([y, t]) => window.__chart(y, t), [ys, `live geometries: start ${ys[0]}, after 50 loops of 11 swaps ${ys.at(-1)} (max ${Math.max(...ys)})`]));
    rows.push({ lane: 'swap-50', start: ys[0], end: ys.at(-1), max: Math.max(...ys), ok: ys.at(-1) === ys[0] }); console.log(`swap-50: ${ys[0]} -> ${ys.at(-1)} (max ${Math.max(...ys)})`);
  });
  fs.writeFileSync(path.join(dir, 'lanes.json'), JSON.stringify({ sha: sha(), machine: os.hostname(), rows }, null, 1) + '\n');
  process.exitCode = rows.every(r => r.ok) ? 0 : 1;
}

const portFree = port => new Promise(ok => { const s = net.createServer().once('error', () => ok(false)).once('listening', () => s.close(() => ok(true))).listen(port, '127.0.0.1'); });
async function doctor() {
  const port = Number(A.port || 8765), lines = [], fail = [];
  lines.push(`checkout ${sha()} (${execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()})`);
  const pro = os.hostname().startsWith(PRO_HOST); lines.push(`machine ${os.hostname()}: ${pro ? 'the Mac Pro, sheets may run' : 'not the Mac Pro: no pixel sheets here'}`);
  const free = await portFree(port), ours = !free && (await fetch(`http://127.0.0.1:${port}/${PAGE}`).catch(() => null))?.ok;
  lines.push(`port ${port} ${free ? 'free' : ours ? 'serving the bench (lookbench serve)' : 'in use by something else (serve --port <other>)'}`); if (!free && !ours) fail.push('port');
  const browser = await launchGpu().catch(e => { lines.push(`browser missing (${e.message.split('\n')[0]}): node node_modules/playwright-core/cli.js install chromium-headless-shell`); fail.push('browser'); });
  if (browser) try {
    lines.push(`browser chromium ${browser.version()}`);
    const gl = await (await browser.newPage()).evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const e = c?.getExtension('WEBGL_debug_renderer_info'); return c ? c.getParameter(e ? e.UNMASKED_RENDERER_WEBGL : c.RENDERER) : null; });
    const metal = /ANGLE.*Metal/i.test(gl || ''); lines.push(`gpu ${gl || 'no WebGL2'}${metal ? '' : ' (not ANGLE Metal)'}`); if (!metal) fail.push('gpu');
  } finally { await browser.close(); }
  console.log(lines.join('\n')); console.log(fail.length ? `doctor: ${fail.join(', ')} not ready` : `doctor: ready${pro ? '' : ' (bench and golden only)'}`);
  process.exitCode = fail.length ? 1 : 0;
}

async function serve() {
  const dir = path.resolve(typeof A.out === 'string' ? A.out : fs.mkdtempSync(path.join(os.tmpdir(), 'lookbench-')));
  const server = await serveFiles(ROOT, { port: Number(A.port || 8765), mounts: { '/__bench/': dir } }), base = `http://127.0.0.1:${server.address().port}/${PAGE}`;
  console.log(`pid ${process.pid}\nbench ${base}?view=bench&report=/__bench/golden.json (run golden --out ${dir} first)\nswap  ${base}?view=swap\nlookbench ready`);
  for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => server.close(() => process.exit(0)));
}

const RUN = { serve, doctor, golden, hairswap, 'hair-swap': hairSwap110, 'perf-build': perfBuild, lanes };
if (RUN[cmd]) await RUN[cmd]();
else { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split(/\n(?!\/\/)/)[0].replace(/^\/\/ ?/gm, '')); process.exitCode = cmd ? 2 : 0; }
