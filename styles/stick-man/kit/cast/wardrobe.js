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
// the white coats are a cool off-white (a warm one reads as a trench coat), shaded by the cel ramp and folds (valuegate's blown object).
import * as THREE from 'three';
import { W_M } from '#engine/cast.js';
import { css } from '#engine/look.js';
import { HOOKS } from '#engine/play.js';
import { PHYS } from '#engine/body.js';
import { flyOff } from './costume.js';
import { expand } from './jobs.js';
import { fitOf, thS, rider, wearMat, sleeve, thinHull, H_T, Y0 } from './wear.js';
import { drape, lapOut, limbLine, LAP_HAND, LAP_ARM } from './drape.js';
import { PALETTES, UNIFORM, colourOf, mul } from './palette.js';
import { GARMENTS, ITEMS, SKIRT_Y } from './garments.js';
import { hatOf, tuckHair } from './hats.js';

export { PALETTES, PALETTE_ORDER, UNIFORM, outfit } from './palette.js';
const TW = 1536, TH = 864;

// ---------------------------------------------------------------- presets
export { JOBS, expand } from './jobs.js';
const CAPS = ['police', 'pilot', 'scrub'], HATS = ['hard', 'toque'];
// the layers this file draws (any other item goes on to costume.js / hoodie.js)
export const LAYERS = [...Object.keys(GARMENTS), ...Object.keys(ITEMS), ...CAPS.map(x => 'cap:' + x), ...HATS.map(x => 'hat:' + x)];
const mine = it => { const [k, a] = String(it).split(':'); return k === 'hat' ? HATS.includes(a) : k === 'cap' ? CAPS.includes(a) : !!(GARMENTS[k] || ITEMS[k]); };

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
export function wardrobe(S, items, { group = null } = {}) {
  const F = fitOf(S.spec), torso = S.parts.torso, body = torso.parent, head = S.parts.head.parent, root = S.root;
  const G = new THREE.Group(); G.name = 'wardrobe'; body.add(G);
  const R = rider(G), drapes = [], hats = [], sleeves = [], rings = []; let arm = null;
  const parsed = items.map(it => { const [k, a, b] = String(it).split(':'); return { k, a, b, it: String(it) }; });
  const openOf = p => { const o = GARMENTS[p.k]?.open; return typeof o === 'function' ? o(p.a) : o || null; };
  const garments = parsed.filter(p => GARMENTS[p.k]).sort((p, q) => GARMENTS[p.k].z - GARMENTS[q.k].z), outer = [...garments].reverse().find(openOf), opening = outer ? openOf(outer) : null;
  const closed = Math.max(0, ...garments.filter(p => !openOf(p)).map(p => GARMENTS[p.k].z));   // how far out the outermost closed garment is: nothing under it shows
  const X = { F, S, has: k => parsed.some(p => p.k === k), opening, closed, pocket: null, top: null,
    add: m => R.add(m),
    // a trim of a layer under an outer garment shows only in its opening (a belt, a pocket: not at all)
    shows: (y, s) => !X.hidden && (!opening || (y > opening.yV && Math.abs(s) < opening.edge(y))),
    sleeve: (rgb, o = {}) => { arm = { rgb, ...o }; },                 // the outermost garment's sleeve is the one seen
    cover: y => thinHull(torso, y),
    cloth: (part, o) => drapes.push(drape(S, part, o)) };
  const at = (gm, f) => { X.variant = gm.a; X.arg = gm.b ?? gm.a; X.top = GARMENTS[gm.k].colour(gm.a, gm.b); X.hidden = GARMENTS[gm.k].z < closed; X.under = X.hidden || (gm !== outer && !!opening && GARMENTS[gm.k].z < 3); f(GARMENTS[gm.k], X.top); };
  if (garments.length) {
    const p = painter(F, torso.material.map); for (const gm of garments) at(gm, (D, c) => D.paint(p, c, X));
    // under a skirt the torso is the skirt's own cloth, not the garment above it (costume review 3, M1)
    const sk = parsed.find(q => q.k === 'skirt'); if (sk && !X.has('coat')) p.band(Y0 - 0.01, SKIRT_Y, colourOf(sk.a, PALETTES.plum.main));
    const old = torso.material.map; torso.material.map = p.tex(); torso.material.needsUpdate = true; old?.dispose?.();
    for (const gm of garments) at(gm, (D, c) => D.build(X, c));
  }
  for (const it of parsed) if (ITEMS[it.k]) { X.arg = it.a; ITEMS[it.k](X, it.a, it.b); }
  const worn = parsed.filter(it => it.k === 'cap' || it.k === 'hat');
  for (const it of worn) { const h = hatOf(it.a); head.add(h); hats.push(h); tuckHair(S, it.a); if (group) { const f = hatOf(it.a); f.visible = false; group.add(f); flyOff(S, h, f); } }
  // hair swapped in place goes in under the hats as a fresh build's does
  if (worn.length) { const bake = S.bakeHair; S.bakeHair = fns => { bake(fns); for (const it of worn) tuckHair(S, it.a); }; }
  // the sleeves on the drawn arm lines: the sleeve, its cuff (or the shirt's, showing past a jacket's), a uniform's rings
  if (arm) for (const k of ['armL', 'armR']) {
    const line = S.parts.limbs[k], put = o => { const s = sleeve(line, o); root.add(s.m); sleeves.push({ ...s, arm: k }); }, end = arm.to ?? (arm.shirt ? 12 : 13);
    const cw = 0.75; put({ rgb: arm.rgb, from: 0, to: arm.cuff ? end - cw : end, flare: arm.flare || 0, profile: arm.profile });
    if (arm.shirt) put({ rgb: mul(UNIFORM.shirt, 1.25), from: 12, to: 13, r: 0.0165, ink: 0.006 });
    if (arm.cuff) put({ rgb: arm.cuff, from: end - cw, to: end, r: 0.0208 + (arm.flare || 0), ink: 0.0065, profile: u => 0.86 + 0.14 * Math.sin(Math.PI * u) ** 0.5 });
    if (arm.rings) for (let i = 0; i < arm.rings[1]; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.0205, 0.0205, 0.009, 16), wearMat(arm.rings[0])); m.frustumCulled = false; m.userData.noInk = true; root.add(m); rings.push({ m, line, f: 11.7 - 0.42 * i }); }
  }
  const centre = (A, i, o) => { o.set(0, 0, 0); for (let j = 0; j < 10; j++) o.x += A.getX(i * 10 + j), o.y += A.getY(i * 10 + j), o.z += A.getZ(i * 10 + j); return o.divideScalar(10); }, Yv = new THREE.Vector3(0, 1, 0), c0 = new THREE.Vector3(), c1 = new THREE.Vector3();
  const after = () => { R.warp(S.spineB); for (const s of sleeves) s.place(); for (const { m, line, f } of rings) { const A = line.geometry.attributes.position, i = Math.floor(f); centre(A, i, c0); centre(A, i + 1, c1); m.position.copy(c0).lerp(c1, f - i); m.quaternion.setFromUnitVectors(Yv, c1.sub(c0).normalize()); } for (const d of drapes) d.update(); };
  const p1 = S.pose, p2 = S.pose2;
  S.pose = (P = {}) => { const r = p1(P); after(); return r; };
  // a hand or a forearm a clip brings into a lap (it knows nothing of what is worn) rests on it: the arm is posed again with the
  // hand moved out and the elbow lifted, held there by the arm's own ik. Not an arm that holds a prop or is on a target of its
  // own (it would leave it): there the cloth gives way
  const held = (Q, sd) => (Q['arm' + sd]?.ik && (Q['arm' + sd].ikw ?? 1) > 0) || Object.entries(Q).some(([k, v]) => { const m = /^x_hp([LRB])_(\w+)$/.exec(k); return m && (m[1] === sd || m[1] === 'B') && (v > 0 || Q.propRest?.[m[1] + m[2]]); });
  S.pose2 = (Q = {}) => {
    let r = p2(Q); if (!PHYS.on || !drapes.some(d => d.guide) || !S.rig.L.hip) { after(); return r; }   // (the arms are read from the rig: the garments are laid once, at the end)
    const free = ['L', 'R'].filter(sd => !held(Q, sd)), hand = {}, pole = {}, W0 = drapes.find(d => d.guide).waist();
    for (let pass = 0; pass < 4; pass++) {
      let moved = false, q = Q; for (const sd of free) { const ln = limbLine(S.parts.limbs['arm' + sd], 0, 1), n = ln.length - 1, g = S.rig[sd], need = lapOut(S.rig, ln[n], LAP_HAND, W0), e = need ? need.clone() : new THREE.Vector3(), lift = new THREE.Vector3();
        for (let i = 6; i < n; i++) { const v = lapOut(S.rig, ln[i], LAP_ARM, W0); if (!v) continue; const u = i / n; if (u > 0.75) { if (v.length() > e.length()) e.copy(v); } if (v.length() > lift.length()) lift.copy(v); }
        if (e.lengthSq() > 1e-8 || lift.lengthSq() > 1e-8) { moved = true; (hand[sd] ||= g.hand.clone()).addScaledVector(e, 1 / W_M); (pole[sd] ||= g.elbow.clone().sub(g.shoulder.clone().lerp(g.hand, 0.5))).addScaledVector(lift, 2 / W_M); }
        if (hand[sd]) q = { ...q, ['arm' + sd]: { ...(Q['arm' + sd] || {}), pole: pole[sd].toArray(), ik: hand[sd].toArray(), ikw: 1 } }; }
      if (!moved) break; r = p2(q);
    }
    after(); return r;
  };
  drapes.sort((a, b) => (a.under ? 1 : 0) - (b.under ? 1 : 0)); for (const d of drapes) if (d.under) d.inside(drapes[0]);   // (a skirt under a coat follows the coat)
  if (drapes.length) { const f0 = S.face; S.face = (P = {}) => { const r = f0(P); if (PHYS.on && P.t != null) for (const d of drapes) d.step(P.t); return r; }; }
  after();
  S.wardrobe = { items: parsed.map(p => p.it), rider: R, drapes, sleeves, hats, group: G, fit: F };
  return S.wardrobe;
}

// layers other modules draw (costume.js, hoodie.js); a film's own hook adds its names here
export const KNOWN = new Set(['belt', 'holster', 'hat', 'hoodie']);
const prev = HOOKS.costume;
HOOKS.costume = (S, list, o) => {
  const all = expand(list), rest = all.filter(it => !mine(it)), own = all.filter(mine);
  for (const it of rest) { const [k, a] = String(it).split(':'); if (!KNOWN.has(k) || (k === 'hat' && !['cowboy', 'flat', 'bowler', 'top'].includes(a))) throw new Error(`costume "${it}": no such layer (${LAYERS.join(', ')}, or ${[...KNOWN].join(', ')})`); }
  if (rest.length && prev) prev(S, rest, o);
  if (own.length) wardrobe(S, own, o);
};
