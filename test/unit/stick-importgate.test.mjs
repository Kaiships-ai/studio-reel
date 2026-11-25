// tools/gates/importgate.mjs: a film on the one way in (kit/film.js) imports nothing else from the kit, however it is spelled.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { ROOT, run } from '../../kit/env.mjs';
import { importGate } from '../../styles/stick-man/tools/gates/importgate.mjs';

const TOOL = path.join(ROOT, 'styles/stick-man/tools/gates/importgate.mjs'), FILM = '/styles/stick-man/kit/film.js';
const OK = { 'reel.js': `import { person, flyCam } from '${FILM}';\nimport { P } from './people.js';\nimport * as THREE from 'three';\nimport { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';\nexport default { setModule: '/films/demo/set.js', cast: {}, a: new THREE.Vector3(), P, person, flyCam, mergeGeometries };`,
  'people.js': `import { person } from '${FILM}';\nexport const P = person({ name: 'gran', clips: [] });`,
  'set.js': `import { place } from '/styles/stick-man/kit/film.js';\nconst H = place('street', { light: 'night' });\nexport const COLLIDE = H.COLLIDE;\nexport const build = async s => (await H.open(s)).put('street/bench', [0, 0, 0]);\nexport const later = () => import('./people.js'), dat = fetch(new URL('./d.json', import.meta.url));`, 'd.json': '{}' };
const film = files => { const d = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'importgate-')), 'demo'); for (const [f, s] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); } fs.mkdirSync(d, { recursive: true }); return d; };
const bad = (src, file = 'reel.js') => importGate(film({ ...OK, [file]: (file === 'reel.js' ? OK['reel.js'] + '\n' : '') + src }));
const cli = (d, ...a) => run('node', [TOOL, d, ...a], { capture: true });

test('a film that uses only person() and place() passes, and says how many files it read', () => {
  const r = importGate(film(OK)); assert.deepEqual(r.findings, []); assert.equal(r.on, true); assert.equal(r.files, 3);
  const p = cli(film(OK)); assert.equal(p.status, 0, p.stdout + p.stderr); assert.match(p.stdout, /PASS.*3 files/);
});
test('engine/play.js, engine/look.js and motion-lib/bodies.js each fail alone, in the reel and hidden in a nested file', () => {
  for (const m of ['engine/play.js', 'engine/look.js', 'motion-lib/bodies.js']) for (const file of ['reel.js', 'parts/deep/er/x.mjs']) {
    const d = film({ ...OK, [file]: (file === 'reel.js' ? OK['reel.js'] : '') + `\nimport * as Z from '/styles/stick-man/${m}';` }), r = importGate(d);
    assert.equal(r.findings.length, 1, m + file); assert.match(r.findings[0], new RegExp(`${file.replace('.', '\\.')}:\\d+`)); assert.ok(r.findings[0].includes(m)); assert.equal(cli(d).status, 1);
  }
});
const SPELLINGS = {
  'side effect': `import '/styles/stick-man/kit/cast/wardrobe.js';`, 're-export': `export { SPECS } from '/styles/stick-man/engine/play.js';`, 'export all': `export * from '/styles/stick-man/engine/play.js';`,
  'a # alias': `import { makeStick } from '#engine/cast.js';`, 'the alias of film.js': `import { person as p2 } from '#kit/film.js';`, 'film.js with a query (a second copy)': `import { person as p3 } from '${FILM}?2';`,
  'a relative path out': `import x from '../../styles/stick-man/engine/play.js';`, 'dot-dot inside an absolute path': `import x from '/films/demo/../../styles/stick-man/engine/play.js';`, 'percent-encoded dots': `import x from './%2e%2e/%2e%2e/styles/stick-man/engine/play.js';`, 'a backslash': `import x from '.\\\\..\\\\..\\\\styles\\\\stick-man\\\\engine\\\\play.js';`,
  'another film': `import x from '/films/wwr/lib.js';`, 'another film, a near name': `import x from '/films/demo2/lib.js';`, 'a bare package': `import fs from 'node:fs';`, 'a web url': `import x from 'https://x.dev/a.js';`, 'a data url': `import x from 'data:text/javascript,export default 1';`, 'three by a climbing path': `import x from 'three/addons/../../../styles/a.js';`, 'core': `import x from '/core/a.js';`,
  'dynamic': `const x = await import('/styles/stick-man/engine/play.js');`, 'dynamic, inside a function': `const f = async () => (await import('#engine/play.js')).SPECS;`, 'dynamic template': 'const n = "play"; const x = import(`/styles/stick-man/engine/${n}.js`);', 'dynamic template into the film': 'const n = "people"; const x = import(`./${n}.js`);', 'dynamic variable': `const u = './people.js'; const x = import(u);`, 'dynamic sum': `const x = import('/sty' + 'les/stick-man/engine/play.js');`,
  'import.meta.resolve': `const x = import.meta.resolve('./people.js');`, 'import.meta kept': `const m = import.meta;`, 'import.meta url out': `const u = new URL('../../styles/stick-man/engine/play.js', import.meta.url);`, 'import.meta url, variable': `const n = 'x'; const u = new URL(n, import.meta.url);`,
  'fetch of the kit': `const t = fetch('/styles/stick-man/engine/play.js');`, 'fetch of a variable': `const n = 'x'; const t = fetch(n);`, 'fetch renamed': `const g = fetch; g('/a');`, 'globalThis.fetch': `globalThis.fetch('/a');`, 'window[fetch]': `window['fetch']('/a');`,
  'a kit url as data': `export const A = { setModule: '/styles/stick-man/kit/sets/rail.js' };`, 'another film as data': `export const A = { setModule: '/films/wwr/parts/a/set.js' };`, 'a kit url in a template': 'const ROOT = `/styles/stick-man/assets/props/${1}.glb`;', 'a kit url, whole origin': `const u = 'http://localhost:3000/styles/stick-man/engine/play.js';`,
  'eval': `eval('1');`, 'new Function': `new Function('return 1')();`, 'a worker': `new Worker('./people.js');`, 'a script element': `const s = document.createElement('script'); s.src = 'x';`, 'a module that does not parse': `import { from;`,
};
for (const [what, src] of Object.entries(SPELLINGS)) test(`fails: ${what}`, () => { const r = bad(src); assert.ok(r.findings.length >= 1, 'no finding'); assert.ok(r.findings.every(f => /^reel\.js:\d+/.test(f)), r.findings.join('\n')); });
test('what is not an import does not fail: a word in a comment or a line of the script, a fetch of the film\'s own file', () => {
  assert.deepEqual(bad(`// import '/styles/stick-man/engine/play.js'\nconst s = 'he imports styles from Paris'; const d = fetch('./d.json'), e = fetch('/films/demo/d.json'); const p = new URLSearchParams(globalThis.location?.search || '');`).findings, []);
});
test('a page in the film is read too: its inline module, its src, its import map', () => {
  for (const h of [`<script type="module">import '/styles/stick-man/engine/play.js';</script>`, `<script type="module" src="/styles/stick-man/engine/play.js"></script>`, `<script type="importmap">{"imports":{"three":"/styles/x.js"}}</script>`]) assert.equal(importGate(film({ ...OK, 'p/x.html': h })).findings.length, 1, h);
});
test('a link out of the film fails', () => { const d = film(OK); fs.symlinkSync(path.join(ROOT, 'styles/stick-man/engine/play.js'), path.join(d, 'eng.js')); assert.match(importGate(d).findings.join(), /eng\.js.*link/); });
test('zero files read is a failure, so is a folder that is not there', () => { const d = film({}); assert.equal(cli(d).status, 1); assert.equal(cli(d, '--strict').status, 1); assert.equal(cli(path.join(d, 'none')).status, 1); assert.equal(cli(film({ 'a.txt': 'x' })).status, 1); assert.notEqual(run('node', [TOOL], { capture: true }).status, 0); });
test('a film that never imports kit/film.js is not on the way in: reported, not failed; --strict turns the gate on for it', () => {
  const d = film({ 'reel.js': `import { SPECS } from '/styles/stick-man/engine/play.js';\nexport default {};`, 'old.js': 'import { from;' }), p = cli(d); assert.equal(p.status, 0, p.stdout); assert.match(p.stdout, /not on the way in/); assert.equal(cli(d, '--strict').status, 1);
});
test('one file that imports film.js, by any spelling, turns the gate on for every file', () => {
  for (const s of [`import { person } from '${FILM}';`, `import '../../styles/stick-man/kit/film.js';`, `import '#kit/film.js';`, `import('${FILM}');`, `export * from '${FILM}?x';`]) assert.equal(importGate(film({ 'reel.js': `import '/styles/stick-man/engine/play.js';`, 'n/p.js': s })).on, true, s);
  assert.equal(importGate(film({ 'reel.js': `import '/styles/stick-man/engine/play.js';`, 'n/p.js': `import { person } from '${FILM}'; import { broken` })).on, true, 'in a file that does not parse');
});
test('the shot lock gate runs it', () => { const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'styles/stick-man/tools/gates/GATES.json'), 'utf8')); const r = G.gates['4'].run.find(x => x.tool === 'tools/gates/importgate.mjs'); assert.deepEqual(r?.args, ['{film}']); assert.ok(!r.advisory); });
