// The TMV script checker (tmv/episode/script.mjs): episode.json's shape against episode.schema.json, and the real season's script rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
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

test('the shipped sample still breaks link, source and you: the 80-90 s rewrite (plan item 7) makes this empty', () => {
  assert.deepEqual([...new Set(checkScript(sample, { lead }).map(f => f.rule))], ['link', 'source', 'you']);
});
