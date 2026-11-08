// handdraw.js: the hand-draw episode engine. It plays one episode folder on the kai-hand-draw paper: every shot of
// episode/timeline.js shows its cast as their cards' hand-drawn presenters (core/character-card.mjs toHandDraw,
// styles/kai-hand-draw/engine/kaip.js), framed by framing.js, boiling at the engine's 12 drawings a second, the speaker's
// mouth moving while the words of their line play. Cards, captions, the HUD and the vote are plain type.
// The page (index.html) loads core.js and kaip.js first; their globals (paint, kai, camBegin, boilSeed...) are used here.
import { loadEpisode, cardsOf, timeline } from '../timeline.js';
import { toHandDraw } from '../../core/character-card.mjs';
import { rosterOf, frameOf } from './framing.js';

const { EP, VO } = await loadEpisode();
const CARDS = cardsOf(EP, window.TMV_SEEDS);
const LOOK = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, toHandDraw(c).character]));
const { lead, LINES, DUR, shotOf, WORDS, hudAt, LAST } = timeline(EP, VO, CARDS);
if (!lead) throw new Error('the hand-draw engine needs a human in the room: a cast entry that is not a bot and not in the corner');
const ROSTER = rosterOf(CARDS, lead);
const CREAM = '#FFF5E2', INK = '#2B2233', ACCENT = EP.palette?.ink ?? '#E8226F';

function world(t) {
  const sh = shotOf(t), f = frameOf(sh, t, ROSTER, EP.beats[sh.i].exp);
  window.VO_WORDS = WORDS.filter(w => w.line === LINES[sh.i].id);   // kaip.js moves a mouth while these play
  camBegin(f.cam.cx, H / 2, f.cam.zoom);
  if (f.paper) { boilSeed('card'); paint(rectPts(70, 300, W - 140, 1320, 6), { wash: CREAM, fill: '#E9DCC4', fillOp: 60, ink: PAL.ink, sw: 1.2 }); }
  for (const g of f.figs) {
    window.CHARACTER = LOOK[g.id]; boilSeed('fig:' + g.id);
    kai(g.pose, g.x, g.y, g.h, { flip: g.flip, face: g.face, eyes: g.eyes, talk: g.talk });
  }
  camEnd();
}

// ------------------------------------------------------------ type over the paper
function text(c, s, x, y, size, col = INK, o = {}) {
  c.save(); c.font = `${o.weight ?? 800} ${size}px "Inter Tight", sans-serif`; c.textAlign = o.align ?? 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = size * 0.18; c.strokeStyle = PAL.paper; c.strokeText(String(s), x, y, o.w ?? 960);
  c.fillStyle = col; c.fillText(String(s), x, y, o.w ?? 960); c.restore();
}
function overlay(c, t) {
  const sh = shotOf(t);
  if (sh.shot === 'card') (sh.card ?? []).forEach((ln, i, all) => text(c, ln, W / 2, 900 - (all.length - 1) * 70 + i * 140, 96, i === all.length - 1 ? ACCENT : INK));
  else if (sh.shot === 'stats') {
    if (sh.head) text(c, sh.head.toUpperCase(), W / 2, 400, 40, INK, { weight: 600 });
    (sh.stats ?? []).forEach((r, i) => { text(c, String(r.label).toUpperCase(), 140, 540 + i * 230, 32, INK, { align: 'left', weight: 500 });
      text(c, r.value, 140, 620 + i * 230, 90, r.style === 'danger' ? ACCENT : INK, { align: 'left' }); });
    if (sh.source) text(c, sh.source, W / 2, 1560, 26, INK, { weight: 500 });
  } else if (sh.shot === 'previously' && EP.previously) {
    text(c, `PREVIOUSLY · EP ${EP.previously.ep}`, W / 2, 500, 40, ACCENT);
    text(c, EP.previously.question, W / 2, 640, 56);
    text(c, `${EP.previously.winner.tag} · ${EP.previously.winner.text}`, W / 2, 820, 64, ACCENT);
  } else hudAt(t).items.forEach((it, i) => text(c, `${it.label} ${it.val}`, 80, 140 + i * 56, 38, it.danger ? ACCENT : INK, { align: 'left' }));
  if (t < 2.4) text(c, EP.title.toUpperCase(), W / 2, 420, 84);
  const said = WORDS.filter(w => w.line === LINES[sh.i].id && w.s <= t).slice(-6).map(w => w.w).join(' ');
  if (said && (sh.i !== LAST.i || t < LAST.ls)) text(c, said, W / 2, 1600, 62, INK, { w: 980 });
  if (t >= LAST.ls) {
    text(c, EP.vote.question.toUpperCase(), W / 2, 1050, 44);
    text(c, `${EP.vote.tagA ?? 'A'} · ${EP.vote.a.toUpperCase()}`, W / 2, 1180, 64, ACCENT);
    text(c, `${EP.vote.tagB ?? 'B'} · ${EP.vote.b.toUpperCase()}`, W / 2, 1320, 64, INK);
  }
}

await Promise.all([500, 600, 800].map(w => document.fonts.load(`${w} 40px "Inter Tight"`)));
window.HD = { world, overlay, DUR };
window.HD_RESOLVE(window.HD);
