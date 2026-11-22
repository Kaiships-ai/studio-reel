// The kit/series boundary. Kit code (engine, lib, allout, tools) is for every series, so it never names one; a series is
// data in bible/<series>/, so its JSON holds no pass/fail numbers; and a film stands alone, so it never imports another film.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { thresholdKeys, validateSeries, SECTIONS } from '../../styles/stick-man/bible/series.mjs';

const SM = path.join(ROOT, 'styles/stick-man');
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out;
  for (const n of fs.readdirSync(d)) { if (n === '__pycache__' || n === 'node_modules') continue; const p = path.join(d, n); fs.statSync(p).isDirectory() ? walk(p, out) : out.push(p); }
  return out;
};
const rel = f => path.relative(ROOT, f).split(path.sep).join('/');

// ---- (a) kit code names no series
// Comments may cite where a rule came from ("Hot Money ep01 r5 ..."): that is provenance, not a dependency. Code and strings may not.
export const SERIES_NAME = /hot[\s_-]?money|\bhm[-_](ep|r\d|bible)|\bnm[-_]ep\d/i;
export const stripComments = (src, py) => py ? src.replace(/#.*$/gm, '') : src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
// JSON data files in the kit: "source" and "note" are provenance text; "set" in calibration.json is the id of the sample
// the reviewer was measured on (a record of what happened, not a dependency)
const dropProvenance = o => Array.isArray(o) ? o.map(dropProvenance)
  : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).filter(([k]) => !['source', 'note', 'set'].includes(k)).map(([k, v]) => [k, dropProvenance(v)])) : o;
export function seriesNamesIn(file, src) {
  if (file.endsWith('.json')) return SERIES_NAME.test(JSON.stringify(dropProvenance(JSON.parse(src)))) ? [file] : [];
  return SERIES_NAME.test(stripComments(src, file.endsWith('.py'))) ? [file] : [];
}
// WHOCHECKS.json row library-unused says "a Hot Money film" in its limit text, which the skill doc shows verbatim
// (.claude/skills/make-reel-stick-man, checked by stick-whochecks.test.mjs). Reword both together, then delete this row.
const NAMES_ALLOWED = new Set(['styles/stick-man/tools/WHOCHECKS.json']);
test('kit code (engine, lib, allout, tools) names no series outside comments and provenance fields', () => {
  const files = ['engine', 'lib', 'allout', 'tools'].flatMap(d => walk(path.join(SM, d))).filter(f => /\.(js|mjs|py|json)$/.test(f));
  assert.ok(files.length > 50);
  assert.deepEqual(files.filter(f => !NAMES_ALLOWED.has(rel(f))).flatMap(f => seriesNamesIn(rel(f), fs.readFileSync(f, 'utf8'))), []);
});
test('the series-name rule catches code and strings, passes provenance comments', () => {
  assert.equal(seriesNamesIn('a.js', "const f = 'hm-ep01';").length, 1);
  assert.equal(seriesNamesIn('a.js', 'if (series === "Hot Money") {}').length, 1);
  assert.equal(seriesNamesIn('a.py', 'x = "hot-money"').length, 1);
  assert.equal(seriesNamesIn('a.js', '// (Hot Money r5: a bag)\nconst x = 1; // hm-ep01').length, 0);
  assert.equal(seriesNamesIn('a.py', '# from hm-ep01 round 4\nx = 1').length, 0);
  assert.equal(seriesNamesIn('a.json', '{"source":"Hot Money ep01","limit":"a film"}').length, 0);
  assert.equal(seriesNamesIn('a.json', '{"limit":"a Hot Money film"}').length, 1);
});

// ---- (b) a film imports nothing from another film (a film is a folder in films/, git-ignored: no films/ in CI, nothing to scan)
export function crossFilmImports(film, src) {
  const own = film.split('/')[0];
  return [...src.matchAll(/(?:from|import)\s*\(?\s*['"`]([^'"`]*\/films\/([^/'"`]+)\/[^'"`]*)['"`]/g)].filter(m => m[2] !== own).map(m => m[1]);
}
// Known debt, listed so it cannot grow: hm-bible-s5 (the season-5 bible demo) was built on ep01's shared r2 code. Fixing it means
// copying those files into the film, which is film work (films/ is never edited from a kit PR); delete this row when it is copied.
const ALLOWED = [['hm-bible-s5', 'hm-ep01']];
test('a film never imports from another film', { skip: !fs.existsSync(path.join(ROOT, 'films')) || !!process.env.CI }, () => {
  const films = path.join(ROOT, 'films'), bad = [];
  for (const f of walk(films).filter(f => /\.(js|mjs)$/.test(f) && !/\/(node_modules|renders)\//.test(f)))
    for (const imp of crossFilmImports(path.relative(films, f).split(path.sep).join('/'), fs.readFileSync(f, 'utf8')))
      if (!ALLOWED.some(([a, b]) => rel(f).startsWith(`films/${a}/`) && imp.includes(`/films/${b}/`))) bad.push(`${rel(f)} -> ${imp}`);
  assert.deepEqual(bad, []);
});
test('the cross-film rule sees another film and spares its own', () => {
  assert.deepEqual(crossFilmImports('a/reel.js', "import x from '/films/b/lib.js';"), ['/films/b/lib.js']);
  assert.deepEqual(crossFilmImports('a/reel.js', "import x from '/films/a/lib.js'; import y from '/styles/stick-man/engine/play.js';"), []);
  assert.deepEqual(crossFilmImports('a/r.js', "const m = await import('../films/c/x.js')"), ['../films/c/x.js']);
});

// ---- (c) bible/<series>/ JSON is data only
test('bible/<series>/ JSON holds no threshold keys', () => {
  const bad = walk(path.join(SM, 'bible')).filter(f => f.endsWith('.json') && !f.includes('/_template/'))
    .flatMap(f => thresholdKeys(JSON.parse(fs.readFileSync(f, 'utf8'))).map(k => `${rel(f)} ${k}`));
  assert.deepEqual(bad, []);
});
test('the threshold rule: limit, threshold, min/max keys fail; a token value range passes', () => {
  assert.deepEqual(thresholdKeys({ a: { limit: 3 }, b: [{ threshold: 1 }], c: { maxFaces: 2 }, d: { lumaMin: 1 } }).length, 4);
  assert.deepEqual(thresholdKeys({ min: 1 }), ['$.min']);
  assert.deepEqual(thresholdKeys({ tokens: [{ value: { min: 0.1, max: 0.4 } }] }), []);
  assert.deepEqual(thresholdKeys({ name: 'x', usage: 'minimal', kind: 'gate' }), []);
});

// ---- bible/_template: a new series' skeleton
const TPL = path.join(SM, 'bible/_template');
test('bible/_template: a README that names every section, and a skeleton that passes except for its placeholders', () => {
  const readme = fs.readFileSync(path.join(TPL, 'README.md'), 'utf8'), sk = JSON.parse(fs.readFileSync(path.join(TPL, 'series.template.json'), 'utf8'));
  for (const k of Object.keys(SECTIONS)) assert.ok(readme.includes('`' + k + '`'), `README names ${k}`);
  assert.deepEqual(validateSeries(sk), []);
  assert.ok(validateSeries(sk, { strict: true }).some(p => /<fill>/.test(p)), 'a new series is not done while <fill> is left');
  assert.equal(sk.facesApproved.hash, null, 'no face is approved in the skeleton');
});
test('validateSeries names a missing section, a wrong type and a threshold', () => {
  const p = validateSeries({ series: 's', characters: {}, facesApproved: {}, limits: {}, palette: { lumaMin: 1 } });
  assert.ok(p.some(x => /^characters: expected array/.test(x)) && p.some(x => /^sets: expected array, found undefined/.test(x)));
  assert.ok(p.some(x => /facesApproved: hash/.test(x)) && p.some(x => /palette\.lumaMin/.test(x)) && p.some(x => /\$\.limits/.test(x)));
});
test('the bible check never mistakes _template for a series', () => {
  assert.equal(fs.existsSync(path.join(TPL, 'catalog.json')), false);
});
