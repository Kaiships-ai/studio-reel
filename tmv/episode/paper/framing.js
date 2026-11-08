// paper/framing.js: who stands where in each story shot of the paper episode, and how far each figure has popped up.
// Pure numbers on the 1080x1920 frame, so test/unit/tmv-paper-framing.test.mjs checks every build against the captions.
import { inCorner } from '../timeline.js';

export const W = 1080, CAPTION_Y = 1590, BOT_SCALE = 0.82, PUSH = 1.04;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const lerp = (x, y, k) => x + (y - x) * k;
const backOut = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

// FRAMING[shot](sh) → [{ id, x, sole (feet y), k (figure scale), delay (pop order) }]
export function framingFor(cards, lead) {
  const room = Object.keys(cards).filter(id => !inCorner(cards[id]));
  const isBot = (id) => cards[id].kind === 'bot';
  const side = (sh) => ((sh.i + sh.j) % 2 ? -1 : 1);
  const partnerOf = (who) => who === lead ? room.find(id => id !== lead && isBot(id)) ?? room.find(id => id !== lead) : lead;
  const close = (sh, who = sh.who) => [{ id: who, x: W / 2 + 70 * side(sh), sole: 2160, k: 2.3, delay: 0 }];
  const medium = (sh) => [{ id: sh.who, x: W / 2 + 90 * side(sh), sole: 1900, k: 1.45, delay: 0 }];
  const wide = (sh) => inCorner(cards[sh.who]) ? medium(sh)
    : room.map((id, n) => ({ id, x: W * (n + 1) / (room.length + 1), sole: 1560 + 40 * (n % 2), k: 0.95, delay: 0.07 * n }));
  function two(sh) {
    const other = !inCorner(cards[sh.who]) && partnerOf(sh.who);
    if (!other) return medium(sh);
    const s = side(sh);
    return [{ id: other, x: W / 2 - 250 * s, sole: 1760, k: 1.2, delay: 0 }, { id: sh.who, x: W / 2 + 190 * s, sole: 1960, k: 1.5, delay: 0.08 }];
  }
  return { close, phone: (sh) => close(sh, lead), two, wide, room: wide };
}

// A figure pops up from its feet when it arrives. One already on screen before the cut stays up: popping it again sank
// a close-up's face under the captions on every cut of a long line.
export const popAt = (t, sh, p, stayed) => stayed ? 1 : lerp(0.3, 1, backOut(seg(t, sh.a + p.delay, sh.a + p.delay + 0.4)));
