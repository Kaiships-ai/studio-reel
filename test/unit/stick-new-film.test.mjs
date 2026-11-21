import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadReel } from '../../styles/stick-man/tools/reel_load.mjs';
import { hold, polishAt, STAND, BREATH } from '../../styles/stick-man/lib/acting/keys.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

test('new_film.mjs writes a film whose reel.js loads with the shared acting keys', async () => {
  const films = path.join(ROOT, 'films'), hadFilms = fs.existsSync(films);
  const slug = `new-film-test-${process.pid}`, dir = path.join(films, slug);
  try {
    execFileSync(process.execPath, [path.join(ROOT, 'styles/stick-man/tools/new_film.mjs'), slug], { stdio: 'pipe' });
    for (const f of ['reel.js', 'storyboard.json', 'DECISIONS.json', 'vo/script.json']) assert.ok(fs.existsSync(path.join(dir, f)), f);
    const reel = await loadReel(dir, 'reel.js');
    assert.equal(reel.title, slug);
    assert.match(fs.readFileSync(path.join(dir, 'reel.js'), 'utf8'), /from '\/styles\/stick-man\/lib\/acting\/keys\.js'/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
    if (!hadFilms) fs.rmSync(films, { recursive: true, force: true });
  }
});

test('polish keeps a key on a cut a snap, holds the rest until T frames before the next key, and drops its own fields', () => {
  const polish = polishAt([0, 60]);
  const keys = polish([hold(0), hold(20, { stroke: 1, antic: 3 }), hold(40, { flow: 1 }), hold(60)]);
  assert.deepEqual(keys.map(k => k.ease), ['snap', 'slow', 'flow', 'snap']);
  assert.deepEqual(keys.map(k => k.hold), [13, 16, undefined, undefined], 'hold = gap - T (7, a stroke key 4); none before a cut');
  assert.equal(keys[1].antic, 3);
  assert.ok(!('stroke' in keys[1]));
  assert.equal(keys[0].pose, STAND);
  assert.equal(keys[0].cycle, BREATH);
});
