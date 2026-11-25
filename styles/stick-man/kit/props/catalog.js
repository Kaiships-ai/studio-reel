// The kit's shared prop catalog (docs/PROPS.md): every set prop by one name '<place>/<slug>', a CC0 .glb from
// assets/props/ (glb.js glbKit: toon, ink, COLLIDE) or a code-built one from kit/props/built.js; a film never cares which.
//   const p = propKit(stage, COLLIDE);                          // COLLIDE: the set's export, place() pushes its solid boxes (collide.js)
//   await p.load(['street/bench', 'hospital/iv-stand']);         // inside build(), before __ready
//   p.place('street/bench', [x, y, 0], 180, { scale, tint, shadow: true, solid: true, ink: true })   // -> the THREE.Group
//   p.place(name, at, deg, { material: (src, mesh, name) => THREE.Material, parent })   // the film's material, its group
// Solid boxes only at 0, 90, 180, 270 deg; any other turn (and solid: false) is listed in COLLIDE.unchecked, not collision-checked.
//   catalog()  -> [{ name, place, size: [w, d, h], tris, source: 'glb' | 'code' }]
// Real size by default (the importer scaled every .glb to metres; built props are drawn in metres): scale 1. A contact
// shadow (cast.js's foot blob, sized to the prop's footprint near the floor) sits under each prop unless shadow: false;
// wall pieces (BUILT[name].wall: a calendar, a blind) default to none. An unknown name throws with the closest names.
import * as THREE from 'three';
import { B, lin } from '#engine/look.js';
import { contactTex } from '#engine/cast.js';
import { glbKit, bodyBox } from '#kit/sets/glb.js';
import { propBoxes, quarterOf } from './collide.js';
import { tm } from '#kit/sets/dress.js';
import { BUILT, builtGroup } from './built.js';
import MAN from '../../assets/props/manifest.json' with { type: 'json' };

const GLB = Object.fromEntries(Object.entries(MAN.props).map(([slug, v]) => [`${v.place}/${slug}`, v]));
const IDENT = new THREE.Matrix4();
export const propNames = () => [...Object.keys(GLB), ...Object.keys(BUILT)].sort();

function lev(a, b) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) { const t = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = t; } }
  return d[b.length];
}
// the closest names: by the whole name and by the slug alone ('bench' finds street/bench and street/bench-2)
export function closeNames(name, n = 5) {
  const slug = name.split('/').pop();
  return propNames().map(k => ({ k, d: Math.min(lev(name, k), lev(slug, k.split('/')[1]) + (name.includes('/') ? 1 : 0)) })).sort((a, b) => a.d - b.d || a.k.localeCompare(b.k)).slice(0, n).map(x => x.k);
}
export function resolveProp(name) {
  if (GLB[name]) return { name, source: 'glb', entry: GLB[name] };
  if (BUILT[name]) return { name, source: 'code', entry: BUILT[name] };
  throw new Error(`props: no prop '${name}'; closest: ${closeNames(name).join(', ')} (catalog() lists all ${propNames().length})`);
}

const TRIS = new Map();
function builtTris(name) {
  if (!TRIS.has(name)) { let t = 0; builtGroup(name).traverse(o => { if (o.isMesh) t += (o.geometry.index ? o.geometry.index.count : o.geometry.attributes.position.count) / 3; }); TRIS.set(name, t); }
  return TRIS.get(name);
}
export function catalog() {
  return propNames().map(name => { const r = resolveProp(name), place = name.split('/')[0];
    return r.source === 'glb' ? { name, place, size: r.entry.hi.map((h, i) => +(h - r.entry.lo[i]).toFixed(3)), tris: r.entry.tris, source: 'glb', licence: r.entry.licence, author: r.entry.author }
      : { name, place, size: r.entry.size, tris: builtTris(name), source: 'code', id: r.entry.id }; });
}

let SHADOW_TEX = null;
// the foot blob under a prop: the box of its triangles in the bottom 25 cm, as placed at the origin (so it turns with it)
function contactShadow(g) {
  const pos = g.position.clone(), rot = g.rotation.clone(), sc = g.scale.clone();
  g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.scale.setScalar(1); g.updateMatrixWorld(true);
  const b = bodyBox(g, [-0.01, 0.25]);
  g.position.copy(pos); g.rotation.copy(rot); g.scale.copy(sc); g.updateMatrixWorld(true);
  if (!b) return null;
  SHADOW_TEX ||= contactTex();
  const s = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: lin(0.05, 0.09, 0.22), alphaMap: SHADOW_TEX, transparent: true, opacity: 0.42, depthWrite: false }));
  s.rotation.x = -Math.PI / 2; s.scale.set((b.hi[0] - b.lo[0]) * 0.62 + 0.04, (b.hi[1] - b.lo[1]) * 0.62 + 0.04, 1);
  s.position.copy(B((b.lo[0] + b.hi[0]) / 2, (b.lo[1] + b.hi[1]) / 2, 0.004));
  s.userData.noPrepass = true; s.userData.contact = true; s.name = 'contact'; g.add(s); return s;
}

// the solid boxes this module pushed, per COLLIDE array: a set built twice (two acts, one module) places the same props again,
// and the same box is not pushed twice. Nothing is ever taken out of the array: it is the film's, other kits write into it.
const COPY = '@';                    // 'street/bench@2' is the second street/bench placed ('street/bench-2' is another prop)
const OWN = new WeakMap();
// material: the film's function, called once per (function, source material): the glTF material of a .glb, the shared tm()
// of a built prop (mesh and name are of the first placing that meets it). Its result is shared and never changed; a tint
// gives a copy (cached per returned material and tint) whose colour is multiplied, keeping the original's shader hook and userData.
const FILM = new WeakMap(), TINTED = new WeakMap();
function filmMat(fn, src, mesh, name, tint) {
  if (!FILM.has(fn)) FILM.set(fn, new WeakMap());
  const by = FILM.get(fn); if (!by.has(src)) by.set(src, fn(src, mesh, name));
  const m = by.get(src); if (!tint || !m.color) return m;
  if (!TINTED.has(m)) TINTED.set(m, new Map());
  const T = TINTED.get(m), k = tint.join();
  if (!T.has(k)) { const c = m.clone(); c.onBeforeCompile = m.onBeforeCompile; c.customProgramCacheKey = m.customProgramCacheKey; c.userData = m.userData; c.color.multiply(new THREE.Color(...tint)); T.set(k, c); }
  return T.get(k);
}
const boxKey = b => `${b.name.replace(/@\d+(#\d+)?$/, '')}|${b.lo}|${b.hi}`;

export function propKit(stage, collide = []) {
  const { scene, prop, glow } = stage, glb = glbKit(stage, 'props', []), loaded = new Set(), count = {};   // glbKit empties the array it is given: never the film's
  if (!OWN.has(collide)) OWN.set(collide, new WeakSet());
  // the props no gate checks: COLLIDE.unchecked [{ name, why }] (engine/play.js puts it in the rows, the shot gate reports
  // it as 'not collision-checked'); on the array itself, so a rebuild or a set that empties the array keeps it
  if (!Array.isArray(collide.unchecked)) Object.defineProperty(collide, 'unchecked', { value: [], enumerable: false });
  const note = (n, why) => { if (!collide.unchecked.some(u => u.name === n && u.why === why)) collide.unchecked.push({ name: n, why }); };
  const own = OWN.get(collide), push = b => { if (collide.some(o => own.has(o) && boxKey(o) === boxKey(b))) return; own.add(b); collide.push(b); };
  return {
    collide, catalog,
    async load(names) {
      const r = names.map(resolveProp);
      await glb.load(r.filter(x => x.source === 'glb').map(x => x.name));
      for (const x of r) loaded.add(x.name);
    },
    place(name, at, deg = 0, { scale = 1, tint = null, shadow, solid = true, ink = true, band = [0.05, 1.8], grace, material = null, parent = null } = {}) {
      const r = resolveProp(name);
      if (!loaded.has(name)) throw new Error(`props: ${name} not loaded (call load() first)`);
      if (parent) { parent.updateWorldMatrix(true, false); if (!parent.matrixWorld.elements.every((e, i) => Math.abs(e - IDENT.elements[i]) < 1e-6)) throw new Error(`props: ${name}: parent must sit at the origin, unturned and unscaled (COLLIDE boxes are world-space)`); }
      const mat = material && ((src, m) => filmMat(material, src, m, name, tint));
      let g;
      if (r.source === 'glb') g = glb.place(name, at, deg, { scale, tint, solid: false, ink, band, material: mat });
      else {
        g = builtGroup(name);
        g.traverse(m => { if (!m.isMesh) return;
          m.userData.hollow = true;                             // its boxes are in COLLIDE as a .glb's are: engine/solids.js solidBoxes would report its box meshes a second time
          if (mat) m.material = mat(m.material, m);
          else if (tint && m.material.color && !m.material.map && !m.material.transparent) m.material = tm([m.material.color.r * tint[0], m.material.color.g * tint[1], m.material.color.b * tint[2]], m.material.userData.glowy ? { glowy: 0.6 } : {});
          if (m.material.userData.glowy) glow(m, 0.25); });
        g.position.copy(B(...at)); g.rotation.y = deg * Math.PI / 180; g.scale.setScalar(scale);
        scene.add(g); if (ink) prop(g);
      }
      if (parent) parent.add(g);                                // a group at the origin: COLLIDE is read in the scene's frame
      count[name] = (count[name] || 0) + 1; g.name = `${name}${COPY}${count[name]}`;
      if (solid && quarterOf(g.rotation.y) != null) for (const b of propBoxes(g, name, { band, grace })) push(b);
      else note(g.name, solid ? `turned ${+deg.toFixed(1)} deg, off a quarter turn` : 'solid: false');
      if (shadow ?? !(r.source === 'code' && r.entry.wall)) contactShadow(g);
      return g;
    },
  };
}
