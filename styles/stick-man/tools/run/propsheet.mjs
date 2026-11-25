// Contact sheets of the kit's prop catalog (kit/props/catalog.js): one PNG per place, every prop (.glb and code-built)
// rendered alone in the kit's look with its name, source, size and triangles (propsheet.html, headless Chrome on the GPU).
//   node styles/stick-man/tools/run/propsheet.mjs [--places street,lab] [--cell 200] [--cols 6] [--out films/kit-props-list/sheet]
// Writes <out>/<place>.png. Renders on the GPU: run it on the render machine, not a laptop.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { serveFiles, launchGpu } from '#tools/render/pageserver.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '../../../..');
const argv = process.argv.slice(2), flag = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 ? argv[i + 1] : d; };
if (argv.includes('--help')) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.slice(3)).join('\n')); process.exit(0); }
const MAN = JSON.parse(fs.readFileSync(path.join(REPO, 'styles/stick-man/assets/props/manifest.json'), 'utf8'));
const { BUILT } = await import('#kit/props/built.js');
const all = [...new Set([...Object.values(MAN.props).map(v => v.place), ...Object.keys(BUILT).map(n => n.split('/')[0])])].sort();
const places = flag('places') ? flag('places').split(',') : all, cell = +flag('cell', 200), cols = +flag('cols', 6);
const out = path.resolve(flag('out', path.join(REPO, 'films/kit-props-list/sheet')));
fs.mkdirSync(out, { recursive: true });

const server = await serveFiles(REPO), browser = await launchGpu();
try {
  for (const place of places) {
    const t0 = Date.now(), page = await browser.newPage();
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [${place}] ${m.text()}`); });
    await page.goto(`http://127.0.0.1:${server.address().port}/styles/stick-man/tools/run/propsheet.html?place=${place}&cell=${cell}&cols=${cols}`);
    await page.waitForFunction(() => window.__sheet || window.__sheetError, null, { timeout: 300000, polling: 250 });
    const err = await page.evaluate(() => window.__sheetError);
    if (err) throw new Error(`${place}: ${err}`);
    const url = await page.evaluate(() => window.__sheet), file = path.join(out, `${place}.png`);
    fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
    console.log(`${place}: ${path.relative(REPO, file)} (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    await page.close();
  }
} finally { await browser.close(); server.close(); }
