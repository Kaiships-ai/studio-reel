// Age on the s2 rubber face (kit faces v4, the approved plan of 25/11): a layer over every s2 design, so one design reads as an elder, an
// adult, a teen, a child or a toddler from the face alone (a hood or a cap hides hair; the head is ~120 px on a phone).
// Adult is today's face, untouched. The other ages change proportion (eye size, the eye line, spacing, mouth width, brow
// weight) and add ink (an elder's lines, a teen's pimples and braces, a toddler's one tooth); expression stays the design's own, so an elder's angry keeps his lines.
// Baby schema (Lorenz 1943; Glocker et al. 2009): big eyes low on a tall forehead, a small mouth read young. The approved plan
// (25/11) asked for kids' eyes "set higher": a child has them high (child_hi); a toddler has both (toddler_lo, the default, and toddler_hi), for the owner to pick.
// Opt-in: the age comes from the cast spec's own spec.faceAge and nothing else. A child or an elder body without it draws
// today's face (films already posted use those bodies; test/unit/stick-head-marks.test.mjs holds them to their hash).
// Lines add age, never take it away; every added line is at least 2 px on a 120 px head.
import { DRAW_KIT as K } from '../faces.js';

// eye: [rx, ry] x adult; eMax: the eye's largest [rx, ry] (a kid's shocked eye never reaches his mouth); dx: eye spacing x
// adult (0.084 from the nose line); pu: pupil size x adult (kept close to the eye's width, so a big eye never stares,
// eyegeom.js); ca: the pupil's catch light x (a bigger shine reads young); eY: the eye line moved (face canvas units, head
// ~0.86 tall, + up); popY: raised that much more on a wide-eyed (fear, shock) face; my: the mouth moved; bw: brow stroke x;
// bl: brow length x; arch: brow arch x; mw: mouth width x; mMin: the least mouth width of a mouth that is open, clenched or
// asleep, x the eye's width (specks read as a snout); mC: mouth curve added;
// lid: a heavy upper lid ([add, floor] on a design's open lid; a wide-eyed fear or shock design keeps its
// white: a heavy lid read calm), lidT: its outer end sagging (deg; level, it read as a spectacle rim), lidW: the lid line's
// weight x; bUp: brows raised further; tilt: brow slope x; soft: [weight x, length x] of a brow at rest (a toddler's is near
// gone; it comes back as the brow slopes, so his scowl holds); ink: the age's lines (INK below); mouth: the age's own mouth
// (MOUTH below). A child's brows keep (nearly) V2.1's weight at ~66 % of the length (at the full weight they were round
// dots with no slope; as hairlines the anger went out of them)
const TODDLER = { eye: [1.5, 1.4], eMax: [0.104, 0.137], dx: 1.72, pu: 1.5, ca: 2.0, bUp: 0.028, bw: 0.8, bl: 0.6, soft: [0.42, 0.55], tilt: 1.45, arch: 1.3, mw: 0.64, mMin: 0.84, mC: 0, ink: ['cheeks'], mouth: 'tooth' };
export const AGES = {
  elder: { eye: [0.9, 0.84], dx: 1.04, pu: 0.92, eY: 0.012, my: -0.006, bw: 0.62, bl: 1.08, arch: 0.4, mw: 0.92, mC: -0.12, lid: [0.12, 0.32], lidT: -11, lidW: 0.62, ink: ['crow', 'forehead'] },
  adult: null,
  teen: { eye: [1, 1], dx: 1.04, pu: 1, ca: 1.15, eY: -0.012, my: -0.008, bw: 0.82, bl: 0.96, bUp: -0.006, arch: 0.7, mw: 0.86, mC: 0, lid: [0.09, 0.31], lidT: 0, lidW: 1, skew: 0.35, ink: ['pimples'], mouth: 'braces' },
  child_hi: { eye: [1.4, 1.42], eMax: [0.1, 0.152], dx: 1.38, pu: 1.4, ca: 1.8, bUp: 0.02, eY: 0.035, my: -0.012, bw: 0.86, bl: 0.66, tilt: 1.35, arch: 1.2, mw: 0.6, mMin: 0.84, mC: 0, ink: [], mouth: 'round' },
  toddler_lo: { ...TODDLER, eY: -0.05, popY: 0.05, my: -0.075 },
  toddler_hi: { ...TODDLER, eY: 0.04, popY: 0, my: -0.04 },
};
// a plain age names its default variant (two cues a step: a child's eyes at the middle of the head, a toddler's low under a
// big forehead)
export const AGE_ALIAS = { child: 'child_hi', toddler: 'toddler_lo' };
export const AGE_NAMES = ['elder', 'adult', 'teen', 'child_hi', 'toddler_lo', 'toddler_hi'];

// the age a face draws at, from the face rig's options (cast.js passes spec.faceAge; none = adult, whatever the body)
export function ageOf(o = {}) {
  const n = o.faceAge ?? 'adult', a = AGE_ALIAS[n] || n;
  if (!(a in AGES)) throw new Error(`faceAge '${n}': one of ${[...AGE_NAMES, ...Object.keys(AGE_ALIAS)].join(', ')}`);
  return AGES[a];
}

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
// the brow and mouth numbers of one face (the mixed face, or a take's earlier frames F.prev: { brow, mw, x }); rx = the eye's
const browMouth = (P, A, grow, rx) => {
  // a kid's short brow: its slope is drawn steeper, and a scowl (tilt past 8) comes down onto the eyes instead of riding above
  const scowl = A.tilt ? clamp(((P.brow?.[0] ?? 0) - 8) / 14) : 0, X = P.x || {};
  // the least width of a mouth that is open (not a smile), clenched or asleep; s2's mouth is 0.105 mw a side, a yawn 0.04 + 0.024 mO
  const need = !A.mMin ? 0 : (X.mO || 0) >= 0.5 ? A.mMin * rx / (0.04 + 0.024 * Math.min(1, X.mO)) : (X.mGrim || 0) > 0.02 || ((X.mOpen || 0) >= 0.06 && (X.mC ?? 0) <= 0.4) ? A.mMin * rx / 0.105 : 0;
  return { ...P, brow: P.brow && [0, 1, 2, 3, 4].map(i => { const v = P.brow[i] ?? 0; return i === 0 ? v * (A.tilt || 1) : i === 1 ? v + grow - 0.028 * scowl : i === 2 ? v * A.arch : v; }), mw: Math.max((P.mw ?? 1) * A.mw, need),
    x: P.x && { ...P.x, mC: (P.x.mC ?? 0) + A.mC, ...(A.skew ? { mSk: clamp((P.x.mSk ?? 0) + A.skew, -1, 1) } : {}) } };
};

// the mixed face F at age A (null = adult: F itself, the same object)
export function ageFace(F, A) {
  if (!A) return F;
  const rx = Math.min(F.rx * A.eye[0], A.eMax?.[0] ?? 1), ry = Math.min(F.ry * A.eye[1], Math.max(A.eMax?.[1] ?? 1, F.ry)), lid = F.lid ?? 0;
  const slope = A.soft ? clamp((Math.abs(F.brow[0]) - 8) / 12) : 1, soft = i => A.soft ? A.soft[i] + (1 - A.soft[i]) * slope : 1;
  const up = ry - F.ry + (A.bUp || 0), G = { ...browMouth(F, A, up, rx), rx, ry, bw: (F.bw || 1) * A.bw * soft(0), my: (F.my || 0) + A.my, aDx: A.dx, aBl: A.bl * soft(1), aPu: A.pu, aCa: A.ca || 1 };
  G.x = { ...G.x, eY: (F.x?.eY || 0) + A.eY + (A.popY || 0) * clamp(((F.white || 0) - 0.45) / 0.3) };
  if (A.lid && (F.white || 0) < 0.6) { G.lid = lid >= 0 ? Math.max(lid + A.lid[0], A.lid[1]) : lid + A.lid[0]; G.lidTilt = (F.lidTilt || 0) + (A.lidT || 0); G.aLw = A.lidW; }
  if (F.prev) G.prev = F.prev.map(P => browMouth(P, A, up, rx));
  return G;
}

// the age's own mouth, or false (the design's). at: { mx, my, k, draw } (draw() = the design's mouth, for one that adds to it)
export function ageMouth(g, A, F, at) {
  const X = F.x || {}, open = Math.max(X.mOpen || 0, F.talk?.open || 0), c = X.mC ?? 0;
  if (!A.mouth || (F.chewX || 0) > 0.02 || (X.mGrim || 0) > 0.02 || ['mKiss', 'mO', 'mSnarl'].some(n => (X[n] || 0) >= 0.5)) return false;
  if (A.mouth !== 'braces' && open >= 0.06 && c <= 0.4) { gape(g, F, at, open); return true; }
  return A.mouth === 'round' ? false : MOUTH[A.mouth](g, F, at, open, c);
}
// a kid's open mouth: an oval as wide as the mouth's least width, taller than wide once it is well open (shock)
function gape(g, F, { mx, my, k }, open) {
  const w = 0.105 * F.mw, h = w * (0.34 + 0.86 * clamp((open - 0.12) / 0.34)), y = Math.max(my - 0.62 * h, h - 0.378);   // (never under the chin)
  g.beginPath(); g.ellipse(mx, y, w, h, 0, 0, 2 * Math.PI); g.fillStyle = K.INK; g.fill(); g.lineWidth = 0.012 * k; g.strokeStyle = K.INK; g.stroke();
}
const MOUTH = {
  // a toddler: at rest a small round open mouth, one front tooth in it; a smile shows the same one tooth instead of a row
  tooth(g, F, { mx, my, k, draw }, open, c) {
    const X = F.x || {}, rest = open < 0.06 && c > -0.35 && c < 0.6 && (X.mPr || 0) < 0.5 && (X.mWv || 0) < 0.6;
    const tooth = (y, s) => { const w = 0.019 * s, h = 0.034 * s, pts = [[mx - w, y], [mx + w, y], ...K.bez([mx + w, y - h], [mx + w, y - h - 0.008], [mx - w, y - h - 0.008], [mx - w, y - h], 6)]; K.fill(g, pts, K.WHITE); };
    if (rest) {
      const w = 0.053, h = 0.05, y = my - 0.012, oval = () => { g.beginPath(); g.ellipse(mx, y, w, h, 0, 0, 2 * Math.PI); };
      oval(); g.fillStyle = K.INK; g.fill();
      g.save(); oval(); g.clip(); tooth(y + h, 1.15); g.restore();
      oval(); g.lineWidth = 0.014 * k; g.strokeStyle = K.INK; g.stroke();
      return true;
    }
    if (open < 0.06 || c <= 0.4) return false;
    const teeth = X.mTeeth; X.mTeeth = 0; draw(); X.mTeeth = teeth;
    tooth(my + 0.0055 * c, 1.1);
    return true;
  },
  // a teen: braces on the teeth of an open smile (a wire and its brackets)
  braces(g, F, { mx, my, k, draw }, open, c) {
    const X = F.x || {};
    if (open < 0.06 || c <= 0.4) return false;
    const teeth = X.mTeeth; X.mTeeth = 1; draw(); X.mTeeth = teeth;
    const w = 0.105 * F.mw, lift = 0.034 * c, sk = (X.mSk || 0) * 0.014, at = u => [mx + w * u, my + lift * (0.325 + 0.675 * u * u) + sk * u - 0.018];
    const wire = []; for (let i = 0; i <= 16; i++) wire.push(at(-0.82 + 1.64 * i / 16));
    K.line(g, wire, 0.006 * k);
    for (const u of [-0.66, -0.33, 0, 0.33, 0.66]) { const [x, y] = at(u), r = 0.0075 * k; K.fill(g, [[x - r, y - r], [x + r, y - r], [x + r, y + r], [x - r, y + r]], K.INK); }
    return true;
  },
};

// the age's lines, drawn on the face after its eyes and brows. at: { ey eye line, dx eye spacing, rx, ry the eye's radii,
// browY the brows' top, my the mouth line, mw its half width, k the face's ink factor, open 0..1 how open the eyes are }
export function ageInk(g, A, at) {
  if (!A) return;
  for (const n of A.ink) INK[n](g, at);
}
const W_LINE = 0.0088;   // an added line's half-width (x k): half an elder's brow
const INK = {
  // crow's feet: two short curved ticks a side, well out from the eye's corner (close to it, with bags below, they closed
  // the eyes into a pair of spectacles)
  crow(g, { ey, dx, rx, ry, k }) {
    for (const s of [-1, 1]) {
      const x0 = s * (dx + rx), y0 = ey - 0.1 * ry;
      for (const [a, r0, r1] of [[24, 0.05, 0.1], [-20, 0.046, 0.088]]) { const pts = [];
        for (let i = 0; i <= 8; i++) { const u = i / 8, r = r0 + (r1 - r0) * u, b = (a + Math.sign(a) * 10 * u * u) * Math.PI / 180; pts.push([x0 + s * Math.cos(b) * r, y0 + Math.sin(b) * r]); }
        K.taper(g, pts, W_LINE * k, K.INK, 0.35); }
    }
  },
  // two wide forehead lines, high over the brows (near them, they read as a second pair), kept under the crown
  forehead(g, { browY, k }) {
    const top = Math.min(0.372, browY + 0.142), low = Math.min(top - 0.044, browY + 0.1);
    for (const [y, hw] of [[low, 0.175], [top, 0.125]]) {
      const pts = []; for (let i = 0; i <= 16; i++) { const u = -1 + 2 * i / 16; pts.push([u * hw, y + 0.016 * (1 - u * u) - 0.004 * Math.sin(u * 3)]); }
      K.taper(g, pts, W_LINE * k, K.INK, 0.25);
    }
  },
  // a teen's pimples: a cluster on one cheek (two ink rings with white heads, three dots)
  pimples(g, { ey, k }) {
    const disc = (x, y, r, col) => { g.beginPath(); g.ellipse(x, ey + y, r, r, 0, 0, 2 * Math.PI); g.fillStyle = col; g.fill(); };
    for (const [x, y, r] of [[-0.238, -0.118, 0.021], [-0.178, -0.152, 0.015]]) { disc(x, y, r + 0.004 * k, K.INK); disc(x, y, r - 0.004 * k, K.WHITE); }
    for (const [x, y, r] of [[-0.228, -0.176, 0.0105], [-0.19, -0.1, 0.0095], [-0.284, -0.15, 0.0095]]) disc(x, y, r * (0.7 + 0.3 * k), K.INK);
  },
  // a toddler's round cheeks: a short curve low on each side
  cheeks(g, { my, k }) {
    for (const s of [-1, 1]) K.taper(g, K.bez([s * 0.205, my + 0.05], [s * 0.168, my + 0.02], [s * 0.168, my - 0.035], [s * 0.215, my - 0.06], 10), 0.0075 * k, K.INK, 0.3);
  },
};
