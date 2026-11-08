// tmv/episode/paper/framing.js: where the paper episode stands each figure, and when it pops up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { framingFor, popAt, CAPTION_Y, BOT_SCALE, PUSH } from '../../tmv/episode/paper/framing.js';
import { toPaper, CARD } from '../../core/character-card.mjs';
import { layout, SOLE_Y } from '../../core/paper-figure.js';

const lead = (build, kind = 'human') => ({ name: 'You', role: 'lead', kind, build, hair: 'curly', extra: 'cap' });
const castOf = (you, mate) => ({ you, ...(mate && { mate }) });
const shot = (shot, who, j = 0) => ({ shot, who, i: 2, j, a: 10, b: 12.6 });

// the lowest a face reaches on the 1080x1920 frame: its chin at the end of the shot's slow push
function chinY(cards, p) {
  const { headY, R } = layout(toPaper(cards[p.id]).figure.body);
  return p.sole - (SOLE_Y - (headY + R)) * p.k * PUSH * (cards[p.id].kind === 'bot' ? BOT_SCALE : 1);
}

test('every build keeps its face above the captions in every story shot', () => {
  for (const build of CARD.build) for (const kind of ['human', 'bot']) {
    const cards = castOf(lead(build), { name: 'Mate', role: 'mascot', kind, build });
    const FRAMING = framingFor(cards, 'you');
    for (const [name, who] of [['close', 'you'], ['phone', 'mate'], ['two', 'you'], ['two', 'mate'], ['wide', 'you'], ['close', 'mate']]) {
      for (const p of FRAMING[name](shot(name, who))) {
        const y = chinY(cards, p);
        assert.ok(y < CAPTION_Y - 50, `${build} ${cards[p.id].kind} in a ${name} shot: chin at y ${Math.round(y)}, captions at ${CAPTION_Y}`);
      }
    }
  }
});

test('a figure pops up when it arrives, and stays up across a cut that keeps it on screen', () => {
  const sh = shot('close', 'you', 1), p = { id: 'you', delay: 0 };
  assert.ok(popAt(sh.a, sh, p, false) < 0.5);
  assert.equal(popAt(sh.a + 1, sh, p, false), 1);
  assert.equal(popAt(sh.a, sh, p, true), 1);
});
