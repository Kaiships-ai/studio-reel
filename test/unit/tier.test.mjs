// The two unit tiers: which heavy file a change runs, the fast tier's time budget, and the tracer that writes the guards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { FAST, GUARDS, budget, covers, guardOf, guardsOf, pack, select, tierOf, tiers, uncovered } from '../tier.mjs';

const tracked = { files: new Set(['kit.manifest', 'kit/env.mjs', 'styles/stick-man/kit/compat.json', 'test/unit/a.test.mjs']), dirs: new Set(['.', 'kit', 'styles', 'styles/stick-man', 'styles/stick-man/kit', 'test', 'test/unit']) };
const R = '/repo';

test('a file is heavy only by its own `// tier: heavy` line, near the top', () => {
  assert.equal(tierOf('// tier: heavy\nimport test from "node:test";'), 'heavy');
  assert.equal(tierOf('// what it checks\n// tier: heavy\n'), 'heavy');
  assert.equal(tierOf('import x;\n\n\n\n\n\n// tier: heavy'), 'fast', 'a marker deep in the file does not count');
  assert.equal(tierOf('// tier: heavyish'), 'fast');
});

test('the tiers split test/unit exactly, and test/heavy.json has one entry for each heavy file and no other', () => {
  const { fast, heavy } = tiers(ROOT);
  assert.ok(fast.length > 0 && heavy.length > 0);
  assert.equal(fast.filter(f => heavy.includes(f)).length, 0);
  const all = execFileSync('git', ['ls-files', '--others', '--cached', '--exclude-standard', 'test/unit/*.test.mjs'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean).sort();
  assert.deepEqual([...fast, ...heavy].sort(), all);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(join(ROOT, GUARDS), 'utf8'))).sort(), heavy, `run \`node test/tier.mjs guards\` for a new heavy file`);
});

test('a read guards its folder; tests and root files guard themselves; node_modules, .pixi and untracked paths guard nothing', () => {
  assert.equal(guardOf(`r ${R}/styles/stick-man/kit/compat.json`, R, tracked), 'styles/stick-man/kit');
  assert.equal(guardOf(`r ${R}/test/unit/a.test.mjs`, R, tracked), 'test/unit/a.test.mjs');
  assert.equal(guardOf(`r ${R}/kit.manifest`, R, tracked), 'kit.manifest');
  assert.equal(guardOf(`l ${R}/styles/stick-man/kit`, R, tracked), 'styles/stick-man/kit', 'a listed folder: a file added to it runs the test');
  assert.equal(guardOf(`r ${R}/styles/stick-man/kit/new.json`, R, tracked), 'styles/stick-man/kit', 'a probe for a missing file guards its folder');
  assert.equal(guardOf(`r ${R}/node_modules/three/build/three.module.js`, R, tracked), null, 'package-lock.json runs every heavy file');
  assert.equal(guardOf(`r ${R}/films/x/out.json`, R, tracked), null);
  assert.equal(guardOf('r /tmp/x.json', R, tracked), null);
  assert.equal(guardOf(`r ${R}/styles`, R, tracked), null, 'a stat of a tracked folder is not a read of it');
  assert.equal(guardOf('o python x.py', R, tracked), 'always');
  assert.deepEqual(guardsOf([`r ${R}/kit/env.mjs`, `l ${R}/kit`, `r ${R}/styles/stick-man/kit/compat.json`], R, tracked), ['kit', 'styles/stick-man/kit']);
  assert.equal(guardsOf([`r ${R}/kit/env.mjs`, 'o ffmpeg -i x'], R, tracked), 'always');
  assert.ok(covers('kit', 'kit/cast/hair.js') && !covers('kit', 'kitchen/x') && covers('.', 'anything'));
});

test('a heavy file runs when the change touches its guards, the tier machinery or no base is known; docs alone run none', () => {
  const heavy = ['test/unit/fits.test.mjs', 'test/unit/sound.test.mjs', 'test/unit/new.test.mjs', 'test/unit/py.test.mjs'];
  const guards = { 'test/unit/fits.test.mjs': { guards: ['styles/stick-man/kit', 'test/unit/fits.test.mjs'] }, 'test/unit/sound.test.mjs': { guards: ['core/sfx'] }, 'test/unit/py.test.mjs': { guards: 'always' } };
  const run = changed => select({ heavy, guards, changed }).map(p => p.file);
  assert.deepEqual(run(['styles/stick-man/kit/compat.json']), ['test/unit/fits.test.mjs', 'test/unit/new.test.mjs', 'test/unit/py.test.mjs']);
  assert.deepEqual(run(['styles/stick-man/kit/clips/new.glb']), ['test/unit/fits.test.mjs', 'test/unit/new.test.mjs', 'test/unit/py.test.mjs'], 'a clip added to a guarded folder');
  assert.deepEqual(run(['docs/x.md']), ['test/unit/new.test.mjs', 'test/unit/py.test.mjs'], 'docs only: just the file with no guards yet and the opaque one');
  assert.deepEqual(run(['test/tier.mjs']), heavy);
  assert.deepEqual(run(['package-lock.json']), heavy);
  assert.deepEqual(run(null), heavy);
  assert.match(select({ heavy, guards, changed: ['styles/stick-man/kit/compat.json'] })[0].why, /compat\.json changed/);
});

test('legs: longest first onto the lightest, every file once, the same on every machine', () => {
  const secs = { a: 280, b: 150, c: 78, d: 76, e: 75, f: 10 }, legs = pack(['f', 'e', 'd', 'c', 'b', 'a', 'g'], secs, 3);
  assert.deepEqual(legs, [['a'], ['b', 'e'], ['c', 'd', 'g', 'f']]);
  assert.deepEqual(pack(['a', 'b'], secs, 4), [['a'], ['b'], [], []]);
});

test('the fast budget fails a file over its seconds or a tier over its wall time, and names them', () => {
  const rs = [{ file: 'test/unit/slow.test.mjs', secs: FAST.fileSecs + 0.1 }, { file: 'test/unit/ok.test.mjs', secs: 1 }];
  const out = budget(rs, FAST, 30, 'fast');
  assert.equal(out.length, 1);
  assert.match(out[0], /test\/unit\/slow\.test\.mjs took 15\.1 s.*tier: heavy/);
  assert.deepEqual(budget([rs[1]], FAST, FAST.wallSecs - 1, 'fast'), []);
  assert.match(budget([rs[1]], FAST, FAST.wallSecs + 1, 'fast')[0], /121 s of wall time/);
});

test('a traced read outside the committed guards is reported; an opaque read needs "always"', () => {
  assert.deepEqual(uncovered(['kit', 'styles/stick-man/kit'], ['kit']), ['styles/stick-man/kit']);
  assert.deepEqual(uncovered(['styles/stick-man/kit/cast'], ['styles/stick-man']), []);
  assert.deepEqual(uncovered('always', ['kit']), ['always']);
  assert.deepEqual(uncovered('always', 'always'), []);
});

test('the tracer sees named and promise fs reads, a listing, a missing probe, a computed import, a node child and other programs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'trace-')), out = join(dir, 't.txt'), fx = join(dir, 'fx.mjs');
  try {
    writeFileSync(fx, `import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawnSync, execFileSync } from 'node:child_process';
import { join } from 'node:path';
const R = ${JSON.stringify(ROOT)};
readFileSync(join(R, 'kit.manifest')); readdirSync(join(R, 'kit')); existsSync(join(R, 'kit/nope.json'));
await readFile(join(R, 'pixi.toml'));
const m = 'env.mjs'; await import(join(R, 'kit', m));
spawnSync(process.execPath, ['-e', 'require("fs").readFileSync(' + JSON.stringify(join(R, 'package.json')) + ')']);
execFileSync('git', ['--version']);
`);
    execFileSync(process.execPath, [fx], { env: { ...process.env, TIER_TRACE: out, NODE_OPTIONS: `--import=${join(ROOT, 'test', 'trace.mjs')}` } });
    const lines = new Set(readFileSync(out, 'utf8').split('\n').map(l => l.replace(ROOT, '.')));
    for (const l of ['r ./kit.manifest', 'l ./kit', 'r ./kit/nope.json', 'r ./pixi.toml', 'r ./kit/env.mjs', 'r ./package.json', 'o git --version'])
      assert.ok(lines.has(l), `the trace has "${l}"`);
    rmSync(out);
    execFileSync(process.execPath, [fx], { env: { ...process.env, TIER_TRACE: '', NODE_OPTIONS: `--import=${join(ROOT, 'test', 'trace.mjs')}` } });
    assert.throws(() => readFileSync(out), /ENOENT/, 'without TIER_TRACE the tracer writes nothing');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
