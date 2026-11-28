// The stick-man engine reaches into the kit at exactly these places (static and dynamic imports of #kit/ or ../kit), the 14
// measured on 28/11 (a computed import loads a film's set or reel, not the kit). The list may only shrink: a new import
// fails, and so does one removed without striking it from the list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as acorn from 'acorn';
import { simple } from 'acorn-walk';
import { ROOT } from '../../kit/env.mjs';

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
const toKit = s => typeof s === 'string' && (s.startsWith('#kit/') || /^(\.\.\/)+kit\//.test(s));

export function kitImports(src, file) {
  const out = [], ast = acorn.parse(src, { ecmaVersion: 'latest', sourceType: 'module', allowHashBang: true });
  const hit = n => { const s = n.source?.value; if (toKit(s)) out.push(`${file} ${s}`); };
  simple(ast, { ImportDeclaration: hit, ExportNamedDeclaration: hit, ExportAllDeclaration: hit, ImportExpression: hit });
  return out;
}
const files = dir => readdirSync(dir, { withFileTypes: true }).flatMap(d => (d.isDirectory() ? files(join(dir, d.name)) : /\.m?js$/.test(d.name) ? [join(dir, d.name)] : []));

test('the engine imports from the kit only where the allowlist says, and every allowed import is still there', () => {
  const found = files(ENGINE).flatMap(f => kitImports(readFileSync(f, 'utf8'), relative(ENGINE, f)));
  assert.equal(new Set(found).size, found.length, 'no kit module imported twice from one file');
  assert.deepEqual(found.sort(), [...ALLOWED].sort());
  assert.ok(ALLOWED.length <= 14, 'the allowlist only shrinks');
});

test('control: a new static import, a re-export, a dynamic import and a ../kit path are found; a film module is not', () => {
  const src = "import a from '#kit/x.js';\nexport { b } from '../kit/y.js';\nconst c = await import('#kit/z.js');\nconst d = await import(R.setModule);\nimport t from 'three';";
  assert.deepEqual(kitImports(src, 'f.js'), ['f.js #kit/x.js', 'f.js ../kit/y.js', 'f.js #kit/z.js']);
});
