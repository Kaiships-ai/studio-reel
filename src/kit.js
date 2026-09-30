// kit.js: shared reel pieces, so every chapter reads as one system. All coordinates are in the 1080x1920 frame.
// Keep anything that matters inside SAFE (x 60..960, y 250..1300): captions sit at y ~1335..1455, and Instagram's UI
// covers the bottom ~380 px and the right ~120 px.

const MONO = s => `700 ${s}px "JetBrains Mono", "Courier New", monospace`;
const HAND = s => `800 ${s}px "Shantell Sans", "Comic Sans MS", sans-serif`;
const MARKER = s => `${s}px "Permanent Marker", "Comic Sans MS", cursive`;
function textW(txt, font) { outX.font = font; return outX.measureText(txt).width; }

// ---------- background ----------
// Flat wash plus a few big soft pigment blooms drifting slowly. o.blobs = [colour, ...], o.op = their opacity.
function bgWash(t, base, o = {}) {
  paint(rectPts(-60, -60, W + 120, H + 120), { wash: base, washOp: 255, ink: null });
  (o.blobs || []).forEach((c, i) => {
    const x = 540 + Math.sin(i * 2.3 + t * .18) * 420, y = 300 + i * 1500 / Math.max(1, (o.blobs.length - 1) || 1) + Math.cos(i * 1.7 + t * .15) * 120;
    paint(ellPts(x, y, 420 + 120 * hash(i), 340 + 100 * hash(i + 3), 22, 25), { fill: c, fillOp: o.op ?? 70, bleed: .35, tex: .5, border: .3, ink: null });
  });
}

// ---------- headers and labels ----------
// Round number badge. age = seconds since it appeared (it pops in); o: { rot, size (number size), dk (shade colour) }
function badge(x, y, r, num, col, age = 9, o = {}) {
  const k = backOut(clamp(age / .3)); if (k < .02) return;
  const rr = r * k, wobble = Math.sin(age * 7) * .05 * Math.exp(-age * 2);
  paint(ellPts(x + rr * .08, y + rr * .1, rr, rr, 26, 1.5), { wash: PAL.ink, washOp: 200, ink: null });
  paint(ellPts(x, y, rr, rr, 26, 2, wobble), { wash: col, washOp: 255, fill: o.dk || PAL.ink, fillOp: 45, bleed: .1, tex: .7, border: .6, ink: PAL.ink, sw: clamp(r / 50, .7, 1.5) });
  paint(ellPts(x - rr * .25, y - rr * .3, rr * .45, rr * .28, 14), { fill: '#FFFFFF', fillOp: 70, bleed: .2, ink: null });
  if (num != null) letter(String(num), x, y + rr * .02, rr * 1.3, PAL.cream, { rot: (o.rot ?? -.06) + wobble, stroke: PAL.ink, font: HAND(rr * 1.3) });
}
// Chapter header: a number badge and a title on one line near the top of the safe zone, with a brush underline.
// Appears at t0 and stays. o: { y (default 330), dark (true on dark backgrounds), size (max title size) }
function stepHeader(t, t0, num, title, col, o = {}) {
  const age = t - t0; if (age < 0) return;
  const y = o.y ?? 330, r = 62, x0 = SAFE.x0 + r, room = SAFE.x1 - (x0 + r + 26);
  let size = o.size || 96; const w0 = textW(title, MARKER(size)); if (w0 > room) size *= room / w0;
  const w = textW(title, MARKER(size)), slide = (1 - easeOut(clamp(age / .3))) * 70;
  badge(x0, y, r, num, col, age);
  letter(title, x0 + r + 26 + w / 2 + slide, y - 6, size, o.dark ? PAL.cream : PAL.ink, { rot: -.02, alpha: clamp(age / .15), stroke: o.dark ? PAL.ink : null });
  const u = easeOut(seg(age, .25, .6));
  if (u > .01) inkLine([[x0 + r + 22, y + 50], [x0 + r + 22 + (w + 10) * u, y + 44]], 2.2, col, 'dry', .2);
}
// Small pill label. o: { pop 0..1, col (text), bg (fill, default cream), bgOp, align 'center'|'left', size }
function chip(x, y, txt, o = {}) {
  const s = o.size || 34, f = MONO(s), w = textW(txt, f) + s * 1.1, h = s * 1.65, k = backOut(clamp(o.pop ?? 1));
  if (k < .02) return;
  const x0 = o.align === 'left' ? x : x - w / 2;
  push(); translate(x0 + w / 2, y); scale(k); translate(-(x0 + w / 2), -y);
  paint(rrPts(x0, y - h / 2, w, h, h / 2, 1.2), { wash: o.bg || PAL.cream, washOp: o.bgOp ?? 245, ink: PAL.ink, sw: .9 });
  pop();
  letter(txt, x0 + w / 2, y + 1, s * k, o.col || PAL.ink, { font: MONO(s * k), ink: false });
}
// Stat card: a paper index card that flips in at tIn. o: { big, small, col, w, h, rot, tOut, bigSize, smallSize }
function statCard(t, tIn, x, y, o = {}) {
  const age = t - tIn; if (age < 0) return;
  const k = backOut(clamp(age / .38)), out = o.tOut ? easeIn(seg(t, o.tOut, o.tOut + .25)) : 0, w = o.w || 560, h = o.h || 260;
  const sy = k * (1 - out), rot = (o.rot ?? -.04) + (1 - clamp(age / .38)) * .25;
  if (sy < .02) return;
  push(); translate(x, y); rotate(rot); scale(1, sy);
  paint(rrPts(-w / 2 + 14, -h / 2 + 16, w, h, 26, 2), { wash: PAL.ink, washOp: 210, ink: null });
  paint(rrPts(-w / 2, -h / 2, w, h, 26, 2), { wash: PAL.cream, washOp: 255, fill: o.col || PAL.clay, fillOp: 35, tex: .6, border: .5, ink: PAL.ink, sw: 1.4 });
  paint(rectPts(-w / 2 + 26, -h / 2 + 22, 16, h - 44, 1), { wash: o.col || PAL.clay, ink: null });
  pop();
  const bs = o.bigSize || 118, ss = o.smallSize || 44, c = Math.cos(rot), s = Math.sin(rot);
  const at = (dx, dy) => [x + dx * c - dy * s * sy, y + dx * s + dy * c * sy];
  if (sy > .5) {
    letter(o.big, ...at(18, o.small ? -30 : 0), bs, o.col || PAL.clay, { rot, stroke: PAL.ink, pop: age * 3.2 });
    if (o.small) letter(o.small, ...at(18, 72), ss, PAL.ink, { rot, font: HAND(ss), ink: false, pop: age * 3 - .3 });
  }
}

// ---------- props ----------
// Paper document with a folded corner and syntax-coloured code bars. (x, y) = centre. o: { rot, lines, seed, col, w, h, k }
function fileIcon(x, y, s = 1, o = {}) {
  const w = (o.w || 150) * s, h = (o.h || 190) * s, d = 38 * s, sw = clamp(1.1 * s, .5, 1.6);
  push(); translate(x, y); if (o.rot) rotate(o.rot);
  paint([[-w / 2, -h / 2], [w / 2 - d, -h / 2], [w / 2, -h / 2 + d], [w / 2, h / 2], [-w / 2, h / 2]], { wash: o.paper || '#FFFBF1', washOp: 255, fill: o.col || PAL.sky, fillOp: 30, tex: .5, ink: PAL.ink, sw });
  paint([[w / 2 - d, -h / 2], [w / 2 - d, -h / 2 + d], [w / 2, -h / 2 + d]], { wash: mixCol(o.col || PAL.sky, '#FFFFFF', .3), ink: PAL.ink, sw: sw * .8 });
  codeBars(-w / 2 + 18 * s, -h / 2 + 30 * s, w - 40 * s, o.lines ?? 6, o.seed || 0, { lh: 22 * s, th: 9 * s, k: o.k ?? 1 });
  pop();
}
const SYN = [PAL.violet, PAL.teal, PAL.clay, PAL.sky, PAL.rose, PAL.ochre];
// Rows of rounded bars like syntax-highlighted code or lines of text. o: { lh line height, th thickness, k reveal 0..1, cols }
function codeBars(x, y, w, n, seed = 0, o = {}) {
  const lh = o.lh || 22, th = o.th || 9, k = o.k ?? 1, cols = o.cols || SYN;
  for (let r = 0; r < n; r++) {
    const ind = (hash(seed + r * 3.1) < .45 ? 1 : 0) * w * .12, rk = clamp(k * n - r); if (rk <= 0) break;
    let cx = x + ind; const end = x + w * (.55 + .45 * hash(seed + r * 7.7));
    for (let q = 0; q < 4 && cx < end; q++) {
      const bw = Math.min(end - cx, w * (.12 + .28 * hash(seed + r * 13 + q))) * rk;
      if (bw > 3) paint(rrPts(cx, y + r * lh, bw, th, th / 2), { wash: cols[Math.floor(hash(seed + r * 5 + q * 11) * cols.length)], washOp: 235, ink: null });
      cx += bw + th;
    }
  }
}
// Painted laptop, base centred at (x, y) (front edge of the keyboard). o.screen(x0, y0, w, h) paints the screen.
function laptop(x, y, s = 1, o = {}) {
  const sw = clamp(1.2 * s, .6, 1.8), w = 420 * s, h = 270 * s;
  paint([[x - w / 2 - 30 * s, y], [x + w / 2 + 30 * s, y], [x + w / 2, y - 34 * s], [x - w / 2, y - 34 * s]], { wash: '#C9C2D6', fill: PAL.ink, fillOp: 30, tex: .5, ink: PAL.ink, sw });
  paint(rrPts(x - w / 2, y - 34 * s - h, w, h, 16 * s, 1), { wash: '#5A5470', washOp: 255, ink: PAL.ink, sw });
  paint(rrPts(x - w / 2 + 16 * s, y - 34 * s - h + 16 * s, w - 32 * s, h - 32 * s, 8 * s, 1), { wash: o.bg || PAL.night, washOp: 255, ink: null });
  if (o.screen) o.screen(x - w / 2 + 16 * s, y - 34 * s - h + 16 * s, w - 32 * s, h - 32 * s);
}
// Painted phone, centred at (x, y); 360 x 720 at s = 1. o: { rot, bg (screen colour), screen(w, h) }.
// o.screen paints the screen in local coordinates: (0, 0) is its top-left corner, w x h its size (328 x 688 at s = 1,
// already scaled and rotated with the phone).
function phone(x, y, s = 1, o = {}) {
  const w = 360, h = 720, b = 16, sw = clamp(1.4 * s, .7, 1.8) / s;
  push(); translate(x, y); rotate(o.rot || 0); scale(s);
  paint(rrPts(-w / 2 + 14, -h / 2 + 18, w, h, 54, 2), { wash: PAL.ink, washOp: 190, ink: null });
  paint(rrPts(-w / 2, -h / 2, w, h, 54, 1.5), { wash: '#3A3448', washOp: 255, ink: PAL.ink, sw });
  paint(rrPts(-w / 2 + b, -h / 2 + b, w - 2 * b, h - 2 * b, 40, 1), { wash: o.bg || PAL.cream, washOp: 255, ink: null });
  if (o.screen) { push(); translate(-w / 2 + b, -h / 2 + b); o.screen(w - 2 * b, h - 2 * b); pop(); }
  paint(rrPts(-46, -h / 2 + b + 12, 92, 22, 11), { wash: '#3A3448', washOp: 255, ink: null });
  pop();
}

// World position of a point on a phone's screen, for things that aren't painted inside o.screen (letter(), burst()):
// (sx, sy) in the same local screen coordinates, for a phone drawn with phone(x, y, s, { rot }).
function phoneAt(x, y, s, rot, sx, sy) {
  const dx = (sx - 164) * s, dy = (sy - 344) * s, c = Math.cos(rot || 0), n = Math.sin(rot || 0);
  return [x + dx * c - dy * n, y + dx * n + dy * c];
}

// ---------- accents ----------
// Hit accent: radial ink strokes that shoot out and fade over `life` seconds.
function burst(x, y, age, col = PAL.ink, o = {}) {
  const life = o.life || .35; if (age < 0 || age > life) return;
  const n = o.n || 10, r0 = (o.r || 90) * (.6 + easeOut(age / life) * .9), len = (o.len || 70) * (1 - age / life);
  for (let k = 0; k < n; k++) {
    const a = k / n * TAU + (o.rot || 0) + hash(k) * .3;
    inkLine([[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * (r0 + len), y + Math.sin(a) * (r0 + len)]], o.sw || 1.6, col, 'ink', 0);
  }
}
// Small four-point twinkle.
function twinkle(x, y, r, t, col = PAL.cream, ph = 0) {
  const k = .55 + .45 * Math.sin(t * 6 + ph * 5); paint(starPts(x, y, r * k, .3, 4), { wash: col, ink: null });
}
// A hand-drawn tick that draws itself in. age = seconds since it started.
function tick(x, y, r, age, col = PAL.sap, sw = 3) {
  const k = easeOut(clamp(age / .22)); if (age < 0 || k < .02) return;
  const P = [[-r, 0], [-r * .3, r * .62], [r, -r * .72]], n = k < .4 ? 2 : 3, q = k < .4 ? k / .4 : (k - .4) / .6;
  const end = n === 2 ? [lerp(P[0][0], P[1][0], q), lerp(P[0][1], P[1][1], q)] : [lerp(P[1][0], P[2][0], q), lerp(P[1][1], P[2][1], q)];
  const pts = (n === 2 ? [P[0], end] : [P[0], P[1], end]).map(([a, b]) => [x + a, y + b]);
  inkLine(pts, sw * 1.5, PAL.ink, 'ink', 0); inkLine(pts, sw, col, 'ink', 0);
}
