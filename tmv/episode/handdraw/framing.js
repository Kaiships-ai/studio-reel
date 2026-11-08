// framing.js: who the hand-draw engine shows in a shot of episode/timeline.js, where and how big, with no drawing in
// it. It follows main.js's cast grammar: the rival's corner holds only him, a two-shot pairs the speaker with the lead
// (the lead with the first bot), the phone shot is the lead's. Sizes are px on the 1080x1920 page; a figure stands
// with its feet at (x, y), h px tall, or is a head-and-shoulders bust (pose "exp-*") whose bottom edge sits at y.
import { inCorner } from '../timeline.js';

const W = 1080;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (x, y, k) => (1 - k) * x + k * y;

// a beat's "exp" as the presenter's bust pose and the face and eyes of a standing pose (styles/kai-hand-draw/engine/kaip.js)
const LOOKS = {
  happy: { bust: 'exp-happy', face: 'grin', eyes: 'happy' },
  grin: { bust: 'exp-wink', face: 'grin', eyes: 'wink' },
  shock: { bust: 'exp-surprised', face: 'O', eyes: 'wide' },
  down: { bust: 'exp-focused', face: 'flat', eyes: 'narrow' },
  think: { bust: 'exp-focused', face: 'think', eyes: 'up' },
};
const EXP = { excited: 'happy', proud: 'happy', relieved: 'happy', laugh: 'happy', determined: 'happy',
  grin: 'grin', smirk: 'grin', shock: 'shock', surprise: 'shock',
  angry: 'down', guilty: 'down', nervous: 'down', sad: 'down', teary: 'down', tired: 'down', worried: 'down',
  doubt: 'think', thinking: 'think' };
const NEUTRAL = { bust: 'exp-happy', face: 'smile', eyes: 'normal' };
export const lookOf = (exp) => LOOKS[EXP[exp]] ?? NEUTRAL;

/** The cast by place: the lead, everyone else in the room (bots first, as main.js stands them), the corner. */
export function rosterOf(cards, lead) {
  const ids = Object.keys(cards), room = ids.filter(id => !inCorner(cards[id]));
  const others = room.filter(id => id !== lead);
  return { lead, room: [lead, ...others.filter(id => cards[id].kind === 'bot'), ...others.filter(id => cards[id].kind !== 'bot')],
    corner: ids.filter(id => inCorner(cards[id])) };
}

const PAPER = new Set(['card', 'stats', 'previously']);

/** What frame t of shot `sh`, the n-th shot of the timeline, shows: { paper, side, cam: { zoom, cx }, figs: [{ id, pose,
 * x, y, h, flip, face, eyes, talk }] }. The side the shot leans to (-1 left, 1 right) alternates shot by shot, so a cut
 * between two shots of the same kind still moves the picture (gates.py sees a cut only when the picture changes). */
export function frameOf(sh, t, roster, exp, n = 0) {
  const k = seg(t, sh.a, sh.b), side = n % 2 ? 1 : -1;
  // every shot pushes in slowly and drifts toward its speaker's side, like the 3D camera's dolly
  const cam = { zoom: lerp(1, 1.06, k), cx: W / 2 + side * 24 * k };
  if (PAPER.has(sh.shot)) return { paper: sh.shot, side, cam: { zoom: lerp(1, 1.04, k), cx: W / 2 }, figs: [] };
  const who = sh.who, look = (id) => id === who ? lookOf(exp) : NEUTRAL;
  const fig = (id, pose, x, y, h, o = {}) => ({ id, pose, x, y, h, flip: x > W / 2, face: look(id).face, eyes: look(id).eyes, talk: id === who, ...o });
  const corner = roster.corner.includes(who), shot = sh.shot;
  // the rival's corner: his bust under the sign, close; his other shots alternate the whole of him small in his set and a
  // medium shot, so two of them in a row still cut (the corner is dark: a cut there has to change the picture's size)
  if (shot === 'close') {
    return { side, cam, figs: [fig(who, look(who).bust, W / 2 + side * 50, corner ? 1990 : 1860, corner ? 1150 : 800, { flip: side > 0 })] };
  }
  if (corner) return { side, cam, figs: [fig(who, 'present', W / 2 + side * 210, side > 0 ? 1950 : 1700, side > 0 ? 1450 : 1000, { flip: side > 0 })] };
  if (shot === 'phone') return { side, cam, figs: [fig(roster.lead, 'phone', W / 2 + side * 60, 2250, 1600, { talk: roster.lead === who, flip: side > 0 })] };
  if (shot === 'two') {
    const mate = who === roster.lead ? roster.room[1] : roster.lead;
    if (!mate) return { side, cam, figs: [fig(who, 'present', W / 2, 2120, 1500)] };
    return { side, cam, figs: [fig(who, 'present', W / 2 + side * 250, 2080, 1350), fig(mate, 'front', W / 2 - side * 260, 2040, 1250)] };
  }
  // room and wide: everyone in the room on their feet, the group centred
  const many = roster.room.length, gap = Math.min(330, 900 / many), order = roster.room.map((id, i) => i ? (i % 2 ? -1 : 1) * Math.ceil(i / 2) : 0);
  const mid = order.reduce((m, o) => m + o / many, 0);
  return { side, cam, figs: roster.room.map((id, i) => fig(id, id === who ? 'present' : 'front', W / 2 + (order[i] - mid) * gap, 1560 + (i ? 30 : 0), i ? 860 : 1000)) };
}
