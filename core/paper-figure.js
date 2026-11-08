const TAU = Math.PI * 2, INK = '#3A2A24', CREAM = '#F3EEE4', CREAM_S = '#D9D2C2', ACCENT = '#EC5A4B', GOLD = '#FFD766';
const LW = 9, LW2 = 5;
export const FIGURE_W = 640, FIGURE_H = 1080;
const CX = 320;
export const SOLE_Y = 1000;

function mulberry(seed) { return () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
let grain;
function grainTile() {
  if (grain) return grain;
  const n = 512, c = cv(n, n), x = c.getContext('2d'), R = mulberry(7), img = x.createImageData(n, n), d = img.data;
  for (let i = 0; i < n * n; i++) { const v = R(); d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v < .5 ? 0 : 255; d[i * 4 + 3] = Math.abs(v - .5) * 34; }
  x.putImageData(img, 0, 0);
  return (grain = c);
}
export function finishCut(art, border = 16) {
  const w = art.width, h = art.height, out = cv(w, h), x = out.getContext('2d');
  const dil = (r, col) => {
    const c = cv(w, h), y = c.getContext('2d'), n = Math.max(16, Math.round(r * 1.2));
    for (const k of [r, r * .66, r * .33]) for (let i = 0; i < n; i++) { const a = i / n * TAU; y.drawImage(art, Math.cos(a) * k, Math.sin(a) * k); }
    y.globalCompositeOperation = 'source-in'; y.fillStyle = col; y.fillRect(0, 0, w, h); return c;
  };
  x.drawImage(dil(border + 2.5, '#B9AD9C'), 0, 1.5); x.drawImage(dil(border, '#FFFDF7'), 0, 0); x.drawImage(art, 0, 0);
  x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .7; x.fillStyle = x.createPattern(grainTile(), 'repeat'); x.fillRect(0, 0, w, h);
  return out;
}
function sh(x, fill, lw = LW, stroke = INK) {
  if (fill) { x.fillStyle = fill; x.fill(); }
  if (lw > 0) { x.lineWidth = lw; x.strokeStyle = stroke; x.lineJoin = 'round'; x.lineCap = 'round'; x.stroke(); }
}
export function blob(x, cx, cy, rx, ry, wob = .03, seed = 1) {
  const R = mulberry(seed), ph = [R() * TAU, R() * TAU, R() * TAU], n = 28, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 1 + wob * (Math.sin(a * 3 + ph[0]) * .5 + Math.sin(a * 5 + ph[1]) * .3 + Math.sin(a * 2 + ph[2]) * .4); pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  x.beginPath(); let m = mid(pts[n - 1], pts[0]); x.moveTo(m[0], m[1]);
  for (let i = 0; i < n; i++) { m = mid(pts[i], pts[(i + 1) % n]); x.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  x.closePath();
}
function shaded(x, path, { base, shade }, dx = -24, dy = 0, lw = LW) {
  x.save(); path(); x.clip(); x.fillStyle = shade; x.fillRect(-9999, -9999, 30000, 30000);
  x.translate(-dx, -dy); path(); x.fillStyle = base; x.fill(); x.restore(); path(); sh(x, null, lw);
}
const rr = (x, px, py, w, h, r) => () => { x.beginPath(); x.roundRect(px, py, w, h, r); };
const solid = (base, shade = base) => ({ base, shade });

function layout(body) {
  const legH = 250 * body.bodyHeight, torsoH = 270 * body.bodyHeight, tw = 118 * body.torsoWidth, R = 120 * body.headScale;
  const hip = SOLE_Y - legH, sho = hip - torsoH;
  return { legH, torsoH, tw, R, hip, sho, headY: sho - R * .82 };
}

function legs(x, f, L) {
  for (const s of [-1, 1]) {
    const lx = CX + s * L.tw * .42;
    shaded(x, rr(x, lx - 32, L.hip - 10, 64, L.legH - 24, 26), f.paint.legs, -14);
    shaded(x, () => blob(x, lx + s * 10, SOLE_Y - 16, 46, 24, .03, s + 3), solid(CREAM, CREAM_S), 0, -10, LW2 + 2);
  }
}
function arms(x, f, L) {
  const metal = f.kind === 'bot', sleeve = metal ? f.paint.legs : f.top === 'vest' ? solid(CREAM, CREAM_S) : f.paint.top;
  const len = L.torsoH * .9, cuff = f.top === 'tee' && !metal ? len * .36 : len;
  for (const s of [-1, 1]) {
    x.save(); x.translate(CX + s * (L.tw - 14), L.sho + 34); x.rotate(-s * .13);
    if (cuff < len) shaded(x, rr(x, -24, 0, 48, len, 24), f.paint.skin, -12, 0, LW2 + 1);
    shaded(x, rr(x, -29, -6, 58, cuff + 6, 28), sleeve, -14);
    shaded(x, () => blob(x, 0, len + 18, 30, 32, .04, s + 5), f.paint.skin, -10, 8, LW2 + 1);
    x.restore();
  }
}
function torso(x, f, L, view) {
  const { tw, hip, sho, torsoH } = L, top = f.paint.top;
  if (f.top === 'hoodie' && view === 'front') shaded(x, () => blob(x, CX, sho + 8, tw * .62, 36, .03, 2), solid(top.shade), 0, 0, LW2 + 1);
  shaded(x, () => {
    x.beginPath(); x.moveTo(CX - tw * .92, hip + 16);
    x.bezierCurveTo(CX - tw * 1.02, hip - torsoH * .4, CX - tw * 1.1, sho + 30, CX - tw * .7, sho); x.lineTo(CX + tw * .7, sho);
    x.bezierCurveTo(CX + tw * 1.1, sho + 30, CX + tw * 1.02, hip - torsoH * .4, CX + tw * .92, hip + 16);
    x.quadraticCurveTo(CX, hip + 32, CX - tw * .92, hip + 16); x.closePath();
  }, top, -30);
  const line = (pts, col = top.shade, lw = LW2) => { x.beginPath(); x.moveTo(...pts[0]); for (const p of pts.slice(1)) x.lineTo(...p); x.lineWidth = lw; x.strokeStyle = col; x.lineCap = 'round'; x.stroke(); };
  if (view === 'back') {
    if (f.kind === 'bot') for (const k of [0, 1, 2]) line([[CX - tw * .4, sho + 70 + k * 30], [CX + tw * .4, sho + 70 + k * 30]], INK, LW2);
    else if (f.top === 'hoodie') shaded(x, () => { x.beginPath(); x.moveTo(CX - tw * .62, sho + 4); x.quadraticCurveTo(CX, sho + 150, CX + tw * .62, sho + 4); x.closePath(); }, solid(top.shade), 0, 0, LW2 + 1);
    else if (f.top !== 'tee') line([[CX, sho + 10], [CX, hip + 20]]);
    return;
  }
  if (f.top === 'hoodie') {
    for (const s of [-1, 1]) line([[CX + s * 22, sho + 26], [CX + s * 26, sho + 96]], CREAM, 7);
    rr(x, CX - tw * .55, hip - torsoH * .4, tw * 1.1, torsoH * .3, 22)(); sh(x, null, LW2, top.shade);
  } else if (f.top === 'jacket') {
    shaded(x, () => { x.beginPath(); x.moveTo(CX - 34, sho); x.lineTo(CX + 34, sho); x.lineTo(CX + 22, hip + 22); x.lineTo(CX - 22, hip + 22); x.closePath(); }, solid(CREAM, CREAM_S), 0, 0, LW2);
    for (const s of [-1, 1]) shaded(x, () => { x.beginPath(); x.moveTo(CX + s * 34, sho); x.lineTo(CX + s * 70, sho + 8); x.lineTo(CX + s * 30, sho + 110); x.closePath(); }, solid(top.shade), 0, 0, LW2);
  } else if (f.top === 'vest') {
    shaded(x, () => { x.beginPath(); x.moveTo(CX - 44, sho); x.lineTo(CX + 44, sho); x.lineTo(CX, sho + 100); x.closePath(); }, solid(CREAM, CREAM_S), 0, 0, LW2);
    for (const k of [0, 1, 2]) { x.beginPath(); x.arc(CX, sho + 130 + k * 42, 7, 0, TAU); sh(x, top.shade, 3); }
  } else { x.beginPath(); x.arc(CX, sho - 4, 34, .15 * Math.PI, .85 * Math.PI); sh(x, null, LW2, top.shade); }
}

function hairCap(x, f, L, R, back) {
  const { headY } = L, hair = f.paint.hair, h = f.hair;
  const fringe = () => { x.quadraticCurveTo(CX + R * .55, headY - R * .58, CX, headY - R * .44); x.quadraticCurveTo(CX - R * .5, headY - R * .3, CX - R * .98, headY + R * .05); };
  if (h === 'curly') for (let i = 0; i <= 10; i++) { const a = Math.PI * (back ? .8 : .98) + i / 10 * Math.PI * (back ? 1.4 : 1.04); shaded(x, () => blob(x, CX + Math.cos(a) * R * .92, headY + Math.sin(a) * R * .95, R * .3, R * .3, .05, i + 9), hair, -8, 6, LW2 + 1); }
  shaded(x, () => {
    x.beginPath();
    if (h === 'spiky') { for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI, r = R * (i % 2 ? 1.28 : 1.0); x.lineTo(CX + Math.cos(a) * r, headY + Math.sin(a) * r); } }
    else x.ellipse(CX, headY, R * .99, R * 1.05, 0, Math.PI, 0);
    if (back) x.ellipse(CX, headY, R * .99, R * (h === 'long' ? 1.5 : h === 'short' || h === 'spiky' ? .62 : .9), 0, 0, Math.PI);
    else { x.lineTo(CX + R * .98, headY + R * .05); fringe(); }
    x.closePath();
  }, hair, -20, 16, h === 'curly' ? 0 : LW);
  if (back && h !== 'spiky' && h !== 'curly') { x.strokeStyle = hair.shade; x.lineWidth = LW2; for (const s of [-1, 0, 1]) { x.beginPath(); x.moveTo(CX + s * R * .3, headY - R * .85); x.quadraticCurveTo(CX + s * R * .48, headY, CX + s * R * .34, headY + R * .5); x.stroke(); } }
}
function head(x, f, L, view) {
  const { R, headY } = L, back = view === 'back';
  if (f.kind === 'bot') {
    shaded(x, rr(x, CX - R, headY - R * .9, R * 2, R * 1.7, R * .45), f.paint.skin, -26, 18);
    for (const s of [-1, 1]) { x.beginPath(); x.arc(CX + s * R * 1.02, headY, R * .16, 0, TAU); sh(x, f.paint.legs.base, LW2); }
    if (!back) { shaded(x, rr(x, CX - R * .74, headY - R * .5, R * 1.48, R * .9, R * .3), solid('#2B2840'), 0, 0, LW2 + 1); face(x, f, L, '#7FE6FF'); }
  } else {
    if (f.hair === 'long' && !back) for (const s of [-1, 1]) shaded(x, rr(x, CX + s * R * .78 - R * .26, headY - R * .3, R * .52, R * 1.5, R * .26), f.paint.hair, s * 10, 0);
    if (f.hair === 'bun') { shaded(x, () => blob(x, CX, headY - R * 1.3, R * .44, R * .4, .05, 6), f.paint.hair, -14, 10); shaded(x, rr(x, CX - R * .28, headY - R * 1.14, R * .56, R * .2, 10), solid(GOLD, '#E0A930'), 0, 0, LW2); }
    for (const s of [-1, 1]) shaded(x, () => blob(x, CX + s * R * .94, headY + R * .1, R * .17, R * .24, .03, s + 2), f.paint.skin, 0, 0, LW2 + 1);
    shaded(x, () => blob(x, CX, headY, R * .94, R, .025, 4), f.paint.skin, -26, 18);
    if (f.hair !== 'none') hairCap(x, f, L, R, back);
    if (!back) face(x, f, L, INK);
  }
}
function face(x, f, { R, headY }, ink) {
  const ey = headY + R * .14;
  for (const s of [-1, 1]) {
    const ex = CX + s * R * .36;
    x.fillStyle = ink; x.strokeStyle = ink; x.lineCap = 'round';
    if (f.eyes === 'visor') { if (s < 0) { rr(x, CX - R * .58, ey - 16, R * 1.16, 32, 16)(); sh(x, f.kind === 'bot' ? ink : '#2B2840', LW2); } continue; }
    if (f.eyes === 'sleepy') { x.beginPath(); x.ellipse(ex, ey, 14, 12, 0, 0, Math.PI); x.fill(); x.beginPath(); x.moveTo(ex - 18, ey); x.lineTo(ex + 18, ey); x.lineWidth = LW2; x.stroke(); continue; }
    const k = f.eyes === 'wide' ? 1.5 : 1;
    x.beginPath(); x.ellipse(ex, ey, 11 * k, 15 * k, 0, 0, TAU); x.fill();
    x.beginPath(); x.ellipse(ex - 3 * k, ey - 6 * k, 4 * k, 5 * k, 0, 0, TAU); x.fillStyle = '#FFFFFF'; x.fill();
  }
  if (f.kind !== 'bot') for (const s of [-1, 1]) { x.beginPath(); x.ellipse(CX + s * R * .6, headY + R * .42, 20, 12, 0, 0, TAU); x.fillStyle = 'rgba(240,120,110,.45)'; x.fill(); }
  x.beginPath(); x.moveTo(CX - R * .16, headY + R * .5); x.quadraticCurveTo(CX, headY + R * .64, CX + R * .16, headY + R * .5); sh(x, null, LW2, ink);
}
function extra(x, f, L, view) {
  const { R, headY, sho } = L, back = view === 'back', dark = solid('#2B2733', '#1C1922');
  if (f.extra === 'headset') {
    x.beginPath(); x.ellipse(CX, headY, R * 1.06, R * 1.12, 0, Math.PI * 1.04, Math.PI * 1.96); x.lineWidth = 26; x.strokeStyle = INK; x.stroke(); x.lineWidth = 14; x.strokeStyle = dark.base; x.stroke();
    for (const s of [-1, 1]) shaded(x, rr(x, CX + s * R * 1.02 - 26, headY - R * .2, 52, R * .7, 20), dark, 0, 0, LW);
  } else if (f.extra === 'glasses' && !back) {
    for (const s of [-1, 1]) { x.beginPath(); x.arc(CX + s * R * .36, headY + R * .14, R * .24, 0, TAU); sh(x, null, 7); }
    x.beginPath(); x.moveTo(CX - R * .12, headY + R * .1); x.lineTo(CX + R * .12, headY + R * .1); sh(x, null, 7);
  } else if (f.extra === 'cap') {
    shaded(x, () => { x.beginPath(); x.ellipse(CX, headY - R * .35, R * 1.02, R * .78, 0, Math.PI, 0); x.closePath(); }, solid(ACCENT, '#B8402F'), -20, 0);
    if (!back) shaded(x, () => blob(x, CX, headY - R * .36, R * 1.2, R * .16, .02, 3), solid('#B8402F'), 0, 0, LW2 + 2);
  } else if (f.extra === 'scarf') {
    shaded(x, rr(x, CX - R * .8, sho - 34, R * 1.6, 58, 28), solid(ACCENT, '#B8402F'), -14);
    shaded(x, rr(x, CX + (back ? -R * .1 : R * .25), sho + 10, 46, 130, 16), solid(ACCENT, '#B8402F'), -10);
  } else if (f.extra === 'antenna') {
    const top = headY - R * (f.kind === 'bot' ? .9 : 1.02);
    x.beginPath(); x.moveTo(CX, top); x.lineTo(CX, top - 90); sh(x, null, 8);
    shaded(x, () => blob(x, CX, top - 100, 22, 22, .03, 1), solid(ACCENT, '#B8402F'), -6, 6, LW2 + 1);
  }
}

/** A canvas (FIGURE_W × FIGURE_H, transparent) with the figure as one cut-paper sticker, feet at the bottom centre. */
export function drawPaperFigure(figure, view = 'front') {
  if (view !== 'front' && view !== 'back') throw new Error(`paper figure: view "${view}" is not front or back`);
  const art = cv(FIGURE_W, FIGURE_H), x = art.getContext('2d'), L = layout(figure.body);
  legs(x, figure, L);
  arms(x, figure, L);
  if (figure.kind !== 'bot') shaded(x, rr(x, CX - 26, L.sho - 44, 52, 64, 16), figure.paint.skin, -10, 0, LW2 + 1);
  torso(x, figure, L, view);
  if (figure.extra === 'scarf') extra(x, figure, L, view);
  head(x, figure, L, view);
  if (figure.extra !== 'scarf') extra(x, figure, L, view);
  return finishCut(art);
}
