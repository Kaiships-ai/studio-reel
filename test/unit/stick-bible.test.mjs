// The Hot Money bible (styles/stick-man/bible): one closed list of approved parts and their numbers. The validator must pass
// on the real files and fail on a broken entry, so the list can never point at a part the kit no longer has.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from '../../kit/env.mjs';
import { loadBible, validate, render } from '../../styles/stick-man/bible/catalog.mjs';

const DIR = path.join(ROOT, 'styles/stick-man/bible/hot-money');
const CLI = path.join(ROOT, 'styles/stick-man/bible/catalog.mjs');
const run = (...a) => spawnSync(process.execPath, [CLI, '--check', ...a], { encoding: 'utf8', timeout: 120000 });

function broken(edit) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'bible-'));
  const b = loadBible(DIR); edit(b);
  fs.writeFileSync(path.join(d, 'tokens.json'), JSON.stringify(b.tokens));
  fs.writeFileSync(path.join(d, 'catalog.json'), JSON.stringify(b.catalog));
  return d;
}

test('the real bible validates against the kit as it is now', () => {
  const r = run();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /components \d+: motion-clip 37/);
});

test('a duplicate id fails', () => {
  const r = run('--dir', broken(b => b.catalog.components.push({ ...b.catalog.components[0] })));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /clip\.Move_Run_Fwd_Loop: duplicate id/);
});

test('a dangling alias fails', () => {
  const r = run('--dir', broken(b => { b.tokens.tokens.find(t => t.name === 'caption.size').value = '{size.px.75}'; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /caption\.size: dangling alias \{size\.px\.75\}/);
});

test('a missing kit path fails', () => {
  const r = run('--dir', broken(b => { b.catalog.components.find(c => c.id === 'prop.object').kit[0].path = 'styles/stick-man/engine/gone.js'; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /prop\.object: missing kit path styles\/stick-man\/engine\/gone\.js/);
});

test('a kit clip with no catalog entry fails: the set stays closed', () => {
  const r = run('--dir', broken(b => { b.catalog.components = b.catalog.components.filter(c => c.id !== 'clip.Act_Jump_Once'); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /kit motion-clip "Act_Jump_Once" .* has no catalog entry/);
});

test('a token that drifts from the kit value fails', () => {
  const r = run('--dir', broken(b => { b.tokens.tokens.find(t => t.name === 'count.3').value = 4; }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /count\.3: value 4 differs from the kit's 3/);
});

test('CATALOG.md is the current render of the two files', async () => {
  const b = loadBible(DIR);
  const r = await validate(b, { films: null, taste: null });
  assert.equal(fs.readFileSync(path.join(DIR, 'CATALOG.md'), 'utf8'), render(b, r), 'run node styles/stick-man/bible/catalog.mjs');
});

test('a kit part that provides a name its module does not define fails', () => {
  const r = run('--dir', broken(b => { b.catalog.components.find(c => c.id === 'fx.phys').provides.make.push('nosuchfx'); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /fx\.phys: styles\/stick-man\/kit\/fx\/physfx\.js does not define nosuchfx/);
});

test('a hand pose two clips claim to replace fails: the checker names one clip to use instead', () => {
  const r = run('--dir', broken(b => { b.catalog.components.find(c => c.id === 'clip.Act_PickUp_Once').covers.poses.push('SIT_LOW'); }));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /clip\.Act_PickUp_Once: covers poses "SIT_LOW", which clip\.Idle_Sit_Loop covers already/);
});

test('an empty films/ root leaves film-local parts unchecked instead of failing', async () => {
  const films = fs.mkdtempSync(path.join(os.tmpdir(), 'films-'));
  const r = await validate(loadBible(DIR), { films, taste: null });
  assert.deepEqual(r.errors, []);
  assert.ok(r.stats.unchecked > 0);
});
