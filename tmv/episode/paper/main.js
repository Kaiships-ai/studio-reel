// paper/main.js: the paper episode engine. Each shot of episode/timeline.js shows its cast as cut-paper stickers
// (core/character-card.mjs toPaper, core/paper-figure.js) on a cream paper backdrop: a figure pops up from its feet
// when the shot opens and bobs while its words play. Cards, the HUD, captions and the vote are paper/cards.js.
// Contract with core/render/video.mjs: window.render(t), window.DUR, window.READY.
import { loadEpisode, cardsOf, timeline, inCorner } from '../timeline.js';
import { toPaper } from '/core/character-card.mjs';
import { drawPaperFigure, FIGURE_W, SOLE_Y } from '/core/paper-figure.js';
import { createPaperCards, isCardShot } from './cards.js';

const W = 1080, H = 1920;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (x, y, k) => x + (y - x) * k;
const backOut = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;

const { EP, VO } = await loadEpisode();
const CARDS = cardsOf(EP, window.TMV_SEEDS);
const { LINES, DUR, shotOf, WORDS, hudAt, LAST, lead } = timeline(EP, VO, CARDS);
const FIG = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, drawPaperFigure(toPaper({ ...c, name: c.name ?? id }).figure, 'front')]));
const ROOM = Object.keys(CARDS).filter(id => !inCorner(CARDS[id]));
const isBot = (id) => CARDS[id].kind === 'bot';

// who stands where in each shot: { id, x, sole (feet y on the 1080x1920 frame), k (figure scale), delay (pop order) }
const side = (sh) => ((sh.i + sh.j) % 2 ? -1 : 1);
const partnerOf = (who) => who === lead ? ROOM.find(id => id !== lead && isBot(id)) ?? ROOM.find(id => id !== lead) : lead;
const close = (sh, who = sh.who) => [{ id: who, x: W / 2 + 70 * side(sh), sole: 2160, k: 2.3, delay: 0 }];
const medium = (sh) => [{ id: sh.who, x: W / 2 + 90 * side(sh), sole: 1900, k: 1.45, delay: 0 }];
const FRAMING = {
  close,
  phone: (sh) => close(sh, lead),
  two(sh) {
    const other = !inCorner(CARDS[sh.who]) && partnerOf(sh.who);
    if (!other) return medium(sh);
    const s = side(sh);
    return [{ id: other, x: W / 2 - 250 * s, sole: 1760, k: 1.2, delay: 0 }, { id: sh.who, x: W / 2 + 190 * s, sole: 1960, k: 1.5, delay: 0.08 }];
  },
  wide(sh) {
    if (inCorner(CARDS[sh.who])) return medium(sh);
    return ROOM.map((id, n) => ({ id, x: W * (n + 1) / (ROOM.length + 1), sole: 1560 + 40 * (n % 2), k: 0.95, delay: 0.07 * n }));
  },
};
FRAMING.room = FRAMING.wide;

function talking(t, id) {
  const sh = shotOf(t);
  return sh.who === id && WORDS.some(w => w.line === LINES[sh.i].id && t >= w.s && t < w.e) ? 1 : 0;
}

const cv = document.getElementById('paper'), g = cv.getContext('2d');
cv.width = Math.round(innerWidth * devicePixelRatio); cv.height = Math.round(innerHeight * devicePixelRatio);
const PX = cv.width / W;
const PAPER = createPaperCards(g, { EP, WORDS, LINES, LAST, hudAt });

function backdrop(corner) {
  const sky = g.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, corner ? '#E7E8EC' : '#F6EFE2'); sky.addColorStop(1, corner ? '#D2D5DE' : '#E9DCC6');
  g.fillStyle = sky; g.fillRect(0, 0, W, H);
  g.fillStyle = corner ? '#BFC3CE' : '#D8C7A8'; g.fillRect(0, 1500, W, H - 1500);
}
function figure(p, t, sh) {
  const pop = lerp(0.3, 1, backOut(seg(t, sh.a + p.delay, sh.a + p.delay + 0.4)));
  const talk = talking(t, p.id), bob = talk * Math.abs(Math.sin(t * 9)), squash = 1 + 0.03 * talk * Math.sin(t * 18);
  const push = lerp(1, 1.04, seg(t, sh.a, sh.b)), k = p.k * push * (isBot(p.id) ? 0.82 : 1);
  if (p.sole < H) { g.fillStyle = 'rgba(58,42,36,.16)'; g.beginPath(); g.ellipse(p.x, p.sole, 150 * k, 22 * k, 0, 0, Math.PI * 2); g.fill(); }
  g.save(); g.translate(p.x, p.sole - 22 * k * bob); g.rotate(0.012 * Math.sin(t * 1.3 + p.x));
  g.scale(k / squash, k * pop * squash);
  g.drawImage(FIG[p.id], -FIGURE_W / 2, -SOLE_Y); g.restore();
}
window.DUR = DUR;
window.render = (t) => {
  const sh = shotOf(t), onCard = isCardShot(sh);
  g.setTransform(PX, 0, 0, PX, 0, 0);
  if (onCard) PAPER.cardShot(t, sh);
  else {
    backdrop(inCorner(CARDS[sh.who]));
    for (const p of (FRAMING[sh.shot] ?? FRAMING.close)(sh)) figure(p, t, sh);
    PAPER.hud(t);
  }
  PAPER.vote(t, sh);
  PAPER.captions(t, sh, onCard);
};
await Promise.all(['400 40px "Lilita One"', '600 40px Fredoka'].map(f => document.fonts.load(f)));
window.render(Number(new URLSearchParams(location.search).get('t') || 0));
window.READY = true;
