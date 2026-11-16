// Drawn overlays over the picture (act `overlays`), the hand-drawn explainer layer of the storyboard: a loupe that shows a
// close view of a world point inside an orange ring with a leader line to it, a pop-up sound word or a boxed label, a pair
// of arrows that spread from a world point along an axis (expansion), a labelled meter, and a dotted path that draws on.
// Drawn on the captions canvas after the frame, so they never enter the 3D look (ink, grade, bloom). Blender coordinates
// (x right, y into the set, z up), frames like everything else. REEL_DATA.md "Overlays" lists every field.
//   { kind: 'loupe', from, to, look: [x, y, z], cam: { pos, aim, lens }, at: [kx, ky], r }   r: radius as a share of the width
//   { kind: 'text', from, to, text, at: [kx, ky] | world: [x, y, z], size, tilt, shake, color, box, enter }
//   { kind: 'arrows', from, to, world: [x, y, z], axis: [x, y, z], len, gap, inward }
//   { kind: 'meter', from, to, at: [kx, ky], width, label, keys: [[f, value], ...], max, unit, color, size, enter }
//   { kind: 'path', from, to, world: [[x, y, z], ...] | at: [[kx, ky], ...], dur, dash, width, color, arrow, labels: [a, b] }
// enter: 'pop' (overshoot in over 5 frames, shrink out over the last 4), 'fade' (alpha in and out), 'none' (on for the
// whole span: a label or clock carried across cuts or ticks)
import * as THREE from 'three';

const ORANGE = '#f08a2c', INK = '#141414', RED = '#e23b3b';
const clamp01 = u => (u < 0 ? 0 : u > 1 ? 1 : u);
const pop = u => (u < 0 ? 0 : u >= 1 ? 1 : 1 + 0.18 * Math.sin(Math.PI * u) * (1 - u) - Math.pow(1 - u, 3));   // overshoot, settle
const smooth = u => u * u * (3 - 2 * u);
const ENTER = { text: 'pop', loupe: 'pop', arrows: 'pop', meter: 'fade', path: 'fade' };

// scale and alpha of an overlay on frame f
export function envelope(o, f, from = o.from) {
  const enter = o.enter ?? ENTER[o.kind] ?? 'pop', u = (f - from) / 5, out = clamp01((o.to - f) / 4);
  if (enter === 'none') return { s: 1, a: 1 };
  if (enter === 'fade') return { s: 1, a: Math.min(clamp01(u), out) };
  return { s: pop(u) * out, a: 1 };
}

// the meter's value on frame f: held before the first key and after the last, smooth between keys
export function valueAt(keys, f) {
  if (!keys?.length) return 0;
  let i = 0; while (i < keys.length - 1 && keys[i + 1][0] <= f) i++;
  const [fa, va] = keys[i], [fb, vb] = keys[Math.min(keys.length - 1, i + 1)];
  return fb > fa ? va + (vb - va) * smooth(clamp01((f - fa) / (fb - fa))) : va;
}

export function createOverlays({ stage, width, height, list = [] }) {
  const k = width / 1080, L = list.map(o => ({ ...o, to: o.to ?? o.from + 30 }));
  const on = (o, f) => f >= o.from && f <= o.to;
  const screen = p => { const v = new THREE.Vector3(p[0], p[2], -p[1]).project(stage.camera); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height, v.z < 1]; };

  // the loupe needs its own render: the caller renders with this camera and hands the canvas back before the main render
  let loupeCv = null;
  const loupeAt = f => L.find(o => o.kind === 'loupe' && on(o, f)) || null;
  function grabLoupe(src) {
    if (!loupeCv) { loupeCv = document.createElement('canvas'); loupeCv.width = width; loupeCv.height = height; }
    const lg = loupeCv.getContext('2d'); lg.clearRect(0, 0, width, height); lg.drawImage(src, 0, 0, width, height);
  }

  function stroke(g, path, w, c) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = c; g.lineWidth = w; path(); g.stroke(); }
  function arrow(g, x0, y0, x1, y1, s) {
    const a = Math.atan2(y1 - y0, x1 - x0), h = 44 * k * s;
    const path = () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
      g.moveTo(x1 - h * Math.cos(a - 0.5), y1 - h * Math.sin(a - 0.5)); g.lineTo(x1, y1); g.lineTo(x1 - h * Math.cos(a + 0.5), y1 - h * Math.sin(a + 0.5)); };
    stroke(g, path, 26 * k, INK); stroke(g, path, 14 * k, ORANGE);
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }

  // a word at (x, y): outlined in ink, or on a rounded box. The box is measured with every digit as 0, so a clock that
  // changes its text each second keeps the same box.
  function label(g, o, x, y, s, a) {
    const px = (o.size ?? 150) * k, B = o.box === true ? {} : o.box;
    g.save(); g.globalAlpha *= a; g.translate(x, y); g.rotate((o.tilt ?? -8) * Math.PI / 180); g.scale(s, s);
    g.font = `900 ${px}px InterReel, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (B) {
      const pad = (B.pad ?? 0.32 * (o.size ?? 150)) * k, w = g.measureText(String(o.text).replace(/\d/g, '0')).width + 2 * pad, h = px * 0.86 + 1.1 * pad;
      g.save(); g.globalAlpha *= B.alpha ?? 0.82; g.fillStyle = B.color ?? INK; rrect(g, -w / 2, -h / 2, w, h, B.r != null ? B.r * k : Math.min(h / 2, pad)); g.fill(); g.restore();
      g.fillStyle = o.color ?? '#ffffff'; g.fillText(o.text, 0, px * 0.04);
    } else {
      g.lineWidth = 16 * k; g.strokeStyle = INK; g.strokeText(o.text, 0, 0); g.fillStyle = o.color ?? ORANGE; g.fillText(o.text, 0, 0);
    }
    g.restore();
  }

  const KINDS = {
    loupe(g, o, f, { s }) {
      const cx = o.at[0] * width, cy = o.at[1] * height, r = (o.r ?? 0.2) * width * s;
      const [tx, ty, vis] = screen(o.look);
      if (vis) { const d = Math.hypot(tx - cx, ty - cy) || 1, ex = cx + (tx - cx) / d * r, ey = cy + (ty - cy) / d * r;
        const path = () => { g.beginPath(); g.moveTo(ex, ey); g.lineTo(tx, ty); };
        stroke(g, path, 9 * k, INK); stroke(g, path, 4 * k, ORANGE);
        g.fillStyle = ORANGE; g.beginPath(); g.arc(tx, ty, 7 * k, 0, 2 * Math.PI); g.fill(); }
      if (loupeCv) {
        g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); g.clip();
        const side = Math.min(width, height) * 0.62;                   // the middle of the loupe render fills the ring
        g.drawImage(loupeCv, (width - side) / 2, (height - side) / 2, side, side, cx - r, cy - r, 2 * r, 2 * r);
        g.restore();
      }
      const ring = () => { g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); };
      stroke(g, ring, 22 * k, INK); stroke(g, ring, 12 * k, ORANGE);
    },
    text(g, o, f, { s, a }) {
      let x, y; if (o.world) { const p = screen(o.world); x = p[0] + (o.dx ?? 0) * width; y = p[1] + (o.dy ?? 0) * height; } else { x = o.at[0] * width; y = o.at[1] * height; }
      const sh = o.shake ? (f % 2 ? 1 : -1) * o.shake * k * Math.max(0, 1 - (f - o.from) / 10) : 0;
      label(g, o, x + sh, y, s, a);
    },
    arrows(g, o, f, { s }) {
      const p = o.world, ax = o.axis ?? [0, 1, 0], grow = Math.min(1, (f - o.from) / Math.max(1, (o.to - o.from) * 0.6));
      const at = t => screen([p[0] + ax[0] * t, p[1] + ax[1] * t, p[2] + ax[2] * t]);
      const [x0, y0] = at(0), gap = (o.gap ?? 0.04), len = (o.len ?? 0.3) * (0.35 + 0.65 * grow);
      for (const sgn of [-1, 1]) { const [xa, ya] = at(sgn * gap), [xb, yb] = at(sgn * (gap + len)); if (o.inward) arrow(g, xb, yb, xa, ya, s); else arrow(g, xa, ya, xb, yb, s); }
      g.fillStyle = INK; g.beginPath(); g.arc(x0, y0, 5 * k, 0, 2 * Math.PI); g.fill();
    },
    // a labelled bar on a dark panel: label left, value right, the bar below; the value moves smoothly between keys
    meter(g, o, f, { a }) {
      const px = (o.size ?? 46) * k, W = (o.width ?? 0.6) * width, pad = px * 0.45, barH = px * 0.72;
      const max = o.max ?? 100, v = valueAt(o.keys, f), share = clamp01(v / max);
      const pw = W + 2 * pad, ph = px + barH + 3 * pad, x0 = o.at[0] * width - pw / 2, y0 = o.at[1] * height - ph / 2;
      g.save(); g.globalAlpha *= a;
      g.save(); g.globalAlpha *= 0.82; g.fillStyle = INK; rrect(g, x0, y0, pw, ph, pad); g.fill(); g.restore();
      g.font = `900 ${px}px InterReel, sans-serif`; g.textBaseline = 'middle'; g.fillStyle = '#ffffff';
      const ty = y0 + pad + px / 2;
      g.textAlign = 'left'; g.fillText(o.label ?? '', x0 + pad, ty);
      g.textAlign = 'right'; g.fillStyle = o.color ?? RED; g.fillText(`${Math.round(v)}${o.unit ?? '%'}`, x0 + pad + W, ty);
      const by = y0 + 2 * pad + px;
      g.fillStyle = 'rgba(255,255,255,0.2)'; rrect(g, x0 + pad, by, W, barH, barH / 2); g.fill();
      if (share > 0) { g.fillStyle = o.color ?? RED; rrect(g, x0 + pad, by, Math.max(barH, W * share), barH, barH / 2); g.fill(); }
      g.restore();
    },
    // a dotted (or dashed) route through world points, projected each frame so it stays on the set as the camera moves;
    // it draws on over `dur` frames, an arrowhead leads, and labels sit on its ends (the end label pops when it arrives)
    path(g, o, f, { a }) {
      const pts = o.world ? o.world.map(screen) : o.at.map(([x, y]) => [x * width, y * height, true]);
      const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
      const total = seg.reduce((x, y) => x + y, 0), dur = o.dur ?? Math.round((o.to - o.from) * 0.6);
      const grow = dur > 0 ? clamp01((f - o.from) / dur) : 1;
      let left = 0, tip = pts[0], dir = 0;
      const lw = (o.width ?? 12) * k, dash = o.dash === 'dash' ? [lw * 2.4, lw * 1.8] : [0.01, lw * 2.2];
      const line = () => {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); left = smooth(grow) * total; tip = pts[0];
        for (let i = 0; i < seg.length && left > 0; i++) {
          const p = pts[i], q = pts[i + 1], t = Math.min(1, left / (seg[i] || 1)); left -= seg[i];
          tip = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]; dir = Math.atan2(q[1] - p[1], q[0] - p[0]);
          if (p[2] && q[2]) g.lineTo(tip[0], tip[1]); else g.moveTo(tip[0], tip[1]);
        }
      };
      g.save(); g.globalAlpha *= a; g.setLineDash(dash);
      stroke(g, line, lw * 1.9, INK); stroke(g, line, lw, o.color ?? ORANGE);
      g.setLineDash([]);
      if (o.arrow !== false && grow > 0) {
        const h = lw * 3.2, head = () => { g.beginPath(); g.moveTo(tip[0] - h * Math.cos(dir - 0.55), tip[1] - h * Math.sin(dir - 0.55)); g.lineTo(tip[0], tip[1]);
          g.lineTo(tip[0] - h * Math.cos(dir + 0.55), tip[1] - h * Math.sin(dir + 0.55)); };
        stroke(g, head, lw * 1.9, INK); stroke(g, head, lw, o.color ?? ORANGE);
      }
      g.restore();
      const [la, lb] = o.labels ?? [], lab = { size: o.labelSize ?? 44, tilt: 0, box: true }, up = (o.labelDy ?? -0.03) * height;
      if (la && pts[0][2]) label(g, { ...lab, text: la }, pts[0][0], pts[0][1] + up, 1, a);
      const end = pts[pts.length - 1], arrive = o.from + dur;
      if (lb && end[2] && f >= arrive) label(g, { ...lab, text: lb }, end[0], end[1] + up, pop((f - arrive) / 5), a);
    },
  };

  function draw(g, f) {
    for (const o of L) {
      if (!on(o, f)) continue;
      const e = envelope(o, f);
      if (e.s <= 0 || e.a <= 0) continue;
      KINDS[o.kind]?.(g, o, f, e);
    }
  }
  return { loupeAt, grabLoupe, draw };
}
