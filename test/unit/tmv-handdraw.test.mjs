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
import { phrases, phraseAt } from '../../tmv/episode/handdraw/lettering.js';

const TMV = join(ROOT, 'tmv'), read = p => JSON.parse(readFileSync(join(TMV, p), 'utf8'));
const sample = read('episodes/sample/episode.json'), vo = read('episodes/sample/vo/vo.json');

test('"style": "handdraw" finds its page instead of stopping with "not built yet"', () => {
  assert.equal(enginePage('handdraw', TMV), join(TMV, 'episode/handdraw/index.html'));
  const page = readFileSync(join(TMV, 'episode/handdraw/index.html'), 'utf8');
  for (const src of ['/styles/kai-hand-draw/engine/core.js', '/styles/kai-hand-draw/engine/kaip.js', '/episode/handdraw/handdraw.js', '/characters/cast.js'])
    assert.ok(page.includes(`src="${src}"`), `the page loads ${src}`);
  assert.doesNotMatch(page, /kai-v3/);
  for (const f of ['PermanentMarker-Regular.ttf', 'ShantellSans.ttf']) assert.ok(page.includes(`url(/styles/kai-hand-draw/engine/fonts/${f})`), `the page loads ${f}`);
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

// gates.py sees a cut only when the picture changes (ffmpeg scene > 0.2): the first hand-draw episode on CI lost 9 of
// its 43 cuts to two shots on the same side (a beat split in two, then the next beat) and to the corner's close-up
// against a medium shot of the same size
test('every cut between story shots changes the picture: the other side, and in the corner another size or place', () => {
  const W = {}; new Function('window', readFileSync(join(TMV, 'characters/cast.js'), 'utf8'))(W);
  const cards = cardsOf(sample, W.TMV_SEEDS), { SHOTS, lead } = timeline(sample, vo, cards), roster = rosterOf(cards, lead);
  const frame = (n, t) => frameOf(SHOTS[n], t, roster, sample.beats[SHOTS[n].i].exp, n);
  let corner = 0;
  for (let n = 1; n < SHOTS.length; n++) {
    const a = frame(n - 1, SHOTS[n - 1].b - 0.01), b = frame(n, SHOTS[n].a), where = `cut at ${SHOTS[n].a.toFixed(2)} s`;
    if (a.paper || b.paper) continue;
    assert.notEqual(a.side, b.side, `${where}: the picture changes side`);
    if (roster.corner.includes(SHOTS[n].who) && roster.corner.includes(SHOTS[n - 1].who)) {
      corner++;
      const [p, q] = [a.figs[0], b.figs[0]], bust = (g) => g.pose.startsWith('exp-');
      assert.ok(bust(p) !== bust(q) || Math.max(p.h, q.h) / Math.min(p.h, q.h) >= 1.3, `${where}: the rival changes size (${p.pose} ${p.h} -> ${q.pose} ${q.h})`);
    }
  }
  assert.ok(corner >= 3, 'the sample cuts inside the corner');
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

test('captions: short phrases on the word times, words of one line only, gone after a cut once spoken', () => {
  const P = phrases(vo.words);
  assert.deepEqual(new Set(P.flatMap(p => p.words)).size, vo.words.length, 'every word is in one phrase');
  for (const p of P) {
    assert.ok(p.words.length <= 3 && (p.words.length === 1 || p.words.map(w => w.w).join(' ').length <= 18), p.words.map(w => w.w).join(' '));
    assert.equal(new Set(p.words.map(w => w.line)).size, 1);
    assert.ok(p.a < p.words[0].s && p.b > p.a);
  }
  const mid = P[5], w = mid.words[0];
  assert.equal(phraseAt(P, w.s + 0.01), mid);
  assert.equal(phraseAt(P, w.s + 0.01, mid.words.at(-1).e + 0.01), undefined, 'a phrase spoken before the cut stays in its shot');
  assert.equal(phraseAt(P, vo.words.at(-1).e + 1), undefined);
});

test('the set behind the story shots is the episode\'s own: its palette and the rival\'s sign, the corner for the corner', async () => {
  const { settingOf, viewOf } = await import('../../tmv/episode/handdraw/set.js');
  assert.deepEqual(settingOf(sample).corner.sign, 'SPEED WINS');
  const buyer = settingOf({ palette: { neon: '#3FD07A', left: '#E8AA38', right: '#C77DFF' }, texts: { sign: 'Big budget' } });
  assert.deepEqual(buyer, { room: { neon: '#3FD07A', lights: '#E8AA38', poster: '#C77DFF', notes: '#EFE9DE' },
    corner: { sign: 'BIG BUDGET', glow: '#C77DFF' } });
  assert.deepEqual(settingOf({}).room, { neon: '#FF3D8B', lights: '#FF3D8B', poster: '#29E0FF', notes: '#EFE9DE' }, 'main.js fallbacks');
  assert.notDeepEqual(viewOf('close', 1, false), viewOf('close', -1, false), 'cutting between close-ups changes the background');
  for (const shot of ['room', 'wide', 'two', 'phone', 'close']) for (const side of [1, -1]) for (const corner of [false, true]) {
    const v = viewOf(shot, side, corner), hw = 540 / v.k, hh = 960 / v.k;
    assert.ok(v.x - hw * 1.1 > -200 && v.x + hw * 1.1 < 1280 && v.y - hh * 1.1 > -200 && v.y + hh * 1.1 < 2200, `${shot} ${side} ${corner}: the set covers the frame`);
  }
});
