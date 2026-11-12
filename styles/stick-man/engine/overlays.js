// Drawn overlays over the picture (act `overlays`), the hand-drawn explainer layer of the storyboard: a loupe that shows a
// close view of a world point inside an orange ring with a leader line to it, a pop-up sound word, and a pair of arrows that
// spread from a world point along an axis (expansion). Drawn on the captions canvas after the frame, so they never enter the
// 3D look (ink, grade, bloom). Blender coordinates (x right, y into the set, z up), frames like everything else.
//   { kind: 'loupe', from, to, look: [x, y, z], cam: { pos, aim, lens }, at: [kx, ky], r }   r: radius as a share of the width
//   { kind: 'text', from, to, text, at: [kx, ky] | world: [x, y, z], size, tilt, shake }       size: px at 1080 wide
//   { kind: 'arrows', from, to, world: [x, y, z], axis: [x, y, z], len }                       len: metres at full spread
import * as THREE from 'three';

const ORANGE = '#f08a2c', INK = '#141414';
const pop = u => (u < 0 ? 0 : u >= 1 ? 1 : 1 + 0.18 * Math.sin(Math.PI * u) * (1 - u) - Math.pow(1 - u, 3));   // overshoot, settle

export function createOverlays({ stage, width, height, list = [] }) {
  const k = width / 1080, L = list.map(o => ({ ...o, to: o.to ?? o.from + 30 }));
  const loupeCv = document.createElement('canvas'); loupeCv.width = width; loupeCv.height = height;
  const lg = loupeCv.getContext('2d');
  const on = (o, f) => f >= o.from && f <= o.to;
  const screen = p => { const v = new THREE.Vector3(p[0], p[2], -p[1]).project(stage.camera); return [(v.x + 1) / 2 * width, (1 - v.y) / 2 * height, v.z < 1]; };

  // the loupe needs its own render: the caller renders with this camera and hands the canvas back before the main render
  const loupeAt = f => L.find(o => o.kind === 'loupe' && on(o, f)) || null;
  function grabLoupe(src) { lg.clearRect(0, 0, width, height); lg.drawImage(src, 0, 0, width, height); }

  function stroke(g, path, w, c) { g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = c; g.lineWidth = w; path(); g.stroke(); }
  function arrow(g, x0, y0, x1, y1, s) {
    const a = Math.atan2(y1 - y0, x1 - x0), h = 44 * k * s;
    const path = () => { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1);
      g.moveTo(x1 - h * Math.cos(a - 0.5), y1 - h * Math.sin(a - 0.5)); g.lineTo(x1, y1); g.lineTo(x1 - h * Math.cos(a + 0.5), y1 - h * Math.sin(a + 0.5)); };
    stroke(g, path, 26 * k, INK); stroke(g, path, 14 * k, ORANGE);
  }

  function draw(g, f) {
    for (const o of L) {
      if (!on(o, f)) continue;
      const u = pop((f - o.from) / 5), out = o.to - f < 4 ? (o.to - f) / 4 : 1, s = u * out;
      if (s <= 0) continue;
      if (o.kind === 'loupe') {
        const cx = o.at[0] * width, cy = o.at[1] * height, r = (o.r ?? 0.2) * width * s;
        const [tx, ty, vis] = screen(o.look);
        if (vis) { const d = Math.hypot(tx - cx, ty - cy) || 1, ex = cx + (tx - cx) / d * r, ey = cy + (ty - cy) / d * r;
          const path = () => { g.beginPath(); g.moveTo(ex, ey); g.lineTo(tx, ty); };
          stroke(g, path, 9 * k, INK); stroke(g, path, 4 * k, ORANGE);
          g.fillStyle = ORANGE; g.beginPath(); g.arc(tx, ty, 7 * k, 0, 2 * Math.PI); g.fill(); }
        g.save(); g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); g.clip();
        const side = Math.min(width, height) * 0.62;                   // the middle of the loupe render fills the ring
        g.drawImage(loupeCv, (width - side) / 2, (height - side) / 2, side, side, cx - r, cy - r, 2 * r, 2 * r);
        g.restore();
        const ring = () => { g.beginPath(); g.arc(cx, cy, r, 0, 2 * Math.PI); };
        stroke(g, ring, 22 * k, INK); stroke(g, ring, 12 * k, ORANGE);
      } else if (o.kind === 'text') {
        let x, y; if (o.world) { const p = screen(o.world); x = p[0] + (o.dx ?? 0) * width; y = p[1] + (o.dy ?? 0) * height; } else { x = o.at[0] * width; y = o.at[1] * height; }
        const sh = o.shake ? (f % 2 ? 1 : -1) * o.shake * k * Math.max(0, 1 - (f - o.from) / 10) : 0;
        g.save(); g.translate(x + sh, y); g.rotate((o.tilt ?? -8) * Math.PI / 180); g.scale(s, s);
        g.font = `900 ${(o.size ?? 150) * k}px InterReel, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
        g.lineWidth = 16 * k; g.strokeStyle = INK; g.strokeText(o.text, 0, 0); g.fillStyle = o.color ?? ORANGE; g.fillText(o.text, 0, 0);
        g.restore();
      } else if (o.kind === 'arrows') {
        const p = o.world, a = o.axis ?? [0, 1, 0], grow = Math.min(1, (f - o.from) / Math.max(1, (o.to - o.from) * 0.6));
        const at = t => screen([p[0] + a[0] * t, p[1] + a[1] * t, p[2] + a[2] * t]);
        const [x0, y0] = at(0), gap = (o.gap ?? 0.04), len = (o.len ?? 0.3) * (0.35 + 0.65 * grow);
        for (const sgn of [-1, 1]) { const [xa, ya] = at(sgn * gap), [xb, yb] = at(sgn * (gap + len)); arrow(g, xa, ya, xb, yb, s); }
        g.fillStyle = INK; g.beginPath(); g.arc(x0, y0, 5 * k, 0, 2 * Math.PI); g.fill();
      }
    }
  }
  return { loupeAt, grabLoupe, draw };
}
