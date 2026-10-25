// films/<slug>/job.json, the file Lead Studio draws a /make-reel run from: one fake run, the literal file after each step.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { step, STAGES } from '../../core/job.mjs';

const JOB = fileURLToPath(new URL('../../core/job.mjs', import.meta.url));
const library = () => {
  const root = mkdtempSync(join(tmpdir(), 'job-')), film = join(root, 'films/git-r12');
  mkdirSync(film, { recursive: true });
  mkdirSync(join(root, 'workspace/scripts'), { recursive: true });
  return { root, film, read: () => JSON.parse(readFileSync(join(film, 'job.json'), 'utf8')) };
};
const steps = (over = {}) => STAGES.map(name => ({ name, status: 'pending', ...over[name] }));

test('a run writes the literal job.json after every step, a failed step and a rerun included', () => {
  const { root, film, read } = library();
  writeFileSync(join(root, 'workspace/scripts/git-r12.md'), '---\nslug: git-r12\ncampaign: git-r12   # the key\nstatus: humanized\n---\n## Script\nHi.\n');
  const base = { slug: 'git-r12', campaign: 'git-r12' };

  step(film, 'script', 'running', { style: 'kai-hand-draw', type: 'listicle' });
  assert.deepEqual(read(), { ...base, steps: steps({ script: { status: 'running' } }), outputs: [], style: 'kai-hand-draw', type: 'listicle' });

  step(film, 'script', 'done', { files: [join(film, 'vo/script.json')] });
  const script = { status: 'done', files: ['vo/script.json'] };
  assert.deepEqual(read(), { ...base, steps: steps({ script }), outputs: [], style: 'kai-hand-draw', type: 'listicle' });

  step(film, 'voice', 'running');
  step(film, 'voice', 'failed');
  assert.deepEqual(read().steps, steps({ script, voice: { status: 'failed' } }));

  step(film, 'voice', 'done', { files: ['vo/vo.json'] });
  step(film, 'storyboard', 'waiting', { files: ['STORYBOARD.md'] });
  assert.deepEqual(read().steps.slice(0, 3), [
    { name: 'script', ...script },
    { name: 'voice', status: 'done', files: ['vo/vo.json'] },
    { name: 'storyboard', status: 'waiting', files: ['STORYBOARD.md'] },
  ]);

  step(film, 'render', 'running', { pct: 60 });
  assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'running', pct: 60 });
  assert.deepEqual(read().outputs, []);

  step(film, 'render', 'done', { files: ['git-r12.mp4', 'git-r12-cover.png'] });
  step(film, 'verify', 'done', { files: ['out/check/verify.json'], qa: '9/9' });
  step(film, 'deliver', 'done', { files: ['CAPTION.md'] });
  const job = read();
  assert.deepEqual(job.steps.find(s => s.name === 'render'), { name: 'render', status: 'done', files: ['git-r12.mp4', 'git-r12-cover.png'] });
  assert.deepEqual(job.outputs, ['git-r12.mp4', 'git-r12-cover.png', 'CAPTION.md']);
  assert.equal(job.qa, '9/9');
  assert.deepEqual(readdirSync(film), ['job.json']);   // no temp file left behind
});

test('no script file: campaign is null; a style demo outside films/ gets no job.json', () => {
  const { root, film, read } = library();
  step(film, 'script', 'running');
  assert.equal(read().campaign, null);
  const demo = join(root, 'styles/kai-hand-draw/demo');
  mkdirSync(demo, { recursive: true });
  assert.equal(step(demo, 'render', 'running'), null);
  assert.ok(!existsSync(join(demo, 'job.json')));
});

test('a bad step, status or field is refused', () => {
  const { film } = library();
  assert.throws(() => step(film, 'publish', 'done'), /unknown step "publish"/);
  assert.throws(() => step(film, 'render', 'stuck'), /unknown status "stuck"/);
  assert.throws(() => step(film, 'render', 'done', { slug: 'x' }), /unknown field slug/);
});

// a tool process that marked a step running and then dies with an error, Ctrl-C or kill leaves it failed
for (const [how, exit] of [['process.exit(1)', 1], ["process.kill(process.pid, 'SIGTERM'); setTimeout(() => {}, 5000)", 143]]) {
  test(`a step running when the process ends with ${how.split(';')[0]} is marked failed`, () => {
    const { film, read } = library();
    const code = `import { step } from ${JSON.stringify(JOB)}; step(${JSON.stringify(film)}, 'render', 'running', { pct: 10 }); ${how};`;
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', code]);
    assert.equal(r.status, exit);
    assert.deepEqual(read().steps.find(s => s.name === 'render'), { name: 'render', status: 'failed' });
  });
}

test('the CLI writes a step for the agent', () => {
  const { film, read } = library();
  const r = spawnSync(process.execPath, [JOB, film, 'storyboard', 'done', '--files=STORYBOARD.md,TREATMENT.md', '--type=why']);
  assert.equal(r.status, 0, r.stderr.toString());
  assert.deepEqual(read().steps.find(s => s.name === 'storyboard'), { name: 'storyboard', status: 'done', files: ['STORYBOARD.md', 'TREATMENT.md'] });
  assert.equal(read().type, 'why');
  assert.equal(spawnSync(process.execPath, [JOB, film, 'render', 'stuck']).status, 2);
});
