// The bible's docs page is generated from tokens.json + catalog.json: one row per token and one card per part, so the page
// cannot drift from the source the kit and the checker read. Runs without media, films or ffmpeg (CI has none).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { loadBible } from '../../styles/stick-man/bible/catalog.mjs';
import { buildModel, render, coverage } from '../../styles/stick-man/bible/page.mjs';

const DIR = path.join(ROOT, 'styles/stick-man/bible/hot-money');
const bible = loadBible(DIR);
const M = await buildModel({ dir: DIR, taste: path.join(ROOT, 'no-taste-here'), films: path.join(ROOT, 'no-films-here') });
const html = render(M);

test('one row per token and one card per part, nothing extra', () => {
  const c = coverage(html, bible);
  assert.deepEqual(c, { tokens: { missing: [], twice: [], extra: [] }, components: { missing: [], twice: [], extra: [] } });
  assert.equal(html.match(/<tr data-token="/g).length, bible.tokens.tokens.length);
  assert.equal(html.match(/<article class="card" data-id="/g).length, bible.catalog.components.length);
});

test('a part in the catalog that the page lacks is reported', () => {
  const id = bible.catalog.components[5].id;
  const dropped = html.replace(new RegExp(`<article class="card" data-id="${id.replace(/\./g, '\\.')}"[\\s\\S]*?</article>`), '');
  assert.deepEqual(coverage(dropped, bible).components.missing, [id]);
  const added = { ...bible, catalog: { components: [...bible.catalog.components, { ...bible.catalog.components[0], id: 'clip.Not_On_Page' }] } };
  assert.deepEqual(coverage(html, added).components.missing, ['clip.Not_On_Page']);
});

test('a token the page lacks is reported', () => {
  const dropped = html.replace(/<tr data-token="caption\.size"[\s\S]*?<\/tr>/, '');
  assert.deepEqual(coverage(dropped, bible).tokens.missing, ['caption.size']);
});

test('every face card shows the face the kit draws', () => {
  const faces = bible.catalog.components.filter(c => c.kind === 'face' && c.kit[0].export === 'EXPR');
  assert.ok(faces.length > 20);
  for (const c of faces) assert.match(M.faces[c.kit[0].key] || '', /<svg[\s\S]*<path d="M/, `${c.id} has no drawn face`);
});

test('missing media shows an empty state, never a borrowed picture', () => {
  assert.match(html, /chưa có clip/);
  assert.match(html, /Chưa có cặp clip gold/);
  assert.doesNotMatch(html, /<video/);
});
