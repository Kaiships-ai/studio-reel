// Posable 3D stick figures: squashed-sphere head with a sliding face decal, capsule torso with painted clothes,
// thin black tube limbs, hair and hats as solids. Each solid gets an inverted-hull outline, thick on the shadow side, thin on the lit side.
// Units: W = head width. Pose numbers are in W, in the figure's own plane (u = its right as the camera sees it, v = up).
import * as THREE from 'three';
import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, lin, css, B, INK_RGB, INK_SUN, PLACE } from './look.js';
import { EXPR, faceRig, mixFace } from './faces.js';
import { makeHandProp } from '../lib/cast/handprops.js';
import { limitArm, limitBody, ROM, torsoSlices, ellipsoid, solveArm, armPenetration, PHYS, centreOfMass, balanceShift } from './body.js';

const SPIN_Q = new THREE.Quaternion(), SPIN_AX = new THREE.Vector3(0, 1, 0), _camL = new THREE.Vector3();
export const W_M = 0.60;                     // head width in metres
const W = W_M;
const INK_T = 0.046 * W;                     // outline base width; the hull shader scales it 0.35-1.6x by the light (below):
                                             // reference rim 3.8-5.6 % of head width, thick/thin side ratio 1.65-2.47 (FORENSIC.md fix 7)
const CREAM = [0.90, 0.87, 0.78];             // reference bodies: flat cream
const HEAD_WHITE = [0.985, 0.965, 0.95];
const HEAD_FLAT = [0.92, 0.905, 0.89];         // the unlit head sits a little under white so the grade's exposure keeps its soft wash (else it clips flat)      // reference heads are lighter than the body: lit sRGB (251, 246, 243), shade (230, 219, 231)
const FILL_RGB = [0.20, 0.06, 0.48];            // rage purple, linear (= faces.js furious tint): the head fills from the chin up (verb face_fill)
const LIMB_R = 0.046 * W / 2;                // limbs: reference legs and arms ~0.045-0.05 W (QlDPM f600), a bold line, not a thread
export const HEAD_C = [0.0, 2.43], HEAD_H = 0.94, HIP_V = 1.34, SHOULDER_V = 2.00;
export const TORSO = { cx: 0.0, cy: 1.72, w: 0.57, h: 0.90, depth: 0.80 };
const HA = 0.5 * W, HB = 0.5 * HEAD_H * W;   // head half width / half height (m)
const DEG = Math.PI / 180;
const LOOK_RAD = 0.36;                       // face slide per unit of `look`

// Faces (expressions, skin marks, head-attached emotion marks): faces.js. Hand props: lib/cast/handprops.js.
export { EXPR, EXPR_NAMES, MARK_NAMES, baseExpr } from './faces.js';

const inkMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB) });
const hullMat = new THREE.MeshBasicMaterial({ color: lin(...INK_RGB), side: THREE.BackSide });
// light-driven line weight: the shell grows on the side away from the sun and thins on the lit side (k = 0.95 - 0.75 N.L,
// clamped 0.35-1.6), like the reference's brush line. inkT = the base offset baked into the geometry (hullGeo).
hullMat.onBeforeCompile = sh => {
  sh.uniforms.inkSun = INK_SUN;
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float inkT; uniform vec3 inkSun;')
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      float ndl = dot(normalize(mat3(modelMatrix) * normal), inkSun);
      transformed += normal * inkT * (clamp(1.0 - 0.45 * ndl, 0.8, 1.45) - 1.0);   // lit side never under ~0.6x: the reference line stays bold all round (thick/thin ~2)`);
};

// ------------------------------------------------------------------ outline
function hullGeo(geo, t) {
  let g = geo.clone();
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  g = mergeVertices(g, 1e-5); g.computeVertexNormals();          // shared normals so the shell never cracks at seams
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * t, p.getY(i) + n.getY(i) * t, p.getZ(i) + n.getZ(i) * t);
  g.setAttribute('inkT', new THREE.Float32BufferAttribute(new Float32Array(p.count).fill(t), 1));
  return g;
}
export function solid(geo, mat, t = INK_T, hullSrc = geo) {
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  const h = new THREE.Mesh(hullGeo(hullSrc, t), hullMat); h.castShadow = false; h.receiveShadow = false;
  m.add(h); return m;
}

// ------------------------------------------------------------------ geometry helpers
const ell = (lat, lon, out = 0) => new THREE.Vector3((HA + out) * Math.cos(lat) * Math.sin(lon), (HB + out) * Math.sin(lat), (HA + out) * Math.cos(lat) * Math.cos(lon));
export function lathe(profile, seg = 64) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y)), seg);
  g.rotateY(Math.PI);                                            // lathe seam to the back, front of the texture at u = 0.5
  return g;
}
// closed band hugging the head between two latitudes, rounded top and bottom
function bandGeo(lat0, lat1, thick, n = 14) {
  const pr = [];
  for (let i = 0; i <= n; i++) {
    const s = i / n, la = lat0 + (lat1 - lat0) * s, t = thick * Math.pow(Math.sin(Math.PI * s), 0.35) + 0.004 * W;
    pr.push([(HA + t) * Math.cos(la), (HB + t) * Math.sin(la)]);
  }
  for (let i = n; i >= 0; i--) { const la = lat0 + (lat1 - lat0) * i / n; pr.push([(HA - 0.01 * W) * Math.cos(la), (HB - 0.01 * W) * Math.sin(la)]); }
  pr.push(pr[0]);
  return lathe(pr);
}
// flat crescent brim sticking out in front, attached at height y where the head radius is rIn
function brimGeo(rIn, rx, rz, span = 80) {
  const s = new THREE.Shape(), N = 28;
  for (let i = 0; i <= N; i++) { const a = (-span + 2 * span * i / N) * DEG; const p = [Math.sin(a) * rx, Math.cos(a) * rz]; i ? s.lineTo(...p) : s.moveTo(...p); }
  for (let i = N; i >= 0; i--) { const a = (-span + 2 * span * i / N) * DEG; s.lineTo(Math.sin(a) * rIn, Math.cos(a) * rIn); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.012 * W, bevelEnabled: true, bevelThickness: 0.010 * W, bevelSize: 0.010 * W, bevelSegments: 2, curveSegments: 4 });
  g.rotateX(Math.PI / 2);
  return g;
}

// ------------------------------------------------------------------ hair and hats (built round the head centre)
const hairMat = col => toon(col, { shade: [0.82, 0.79, 0.93], sheen: 0, rough: 1, rim: 0.12 });   // near-flat: a deep shade tone turns the curl bumps into dark blotches
// One closed mass: from the head centre, the surface sits where each ray leaves the union of the curl spheres,
// so the silhouette is scalloped but there is one mesh and one hull (no inner outlines between curls).
// Where mask(dir) is 0 the surface tucks inside the head and is never seen.
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function massGeo(balls, mask, tilt, soft = 0) {
  const g = new THREE.SphereGeometry(1, 128, 96), p = g.attributes.position, d = new THREE.Vector3();
  const c = Math.cos(tilt), s = Math.sin(tilt);
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const lat = Math.asin(Math.max(-1, Math.min(1, d.y * c - d.z * s))), lon = Math.atan2(d.x, d.y * s + d.z * c);  // in the band's tilted frame
    const inner = 0.94 / Math.hypot(d.x / HA, d.y / HB, d.z / HA);
    let u = inner;
    const m = mask(lat, lon);
    if (m > 0) {
      let acc = soft ? Math.exp(inner / soft) : 0;
      for (const [bx, by, bz, br] of balls) {
        const bd = d.x * bx + d.y * by + d.z * bz, disc = bd * bd - (bx * bx + by * by + bz * bz) + br * br;
        if (disc >= 0) { const h = bd + Math.sqrt(disc); u = Math.max(u, h); if (soft) acc += Math.exp(h / soft); }
      }
      if (soft) u = soft * Math.log(acc);                         // smooth max: rounded valleys
    }
    const r = inner + (u - inner) * m;                             // soft mask: the hairline is a slope, not a jagged wall
    p.setXYZ(i, d.x * r, d.y * r, d.z * r);
  }
  g.deleteAttribute('uv');
  const m = mergeVertices(g, 1e-6); m.computeVertexNormals(); return m;
}
export function curls(col = [0.45, 0.25, 0.12], tilt = 18) {
  return () => {
    const balls = [], t = -tilt * DEG, c = Math.cos(t), s = Math.sin(t);
    const add = (lat, lon, r, out) => { const p = ell(lat, lon, out); balls.push([p.x, p.y * c - p.z * s, p.y * s + p.z * c, r]); };
    for (let i = 0; i < 12; i++) add(42 * DEG, (i * 30 + 15) * DEG, 0.17 * W * (1 + 0.10 * Math.sin(i * 2.1)), -0.03 * W);
    for (let i = 0; i < 8; i++) add(62 * DEG, (i * 45) * DEG, 0.17 * W, -0.04 * W);
    for (let i = 0; i < 4; i++) add(80 * DEG, (i * 90 + 45) * DEG, 0.16 * W, -0.05 * W);
    for (let i = 0; i < 9; i++) add(10 * DEG, (100 + i * 20) * DEG, 0.16 * W, -0.04 * W);   // down the back, under the band
    for (let i = 0; i < 7; i++) add(-14 * DEG, (120 + i * 20) * DEG, 0.15 * W, -0.05 * W);
    for (let i = 0; i < 5; i++) add(-34 * DEG, (140 + i * 20) * DEG, 0.13 * W, -0.06 * W);
    // above the band everywhere; below it only at the back and sides (the face stays clear)
    const mask = (lat, lon) => { const L = lat / DEG, O = Math.abs(lon) / DEG;
      return Math.max(sm(33, 39, L), sm(88, 102, O) * sm(-48, -40, L), sm(74, 86, O) * sm(2, 9, L)); };
    // hull from rounded valleys: no folds, no inner lines. No received shadow: the bumps would self-shadow into acne.
    // one smooth sculpted mass (reference hair is a clean solid shape, never a pile of balls): a soft union of the curls
    const mop = solid(massGeo(balls, mask, -t, 0.034 * W), hairMat(col), INK_T, massGeo(balls, mask, -t, 0.034 * W)); mop.receiveShadow = false;
    const g = new THREE.Group(); g.add(mop);
    return g;
  };
}
export function hairCap(col = [0.30, 0.19, 0.12], tilt = 20) {
  return () => {
    const pr = [[0, -0.30 * W]];
    for (let i = 0; i <= 16; i++) { const la = (8 + 82 * i / 16) * DEG; pr.push([(HA + 0.03 * W) * Math.cos(la), (HB + 0.035 * W) * Math.sin(la)]); }
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const cap = solid(lathe(pr, 48), hairMat(col)); g.add(cap);
    return g;
  };
}
// flat cap (Bram, bible v1.1: "flat cap with a pale grey band" - his thumbnail silhouette): a low wide crown that
// overhangs the head, a short stiff peak at the front, and a pale band round the bottom that always shows
export function flatCap(col = [0.13, 0.15, 0.22], band = [0.80, 0.82, 0.86], tilt = 16) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const y0 = 0.31 * W, R = 0.50 * W, Hc = 0.17 * W, pr = [[0, y0], [R * 0.95, y0]];   // sits above the brows (never over the eyes; round 4: ep1 close shot)
    for (let i = 0; i <= 14; i++) { const a = 90 * i / 14 * DEG; pr.push([R * Math.pow(Math.cos(a), 0.4) * (1 + 0.06 * Math.sin(2 * a)), y0 + Hc * Math.sin(a)]); }
    const crown = solid(lathe(pr, 64), toon(col, { sheen: 0, rough: 1, char: 1 })); crown.scale.set(1, 1, 1.08); crown.position.z = 0.04 * W; g.add(crown);
    g.add(solid(bandGeo(30 * DEG, 42 * DEG, 0.07 * W), toon(band, { sheen: 0, rough: 1, char: 1 })));
    const peak = solid(brimGeo(HA * Math.cos(34 * DEG) + 0.03 * W, 0.50 * W, 0.68 * W), toon(col.map(c => c * 0.8), { sheen: 0, rough: 1, char: 1 }));
    peak.position.set(0, y0 - 0.01 * W, 0); peak.rotation.x = 0.22; g.add(peak);
    return g;
  };
}
function stripeTex(base, draw) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const c = cv.getContext('2d');
  c.fillStyle = css(base); c.fillRect(0, 0, 1024, 128); draw(c);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
export function bandana(col = [0.86, 0.06, 0.06], tilt = 18) {
  return () => {
    // the band's outer face is the first half of the lathe profile (v 0..0.5); chevrons sit at the front (u 0.5)
    const map = stripeTex(col, c => {
      c.strokeStyle = '#fff'; c.lineWidth = 11; c.lineCap = 'round'; c.lineJoin = 'round';
      for (let i = -2; i <= 2; i++) { const x = 512 + i * 40; c.beginPath(); c.moveTo(x - 9, 128 * (1 - 0.40)); c.lineTo(x + 7, 128 * (1 - 0.25)); c.lineTo(x - 9, 128 * (1 - 0.10)); c.stroke(); }
    });
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    g.add(solid(bandGeo(17 * DEG, 37 * DEG, 0.05 * W), toon([1, 1, 1], { map, sheen: 0.2 })));
    const m = toon(col, { sheen: 0.2 });
    for (const [lat, ry] of [[24, 0.5], [12, -0.4]]) {                 // knot tails at the back-right
      const k = new THREE.SphereGeometry(1, 16, 10); k.scale(0.05 * W, 0.12 * W, 0.025 * W);
      const t = solid(k, m); const p = ell(lat * DEG, 118 * DEG, 0.14 * W); t.position.copy(p); t.rotation.set(0, 128 * DEG, ry); g.add(t);
    }
    return g;
  };
}
export function visor(col = [0.10, 0.42, 0.30], tilt = 12) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    g.add(solid(bandGeo(22 * DEG, 38 * DEG, 0.06 * W), toon(col, { sheen: 0.3 })));
    const la = 22 * DEG, y = HB * Math.sin(la), rIn = HA * Math.cos(la) + 0.02 * W;
    const brim = solid(brimGeo(rIn, 0.62 * W, 0.86 * W), toon(col.map(c => Math.min(1, c * 1.5 + 0.05)), { sheen: 0.4, rough: 0.3 }));
    brim.position.set(0, y + 0.01 * W, 0); brim.rotation.x = 0.30; g.add(brim);
    return g;
  };
}
export function guardCap(col = [0.10, 0.15, 0.32], tilt = 8) {
  return () => {
    const g = new THREE.Group(); g.rotation.x = -tilt * DEG;
    const y0 = 0.10 * W, R = 0.56 * W, Hc = 0.42 * W, pr = [[0, y0], [R * 0.9, y0]];
    for (let i = 0; i <= 16; i++) { const a = 90 * i / 16 * DEG; pr.push([R * Math.pow(Math.cos(a), 0.55), y0 + Hc * Math.sin(a)]); }
    g.add(solid(lathe(pr, 64), toon(col, { sheen: 0.35, rough: 0.35 })));
    const band = solid(bandGeo(4 * DEG, 14 * DEG, 0.07 * W), toon(col.map(c => c * 0.55), { sheen: 0.2 })); g.add(band);
    const brim = solid(brimGeo(HA * Math.cos(12 * DEG) + 0.03 * W, 0.62 * W, 0.92 * W), toon([0.03, 0.04, 0.08], { sheen: 0.5, rough: 0.25 }));
    brim.position.set(0, y0, 0); brim.rotation.x = 0.16; g.add(brim);
    const bg = new THREE.CylinderGeometry(0.06 * W, 0.06 * W, 0.03 * W, 24); bg.rotateX(Math.PI / 2);
    const badge = solid(bg, toon([1.0, 0.72, 0.16], { sheen: 0.8, rough: 0.2, shade: [0.7, 0.55, 0.5] }), INK_T * 0.6);
    const a = 42 * DEG; badge.position.set(0, y0 + Hc * Math.sin(a), R * Math.pow(Math.cos(a), 0.55) + 0.01 * W); badge.rotation.x = -0.5;
    g.add(badge);
    return g;
  };
}
// frames are tubes drawn ON the head surface (projected straight back onto it), so they hug it from any angle
function glasses() {
  const g = new THREE.Group(), r = 0.112 * W, lift = 0.022 * W;
  const onHead = (x, y) => { const z = HA * Math.sqrt(Math.max(0.02, 1 - (x / HA) ** 2 - (y / HB) ** 2)); const n = new THREE.Vector3(x / HA ** 2, y / HB ** 2, z / HA ** 2).normalize(); return new THREE.Vector3(x, y, z).addScaledVector(n, lift); };
  const tube = pts => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, pts.length > 3), 64, 0.013 * W, 8, pts.length > 3), inkMat); m.castShadow = true; return m; };
  for (const s of [-1, 1]) g.add(tube(Array.from({ length: 40 }, (_, i) => { const a = 2 * Math.PI * i / 40; return onHead(s * 0.15 * W + r * Math.cos(a), 0.02 * W + r * Math.sin(a)); })));
  g.add(tube([onHead(-0.038 * W, 0.03 * W), onHead(0, 0.038 * W), onHead(0.038 * W, 0.03 * W)]));
  return g;
}

// spherical patch just above the head; UVs are the straight-on projection, so from the front it reads as the flat 2D face
// ------------------------------------------------------------------ head silhouette
// Not a perfect ellipsoid (Kai 11/11: "đầu tròn hoàn hảo quá"). Measured on the reference (pink f653, ref_close, hair incl.):
// h/w 0.88, the widest row at 34 % from the top, a broad flattish crown (73 % of the width only 6 % down), then a long
// taper to a narrower rounded chin (65 % of the width at 78 %, 48 % at 90 %). An ellipse is widest at 50 % and only 47 %
// wide 6 % down. HEAD_S = the horizontal scale against our ellipsoid at height yn = y / HB (top +1), 85 % of the measured
// difference, crown capped so hats and hair still fit; plus a 1 % lopsidedness and a 0.8 % three-lobe wobble so the
// outline is drawn, not turned. Every head part (head, face patch, glasses, hair, hats) is deformed with the same map, so
// the face layout and the hats stay on the new shape.
const HEAD_S = [[1.0, 1.08], [0.8, 1.12], [0.64, 1.12], [0.48, 1.10], [0.32, 1.05], [0.16, 0.99], [0.0, 0.93], [-0.2, 0.88],
  [-0.4, 0.83], [-0.6, 0.815], [-0.8, 0.83], [-0.92, 0.88], [-1.0, 0.95]];
export function headScale(yn) {
  yn = Math.max(-1, Math.min(1, yn)); let i = 0; while (i + 2 < HEAD_S.length && HEAD_S[i + 1][0] > yn) i++;
  const [a, sa] = HEAD_S[i], [b, sb] = HEAD_S[i + 1], u = (a - yn) / (a - b); return sa + (sb - sa) * u * u * (3 - 2 * u);
}
// hats and hair sit HAT_LIFT higher than they were modelled so the brows always show (Kai, gate A 2026-11-12)
export const HAT_LIFT = 0.035;
const _hv = new THREE.Vector3(), _hm = new THREE.Matrix4(), _hi = new THREE.Matrix4();
// deform a geometry whose vertices are in a frame M (-> head space); M null = head space already
// Kai 11/11 (later): back to the original round head ("đầu hiện tại anh lại thấy không ok") -> off by default.
export const HEAD_SHAPE = { on: false };
// Kai 11/11: "the reference face and line are very 2D, ours is a 3D sphere". FACE_2D.on: the head is drawn flat (unlit
// white, one thin shade crescent at the edge, no light gradient) and the face is a flat card that always faces the lens and
// slides across the head disc as the head turns (clipped by its edge), instead of a texture wrapped round a sphere.
export const FACE_2D = { on: true };
// flat head: unlit fill, a thin crescent of shade inside the silhouette on the side away from the key (screen down-right,
// reference sRGB 251/246/243 lit, 230/219/231 shade), lightly tinted by the place light so a night head is not a lamp
function flatHeadMat(rgb, shade) {
  const U = { uColor: { value: lin(...rgb) }, uShade: { value: lin(...shade) }, uPlaceLit: PLACE.lit, uFill: { value: -2 }, uFillCol: { value: lin(...FILL_RGB) } };
  const m = new THREE.ShaderMaterial({ uniforms: U,
    vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vP;
      #include <common>
      #include <logdepthbuf_pars_vertex>
      void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); vP = vec2(position.x / ${HA.toFixed(5)}, position.y / ${HB.toFixed(5)}); gl_Position = projectionMatrix * mv;
      #include <logdepthbuf_vertex>
      }`,
    fragmentShader: `uniform vec3 uColor, uShade, uPlaceLit, uFillCol; uniform float uFill; varying vec3 vN; varying vec3 vV; varying vec2 vP;
      #include <logdepthbuf_pars_fragment>
      void main(){
      #include <logdepthbuf_fragment>
        // a soft top-to-bottom wash (reference: top 255/253/250, middle 246/243/239, bottom 220/210/218) plus a thin
        // crescent at the edge on the shadow side; never a lit 3D ball
        vec3 n = normalize(vN);
        float edge = 1.0 - clamp(dot(n, normalize(vV)), 0.0, 1.0);
        float side = clamp(0.35 + 0.9 * dot(normalize(n.xy + 1e-4), normalize(vec2(0.55, -0.85))), 0.0, 1.0);
        float k = max(max(0.85 * smoothstep(0.35, -0.95, n.y), 0.55 * smoothstep(0.5, 0.95, edge)), smoothstep(0.6, 0.9, edge) * side);
        // rage fill (verb face_fill): colour rises from the chin like a liquid, a soft wavy surface line
        float lvl = uFill + 0.035 * sin(vP.x * 9.0 + uFill * 14.0);
        vec3 base = mix(uColor, uFillCol, smoothstep(lvl + 0.03, lvl - 0.03, vP.y));
        vec3 c = mix(base, base * uShade, k) * mix(vec3(1.0), uPlaceLit, 0.25);
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }` });
  m.color = U.uColor.value;            // S.face tints it for rage through .color, like the toon material
  return m;
}
function shapeHeadGeo(g, M = null) {
  if (!HEAD_SHAPE.on) return;
  const p = g.attributes.position; if (M) _hi.copy(M).invert();
  for (let i = 0; i < p.count; i++) {
    _hv.fromBufferAttribute(p, i); if (M) _hv.applyMatrix4(M);
    const k = headScale(_hv.y / HB) * (1 + 0.010 * Math.tanh(_hv.x / (0.1 * W)) + 0.008 * Math.sin(3 * Math.atan2(_hv.z, _hv.x) + 0.7));
    _hv.x *= k; _hv.z *= k; if (M) _hv.applyMatrix4(_hi); p.setXYZ(i, _hv.x, _hv.y, _hv.z);
  }
  p.needsUpdate = true; if (g.attributes.normal) g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
}
function facePatch() {
  const R = 1.012, g = new THREE.SphereGeometry(HA * R, 48, 36, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.80, 1.6);
  g.scale(1, HEAD_H, 1);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, 0.5 + p.getX(i) / W, 0.5 + p.getY(i) / W);
  shapeHeadGeo(g);                                               // uv kept from the ellipsoid: the layout follows the new shape
  return g;
}

// ------------------------------------------------------------------ clothes (painted on the torso texture)
const TEX_W = 1536, TEX_H = 864;
function clothesCanvas(spec) {
  const T = TORSO, r = T.w / 2, v0 = T.cy - T.h / 2;
  const cv = document.createElement('canvas'); cv.width = TEX_W; cv.height = TEX_H; const g = cv.getContext('2d');
  // (u, v) on the front (W units) -> texture pixel; u wraps round the capsule by angle
  const P = (u, v) => [(0.5 + Math.asin(Math.max(-1, Math.min(1, u / r))) / (2 * Math.PI)) * TEX_W, (1 - (v - v0) / T.h) * TEX_H];
  const k = TEX_H / T.h;                                         // px per W, so widths stay in W units
  const poly = (pts, fill, ink = 0) => { g.beginPath(); pts.forEach((q, i) => { const [x, y] = P(...q); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
    if (ink) { g.lineWidth = ink * k * 2; g.strokeStyle = css(INK_RGB); g.lineJoin = 'round'; g.stroke(); } g.fillStyle = css(fill); g.fill(); };
  const line = (pts, w, col) => { g.beginPath(); pts.forEach((q, i) => { const [x, y] = P(...q); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.lineWidth = w * k; g.strokeStyle = css(col); g.lineCap = g.lineJoin = 'round'; g.stroke(); };
  const dot = (c, rr, col) => { const [x, y] = P(...c); g.beginPath(); g.arc(x, y, rr * k, 0, Math.PI * 2); g.fillStyle = css(col); g.fill(); };
  const dense = (a, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  const sh = spec.shirt || CREAM, white = Math.min(...sh) > 0.9;          // a white shirt is the reference's cream body
  g.fillStyle = css(white ? CREAM : sh); g.fillRect(0, 0, TEX_W, TEX_H);
  const top = T.cy + T.h / 2, BRASS = [1.0, 0.70, 0.16];
  for (const c of spec.clothes || []) {
    if (c.vest) {
      g.fillStyle = css(c.vest); g.fillRect(0, 0, TEX_W, TEX_H);
      if (c.check) { g.strokeStyle = css(c.check); g.globalAlpha = 0.85; g.lineWidth = 0.022 * k; const s = 0.13 * k;      // window-pane check
        for (let x = 0; x < TEX_W; x += s) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, TEX_H); g.stroke(); }
        for (let y = 0; y < TEX_H; y += s) { g.beginPath(); g.moveTo(0, y); g.lineTo(TEX_W, y); g.stroke(); } g.globalAlpha = 1; }
      if (c.pin) { g.fillStyle = css(c.pin); const s = 0.085 * k; for (let x = 0; x < TEX_W; x += s) g.fillRect(x, 0, 0.026 * k, TEX_H); }
      const L = s => [[s * 0.075, top + 0.02], [s * 0.075, top - 0.02], [s * 0.115, T.cy + 0.05], [s * 0.10, v0 + 0.03], [s * 0.10, v0 - 0.02]];
      const strip = [...L(-1).flatMap((q, i, a) => i ? dense(a[i - 1], q, 6).slice(1) : [q]), ...L(1).reverse().flatMap((q, i, a) => i ? dense(a[i - 1], q, 6).slice(1) : [q])];
      poly(strip, spec.shirt || [1, 1, 1]);
      for (const s of [-1, 1]) { line(L(s).slice(1, 4), 0.020, INK_RGB); dot([s * 0.19, T.cy + 0.14], 0.028, BRASS); }
      if (c.strap) {
        const a = [-T.w * 0.34, T.cy + T.h * 0.40], b = [T.w * 0.44, T.cy - T.h * 0.30];
        line(dense(a, b, 20), 0.085, INK_RGB); line(dense(a, b, 20), 0.050, c.strap);
      }
    }
    if (c.kerchief) {                                             // a knotted neckerchief under the chin, the point down the chest
      const t0 = top - 0.06; poly([[-0.16, t0], [0.16, t0], [0, t0 - 0.30]], c.kerchief, 0.010);
      dot([0, t0 - 0.02], 0.045, c.kerchief.map(x => x * 0.75));
    }
    if (c.tie) {
      const t0 = top - 0.10;
      poly([[-0.045, t0], [0.045, t0], [0.075, t0 - 0.42], [0, t0 - 0.52], [-0.075, t0 - 0.42]], c.tie, 0.010);
      for (let i = 0; i < 4; i++) { const v = t0 - 0.08 - i * 0.10; line([[-0.05 - i * 0.006, v - 0.03], [0.05 + i * 0.006, v + 0.02]], 0.028, c.stripe || [1.0, 0.72, 0.35]); }
    }
    if (c.bowtie) {
      const v = top - 0.30;                                       // below the chin: the head hides the collar
      poly([[0, v], [-0.12, v - 0.07], [-0.12, v + 0.07]], c.bowtie, 0.009);
      poly([[0, v], [0.12, v + 0.07], [0.12, v - 0.07]], c.bowtie, 0.009);
      dot([0, v], 0.03, INK_RGB);
    }
    if (c.uniform) {
      const v = T.cy - T.h * 0.22;
      g.fillStyle = css([0.02, 0.02, 0.03]); const y = P(0, v)[1]; g.fillRect(0, y - 0.035 * k, TEX_W, 0.07 * k);
      poly([[-0.04, v - 0.04], [0.04, v - 0.04], [0.04, v + 0.04], [-0.04, v + 0.04]], BRASS, 0.007);
      dot([-0.14, T.cy + 0.22], 0.048, INK_RGB); dot([-0.14, T.cy + 0.22], 0.040, BRASS);
      for (const s of [-1, 1]) line(dense([s * 0.03, top - 0.02], [s * 0.05, v + 0.05], 8), 0.012, c.uniform.seam || [0.08, 0.11, 0.24]);
    }
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function torsoGeo() {
  const T = TORSO, r = T.w / 2 * W, h = T.h * W, pr = [], n = 14;
  for (let i = 0; i <= n; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / n; pr.push([r * Math.cos(a), r + r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++) { const a = Math.PI / 2 * i / n; pr.push([r * Math.cos(a), h - r + r * Math.sin(a)]); }
  // an egg, not a pill: the reference bodies are fuller at the belly and narrower at the shoulders (QlDPM f600, VS1Z)
  for (const q of pr) { const u = q[1] / h; q[0] *= 1.10 - 0.20 * u * u; }
  const g = lathe(pr, 64); g.scale(1, 1, T.depth);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setY(i, p.getY(i) / h);
  return g;
}

// ------------------------------------------------------------------ limbs
class Tube {
  constructor(n, r, radial = 10) {
    this.n = n; this.r = r; this.k = radial;
    const g = new THREE.BufferGeometry(), idx = [];
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * radial * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * radial * 3), 3));
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < radial; j++) {
      const a = i * radial + j, b = i * radial + (j + 1) % radial, c = a + radial, d = b + radial;
      idx.push(a, c, b, b, c, d);
    }
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, inkMat); this.mesh.castShadow = true; this.mesh.frustumCulled = false;
  }
  set(pts) {
    const { n, r, k } = this, P = this.mesh.geometry.attributes.position, N = this.mesh.geometry.attributes.normal;
    const t = new THREE.Vector3(), nr = new THREE.Vector3(0, 0, 1), bn = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      t.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      if (i === 0) { nr.set(0, 0, 1); if (Math.abs(nr.dot(t)) > 0.9) nr.set(1, 0, 0); }
      nr.addScaledVector(t, -nr.dot(t)).normalize();             // parallel transport: no twist along the limb
      bn.crossVectors(t, nr);
      for (let j = 0; j < k; j++) {
        const a = 2 * Math.PI * j / k; d.copy(nr).multiplyScalar(Math.cos(a)).addScaledVector(bn, Math.sin(a));
        P.setXYZ(i * k + j, pts[i].x + d.x * r, pts[i].y + d.y * r, pts[i].z + d.z * r); N.setXYZ(i * k + j, d.x, d.y, d.z);
      }
    }
    P.needsUpdate = N.needsUpdate = true;
  }
}
// Bone lengths (W). Leg = hip (v 1.38) to ankle (v 0.022) when straight; the arm hangs in a soft ~25 deg arc at rest.
// Arms 25 % longer than the first design (Kai 2026-11-12: at 0.41 the arm was shorter than the head and a raised hand hid
// behind it); both bones stay equal (ik() assumes it).
export const LIMB = { thigh: 0.679, shin: 0.679, upper: 0.5125, fore: 0.5125, stub: 0.122 };
// the foot (W): a heel behind the ankle as well as the toe in front, so the body has something to stand on (rig B2; a
// 4 cm toe stub with no heel put a standing body's centre of mass behind its feet). FOOT_R: the drawn line's radius,
// the height of the sole under a foot point
export const FOOT = { heel: 0.08 };
const FOOT_R = 0.022;
// Above this share of full reach the joint eases toward straight and the hose stretches (rubber hose), so a target is
// always reached exactly (feet never slide, props stay in the hand). Legs straighten fully (a standing leg never
// flickers bent); arms keep a soft 12 deg bend and stretch, easing over a wide range so a fast reach never snaps.
const SOFT = { leg: 0.965, arm: 0.96 };
// the hip-to-ankle distance (share of full leg length) at which the leg shows a knee flex of `flex` deg
export function legReach(flex) {
  const s = SOFT.leg, fs = 2 * Math.acos(s) / DEG;
  if (flex >= fs) return Math.cos(flex / 2 * DEG);
  let a = s, b = 1;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (fs * (1 - sm(s, 1, m)) > flex) a = m; else b = m; }
  return (a + b) / 2;
}
const ROUND = { leg: 0.40, arm: 0.50 };                          // bend roundness: control-point reach as a share of the bone
const V = (a) => new THREE.Vector3(a[0], a[1], a[2] || 0);
// Arms never rubber-hose: exact two-bone geometry down to an elbow of ARM_MIN_FLEX; past that the bones stretch at most
// ARM_STRETCH and the hand stops short of its target (the body's reach assist in pose() keeps targets inside reach).
const ARM_MIN_FLEX = 15, ARM_STRETCH = 1.03;
// Two equal bones root -> joint -> end; pole = the side the joint points to. Returns the joint, the flex (deg, 0 = straight)
// and the end actually reached (an arm target past its reach is pulled in).
function ik(root, end, l, pole, soft, arm = false) {
  const ax = end.clone().sub(root); let d = Math.max(1e-6, ax.length()); ax.divideScalar(d);
  const rs = Math.cos(ARM_MIN_FLEX / 2 * DEG);
  if (arm && d > 2 * l * rs * ARM_STRETCH) { d = 2 * l * rs * ARM_STRETCH; end = root.clone().addScaledVector(ax, d); }
  const r = d / (2 * l), full = rr => 2 * Math.acos(Math.min(1, rr));
  const half = arm ? (r <= rs ? full(r) / 2 : ARM_MIN_FLEX / 2 * DEG) : r <= soft ? full(r) / 2 : full(soft) / 2 * (1 - sm(soft, 1, r));
  const perp = pole.clone().normalize(); perp.addScaledVector(ax, -perp.dot(ax));
  if (arm) {                                                       // pole near the arm's axis: blend toward down-and-out
    const fb = new THREE.Vector3(Math.sign(pole.x || 1) * 0.5, -1, -0.2).normalize(); fb.addScaledVector(ax, -fb.dot(ax));
    const w = Math.max(0, 1 - perp.length() / 0.45); perp.multiplyScalar(1 - w).addScaledVector(fb, w);
  }
  if (perp.lengthSq() < 1e-8) perp.set(0, 0, 1).addScaledVector(ax, -ax.z);
  perp.normalize();
  const joint = root.clone().addScaledVector(ax, d / 2).addScaledVector(perp, d / 2 * Math.tan(half));
  return { joint, flex: 2 * half / DEG, end };
}
// One smooth tube through root, joint and end: two quadratic arcs sharing the chord direction as tangent at the joint,
// resampled to n points evenly by arc length (W units in, metres out).
function hose(a, k, e, round, n) {
  const t = e.clone().sub(a).normalize(), l1 = a.distanceTo(k), l2 = k.distanceTo(e);
  const c1 = k.clone().addScaledVector(t, -round * l1), c2 = k.clone().addScaledVector(t, round * l2), dense = [];
  const q = (p0, c, p1, s) => new THREE.Vector3().copy(p0).multiplyScalar((1 - s) ** 2).addScaledVector(c, 2 * (1 - s) * s).addScaledVector(p1, s * s);
  for (let i = 0; i <= 24; i++) dense.push(q(a, c1, k, i / 24));
  for (let i = 1; i <= 24; i++) dense.push(q(k, c2, e, i / 24));
  const cum = [0]; for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + dense[i].distanceTo(dense[i - 1]));
  const out = [], tot = cum[cum.length - 1] || 1e-6; let j = 0;
  for (let i = 0; i < n; i++) {
    const s = tot * i / (n - 1); while (j < dense.length - 2 && cum[j + 1] < s) j++;
    const u = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
    out.push(dense[j].clone().lerp(dense[j + 1], Math.min(1, u)).multiplyScalar(W));
  }
  return out;
}
// FK arm in the figure's frame (gravity frame, not the leaning torso): fwd = upper arm swung forward (deg),
// out = away from the body (deg), flex = elbow bend (deg), the forearm folding forward and a little inward.
function armFK(sh, sg, a) {
  const f = (a.fwd || 0) * DEG, o = (a.out ?? 10) * DEG;
  const d = new THREE.Vector3(sg * Math.sin(o), -Math.cos(o) * Math.cos(f), Math.cos(o) * Math.sin(f)).normalize();
  const elbow = sh.clone().addScaledVector(d, LIMB.upper);
  const n = new THREE.Vector3(-sg * 0.25, 0, 1).addScaledVector(d, -new THREE.Vector3(-sg * 0.25, 0, 1).dot(d));
  if (n.lengthSq() < 1e-6) n.set(0, 1, 0);
  n.normalize();
  const fl = (a.flex ?? 25) * DEG, fd = d.clone().multiplyScalar(Math.cos(fl)).addScaledVector(n, Math.sin(fl));
  return { elbow, hand: elbow.clone().addScaledVector(fd, LIMB.fore) };
}

function contactTex() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 6, 64, 64, 64); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(cv);
}

// ------------------------------------------------------------------ reach assist
// When a hand target lies past REACH of the full arm, the body takes it there: the pelvis shifts toward it (weight onto
// the near leg), the torso rolls and pitches toward it, the shoulders twist, the knees give for a low target. A few
// damped Gauss-Newton steps on the over-reach, each parameter weighted by how readily a body uses it and held inside
// LIMITS of the pose it was given. Continuous in the targets, so a moving target never makes the body jump.
const REACH = 0.92;
const LIMITS = { dx: 0.28, lean: 20, pitch: [-12, 46], bob: [-0.18, 0.03], shTwist: 36 };
// how readily the body uses each (pitch 3 : lean 2 : pelvis shift 1.5 : twist 1.5 : knees 0.6), times the square of a
// natural step (0.1 W, 10 deg), so the shares do not depend on the units
const WEIGHT = { dx: 1.5 * 0.01, lean: 2 * 100, pitch: 3 * 100, bob: 0.6 * 0.01, shTwist: 1.5 * 100 };
const shoulderOf = (q, sg) => {
  const L = (q.lean || 0) * DEG, c = Math.cos(L), s = Math.sin(L), pt = (q.pitch || 0) * DEG, dx = q.dx || 0;
  const u = sg * TORSO.w * 0.40, y = SHOULDER_V + (q.shrug || 0) - HIP_V, yy = -u * s + y * c;
  const x = u * c + y * s + dx, a = (q.shTwist || 0) * DEG, uu = x - dx;
  return [dx + uu * Math.cos(a), yy * Math.cos(pt) + HIP_V + (q.bob || 0), yy * Math.sin(pt) + uu * Math.sin(a)];
};
export function reachAssist(P) {
  const front = new Set(P.front || []), T = [];
  for (const [side, sg] of [['L', -1], ['R', 1]]) {
    const h0 = P['hand' + side]; if (!h0) continue;
    const fk = P['armFK' + side], fw = fk ? Math.max(0, Math.min(1, fk.w ?? 1)) : 0;
    if (fw > 0.999) continue;
    T.push({ sg, w: 1 - fw, hand: [h0[0], h0[1], h0.length > 2 ? h0[2] : (front.has('arm' + side) ? 0.16 : 0.0)] });
  }
  if (!T.length) return P;
  const K = Object.keys(WEIGHT), q0 = Object.fromEntries(K.map(k => [k, P[k] || 0])), q = { ...q0, shrug: P.shrug || 0 };
  const lim = (k, x) => { const L = LIMITS[k], b = q0[k]; return Array.isArray(L) ? Math.max(Math.min(b, b + L[0]), Math.min(Math.max(b, b + L[1]), x)) : Math.max(b - L, Math.min(b + L, x)); };
  const over = (t, qq) => { const sh = shoulderOf(qq, t.sg); return Math.hypot(t.hand[0] - sh[0], t.hand[1] - sh[1], t.hand[2] - sh[2]) - REACH * 2 * LIMB.upper; };
  let moved = false;
  for (let it = 0; it < 6; it++) {
    for (const t of T) {
      const e = over(t, q); if (e <= 1e-5) continue;
      const g = {}; let gg = 0;
      for (const k of K) { const h = k === 'dx' || k === 'bob' ? 0.005 : 0.25, qq = { ...q, [k]: q[k] + h }; g[k] = (over(t, qq) - e) / h; gg += WEIGHT[k] * g[k] * g[k]; }
      if (gg < 1e-9) continue;
      for (const k of K) q[k] = lim(k, q[k] - 0.8 * t.w * e * WEIGHT[k] * g[k] / gg);   // a half-busy hand gets half the help
      moved = true;
    }
  }
  if (!moved) return P;
  return { ...P, ...Object.fromEntries(K.map(k => [k, q[k]])), assist: +Math.abs(q.pitch - q0.pitch + q.lean - q0.lean).toFixed(2) };
}

// ------------------------------------------------------------------ joint-space pose (motion v2)
// The body curves progressively from the hip (y = 0, body space, W) to the top of the torso: `bend` (forward) and `side`
// (toward the figure's +x) in degrees in total, `twist` about the spine by the top; `sq` squashes (-) or stretches (+) it
// about the hip, volume kept (x and z scale by 1 / sqrt of the y scale). Points above the top go on straight.
const SPINE_L = TORSO.cy + TORSO.h / 2 - HIP_V, TORSO_Y0 = TORSO.cy - TORSO.h / 2 - HIP_V;
function spineParams(sp = {}, sq = 0) {
  const f = (sp.bend || 0) * DEG, sd = (sp.side || 0) * DEG;
  return { th: Math.hypot(f, sd), phi: Math.atan2(sd, f), tw: (sp.twist || 0) * DEG, s: Math.max(0.4, 1 + sq) };
}
// bend one point (and optionally its normal) in place; returns the frame angle at its height
function bendPt(B, v, n) {
  const k = 1 / Math.sqrt(B.s); let x = v.x * k, y = v.y * B.s, z = v.z * k;
  const L = SPINE_L * B.s, u = Math.max(0, Math.min(1, y / L)), t = B.tw * u, ct = Math.cos(t), st = Math.sin(t);
  [x, z] = [x * ct + z * st, -x * st + z * ct];
  const cp = Math.cos(B.phi), sp = Math.sin(B.phi);
  [x, z] = [x * cp - z * sp, x * sp + z * cp];
  let a = 0;
  if (y > 0 && B.th > 1e-5) {
    const R = L / B.th; a = B.th * Math.min(y, L) / L;
    const yb = (R - z) * Math.sin(a), zb = R - (R - z) * Math.cos(a), e = Math.max(0, y - L);
    y = yb + e * Math.cos(a); z = zb + e * Math.sin(a);
  }
  [x, z] = [x * cp + z * sp, -x * sp + z * cp];
  v.set(x, y, z);
  if (n) {
    let nx = n.x, ny = n.y, nz = n.z;
    [nx, nz] = [nx * ct + nz * st, -nx * st + nz * ct];
    [nx, nz] = [nx * cp - nz * sp, nx * sp + nz * cp];
    [ny, nz] = [ny * Math.cos(a) - nz * Math.sin(a), ny * Math.sin(a) + nz * Math.cos(a)];
    [nx, nz] = [nx * cp + nz * sp, -nx * sp + nz * cp];
    n.set(nx, ny, nz);
  }
  return a;
}
// the spine frame at height y (body space, W): where it is and how it is turned
const _Y = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0);
function spineFrame(B, y) {
  const p = new THREE.Vector3(0, y, 0), a = bendPt(B, p), u = Math.max(0, Math.min(1, y / SPINE_L));
  const q = new THREE.Quaternion().setFromAxisAngle(_Y, B.phi).multiply(new THREE.Quaternion().setFromAxisAngle(_X, a))
    .multiply(new THREE.Quaternion().setFromAxisAngle(_Y, -B.phi)).multiply(new THREE.Quaternion().setFromAxisAngle(_Y, B.tw * u));
  return { p, q };
}
// an arm swung from the shoulder in the chest's frame: raise = out to the side (deg), swing = forward (deg), elbow = flex
// (deg), roll = turns the plane the elbow folds in (deg, + = the forearm folds up toward the face)
function armDirs(a, sg) {
  const d = new THREE.Vector3(0, -1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), sg * (a.raise || 0) * DEG)
    .applyAxisAngle(_X, -(a.swing || 0) * DEG).normalize();
  const pref = new THREE.Vector3(-sg * 0.25, 0.3, 1).normalize().applyAxisAngle(d, sg * (a.roll || 0) * DEG);
  const b = pref.addScaledVector(d, -pref.dot(d)); if (b.lengthSq() < 1e-6) b.set(0, 1, 0); b.normalize();
  const fl = (a.elbow ?? 20) * DEG, fd = d.clone().multiplyScalar(Math.cos(fl)).addScaledVector(b, Math.sin(fl));
  return { d, fd, pole: b };
}

// ------------------------------------------------------------------ the figure
export function makeStick(spec) {
  const root = new THREE.Group(); root.name = spec.name || 'stick'; root.userData.stick = true;   // look.js: no screen ink (own hull)
  const body = new THREE.Group(); root.add(body);
  // flat like the reference (judge t1: our glossy lavender-blue body vs flat off-white / cream heads): a hard 2-step cel
  // ramp, no gloss, no rim light; the shade is a soft cool grey that never reaches the lit side; place light tints the
  // figure only a little (char: 1)
  // girth: a body silhouette per actor (judge t2: "a grey blob body"); 1 = the default, Bram is stocky, Mabel slim.
  // rimCool: a cool rim light on dark places (bible v1.1: a dark figure keeps an edge on any set darker than Y 95)
  const girth = spec.girth ?? 1, rc = spec.rimCool ? 1 : 0;
  const torso = solid(torsoGeo(), toon([1, 1, 1], { map: clothesCanvas(spec), sheen: 0, rough: 1, rim: 0, soft: 0, shade: [0.78, 0.78, 0.86], char: 1, rimCool: rc }));
  torso.scale.set(girth, 1, 0.9 + 0.1 * girth);
  torso.position.y = (TORSO.cy - TORSO.h / 2 - HIP_V) * W; body.add(torso);

  const head = new THREE.Group(); root.add(head);
  const hg = new THREE.SphereGeometry(HA, 64, 40); hg.scale(1, HEAD_H, 1); shapeHeadGeo(hg);
  const headSolid = solid(hg, FACE_2D.on ? flatHeadMat(spec.skin || HEAD_FLAT, [0.80, 0.77, 0.84]) : toon(spec.skin || HEAD_WHITE, { shade: [0.97, 0.95, 0.98], rim: 0, sheen: 0, broad: 0, rough: 1, soft: 0.65, rimLit: 0, char: 1, rimCool: rc }));
  headSolid.receiveShadow = false;   // no hard cast shadows from hair or hats on the face (a lit white triangle cut the face, ep01 f1240); the reference head is one soft white form
  head.add(headSolid);
  const rig = new THREE.Group(); head.add(rig);
  const FR = faceRig(W, { glasses: !!spec.glasses });
  const face = new THREE.Mesh(facePatch(), new THREE.MeshBasicMaterial({ map: FR.tex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  face.userData.noPrepass = true; face.renderOrder = 2; rig.add(face); head.add(FR.group);
  const card2d = new THREE.Mesh(new THREE.PlaneGeometry(W, W), new THREE.MeshBasicMaterial({ map: FR.tex, transparent: true, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  card2d.userData.noPrepass = true; card2d.renderOrder = 2; card2d.visible = false; head.add(card2d);
  if (FACE_2D.on) face.visible = false;
  const skin0 = headSolid.material.color.clone(), tintC = new THREE.Color();
  if (spec.glasses) rig.add(glasses());
  // hair and hats hang in their own group so the motion layer can swing them after the head (follow-through)
  const hairG = new THREE.Group(); head.add(hairG);
  for (const f of spec.hair || []) hairG.add(f());
  // hair, hats and glasses were built on the ellipsoid: give them the same head shape (in head space), geometry cloned
  head.updateMatrixWorld(true); _hm.copy(head.matrixWorld).invert();
  const skip = new Set([headSolid, face]); headSolid.traverse(o => skip.add(o)); FR.group.traverse(o => skip.add(o));
  head.traverse(o => { if (!o.isMesh || skip.has(o)) return; o.geometry = o.geometry.clone(); shapeHeadGeo(o.geometry, _hm.clone().multiply(o.matrixWorld)); });
  hairG.position.y = HAT_LIFT;

  const limbs = { armL: new Tube(16, LIMB_R), armR: new Tube(16, LIMB_R), legL: new Tube(18, LIMB_R), legR: new Tube(18, LIMB_R) };
  // hand mitt: reference hands are ~0.10 W across, about twice the arm line
  const dotGeo = new THREE.SphereGeometry(0.050 * W, 16, 10), jointGeo = new THREE.SphereGeometry(LIMB_R * 1.05, 10, 8);
  const ball = geo => { const m = new THREE.Mesh(geo, inkMat); m.castShadow = true; root.add(m); return m; };
  // gloves (spec.gloves = rgb): a light mitt with its own ink edge, so a hand reads against a dark coat or a dark set
  const glove = () => { const m = solid(dotGeo.clone().scale(1.15, 1.15, 1.15), toon(spec.gloves, { rough: 1, rim: 0, sheen: 0, soft: 0, char: 1 }), INK_T * 0.7); root.add(m); return m; };
  const hands = spec.gloves ? { L: glove(), R: glove() } : { L: ball(dotGeo), R: ball(dotGeo) }, ankles = { L: ball(jointGeo), R: ball(jointGeo) }, toes = { L: ball(jointGeo), R: ball(jointGeo) }, heels = { L: ball(jointGeo), R: ball(jointGeo) };
  const heelT = { L: new Tube(6, LIMB_R), R: new Tube(6, LIMB_R) }; for (const t of Object.values(heelT)) root.add(t.mesh);
  for (const t of Object.values(limbs)) root.add(t.mesh);

  const contact = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: lin(0.05, 0.09, 0.22),
    alphaMap: contactTex(), transparent: true, opacity: 0.42, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.scale.set(0.48 * W, 0.24 * W, 1); contact.position.set(0.03 * W, 0.004, 0);
  contact.userData.noPrepass = true; root.add(contact);

  const S = { root, yaw: 0, hand: {}, parts: { head: headSolid, torso, toes, ankles, hands, face, marks: FR.group }, xmarks: [], props: {} };
  const inv = new THREE.Matrix4();

  // pos (Blender metres), and either yaw (deg, 0 = facing Blender -Y) or face (a Blender point to turn toward)
  S.place = (P = {}) => {
    if (P.pos) root.position.copy(B(...P.pos));
    if (P.yaw != null) S.yaw = P.yaw * DEG;
    else if (P.face) { const d = B(...P.face).sub(root.position); S.yaw = Math.atan2(d.x, d.z); }
    // x_tumble / x_roll (deg, opt-in from allout/acting.js): the whole figure tips about its soles (+ tumble = falls on
    // its face, - = on its back; + roll = toward its right), x_lift (m) raises it so a body lying down rests on the floor
    root.rotation.set((P.x_tumble || 0) * DEG, S.yaw + (P.yaw_extra || 0) * DEG, -(P.x_roll || 0) * DEG, 'YXZ');
    if (P.x_spin) root.quaternion.multiply(SPIN_Q.setFromAxisAngle(SPIN_AX, P.x_spin * DEG));   // + x_spin turns the fallen body about its own length (cheek to the ground, the face to one side)
    if (P.x_lift) root.position.y += P.x_lift;
    if (P.x_slide) { const y = S.yaw; root.position.x += Math.sin(y) * P.x_slide; root.position.z += Math.cos(y) * P.x_slide; }   // a fallen body skids on along its facing
    root.updateMatrixWorld(true);
  };
  // a Blender world point -> this figure's (u, v) in W units
  S.toLocal = pB => { inv.copy(root.matrixWorld).invert(); const v = B(...pB).applyMatrix4(inv); return [v.x / W, v.y / W]; };

  // face only (expression cell, blink, eye slide): the reel runtime sets it after every prop has moved this frame
  // Extra keys: t (frame), age (frames since this expression began), cam (camera, Blender metres: mark cards face it),
  // marks ([[kind, age]] on top of the expression's own; verbs add them through the pose keys x_mark_<kind> = age + 1).
  // state (acting.js faceStateAt): a continuous face (in-betweened change, visemes, hold drift) drawn instead of expr
  S.face = (P = {}) => {
    const e = EXPR[P.expr] ? P.expr : 'neutral', E = EXPR[e], t = P.t || 0, age = P.age ?? 99;
    const marks = (E.marks || []).filter(([, life]) => !life || age < life).map(([k]) => [k, age]);
    for (const m of [...(P.marks || []), ...S.xmarks]) if (!marks.some(q => q[0] === m[0])) marks.push(m);
    const mx = P.state ? mixFace(P.state) : null, blink = Math.max(P.blink || 0, mx ? mx.blink : 0);
    let slide = null;
    if (FACE_2D.on && P.cam) {
      // where the lens is, seen from the head (head-local, +z = the face's front): the face slides toward the side it turns
      // to, up / down with the lens height, and is gone when the lens sees the back of the head
      head.updateWorldMatrix(true, false); _camL.copy(B(...P.cam)); head.worldToLocal(_camL);
      const d = _camL.lengthSq() > 1e-8 ? _camL.normalize() : _camL.set(0, 0, 1);
      const yaw = Math.atan2(d.x, d.z) - (P.look || 0) * LOOK_RAD, el = Math.asin(Math.max(-1, Math.min(1, d.y))) + (P.look_v || 0) * 0.12;
      // the face turns 80% as far as the skull (the cartoon cheat that keeps it on the ball in profile, approved at 1.3);
      // each feature hides itself as it goes round the edge, the whole face only at the back of the head
      const vis = Math.max(0, Math.min(1, (Math.cos(yaw) + 0.35) / 0.3));
      slide = [-0.8 * yaw, -0.40 * Math.sin(el) * HEAD_H, vis];
      card2d.visible = true; card2d.position.copy(d).multiplyScalar(HA * 1.02); card2d.lookAt(B(...P.cam));
    } else card2d.visible = false;
    face.visible = !FACE_2D.on || !P.cam;
    FR.draw(e, blink, t, marks, P.cam ? B(...P.cam) : null, mx ? mx.F : null, slide);
    S.faceStats = FR.stats;
    const ta = P.state && EXPR[P.state.a]?.tint, tb = E.tint, u = P.state ? Math.max(0, Math.min(1, P.state.u)) : 1;
    const tk = tb ? Math.min(1, age / 6) * u : ta ? 1 - u : 0;   // a furious face flushes over 6 frames (and fades as it leaves)
    headSolid.material.color.copy(skin0); if (tk) headSolid.material.color.lerp(tintC.setRGB(...(tb || ta)), tk);
    if (headSolid.material.uniforms?.uFill) headSolid.material.uniforms.uFill.value = S.fill > 0 ? -1.08 + 2.2 * Math.min(1, S.fill) : -2;
    rig.rotation.set(-(P.look_v || 0) * 0.12, (P.look || 0) * LOOK_RAD, 0);
  };
  // Hand props: pose key x_hp<L|R>_<kind> > 0.5 shows that prop in that hand (x_hpB_<kind> = between both hands);
  // x_tilt<L|R> (deg) tilts it (a cup pours toward the figure's right for +, an 'along' prop pitches about the fist).
  const up = new THREE.Vector3(0, 1, 0), qa = new THREE.Quaternion(), qb = new THREE.Quaternion(), ax = new THREE.Vector3();
  function handProps(P, r) {
    for (const o of Object.values(S.props)) o.visible = false;
    for (const k of Object.keys(P)) {
      const m = /^x_hp([LRB])_(\w+)$/.exec(k); if (!m || !(P[k] > 0.5)) continue;
      const side = m[1], kind = m[2], id = side + kind;
      const o = S.props[id] ||= (() => { const g = makeHandProp(kind); root.add(g); return g; })();
      o.visible = true;
      const tilt = (P['x_tilt' + (side === 'B' ? 'L' : side)] || 0) * DEG, U = o.userData, gp = new THREE.Vector3(...(U.grip || [0, 0, 0]));
      let hand;
      if (side === 'B') { hand = r.L.hand.clone().add(r.R.hand).multiplyScalar(0.5 * W); o.quaternion.setFromAxisAngle(ax.set(1, 0, 0), tilt); }
      else {
        hand = r[side].hand.clone().multiplyScalar(W);
        if (U.mode === 'along') {                                 // +y out of the fist along the forearm, then pitched by tilt
          const d = r[side].hand.clone().sub(r[side].elbow).normalize(); if (U.flip) d.negate();
          qa.setFromUnitVectors(up, d); qb.setFromAxisAngle(ax.set(1, 0, 0), tilt); o.quaternion.copy(qa).multiply(qb);
        } else {
          const t0 = U.tilt0 || [0, 0];
          qa.setFromAxisAngle(ax.set(0, 0, 1), -tilt + t0[1] * DEG); qb.setFromAxisAngle(ax.set(1, 0, 0), t0[0] * DEG); o.quaternion.copy(qa).multiply(qb);
        }
      }
      o.position.copy(hand).sub(gp.applyQuaternion(o.quaternion));
      if (U.level) U.level(P['x_lvl' + (side === 'B' ? 'L' : side)] ?? 1);     // x_lvl<L|R>: a container's fill 0..1 (beaker)
    }
  }
  // Extra keys for the reel runtime: pitch (deg, upper body forward about the hip), hands and feet may carry a
  // third number = depth toward where the figure faces (W), kneeF{L,R} = knee pushed forward (W), toeF = toe reach.
  S.pose = (P = {}) => {
    S.place(P);
    P = reachAssist(P);
    const dx = P.dx || 0, dz = P.bob || 0, lean = (P.lean || 0) * DEG, c = Math.cos(lean), s = Math.sin(lean);
    const pt = (P.pitch || 0) * DEG, pc = Math.cos(pt), ps = Math.sin(pt);
    const bt = (u, v) => { const y = v - HIP_V, yy = -u * s + y * c; return [u * c + y * s + dx, yy * pc + HIP_V + dz, yy * ps]; };
    body.position.set(dx * W, (HIP_V + dz) * W, 0); body.rotation.set(pt, 0, -lean);
    const hc = bt(HEAD_C[0] + (P.head_dx || 0), HEAD_C[1] + (P.head_dv || 0));
    head.position.set(hc[0] * W, hc[1] * W, hc[2] * W);
    head.rotation.set(pt * 0.6 + (P.head_pitch || 0) * DEG, 0, -(lean + (P.head_tilt || 0) * DEG));
    S.fill = P.x_fill || 0;                                        // rage fill (verb face_fill): the face pass reads it
    S.face(P);
    // Limbs. Extra keys: elbow{L,R} / kneeDir (or kneeDir{L,R}) = pole vectors (figure-local), armFK{L,R} =
    // {fwd, out, flex, w} swing the arm from the shoulder (w blends it over the hand target), footPitch{L,R} (deg,
    // + = toe up), shTwist / hipTwist (deg, + = the right shoulder / hip forward). Legacy bend{L,R} only picks a side.
    const front = new Set(P.front || []), rig = { pitch: P.pitch || 0, roll: P.lean || 0, assist: P.assist || 0, body: [P.dx || 0, P.bob || 0, P.shTwist || 0].map(x => +x.toFixed(3)) };
    const twist = (q, deg) => { const a = (deg || 0) * DEG, u = q[0] - dx; return [dx + u * Math.cos(a), q[1], q[2] + u * Math.sin(a)]; };
    for (const [side, sg] of [['L', -1], ['R', 1]]) {
      const sh = V(twist(bt(sg * TORSO.w * 0.40 * girth, SHOULDER_V + (P.shrug || 0) + (P['shrug' + side] || 0)), P.shTwist)), h0 = P['hand' + side];
      let hand = V(h0 ? [h0[0], h0[1], h0.length > 2 ? h0[2] : (front.has('arm' + side) ? 0.16 : 0.0)] : bt(sg * 0.41, 1.22));
      let pole;
      if (P['elbow' + side]) pole = V(P['elbow' + side]);
      else {
        pole = new THREE.Vector3(sg * 0.6, -0.2, -0.75);
        const b = P['bend' + side];
        if (b) { const ex = hand.x - sh.x, ey = hand.y - sh.y, ln = Math.hypot(ex, ey) || 1, k = Math.max(-1, Math.min(1, b / 0.1)); pole.multiplyScalar(0.4).add(new THREE.Vector3(-ey / ln * k, ex / ln * k, 0)); }
      }
      const fk = P['armFK' + side], fw = fk ? Math.max(0, Math.min(1, fk.w ?? 1)) : 0;
      if (fw > 0) {
        const k = armFK(sh, sg, fk), mid = sh.clone().lerp(k.hand, 0.5);
        hand.lerp(k.hand, fw); pole.normalize().lerp(k.elbow.clone().sub(mid).normalize(), fw);
      }
      const arm = ik(sh, hand, LIMB.upper, pole, SOFT.arm, true);
      hand = arm.end;
      const pts = hose(sh, arm.joint, hand, ROUND.arm, 16);
      limbs['arm' + side].set(pts); hands[side].position.copy(pts[15]); S.hand[side] = hand.toArray();
      const hb = bt(sg * 0.14 * girth, HIP_V + 0.04), hip = V(twist([hb[0], hb[1], 0], P.hipTwist));
      const f0 = P['foot' + side] || [sg * 0.22, 0.022], foot = V(f0);
      const kp = P['kneeDir' + side] || P.kneeDir || [sg * 0.15, 0, 1];
      const leg = ik(hip, foot, LIMB.thigh, V(kp), SOFT.leg);
      const lp = hose(hip, leg.joint, foot, ROUND.leg, 13);
      const td = P['toe' + side] ?? sg, h = new THREE.Vector3(0.10 * td, 0, P.toeF ?? 0.07).normalize(), pt = (P['footPitch' + side] || 0) * DEG;
      h.applyAxisAngle(new THREE.Vector3(0, 1, 0), (P['footYaw' + side] ?? P.footYaw ?? 0) * DEG);   // + turns the toe toward the figure's right
      const toeL = foot.clone().addScaledVector(h, LIMB.stub * Math.cos(pt)); toeL.y += LIMB.stub * Math.sin(pt) - 0.004;
      const toe = toeL.clone().multiplyScalar(W);
      for (let i = 1; i <= 5; i++) lp.push(lp[12].clone().lerp(toe, i / 5));
      limbs['leg' + side].set(lp); ankles[side].position.copy(lp[12]); toes[side].position.copy(toe);
      rig[side] = { hip, knee: leg.joint, ankle: foot, toe: toeL, shoulder: sh, elbow: arm.joint, hand,
        kneeFlex: leg.flex, elbowFlex: arm.flex, footPitch: P['footPitch' + side] || 0 };
    }
    S.rig = rig;
    handProps(P, rig);
    S.xmarks = Object.keys(P).filter(k => k.startsWith('x_mark_') && P[k] >= 1).map(k => [k.slice(7), Math.floor(P[k] - 1)]);
    contact.visible = P.contact !== false && !(P.x_air > 0) && Math.abs(P.x_tumble || 0) < 20 && Math.abs(P.x_roll || 0) < 20;   // a figure tipped over or airborne has no foot shadow
    contact.position.y = 0.004 + (P.ground || 0) * W;
    root.updateMatrixWorld(true);
    return S;
  };
  // Joint-space pose (motion v2, engine/motion.js): every number is an angle or a position the animator keyed; nothing
  // here moves a joint on its own (no reach assist, no hand smoothing). Keys: pos, yaw, bob (W), hip {x, z} (W shift),
  // pelvis {pitch, roll, yaw} (deg), spine {bend, side, twist} (deg), sq, neck {nod, tilt, turn} (deg), headSq,
  // arm{L,R} {raise, swing, elbow, roll, ik: [x, y, z] figure W, ikw, pole}, leg{L,R} {foot: [x, y, z] W, pitch, yaw, knee},
  // hat {pitch, roll} (deg, the follow-through swing), plus the x_ keys (props, marks) and contact.
  let bent = null, slices = null;
  const _e = new THREE.Euler();
  S.pose2 = (Q0 = {}) => {
    const LB = limitBody(Q0), Q = LB.Q;
    S.place(Q);
    if (!bent) {                                                   // rest copies of the torso and its ink shell, once
      const hull = torso.children[0];
      bent = [torso, hull].map(m => ({ g: m.geometry, p: m.geometry.attributes.position.array.slice(), n: m.geometry.attributes.normal.array.slice() }));
      torso.scale.set(1, 1, 1); torso.position.set(0, 0, 0);
      slices = torsoSlices(bent[0].p, { girth, gz: 0.9 + 0.1 * girth, W, y0: TORSO_Y0 });
    }
    const B = spineParams(Q.spine, Q.sq || 0), gz = 0.9 + 0.1 * girth, v = new THREE.Vector3(), n = new THREE.Vector3();
    for (const b of bent) {
      const P = b.g.attributes.position, N = b.g.attributes.normal;
      for (let i = 0; i < P.count; i++) {
        v.set(b.p[3 * i] * girth / W, b.p[3 * i + 1] / W + TORSO_Y0, b.p[3 * i + 2] * gz / W); n.set(b.n[3 * i], b.n[3 * i + 1], b.n[3 * i + 2]);
        bendPt(B, v, n); P.setXYZ(i, v.x * W, v.y * W, v.z * W); N.setXYZ(i, n.x, n.y, n.z);
      }
      P.needsUpdate = N.needsUpdate = true; b.g.computeBoundingSphere();
    }
    const pv = Q.pelvis || {}, hipP = new THREE.Vector3(Q.hip?.x || 0, HIP_V + (Q.bob || 0), Q.hip?.z || 0);
    const qb = new THREE.Quaternion().setFromEuler(_e.set((pv.pitch || 0) * DEG, (pv.yaw || 0) * DEG, -(pv.roll || 0) * DEG, 'YXZ'));
    body.position.copy(hipP).multiplyScalar(W); body.quaternion.copy(qb);
    const toRoot = p => p.clone().applyQuaternion(qb).add(hipP);
    // head: on the neck at the top of the spine, nodded / tilted / turned, squashed with its volume kept
    const top = spineFrame(B, SPINE_L), nk = Q.neck || {};
    const qn = new THREE.Quaternion().setFromEuler(_e.set((nk.nod || 0) * DEG, (nk.turn || 0) * DEG, -(nk.tilt || 0) * DEG, 'YXZ'));
    const qTop = top.q.clone().multiply(qn), hOff = new THREE.Vector3(0, (HEAD_C[1] - HIP_V - SPINE_L) * B.s, 0).applyQuaternion(qTop);
    head.position.copy(toRoot(top.p.clone().add(hOff))).multiplyScalar(W); head.quaternion.copy(qb.clone().multiply(qTop));
    const hs = Math.max(0.5, 1 + (Q.headSq || 0)); head.scale.set(1 / Math.sqrt(hs), hs, 1 / Math.sqrt(hs));
    hairG.rotation.set((Q.hat?.pitch || 0) * DEG, 0, -(Q.hat?.roll || 0) * DEG);
    S.fill = Q.x_fill || 0;
    const rig = { pitch: (pv.pitch || 0) + (Q.spine?.bend || 0), roll: (pv.roll || 0) + (Q.spine?.side || 0), assist: 0,
      body: [Q.hip?.x || 0, Q.bob || 0, Q.spine?.twist || 0].map(x => +x.toFixed(3)), sq: Q.sq || 0, headSq: Q.headSq || 0 };
    const shY = SHOULDER_V - HIP_V, qChest = qb.clone().multiply(spineFrame(B, shY).q);
    // the body as volumes (engine/body.js): the head as drawn (squash kept), the torso as bent elliptic slices
    const kS = 1 / Math.sqrt(B.s), vols = [ellipsoid(toRoot(top.p.clone().add(hOff)), qb.clone().multiply(qTop), [0.5 / Math.sqrt(hs), 0.5 * HEAD_H * hs, 0.5 / Math.sqrt(hs)], 'head')];
    for (const sl of slices) {
      const c = new THREE.Vector3(sl.cx, sl.y, sl.cz); bendPt(B, c);
      vols.push(ellipsoid(toRoot(c), qb.clone().multiply(spineFrame(B, Math.max(0, sl.y)).q), [sl.rx * kS, sl.ry * B.s, sl.rz * kS], 'torso'));
    }
    const legs = {};
    for (const [side, sg] of [['L', -1], ['R', 1]]) {
      const shB = new THREE.Vector3(sg * TORSO.w * 0.40 * girth, shY, 0); bendPt(B, shB);
      const lim = limitArm(Q['arm' + side] || {}), sh = toRoot(shB), A = lim.A;
      // FK from the shoulder; with an ik target the hand goes there instead, blended by ikw (0 = FK, 1 = on the target),
      // the elbow still folding the FK way
      const k = armDirs(A, sg); k.d.applyQuaternion(qChest); k.fd.applyQuaternion(qChest); k.pole.applyQuaternion(qChest);
      let elbow = sh.clone().addScaledVector(k.d, LIMB.upper), hand = elbow.clone().addScaledVector(k.fd, LIMB.fore), flex = A.elbow ?? 20;
      const iw = A.ik ? Math.max(0, Math.min(1, A.ikw ?? 1)) : 0;
      if (iw > 0) {
        const r = ik(sh, hand.clone().lerp(V(A.ik), iw), LIMB.upper, A.pole ? V(A.pole) : k.pole, SOFT.arm, true); elbow = r.joint; hand = r.end; flex = r.flex;
      }
      // physics: a hand inside the head or the torso stops on its surface, an elbow inside is pushed out, the elbow
      // stays in its range (bones keep their length)
      const sol = PHYS.on ? solveArm({ sh, elbow, hand, flex, pole: A.pole ? V(A.pole) : k.pole, l: LIMB.upper, vols, limb: LIMB_R / W, handR: 0.05, out: new THREE.Vector3(sg, -0.3, 0.4).applyQuaternion(qChest),
        ik: (a, b, l, p) => ik(a, b, l, p, SOFT.arm, true) })
        : (w => ({ elbow, hand, flex, pen0: w ? w.depth : 0, pen: w ? w.depth : 0, limits: 0 }))(armPenetration(sh, elbow, hand, vols, { limb: LIMB_R / W, handR: 0.05 }));
      elbow = sol.elbow; hand = sol.hand; flex = sol.flex;
      const pts = hose(sh, elbow, hand, ROUND.arm, 16);
      limbs['arm' + side].set(pts); hands[side].position.copy(pts[15]); S.hand[side] = hand.toArray();
      const hipJ = toRoot(new THREE.Vector3(sg * 0.14 * girth, 0.04, 0)), G = Q['leg' + side] || {};
      const foot0 = V(G.foot || [sg * 0.22, 0.022, 0]), kp = V(G.knee || [sg * 0.15, 0, 1]);
      const hdir = new THREE.Vector3(0.10 * sg, 0, 0.07).normalize().applyAxisAngle(_Y, (G.yaw || 0) * DEG), gnd = Q.ground || 0;
      // heel and toe turn about the ankle with the foot's pitch; no part of the sole goes under the ground (a toes-down
      // foot stands on its toes, so the ankle rises). Past the ankle's range the heel lifts instead (second pass).
      let ptc = (G.pitch || 0) * DEG, foot, toeO, heelO, leg, ankleLift = 0;
      for (let pass = 0; pass < 2; pass++) {
        toeO = hdir.clone().multiplyScalar(LIMB.stub * Math.cos(ptc)).setY(LIMB.stub * Math.sin(ptc) - 0.004);
        heelO = hdir.clone().multiplyScalar(-FOOT.heel * Math.cos(ptc)).setY(-FOOT.heel * Math.sin(ptc) - 0.004);
        foot = foot0.clone(); const sole = Math.min(foot.y, foot.y + toeO.y, foot.y + heelO.y) - FOOT_R;
        if (sole < gnd) foot.y += gnd - sole;
        leg = ik(hipJ, foot, LIMB.thigh, kp, SOFT.leg);
        const shin = foot.clone().sub(leg.joint).normalize(), soleD = toeO.clone().sub(heelO).normalize();
        const df = 90 - Math.acos(Math.max(-1, Math.min(1, -shin.dot(soleD)))) / DEG;
        if (!PHYS.rom || df <= ROM.ankleDF[1] + 0.5 || pass) break;
        ptc -= (df - ROM.ankleDF[1]) * DEG; ankleLift = 1;
      }
      // the leg is a solid too (rig B5): a thigh or shin inside the trunk or the head turns its knee out round the
      // hip-foot line (the foot stays planted) by the smallest angle that clears, as knees open in a deep squat
      let legPen0 = 0, legPen = 0;
      {
        const w0 = armPenetration(hipJ, leg.joint, foot, vols, { limb: LIMB_R / W, handR: 0.03 });
        if (w0 && !PHYS.on) legPen0 = legPen = w0.depth;
        else if (w0) { legPen0 = w0.depth; const ax = foot.clone().sub(hipJ).normalize(), out = new THREE.Vector3(sg, 0, 0.3).applyQuaternion(qb);
          let best = null;
          for (let k = 1; k <= 36 && !best; k++) for (const sgn of [1, -1]) {
            const P = kp.clone().applyAxisAngle(ax, sgn * k * 5 * DEG), r = ik(hipJ, foot, LIMB.thigh, P, SOFT.leg);
            if (!armPenetration(hipJ, r.joint, foot, vols, { limb: LIMB_R / W, handR: 0.03 }) && (!best || r.joint.clone().sub(hipJ).dot(out) > best.joint.clone().sub(hipJ).dot(out))) best = r;
            if (best && sgn === -1) break;
          }
          if (best) leg = best; else legPen = w0.depth; }
      }
      rig[side] = { shoulder: sh, elbow, hand, elbowFlex: flex, pen0: sol.pen0, pen: sol.pen, limits: lim.hits + sol.limits + (side === 'L' ? LB.hits : 0) };
      legs[side] = { sg, hipJ, foot, leg, kp, ptc, toeO, heelO, ankleLift, legPen0, legPen };
    }
    // legs never pass through each other: two leg lines closer than two radii turn their knees apart (each away from the
    // other), smallest angle first; crossed feet still cross, but one shin passes in front of the other
    const segD = (p1, q1, p2, q2) => { // closest distance between two segments
      const d1 = q1.clone().sub(p1), d2 = q2.clone().sub(p2), r = p1.clone().sub(p2), a = d1.dot(d1), e = d2.dot(d2), f = d2.dot(r), c = d1.dot(r), b = d1.dot(d2), den = a * e - b * b;
      let s1 = den > 1e-9 ? Math.max(0, Math.min(1, (b * f - c * e) / den)) : 0, t1 = (b * s1 + f) / e;
      if (t1 < 0) { t1 = 0; s1 = Math.max(0, Math.min(1, -c / a)); } else if (t1 > 1) { t1 = 1; s1 = Math.max(0, Math.min(1, (b - c) / a)); }
      return p1.clone().addScaledVector(d1, s1).distanceTo(p2.clone().addScaledVector(d2, t1)); };
    const legGap = () => { const A = legs.L, B = legs.R, lerp = (h, k, t) => h.clone().lerp(k, t);
      const segs = X => [[lerp(X.hipJ, X.leg.joint, 0.35), X.leg.joint], [X.leg.joint, X.foot]];
      let m = Infinity; for (const [p, q] of segs(A)) for (const [r, t] of segs(B)) m = Math.min(m, segD(p, q, r, t)); return m; };
    const minGap = 2 * LIMB_R / W, gap0 = legGap(); let legHit = 0;
    if (gap0 < minGap) legHit = minGap - gap0;
    if (PHYS.on && gap0 < minGap) {
      for (let k = 1; k <= 12 && legGap() < minGap; k++) for (const sd of ['L', 'R']) { const X = legs[sd], ax = X.foot.clone().sub(X.hipJ).normalize();
        const P = X.kp.clone().applyAxisAngle(ax, -X.sg * k * 3 * DEG); X.leg = ik(X.hipJ, X.foot, LIMB.thigh, P, SOFT.leg); }
    }
    for (const [side, sg] of [['L', -1], ['R', 1]]) {
      const { hipJ, foot, leg, ptc, toeO, heelO, ankleLift, legPen0, legPen } = legs[side];
      const lp = hose(hipJ, leg.joint, foot, ROUND.leg, 13);
      const toeL = foot.clone().add(toeO), heelL = foot.clone().add(heelO);
      const toe = toeL.clone().multiplyScalar(W);
      for (let i = 1; i <= 5; i++) lp.push(lp[12].clone().lerp(toe, i / 5));
      limbs['leg' + side].set(lp); ankles[side].position.copy(lp[12]); toes[side].position.copy(toe);
      heelT[side].set(Array.from({ length: 6 }, (_, i) => lp[12].clone().lerp(heelL.clone().multiplyScalar(W), i / 5))); heels[side].position.copy(heelL).multiplyScalar(W);
      // joint angles as a clinician measures them (deg): hip flexion (+ forward) and abduction (+ outward) of the thigh
      // in the pelvis frame, ankle dorsiflexion (+ toes toward the shin) between the shin and the sole
      const th = leg.joint.clone().sub(hipJ).applyQuaternion(qb.clone().invert());
      const hipFlex = Math.atan2(th.z, -th.y) / DEG, hipAbd = Math.atan2(sg * th.x, Math.hypot(th.y, th.z)) / DEG;
      const shin = foot.clone().sub(leg.joint).normalize(), soleD = toeL.clone().sub(heelL).normalize();
      const ankleDF = 90 - Math.acos(Math.max(-1, Math.min(1, -shin.dot(soleD)))) / DEG;
      Object.assign(rig[side], { hip: hipJ, knee: leg.joint, ankle: foot, toe: toeL, heel: heelL, kneeFlex: leg.flex, footPitch: ptc / DEG,
        hipFlex, hipAbd, ankleDF, heelUp: ankleLift, legPen0, legPen, legGap0: side === 'L' ? legHit : 0 });
    }
    // the skeleton in root space (W): pelvis, five points up the spine, the neck base, the head centre, the trunk's
    // centre; and the centre of mass of the whole body
    const neck = toRoot(top.p.clone()), headC = toRoot(top.p.clone().add(hOff)), trunk = toRoot(spineFrame(B, TORSO.cy - HIP_V).p);
    S.skel = { pelvis: hipP.clone(), spine: [0, 0.25, 0.5, 0.75, 1].map(u => toRoot(spineFrame(B, u * SPINE_L).p)), neck, head: headC, trunk };
    S.com = centreOfMass({ head: headC, trunk, L: rig.L, R: rig.R });
    S.chan = { bend: +(Q.spine?.bend || 0).toFixed(1), side: +(Q.spine?.side || 0).toFixed(1), twist: +(Q.spine?.twist || 0).toFixed(1), nod: +(nk.nod || 0).toFixed(1), tilt: +(nk.tilt || 0).toFixed(1), turn: +(nk.turn || 0).toFixed(1) };
    S.rig = rig; S.vols = vols;
    handProps(Q, rig);
    S.xmarks = Object.keys(Q).filter(k => k.startsWith('x_mark_') && Q[k] >= 1).map(k => [k.slice(7), Math.floor(Q[k] - 1)]);
    contact.visible = Q.contact !== false; contact.position.y = 0.004 + (Q.ground || 0) * W;
    root.updateMatrixWorld(true);
    return S;
  };
  // balance (rig B4): a body standing on both feet with its centre of mass outside them moves its hips over its feet,
  // as a person does, feet staying where they are (a pelvis shift moves ~85% of the body's mass with it)
  const pose2raw = S.pose2;
  S.pose2 = (Q = {}) => {
    let r = pose2raw(Q), shift = 0;
    if (PHYS.on && PHYS.balance && !Q.fall) for (let i = 0; i < 4; i++) {
      const b = balanceShift(S.com, ['L', 'R'].map(sd => S.rig[sd]), Q.ground || 0); if (!b) break;
      shift += Math.hypot(b.x, b.z); Q = { ...Q, hip: { ...(Q.hip || {}), x: (Q.hip?.x || 0) + b.x / 0.85, z: (Q.hip?.z || 0) + b.z / 0.85 } }; r = pose2raw(Q);
    }
    S.rig.balanceShift = shift;
    return r;
  };
  // the last pose's joints in Blender world metres (y = depth), flexes and pitches in degrees, for __dbg
  S.rigWorld = () => {
    const w = q => { const v = q.clone().multiplyScalar(W).applyMatrix4(root.matrixWorld); return [v.x, -v.z, v.y].map(x => +x.toFixed(4)); };
    const o = { torsoLean: +S.rig.pitch.toFixed(2), torsoRoll: +S.rig.roll.toFixed(2), assist: S.rig.assist, body: S.rig.body, sq: S.rig.sq ?? 0, headSq: S.rig.headSq ?? 0 };
    for (const s of ['L', 'R']) {
      const r = S.rig[s];
      o[s] = { hip: w(r.hip), knee: w(r.knee), ankle: w(r.ankle), toe: w(r.toe), ...(r.heel ? { heel: w(r.heel) } : {}), shoulder: w(r.shoulder), elbow: w(r.elbow), hand: w(r.hand),
        kneeFlex: +r.kneeFlex.toFixed(2), elbowFlex: +r.elbowFlex.toFixed(2), footPitch: +r.footPitch.toFixed(2),
        ...(r.hipFlex != null ? { hipFlex: +r.hipFlex.toFixed(1), hipAbd: +r.hipAbd.toFixed(1), ankleDF: +r.ankleDF.toFixed(1), legPenCm0: +(r.legPen0 * W * 100).toFixed(2), legPenCm: +(r.legPen * W * 100).toFixed(2), legGapCm: +(r.legGap0 * W * 100).toFixed(2) } : {}),
        ...(r.pen0 != null ? { penCm0: +(r.pen0 * W * 100).toFixed(2), penCm: +(r.pen * W * 100).toFixed(2), limits: r.limits } : {}) };
    }
    if (S.chan) o.chan = S.chan;
    if (S.rig.balanceShift != null) o.balanceCm = +(S.rig.balanceShift * W * 100).toFixed(2);
    if (S.com) { o.com = w(S.com); o.skel = { pelvis: w(S.skel.pelvis), neck: w(S.skel.neck), head: w(S.skel.head), spine: S.skel.spine.map(w) }; }
    return o;
  };
  S.pose({});
  return S;
}

// ------------------------------------------------------------------ our cast
export const KAI = { name: 'Kai', shirt: [1, 1, 1], glasses: true, hair: [curls([0.42, 0.20, 0.08]), bandana()],
  clothes: [{ vest: [0.95, 0.30, 0.06], strap: [0.08, 0.50, 0.22] }] };
export const TELLER = { name: 'Teller', shirt: [1, 1, 1], hair: [hairCap([0.30, 0.17, 0.09]), visor([0.06, 0.45, 0.24])],
  clothes: [{ vest: [0.07, 0.38, 0.26] }, { bowtie: [0.80, 0.06, 0.08] }] };
export const GUARD = { name: 'Guard', shirt: [0.14, 0.21, 0.46], hair: [guardCap()], clothes: [{ uniform: {} }] };
