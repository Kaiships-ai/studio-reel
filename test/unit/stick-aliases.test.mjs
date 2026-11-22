// The stick-man import aliases (#kit/ #tools/ #engine/ #motion-lib/) resolve the same in node and in the page: node
// reads styles/stick-man/package.json "imports", the browser reads each page's importmap.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url)), SM = path.join(ROOT, 'styles/stick-man');
const IMPORTS = JSON.parse(fs.readFileSync(path.join(SM, 'package.json'), 'utf8')).imports;
const ALIASES = Object.entries(IMPORTS).map(([k, v]) => [k.replace(/\*$/, ''), v.replace(/^\.\//, '').replace(/\*$/, '')]);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const code = walk(SM).filter(f => /\.(m?js|html)$/.test(f));
const SPEC = /(?:\bfrom\s*|\bimport\s*\(\s*|^\s*import\s+)(['"])([^'"\n]+)\1/gm;

test('every stick-man page that runs a module maps each alias to the folder package.json names', () => {
  const pages = code.filter(f => f.endsWith('.html') && /<script type="module">/.test(fs.readFileSync(f, 'utf8')));
  assert.ok(pages.length >= 4, 'reel.html, faces.html, camtry.html and previs.html are found');
  for (const f of pages) {
    const map = JSON.parse(fs.readFileSync(f, 'utf8').match(/<script type="importmap">(.*?)<\/script>/s)?.[1] || '{"imports":{}}').imports;
    for (const [k, dir] of ALIASES) assert.equal(map[k], `/styles/stick-man/${dir}`, `${path.relative(ROOT, f)} maps ${k}`);
  }
});

test('every # import names a file that exists, and kit/ and tools/ reach another stick-man folder only by alias', () => {
  const bad = [];
  for (const f of code) for (const [, , spec] of fs.readFileSync(f, 'utf8').matchAll(SPEC)) {
    const at = path.relative(ROOT, f);
    if (spec.startsWith('#')) {
      const a = ALIASES.find(([k]) => spec.startsWith(k));
      if (!a || !fs.existsSync(path.join(SM, a[1], spec.slice(a[0].length)))) bad.push(`${at}: ${spec} does not resolve`);
    } else if (spec.startsWith('../') && /^(kit|tools)\//.test(path.relative(SM, f))) {
      const to = path.relative(SM, path.resolve(path.dirname(f), spec)).split(path.sep)[0];
      if (to !== path.relative(SM, f).split(path.sep)[0] && ALIASES.some(([, d]) => d === `${to}/`)) bad.push(`${at}: ${spec} (use #${to}/)`);
    }
  }
  assert.deepEqual(bad, []);
});
