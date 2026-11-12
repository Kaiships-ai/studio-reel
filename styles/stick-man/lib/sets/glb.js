// Blender-made pieces (.glb from tools/export_glb.py) as set dressing, in the stick-man look (GLB.md).
//   const g = glbKit(stage, '<pack>', COLLIDE);          // assets/<pack>/<name>.glb
//   await g.load(['shop', 'car']);                       // fetch + parse once, before build() returns (so before __ready)
//   g.place('shop', [x, y, 0], 180);                     // Blender metres + degrees about z; toon + ink + shadows
//   export const COLLIDE = [];  glbKit(stage, '<pack>', COLLIDE)   // place() pushes one box per piece, from its geometry
// Materials: every glTF material becomes engine/look.js toon() (shared per colour or per map): painted maps keep their
// windows, brick and signs under the toon ramp; emissive ones (signs, neon) keep a little glow. COLLIDE: x/y bounds of the triangles that cross the body band (z 0.05-1.8 m),
// so a lamp arm or an awning overhead never blocks the pavement under it.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { B, toon } from '../../engine/look.js';
import { register } from './dress.js';

export const ASSETS = '/styles/stick-man/assets';
const SCENES = new Map();                                       // url -> Promise<THREE.Group> (parsed once per page)
const MATS = new Map();                                         // colour key -> toon material

export function loadGlb(url) {
  if (!SCENES.has(url)) SCENES.set(url, new GLTFLoader().loadAsync(url).then(g => g.scene));
  return SCENES.get(url);
}

// the kit's toon material for a glTF material: flat colour, or the painted map (windows, brick, signs) times the toon
// ramp; names with _e_ (export_glb.py) are emissive and keep a little glow
export function toonFrom(m, tint = null) {
  const c = m.color || new THREE.Color(0.5, 0.5, 0.5), map = m.map || null, e = /_e_/.test(m.name || '');
  const key = (map ? `map:${map.uuid},${e ? 1 : 0}` : `${c.r.toFixed(3)},${c.g.toFixed(3)},${c.b.toFixed(3)},${e ? 1 : 0}`) + (tint ? `|${tint}` : '');
  if (!MATS.has(key)) {
    if (map) { map.anisotropy = 8; map.colorSpace = THREE.SRGBColorSpace; }
    const base = map ? [1, 1, 1] : [c.r, c.g, c.b], t = toon(tint ? base.map((v, i) => v * tint[i]) : base, { map, rough: Math.max(0.35, m.roughness ?? 0.7), sheen: 0.05, rim: 0.12 });
    if (e) { t.emissive.copy(map ? new THREE.Color(1, 1, 1) : c).multiplyScalar(0.35); if (map) t.emissiveMap = map; t.userData.glowy = true; }
    MATS.set(key, t);
  }
  return MATS.get(key);
}

// Blender-space box of a placed piece: triangles that cross the z band count, anything above or below does not
function bodyBox(obj, band) {
  const lo = [Infinity, Infinity, 0], hi = [-Infinity, -Infinity, 0], a = new THREE.Vector3(), tri = [[], [], []];
  obj.updateMatrixWorld(true);
  obj.traverse(m => {
    if (!m.isMesh) return;
    const p = m.geometry.attributes.position, ix = m.geometry.index, n = ix ? ix.count : p.count;
    for (let i = 0; i < n; i += 3) {
      let z0 = Infinity, z1 = -Infinity;
      for (let k = 0; k < 3; k++) {
        a.fromBufferAttribute(p, ix ? ix.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
        tri[k][0] = a.x; tri[k][1] = -a.z; tri[k][2] = a.y; z0 = Math.min(z0, a.y); z1 = Math.max(z1, a.y);
      }
      if (z1 < band[0] || z0 > band[1]) continue;
      for (const v of tri) { lo[0] = Math.min(lo[0], v[0]); lo[1] = Math.min(lo[1], v[1]); hi[0] = Math.max(hi[0], v[0]); hi[1] = Math.max(hi[1], v[1]); }
      hi[2] = Math.max(hi[2], z1);
    }
  });
  return Number.isFinite(lo[0]) ? { lo: lo.map(v => +v.toFixed(3)), hi: hi.map(v => +v.toFixed(3)) } : null;
}

export function glbKit(stage, pack, collide = []) {
  const { scene, prop, glow } = stage, src = {}, count = {};
  collide.length = 0;                                           // a rebuild starts clean
  return {
    collide,
    async load(names) { await Promise.all(names.map(async n => { src[n] = await loadGlb(`${ASSETS}/${pack}/${n}.glb`); })); },
    // the parts of a room modelled in place (exported in parts): each at the origin, not solid, one dressing piece each;
    // the `<set>_room` part (floor, walls, ceiling) casts no shadow so the ceiling never shades the room
    decor(names) { return names.map(n => { const o = this.place(n, [0, 0, 0], 0, { solid: false, dressing: !/_room$/.test(n) });
      if (/_room$/.test(n)) o.traverse(m => { if (m.isMesh) m.castShadow = false; }); return o; }); },
    // put a copy of piece `name` at Blender [x, y, z], turned rot degrees about z. Returns the group.
    // tint = [r, g, b] multiplies the piece's colours (e.g. warm a night-painted texture for a day set)
    // dressing: false = not a dressing piece for the dressing gate (floors, roads); solid: false pieces never count either
    place(name, at, rot = 0, { scale = 1, ink = true, solid = true, band = [0.05, 1.8], grace, tint = null, dressing = solid } = {}) {
      if (!src[name]) throw new Error(`glb: ${pack}/${name} not loaded (call load() first)`);
      const g = src[name].clone(true);
      g.traverse(m => {
        if (!m.isMesh) return;
        m.material = toonFrom(m.material, tint); m.castShadow = m.receiveShadow = true;
        if (m.material.userData.glowy) glow(m, 0.25);
      });
      g.position.copy(B(...at)); g.rotation.y = rot * Math.PI / 180; g.scale.setScalar(scale);
      scene.add(g); if (ink) prop(g);
      count[name] = (count[name] || 0) + 1;
      g.name = `${name}-${count[name]}`;
      if (dressing) register(name, [g]);
      if (solid) { const b = bodyBox(g, band); if (b) collide.push({ name: g.name, ...b, ...(grace != null ? { grace } : {}) }); }
      return g;
    },
  };
}
