// The stick-man engine reaches into the kit at exactly these places, the 14 measured on 28/11: every import, re-export
// and dynamic import whose source names a kit module (#kit/…, a relative path that lands in kit/, the page's root path to
// it, or a computed source whose static start is one of those; tools/run/codescore.mjs kitTarget). The list may only
// shrink: a new import fails, so does one removed without striking it from the list, and the list may never be longer
// than the codescore card (test/golden/codescore.json), which only moves down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { kitImportsOf } from '../../styles/stick-man/tools/run/codescore.mjs';

const ALLOWED = [
  'cast.js #kit/cast/handprops.js',
  'cast.js #kit/props/drawn.js',
  'grip.js #kit/props/drawn.js',
  'look.js #kit/look/highlights.js',
  'play.js #kit/acting/director.js',
  'play.js #kit/cast/extras.js',
  'play.js #kit/fx/physfx.js',
  'play.js #kit/look/ablate.js',
  'play.js #kit/look/exposure.js',
  'play.js #kit/props/story.js',
  'play.js #kit/sets/backdrop.js',
  'verbs_fx.js #kit/fx/burst.js',
  'verbs_fx.js #kit/fx/explain.js',
  'verbs_fx.js #kit/props/dyepack.js',
];
const ENGINE = join(ROOT, 'styles/stick-man/engine');
const AT = 'styles/stick-man/engine/';
export const kitImports = (src, file) => kitImportsOf(src, AT + file).map(i => `${file} ${i.spec}`);
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? files(join(dir, d.name)) : /\.m?js$/.test(d.name) ? [join(dir, d.name)] : []));

test('the engine imports from the kit only where the allowlist says, and every allowed import is still there', () => {
  const found = files(ENGINE).flatMap(f => kitImports(readFileSync(f, 'utf8'), relative(ENGINE, f)));
  assert.equal(new Set(found).size, found.length, 'no kit module imported twice from one file');
  assert.deepEqual(found.sort(), [...ALLOWED].sort());
  const { card } = JSON.parse(readFileSync(join(ROOT, 'test/golden/codescore.json'), 'utf8'));
  assert.ok(ALLOWED.length <= card.engineKitImports, `the allowlist (${ALLOWED.length}) is no longer than the codescore card (${card.engineKitImports})`);
});

test('control: every way to name a kit module is found; a film module and three are not', () => {
  const src = [
    "import a from '#kit/x.js';", "export { b } from '../kit/y.js';", "const c = await import('#kit/z.js');",
    'const t1 = await import(`#kit/sets/${n}.js`);', "const t2 = await import('#kit/' + n);", "import w from './../kit/w.js';",
    "import v from '../engine/../kit/v.js';", "import z from '/styles/stick-man/kit/z.js';", "import q from '../../kit/q.js';",
    "const d = await import(R.setModule);", "const e = await import('../' + n);", "import t from 'three';", "import k from '../../stick-man-kit/k.js';",
  ].join('\n');
  assert.deepEqual(kitImports(src, 'f.js'), ['f.js #kit/x.js', 'f.js ../kit/y.js', 'f.js #kit/z.js', 'f.js #kit/sets/', 'f.js #kit/',
    'f.js ./../kit/w.js', 'f.js ../engine/../kit/v.js', 'f.js /styles/stick-man/kit/z.js']);
});
