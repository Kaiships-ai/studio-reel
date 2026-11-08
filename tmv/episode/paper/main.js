// paper/main.js: the paper episode engine. Each shot of episode/timeline.js shows its cast as cut-paper stickers
// (core/character-card.mjs toPaper, core/paper-figure.js) in front of a pop-up set of its place (paper/set.js): a figure pops up from its feet
// when the shot opens and bobs while its words play. Cards, the HUD, captions and the vote are paper/cards.js.
// Contract with core/render/video.mjs: window.render(t), window.DUR, window.READY.
import { loadEpisode, cardsOf, timeline, inCorner } from '../timeline.js';
import { toPaper } from '/core/character-card.mjs';
import { drawPaperFigure, FIGURE_W, SOLE_Y } from '/core/paper-figure.js';
import { createPaperCards, isCardShot } from './cards.js';
import { createPaperSet } from './set.js';
import { framingFor, popAt, W, BOT_SCALE, PUSH, seg, lerp } from './framing.js';

const H = 1920;

const { EP, VO } = await loadEpisode();
const CARDS = cardsOf(EP, window.TMV_SEEDS);
const { LINES, DUR, shotOf, WORDS, hudAt, LAST, lead } = timeline(EP, VO, CARDS);
const FIG = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, drawPaperFigure(toPaper({ ...c, name: c.name ?? id }).figure, 'front')]));
const ROOM = Object.keys(CARDS).filter(id => !inCorner(CARDS[id]));
const isBot = (id) => CARDS[id].kind === 'bot';
const FRAMING = framingFor(CARDS, lead);
const peopleOf = (sh) => (FRAMING[sh.shot] ?? FRAMING.close)(sh);

function talking(t, id) {
  const sh = shotOf(t);
  return sh.who === id && WORDS.some(w => w.line === LINES[sh.i].id && t >= w.s && t < w.e) ? 1 : 0;
}

const cv = document.getElementById('paper'), g = cv.getContext('2d');
cv.width = Math.round(innerWidth * devicePixelRatio); cv.height = Math.round(innerHeight * devicePixelRatio);
const PX = cv.width / W;
const PAPER = createPaperCards(g, { EP, WORDS, LINES, LAST, hudAt });
await Promise.all(['400 40px "Lilita One"', '600 40px Fredoka'].map(f => document.fonts.load(f)));
const SET = createPaperSet(g, EP);

// the camera on the set for a shot's figures: zoom with the biggest figure, floor line just above the highest feet, and
// each figure in front of its own place in the room (its spot in the wide shot; the corner has one, its middle)
const home = (id) => inCorner(CARDS[id]) ? W / 2 : W * (ROOM.indexOf(id) + 1) / (ROOM.length + 1);
function camOf(people, push) {
  const z = (1 + (Math.max(...people.map(p => p.k)) - 0.95) * 0.75) * push;
  const cx = people.reduce((s, p) => s + home(p.id) - (p.x - W / 2) / z, 0) / people.length;
  return { z, cx, floor: Math.min(...people.map(p => p.sole)) - 60 * z };
}
// the set pops up when it comes on screen: the first shot, or a cut from a card or from the other place
const setOf = (sh) => isCardShot(sh) ? 'card' : inCorner(CARDS[sh.who]) ? 'corner' : 'room';
function figure(p, t, sh, stayed) {
  const pop = popAt(t, sh, p, stayed);
  const talk = talking(t, p.id), bob = talk * Math.abs(Math.sin(t * 9)), squash = 1 + 0.03 * talk * Math.sin(t * 18);
  const push = lerp(1, PUSH, seg(t, sh.a, sh.b)), k = p.k * push * (isBot(p.id) ? BOT_SCALE : 1);
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
    const people = peopleOf(sh), prev = sh.a > 0 && shotOf(sh.a - 0.02), fresh = !prev || setOf(prev) !== setOf(sh);
    const before = fresh ? [] : peopleOf(prev).map(p => p.id);
    SET(t, camOf(people, lerp(1, PUSH, seg(t, sh.a, sh.b))), inCorner(CARDS[sh.who]), fresh ? t - sh.a : undefined);
    for (const p of people) figure(p, t, sh, before.includes(p.id));
    PAPER.hud(t);
  }
  PAPER.vote(t, sh);
  PAPER.captions(t, sh, onCard);
};
window.render(Number(new URLSearchParams(location.search).get('t') || 0));
window.READY = true;
