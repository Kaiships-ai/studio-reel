// The hand-draw episode engine (tmv/episode/handdraw/): its page is registered and built, it draws with the two
// kai-hand-draw files the tmv zip keeps, and every story shot of the sample shows its speaker with a moving mouth.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from '../../kit/env.mjs';
import { enginePage } from '../../tmv/episode/engines.mjs';
import { timeline, cardsOf } from '../../tmv/episode/timeline.js';
import { rosterOf, frameOf } from '../../tmv/episode/handdraw/framing.js';

const TMV = join(ROOT, 'tmv'), read = p => JSON.parse(readFileSync(join(TMV, p), 'utf8'));
const sample = read('episodes/sample/episode.json'), vo = read('episodes/sample/vo/vo.json');

test('"style": "handdraw" finds its page instead of stopping with "not built yet"', () => {
  assert.equal(enginePage('handdraw', TMV), join(TMV, 'episode/handdraw/index.html'));
  const page = readFileSync(join(TMV, 'episode/handdraw/index.html'), 'utf8');
  for (const src of ['/styles/kai-hand-draw/engine/core.js', '/styles/kai-hand-draw/engine/kaip.js', '/episode/handdraw/handdraw.js', '/characters/cast.js'])
    assert.ok(page.includes(`src="${src}"`), `the page loads ${src}`);
  assert.doesNotMatch(page, /kai-v3/);
});

test('every story shot of the sample frames its speaker (the lead on the phone), talking while their words play', () => {
  const W = {}; new Function('window', readFileSync(join(TMV, 'characters/cast.js'), 'utf8'))(W);
  const cards = cardsOf(sample, W.TMV_SEEDS), { SHOTS, lead, LINES } = timeline(sample, vo, cards), roster = rosterOf(cards, lead);
  assert.deepEqual(roster, { lead: 'nova', room: ['nova', 'blip'], corner: ['theo'] });
  for (const sh of SHOTS) {
    const word = vo.words.find(w => w.line === LINES[sh.i].id && w.s >= sh.a && w.s < sh.b), t = word ? word.s + 0.01 : sh.a;
    const f = frameOf(sh, t, roster, sample.beats[sh.i].exp), where = `${sh.shot} of ${sh.who} at ${t.toFixed(2)} s`;
    if (['card', 'stats', 'previously'].includes(sh.shot)) { assert.equal(f.figs.length, 0, where); continue; }
    const star = sh.shot === 'phone' ? lead : sh.who, fig = f.figs.find(g => g.id === star);
    assert.ok(fig, `${where} shows ${star}`);
    assert.equal(fig.talk, star === sh.who, where);
    if (sh.shot === 'close') assert.match(fig.pose, /^exp-/, where);
    if (roster.corner.includes(sh.who)) assert.deepEqual(f.figs.map(g => g.id), [sh.who], `${where}: the corner holds only the rival`);
    if (sh.shot === 'two' && !roster.corner.includes(sh.who)) assert.equal(f.figs.length, 2, where);
  }
});

test('a buyer cast without a bot, with a lone lead or with a crowded room still frames every speaker', () => {
  const card = (kind, o = {}) => ({ name: 'x', kind, ...o });
  const shot = (who, shot) => ({ who, shot, i: 0, j: 0, a: 0, b: 2 });
  const pairs = rosterOf({ ann: card('human'), bo: card('human') }, 'ann');
  assert.deepEqual(frameOf(shot('ann', 'two'), 1, pairs).figs.map(g => g.id), ['ann', 'bo']);
  assert.deepEqual(frameOf(shot('bo', 'two'), 1, pairs).figs.map(g => g.id), ['bo', 'ann']);
  const alone = rosterOf({ ann: card('human') }, 'ann');
  assert.deepEqual(frameOf(shot('ann', 'two'), 1, alone).figs.map(g => g.id), ['ann']);
  const crowd = rosterOf({ ann: card('human'), bo: card('human'), cy: card('bot'), di: card('human'), ed: card('human', { role: 'rival' }) }, 'ann');
  assert.deepEqual(crowd, { lead: 'ann', room: ['ann', 'cy', 'bo', 'di'], corner: ['ed'] });
  const room = frameOf(shot('di', 'room'), 1, crowd).figs;
  assert.deepEqual(room.map(g => [g.id, g.talk]), [['ann', false], ['cy', false], ['bo', false], ['di', true]]);
  assert.equal(new Set(room.map(g => g.x)).size, 4, 'nobody stands on anybody');
});
