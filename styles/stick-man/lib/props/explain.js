// Explainer effects: the visual words of a "how it works" line (light that hits and bounces, air or heat flowing, a
// shimmer, a cut-away that opens, a callout, a growing chart, a two-sides divider, a big stamp). Toon style: flat colour,
// a thick ink outline (inverted hull or an ink layer behind), sized in metres so the caller picks the phone-readable size.
// Each maker builds its meshes once and returns a THREE.Group with group.userData.set(...): a pure function of its
// arguments (time t in seconds since the effect fired, or keyed 0..1 values), so any frame renders alone.
// Wired into reels by MAKE in engine/verbs_fx.js (kinds rays, flow, shimmer, cutbox, callout, bars, split, stamp).
import * as THREE from 'three';
import { lin, toon, INK_RGB } from '../../engine/look.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };
const easeOut = x => 1 - Math.pow(1 - clamp01(x), 3);
const back = x => { const t = clamp01(x), c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const INK = lin(...INK_RGB);
const hullMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
const inkMat = () => new THREE.MeshBasicMaterial({ color: INK });
const flat = rgb => new THREE.MeshBasicMaterial({ color: lin(...rgb) });
const css = (c, a = 1) => `rgba(${c.map(x => Math.round(255 * Math.pow(clamp01(x), 1 / 2.2))).join(',')},${a})`;   // linear -> sRGB
const Y = new THREE.Vector3(0, 1, 0);
const B = p => new THREE.Vector3(p[0], p[2], -p[1]);                // Blender metres -> three
// a flat overlay mesh (labels, rings, cards): drawn on top, no ink prepass, no shadow
function overlay(geo, mat, order = 6) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false; m.userData.noPrepass = true; m.renderOrder = order;
  mat.transparent = true; mat.depthWrite = false; mat.depthTest = false; return m;
}
// a canvas texture card: text on a rounded card with an ink border; h = card height (m). Returns { mesh, draw(text) }.
export function card(text, { h = 0.16, fg = [0.02, 0.02, 0.03], bg = [1.0, 0.98, 0.92], border = true, px = 128, order = 7 } = {}) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex }), mesh = overlay(new THREE.PlaneGeometry(1, 1), mat, order);
  const draw = t => {
    const font = `900 ${px}px InterReel, Arial, Helvetica, sans-serif`; c.font = font;
    const tw = Math.ceil(c.measureText(t).width), H = Math.round(px * 1.5), Wd = tw + Math.round(px * 0.9);
    cv.width = Wd; cv.height = H; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle';
    const r = H * 0.28, lw = Math.max(6, px * 0.11);
    c.clearRect(0, 0, Wd, H);
    if (bg) { c.beginPath(); c.roundRect(lw / 2, lw / 2, Wd - lw, H - lw, r); c.fillStyle = css(bg); c.fill();
      if (border) { c.lineWidth = lw; c.strokeStyle = css(INK_RGB); c.stroke(); } }
    else { c.lineWidth = px * 0.16; c.lineJoin = 'round'; c.strokeStyle = css(INK_RGB); c.strokeText(t, Wd / 2, H / 2 + px * 0.04); }
    c.fillStyle = css(fg); c.fillText(t, Wd / 2, H / 2 + px * 0.04);
    tex.needsUpdate = true; mesh.scale.set(h * Wd / H, h, 1);
  };
  draw(text);
  return { mesh, draw };
}
// a unit cylinder along +y placed from a to b (three vectors), with its ink hull
function rod(r, mat, ink = 0.014) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 14), mat); m.castShadow = false;
  const h = new THREE.Mesh(new THREE.CylinderGeometry(r + ink, r + ink, 1, 14), hullMat); m.add(h);
  m.place = (a, b) => { const d = new THREE.Vector3().subVectors(b, a), L = d.length(); m.visible = L > 1e-4; if (!m.visible) return;
    m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.set(1, L, 1); m.quaternion.setFromUnitVectors(Y, d.normalize()); };
  return m;
}
function cone(r, len, mat, ink = 0.014) {
  const g = new THREE.ConeGeometry(r, len, 18); g.translate(0, -len / 2, 0);   // tip at the origin, pointing +y
  const m = new THREE.Mesh(g, mat); m.castShadow = false;
  const hg = new THREE.ConeGeometry(r + ink * 1.6, len + ink * 3, 18); hg.translate(0, -len / 2 + ink, 0); m.add(new THREE.Mesh(hg, hullMat));
  m.aim = (tip, dir) => { m.position.copy(tip); m.quaternion.setFromUnitVectors(Y, dir.clone().normalize()); };
  return m;
}
function ball(r, mat, ink = 0.012) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), mat); m.castShadow = false;
  const h = new THREE.Mesh(new THREE.SphereGeometry(r + ink, 16, 10), hullMat); m.add(h); return m;
}

// ---------------------------------------------------------------- light rays that hit and bounce (or get drunk in)
// build { n beams, r (m), spread (m between beams), color }. set(t, { from, hit, out, absorb, grow }): three-space points
// in the parent's frame. The beams shoot from `from` to `hit` in `grow` s; then either bounce on to `out` (white throws
// the sunlight back: a sparkle at the hit) or sink in (absorb: an orange spot swells where they land). Bright pips run
// down the beams after that, so a held frame still reads as moving light.
export function makeRays(stage, { n = 3, r = 0.035, spread = 0.22, color = [1.0, 0.80, 0.12] } = {}) {
  const g = new THREE.Group(), core = flat(color), pipM = flat([1.0, 0.98, 0.85]), beams = [];
  for (let i = 0; i < n; i++) {
    const a = rod(r, core), b = rod(r, core), ha = cone(r * 2.6, r * 6.5, core), hb = cone(r * 2.6, r * 6.5, core);
    const pips = [0, 1].map(() => ball(r * 0.75, pipM, 0.008));
    for (const m of [a, b, ha, hb, ...pips]) g.add(m);
    beams.push({ a, b, ha, hb, pips });
  }
  const spot = ball(0.09, flat([1.0, 0.45, 0.10]), 0.016); g.add(spot); stage.glow?.(spot, 0.6);
  const star = (ro, ri) => { const sh = new THREE.Shape(); for (let i = 0; i <= 8; i++) { const a = Math.PI / 4 * i, k = i % 2 ? ri : ro; const q = [Math.sin(a) * k, Math.cos(a) * k]; i ? sh.lineTo(...q) : sh.moveTo(...q); } return new THREE.ShapeGeometry(sh); };
  const spark = { mesh: new THREE.Group() }; spark.mesh.add(overlay(star(1.15, 0.36), inkMat(), 6), overlay(star(1.0, 0.26), flat([1.0, 0.96, 0.60]), 7)); g.add(spark.mesh);
  const tmp = new THREE.Vector3(), side = new THREE.Vector3();
  const set = (t, { from, hit, out = null, absorb = false, grow = 0.35, cam = null } = {}) => {
    g.visible = t >= 0 && !!from && !!hit; if (!g.visible) return;
    const F = new THREE.Vector3(...from), H = new THREE.Vector3(...hit), O = out ? new THREE.Vector3(...out) : null;
    const dir = tmp.subVectors(H, F).normalize().clone();
    side.crossVectors(dir, cam ? new THREE.Vector3(...cam).sub(H).normalize() : Y).normalize();   // beams spread across the view
    const u1 = easeOut(t / grow), u2 = O && !absorb ? easeOut((t - grow) / grow) : 0;
    beams.forEach((bm, i) => {
      const k = (i - (n - 1) / 2) * spread, f0 = F.clone().addScaledVector(side, k), h0 = H.clone().addScaledVector(side, k * 0.55);
      const tipA = f0.clone().lerp(h0, u1), dA = h0.clone().sub(f0);
      bm.a.place(f0, tipA); bm.ha.visible = u1 < 0.999 || absorb || !O; if (bm.ha.visible) bm.ha.aim(tipA, dA);
      if (O && !absorb) {
        const o0 = O.clone().addScaledVector(side, k * 1.3), tipB = h0.clone().lerp(o0, u2), dB = o0.clone().sub(h0);
        bm.b.visible = u2 > 0.001; if (bm.b.visible) bm.b.place(h0, tipB);
        bm.hb.visible = u2 > 0.001; if (bm.hb.visible) bm.hb.aim(tipB, dB);
      } else { bm.b.visible = bm.hb.visible = false; }
      // pips: once the beam is there, two bright dots run along it (and on along the bounce)
      bm.pips.forEach((p, j) => {
        const s = ((t - grow) * 1.1 + j * 0.5 + i * 0.17) % 1; p.visible = u1 >= 0.999 && t > grow;
        if (!p.visible) return;
        if (O && !absorb && u2 >= 0.999) { const o0 = O.clone().addScaledVector(side, k * 1.3); p.position.copy(s < 0.5 ? f0.clone().lerp(h0, s * 2) : h0.clone().lerp(o0, s * 2 - 1)); }
        else p.position.copy(f0.clone().lerp(h0, s));
      });
    });
    spot.visible = absorb && t > grow * 0.8;
    if (spot.visible) { const w = easeOut((t - grow * 0.8) / 0.5); spot.position.copy(H); spot.scale.setScalar(Math.max(1e-3, w * (1 + 0.12 * Math.sin(t * 9)))); }
    spark.mesh.visible = !!O && !absorb && t > grow * 0.9 && t < grow * 0.9 + 0.5;
    if (spark.mesh.visible) { const q = (t - grow * 0.9) / 0.5; spark.mesh.position.copy(H); spark.mesh.children.forEach(m => { m.material.opacity = 1 - q * q; }); spark.mesh.scale.setScalar(0.25 * (0.6 + 0.8 * easeOut(q * 2))); }
  };
  set(-1); g.userData.set = set; g.userData.spark = spark.mesh;
  return g;
}

// ---------------------------------------------------------------- flow arrow along a curved path (air, heat, water, money)
// build { path: [[x,y,z], ...] Blender metres from the anchor, medium (air cold heat water money), r }. set(t, { grow, life }): the arrow draws itself
// along the curve in `grow` s with its head on the tip, pips stream along it while it holds, and after `life` s the tail
// runs out after the head (the flow leaves). Colour by medium.
export const FLOW = { air: [0.72, 0.90, 1.0], cold: [0.50, 0.78, 1.0], heat: [1.0, 0.40, 0.10], water: [0.18, 0.52, 1.0], money: [0.36, 0.76, 0.34] };
export function makeFlow(stage, { path = [[0, 0, 0], [0.3, 0, 0.4], [0, 0, 0.8]], medium = 'air', r = 0.035, color = null, pips = 4 } = {}) {
  const g = new THREE.Group(), col = color || FLOW[medium] || FLOW.air, SEG = 96, RAD = 10;
  const curve = new THREE.CatmullRomCurve3(path.map(B), false, 'centripetal');
  const mat = flat(col), tube = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, r, RAD, false), mat);
  const hull = new THREE.Mesh(new THREE.TubeGeometry(curve, SEG, r + 0.014, RAD, false), hullMat);
  tube.castShadow = hull.castShadow = false; g.add(tube, hull);
  const head = cone(r * 2.7, r * 6.5, mat); g.add(head);
  const pipCol = medium === 'money' ? [1.0, 0.82, 0.20] : col.map(x => Math.min(1, 0.45 + 0.6 * x)), pm = flat(pipCol);
  const P = Array.from({ length: pips }, () => { const p = ball(r * (medium === 'money' ? 1.15 : 0.8), pm, 0.010); g.add(p); return p; });
  const per = RAD * 6;
  const draw = (a, b) => { const s = Math.floor(clamp01(a) * SEG) * per, e = Math.ceil(clamp01(b) * SEG) * per;
    for (const m of [tube, hull]) m.geometry.setDrawRange(s, Math.max(0, e - s)); };
  const set = (t, { grow = 0.7, life = Infinity } = {}) => {
    g.visible = t >= 0; if (!g.visible) return;
    const b = easeOut(t / grow), a = ease((t - life) / 0.6);
    g.visible = a < 0.995; if (!g.visible) return;
    draw(a, b);
    const tip = curve.getPointAt(Math.max(1e-3, b)), tan = curve.getTangentAt(Math.max(1e-3, b));
    head.aim(tip.clone().addScaledVector(tan, r * 4), tan);
    P.forEach((p, i) => { const s = (t * 0.55 + i / pips) % 1; p.visible = t > grow * 0.6 && s > a && s < b - 0.04;
      if (p.visible) p.position.copy(curve.getPointAt(s)); });
  };
  set(-1); g.userData.set = set; g.userData.curve = curve;
  return g;
}

// ---------------------------------------------------------------- heat shimmer: wavy rising strokes over a warm glow
// build { w, h (m), n strokes, color }. set({ heat 0..1, t seconds }): stroke wiggle and glow follow `heat`; hidden at 0.
// A camera-facing card drawn by a shader (orange strokes with an ink edge), so it stays crisp at any size.
export function makeShimmer(stage, { w = 0.5, h = 0.7, n = 3, color = [1.0, 0.45, 0.10] } = {}) {
  const U = { uT: { value: 0 }, uA: { value: 0 }, uC: { value: lin(...color) }, uI: { value: INK.clone() }, uN: { value: n } };
  const mat = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, depthTest: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv; uniform float uT, uA, uN; uniform vec3 uC, uI;
      void main(){
        vec2 p = vUv; float best = 9.0, on = 0.0;
        for (int i = 0; i < 6; i++) { if (float(i) >= uN) break;
          float x0 = (float(i) + 0.5) / uN, x = x0 + 0.07 * uA * sin(p.y * 11.0 - uT * 7.0 + float(i) * 2.1);
          float dash = step(fract(p.y * 1.6 - uT * 0.9 + float(i) * 0.37), 0.72);
          float d = abs(p.x - x) / max(0.2, 1.0 / uN); if (dash > 0.5 && d < best) best = d; }
        float yfade = smoothstep(0.0, 0.12, p.y) * smoothstep(1.0, 0.80, p.y);
        float core = 1.0 - smoothstep(0.045, 0.060, best), edge = 1.0 - smoothstep(0.085, 0.100, best);
        float glow = pow(max(0.0, 1.0 - length((p - vec2(0.5, 0.35)) * vec2(1.6, 1.2))), 2.0) * 0.35 * uA;
        vec3 col = mix(uI, uC, core); float a = max(edge * yfade * min(1.0, uA * 2.0), glow);
        col = mix(uC * 1.1, col, edge * yfade > 0.01 ? 1.0 : 0.0);
        if (a < 0.01) discard; gl_FragColor = vec4(col, a); }` });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.y = h / 2; m.userData.noPrepass = true; m.castShadow = false; m.renderOrder = 4;
  const g = new THREE.Group(); g.add(m);
  const set = ({ heat = 0, t = 0 } = {}) => { g.visible = heat > 0.01; U.uA.value = clamp01(heat); U.uT.value = t; };
  set({}); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- cut-away: a cylinder or box whose front half swings open
// build { shape: 'cylinder' | 'box', r, w, d, h (m), shell, cut (section colour), core (inside colour), coreR (share of r),
// label }. set({ open 0..1, show 0..1 }). The back half shows its cut edges in the section colour and what sits inside
// (a core with a gap round it: the air layer, the filling, the hidden part). Stands upright, front toward -y (camera side).
export function makeCutBox(stage, { shape = 'cylinder', r = 0.28, w = 0.6, d = 0.4, h = 0.8, th = 0.035, shell = [0.14, 0.14, 0.17], cut = [1.0, 0.52, 0.50],
  core = [1.0, 0.78, 0.36], coreR = 0.62, inner = [0.98, 0.95, 0.88] } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const Ms = toon(shell, { sheen: 0.3 }), Mc = toon(cut, { sheen: 0 }), Mi = toon(inner, { sheen: 0 }), Mk = toon(core, { sheen: 0.4 });
  const mesh = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true; return x; };
  const hinge = new THREE.Group(), front = new THREE.Group();
  if (shape === 'box') {
    const wall = (sx, sy, sz, px, py, pz, m = Ms) => { const x = mesh(new THREE.BoxGeometry(sx, sy, sz), m); x.position.set(px, py, pz); return x; };
    body.add(wall(w, h, th, 0, h / 2, -d / 2 + th / 2), wall(th, h, d, -w / 2 + th / 2, h / 2, 0), wall(th, h, d, w / 2 - th / 2, h / 2, 0),
      wall(w, th, d, 0, th / 2, 0), wall(w, th, d, 0, h - th / 2, 0));
    body.add(wall(w - 2 * th, h - 2 * th, 0.004, 0, h / 2, -d / 2 + th + 0.003, Mi));                         // pale inside back
    for (const s of [-1, 1]) body.add(wall(th * 1.02, h, 0.006, s * (w / 2 - th / 2), h / 2, d / 2 - 0.002, Mc));   // cut edges
    const k = mesh(new THREE.BoxGeometry(w * coreR, h * 0.72, d * coreR * 0.8), Mk); k.position.set(0, h * 0.42, -d * 0.05); body.add(k);
    hinge.position.set(w / 2, 0, d / 2); front.position.set(-w / 2, 0, 0); hinge.add(front);
    front.add(wall(w, h, th, 0, h / 2, -th / 2));
  } else {
    const outer = mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true, Math.PI / 2, Math.PI).translate(0, h / 2, 0), Ms);
    const innerW = new THREE.Mesh(new THREE.CylinderGeometry(r - th, r - th, h, 48, 1, true, Math.PI / 2, Math.PI).translate(0, h / 2, 0), Mi);
    innerW.material = Mi.clone(); innerW.material.side = THREE.BackSide; innerW.receiveShadow = true;
    body.add(outer, innerW);
    for (const s of [-1, 1]) { const e = mesh(new THREE.BoxGeometry(th, h, 0.006), Mc); e.position.set(s * (r - th / 2), h / 2, 0.001); body.add(e); }   // cut edges
    for (const y of [0.003, h - 0.003]) { const ring = mesh(new THREE.RingGeometry(r - th, r, 48, 1, Math.PI, Math.PI), Mc); ring.rotation.x = -Math.PI / 2; ring.position.y = y; body.add(ring); }
    const k = mesh(new THREE.CylinderGeometry(r * coreR, r * coreR, h * 0.86, 40).translate(0, h * 0.45, 0), Mk); body.add(k);
    hinge.position.set(r, 0, 0); front.position.set(-r, 0, 0); hinge.add(front);
    front.add(mesh(new THREE.CylinderGeometry(r, r, h, 48, 1, true, -Math.PI / 2, Math.PI).translate(0, h / 2, 0), Ms));
    const fi = new THREE.Mesh(new THREE.CylinderGeometry(r - th, r - th, h, 48, 1, true, -Math.PI / 2, Math.PI).translate(0, h / 2, 0), Mi.clone());
    fi.material.side = THREE.BackSide; front.add(fi);
  }
  body.add(hinge);
  const set = ({ open = 0, show = 1 } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    body.scale.setScalar(Math.max(1e-3, show)); hinge.rotation.y = 1.75 * clamp01(open);
  };
  set({}); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- callout: a zoom ring round a detail plus a label
// build { r (m), text, dir: [x, y] (label direction in the view, units of r), color }. set({ show 0..1, t }): the ring
// pops in (keyed `show`, ease back), breathes a little, the leader line and label follow. Turned to the camera by MAKE.
export function makeCallout(stage, { r = 0.22, text = 'LOOK', dir = [1.6, 1.3], color = [1.0, 0.84, 0.12], h = 0.15 } = {}) {
  const g = new THREE.Group(), pop = new THREE.Group(); g.add(pop);
  const ringI = overlay(new THREE.RingGeometry(r * 0.80, r * 1.08, 64), inkMat(), 6), ringC = overlay(new THREE.RingGeometry(r * 0.87, r * 1.0, 64), flat(color), 7);
  pop.add(ringI, ringC);
  const a = new THREE.Vector2(...dir).normalize().multiplyScalar(r * 1.04), b = new THREE.Vector2(...dir).multiplyScalar(r);
  const len = a.distanceTo(b), ang = Math.atan2(b.y - a.y, b.x - a.x);
  const lineI = overlay(new THREE.PlaneGeometry(len, 0.034), inkMat(), 6), lineC = overlay(new THREE.PlaneGeometry(len, 0.014), flat(color), 7);
  for (const m of [lineI, lineC]) { m.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0); m.rotation.z = ang; pop.add(m); }
  const lab = card(text, { h }); lab.mesh.position.set(b.x + Math.sign(dir[0] || 1) * lab.mesh.scale.x * 0.45, b.y, 0); pop.add(lab.mesh);
  const set = ({ show = 0, t = 0 } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    pop.scale.setScalar(Math.max(1e-3, show * (1 + 0.035 * Math.sin(t * 5))));
  };
  set({}); g.userData.set = set; g.userData.label = lab;
  return g;
}

// ---------------------------------------------------------------- bar chart that grows
// build { values, labels, colors, max, h (tallest bar, m), w (bar width), unit }. set({ grow 0..1, show 0..1, vals? }):
// toon bars on a base, the value printed over each bar (counting with the bar), the name under it. Yaw-turned to the camera.
export function makeBars(stage, { values = [3, 7], labels = ['A', 'B'], colors = null, max = null, h = 0.6, w = 0.16, gap = 0.10, unit = '' } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const n = values.length, M = max ?? Math.max(...values), span = n * w + (n - 1) * gap, pal = colors || [[0.98, 0.98, 0.95], [0.16, 0.16, 0.19], [1.0, 0.55, 0.15], [0.30, 0.60, 1.0]];
  const base = new THREE.Mesh(new THREE.BoxGeometry(span + 0.12, 0.03, w * 1.2), toon([0.30, 0.30, 0.34])); base.position.y = 0.015; base.castShadow = base.receiveShadow = true; body.add(base);
  const bars = values.map((v, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1, w * 0.7).translate(0, 0.5, 0), toon(pal[i % pal.length], { sheen: 0.25 }));
    m.castShadow = m.receiveShadow = true; m.position.set(-span / 2 + w / 2 + i * (w + gap), 0.03, 0); body.add(m);
    const top = card(`${v}${unit}`, { h: 0.10, bg: null, fg: [1, 1, 1], px: 110 }), name = card(labels[i] ?? '', { h: 0.085 });
    top.mesh.position.set(m.position.x, 0, w * 0.5); name.mesh.position.set(m.position.x, -0.06, w * 0.7); body.add(top.mesh, name.mesh);
    return { m, top, last: null };
  });
  const set = ({ grow = 1, show = 1, vals = null } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    body.scale.setScalar(Math.max(1e-3, show));
    bars.forEach((b, i) => {
      const v = (vals?.[i] ?? values[i]) * ease(grow), hh = Math.max(1e-3, h * v / M);
      b.m.scale.y = hh; b.top.mesh.position.y = 0.03 + hh + 0.07;
      const txt = `${Math.round(v)}${unit}`; if (txt !== b.last) { b.top.draw(txt); b.last = txt; }
    });
  };
  set({}); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- split divider: two sides compared
// build { h (m), gap (label spread, m), labels: [left, right], colors: [[bg], [bg]], lh (label height), badge (VS radius) }. set({ show 0..1 }): an ink bar wipes
// in from the middle, a round VS badge pops, each side's label slides in. Stand it between the two subjects.
export function makeSplit(stage, { h = 2.2, gap = 1.3, labels = ['WHITE', 'BLACK'], colors = [[1.0, 0.98, 0.92], [0.10, 0.10, 0.12]], fgs = null, vs = 'VS', lh = 0.26, badge: br = 0.24 } = {}) {
  const g = new THREE.Group();
  const barI = overlay(new THREE.PlaneGeometry(0.075, h), inkMat(), 5), barC = overlay(new THREE.PlaneGeometry(0.028, h - 0.03), flat([1.0, 0.86, 0.20]), 6);
  barI.position.y = barC.position.y = h / 2; g.add(barI, barC);
  const badgeI = overlay(new THREE.CircleGeometry(br, 48), inkMat(), 7), badgeC = overlay(new THREE.CircleGeometry(br * 0.84, 48), flat([1.0, 0.86, 0.20]), 8);
  const vsT = card(vs, { h: br * 0.95, bg: null, fg: [0.02, 0.02, 0.03], px: 120, border: false, order: 9 });
  vsT.mesh.material.map.needsUpdate = true;
  const badge = new THREE.Group(); badge.add(badgeI, badgeC, vsT.mesh); badge.position.y = h * 0.55; g.add(badge);
  const F = fgs || colors.map(c => (c[0] + c[1] + c[2] > 1.5 ? [0.02, 0.02, 0.03] : [1, 1, 1]));
  const L = labels.map((t, i) => { const c = card(t, { h: lh, bg: colors[i], fg: F[i] }); c.mesh.position.y = h * 0.93; g.add(c.mesh); return c; });
  const set = ({ show = 0 } = {}) => {
    g.visible = show > 0.01; if (!g.visible) return;
    const s = ease(show / 0.6); barI.scale.y = barC.scale.y = Math.max(1e-3, s);
    barI.position.y = barC.position.y = h * 0.55 + (h / 2 - h * 0.55) * s;
    badge.scale.setScalar(Math.max(1e-3, back((show - 0.35) / 0.45)));
    L.forEach((c, i) => { const u = easeOut((show - 0.5) / 0.5), sg = i ? 1 : -1; c.mesh.visible = u > 0.01; c.mesh.position.x = sg * (gap / 2) * (0.4 + 0.6 * u); c.mesh.material.opacity = u; });
  };
  set({}); g.userData.set = set;
  return g;
}

// ---------------------------------------------------------------- big number / stamp pop
// build { text ('SAME', '0 °F', '{n}%' counts with the keyed n), h (m), color, tilt (deg), frame (stamp border) }.
// set(t, { n, life }): slams in from 1.8x in 4 frames with a small overshoot and a shake, holds, gone after `life` s.
export function makeStamp(stage, { text = 'SAME', h = 0.32, color = [0.88, 0.10, 0.10], tilt = -8, frame = true, px = 150 } = {}) {
  const cv = document.createElement('canvas'), c = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mesh = overlay(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex }), 9);
  let last = null;
  const draw = t => {
    const font = `900 ${px}px InterReel, Arial, Helvetica, sans-serif`; c.font = font;
    const tw = Math.ceil(c.measureText(t).width), pad = frame ? px * 0.5 : px * 0.2, H = Math.round(px * 1.45 + pad), Wd = Math.round(tw + 2 * pad);
    cv.width = Wd; cv.height = H; c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.clearRect(0, 0, Wd, H);
    if (frame) { const lw = px * 0.12; c.beginPath(); c.roundRect(lw, lw, Wd - 2 * lw, H - 2 * lw, px * 0.22);
      c.fillStyle = 'rgba(255,252,240,0.92)'; c.fill(); c.lineWidth = lw * 2.2; c.strokeStyle = css(INK_RGB); c.stroke(); c.lineWidth = lw; c.strokeStyle = css(color); c.stroke(); }
    c.lineWidth = px * 0.20; c.strokeStyle = css(INK_RGB); c.strokeText(t, Wd / 2, H / 2 + px * 0.05);
    c.fillStyle = css(color); c.fillText(t, Wd / 2, H / 2 + px * 0.05);
    tex.needsUpdate = true; mesh.scale.set(h * Wd / H, h, 1);
  };
  const g = new THREE.Group(), pop = new THREE.Group(); pop.add(mesh); g.add(pop); pop.rotation.z = tilt * Math.PI / 180;
  const set = (t, { n = 0, life = Infinity } = {}) => {
    g.visible = t >= 0 && t < life; if (!g.visible) return;
    const s = text.replace('{n}', String(Math.round(n))); if (s !== last) { draw(s); last = s; }
    const f = t * 30, k = f < 4 ? 1.8 - 0.85 * (f / 4) : 0.95 + 0.05 * easeOut((f - 4) / 5) + 0.03 * Math.exp(-(f - 4) / 3) * Math.sin(f * 2.2);
    const out = 1 - ease((t - life + 0.25) / 0.25);
    pop.scale.setScalar(Math.max(1e-3, k * (Number.isFinite(life) ? out : 1)));
    pop.position.x = f < 10 ? 0.008 * Math.sin(f * 3.1) * (1 - f / 10) : 0;
    mesh.material.opacity = Math.min(1, f / 2 + 0.3);
  };
  set(-1); g.userData.set = set;
  return g;
}
