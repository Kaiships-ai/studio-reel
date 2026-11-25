// The wardrobe (Kai 25/11, What if 1 V3: "costumes are too simple", "every character looks the same, old or young, big or
// small"): job uniforms and everyday clothes as costume layers on any body (motion-lib/bodies.js), sized from the spec's
// own build (girth, leg length; the head and the whole figure scale with it), never fixed to one body.
//   import '/styles/stick-man/kit/cast/wardrobe.js'      (it loads costume.js: belt, holster and the old hats still work)
//   cast: { doc: { spec: 'X', costume: ['job:doctor'] } }                       a job preset (JOBS below)
//         { spec: 'X', costume: ['shirt:office:sky', 'tie:crimson', 'blazer:navy', 'nametag'] }   layers one by one
//         { spec: 'X', costume: ['sweater:' + outfit(i), 'scarf:' + outfit(i + 3)] }               a crowd: outfit(i) never repeats a neighbour
// How each part is made (Kai's rule, 25/11):
//   garments  painted on the torso's own texture (base colour, seams, plackets, stripes, ribs, the V of an open coat), inner
//             layers first, so a blazer's opening shows the shirt and tie under it
//   trims     rigid pieces on the torso shell (collars, lapels, buttons, pockets, badges, name tags, pens, a tie, a stethoscope,
//             straps, belts, neck and hem bands): built on the torso's surface a few mm out and bent with the torso
//             vertex by vertex every frame (wear.js), no sim
//   sleeves   a thin coloured tube on each drawn arm line, its cuff at the wrist, the black mitt left as the hand (wear.js)
//   cloth     only what moves: a coat's skirts, a skirt, an apron, a scarf's ends (drape.js on cloth.js)
//   hats      rigid on the head (Kai hates wobble): cap:police, cap:pilot, cap:scrub, hat:hard, hat:toque (hats.js)
// Colours are linear (as everywhere in the kit; a :rrggbb is read as costume.js reads it). No garment is a flat near-white:
// the white coats are a warm off-white, shaded by the cel ramp and folds (valuegate's blown object).
import * as THREE from 'three';
import { W_M } from '#engine/cast.js';
import { css } from '#engine/look.js';
import { HOOKS } from '#engine/play.js';
import { PHYS } from '#engine/body.js';
import './costume.js';
import { fitOf, thS, rider, wearMat, sleeve, thinHull, H_T, Y0 } from './wear.js';
import { drape } from './drape.js';
import { UNIFORM, mul } from './palette.js';
import { GARMENTS, ITEMS } from './garments.js';
import { hatOf } from './hats.js';

export { PALETTES, PALETTE_ORDER, UNIFORM, outfit } from './palette.js';
const TW = 1536, TH = 864;

// ---------------------------------------------------------------- presets
export const JOBS = {
  doctor: ['shirt:office:sky', 'tie:crimson', 'coat:doctor', 'stethoscope', 'nametag', 'pens'],
  nurse: ['scrubs:teal', 'badge:id', 'pens', 'cap:scrub'],
  police: ['shirt:police', 'tie:navy', 'badge:police', 'epaulettes', 'dutybelt', 'cap:police'],
  pilot: ['shirt:office:sky', 'tie:navy', 'jacket:pilot', 'badge:wings', 'epaulettes', 'cap:pilot'],
  worker: ['shirt:work', 'vest:hivis', 'hat:hard'],
  office: ['shirt:office', 'tie:crimson', 'nametag', 'pens'],
  manager: ['shirt:office:sky', 'tie:crimson', 'blazer:slate'],
  chef: ['jacket:chef', 'apron:slate:low', 'hat:toque'],
  student: ['shirt:office:sky', 'tie:stripe', 'cardigan:navy', 'backpack'],
  'student-blazer': ['shirt:office:sky', 'tie:stripe', 'blazer:navy', 'badge:crest', 'backpack'],
  florist: ['shirt:office:rose', 'apron:forest'],
};
const CAPS = ['police', 'pilot', 'scrub'], HATS = ['hard', 'toque'];
// the layers this file draws (any other item goes on to costume.js / hoodie.js)
export const LAYERS = [...Object.keys(GARMENTS), ...Object.keys(ITEMS), ...CAPS.map(x => 'cap:' + x), ...HATS.map(x => 'hat:' + x)];
const mine = it => { const [k, a] = String(it).split(':'); return k === 'hat' ? HATS.includes(a) : k === 'cap' ? CAPS.includes(a) : !!(GARMENTS[k] || ITEMS[k]); };
export const expand = list => list.flatMap(it => { const [k, a] = String(it).split(':'); if (k !== 'job') return [it]; if (!JOBS[a]) throw new Error(`costume job:${a}: no such job (${Object.keys(JOBS).join(', ')})`); return JOBS[a]; });

// ---------------------------------------------------------------- the torso's texture
// (th, y) -> the torso texture's pixel (cast.js torsoGeo: the lathe's front at u 0.5, v = height / torso height); s = metres
// of arc from the front
function painter(F, old) {
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const g = cv.getContext('2d');
  if (old?.image?.width > 1) g.drawImage(old.image, 0, 0, TW, TH);
  const X = th => (0.5 + th / (2 * Math.PI)) * TW, Y = y => (1 - (y - Y0) / H_T) * TH, k = TH / H_T;
  const P = ([s, y]) => [X(thS(F, 0, y, s)), Y(y)];
  const dense = pts => pts.flatMap((q, i) => (i ? Array.from({ length: 8 }, (_, j) => [pts[i - 1][0] + (q[0] - pts[i - 1][0]) * (j + 1) / 8, pts[i - 1][1] + (q[1] - pts[i - 1][1]) * (j + 1) / 8]) : [q]));
  const path = pts => { g.beginPath(); dense(pts).forEach((q, i) => { const [x, y] = P(q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); };
  const p = {
    fill: c => { g.fillStyle = css(c); g.fillRect(0, 0, TW, TH); },
    band: (y0, y1, c) => { g.fillStyle = css(c); g.fillRect(0, Y(y1), TW, Y(y0) - Y(y1)); },
    hline: (y, w, c) => p.band(y - w / 2, y + w / 2, c),
    sector: (t0, t1, c) => { g.fillStyle = css(c); g.fillRect(Math.min(X(t0), X(t1)), 0, Math.abs(X(t1) - X(t0)), TH); },
    poly: (pts, c) => { path(pts); g.closePath(); g.fillStyle = css(c); g.fill(); },
    dot: ([s, y], r, c) => { const [x, yy] = P([s, y]); g.beginPath(); g.ellipse(x, yy, r * TW / (2 * Math.PI * 0.185 * F.gx), r * k, 0, 0, 7); g.fillStyle = css(c); g.fill(); },
    line: (pts, w, c) => { path(pts); g.lineWidth = w * k; g.strokeStyle = css(c); g.lineCap = g.lineJoin = 'round'; g.stroke(); },
    // everything but the polygon (an open coat's V)
    hole: (pts, c) => { g.beginPath(); g.rect(0, 0, TW, TH); dense(pts).forEach((q, i) => { const [x, y] = P(q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.fillStyle = css(c); g.fill('evenodd'); },
    // vertical lines all round between y0 and y1, `step` metres apart (knit ribs)
    ribs: (y0, y1, step, w, c) => { g.strokeStyle = css(c); g.lineWidth = w * k; const n = Math.round(2 * Math.PI * 0.17 * F.gx / step); for (let i = 0; i < n; i++) { const x = (i + 0.5) / n * TW; g.beginPath(); g.moveTo(x, Y(y1)); g.lineTo(x, Y(y0)); g.stroke(); } },
    tex: () => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; },
  };
  return p;
}

// ---------------------------------------------------------------- one figure's wardrobe
export function wardrobe(S, items) {
  const F = fitOf(S.spec), torso = S.parts.torso, body = torso.parent, head = S.parts.head.parent, root = S.root;
  const G = new THREE.Group(); G.name = 'wardrobe'; body.add(G);
  const R = rider(G), drapes = [], hats = [], sleeves = [], rings = []; let arm = null;
  const parsed = items.map(it => { const [k, a, b] = String(it).split(':'); return { k, a, b, it: String(it) }; });
  const openOf = p => { const o = GARMENTS[p.k]?.open; return typeof o === 'function' ? o(p.a) : o || null; };
  const garments = parsed.filter(p => GARMENTS[p.k]).sort((p, q) => GARMENTS[p.k].z - GARMENTS[q.k].z), outer = [...garments].reverse().find(openOf), opening = outer ? openOf(outer) : null;
  const closed = garments.find(p => GARMENTS[p.k].z === 3 && !openOf(p));
  const X = { F, S, has: k => parsed.some(p => p.k === k), opening, pocket: null, top: null, pieces: R.add,
    add: m => R.add(m),
    // a trim of a layer under an outer garment shows only in its opening (a belt, a pocket: not at all)
    shows: (y, s) => !closed && (!opening || (y > opening.yV && Math.abs(s) < opening.edge(y))),
    sleeve: (rgb, o = {}) => { arm = { rgb, ...o }; },                 // the outermost garment's sleeve is the one seen
    cover: y => thinHull(torso, y),
    cloth: (part, o) => drapes.push(drape(S, part, o)) };
  const at = (gm, f) => { X.variant = gm.a; X.arg = gm.b ?? gm.a; X.top = GARMENTS[gm.k].colour(gm.a, gm.b); X.under = gm !== outer && (opening || closed) && GARMENTS[gm.k].z < 3; f(GARMENTS[gm.k], X.top); };
  if (garments.length) {
    const p = painter(F, torso.material.map); for (const gm of garments) at(gm, (D, c) => D.paint(p, c, X));
    const old = torso.material.map; torso.material.map = p.tex(); torso.material.needsUpdate = true; old?.dispose?.();
    for (const gm of garments) at(gm, (D, c) => D.build(X, c));
  }
  for (const it of parsed) if (ITEMS[it.k]) { X.arg = it.a; ITEMS[it.k](X, it.a, it.b); }
  for (const it of parsed) if (it.k === 'cap' || it.k === 'hat') { const h = hatOf(it.a); head.add(h); hats.push(h); }
  // the sleeves on the drawn arm lines: the sleeve, its cuff (or the shirt's, showing past a jacket's), a uniform's rings
  if (arm) for (const k of ['armL', 'armR']) {
    const line = S.parts.limbs[k], put = o => { const s = sleeve(line, o); root.add(s.m); sleeves.push({ ...s, arm: k }); }, end = arm.to ?? (arm.shirt ? 12 : 13);
    put({ rgb: arm.rgb, from: 0, to: arm.cuff ? end - 1 : end, flare: arm.flare || 0 });
    if (arm.shirt) put({ rgb: mul(UNIFORM.shirt, 1.25), from: 12, to: 13, r: 0.0165, ink: 0.006 });
    if (arm.cuff) put({ rgb: arm.cuff, from: end - 1, to: end, r: 0.0215 + (arm.flare || 0), ink: 0.0065 });
    if (arm.rings) for (let i = 0; i < arm.rings[1]; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.009, 16), wearMat(arm.rings[0])); m.frustumCulled = false; m.userData.noInk = true; root.add(m); rings.push({ m, line, f: 11.7 - 0.42 * i }); }
  }
  const centre = (A, i, o) => { o.set(0, 0, 0); for (let j = 0; j < 10; j++) o.x += A.getX(i * 10 + j), o.y += A.getY(i * 10 + j), o.z += A.getZ(i * 10 + j); return o.divideScalar(10); }, Yv = new THREE.Vector3(0, 1, 0), c0 = new THREE.Vector3(), c1 = new THREE.Vector3();
  const after = () => { R.warp(S.spineB); for (const s of sleeves) s.place(); for (const { m, line, f } of rings) { const A = line.geometry.attributes.position, i = Math.floor(f); centre(A, i, c0); centre(A, i + 1, c1); m.position.copy(c0).lerp(c1, f - i); m.quaternion.setFromUnitVectors(Yv, c1.sub(c0).normalize()); } for (const d of drapes) d.update(); };
  const p1 = S.pose, p2 = S.pose2;
  S.pose = (P = {}) => { const r = p1(P); after(); return r; };
  // a hand a clip brings into a skirt, a coat or an apron (it knows nothing of what is worn) rests on the outside of it: the arm
  // is posed again with the hand moved out, held there by the arm's own ik
  S.pose2 = (Q = {}) => {
    let r = p2(Q); after(); if (!PHYS.on) return r;
    let q = Q; for (let pass = 0; pass < 2; pass++) {
      let moved = false; for (const sd of ['L', 'R']) { const h = S.rig[sd].hand, hm = h.clone().multiplyScalar(W_M), out = drapes.map(d => d.guide && d.handOut(hm)).filter(Boolean).sort((a, b) => b.by - a.by)[0]; if (!out) continue;
        const A = q['arm' + sd] || {}, g = S.rig[sd], to = hm.add(out.v).divideScalar(W_M), pole = g.elbow.clone().sub(g.shoulder.clone().lerp(h, 0.5)); q = { ...q, ['arm' + sd]: { ...A, ...(pole.lengthSq() > 1e-6 ? { pole: pole.toArray() } : {}), ik: to.toArray(), ikw: 1 } }; moved = true; }   // (the elbow stays where the clip has it)
      if (!moved) break; r = p2(q); after();
    }
    return r;
  };
  if (drapes.length) { const f0 = S.face; S.face = (P = {}) => { const r = f0(P); if (PHYS.on && P.t != null) for (const d of drapes) d.step(P.t); return r; }; }
  after();
  S.wardrobe = { items: parsed.map(p => p.it), rider: R, drapes, sleeves, hats, group: G, fit: F };
  return S.wardrobe;
}

const prev = HOOKS.costume;
HOOKS.costume = (S, list, o) => {
  const all = expand(list), rest = all.filter(it => !mine(it)), own = all.filter(mine);
  if (rest.length && prev) prev(S, rest, o);
  if (own.length) wardrobe(S, own);
};
