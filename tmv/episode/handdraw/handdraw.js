// handdraw.js: the hand-draw episode engine. It plays one episode folder on the kai-hand-draw paper: every shot of
// episode/timeline.js shows its cast as their cards' hand-drawn presenters (core/character-card.mjs toHandDraw,
// styles/kai-hand-draw/engine/kaip.js), framed by framing.js, boiling at the engine's 12 drawings a second, the speaker's
// mouth moving while the words of their line play. lettering.js draws the cards, the HUD, the vote and the captions.
// The page (index.html) loads core.js and kaip.js first; their globals (paint, kai, camBegin, boilSeed...) are used here.
import { loadEpisode, cardsOf, timeline } from '../timeline.js';
import { toHandDraw } from '../../core/character-card.mjs';
import { rosterOf, frameOf } from './framing.js';
import { lettering } from './lettering.js';
import { settingOf, viewOf, paintSet } from './set.js';

const { EP, VO } = await loadEpisode();
const CARDS = cardsOf(EP, window.TMV_SEEDS);
const LOOK = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, toHandDraw(c).character]));
const { lead, LINES, DUR, SHOTS, shotOf, WORDS, hudAt, LAST } = timeline(EP, VO, CARDS);
if (!lead) throw new Error('the hand-draw engine needs a human in the room: a cast entry that is not a bot and not in the corner');
const ROSTER = rosterOf(CARDS, lead);
const SET = settingOf(EP);
const TYPE = lettering({ EP, WORDS, LAST, hudAt, ACCENT: EP.palette?.ink ?? '#E8226F' });

function world(t) {
  const sh = shotOf(t), f = frameOf(sh, t, ROSTER, EP.beats[sh.i].exp, SHOTS.indexOf(sh));
  window.VO_WORDS = WORDS.filter(w => w.line === LINES[sh.i].id);   // kaip.js moves a mouth while these play
  if (!f.paper) { const corner = ROSTER.corner.includes(sh.who); paintSet(corner ? 'corner' : 'room', SET, viewOf(sh.shot, f.side, corner), f.cam); }
  camBegin(f.cam.cx, H / 2, f.cam.zoom);
  TYPE.world(t, sh);
  for (const g of f.figs) {
    window.CHARACTER = LOOK[g.id]; boilSeed('fig:' + g.id);
    kai(g.pose, g.x, g.y, g.h, { flip: g.flip, face: g.face, eyes: g.eyes, talk: g.talk });
  }
  camEnd();
  TYPE.screen(t, sh);
}

window.HD = { world, overlay: (c, t) => TYPE.captions(c, t, shotOf(t)), DUR };
window.HD_RESOLVE(window.HD);
