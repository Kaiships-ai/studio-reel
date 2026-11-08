// The TMV script checker (tmv/episode/script.mjs): episode.json's shape against episode.schema.json, and the real season's script rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ROOT, run } from '../../kit/env.mjs';
import { shapeErrors, checkScript, RULES } from '../../tmv/episode/script.mjs';

const read = p => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const sample = read('tmv/episodes/sample/episode.json'), good = read('test/fixtures/tmv-script/good/episode.json'), bad = read('test/fixtures/tmv-script/bad/episode.json');
const lead = ['nova', 'Nova'];

test('the shipped sample and both fixtures have the shape episode.schema.json describes', () => {
  for (const e of [sample, good, bad]) assert.deepEqual(shapeErrors(e), []);
});

test('a broken episode.json gets one line per problem, naming the field', () => {
  const e = structuredClone(sample);
  e.title = ' '; e.palette.neon = 'red'; e.beats[0].shot = 'wid'; e.beats[2].shoot = 'close'; e.beats[1].stats[0].bar = 3; delete e.vote.b;
  assert.deepEqual(shapeErrors(e), [
    '"title" must be a text (the episode title over the first shot)',
    '"palette" "neon": "red" is not a colour like "#FF3D8B"',
    'beat 1 "shot": "wid" is not one of room, close, two, wide, phone, card, stats, previously',
    'beat 2 stat 1 "bar": 3 is out of range (a meter from 0 to 1)',
    'beat 3: "shoot" is unknown (who, line, link, shot, exp, idea, hot, card, head, stats, source, hud)',
    '"vote" has no "b" (the vote, the last frame)',
  ]);
});

test('a script written to the rules passes every rule', () => {
  assert.deepEqual(checkScript(good, { lead }), []);
});

test('the bad fixture breaks every rule, each on its own beat', () => {
  const got = checkScript(bad, { lead }).map(f => `${f.rule} ${f.beat}`);
  assert.deepEqual(got, ['short 1', 'link 3', 'source 2', 'vote 4', 'vote 4', 'you 1', 'you null']);
  assert.deepEqual([...new Set(checkScript(bad, { lead }).map(f => f.rule))], RULES.map(r => r.id));
});

test('the shipped sample passes every script rule', () => {
  assert.deepEqual(checkScript(sample, { lead }), []);
});

const baker = (lead, line1) => ({
  cast: [{ id: lead.id, name: lead.name, kind: 'human', build: 'round' }],
  beats: [
    { who: lead.id, shot: 'room', line: line1 },
    { who: lead.id, shot: 'close', link: 'but', line: 'But the oven dies at four.' },
    { who: lead.id, shot: 'close', line: 'So you have one hour. Comment A to wait, or B to borrow one.' },
  ],
  vote: { question: 'What do you do?', a: 'wait', b: 'borrow one', tagA: 'A', tagB: 'B' },
});
const leadOf = e => [e.cast[0].id, e.cast[0].name];

test('a lead card named "You" (as /story writes it) is the second person, not a name the narrator says', () => {
  const e = baker({ id: 'you', name: 'You' }, 'You bake two hundred loaves by six.');
  assert.deepEqual(checkScript(e, { lead: leadOf(e) }), []);
});

test('a lead with a name the narrator says in the third person still fails the you rule', () => {
  const e = baker({ id: 'nova', name: 'Nova' }, 'Nova bakes two hundred loaves by six.');
  assert.deepEqual(checkScript(e, { lead: leadOf(e) }).map(f => `${f.rule} ${f.beat}`), ['you 1']);
});

test('the ep2 that series.mjs next writes passes the script rules once its story beats are filled', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tmv-next-')), from = join(dir, 'night-oven'), show = join(dir, 'show');
  try {
    mkdirSync(from);
    writeFileSync(join(from, 'episode.json'), JSON.stringify({ series: 'Night Oven', ep: 1, title: 'Sold out by six', ...baker({ id: 'you', name: 'You' }, 'You bake two hundred loaves by six.') }));
    writeFileSync(join(from, 'index.html'), ''); writeFileSync(join(from, 'night-oven.mp4'), '');
    for (const args of [['new', show, '--from', from], ['next', show, '--winner', 'B']]) {
      const r = run('node', [join(ROOT, 'tmv/episode/series.mjs'), ...args], { capture: true });
      assert.equal(r.status, 0, r.stderr);
    }
    const e = JSON.parse(readFileSync(join(show, 'ep2/episode.json'), 'utf8')), s = JSON.parse(readFileSync(join(show, 'series.json'), 'utf8'));
    e.title = 'The borrowed oven';
    e.beats[1].line = 'The cafe next door lends you its oven.';
    e.beats.push({ who: 'you', shot: 'close', link: 'but', line: 'But its door sticks at five.' },
      { who: 'you', shot: 'close', line: 'So do you kick it? Comment A to kick, or B to call Mara.' });
    e.vote = { question: 'Do you kick the door?', a: 'kick it', b: 'call Mara', tagA: 'A', tagB: 'B' };
    assert.deepEqual(shapeErrors({ ...e, series: s.series, cast: s.cast }), []);
    assert.deepEqual(checkScript(e, { lead: leadOf(s) }), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
