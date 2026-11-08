// paper/set.js: the world behind the paper engine's story shots, as a pop-up book spread (styles/paper-popup). A printed
// back board stands up from the floor page, then cut-paper pieces pop up in front of it, back to front, each throwing its
// cut-out shadow on the board. The room is the 3D engine's room (episode/world.js, main.js): a night window with a sign
// across the street, string lights, a poster, a shelf and the desk with its screen. It takes its colours and words from
// the episode: palette.neon gives the room its hue, palette.left the string lights, palette.right the poster and the
// rival's corner, series the poster, texts.handle the screen, texts.sign the corner's sign.
// Everything is drawn once at start; a frame draws the floor, the board and the front pieces (one image each, or one per
// piece while they pop), so a CPU-only runner stays fast.
import { finishCut, blob } from '/core/paper-figure.js';

const W = 1080, H = 1920, FLOOR = 1500, M = 300, SW = W + 2 * M;   // set px: x from -M to W + M, the floor line at y 1500
const INK = '#3A2A24', RED = '#D8423A', GOLD = '#FFCF3F', TEAL = '#24807A', LEAF = ['#3F8A5A', '#2F6B47', '#57A06C'];
const DISPLAY = '"Lilita One", Fredoka, Arial, sans-serif', ROUND = 'Fredoka, Arial, sans-serif';
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const back = (x) => 1 + 2.7 * (x - 1) ** 3 + 1.7 * (x - 1) ** 2;
const hsh = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
function hueOf(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), d = mx - Math.min(r, g, b);
  if (!d) return 0;
  const h = mx === r ? (g - b) / d % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(60 * h + 360) % 360;
}
const tone = (h, s, l) => `hsl(${h} ${s}% ${l}%)`;   // the palette's hue at a children's-book saturation, never neon
function ink(x, fill, lw = 7) {
  if (fill) { x.fillStyle = fill; x.fill(); }
  if (lw) { x.lineWidth = lw; x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = INK; x.stroke(); }
}
const box = (x, px, py, w, h, r, fill, lw) => { x.beginPath(); x.roundRect(px, py, w, h, r); ink(x, fill, lw); };
function label(x, s, cx, cy, size, col, maxW, font = DISPLAY) {
  x.font = `400 ${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = col; x.fillText(s, cx, cy, maxW);
}

// a cut piece: drawn by art(x) on its own canvas at (px, py) in set px, finished with the off-white border and grain,
// plus its shadow on the board (the cut-out silhouette, soft, offset away from the lamp)
function piece(px, py, w, h, art) {
  const P = 30, c = cv(w + 2 * P, h + 2 * P), x = c.getContext('2d');
  x.translate(P, P); art(x);
  const img = finishCut(c, 12), shadow = cv(c.width, c.height), s = shadow.getContext('2d');
  s.filter = 'blur(7px)'; s.drawImage(img, 0, 0); s.filter = 'none';
  s.globalCompositeOperation = 'source-in'; s.fillStyle = 'rgba(30,18,24,.38)'; s.fillRect(0, 0, c.width, c.height);
  return { img, shadow, x: px - P + M, y: py - P, w: c.width, h: c.height };
}
// the back board: wall art over the full set width, a darker skirting band at the floor
function board(wall, stripe, art) {
  const c = cv(SW, FLOOR), x = c.getContext('2d');
  x.fillStyle = wall; x.fillRect(0, 0, SW, FLOOR);
  x.fillStyle = stripe; for (let sx = 0; sx < SW; sx += 140) x.fillRect(sx, 0, 70, FLOOR);
  x.save(); x.translate(M, 0); art(x); x.restore();
  x.fillStyle = 'rgba(30,18,24,.28)'; x.fillRect(0, FLOOR - 70, SW, 70);
  x.fillStyle = 'rgba(30,18,24,.5)'; x.fillRect(0, FLOOR - 8, SW, 8);
  return c;
}
// the front pieces on one canvas with their shadows (drawn once the pop is over), and a soft half-size copy of an image
// for close-ups, where the set is out of focus behind the face
function front(pieces) {
  const c = cv(SW, FLOOR + 60), x = c.getContext('2d');
  for (const p of pieces) x.drawImage(p.shadow, p.x + 22, p.y + 8);
  for (const p of pieces) x.drawImage(p.img, p.x, p.y);
  return c;
}
function soft(img) {
  const c = cv(img.width / 2, img.height / 2), x = c.getContext('2d');
  x.filter = 'blur(4px)'; x.drawImage(img, 0, 0, c.width, c.height); return c;
}

function room(EP) {
  const P = EP.palette ?? {}, h = hueOf(P.neon ?? '#FF3D8B'), hl = hueOf(P.left ?? P.neon ?? '#FF3D8B'), hr = hueOf(P.right ?? '#29E0FF');
  const wall = board(tone(h, 28, 33), tone(h, 28, 37), (x) => {
    const g = x.createRadialGradient(880, 1060, 40, 880, 1060, 640);   // the desk lamp's warm wash
    g.addColorStop(0, 'rgba(255,186,110,.32)'); g.addColorStop(1, 'rgba(255,186,110,0)'); x.fillStyle = g; x.fillRect(240, 420, 1280, 1080);
    // the window: night sky, the far block, the sign across the street (the 3D neon), the cross bars and two curtains
    const wx = 140, wy = 330, ww = 440, wh = 560, sky = x.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#151B3C'); sky.addColorStop(1, '#2C1E4C');
    box(x, wx - 18, wy - 18, ww + 36, wh + 36, 10, '#E9E6E1', 7); box(x, wx, wy, ww, wh, 4, sky, 5);
    x.save(); x.beginPath(); x.rect(wx, wy, ww, wh); x.clip();
    for (let i = 0; i < 30; i++) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(wx + ww * hsh(i, 1), wy + wh * 0.45 * hsh(i, 2), 3, 3); }
    x.fillStyle = tone(235, 30, 20); x.fillRect(wx, wy + wh * 0.5, ww, wh * 0.5);
    for (let i = 0; i < 24; i++) { x.fillStyle = hsh(i, 4) > 0.6 ? 'rgba(255,196,120,.8)' : 'rgba(130,160,255,.5)'; x.fillRect(wx + 20 + (ww - 50) * hsh(i, 5), wy + wh * (0.56 + 0.4 * hsh(i, 6)), 12, 16); }
    x.shadowColor = tone(h, 80, 60); x.shadowBlur = 24; x.strokeStyle = tone(h, 78, 66); x.lineWidth = 12; x.lineCap = 'round';
    x.beginPath(); x.moveTo(wx + 70, wy + wh * 0.4); x.lineTo(wx + 260, wy + wh * 0.4); x.moveTo(wx + 290, wy + wh * 0.4); x.lineTo(wx + 370, wy + wh * 0.4); x.stroke();
    x.restore();
    x.fillStyle = '#E9E6E1'; x.fillRect(wx + ww / 2 - 9, wy, 18, wh); x.fillRect(wx, wy + wh / 2 - 9, ww, 18);
    for (const s of [-1, 1]) {
      const cx = s < 0 ? wx - 30 : wx + ww + 30;
      x.beginPath(); x.moveTo(cx - 70 * s, wy - 40); x.lineTo(cx + 40 * s, wy - 40);
      for (let k = 0; k <= 6; k++) x.lineTo(cx + (40 - 12 * Math.sin(k)) * s + (k === 6 ? 30 * s : 0), wy - 40 + (wh + 90) * k / 6);
      x.lineTo(cx - 70 * s, wy + wh + 50); x.closePath(); ink(x, tone(h, 50, 46), 6);
      x.strokeStyle = tone(h, 50, 36); x.lineWidth = 6; for (let k = 1; k < 3; k++) { x.beginPath(); x.moveTo(cx - (70 - 35 * k) * s, wy - 30); x.lineTo(cx - (70 - 35 * k) * s, wy + wh + 40); x.stroke(); }
    }
    box(x, wx - 120, wy - 58, ww + 240, 16, 8, '#8A6A50', 5);
    // string lights across the top (palette.left and gold), the poster with the show's name (palette.right)
    x.lineWidth = 4; x.strokeStyle = INK; x.beginPath(); x.moveTo(-M + 40, 170);
    for (let i = 0; i <= 40; i++) { const sx = -M + 40 + (SW - 80) * i / 40; x.lineTo(sx, 170 + 60 * Math.sin(Math.PI * ((i * 4) % 40) / 40)); } x.stroke();
    for (let i = 0; i < 40; i++) { const sx = -M + 60 + (SW - 80) * i / 40, sy = 186 + 60 * Math.sin(Math.PI * ((i * 4 + 0.5) % 40) / 40);
      x.beginPath(); x.ellipse(sx, sy, 11, 15, 0, 0, 7); ink(x, i % 3 === 1 ? tone(hl, 80, 64) : GOLD, 3); }
    x.save(); x.translate(820, 560); x.rotate(0.04);
    box(x, -150, -200, 300, 400, 8, tone(hr, 52, 46), 6);
    x.beginPath(); x.arc(0, -40, 90, 0, 7); ink(x, tone(hr, 50, 60), 5);
    const words = String(EP.series ?? '').toUpperCase().split(/\s+/).slice(0, 3);
    words.forEach((s, i) => label(x, s, 0, 120 + (i - (words.length - 1) / 2) * 52, 50, '#FFF4D6', 250));
    x.fillStyle = 'rgba(240,236,228,.75)'; x.fillRect(-170, -215, 70, 26); x.fillRect(100, -215, 70, 26);
    x.restore();
  });
  // the shelf (left, books and a plant) and the desk (right: the screen with the handle, a lamp, a mug)
  const shelf = piece(-170, 720, 330, 780, (x) => {
    for (let i = 0; i < 9; i++) blob(x, 165 + 70 * Math.cos(i * 0.8), 70 + 40 * Math.sin(i * 1.3), 34, 60, 0.08, i + 3), ink(x, LEAF[i % 3], 5);
    box(x, 115, 90, 100, 90, 12, '#C9663A', 6);
    box(x, 0, 170, 330, 610, 10, tone(28, 36, 36), 7);
    for (let r = 0; r < 3; r++) {
      const y0 = 200 + r * 190;
      box(x, 22, y0, 286, 168, 4, tone(28, 34, 24), 4);
      let bx = 34;
      for (let k = 0; bx < 280; k++) { const bw = 26 + 18 * hsh(r * 9 + k, 1), bh = 110 + 46 * hsh(r * 9 + k, 2), col = [RED, GOLD, TEAL, tone(h, 45, 52), '#E9E6E1'][(r * 3 + k) % 5];
        if (bx + bw > 296) break; box(x, bx, y0 + 168 - bh, bw, bh, 3, col, 4); bx += bw + 3; }
    }
  });
  const desk = piece(560, 900, 500, 600, (x) => {
    box(x, 120, 30, 260, 190, 14, '#2B2F3A', 7);
    const scr = x.createLinearGradient(0, 50, 0, 200); scr.addColorStop(0, tone(215, 55, 32)); scr.addColorStop(1, tone(225, 50, 22));
    box(x, 138, 48, 224, 154, 6, scr, 0);
    if (EP.texts?.handle) label(x, EP.texts.handle, 250, 82, 24, '#E8F2FF', 200, ROUND);
    for (let i = 0; i < 6; i++) { const bh = 14 + 70 * (i / 5) ** 2; x.fillStyle = tone(h, 70, 66); x.fillRect(165 + i * 30, 188 - bh, 20, bh); }
    box(x, 232, 220, 36, 50, 4, '#2B2F3A', 5);
    box(x, 0, 268, 500, 40, 10, tone(30, 42, 48), 7);
    box(x, 26, 306, 34, 294, 6, tone(30, 40, 38), 6); box(x, 440, 306, 34, 294, 6, tone(30, 40, 38), 6);
    box(x, 60, 330, 380, 110, 8, tone(30, 40, 42), 6);
    x.beginPath(); x.moveTo(440, 268); x.lineTo(460, 140); x.lineTo(400, 60); ink(x, null, 9);
    x.beginPath(); x.moveTo(330, 70); x.lineTo(430, 20); x.lineTo(450, 100); x.closePath(); ink(x, GOLD, 6);
    box(x, 40, 210, 50, 60, 10, RED, 5);
  });
  return { floor: tone(28, 38, 40), board: wall, pieces: [shelf, desk] };
}

// the rival's corner, far from the room: panelled wall in palette.right's hue, warm and cool bulbs, the sign (texts.sign),
// a ring light on its pole, a shelf with a trophy
function corner(EP) {
  const hr = hueOf(EP.palette?.right ?? '#29E0FF');
  const wall = board(tone(hr, 16, 30), tone(hr, 16, 27), (x) => {
    x.strokeStyle = 'rgba(20,24,34,.35)'; x.lineWidth = 4;
    for (let y = 120; y < FLOOR; y += 140) { x.beginPath(); x.moveTo(-M, y); x.lineTo(W + M, y); x.stroke(); }
    for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(-200 + 1480 * hsh(i, 1), 260 + 640 * hsh(i, 3), 14, 0, 7); ink(x, hsh(i, 5) > 0.5 ? '#FFB86B' : tone(hr, 75, 70), 3); }
  });
  const sign = piece(330, 330, 420, 190, (x) => {
    box(x, 0, 0, 420, 190, 18, '#1E2230', 7);
    x.shadowColor = tone(hr, 85, 60); x.shadowBlur = 20;
    label(x, String(EP.texts?.sign ?? '').toUpperCase(), 210, 100, 84, tone(hr, 80, 72), 370); x.shadowBlur = 0;
  });
  const ring = piece(800, 520, 260, 980, (x) => {
    x.beginPath(); x.moveTo(130, 250); x.lineTo(130, 940); ink(x, null, 12);
    x.beginPath(); x.moveTo(130, 940); x.lineTo(40, 980); x.moveTo(130, 940); x.lineTo(220, 980); ink(x, null, 10);
    x.beginPath(); x.arc(130, 130, 120, 0, 7); x.arc(130, 130, 82, 0, 7, true); ink(x, '#F4F3F1', 7);
  });
  const shelf = piece(-220, 1100, 380, 400, (x) => {
    box(x, 0, 120, 380, 280, 10, tone(hr, 18, 22), 7);
    x.beginPath(); x.moveTo(60, 10); x.lineTo(150, 10); x.lineTo(130, 70); x.lineTo(80, 70); x.closePath(); ink(x, GOLD, 6); box(x, 92, 70, 26, 30, 3, GOLD, 5); box(x, 70, 98, 70, 22, 4, '#8A6A50', 5);
    box(x, 200, 40, 120, 80, 8, RED, 6);
  });
  return { floor: tone(hr, 14, 21), board: wall, pieces: [sign, shelf, ring] };
}

export function createPaperSet(g, EP) {
  const SETS = [room(EP), corner(EP)];
  for (const S of SETS) { S.front = front(S.pieces); S.boardSoft = soft(S.board); S.frontSoft = soft(S.front); }
  // set px (sx, sy) at depth factor f lands at X = W/2 + (sx - M - cam.cx) * z, Y = cam.floor - (FLOOR - sy) * z,
  // z = 1 + (cam.z - 1) * f: the board moves less than the front pieces, the figures (f = 1) most
  function layer(img, f, cam, sx, sy, w, h, rise = 1) {
    const z = 1 + (cam.z - 1) * f, X = W / 2 + (sx - M - cam.cx) * z, foot = cam.floor - (FLOOR - sy - h) * z;
    g.drawImage(img, X, foot - h * z * rise, w * z, h * z * rise);
  }
  // cam = { z, cx, floor } from the shot's framing; popT = seconds since the set came on screen (undefined: already up)
  return function draw(t, cam, inCorner, popT) {
    const S = SETS[inCorner ? 1 : 0], blur = cam.z > 1.7;
    g.fillStyle = S.floor; g.fillRect(0, cam.floor - 4, W, H);
    g.fillStyle = 'rgba(30,18,24,.25)'; g.fillRect(0, cam.floor - 4, W, 26);
    const up = popT === undefined ? 1 : back(seg(popT, 0, 0.35));
    if (up > 0) layer(blur ? S.boardSoft : S.board, 0.55, cam, 0, 0, SW, FLOOR, Math.max(0.05, up));
    if (popT === undefined || popT > 0.9) { layer(blur ? S.frontSoft : S.front, 0.8, cam, 0, 0, SW, FLOOR + 60); return; }
    S.pieces.forEach((p, i) => {
      const k = back(seg(popT, 0.2 + 0.08 * i, 0.55 + 0.08 * i)); if (k <= 0) return;
      layer(p.shadow, 0.8, cam, p.x + 22, p.y + 8, p.w, p.h, k);
      layer(p.img, 0.8, cam, p.x, p.y, p.w, p.h, k);
    });
  };
}
