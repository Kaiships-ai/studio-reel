// Heads-up overlays (act `overlays`, drawn by engine/overlays.js): a countdown clock, a threat track, a two-way vote
// card and an edge flash. Sizes are px at 1080 wide; positions are shares of the frame. Each kind has a painter and a
// layout: the layout returns the boxes a viewer reads (shares of the frame), so the text check sees exactly what is drawn.
//   { kind: 'clock', from, to, keys: [[f, seconds], ...], at, size, label, labelSize, color, alarm, alarmColor, dropMin,
//     tags: [[f0, f1, text], ...], slots: { n, keys: [[f, count], ...], icon: 'bag' | 'dot', size }, slam, edge }
//   { kind: 'threat', from, to, steps: [{ f, who, word, level, color, whoColor }, ...], at, icon: 'car' | 'dot', you, hot }
//   { kind: 'vote', from, to, choices: [a, b], hits: [fa, fb], again: [fa, fb], or, at, size, colors, beat, tint,
//     lines: [{ f, to, text, cta, row }] }
//   { kind: 'edge', from, to, color, peak, band }
import { smooth } from './mathx.js';

const INK = '#0c0c0e', WHITE = '#f2f1ec', YELLOW = '#ffd60a', RED = '#ff3028', BLUE = '#3c8cff', GREEN = '#46e68c';

// the clock's seconds on frame f: straight between keys (a running clock), held before the first and after the last
export function clockValue(keys, f) {
  if (!keys?.length) return 0;
  if (f <= keys[0][0]) return keys[0][1];
  for (let i = 0; i + 1 < keys.length; i++) {
    const [fa, va] = keys[i], [fb, vb] = keys[i + 1];
    if (f < fb) return fb > fa ? va + (vb - va) * (f - fa) / (fb - fa) : vb;
  }
  return keys[keys.length - 1][1];
}
// a count that steps on its key frames (filled slots)
export function stepValue(keys, f) { let v = 0; for (const [kf, kv] of keys || []) if (f >= kf) v = kv; return v; }
export const clockSecs = (keys, f) => Math.max(0, Math.ceil(clockValue(keys, f) - 1e-6));
export const clockText = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const tagAt = (o, f) => (o.tags || []).find(([a, b]) => f >= a && f <= b)?.[2] ?? null;

// frames since the shown time last changed and by how much; since the last big drop (a jump of dropMin s or more that
// no tag explains) and its size. Each frame is worked out on its own, so a render in any frame order draws the same.
export function clockEvents(o, f, look = 40) {
  const min = o.dropMin ?? 30; let tick = null, drop = null;
  for (let g = f; g > Math.max(o.from, f - look); g--) {
    const d = clockSecs(o.keys, g - 1) - clockSecs(o.keys, g);
    if (d > 0 && tick == null) tick = { age: f - g, by: d };
    if (d >= min && !tagAt(o, g) && drop == null) drop = { age: f - g, by: d };
    if (tick && drop) break;
  }
  return { tick, drop };
}
// the threat track: the step in force on frame f, its age, and the marker's level eased over 16 frames from the last one
export function threatState(steps, f) {
  let k = -1; for (let i = 0; i < steps.length; i++) if (f >= steps[i].f) k = i;
  if (k < 0) return null;
  const s = steps[k], prev = k ? steps[k - 1].level : 0, age = f - s.f;
  return { ...s, age, level: prev + (s.level - prev) * smooth(age / 16) };
}
export const heartbeat = (f, f0, beat = 20) => (f < f0 ? 0 : Math.max(0, 1 - ((f - f0) % beat) / 8));

export function hudKinds({ width, height, k, rrect }) {
  const W = width, H = height;
  const font = px => `900 ${px}px InterReel, sans-serif`;
  const halo = g => { g.shadowColor = 'rgba(0,0,0,0.75)'; g.shadowBlur = 18 * k; };
  const plain = g => { g.shadowColor = 'transparent'; g.shadowBlur = 0; };
  function outlined(g, text, x, y, px, color, stroke) {
    g.font = font(px); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = 2 * stroke; g.strokeStyle = INK; g.strokeText(text, x, y); g.fillStyle = color; g.fillText(text, x, y);
  }
  function card(g, text, cx, cy, px, fg, bg, s = 1, rot = 0, a = 1) {
    g.save(); g.globalAlpha *= a; g.translate(cx, cy); g.rotate(rot * Math.PI / 180); g.scale(s, s);
    g.font = font(px); const w = g.measureText(text).width + 2 * 0.5 * px, h = px * 1.24 + 0.36 * px;
    g.fillStyle = bg; rrect(g, -w / 2, -h / 2, w, h, 0.24 * px); g.fill();
    g.lineWidth = 0.13 * px; g.strokeStyle = INK; rrect(g, -w / 2, -h / 2, w, h, 0.24 * px); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fg; g.fillText(text, 0, px * 0.04);
    g.restore();
  }
  const cardBox = (g, text, cx, cy, px) => { g.font = font(px); const w = g.measureText(text).width + px, h = px * 1.6;
    return [(cx - w / 2) / W, (cy - h / 2) / H, (cx + w / 2) / W, (cy + h / 2) / H]; };
  // a flash in the outer band of the frame only (faces sit inside it)
  function edgeFlash(g, alpha, color, band = 0.12) {
    if (alpha <= 0.002) return;
    g.save(); g.globalAlpha *= Math.min(1, alpha);
    const bx = band * W, by = band * 0.66 * H;
    for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, bx, 0, 0, 0, bx, H], [W, 0, W - bx, 0, W - bx, 0, bx, H], [0, 0, 0, by, 0, 0, W, by], [0, H, 0, H - by, 0, H - by, W, by]]) {
      const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
    }
    g.restore();
  }
  function bag(g, cx, cy, s, filled) {
    const w = s * 0.86, lw = Math.max(3 * k, s * 0.085);
    g.save(); g.lineWidth = lw; g.lineJoin = 'round';
    g.beginPath(); g.ellipse(cx, cy + s * 0.14, w / 2, s * 0.36, 0, 0, 2 * Math.PI);
    g.moveTo(cx - s * 0.16, cy - s * 0.24); g.lineTo(cx - s * 0.26, cy - s / 2); g.lineTo(cx, cy - s * 0.4); g.lineTo(cx + s * 0.26, cy - s / 2); g.lineTo(cx + s * 0.16, cy - s * 0.24);
    if (filled) { g.fillStyle = '#ffc424'; g.fill(); g.strokeStyle = INK; g.stroke(); outlined(g, '$', cx, cy + s * 0.15, s * 0.5, '#146e32', 0); }
    else { g.strokeStyle = 'rgba(255,255,255,0.6)'; g.stroke(); }
    g.restore();
  }
  function slot(g, icon, cx, cy, s, filled) {
    if (icon === 'bag') return bag(g, cx, cy, s, filled);
    g.save(); g.beginPath(); g.arc(cx, cy, s * 0.36, 0, 2 * Math.PI); g.lineWidth = Math.max(3 * k, s * 0.09);
    if (filled) { g.fillStyle = YELLOW; g.fill(); g.strokeStyle = INK; } else g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.stroke(); g.restore();
  }
  function cruiser(g, x, y, s, light) {
    const P = pts => { g.beginPath(); pts.forEach(([px, py], i) => (i ? g.lineTo : g.moveTo).call(g, x + px * s, y + py * s)); g.closePath(); };
    P([[-0.56, -0.12], [-0.56, -0.3], [-0.34, -0.34], [-0.22, -0.54], [0.16, -0.54], [0.3, -0.34], [0.54, -0.28], [0.56, -0.12]]);
    g.fillStyle = '#1c1e26'; g.fill(); g.lineWidth = Math.max(3 * k, s * 0.07); g.strokeStyle = INK; g.stroke();
    P([[-0.24, -0.14], [-0.24, -0.33], [0.2, -0.33], [0.2, -0.14]]); g.fillStyle = WHITE; g.fill();
    P([[-0.18, -0.36], [-0.12, -0.48], [0.02, -0.48], [0.02, -0.36]]); g.fillStyle = '#96bedc'; g.fill();
    g.fillStyle = light ? '#461616' : RED; g.fillRect(x - 0.15 * s, y - 0.66 * s, 0.13 * s, 0.11 * s);
    g.fillStyle = light ? BLUE : '#141e50'; g.fillRect(x - 0.02 * s, y - 0.66 * s, 0.13 * s, 0.11 * s);
    for (const wx of [-0.32, 0.32]) { g.beginPath(); g.arc(x + wx * s, y - 0.1 * s, 0.14 * s, 0, 2 * Math.PI); g.fillStyle = INK; g.fill(); }
  }

  // ---- clock: big outlined digits, red under `alarm` seconds with a punch and an edge flash on every second, a drop of
  // `dropMin` s or more shakes it and slides a red chip out, `tags` replace the label for a time skip, `slots` pop as they fill
  const clockGeo = o => { const [ax, ay] = o.at ?? [0.5, 0.15]; return { cx: ax * W, cy: ay * H, px: (o.size ?? 177) * k, lpx: (o.labelSize ?? 42) * k, ly: (ay - 0.0625) * H, sy: (ay + 0.072) * H }; };
  function clock(g, o, f) {
    const { cx, cy, px, lpx, ly, sy } = clockGeo(o), secs = clockSecs(o.keys, f), alarm = o.alarm != null && secs < o.alarm;
    const { tick, drop } = clockEvents(o, f), age = f - o.from, tag = tagAt(o, f);
    let s = 1, sh = 0, flash = 0;
    if (tick && tick.by === 1 && tick.age < 8) { const u = tick.age / 8; s += (alarm ? 0.14 : 0.04) * (1 - u) ** 2; if (alarm) flash = 0.16 * (1 - u); }
    if (drop && drop.age < 14) sh = 13.5 * k * Math.sin(drop.age * 2.4) * (1 - drop.age / 14);
    if (drop && drop.age < 10) flash = Math.max(flash, 0.32 * (1 - drop.age / 10));
    if (o.slam !== false && age < 8) { s *= 1 + 0.9 * Math.max(0, 1 - age / 5) ** 2; flash = Math.max(flash, 0.18 * Math.max(0, 1 - age / 6)); }
    if (o.edge !== false) edgeFlash(g, flash, o.alarmColor ?? RED);
    g.save(); halo(g);
    if (tag) outlined(g, tag, cx, ly, lpx * 1.2, YELLOW, 7.5 * k);
    else if (o.label) {
      g.font = font(lpx); const tw = g.measureText(o.label).width, dx = cx - tw / 2 - 0.6 * lpx, light = alarm && (f >> 3) % 2;
      g.beginPath(); g.arc(dx, ly, 0.27 * lpx, 0, 2 * Math.PI); g.fillStyle = light ? BLUE : RED; g.fill(); g.lineWidth = 4.5 * k; g.strokeStyle = INK; g.stroke();
      outlined(g, o.label, cx + 0.15 * lpx, ly, lpx, WHITE, 7.5 * k);
    }
    g.save(); g.translate(cx + sh, cy); g.scale(s, s); outlined(g, clockText(secs), 0, 0, px, alarm ? (o.alarmColor ?? RED) : (o.color ?? YELLOW), 15 * k); g.restore();
    if (drop && drop.age < 36) {
      const v = drop.age / 36, a = 1 - Math.max(0, (v - 0.6) / 0.4), y = cy - 15 * k + 36 * k * v;
      card(g, `-${clockText(drop.by)}`, cx + 0.3 * W, y, 50 * k, WHITE, o.alarmColor ?? RED, 1, 0, a);
    }
    if (o.slots) {
      const n = o.slots.n ?? 4, ss = (o.slots.size ?? 78) * k, gap = 0.31 * ss, x0 = cx - (n * ss + (n - 1) * gap) / 2 + ss / 2;
      const filled = stepValue(o.slots.keys, f);
      let fillAge = 99; for (let g2 = f; g2 > f - 12; g2--) if (stepValue(o.slots.keys, g2) > stepValue(o.slots.keys, g2 - 1)) { fillAge = f - g2; break; }
      for (let i = 0; i < n; i++) {
        let sz = ss; const x = x0 + i * (ss + gap);
        if (i === filled - 1 && fillAge < 12) { const t = fillAge / 12; sz *= 1 + 0.5 * (1 - t) ** 2;
          g.save(); g.beginPath(); g.arc(x, sy, ss * (0.6 + 0.9 * t), 0, 2 * Math.PI); g.lineWidth = 7.5 * k; g.strokeStyle = `rgba(255,230,120,${(0.86 * (1 - t)).toFixed(3)})`; g.stroke(); g.restore(); }
        slot(g, o.slots.icon ?? 'dot', x, sy, sz, i < filled);
      }
    }
    g.restore();
  }
  function clockBoxes(g, o, f) {
    const { cx, cy, px, lpx, ly, sy } = clockGeo(o), out = [];
    g.save(); g.font = font(px); const dw = g.measureText(clockText(clockSecs(o.keys, f)).replace(/\d/g, '0')).width + 30 * k;
    out.push({ text: clockText(clockSecs(o.keys, f)), box: [(cx - dw / 2) / W, (cy - 0.62 * px) / H, (cx + dw / 2) / W, (cy + 0.62 * px) / H] });
    const tag = tagAt(o, f), lab = tag ?? o.label;
    if (lab) { g.font = font(tag ? lpx * 1.2 : lpx); const lw = g.measureText(lab).width + 1.4 * lpx; out.push({ text: lab, box: [(cx - lw / 2) / W, (ly - 0.7 * lpx) / H, (cx + lw / 2) / W, (ly + 0.7 * lpx) / H] }); }
    const { drop } = clockEvents(o, f);
    if (drop && drop.age < 36) out.push({ text: `-${clockText(drop.by)}`, box: cardBox(g, `-${clockText(drop.by)}`, cx + 0.3 * W, cy - 15 * k + 36 * k * drop.age / 36, 50 * k) });
    if (o.slots) { const n = o.slots.n ?? 4, ss = (o.slots.size ?? 78) * k, w = n * ss + (n - 1) * 0.31 * ss; out.push({ text: '', box: [(cx - w / 2) / W, (sy - 0.55 * ss) / H, (cx + w / 2) / W, (sy + 0.55 * ss) / H] }); }
    g.restore(); return out;
  }

  // ---- threat: who (small line), one big word that slams in on its step, a marker that eases along a track toward YOU.
  // The track never leaves the screen: the danger holds between steps and rises only on the step that causes it.
  const threatGeo = o => { const [ax, ay] = o.at ?? [0.5, 0.165]; const cx = ax * W, cy = ay * H;
    return { cx, cy, pw: 0.739 * W, ph: 0.186 * H, wy: cy - 0.069 * H, by: cy - 0.0065 * H, ty: cy + 0.0607 * H, x0: cx - 0.317 * W, x1: cx + 0.233 * W }; };
  function threat(g, o, f) {
    const st = threatState(o.steps || [], f); if (!st) return;
    const G = threatGeo(o), col = st.color ?? RED, hot = st.level > (o.hot ?? 0.86), light = (f / 6 | 0) % 2;
    let flash = st.age < 8 ? 0.2 * (1 - st.age / 8) : 0; if (hot) flash = Math.max(flash, 0.1 * Math.max(0, 1 - (f % 15) / 7));
    edgeFlash(g, flash, hot ? (light ? BLUE : RED) : col);
    g.save(); halo(g); g.globalAlpha *= 0.52; g.fillStyle = '#08080c'; rrect(g, G.cx - G.pw / 2, G.cy - G.ph / 2, G.pw, G.ph, 39 * k); g.fill(); g.restore();
    g.save(); halo(g);
    if (st.who) { const wpx = 42 * k; g.font = font(wpx); const tw = g.measureText(st.who).width, dx = G.cx - tw / 2 - 0.4 * wpx;
      g.beginPath(); g.arc(dx, G.wy, 0.27 * wpx, 0, 2 * Math.PI); g.fillStyle = light ? BLUE : RED; g.fill(); g.lineWidth = 4.5 * k; g.strokeStyle = INK; g.stroke();
      outlined(g, st.who, G.cx + 0.2 * wpx, G.wy, wpx, st.whoColor ?? WHITE, 7.5 * k); }
    let px = 126 * k; g.font = font(px); while (g.measureText(st.word).width > 0.694 * W && px > 40 * k) { px -= 3 * k; g.font = font(px); }
    let s = 1 + 0.7 * Math.max(0, 1 - st.age / 5) ** 2 + (hot ? 0.05 * Math.max(0, 1 - (f % 15) / 6) : 0);
    s = Math.min(s, 0.96 * W / Math.max(1, g.measureText(st.word).width));
    const sh = 12 * k * Math.sin(st.age * 2.4) * Math.max(0, 1 - st.age / 12);
    g.save(); g.translate(G.cx + sh, G.by); g.scale(s, s); outlined(g, st.word, 0, 0, px, col, 13.5 * k); g.restore();
    plain(g);
    const bh = 27 * k, mx = G.x0 + (G.x1 - 12 * k - G.x0) * st.level;
    g.fillStyle = 'rgba(0,0,0,0.6)'; rrect(g, G.x0 - 21 * k, G.ty - bh / 2, G.x1 - G.x0 + 42 * k, bh, bh / 2); g.fill(); g.lineWidth = 6 * k; g.strokeStyle = INK; g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.66)'; for (let x = mx + 60 * k; x < G.x1 - 33 * k; x += 39 * k) { rrect(g, x, G.ty - 3 * k, 19.5 * k, 6 * k, 3 * k); g.fill(); }
    g.fillStyle = col; rrect(g, G.x0 - 15 * k, G.ty - 7.5 * k, Math.max(15 * k, mx - G.x0 + 15 * k), 15 * k, 7.5 * k); g.fill();
    g.fillStyle = YELLOW; rrect(g, G.x1 + 3 * k, G.ty - 37.5 * k, 123 * k, 75 * k, 18 * k); g.fill(); g.lineWidth = 6 * k; g.strokeStyle = INK; g.stroke();
    outlined(g, o.you ?? 'YOU', G.x1 + 64.5 * k, G.ty, 40 * k, INK, 0);
    const jig = hot ? 2.2 * k * Math.sin(f * 1.9) : 0;
    if ((o.icon ?? 'dot') === 'car') cruiser(g, mx, G.ty + 21 * k + jig, 111 * k, light);
    else { g.beginPath(); g.arc(mx, G.ty + jig, 24 * k, 0, 2 * Math.PI); g.fillStyle = col; g.fill(); g.lineWidth = 6 * k; g.strokeStyle = INK; g.stroke(); }
    g.restore();
  }
  function threatBoxes(g, o, f) {
    const st = threatState(o.steps || [], f); if (!st) return [];
    const G = threatGeo(o), top = st.who ? G.wy - 0.7 * 42 * k : G.by - 0.7 * 126 * k;   // the words and the track, not the panel's dark margin
    return [{ text: [st.who, st.word].filter(Boolean).join(' '), box: [(G.cx - G.pw / 2) / W, top / H, (G.x1 + 126 * k) / W, (G.ty + 37.5 * k) / H] }];
  }

  // ---- vote: two choices side by side that slam in on the words that name them, in two colours that say neither is
  // the right one; the half of the frame on that side takes its colour; a heartbeat from the first hit; the call to
  // action in rows under it. By default the whole card sits inside the text-safe box (y 0.14-0.65).
  // the pair shrinks until it fits the text-safe width (x 0.06-0.87, centred at `at`): long choices stay off the app's bands
  const voteGeo = (g, o) => {
    const [ax, ay] = o.at ?? [0.465, 0.47], [a, b] = o.choices ?? ['YES', 'NO'], fitW = 2 * Math.min(ax - 0.07, 0.86 - ax) * W, gap = 9 * k;
    let px = (o.size ?? 99) * k, wa, wb;
    for (;;) { g.font = font(px); wa = g.measureText(a).width + 0.85 * px; wb = g.measureText(b).width + 0.73 * px; if (wa + wb + gap <= fitW || px <= 36 * k) break; px *= 0.94; }
    const x0 = ax * W - (wa + wb + gap) / 2; return { px, cy: ay * H, wa, wb, ca: x0 + wa / 2, cb: x0 + wa + gap + wb / 2, seam: x0 + wa + gap / 2, h: 1.9 * px };
  };
  const rowY = (o, r) => ((o.at ?? [0.465, 0.47])[1] + 0.074 + (r - 1) * 0.058) * H;
  function vote(g, o, f) {
    const V = voteGeo(g, o), [a, b] = o.choices ?? ['YES', 'NO'], [fa, fb] = o.hits ?? [o.from, o.from], again = o.again ?? [];
    const colors = o.colors ?? ['#1654c8', '#de7608'], hb = heartbeat(f, fa, o.beat ?? 20), tint = o.tint ?? 0.35;
    const side = (i, text, cx, w, f0, rot) => {
      if (f < f0) return;
      const age = f - f0; let s = 1 + 0.95 * Math.max(0, 1 - age / 5) ** 2;
      if (again[i] != null && f >= again[i]) s += 0.34 * Math.max(0, 1 - (f - again[i]) / 8) ** 2;
      s *= 1 + 0.03 * hb;
      if (tint > 0) {
        const al = tint * (0.4 + 0.6 * Math.max(0, 1 - age / 9) + (again[i] != null && f >= again[i] ? 0.5 * Math.max(0, 1 - (f - again[i]) / 9) : 0) + 0.15 * hb);
        const edgeX = i ? W : 0, gr = g.createLinearGradient(edgeX, 0, V.seam, 0); gr.addColorStop(0, colors[i]); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.save(); g.globalAlpha *= Math.min(0.6, al); g.fillStyle = gr; g.fillRect(i ? V.seam : 0, 0, i ? W - V.seam : V.seam, H); g.restore();
      }
      const sh = 12 * k * Math.sin(age * 2.6) * Math.max(0, 1 - age / 10);
      g.save(); g.translate(cx + sh, V.cy); g.rotate(rot * Math.PI / 180); g.scale(s, s);
      g.fillStyle = colors[i]; rrect(g, -w / 2, -V.h / 2, w, V.h, 36 * k); g.fill();
      g.lineWidth = 13.5 * k; g.strokeStyle = INK; g.stroke();
      g.lineWidth = 6 * k; g.strokeStyle = 'rgba(240,239,234,0.88)'; rrect(g, -w / 2 + 13.5 * k, -V.h / 2 + 13.5 * k, w - 27 * k, V.h - 27 * k, 25 * k); g.stroke();
      outlined(g, text, 0, 0, V.px, WHITE, 7.5 * k);
      g.restore();
    };
    side(0, a, V.ca, V.wa, fa, 2); side(1, b, V.cb, V.wb, fb, -2);
    if (o.or != null && f >= o.or) {
      const s = Math.min(1, (f - o.or) / 6), r = 45 * k * (1 + 0.18 * Math.sin(Math.PI * s) * (1 - s));
      g.save(); g.beginPath(); g.arc(V.seam, V.cy, r, 0, 2 * Math.PI); g.fillStyle = YELLOW; g.fill(); g.lineWidth = 9 * k; g.strokeStyle = INK; g.stroke();
      outlined(g, 'or', V.seam, V.cy - 1.5 * k, 46 * k * Math.max(0.1, s), INK, 0); g.restore();
    }
    for (const [i, L] of (o.lines || []).entries()) {
      if (f < L.f || (L.to != null && f > L.to)) continue;
      const age = f - L.f, s = age < 6 ? 1 + 0.18 * Math.sin(Math.PI * age / 6) * (1 - age / 6) - Math.pow(1 - age / 6, 3) : 1;
      card(g, L.text, (o.at ?? [0.465])[0] * W, rowY(o, L.row ?? i + 1), (L.cta ? 75 : 66) * k, L.cta ? INK : WHITE, L.cta ? '#face1e' : '#121012', Math.max(0.01, s) * (1 + (L.cta ? 0.04 * hb : 0)));
    }
  }
  function voteBoxes(g, o, f) {
    const V = voteGeo(g, o), [fa, fb] = o.hits ?? [o.from, o.from], [a, b] = o.choices ?? ['YES', 'NO'], out = [];
    if (f >= fa) out.push({ text: a, box: [(V.ca - V.wa / 2) / W, (V.cy - V.h / 2) / H, (V.ca + V.wa / 2) / W, (V.cy + V.h / 2) / H] });
    if (f >= fb) out.push({ text: b, box: [(V.cb - V.wb / 2) / W, (V.cy - V.h / 2) / H, (V.cb + V.wb / 2) / W, (V.cy + V.h / 2) / H] });
    for (const [i, L] of (o.lines || []).entries()) if (f >= L.f && (L.to == null || f <= L.to)) out.push({ text: L.text, box: cardBox(g, L.text, (o.at ?? [0.465])[0] * W, rowY(o, L.row ?? i + 1), (L.cta ? 75 : 66) * k) });
    return out;
  }

  // ---- edge: a coloured flash in the frame's outer band that decays over its span (an alarm, a hit, a siren)
  function edge(g, o, f) { const u = (f - o.from) / Math.max(1, o.to - o.from); edgeFlash(g, (o.peak ?? 0.3) * (1 - u) ** 1.5, o.color ?? RED, o.band ?? 0.12); }

  return { kinds: { clock, threat, vote, edge }, boxes: { clock: clockBoxes, threat: threatBoxes, vote: voteBoxes, edge: () => [] }, colors: { INK, WHITE, YELLOW, RED, BLUE, GREEN } };
}
