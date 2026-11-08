// set.js: the world behind the hand-draw episode's story shots, painted in the kai-hand-draw look (ink line, washes,
// boil, paper grain): the lead's room at night, as episode/world.js and main.js build it in 3D (a window with the neon
// across the street, string lights, a desk with a monitor and a lamp, a shelf, a poster, a note board), and the rival's
// corner across town (a dark wall, his neon sign, a ring light, warm bulbs). The episode's own setting fills it in: the
// neon, room lights, the rival's colour and sign, and the card paper come from palette and texts, with main.js's
// fallbacks. settingOf and viewOf are pure; paintSet uses core.js's globals.

const MC = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
const DEFAULTS = { neon: '#FF3D8B', left: '#FF3D8B', right: '#29E0FF', card: '#EFE9DE' };

/** What the episode says about its places: { room: {...}, corner: {...} }, colours as #RRGGBB. */
export function settingOf(EP) {
  const P = Object.fromEntries(Object.entries(DEFAULTS).map(([k, d]) => [k, /^#[0-9a-f]{6}$/i.test(EP.palette?.[k]) ? EP.palette[k] : d]));
  return {
    room: { neon: P.neon, lights: P.left, poster: P.right, notes: P.card },
    corner: { sign: String(EP.texts?.sign ?? 'SPEED WINS').toUpperCase(), glow: P.right },
  };
}

/** Which part of the set a shot sees: the world point (x, y) at the frame's centre and the set's zoom k. Close shots
 * look past the speaker's shoulder at one side of the room, so cutting between them changes the background; the
 * corner's close-up looks up at the sign, its other shots alternate wide and medium (framing.js). */
export function viewOf(shot, side, corner) {
  if (corner) return shot === 'close' ? { x: 620 - side * 60, y: 760, k: 2 } : { x: 540 - side * 140, y: 900, k: side > 0 ? 1.4 : 1 };
  if (shot === 'close') return side > 0 ? { x: 360, y: 760, k: 1.6 } : { x: 760, y: 820, k: 1.6 };
  if (shot === 'phone') return { x: 700 - side * 90, y: 860, k: 1.4 };
  if (shot === 'two') return { x: 540 - side * 60, y: 860, k: 1.25 };
  return { x: 540, y: 960, k: 1 };
}

const WALL = 1440;   // where the room's back wall meets the floor, in the wide view; the cast stands on the floor below it

function room(S) {
  boilSeed('set:wall'); paint(rectPts(-200, -200, W + 400, WALL + 200), { wash: mixCol(PAL.paper, PAL.indigo, .5), washOp: 240, ink: null });
  boilSeed('set:floor'); paint(rectPts(-200, WALL, W + 400, 760), { wash: mixCol(PAL.paper, PAL.clayDk, .45), washOp: 245, ink: null });
  for (let i = 0; i < 4; i++) { boilSeed('set:plank' + i); inkLine([[-200, WALL + 70 + i * 110], [W + 200, WALL + 60 + i * 118]], .7, PAL.ink, 'inkfine', .2); }
  boilSeed('set:skirting'); inkLine([[-200, WALL], [W + 200, WALL + 4]], 1.4);
  // the window, the neon sign across the street in it, curtains in the room lights' colour
  boilSeed('set:window'); paint(rrPts(70, 300, 380, 520, 14, 2), { wash: mixCol(PAL.night, PAL.sky, .35), washOp: 255, ink: PAL.ink, sw: 1.4 });
  for (let i = 0; i < 6; i++) { boilSeed('set:far' + i); paint(rectPts(100 + 300 * hash(i + 1), 600 + 180 * hash(i + 7), 22, 30, 1), { wash: i % 3 ? PAL.ochre : PAL.sky, washOp: 150, ink: null }); }
  boilSeed('set:neon'); paint(rrPts(120, 452, 280, 20, 10, 1.5), { wash: S.neon, washOp: 255, ink: null }); glow(260, 462, 190, S.neon, .9);
  boilSeed('set:bars'); inkLine([[260, 300], [258, 820]], 1.2); inkLine([[70, 560], [450, 556]], 1.2);
  for (const [k, x] of [['L', 30], ['R', 410]]) { boilSeed('set:curtain' + k); paint([[x, 270], [x + 80, 270], [x + 60 + jit(6), 880], [x + 10 + jit(6), 890]], { wash: mixCol(S.lights, PAL.night, .35), washOp: 230, ink: PAL.ink, sw: .9 }); }
  // string lights along the top of the wall
  const bulbs = Array.from({ length: 9 }, (_, i) => [40 + i * 125, 210 + 40 * Math.sin(i / 8 * Math.PI)]);
  boilSeed('set:wire'); inkLine(bulbs, .8, PAL.ink, 'inkfine');
  bulbs.forEach(([x, y], i) => { boilSeed('set:bulb' + i); paint(ellPts(x, y + 14, 12, 16, 10, 1), { wash: i % 2 ? S.lights : PAL.ochre, washOp: 255, ink: PAL.ink, sw: .5 }); });
  glow(300, 250, 260, S.lights, .55); glow(800, 250, 260, PAL.ochre, .55);
  // a poster and a note board on the wall, a shelf with books and a plant
  boilSeed('set:poster'); paint(rectPts(560, 330, 230, 310, 3), { wash: mixCol(S.poster, PAL.paper, .3), washOp: 235, fill: PAL.ink, fillOp: 25, tex: .5, ink: PAL.ink, sw: 1 });
  boilSeed('set:poster2'); paint(ellPts(675, 470, 60, 60, 16, 3), { wash: PAL.cream, washOp: 200, ink: null });
  boilSeed('set:board'); paint(rectPts(830, 380, 210, 260, 3), { wash: mixCol(PAL.clayDk, PAL.ochre, .3), washOp: 245, ink: PAL.ink, sw: 1 });
  for (let i = 0; i < 4; i++) { boilSeed('set:note' + i); paint(rectPts(850 + (i % 2) * 95, 405 + Math.floor(i / 2) * 115, 78, 86, 2), { wash: i === 1 ? S.neon : S.notes, washOp: 240, ink: null }); }
  boilSeed('set:shelf'); paint(rectPts(590, 860, 450, 24, 1.5), { wash: PAL.clayDk, washOp: 255, ink: PAL.ink, sw: 1 });
  [PAL.teal, PAL.ochre, PAL.rose, PAL.violet, PAL.cream].forEach((c, i) => { boilSeed('set:book' + i); paint(rectPts(620 + i * 46, 860 - 120 - 30 * hash(i + 3), 38, 120 + 30 * hash(i + 3), 1), { wash: c, washOp: 255, ink: PAL.ink, sw: .7 }); });
  boilSeed('set:pot'); paint([[910, 860], [990, 860], [978, 790], [922, 790]], { wash: PAL.clay, washOp: 255, ink: PAL.ink, sw: .8 });
  boilSeed('set:plant'); paint([[950, 790], [890, 700], [930, 640], [955, 720], [985, 630], [1015, 700], [960, 795]], { wash: PAL.sap, washOp: 255, ink: PAL.ink, sw: .8 });
  // the desk under the window light: a monitor with code on it and a lamp
  boilSeed('set:desk'); paint(rectPts(-200, 1150, 1480, 46, 2), { wash: PAL.clayDk, washOp: 255, ink: PAL.ink, sw: 1.2 });
  boilSeed('set:legs'); paint(rectPts(-180, 1196, 1440, 250, 2), { wash: mixCol(PAL.clayDk, PAL.ink, .45), washOp: 240, ink: null });
  boilSeed('set:monitor'); paint(rrPts(560, 940, 320, 200, 12, 1.5), { wash: '#3A3448', washOp: 255, ink: PAL.ink, sw: 1 });
  boilSeed('set:screen'); paint(rrPts(578, 956, 284, 160, 6, 1), { wash: PAL.night, washOp: 255, ink: null });
  [PAL.sky, PAL.teal, S.neon, PAL.ochre].forEach((c, i) => { boilSeed('set:code' + i); paint(rrPts(598 + (i % 2) * 30, 980 + i * 32, 110 + 120 * hash(i + 11), 12, 6), { wash: c, washOp: 230, ink: null }); });
  boilSeed('set:stand'); paint(rectPts(700, 1138, 40, 14, 1), { wash: '#3A3448', washOp: 255, ink: PAL.ink, sw: .7 });
  boilSeed('set:lamp'); inkLine([[200, 1150], [230, 980], [300, 940]], 1.6); paint([[270, 900], [360, 930], [330, 980], [262, 950]], { wash: PAL.ochre, washOp: 255, ink: PAL.ink, sw: .9 });
  glow(320, 990, 200, PAL.ochre, .8);
}

function corner(S) {
  boilSeed('set:cwall'); paint(rectPts(-200, -200, W + 400, WALL + 200), { wash: mixCol(PAL.night, S.glow, .18), washOp: 245, ink: null });
  boilSeed('set:cfloor'); paint(rectPts(-200, WALL, W + 400, 760), { wash: mixCol(PAL.ink, PAL.night, .4), washOp: 245, ink: null });
  boilSeed('set:cskirt'); inkLine([[-200, WALL], [W + 200, WALL - 4]], 1.4, PAL.cream, 'ink', .2);
  // warm and cold bulbs on a shelf, the ring light, the sign above his head
  boilSeed('set:cshelf'); paint(rectPts(80, 900, 420, 22, 1.5), { wash: mixCol(PAL.night, PAL.cream, .25), washOp: 255, ink: null });
  for (let i = 0; i < 5; i++) { boilSeed('set:cbulb' + i); paint(ellPts(120 + i * 85, 870, 16, 20, 10, 1), { wash: i % 2 ? S.glow : PAL.ochre, washOp: 255, ink: null }); }
  glow(290, 860, 240, PAL.ochre, .7);
  boilSeed('set:ring'); paint(ellPts(870, 760, 150, 150, 32, 1.5), { ink: PAL.cream, sw: 2.6 }); glow(870, 760, 260, PAL.cream, .6);
  boilSeed('set:pole'); inkLine([[870, 910], [880, 1600]], 1.4, PAL.cream);
  glow(620, 540, 360, S.glow, 1);
  MC.font = '84px "Permanent Marker", cursive';
  const size = Math.min(84, 84 * 660 / MC.measureText(S.sign).width);   // a long sign shrinks to fit the wide shot (the close-up crops it)
  letter(S.sign, 620, 540, size, mixCol(PAL.cream, S.glow, .35), { font: `${size}px "Permanent Marker", cursive`, stroke: S.glow, ink: false, rot: -.03 });
}

const SETS = { room, corner };

/** Paints the set `name` ("room" | "corner") under the frame camera cam ({ cx, zoom }) as seen from view. The set's
 * camera drifts at 60 % of the cast's, so the wall lags behind the people a little. */
export function paintSet(name, S, view, cam) {
  camBegin(view.x + (cam.cx - W / 2) * .6, view.y, view.k * (1 + (cam.zoom - 1) * .6));
  SETS[name](S[name]);
  camEnd();
  flushLetters();
}
