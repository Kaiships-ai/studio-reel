// Face style s2, the rubber face (Kai 21/11 on Hot Money ep01 r5 reel 1: "biểu cảm này quá ok rồi nhé. v6 ok, ưng 9.5/10").
// The default face style (Kai 21/11) and, since 25/11, the only one the studio draws: play.js loads this module and calls use() before the stage is
// built. Its designs (EXPR entries with style 's2') are drawn here on the figure's face canvas (faces.js STYLE_DRAW); their
// standard numbers (eye radii, lid, white, brow, mouth width, gaze) mean what they mean in faces.js, so the engine's change
// clocks, anticipation, blinks and face gates read them; `x` carries what only s2 draws:
//   mC mouth curve, mSk skew, mOpen, mTeeth, mGrim (clenched grimace), mPr (pressed lips), mWv (wobble), mPul (strain pulse),
//   mGlp (gulp); eSt eye stretch, eCr / eCrR squeeze into > < (and its ramp through a hold), shutDK; bIn brows in, bWag /
//   bWig / bFl brow life, sly (the dare's late narrowing); gY gaze down, gSh eyes slide, gJit darting pupils; sw sweat drop;
//   zRamp / aLid a take re-timed over N frames with the lids dropped in its anticipation; pBot / pScMin / pScMin2 a face
//   that keeps its size under a bowed hood.
// The look: tall white almond eyes close together with dot pupils that squash to a line and bend into > <, heavy crescent
// brows, a wide elastic mouth with corner brackets, an eek grimace, a sly lopsided dare, a cheek "C" as he chews. The eyes
// lead a take, the brows a frame later, the mouth two (F.prev); marks thicken on a small face (F.hpx); under a hood or a cap
// the face fits the window the lens sees (plate3) and answers the head's turn itself (turn, o.sl).
// Designs: y_ the lead's faces, c_ a second character's (Hot Money's cop).
import { EXPR, STYLE_DRAW, FACE_STYLE, DRAW_KIT as K, mixFace } from '../faces.js';
import { FACE_TIMING, TAKE, SMALL_TAKE, BLINKS, CHEW } from '../acting.js';
import { DEG, clamp, lerp } from '../mathx.js';
import { EYE, pupil, restLid } from '../eyegeom.js';

const sineIO = x => 0.5 - 0.5 * Math.cos(Math.PI * clamp(x));
const chewPh = (F, t, late = 0) => (F.chewX || 0) * Math.sin(Math.PI * (t - late) / CHEW.T) ** 2;
const chewSide = (t, late = 0) => Math.sin(Math.PI * (t - late) / CHEW.T);
const bump = (a, a0, len) => Math.sin(Math.PI * clamp((a - a0) / len)) ** 2;
const r2k = F => clamp(Math.sqrt(230 / Math.max(40, F.hpx || 230)), 1, 1.75);
const LEAD = 0.50, LEAD_M = 0.30, RAMP_LEAD = 0.18, RAMP_LEAD_M = 0.10;
const SHUT = 0.6;   // the crunch share at which the squint has closed to a line (beyond it the line bends into > <)
const DARTS = [-0.9, 0.8, -0.3, 0.95, -0.7, 0.2, 0.85, -0.6];
const dart = t => { const i = Math.floor(t / 6), a = t - i * 6, n = DARTS.length; return lerp(DARTS[((i - 1) % n + n) % n], DARTS[i % n], sineIO(a / 2)); };

// the window the lens sees of the face, in the flat drawing's units: from the plate's top (o.top) down to BOT on screen
// (a hood's lower rim, measured at -0.38 to -0.41 W in OPEN; a cap leaves the chin, -0.42), which the slide moves (sl[1] < 0 when
// the lens looks down). The face fits it: the mouth rises toward the eyes (MUP), the brows come down to GAP over the eyes
// (brows lying on the lids read sleepy, on > < they merged into squiggles), the face scales about the eye line (SCMIN),
// then the brows close to GAP_MIN and the face scales on to SCMIN2; only then the brows fade (a fading brow is a smudge).
// The mouth is placed first: a bowed head lost it under the chin.
// (TUNE: gaps are brow edge to eye edge; the turn numbers are explained at turn() below)
const TUNE = { botHood: -0.39, botCap: -0.42, mUp: 0.07, scMin: 0.60, scMin2: 0.45, gap: 0.025, gapMin: 0.008, yf0: 1.22, yf1: 1.34, yk2: 0.85, yc: 1.30, yfCap: [1.30, 1.45], breathC: -0.6 };
function plate3(top, bot, P) {
  const R = { sc: 1, sh: 0, mUp: 0, cut: 0, lk: 1, browA: 1, eyeA: 1 };
  if (top == null) return R;
  const avail = top - bot, room = Math.max(0, P.roomGap);
  let need = P.browTop - P.mouthBot - avail;
  const { mUp: MUP, gap: GAP, gapMin: GAP_MIN } = TUNE, SCMIN = Math.max(TUNE.scMin, P.scMin || 0), SCMIN2 = Math.max(TUNE.scMin2, P.scMin2 || 0);   // (a design may keep its face bigger: x.pScMin, x.pScMin2)
  if (need > 0) { R.mUp = Math.min(MUP, need); need -= R.mUp; }
  if (need > 0) { R.cut = Math.min(need, Math.max(0, room - GAP)); need -= R.cut; }
  const fit = () => (P.browTop - R.cut) - (P.mouthBot + R.mUp);
  if (need > 0) R.sc = Math.max(SCMIN, avail / fit());
  if (fit() * R.sc > avail) { R.cut = Math.max(R.cut, Math.min(room - GAP_MIN, P.browTop - P.mouthBot - R.mUp - avail / R.sc)); R.sc = Math.max(SCMIN2, Math.min(R.sc, avail / fit())); }
  const bt = P.browTop - R.cut, mb = P.mouthBot + R.mUp, hi = top - bt * R.sc, lo = bot - mb * R.sc;
  R.sh = lo <= hi ? Math.min(Math.max(0, lo), hi) : lo;
  let over = bt * R.sc + R.sh - top;
  if (over > 0 && P.lift > 0) { const lc = Math.min(over / R.sc, P.lift); R.lk = 1 - lc / P.lift; over -= lc * R.sc; }
  R.browA = clamp(1 - over / 0.035);
  R.eyeA = clamp(1 - (P.eyeTop * R.sc + R.sh - top) / 0.05);
  return R;
}
// the head's turn (o.sl = [face yaw rad, dy, vis, sin elevation]): the marks follow the skull to YK (a hood's side rim is
// nearer: at 0.48 rad it cut the mouth), then only a tenth as far (a quarter left the far eye on the head's outline, cut in
// half): T.w is the yaw faces.js wraps the drawing round the head at (STYLE_DRAW.s2.wrap), so each mark is foreshortened by
// its own place on the ball. (Until 22/11 the drawing was slid back across the flat canvas by 0.462 sin(eff - yaw) and then
// wrapped at the full yaw: a mark taken from the drawing's edge came out cos(a + yaw) / cos(a) wider, 4x on an eye at a
// 1.1 rad turn, 7.5x at the worst column: Hot Money A v10a's hero face crammed on his hood's edge, a teller's eye a wide black band. tools/gates/facegate.mjs.)
// A hood or cap top that dropped for the turn comes back up as far as the marks came back. Near profile (Hot Money r5 reel 1: a grey ghost face on a head still half
// open to the lens, 239 part-faded frames with a 0.88-1.38 fade): under a cap, past yk2 the marks catch up with the skull,
// reaching it at yc, and fade over yfCap as the strips carry them round the outline; under a hood they stay held back inside
// the rim (caught up, the rim cut them) and fade between yf0 and yf1, where the opening is a sliver
const YK_CAP = 0.45, YK_HOOD = 0.30, YS = 0.10;
// A bare head (no hood or cap plate, o.top null) has no rim to keep the marks inside: they turn with the skull all the way
// and fade as a cap's do (Kai 23/11, Ep1 v12 1:12: the blond teller's face held at a hood's 0.30 rad while her head turned
// 1.1 rad on the phone; the face slid across her head under her hair)
function turn(o) {
  const bare = o.top == null, YK = o.edge ? YK_CAP : YK_HOOD, sl = o.sl, ya = sl ? Math.abs(sl[0]) : 0, sg = sl && sl[0] < 0 ? -1 : 1;
  let eff = bare || ya <= YK ? ya : YK + (ya - YK) * YS;
  const { yk2, yc } = TUNE;
  if (!bare && o.edge && ya > yk2) { const e2 = YK + (yk2 - YK) * YS; eff = ya >= yc ? ya : e2 + (ya - yk2) * (yc - e2) / (yc - yk2); }
  const m = x => Math.min(1, Math.max(0, x - (o.topKnee || 0)) / 0.3);
  const [f0, f1] = o.edge || bare ? TUNE.yfCap : [TUNE.yf0, TUNE.yf1];
  return { a: clamp((f1 - ya) / (f1 - f0)), w: sg * eff,
    top: o.top == null ? null : o.top + (o.topSide || 0) * (m(ya) - m(eff)), bot: (o.edge ? TUNE.botCap : TUNE.botHood) - (sl ? sl[1] : 0) };
}
// a take into a design with x.zRamp = N: its accent re-timed over N frames from the key, eased at both ends (eyes on the
// key, brows a frame ahead, mouth a frame behind; the anticipation's squeeze lets go over 4 f), from the smaller lead the
// anticipation gave it. Past N the engine's hold and settle carry on from the same numbers.
function ramp(F) {
  const C = F.chg, N = C?.B?.x?.zRamp;
  if (!N || C.cls !== 'take' || C.a < 0 || C.a >= N) return F;
  const over = TIMING.take.over, top = 1 + over, a = C.a;
  const ul = top * sineIO((a + 1) / N), ub = RAMP_LEAD + (top - RAMP_LEAD) * sineIO((a + 2) / N), um = RAMP_LEAD_M + (top - RAMP_LEAD_M) * sineIO(a / N);
  const M = mixFace({ a: C.A, b: C.b, u: ul, uf: { brow: ub, lid: ul, mouth: um, gaze: 1 }, ug: 1, antic: 1 - sineIO((a + 1) / 4), squeeze: false }).F;
  return { ...M, gx: F.gx, gy: F.gy, chewX: F.chewX, breathX: F.breathX, age: F.age, hpx: F.hpx, ph: F.ph, cls: null, chg: null, prev: null, rampA: true, aLid: C.B.x.aLid };
}
// the mouth's lowest ink below its line (the plate keeps it in the window); a chew counts a fixed share, so the plate does
// not breathe with each chew
function mouthDrop(F) {
  const X = F.x, open = Math.max(X.mOpen || 0, F.talk ? F.talk.open : 0), c = X.mC ?? 0;
  if ((F.chewX || 0) > 0.02) return 0.08;
  if ((X.mGrim || 0) > 0.02) return 0.045;
  if (open >= 0.06) return c > 0.4 ? 0.040 + 0.110 * clamp(open, 0, 1.2) - 0.034 * c + 0.01 : 0.016 + 0.105 * clamp(open, 0, 1.2);
  return 0.03;
}
function crescent(g, ex, s, by, tilt, arch, half, th, end = 0.25) {
  const tn = Math.tan(tilt * DEG), pts = [];
  for (let i = 0; i <= 14; i++) { const u = i / 14, x = ex + s * (-half + 2 * half * u), y = by + arch * (1 - (2 * u - 1) ** 2) - tn * half * (1 - 2 * u); pts.push([x, y]); }
  K.taper(g, pts, th, K.INK, end);
}
// the line an eye closes to: tilted like the brow, sagging a little (sk: the sag's share); mid(uu) is its height at uu = (x - ex) / w
const shutMid = (s, w, tilt, sk = 1) => { const tin = -Math.tan(clamp(tilt, -30, 30) * DEG) * 0.55, sag = 0.18 * w * sk; return uu => -tin * w * s * uu - sag * (1 - uu * uu); };
// the shut eye bending into a chevron pointing at the nose (cr 0..1); at cr 0 it is the squint's last line
function shutEye(g, ex, s, y, w, k, tilt, cr, sk = 1) {
  const mid = shutMid(s, w, tilt, sk), h = 0.95 * w, apex = ex - s * w * 0.80, pts = [];
  for (let i = 0; i <= 12; i++) {
    const u = i / 12, x = ex + s * w * (1 - 2 * u), arc = [x, y + mid((x - ex) / w)];
    const v = u < 0.5 ? u * 2 : (u - 0.5) * 2, O = ex + s * w;
    const chev = u < 0.5 ? [lerp(O, apex, v), lerp(y + h, y, v)] : [lerp(apex, O, v), lerp(y, y - h, v)];
    pts.push([lerp(arc[0], chev[0], cr), lerp(arc[1], chev[1], cr)]);
  }
  K.taper(g, pts, (0.0095 + 0.011 * cr) * k, K.INK, 0.75 - 0.4 * cr);
}
// the eye: an almond whose two lids squash toward the shut line (q 0 open .. 1 a line); the profile sharpens from an
// ellipse into an almond as it crunches; the pupil stays in it, clipped, until the line
function almondPts(ex, yc, w, hT, hB, e, mid, q) {
  const up = [], dn = [];
  for (let i = 0; i <= 24; i++) { const uu = -1 + 2 * i / 24, p = (1 - uu * uu) ** e, m = q * mid(uu), x = ex + w * uu; up.push([x, yc + m + hT * p]); dn.push([x, yc + m - hB * p]); }
  return [...up, ...dn.reverse()];
}
// the crunch: the design's eCr plus a squeeze it ramps in while held (eCrR over the hold's frames 4-24: the grip squeezes
// harder all through the hold, no face key of its own; a change out of it starts from the squeeze's end)
const crunch = F => (F.x.eCr || 0) + (F.x.eCrR || 0) * (F.chg?.A?.x?.eCrR ? 1 : sineIO(((F.age ?? 0) - 4) / 20));
function eye4(g, F, ex, s, ey, blink, t, k, tilt, gxs, life) {
  const mid0 = F.mid ? F.mid.e : 0, st = clamp(1 + 0.22 * mid0 * (F.dEye || 0) - 0.30 * (F.antic || 0) + (F.x.eSt || 0) + life - 0.18 * clamp(chewPh(F, t, 1)), 0.5, 1.5);
  const cr = clamp(crunch(F)), cq = clamp(cr / SHUT), bl = clamp(blink), q = 1 - (1 - cq) * (1 - bl);
  const rx = F.rx * st ** -0.6 * (1 + 0.10 * bl), ry0 = F.ry * st, w = rx * (1 - 0.08 * q), yc = ey - ry0 * 0.10 * q, h = ry0 * (1 - q);
  // a squeeze (not a blink) closes to a straight level line: a sagging line read sleepy, one tilted like worried brows sad
  const tE = tilt * (1 - cq), sk = 1 - cq;
  if (q >= 0.999 || h < 0.006) { shutEye(g, ex, s, yc, w, k * (1 + (F.x.shutDK || 0)), tE, clamp((cr - SHUT) / (1 - SHUT)), sk); return; }
  const mid = shutMid(s, w, tE, sk), e = 0.5 + 0.35 * cq, lw = 0.018 * k, pts = almondPts(ex, yc, w, h, h, e, mid, q);
  // the pupil (engine/eyegeom.js: big enough to fill the eye, a wide-eyed design shrinks it only a little)
  const wP = clamp(F.prev ? F.prev[0].white : F.white || 0), kp = 1 + 0.45 * (k - 1), { prx, pry } = pupil(wP, kp, q);
  const pyc = -0.014 * (1 - q) + ((F.gy || 0) + (F.x.gY || 0)) * Math.max(0, h - pry - 0.01) * 0.8;
  // the design's lids (a lid share L from the top, a raised lower lid) clip the almond, never below a white slit; the upper
  // lid rests on the pupil's top (eyegeom.js restLid: white above it only for fear and shock), eased out as the eye closes
  const L0 = Math.min(0.89, clamp(F.lid, 0, 0.92)), L = L0 + (restLid(L0, h, pyc, pry, wP) - L0) * (1 - q);
  const slope = Math.tan((F.lidTilt || 0) * DEG) * s, low = clamp(F.low || 0);
  let top = yc + h * (1 - 2 * L), lowY = yc - h + low * h * 1.2;
  const minOpen = (0.056 + 0.012 * (k - 1)) * (1 - q);
  if (top - lowY < minOpen) { const c = Math.min(Math.max((top + lowY) / 2, yc - h + minOpen / 2), yc + h - minOpen / 2); top = c + minOpen / 2; lowY = c - minOpen / 2; }
  const m0 = q * mid(0);
  g.save();
  g.beginPath(); g.moveTo(ex - 0.3, top + m0 - 0.3 * slope); g.lineTo(ex + 0.3, top + m0 + 0.3 * slope); g.lineTo(ex + 0.3, lowY + m0); g.lineTo(ex - 0.3, lowY + m0); g.closePath(); g.clip();
  K.fill(g, pts, K.WHITE);
  g.save(); K.path(g, pts, true); g.clip();
  const look = clamp((F.gx || 0) + (F.cross || 0) * s - 0.12 * s + (F.x.gJit || 0) * dart(t), -1.2, 1.2) * (1 - cq) * clamp(((top - lowY) / Math.max(1e-4, 2 * h) - 0.35) / 0.40);   // a squeezed or narrowed eye looks nearly straight (a pupil at the end of a slit read sly: the scrutiny's eye beside the bill read as a grin)
  const px = ex + gxs + look * Math.max(0, w - prx - 0.004) * 0.92;
  const lo = Math.max(lowY, yc - h) + m0, hi = Math.min(top, yc + h) + m0, open = hi - lo;
  let py = yc + m0 + pyc;
  py = open > 2 * pry ? Math.min(Math.max(py, lo + pry), hi - pry) : (lo + hi) / 2;
  g.beginPath(); g.ellipse(px, py, prx, pry, 0, 0, 2 * Math.PI); g.fillStyle = K.INK; g.fill();
  const [cx, cy, cw, ch2] = EYE.catch;   // the catch light at the pupil's upper edge (centred, it read as a ring)
  if ((F.x.eStar || 0) >= 0.5 && open > 1.6 * pry) { star(g, px + prx * 0.22, py + pry * 0.26, prx * 0.86); g.beginPath(); g.ellipse(px - prx * 0.38, py - pry * 0.42, prx * 0.17, pry * 0.17, 0, 0, 2 * Math.PI); g.fill(); }
  else if (wP < 0.7 && open > 1.6 * pry && pry > 0.012) { g.beginPath(); g.ellipse(px + prx * cx, py + pry * cy, prx * cw, pry * ch2, 0, 0, 2 * Math.PI); g.fillStyle = K.WHITE; g.fill(); }
  g.restore();
  K.path(g, pts, true); g.lineWidth = lw; g.strokeStyle = K.INK; g.stroke();
  g.restore();
  // the upper lid's crease line: drawn for any lid past 0.10, the rest lid included, so a calm face now shows its lid resting
  // on the pupil (Kai 22/11 before|after: the stare is gone, the face reads relaxed)
  const kk = clamp((L - 0.10) / 0.12), ch = w * Math.sqrt(Math.max(0, 1 - ((top - yc) / h) ** 2)) * 1.06;
  if (kk > 0.02 && ch > 0.004) K.line(g, [[ex - ch, top + m0 - ch * slope], [ex + ch, top + m0 + ch * slope]], 0.016 * k * (0.4 + 0.6 * kk));
  // a raised lower lid draws its own line (the clip cut the rim open and the eye read as a broken "(")
  const kl = clamp((low - 0.04) / 0.10), cb = w * Math.sqrt(Math.max(0, 1 - ((lowY - yc) / h) ** 2)) * 1.02;
  if (kl > 0.02 && cb > 0.004) K.line(g, [[ex - cb, lowY + m0], [ex + cb, lowY + m0]], 0.016 * k * (0.4 + 0.6 * kl));
}
// the bracket at a mouth corner (a dimple), its size fixed
function bracket(g, xc, yc, sd, k, b = 0.016, up = 0) {
  K.taper(g, K.bez([xc - sd * 0.004, yc + b + up], [xc + sd * 0.010, yc + b * 0.5 + up], [xc + sd * 0.010, yc - b * 0.5], [xc - sd * 0.004, yc - b], 8), 0.0065 * k, K.INK, 0.35);
}
function mouth4(g, F, t, y0, k, glp) {
  const tk = F.cls === 'take' || F.cls === 'small', P = tk && F.prev ? F.prev[1] : null;
  let X = P ? P.x : F.x; const mw = P ? P.mw : F.mw, C = F.chg;
  if (C && C.cls === 'take' && F.prev) {
    const Lm = C.B.x?.zRamp ? RAMP_LEAD_M : LEAD_M, wm = C.a < 0 ? Lm * sineIO((C.a + C.antic + 1) / (C.antic + 1)) : Lm * Math.max(0, 1 - F.prev[1].u);
    X = { ...X }; for (const n of ['mC', 'mSk']) X[n] = (X[n] || 0) + ((C.B.x[n] || 0) - (C.A.x?.[n] || 0)) * wm;
  }
  const cx = F.chewX || 0;
  if (cx > 0.02) return chewMouth6(g, F, X, mw, t, y0, k, cx);
  const open = Math.max(X.mOpen || 0, F.talk ? F.talk.open : 0), breathOpen = F.talk && F.talk.open > (X.mOpen || 0);
  const c = breathOpen ? Math.min(X.mC ?? 0, TUNE.breathC) : X.mC ?? 0;   // a breath opens the mouth arched down (an open D on the alert face read as a smile)
  const sk = X.mSk || 0, grim = clamp(X.mGrim || 0), pul = (X.mPul || 0) * Math.sin(2 * Math.PI * t / 11);
  const w = 0.105 * (mw || 1) * (1 + 0.10 * (F.breathX || 0) * grim) * (1 + 0.07 * pul) * (1 - 0.22 * glp);
  const x0 = F.mx || 0, y = y0 + 0.016 * glp;
  const corner = sd => [x0 + sd * w, y + c * 0.024 + sk * 0.020 * sd - 0.010 * grim];
  const midY = y - c * 0.020, wv = (X.mWv || 0) * 0.005;
  const curve = (kq = 0) => { const pts = []; for (let i = 0; i <= 18; i++) { const u = i / 18, q = 2 * u - 1, [, yl] = corner(-1), [, yr] = corner(1);
    pts.push([x0 - w + 2 * w * u, yl + (yr - yl) * u + (midY - (yl + yr) / 2) * (1 - q * q) + kq * (1 - q * q) + wv * Math.sin(3 * Math.PI * u + t * 0.55)]); } return pts; };
  if (grim > 0.02) {
    const hg = 0.056 * grim * (1 + 0.15 * (F.breathX || 0)) * (1 + 0.18 * pul), up = curve(hg * 0.5), dn = curve(-hg * 0.5).reverse(), pts = [...up, ...dn];
    K.fill(g, pts, K.WHITE, 0.013 * k);
    g.save(); K.path(g, pts, true); g.clip(); K.line(g, curve(0), 0.008 * k);
    for (let i = 1; i < 6; i++) { const xx = x0 - w + 2 * w * i / 6; K.line(g, [[xx, y + 0.06], [xx, y - 0.08]], 0.008 * k); }
    g.restore();
  } else if (open >= 0.06 && c > 0.4) return grin(g, X, x0, y, w, c, open, sk, k);
  else if (open >= 0.06) {
    const h = 0.014 + 0.105 * clamp(open, 0, 1.2), up = curve(0.004), dn = curve(-h).reverse(), pts = [...up, ...dn];
    K.fill(g, pts, K.INK);
    const tt = Math.max(X.mTeeth || 0, clamp((open - 0.35) / 0.2));
    if (tt > 0.02) { g.save(); K.path(g, pts, true); g.clip(); K.fill(g, [...curve(0.004), ...curve(-0.020 * tt).reverse()], K.WHITE); g.restore(); }
  } else K.taper(g, curve(0), (0.0175 + 0.008 * clamp(X.mPr || 0) + 0.003 * glp) * k, K.INK, 0.7);
  for (const sd of [-1, 1]) { const [xc, yc] = corner(sd); bracket(g, xc, yc, sd, k); }
}
// the dare's grin: a wide open D, its corners pulled up into dimples, a strip of top teeth
function grin(g, X, x0, y, w, c, open, sk, k) {
  const lift = 0.034 * c, h = 0.040 + 0.110 * clamp(open, 0, 1.2), cy = sd => y + lift + sk * 0.014 * sd;
  const L = [x0 - w, cy(-1)], R = [x0 + w, cy(1)];
  const top = K.bez(L, [x0 - w * 0.45, y + lift * 0.10], [x0 + w * 0.45, y + lift * 0.10], R, 18);
  const bot = K.bez(R, [x0 + w * 0.80, y - h], [x0 - w * 0.80, y - h], L, 22);
  const pts = [...top, ...bot];
  K.fill(g, pts, K.INK);
  const tt = clamp(X.mTeeth || 0);
  if (tt > 0.02) { g.save(); K.path(g, pts, true); g.clip();
    K.fill(g, [...K.bez([x0 - w, cy(-1) + 0.01], [x0 - w * 0.45, y + lift * 0.10 + 0.01], [x0 + w * 0.45, y + lift * 0.10 + 0.01], [x0 + w, cy(1) + 0.01], 18),
      ...K.bez([x0 + w, cy(1) - 0.034 * tt], [x0 + w * 0.45, y + lift * 0.10 - 0.040 * tt], [x0 - w * 0.45, y + lift * 0.10 - 0.040 * tt], [x0 - w, cy(-1) - 0.034 * tt], 18)], K.WHITE);
    g.restore(); }
  K.path(g, pts, true); g.lineWidth = 0.014 * k; g.strokeStyle = K.INK; g.stroke();   // (white teeth with no lip line merged into the face)
  for (const sd of [-1, 1]) bracket(g, x0 + sd * (w + 0.004), cy(sd) + 0.002, sd, k, 0.020, 0.006);
}
// the cheek "C" (v1's chewing mark, Kai's pick): the free corner's bracket grown (gr 0..1) into a C round the corner, its
// two tips either side of the corner so it never floats; it swells (pf 0..1) as the mouth mashes shut. Solid ink, one
// stroke, its size a smooth function of the chew (v1's faded in and out grey, jumped sides and floated off the mouth; a C
// hung from the corner by its low end read as a hook at sheet size, sheet variants A-C)
function cheekC(g, xc, yc, k, gr, pf) {
  const r = lerp(0.020, 0.055 * (0.88 + 0.24 * pf), gr), sp = lerp(1.0, 1.25, gr);
  const cx = xc + 0.004 + 0.36 * r, cy = yc + 0.22 * r, pts = [];
  for (let i = 0; i <= 16; i++) { const a = Math.PI - sp + 2 * sp * i / 16; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  K.taper(g, pts, lerp(0.0065, 0.016, gr) * k, K.INK, 0.45);
}
// chewing on the free side (screen left; the fist covers the right corner), v5's chew at v4's width plus a quarter (v5's
// half again left the C no room): each chew the jaw drops
// a little and the mouth opens into a round dark gap, its top lip lifting, then mashes shut into a wide lumpy smile (the
// comic note: a cold hot dog, and he is enjoying it anyway)
function chewMouth6(g, F, X, mw, t, y0, k, cx) {
  const ph = chewPh(F, t), side = chewSide(t), op = cx * clamp((ph - 0.25) / 0.75), c = (X.mC ?? 0) + 0.45 * cx * (1 - op);
  const w = 0.105 * (mw || 1) * 0.90 * (1 - 0.10 * op), x0 = (F.mx || 0) - 0.070 * cx + 0.014 * cx * side, y = y0 + 0.020 * cx - 0.030 * ph;
  const corner = sd => [x0 + sd * w, y + c * 0.022 + 0.012 * cx * side * sd];
  const curve = (kq = 0, e = 1) => { const pts = []; for (let i = 0; i <= 18; i++) { const u = i / 18, q = 2 * u - 1, [, yl] = corner(-1), [, yr] = corner(1);
    pts.push([x0 - w + 2 * w * u, yl + (yr - yl) * u - c * 0.020 * (1 - q * q) + kq * (1 - q * q) ** e + 0.014 * cx * (1 - op) * Math.sin(Math.PI * t / CHEW.T) * Math.sin(2.5 * Math.PI * u)]); } return pts; };
  if (op > 0.03) { const h = 0.020 + 0.170 * op; K.fill(g, [...curve(0.024 * op, 0.5), ...curve(-h, 0.5).reverse()], K.INK, 0.012 * k); }
  else K.taper(g, curve(0), 0.028 * k, K.INK, 0.6);
  const [xl, yl] = corner(-1), [xr, yr] = corner(1);
  cheekC(g, xl, yl, k, clamp(cx / 0.9), 1 - clamp(chewPh(F, t, 1) / Math.max(cx, 1e-3)));
  bracket(g, xr, yr, 1, k, 0.018);
}
function sweat(g, sw, k, x = 0.188, y = 0.040) {
  if (sw < 0.03) return;
  const r = 0.024 * clamp(sw * 1.25), pts = [];
  for (let i = 0; i <= 20; i++) { const a = -Math.PI / 2 + (i / 20) * 2 * Math.PI, tip = Math.max(0, Math.sin(a)) ** 3; pts.push([x + r * Math.cos(a) * (1 - 0.85 * tip), y + r * Math.sin(a) + 1.4 * r * tip]); }
  g.globalAlpha = clamp(sw * 2); K.fill(g, pts, K.WHITE, 0.011 * k);
  g.beginPath(); g.ellipse(x - r * 0.30, y - r * 0.15, r * 0.20, r * 0.30, 0, 0, 2 * Math.PI); g.fillStyle = K.INK; g.globalAlpha *= 0.25; g.fill(); g.globalAlpha = 1;
}
// the catalogue's marks (Kai 25/11: every face in the V2.1 style plus the common story faces; then "chỉn chu, kỹ lưỡng
// hơn": each mark in V2.1's own strokes, tapered ink, a catch light on anything wet or shiny). Colour on the face is the
// head's own (a design's `tint`, cast.js), so it stops at the ink rim (a wash drawn on the face canvas left a pale
// rounded square inside the rim); marks off the head (zzz, question, steam, sparkle, anger) are the kit's head marks in
// ink and white (faces.js MARKS, a design's `marks`)
const TEAR = 'rgb(168,214,246)', HEART = 'rgb(232,52,74)', TONGUE = 'rgb(214,112,128)', BLUSH = 'rgb(240,152,166)', BLUSH_INK = 'rgb(206,72,98)';
// a stroke narrowing from half-width w0 at its first point to w1 at its last (a gloom line, a spiral wound to a point)
function sweep(g, pts, w0, w1, col = K.INK) {
  const n = pts.length - 1, a = [], b = [];
  for (let i = 0; i <= n; i++) {
    const [x, y] = pts[i], [px, py] = pts[Math.max(0, i - 1)], [qx, qy] = pts[Math.min(n, i + 1)], l = Math.hypot(qx - px, qy - py) || 1, w = lerp(w0, w1, i / n);
    a.push([x - (qy - py) / l * w, y + (qx - px) / l * w]); b.push([x + (qy - py) / l * w, y - (qx - px) / l * w]);
  }
  K.fill(g, [...a, ...b.reverse()], col);
}
// a shut smiling eye: bend +1 an arch leaning to the nose, its outer end dipping; -1 a sleeping curve
function arcEye(g, ex, s, ey, w, h, k, bend) {
  const lean = -s * 0.14 * w, y0 = ey - (bend > 0 ? 0.30 : -0.05) * h, dip = sd => (bend > 0 && sd === s ? 0.20 * h : 0);
  K.taper(g, K.bez([ex - w, y0 - dip(-1)], [ex - 0.5 * w + lean, y0 + 1.35 * bend * h], [ex + 0.5 * w + lean, y0 + 1.35 * bend * h], [ex + w, y0 - dip(1)], 18), (bend > 0 ? 0.022 : 0.018) * k, K.INK, 0.3);
}
function heart(g, x, y, r, k, rot = 0) {
  const c = Math.cos(rot * DEG), sn = Math.sin(rot * DEG), at = (u, v) => [x + u * c - v * sn, y + u * sn + v * c], pts = [];
  for (let i = 0; i <= 48; i++) { const a = 2 * Math.PI * i / 48; pts.push(at(r * Math.sin(a) ** 3, r * ((13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16 + 0.14))); }
  K.fill(g, pts, HEART, 0.014 * k);
  const [hx, hy] = at(-0.42 * r, 0.42 * r);
  g.beginPath(); g.ellipse(hx, hy, 0.17 * r, 0.11 * r, (rot + 40) * DEG, 0, 2 * Math.PI); g.fillStyle = K.WHITE; g.fill();
}
// a dizzy eye: the resting almond, its pupil a spiral of two and a quarter turns wound to a point at the eye outline's weight
function spiralEye(g, ex, s, ey, w, h, k) {
  const pts = almondPts(ex, ey, w, h, h, 0.5, () => 0, 0), sp = [];
  K.fill(g, pts, K.WHITE);
  g.save(); K.path(g, pts, true); g.clip();
  for (let i = 0; i <= 56; i++) { const u = i / 56, a = s * u * 4.5 * Math.PI; sp.push([ex + w * 0.8 * u * Math.cos(a), ey + h * 0.8 * u * Math.sin(a)]); }
  sweep(g, sp, 0.0015 * k, 0.0095 * k);
  g.restore();
  K.path(g, pts, true); g.lineWidth = 0.018 * k; g.strokeStyle = K.INK; g.stroke();
}
function drop(g, x, y, r, k) {
  const pts = [...K.bez([x, y + 2.1 * r], [x + 0.3 * r, y + 1.1 * r], [x + r, y + 0.45 * r], [x + r, y - 0.2 * r], 8), ...K.bez([x + r, y - 0.2 * r], [x + r, y - 1.3 * r], [x - r, y - 1.3 * r], [x - r, y - 0.2 * r], 10),
    ...K.bez([x - r, y - 0.2 * r], [x - r, y + 0.45 * r], [x - 0.3 * r, y + 1.1 * r], [x, y + 2.1 * r], 8)];
  K.fill(g, pts, TEAR, 0.0075 * k);
  g.beginPath(); g.ellipse(x - 0.4 * r, y - 0.3 * r, 0.2 * r, 0.32 * r, 0.3, 0, 2 * Math.PI); g.fillStyle = K.WHITE; g.fill();
}
// tears: a drop on the lower lid's outer corner (x.tear < 0.6; on a shut > < eye, at its outer tip), or (crying hard) a
// stream: a ribbon from the eye's outer corner curving out past the mouth, wide at the eye, narrowing to a drop
function tears(g, tr, ex, s, ey, ry, k, t, shut) {
  if (tr < 0.03) return;
  if (tr < 0.6) { const r = 0.013 + 0.006 * tr; if (shut) drop(g, ex + s * 0.068, ey - 0.082, r * 1.15, k); else drop(g, ex + s * 0.052, ey - ry * 0.86 - 0.018, r, k); return; }
  const x0 = ex + s * 0.045, y0 = ey - 0.03, L = 0.16, up = [], dn = [], mid = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16, x = x0 + s * 0.05 * u ** 1.5 + 0.003 * Math.sin(u * 8 - t * 0.35), y = y0 - L * u, wd = 0.022 - 0.014 * u; up.push([x + wd, y]); dn.push([x - wd, y]); mid.push([x - s * 0.4 * wd, y]); }
  K.fill(g, [...up, ...dn.reverse()], TEAR, 0.0075 * k);
  K.taper(g, mid.slice(2, 13), 0.003 * k, K.WHITE, 0.3);
  drop(g, x0 + s * 0.05, y0 - L - 0.026, 0.016, k);
}
// a blush: a flat pink oval on each cheek, hard-edged, crossed by three crisp slashes (a soft-edged one read as a glow)
function blushCheeks(g, k) {
  for (const s of [-1, 1]) {
    const cx = s * 0.158, cy = -0.112;
    g.beginPath(); g.ellipse(cx, cy, 0.046, 0.022, 0, 0, 2 * Math.PI); g.fillStyle = BLUSH; g.fill();
    for (let j = -1; j <= 1; j++) K.taper(g, [[cx + j * 0.018 - 0.007, cy - 0.011], [cx + j * 0.018, cy], [cx + j * 0.018 + 0.007, cy + 0.011]], 0.005 * k, BLUSH_INK, 0.35);
  }
}
// a kiss: lips pushed out into a "3" toward the side the eyes look, two pucker creases behind, a heart rising off it
function kissMouth(g, x0, y, k, sd) {
  const r = 0.026, L = x0 - sd * 0.004;
  K.taper(g, [[L, y + 2 * r], ...K.bez([x0, y + 2 * r], [x0 + sd * 1.9 * r, y + 2.05 * r], [x0 + sd * 1.8 * r, y + 0.15 * r], [x0 + sd * 0.25 * r, y], 10),
    ...K.bez([x0 + sd * 0.25 * r, y], [x0 + sd * 1.8 * r, y - 0.15 * r], [x0 + sd * 1.9 * r, y - 2.05 * r], [x0, y - 2 * r], 10), [L, y - 2 * r]], 0.019 * k, K.INK, 0.15);
  for (const j of [-1, 1]) K.taper(g, [[x0 - sd * 0.014, y + j * 0.012], [x0 - sd * 0.032, y + j * 0.019]], 0.0065 * k, K.INK, 0.3);
  heart(g, x0 + sd * 0.098, y + 0.072, 0.028, k * 0.8, -sd * 14);
}
// a round open mouth (yawn, scream; x.mO its depth, up to 1.4 for a yawn): a stretched oval, its upper lip curved, its
// bottom squashed, the tongue low in it, on a scream (x.oTeeth) a strip of top teeth; its rim at the grin's weight, a
// bracket at each corner
function oMouth(g, x0, y, mw, mO, k, teeth, wv, t) {
  const w = (0.040 + 0.024 * Math.min(1, mO)) * (mw || 1), h = 0.06 + 0.14 * mO, top = y + 0.016, L = [x0 - w, top - 0.012], R = [x0 + w, top - 0.012], b = top - h;
  const up = K.bez(L, [x0 - w * 0.55, top + 0.016], [x0 + w * 0.55, top + 0.016], R, 14);
  const dn = [...K.bez(R, [x0 + w * 1.45, top - h * 0.5], [x0 + w * 0.9, b - 0.004], [x0, b], 12), ...K.bez([x0, b], [x0 - w * 0.9, b - 0.004], [x0 - w * 1.45, top - h * 0.5], L, 12)]
    .map(([x, yy], i) => [x + wv * 0.0045 * Math.sin(i * 1.7 + t * 0.9), yy]);
  const pts = [...up, ...dn];
  K.fill(g, pts, K.INK);
  g.save(); K.path(g, pts, true); g.clip();
  g.beginPath(); g.ellipse(x0, b + h * 0.2, w * 0.78, h * 0.22, 0, 0, 2 * Math.PI); g.fillStyle = TONGUE; g.fill();
  if (teeth >= 0.5) K.fill(g, [...K.bez([x0 - w, top], [x0 - w * 0.5, top + 0.016], [x0 + w * 0.5, top + 0.016], [x0 + w, top], 14), ...K.bez([x0 + w, top - 0.03], [x0 + w * 0.5, top - 0.016], [x0 - w * 0.5, top - 0.016], [x0 - w, top - 0.03], 14)], K.WHITE);
  g.restore();
  K.path(g, pts, true); g.lineWidth = 0.014 * k; g.strokeStyle = K.INK; g.stroke();
  for (const [sd, [xc, yc]] of [[-1, L], [1, R]]) bracket(g, xc - sd * 0.004, yc, sd, k);
}
// a snarl (disgust): the upper lip hitched on one side into a kink over a few teeth, the other corner pulled down
function snarl(g, x0, y, w, sd, k) {
  const X = u => x0 + sd * u * w;
  const up = [...K.bez([X(-1), y - 0.018], [X(-0.3), y - 0.014], [X(0.2), y + 0.03], [X(0.48), y + 0.034], 10), ...K.bez([X(0.48), y + 0.034], [X(0.7), y + 0.03], [X(0.86), y + 0.006], [X(1), y - 0.004], 8)];
  const lo = K.bez([X(0.02), y - 0.013], [X(0.35), y - 0.007], [X(0.7), y - 0.003], [X(0.96), y - 0.006], 10), gap = [...up.slice(7), ...lo.slice().reverse()];
  K.fill(g, gap, K.WHITE);
  g.save(); K.path(g, gap, true); g.clip(); for (const u of [0.3, 0.5, 0.7]) K.line(g, [[X(u), y + 0.04], [X(u), y - 0.012]], 0.006 * k); g.restore();
  K.taper(g, up, 0.0175 * k, K.INK, 0.5); K.taper(g, lo, 0.011 * k, K.INK, 0.4);
  bracket(g, X(1), y - 0.004, sd, k); bracket(g, X(-1), y - 0.018, -sd, k);
}
// the face's own comic marks: a shiver beside each cheek, gloom over the brow, bags under a sick eye, puffed cheeks by a
// queasy mouth, a thought trail, a sigh, the scrunch between disgusted eyes, a tongue out
function shiver(g, k) {
  for (const s of [-1, 1]) for (let j = 0; j < 2; j++) { const x = s * (0.262 + 0.024 * j); K.taper(g, [[x, -0.09 - 0.012 * j], [x - s * 0.005, -0.14], [x, -0.19 + 0.012 * j]], 0.0065 * k, K.INK, 0.3); }
}
function gloom(g, k) { for (let i = -2; i <= 2; i++) { const x = i * 0.042, L = 0.1 - 0.016 * Math.abs(i); sweep(g, [[x, 0.33], [x, 0.33 - L]], 0.0085 * k, 0.001 * k); } }
// heat (hot): three ink squiggles rising off the brow
function heat(g, k, t) { for (const x of [-0.075, 0, 0.075]) { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([x + 0.012 * Math.sin(u * 2.5 * Math.PI - t * 0.3 + x * 40), 0.245 + 0.1 * u]); } K.taper(g, pts, 0.0085 * k, K.INK, 0.25); } }
const bags = (g, ex, ey, k) => K.taper(g, K.bez([ex - 0.046, ey - 0.106], [ex - 0.02, ey - 0.128], [ex + 0.02, ey - 0.128], [ex + 0.046, ey - 0.106], 10), 0.0065 * k, K.INK, 0.3);
function puff(g, x0, y, w, k) {
  for (const sd of [-1, 1]) { const cx = x0 + sd * (w + 0.002), pts = []; for (let i = 0; i <= 12; i++) { const a = (sd > 0 ? 0 : Math.PI) + (i / 12 - 0.5) * 2.1; pts.push([cx + 0.036 * Math.cos(a), y + 0.004 + 0.042 * Math.sin(a)]); } K.taper(g, pts, 0.0095 * k, K.INK, 0.3); }
}
function dots(g, sd) { for (const [x, y, r] of [[0.212, 0.25, 0.012], [0.252, 0.298, 0.016], [0.296, 0.352, 0.021]]) { g.beginPath(); g.arc(sd * x, y, r, 0, 2 * Math.PI); g.fillStyle = K.INK; g.fill(); } }
function sigh(g, x, y, k) {
  const C = [[0, 0, 0.019], [0.027, 0.009, 0.024], [0.054, 0.001, 0.018]], lw = 0.0085 * k;
  for (const [dx, dy, r] of C) { g.beginPath(); g.arc(x + dx, y + dy, r + lw / 2, 0, 2 * Math.PI); g.fillStyle = K.INK; g.fill(); }
  for (const [dx, dy, r] of C) { g.beginPath(); g.arc(x + dx, y + dy, r - lw / 2, 0, 2 * Math.PI); g.fillStyle = K.WHITE; g.fill(); }
}
const scrunch = (g, k) => { for (const s of [-1, 1]) K.taper(g, [[s * 0.004, -0.07], [s * 0.016, -0.045], [s * 0.02, -0.03]], 0.0055 * k, K.INK, 0.3); };
function tongueOut(g, x, y, k) {
  K.fill(g, K.bez([x - 0.044, y + 0.006], [x - 0.05, y - 0.078], [x + 0.05, y - 0.078], [x + 0.044, y + 0.006], 18), TONGUE, 0.012 * k);
  K.taper(g, [[x, y - 0.006], [x, y - 0.04]], 0.0065 * k, K.INK, 0.4);
}
// sparkle eyes (x.eStar): a bold four-point star for the catch light
function star(g, x, y, r) {
  const pts = []; for (let i = 0; i < 8; i++) { const a = Math.PI / 2 + i * Math.PI / 4, q = i % 2 ? 0.36 * r : r; pts.push([x + q * Math.cos(a), y + q * Math.sin(a)]); }
  K.fill(g, pts, K.WHITE);
}
function face6(g, F, blink, t, o, T) {
  F = ramp(F);
  const tk = F.cls === 'take' || F.cls === 'small', C = F.chg, age = F.age ?? 99;
  let B = tk && F.prev ? F.prev[1].brow : F.brow;
  if (C && C.cls === 'take' && F.prev) {
    const Ld = C.B.x?.zRamp ? RAMP_LEAD : LEAD, u1 = F.prev[0].u, w = C.a < 0 ? Ld * sineIO((C.a + C.antic + 1) / (C.antic + 1)) : u1 + Ld * Math.max(0, 1 - u1);
    B = F.brow.map((x, i) => x + ((C.B.brow[i] ?? 0) - (C.A.brow[i] ?? 0)) * (w - C.u));
  }
  const [tilt, bh, arch = 0, lL = 0, lR = 0] = B, bh0 = bh + 0.03, dx = 0.084, bIn = F.x.bIn || 0;
  const wag = (F.x.bWag || 0) * (bump(age, 8, 6) + bump(age, 14, 6) + bump(age, 20, 6)) * 0.030;
  const glp = (F.x.mGlp || 0) * bump(age, 7, 10);
  let fl = 0; for (let j = 0; j < 7; j++) fl += bump(age, 7.5 * j - 1, 5); fl *= F.x.bFl || 0;
  const life = 0.12 * glp + 0.07 * fl, bUp = 0.022 * glp + 0.016 * fl;
  // the dare's life: the cocked brow wiggles twice as the smirk lands, then the eyes narrow slyly and stay narrowed, the
  // cocked brow a touch higher, the smirk's corner up (x.bWig, x.sly)
  const cock = lR >= lL ? 1 : -1, wig = (F.x.bWig || 0) * (bump(age, 6, 5) + 0.8 * bump(age, 11, 5)) * 0.024, sly = (F.x.sly || 0) * sineIO((age - 32) / 9);
  const bS = s => s === cock ? wig + 0.012 * sly : -0.006 * sly;
  // each chew: the brows bob up and the lower lids lift (a munch he enjoys; v4's brows dipped and read droopy)
  const chp = chewPh(F, t, 1), bob = 0.030 * chp;
  let Fe = chp > 0.001 ? { ...F, low: clamp((F.low || 0) + 0.30 * chp) } : F;
  // a ramp take's anticipation drops the lids over round eyes with their pupils (a squeezed eye beside the bill, v5, and a
  // squashed one, v4, read as a smirking mouth)
  const aq = C?.B?.x?.zRamp || F.rampA ? clamp(F.antic || 0) : 0;
  const aL = (F.rampA ? F.aLid : C?.B?.x?.aLid) ?? 0.16;   // (x.aLid: how far the anticipation drops the lids)
  if (aq > 0.001) Fe = { ...Fe, antic: 0, lid: Math.min(0.42, (Fe.lid || 0) + aL * aq), low: (Fe.low || 0) + 0.05 * aq * aL / 0.16 };
  if (sly > 0.001) Fe = { ...Fe, lid: (Fe.lid || 0) + 0.12 * sly, low: (Fe.low || 0) + 0.14 * sly };
  const Fm = sly > 0.001 ? { ...F, x: { ...F.x, mSk: (F.x.mSk || 0) + 0.30 * sly, mC: (F.x.mC ?? 0) + 0.15 * sly } } : F;
  const gxs = 0.030 * (F.x.gSh || 0) * clamp(F.gx || 0, -1, 1);
  const ey = F.x.eY || 0, my = -0.218 + (F.my || 0);
  const tiltUp = Math.abs(Math.tan(tilt * DEG)) * 0.068;
  const stE = 1 + 0.22 * (F.mid ? F.mid.e : 0) * (F.dEye || 0) + (F.x.eSt || 0) + life;   // (a change's stretch: tall eyes pushed the brows into the rim, OPEN 22)
  const ryMax = F.ry * Math.max(1.08, stE) * (1 - 0.45 * clamp(crunch(F) / SHUT)), th0 = 0.028 * (F.bw || 1);
  const browTop = ey + bh0 + Math.max(0, arch, lL, lR) + wag + wig + 0.012 * sly + bUp + bob + tiltUp + th0 + (o.edge ? 0.040 : 0.050);
  // the eye's real top (a > < chevron stands taller than the squint it came from) and the brow's lowest point (a tilted
  // crescent's low end, half its stroke): the brows never close onto the eyes (on > < they merged into squiggles)
  const eyeTop = Math.max(ryMax, 0.95 * F.rx * 1.05 * clamp((crunch(F) - SHUT) / (1 - SHUT))) + 0.004;
  const P = plate3(T.top, T.bot - (F.x.pBot || 0), { scMin: F.x.pScMin, scMin2: F.x.pScMin2, browTop, eyeTop: ey + eyeTop, mouthBot: my - mouthDrop(F), roomGap: bh0 - tiltUp - 0.5 * th0 - eyeTop, lift: Math.max(0, lL, lR) });
  const k = r2k(F) / Math.sqrt(P.sc), th = th0 * k ** 0.85;
  g.save(); g.translate(0, P.sh); g.scale(P.sc, P.sc);
  const X = F.x, on = n => (X[n] || 0) >= 0.5;   // a mark is there or not: it switches half-way through a change (the numbers mix)
  if (on('blush')) blushCheeks(g, k);
  if (on('shiver')) shiver(g, k);
  if (on('gloom')) gloom(g, k);
  if (on('heat')) heat(g, k, t);
  if (on('dots')) dots(g, (F.gx || 0) < 0 ? -1 : 1);
  if (on('scrunch')) scrunch(g, k);
  for (const s of [-1, 1]) {
    const ex = s * dx + gxs;
    if (P.eyeA > 0.01) {
      g.globalAlpha = P.eyeA;
      const arc = Math.abs(X.eArc || 0) >= 0.5 ? Math.sign(X.eArc) : Math.abs((X.wink || 0) - s) < 0.5 ? 1 : 0;
      const Fs = X.eAsym ? { ...Fe, lid: (Fe.lid || 0) + (s > 0 ? X.eAsym : -0.45 * X.eAsym), low: (Fe.low || 0) + (s > 0 ? 0.6 * X.eAsym : 0) } : Fe;
      if (on('eHeart')) heart(g, ex, ey - 0.004, F.rx * 1.32, k, -s * 10);
      else if (on('eSpiral')) spiralEye(g, ex, s, ey, F.rx, F.ry * 0.92, k);
      else if (arc) arcEye(g, ex, s, ey, F.rx * 0.95, F.ry * 0.55, on('wink') ? k * 1.3 : k, arc);
      else eye4(g, Fs, ex, s, ey, blink, t, k, tilt, 0, life);
      if (on('bags')) bags(g, ex, ey, k);
      tears(g, Math.max(X.tear || 0, s > 0 && on('tear1') ? 0.3 : 0), ex, s, ey, F.ry, k, t, crunch(F) >= SHUT);
    }
    const by = ey + bh0 - P.cut + P.lk * (s < 0 ? lL : lR) + wag * (s > 0 ? 1 : 0.75) + bS(s) + bUp + bob - 0.006 * clamp(blink);
    if (P.browA > 0.01) { g.globalAlpha = P.browA; crescent(g, ex - gxs * 0.4 + s * (0.012 - bIn), s, by, tilt, arch, 0.068, th, 0.28); }
    g.globalAlpha = 1;
  }
  if (P.eyeA > 0.01) { sweat(g, clamp(X.sw || 0), k); if (on('sw2')) { sweat(g, 1, k, -0.205, 0); sweat(g, 0.8, k, 0.232, -0.118); } }
  const mx = F.mx || 0, mY = my + P.mUp;
  if (on('mKiss')) kissMouth(g, mx + 0.03 * clamp(F.gx || 0, -1, 1), mY, k, (F.gx || 0) < -0.1 ? -1 : 1);
  else if (on('mO')) oMouth(g, mx, mY, F.mw, clamp(X.mO, 0, 1.4), k, X.oTeeth || 0, X.mWv || 0, t);
  else if (on('mSnarl')) snarl(g, mx, mY, 0.105 * (F.mw || 1), 1, k);
  else mouth4(g, Fm, t, mY, k, glp);
  if (on('puff')) puff(g, mx, mY, 0.105 * (F.mw || 1), k);
  if (on('sigh')) sigh(g, mx + 0.13 * (F.mw || 1), mY + 0.01, k);
  if (on('mTongue')) tongueOut(g, mx + 0.04 * (X.mSk || 0), mY - 0.012, k);
  g.restore();
}
// a face fading at the back of the head is drawn whole on its own canvas and laid on at that alpha (a mark faded stroke by
// stroke showed its fills through its outlines)
let OFF = null;
STYLE_DRAW.s2 = (g, F, blink, t, o) => {
  const T = turn(o);
  if (T.a < 0.01) return;
  if (T.a > 0.99) { face6(g, F, blink, t, o, T); return; }
  OFF ||= document.createElement('canvas'); OFF.width = g.canvas.width; OFF.height = g.canvas.height;
  const h = OFF.getContext('2d'); h.setTransform(g.getTransform()); h.lineCap = h.lineJoin = 'round';
  face6(h, F, blink, t, o, T);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = T.a; g.drawImage(OFF, 0, 0); g.restore();
};
STYLE_DRAW.s2.wrap = o => turn(o).w;
export const DESIGNS = {
  y_alert: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.04, brow: [0, 0.146, 0.012], mw: 0.9, x: { mC: -0.15 } },
  y_worried: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.114, white: 0.36, bw: 1.15, lid: -0.04, brow: [-28, 0.17, 0.016], mw: 1.05, x: { mC: -0.85, mWv: 1, bIn: 0.006, eSt: 0.04 } },
  y_focus: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.05, lid: 0.02, lidTilt: 0, low: 0.16, brow: [-10, 0.142, 0.01], mw: 0.8, x: { mC: -0.15, mPr: 1, mSk: 0.6, gY: -0.6, bIn: 0.006 } },
  y_set: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.1, white: 0.1, bw: 1.3, lid: 0, brow: [-22, 0.132, 0.01], mw: 1, x: { mC: -0.1, mPr: 1, mWv: 1, eCr: 0.62, eCrR: 0.2, bIn: 0.014, eSt: -0.02, shutDK: 0.5, pBot: 0.07, pScMin: 0.8, pScMin2: 0.6 }, lidTilt: 0, low: 0 },
  y_strain: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.2, lid: 0, lidTilt: 0, low: 0, brow: [-24, 0.142, 0.012], mw: 1.3, x: { mGrim: 1, mC: -0.3, mPul: 1, eCr: 1, bIn: 0.016, sw: 1, eSt: -0.06 } },
  y_squint: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.104, white: 0.1, bw: 1.1, lid: 0.28, lidTilt: 0, low: 0.12, brow: [2, 0.136, 0.004, 0.034, 0], mx: 0, mw: 0.62, x: { mC: -0.05, mPr: 1, bIn: 0.006 } },
  y_fear: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.072, ry: 0.118, white: 0.85, bw: 1.1, lid: -0.1, brow: [-26, 0.166, 0.014, 0, 0.004], mw: 1.15, x: { mGrim: 1, mC: -0.8, zRamp: 10, aLid: 0.03 } },
  y_bite: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.16, brow: [-8, 0.148, 0.01], mw: 0.85, x: { mOpen: 0.95, mC: -0.3, mTeeth: 0.6 } },
  y_tired: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.22, lidTilt: -8, brow: [-14, 0.134, 0.008], mw: 0.9, x: { mC: -0.35, gY: -0.3 } },
  y_pain: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.45, low: 0.25, brow: [-20, 0.132, 0], x: { mGrim: 0.8, mC: -0.9 } },
  y_scared: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.108, white: 0.6, bw: 1, lid: -0.06, brow: [-22, 0.16, 0.012], x: { mGrim: 0.6, mC: -0.6, bFl: 1, gJit: 0.8 } },
  y_lens: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.03, brow: [0, 0.148, 0.012], x: { mC: 0.05 } },
  y_hide: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, gx: -1, lid: 0, brow: [-4, 0.15, 0.012, 0.04, -0.004], mx: -0.03, x: { mC: -0.1, mSk: -0.9, gSh: 1 } },
  y_spend: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.102, white: 0.1, bw: 1, gx: 1, brow: [-4, 0.15, 0.012, -0.004, 0.04], mx: 0.03, x: { mC: 0.1, mSk: 0.9, gSh: 1 }, lid: 0 },
  y_dare: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.3, lidTilt: 6, brow: [10, 0.128, 0.004, -0.006, 0.042], mw: 1.05, mx: 0.02, x: { mC: 0.8, mSk: 1.05, mPr: 0.5, bWig: 1, sly: 1 } },
  y_tense: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.1, white: 0.4, bw: 1.15, lid: 0, brow: [0, 0.14, 0.006], mw: 0.74, x: { mC: -0.05, mPr: 1, mWv: 0.3, gJit: 1, mGlp: 1, bIn: 0.012 } },
  y_nervous: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.106, white: 0.3, bw: 1.1, lid: 0, brow: [-20, 0.158, 0.012], mw: 0.85, x: { mC: -0.55, mWv: 0.8, bIn: 0.008, gSh: 1, sw: 1 }, gx: 0.5 },
  y_sweat: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.05, lid: 0.26, lidTilt: -8, brow: [-16, 0.14, 0.01], mw: 0.95, x: { mC: -0.4, sw: 1, gY: -0.2 }, low: 0.04 },
  y_stern: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.2, lid: 0.1, lidTilt: 0, low: 0.08, brow: [8, 0.132, 0.004], mw: 0.85, x: { mC: -0.3, mPr: 1, bIn: 0.01 } },
  y_panic: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.074, ry: 0.122, white: 0.95, bw: 1.15, lid: -0.1, brow: [-30, 0.176, 0.016], mw: 1.2, x: { mGrim: 1, mC: -0.9, sw: 1, gJit: 1, eSt: 0.05 } },
  y_shock: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.07, ry: 0.118, white: 0.8, bw: 1.1, lid: -0.08, brow: [-8, 0.178, 0.022], mw: 0.62, x: { mOpen: 0.5, mC: -0.85, eSt: 0.04 } },
  y_relief: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1, lid: 0.34, lidTilt: -8, brow: [-16, 0.14, 0.012], mw: 0.8, x: { mOpen: 0.22, mC: 0.1 } },
  y_fret: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.102, white: 0.2, bw: 1, lid: 0.06, brow: [-14, 0.148, 0.01], mw: 0.75, x: { mC: -0.45, mWv: 0.5, gSh: 1, bIn: 0.006 }, gx: -0.5 },
  y_suspicious: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.104, white: 0.1, bw: 1.1, lid: 0.28, lidTilt: 0, low: 0.12, brow: [2, 0.136, 0.004, 0.034, 0], mx: 0, mw: 0.7, x: { mC: -0.5, bIn: 0.006 } },
  c_suspicious: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.1, lid: 0.26, brow: [12, 0.128, 0.002, 0, 0.026], mw: 0.8, x: { mC: -0.35, mPr: 1, bIn: 0.01 }, low: 0.12 },
  c_stern: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1.15, lid: 0.16, brow: [16, 0.126, 0.002], mw: 0.8, x: { mC: -0.45, mPr: 1, bIn: 0.012 }, low: 0.08 },
  c_shout: { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.106, white: 0.2, bw: 1.35, lid: 0, brow: [20, 0.13, 0.004], mw: 1.1, x: { mOpen: 1, mC: -0.4, mTeeth: 0.6, bIn: 0.012 } },};
// s2's clocks: the eyes lead, brows and mouth overlap after (Blair: the eye, then the brows, then the mouth-cheek); a take's
// accent eased at both ends over 5 f (an easeOut accent jumped a third of the change in one frame); crisp blinks that close
// faster than they open; 1.6 chews a second
const TIMING = {
  normal: { T: 9, over: 0.16, lag: { gaze: -1, lid: 0, brow: 2, mouth: 3 }, len: { brow: 2, lid: 0, mouth: 3 } },
  fast: { T: 6, over: 0.20, lag: { gaze: -1, lid: 0, brow: 1, mouth: 2 }, len: { brow: 1, lid: 0, mouth: 2 } },
  slow: { T: 14, over: 0.10, lag: { gaze: -1, lid: 0, brow: 2, mouth: 3 }, len: { brow: 2, lid: 0, mouth: 3 } },
  take: { antic: 5, accent: 5, hold: 3, settle: 10, over: 0.24, sine: true }, small: { accent: 5, total: 14, over: 0.22, sine: true },
  blinks: { regular: [0.55, 1, 0.45, 0.12, 0.02], fast: [0.6, 1, 0.3, 0.06, 0.01], long: [0.5, 1, 0.6, 0.3, 0.1, 0.03] },
  chew: { T: 19, open: 0.42 },
};
// The kit catalogue (Kai 25/11: "Mặt không được để chấm tròn nữa... mặt chuẩn" — no dot faces, the H2 V2.1 faces are the
// standard, plus the common story faces): every face name a character can use is an s2 design. Plain names are the kit's;
// ALIASES draws a kit name as the V2.1 design it already is. tools/series/kitfaces renders the catalogue as one face sheet.
const O = { style: 's2', eye: 'oval', mouth: 'tight', rx: 0.066, ry: 0.098, white: 0.1, bw: 1 };
const des = (d, x = {}) => ({ ...O, ...d, x });
Object.assign(DESIGNS, {
  calm: des({ lid: 0.08, low: 0.3, brow: [-6, 0.148, 0.014], mw: 0.85 }, { mC: 1 }),
  happy: des({ lid: 0.06, low: 0.26, brow: [-6, 0.158, 0.018], mw: 1 }, { mC: 0.9, mOpen: 0.5, mTeeth: 0.6 }),
  grin: des({ lid: 0.2, low: 0.45, brow: [6, 0.15, 0.014], mw: 1.25 }, { mC: 1, mOpen: 0.25, mTeeth: 1 }),
  laugh: des({ brow: [-10, 0.165, 0.022], mw: 1.1 }, { eCr: 1, mC: 1, mOpen: 1.1, mTeeth: 0.7, tear: 0.35 }),
  closed: des({ brow: [-4, 0.138, 0.01], mw: 0.7 }, { eArc: 1, mC: 0.55 }),
  blush: des({ brow: [-18, 0.15, 0.014], mw: 0.55 }, { eArc: 1, mC: 0.4, mWv: 0.5, blush: 1 }),
  proud: des({ lid: 0.5, gy: -0.5, brow: [14, 0.185, 0.03], mw: 1.15, my: 0.03, marks: [['sparkle']] }, { eY: 0.03, mC: 1 }),
  excited: des({ rx: 0.072, ry: 0.12, white: 0.45, lid: -0.04, brow: [-6, 0.182, 0.026], mw: 1.2 }, { mC: 1, mOpen: 1.1, mTeeth: 0.5, eSt: 0.06, eStar: 1, shiver: 1 }),
  manic: des({ rx: 0.074, ry: 0.12, white: 0.95, lid: -0.08, brow: [14, 0.16, 0.012, 0.05, -0.012], mw: 1.4 }, { mGrim: 1, mC: 1, gJit: 0.8, eAsym: 0.4 }),
  sad: des({ lid: 0.28, lidTilt: -8, low: 0.05, gy: -0.4, brow: [-26, 0.152, 0.014], mw: 0.7 }, { mC: -0.85, tear: 0.3 }),
  cry: des({ brow: [-30, 0.156, 0.014], mw: 1.05 }, { eCr: 1, tear: 1, mOpen: 0.9, mC: -1, mWv: 0.8, mTeeth: 0.4 }),
  sleep: des({ brow: [-4, 0.13, 0.012], mw: 0.45, marks: [['zzz']] }, { eArc: -1, mOpen: 0.14 }),
  yawn: des({ lid: 0.62, lidTilt: -10, brow: [-22, 0.17, 0.018], mw: 1.1 }, { mO: 1.35, tear1: 1 }),
  dizzy: des({ brow: [-14, 0.15, 0.01], mw: 0.8 }, { eSpiral: 1, mWv: 0.8, mC: -0.3, mSk: 0.4 }),
  disgust: des({ bw: 1.2, brow: [16, 0.13, 0.004, 0.012, -0.02], mw: 0.8 }, { eCr: 0.62, mOpen: 0.35, mC: -0.7, mWv: 0.6, mTongue: 1, scrunch: 1, bIn: 0.014 }),
  love: des({ brow: [-10, 0.165, 0.02], mw: 0.95 }, { eHeart: 1, mC: 0.9, mOpen: 0.35, mTeeth: 0.3, blush: 0.8 }),
  kiss: des({ brow: [-6, 0.15, 0.016] }, { eArc: 1, mKiss: 1, blush: 0.6 }),
  wink: des({ lid: -0.02, low: 0.16, brow: [0, 0.16, 0.016, 0.03, -0.02], mw: 1 }, { wink: 1, mC: 0.9, mOpen: 0.45, mTeeth: 0.5, mSk: 0.3 }),
  embarrassed: des({ lid: 0.06, gx: -0.8, gy: -0.2, brow: [-20, 0.158, 0.014], mw: 0.9 }, { blush: 1, mC: 0.45, mWv: 0.7, sw: 0.8 }),
  shy: des({ lid: 0.3, gx: 0.5, gy: -0.9, brow: [-18, 0.15, 0.012], mw: 0.35 }, { blush: 1, mC: -0.1, mWv: 0.5, gSh: 1 }),
  guilty: des({ lid: 0.26, gx: -1, gy: -0.8, brow: [-24, 0.16, 0.014], mw: 0.7, my: -0.02 }, { eY: -0.02, mC: -0.45, mWv: 0.6, mSk: -0.3, sw: 0.8, gloom: 1 }),
  disappointed: des({ lid: 0.85, lidTilt: -12, gy: -1, brow: [-20, 0.14, 0.01], mw: 0.95 }, { mC: -0.8, sigh: 1 }),
  bored: des({ lid: 0.46, gx: 0.8, gy: 0.2, brow: [-4, 0.128, 0.002], mw: 0.65 }, { mC: -0.15, mSk: 0.7, mPr: 0.6 }),
  thinking: des({ lid: 0.1, gx: 0.85, brow: [4, 0.14, 0.012, 0, 0.035], mx: 0.04, mw: 0.55 }, { gY: 1, mSk: 0.6, mPr: 0.8, mC: 0, dots: 1 }),
  mischievous: des({ lid: 0.4, lidTilt: 10, low: 0.16, gx: 0.9, brow: [24, 0.13, 0.004, 0, 0.03], mw: 1.15 }, { mC: 1, mOpen: 0.45, mTeeth: 1, mSk: 0.9 }),
  smug: des({ lid: 0.48, lidTilt: 4, brow: [-2, 0.16, 0.02], mw: 0.9 }, { mC: 0.75, mSk: 0.5 }),
  scream: des({ rx: 0.074, ry: 0.124, white: 0.95, lid: -0.1, brow: [-32, 0.196, 0.024], mw: 1.25 }, { mOpen: 1.2, mC: -1, mTeeth: 1, mWv: 0.8, sw: 0.8, shiver: 1 }),
  sick: des({ lid: 0.45, lidTilt: -8, low: 0.1, brow: [-18, 0.142, 0.01], mw: 0.6, tint: [0.46, 0.68, 0.38] }, { mWv: 1.2, mC: -0.5, mPr: 0.6, bags: 1, puff: 1, sw: 0.6 }),
  cold: des({ lid: 0.06, white: 0.3, brow: [-24, 0.158, 0.012], mw: 0.95, tint: [0.56, 0.7, 0.96] }, { mGrim: 0.7, mPul: 1, mC: -0.3, bFl: 0.6, shiver: 1 }),
  hot: des({ lid: 0.3, lidTilt: -8, brow: [-16, 0.145, 0.012], mw: 0.9, tint: [1, 0.44, 0.32] }, { sw: 1, sw2: 1, mOpen: 0.6, mC: -0.1, mTongue: 1, heat: 1 }),
  angry: des({ lid: 0.26, low: 0.12, bw: 1.25, brow: [24, 0.12, 0.002], mw: 0.9, marks: [['anger']] }, { mGrim: 0.7, mC: -0.7, bIn: 0.014 }),
  deadpan: des({ lid: 0.4, brow: [0, 0.136, 0], mw: 0.6 }, { mC: 0 }),
  confused: des({ lid: 0.06, gy: 0.2, brow: [-6, 0.152, 0.01, 0.045, -0.015], mw: 0.7, marks: [['question']] }, { eAsym: 0.22, mSk: 0.55, mC: -0.25, mWv: 0.5 }),
});
export const ALIASES = {
  neutral: 'y_lens', worried: 'y_worried', nervous: 'y_nervous', shock: 'y_shock', panic: 'y_panic',
  pain: 'y_pain', stern: 'y_stern', furious: 'c_shout', suspicious: 'y_suspicious', skeptic: 'y_squint', sly: 'y_dare',
  determined: 'y_set', relieved: 'y_relief', sweat: 'y_sweat', fret: 'y_fret', y_calm: 'calm',
};
export const PURPOSE = {
  neutral: 'resting, listening', calm: 'polite, at ease (a clerk, a host)', happy: 'pleased, a good surprise', grin: 'big closed-teeth grin',
  laugh: 'laughing hard', closed: 'content, eyes shut smiling', blush: 'flattered, touched', proud: 'proud of it', excited: 'can\'t wait',
  manic: 'unhinged glee', sad: 'sad, let down', cry: 'crying hard', sleep: 'asleep', yawn: 'sleepy, yawning', dizzy: 'dazed, spinning',
  disgust: 'disgusted', love: 'in love, adores it', kiss: 'a kiss', wink: 'a wink, in on the joke', embarrassed: 'embarrassed',
  shy: 'shy, bashful', guilty: 'guilty, caught', disappointed: 'disappointed', thinking: 'thinking it over', mischievous: 'up to mischief',
  smug: 'smug, pleased with himself', scream: 'shocked scream', sick: 'sick, queasy', cold: 'freezing', hot: 'too hot, sweating',
  angry: 'angry', furious: 'shouting mad', deadpan: 'deadpan, unimpressed', confused: 'confused', bored: 'bored',
  worried: 'worried', nervous: 'nervous', shock: 'shocked', panic: 'panic', pain: 'in pain', stern: 'stern, serious',
  suspicious: 'suspicious', skeptic: 'skeptical squint', sly: 'sly dare', determined: 'determined, pushing', relieved: 'relieved',
  sweat: 'sweating it', fret: 'fretting', y_alert: 'alert, ears up', y_focus: 'focused on the task', y_strain: 'straining, lifting',
  y_fear: 'afraid', y_bite: 'biting into food', y_scared: 'scared', y_hide: 'eyes to one side (a choice)', y_spend: 'eyes to the other side (a choice)',
  y_tense: 'tense, holding it in', c_suspicious: 'suspicious (a second character)', c_stern: 'stern (a second character)',
};
// the faces a viewer could mix up (Kai 25/11: "no two faces that read the same"); test/unit/stick-face-distinct holds each
// pair two features apart (eyes, brows, mouth, extras)
export const LOOKALIKE = [['happy', 'grin'], ['happy', 'excited'], ['grin', 'manic'], ['laugh', 'happy'], ['closed', 'blush'], ['closed', 'proud'], ['blush', 'proud'],
  ['relieved', 'closed'], ['blush', 'shy'], ['shy', 'embarrassed'], ['embarrassed', 'guilty'], ['sad', 'disappointed'], ['sad', 'cry'], ['guilty', 'disappointed'],
  ['disappointed', 'bored'], ['bored', 'deadpan'], ['deadpan', 'neutral'], ['calm', 'neutral'], ['sleep', 'yawn'], ['smug', 'mischievous'], ['smug', 'sly'],
  ['mischievous', 'sly'], ['wink', 'sly'], ['thinking', 'confused'], ['confused', 'skeptic'], ['angry', 'stern'], ['angry', 'furious'], ['scream', 'shock'],
  ['scream', 'panic'], ['love', 'kiss'], ['cold', 'nervous'], ['hot', 'sweat'], ['sick', 'disgust'], ['worried', 'nervous'], ['fret', 'worried']];
const isPlainName = k => !/_[oO]$/.test(k) && !/^[yc]_/.test(k);   // a kit name, not a talking twin or a V2.1 (y_ / c_) face
// a talking twin opens the mouth; a clenched grin speaks through its teeth and a kiss lets go
const talking = (d, open, base) => { const x = d.x || {}; return { ...d, base, x: { ...x, mOpen: Math.max(x.mOpen || 0, open), mGrim: 0, mKiss: 0, mTeeth: Math.max(x.mTeeth || 0, x.mGrim ? 0.7 : 0) } }; };
// s2 on the engine for this render (the clocks are module state: one face style per render)
export function use() {
  FACE_STYLE.name = 's2';
  Object.assign(EXPR, DESIGNS);
  for (const [k, d] of Object.entries(ALIASES)) EXPR[k] = DESIGNS[d];
  for (const k of Object.keys(EXPR)) if (isPlainName(k)) { EXPR[`${k}_o`] = talking(EXPR[k], 0.6, k); EXPR[`${k}_O`] = talking(EXPR[k], 1, k); }
  for (const c of ['normal', 'fast', 'slow']) FACE_TIMING[c] = TIMING[c];
  Object.assign(TAKE, TIMING.take); Object.assign(SMALL_TAKE, TIMING.small); Object.assign(BLINKS, TIMING.blinks); Object.assign(CHEW, TIMING.chew);
}
