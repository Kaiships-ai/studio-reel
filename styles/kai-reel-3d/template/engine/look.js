// look.js: the FOLD look (night). Built from 5-kai-3d/src/v2/ink.js (toon + hatching + varied hull outline + own
// shadow map), extended for the bend: every vertex is authored in flat space; world geometry is bent in the shader
// (uBendOn = 1), rigid characters are placed by JS and carry uToFlat (world → flat) instead. Lighting, shadows and
// hatching live in FLAT space (so the city stays lit like a city while it rolls over your head); rim light and fog
// live in world/view space. Night rig: cool moon key + up to NL toon-banded point lamps (shop light, sodium lamps,
// lanterns, neon) defined in flat space.
import * as THREE from 'three';
import { B, BEND_GLSL } from './bend.js';

export const INK = new THREE.Color('#120c1c');
export const LAYER_OUTLINE = 1;
export const NL = 40;

export const U = {
  uKeyDir: { value: new THREE.Vector3(0.35, 0.85, 0.4).normalize() },
  uKeyCol: { value: new THREE.Color('#7c88c0') },
  uKeyAmt: { value: 1.0 },
  uShadeTint: { value: new THREE.Color('#33357a') },
  uShadeAmt: { value: 0.72 },
  uRimDir: { value: new THREE.Vector3(0.2, 0.4, -0.9).normalize() },
  uRimCol: { value: new THREE.Color('#7fd6ff') },
  uRimAmt: { value: 0.6 },
  uInk: { value: INK.clone() },
  uBoil: { value: 0 },
  uHatch: { value: 1.0 },
  uRes: { value: new THREE.Vector2(1080, 1920) },
  uShadowMap: { value: null },
  uShadowMat: { value: new THREE.Matrix4() },
  uShadowOn: { value: 0 },
  uShadowTexel: { value: 1 / 2048 },
  uOutlinePx: { value: 2.2 },
  uOutlineRef: { value: 3.0 },
  uCamPos: { value: new THREE.Vector3() },
  uFog: { value: new THREE.Color('#232a62') },
  uFogAmt: { value: 0.7 },
  uFogNear: { value: 40 },
  uFogFar: { value: 260 },
  uLampP: { value: Array.from({ length: NL }, () => new THREE.Vector4(0, -999, 0, 1)) },
  uLampC: { value: Array.from({ length: NL }, () => new THREE.Color(0, 0, 0)) },
  uLampAmt: { value: 1.0 },
  uTime: { value: 0 },
  uShopTex: { value: null },                       // 1D strip per street side: shop-front light colour along x
  uShopRange: { value: new THREE.Vector3(-100, 300, 7) },   // x0, length, front-plane |z|
  uShopAmt: { value: 1.0 },
  ...B,
};

export const NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float h31(vec3 p){ p = fract(p * 0.3183099 + .1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z); }
`;

// shared lighting helpers (flat space)
export const LIGHT_GLSL = /* glsl */`
uniform vec3 uKeyDir, uKeyCol, uShadeTint, uRimDir, uRimCol, uInk, uCamPos, uFog;
uniform float uKeyAmt, uShadeAmt, uRimAmt, uBoil, uHatch, uShadowOn, uShadowTexel, uFogAmt, uFogNear, uFogFar, uLampAmt, uTime;
uniform sampler2D uShadowMap; uniform mat4 uShadowMat; uniform vec2 uRes;
uniform vec4 uLampP[${NL}]; uniform vec3 uLampC[${NL}];
uniform sampler2D uShopTex; uniform vec3 uShopRange; uniform float uShopAmt;
// light spilling out of the open shop fronts on both sides (flat space), toon-banded
vec3 shopLight(vec3 F, vec3 NF){
  if (uShopAmt <= 0.0) return vec3(0.);
  float u = (F.x - uShopRange.x) / uShopRange.y;
  vec3 acc = vec3(0.);
  for (int k = 0; k < 2; k++) {
    float side = k == 0 ? -1.0 : 1.0;
    vec3 c = texture2D(uShopTex, vec2(u, k == 0 ? 0.25 : 0.75)).rgb;
    float dz = uShopRange.z - side * F.z;                  // metres in front of that side's shop fronts
    if (dz < -0.3) continue;
    float fall = exp(-max(dz, 0.0) / 2.6) * smoothstep(5.5, 0.5, F.y);
    float face = max(smoothstep(-0.15, 0.35, dot(NF, vec3(0.0, 0.25, -side))), NF.y * 0.85);
    float band = smoothstep(0.16, 0.22, fall) * 0.45 + smoothstep(0.5, 0.56, fall) * 0.55;
    acc += c * band * face;
  }
  return acc * uShopAmt;
}
float shadowAt(vec3 w, float ndl){
  if (uShadowOn < .5) return 1.0;
  vec4 s = uShadowMat * vec4(w, 1.0); s.xyz /= s.w; s.xyz = s.xyz * .5 + .5;
  if (s.x < 0. || s.x > 1. || s.y < 0. || s.y > 1. || s.z > 1.) return 1.0;
  float bias = 0.0012 + 0.003 * (1.0 - clamp(ndl, 0., 1.));
  float acc = 0.;
  for (int i = -1; i <= 1; i++) for (int j = -1; j <= 1; j++) {
    float d = texture2D(uShadowMap, s.xy + vec2(i, j) * uShadowTexel * 1.2).r;
    acc += s.z - bias > d ? 0. : 1.;
  }
  return acc / 9.;
}
// toon-banded point lamps: two hard bands (pool + core), coloured
vec3 lamps(vec3 F, vec3 NF){
  vec3 acc = vec3(0.);
  for (int i = 0; i < ${NL}; i++) {
    vec4 L = uLampP[i]; vec3 d = L.xyz - F; float dist = length(d);
    if (dist > L.w) continue;
    float a = 1.0 - dist / L.w;
    float dif = dot(NF, d / max(dist, 1e-4));
    float face = smoothstep(-0.05, 0.12, dif);
    float band = smoothstep(0.05, 0.45, a) * 0.45 + smoothstep(0.5, 0.56, a) * 0.55;
    acc += uLampC[i] * band * face;
  }
  return acc * uLampAmt;
}
`;

const VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
${BEND_GLSL}
uniform float uBendOn; uniform mat4 uToFlat;
varying vec3 vN; varying vec3 vNF; varying vec3 vW; varying vec3 vF; varying vec2 vUv2; varying vec3 vObj;
#ifdef USE_FACEUV
attribute vec2 faceUv;
#endif
void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vec3 n = normalize(mat3(modelMatrix) * objectNormal);
  vObj = position;
  if (uBendOn > 0.5) {
    float th; vec3 b = bendP(wp.xyz, th);
    vF = wp.xyz; vNF = n; vW = b; vN = rotZ(n, th); wp.xyz = b;
  } else {
    vW = wp.xyz; vN = n; vF = (uToFlat * wp).xyz; vNF = normalize(mat3(uToFlat) * n);
  }
  #ifdef USE_FACEUV
  vUv2 = faceUv;
  #else
  vUv2 = vec2(0.0);
  #endif
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const FRAG = /* glsl */`
uniform vec3 uBase, uHi, uTint, uEmit; uniform float uUseTint, uHiAmt, uHatchAmt, uWobble, uShadeK, uRecv, uEmitAmt, uLampK, uGhostW, uGhostSp;
#ifdef USE_MAP
uniform sampler2D map;
#endif
varying vec3 vN; varying vec3 vNF; varying vec3 vW; varying vec3 vF; varying vec2 vUv2; varying vec3 vObj;
${NOISE}
${LIGHT_GLSL}
void main(){
  #ifdef GHOST
  {   // chalk ghost: screen-space hatch strokes only, boiled, the rest is air
    vec2 fc = gl_FragCoord.xy / uRes.y * 1080.0;
    float ang = 0.85 + h21(vec2(uBoil, 7.7)) * 0.1;
    vec2 r = vec2(cos(ang) * fc.x - sin(ang) * fc.y, sin(ang) * fc.x + cos(ang) * fc.y);
    float line = abs(fract(r.x / uGhostSp + vn3(vec3(r * .015, uBoil)) * .5) - .5);
    if (line > uGhostW) discard;
    gl_FragColor = vec4(uBase, 1.0);
    #include <colorspace_fragment>
    return;
  }
  #endif
  vec3 N = normalize(vN), NF = normalize(vNF); if (!gl_FrontFacing) { N = -N; NF = -NF; }
  vec3 V = normalize(uCamPos - vW);
  vec3 base = uBase;
  #ifdef USE_MAP
  vec4 fm = texture2D(map, vUv2);
  base = mix(base, fm.rgb, fm.a);
  #endif
  vec3 tint = mix(uShadeTint, uTint, uUseTint);
  vec3 shade = mix(base, base * tint * 1.1, uShadeAmt) * uShadeK;
  float ndl = dot(NF, normalize(uKeyDir));
  float wob = (vn3(vObj * 9.0) - .5) * uWobble;
  float sh = shadowAt(vF, ndl);
  float lit = smoothstep(-0.02, 0.06, ndl + wob) * mix(1.0, smoothstep(0.35, 0.65, sh), uRecv);
  vec3 col = mix(shade, mix(shade, base, uKeyAmt), lit);
  float hi = smoothstep(0.78, 0.84, ndl + wob * .5) * lit;
  col = mix(col, uHi, hi * uHiAmt * uKeyAmt);
  col *= mix(vec3(1.0), uKeyCol, lit);
  col += base * (lamps(vF, NF) + shopLight(vF, NF)) * uLampK;
  float fr = pow(1.0 - clamp(dot(N, V), 0., 1.), 3.0);
  float rimFace = clamp(dot(N, normalize(uRimDir)) * .5 + .5, 0., 1.);
  col += uRimCol * smoothstep(0.30, 0.42, fr * rimFace) * uRimAmt;
  float core = (1.0 - lit) * smoothstep(0.05, -0.35, ndl);
  if (uHatchAmt * uHatch > 0.0 && core > 0.01) {
    vec2 fc = gl_FragCoord.xy / uRes.y * 900.0;
    float ang = 0.9 + h21(vec2(uBoil, 3.1)) * 0.15;
    vec2 r = vec2(cos(ang) * fc.x - sin(ang) * fc.y, sin(ang) * fc.x + cos(ang) * fc.y);
    float line = abs(fract(r.x / 7.0 + vn3(vec3(r * .02, uBoil)) * .6) - .5);
    float mask = smoothstep(.45, .7, vn3(vObj * 14.0 + vec3(uBoil * 1.7)));
    float stroke = smoothstep(.12, .04, line) * mask * smoothstep(.15, .5, core);
    col = mix(col, uInk, stroke * .5 * uHatchAmt * uHatch);
  }
  col += uEmit * uEmitAmt;
  float fd = length(uCamPos - vW);
  col = mix(col, uFog, uFogAmt * smoothstep(uFogNear, uFogFar, fd));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const OL_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
${BEND_GLSL}
uniform float uBendOn; uniform mat4 uToFlat;
uniform float uOutlinePx, uOutlineRef, uWidth, uBoil; uniform vec2 uRes; uniform vec3 uKeyDir, uCamPos;
${NOISE}
void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  vec4 wp = modelMatrix * vec4(transformed, 1.0);
  vec3 wn = normalize(mat3(modelMatrix) * objectNormal);
  vec3 nf = wn;
  if (uBendOn > 0.5) { float th; wp.xyz = bendP(wp.xyz, th); wn = rotZ(wn, th); }
  else nf = normalize(mat3(uToFlat) * wn);
  vec4 cp = projectionMatrix * viewMatrix * wp;
  vec3 cn = mat3(projectionMatrix) * (mat3(viewMatrix) * wn);
  float n = vn3(position * 7.0 + vec3(uBoil * 0.37));
  float shadow = 1.0 - smoothstep(-0.3, 0.4, dot(nf, normalize(uKeyDir)));
  float dist = length(uCamPos - wp.xyz);
  float w = uOutlinePx * uWidth * (0.55 + 0.9 * n) * (0.8 + 0.6 * shadow) * clamp(uOutlineRef / dist, 0.35, 1.6);
  vec2 dir = normalize(cn.xy + 1e-6);
  cp.xy += dir * w * 2.0 / uRes * cp.w;
  cp.z += 0.00002 * cp.w;
  gl_Position = cp;
}`;
const OL_FRAG = /* glsl */`uniform vec3 uInk; uniform vec3 uOlCol; uniform float uOlMix; void main(){ gl_FragColor = vec4(mix(uInk, uOlCol, uOlMix), 1.0);
#include <colorspace_fragment>
}`;

// per-material uniforms that must NOT be shared
const own = (o = {}) => ({ uBendOn: { value: o.bend ? 1 : 0 }, uToFlat: { value: o.toFlat || new THREE.Matrix4() } });

export function toonMat(color, o = {}) {
  const base = new THREE.Color(color);
  const hi = o.hi ? new THREE.Color(o.hi) : base.clone().lerp(new THREE.Color('#ffffff'), 0.25);
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...U, ...own(o),
      uBase: { value: base }, uHi: { value: hi }, uHiAmt: { value: o.hiAmt ?? 0.3 },
      uHatchAmt: { value: o.hatch ?? 1 }, uWobble: { value: o.wobble ?? 0.12 },
      uShadeK: { value: o.shadeK ?? 1 }, uTint: { value: new THREE.Color(o.tint || '#ffffff') }, uRecv: { value: o.recv ?? 1 }, uUseTint: { value: o.tint ? 1 : 0 },
      uEmit: { value: new THREE.Color(o.emit || '#000000') }, uEmitAmt: { value: o.emitAmt ?? (o.emit ? 1 : 0) }, uLampK: { value: o.lampK ?? 1 },
      map: { value: o.map || null }, uGhostW: { value: o.ghostW ?? 0.2 }, uGhostSp: { value: o.ghostSp ?? 6.0 },
    },
    vertexShader: VERT, fragmentShader: FRAG, side: o.side ?? THREE.FrontSide,
  });
  m.defines = {};
  if (o.ghost) m.defines.GHOST = '';
  if (o.map) m.defines.USE_MAP = '';
  if (o.faceUv) m.defines.USE_FACEUV = '';
  return m;
}

export function outlineMat(width = 1, o = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { ...U, ...own(o), uWidth: { value: width }, uOlCol: { value: new THREE.Color(o.col || '#000') }, uOlMix: { value: o.colMix ?? 0 } },
    vertexShader: OL_VERT, fragmentShader: OL_FRAG, side: THREE.BackSide,
  });
}

// hull outline for any mesh (skinned or not). Shares the owner's uToFlat/uBendOn objects so one update drives both.
export function addOutline(mesh, width = 1, o = {}) {
  const om = outlineMat(width, o);
  const mu = mesh.material.uniforms;
  if (mu?.uToFlat) { om.uniforms.uToFlat = mu.uToFlat; om.uniforms.uBendOn = mu.uBendOn; }
  let h;
  if (mesh.isSkinnedMesh) { h = new THREE.SkinnedMesh(mesh.geometry, om); h.bind(mesh.skeleton, mesh.bindMatrix); h.bindMode = mesh.bindMode; }
  else h = new THREE.Mesh(mesh.geometry, om);
  h.layers.set(LAYER_OUTLINE); h.userData.outline = true; h.frustumCulled = false; h.castShadow = false;
  if (mesh.isSkinnedMesh) { mesh.parent && mesh.parent.add(h); h.position.copy(mesh.position); h.quaternion.copy(mesh.quaternion); h.scale.copy(mesh.scale); }
  else mesh.add(h);
  mesh.userData.hull = h;
  return h;
}

// ---------------------------------------------------------------- normal-pass material that honours the bend
const NRM_VERT = /* glsl */`
#include <common>
#include <skinning_pars_vertex>
${BEND_GLSL}
uniform float uBendOn;
varying vec3 vNv;
void main(){
  #include <skinbase_vertex>
  #include <begin_vertex>
  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <skinning_vertex>
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(transformed, 1.0);
  vec3 wn = normalize(mat3(m) * objectNormal);
  if (uBendOn > 0.5) { float th; wp.xyz = bendP(wp.xyz, th); wn = rotZ(wn, th); }
  vNv = normalize(mat3(viewMatrix) * wn);
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const NRM_FRAG = `varying vec3 vNv; void main(){ vec3 n = normalize(vNv); if (!gl_FrontFacing) n = -n; gl_FragColor = vec4(n * .5 + .5, 1.); }`;
export function normalMat(bend, side = THREE.FrontSide) {
  return new THREE.ShaderMaterial({ uniforms: { ...B, uBendOn: { value: bend ? 1 : 0 } }, vertexShader: NRM_VERT, fragmentShader: NRM_FRAG, side });
}

// ---------------------------------------------------------------- flat-space shadow map
// Rendered with a plain override material: the world is unbent in this pass; characters are moved to their flat
// frames by the caller around update() (see fold.js), so every shadow lookup happens in flat space.
export class Shadow {
  constructor(renderer, size = 2048) {
    this.r = renderer;
    this.rt = new THREE.WebGLRenderTarget(size, size, { depthBuffer: true });
    this.rt.depthTexture = new THREE.DepthTexture(size, size, THREE.FloatType);
    this.cam = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 60);
    this.mat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide });
    U.uShadowMap.value = this.rt.depthTexture; U.uShadowTexel.value = 1 / size;
  }
  update(scene, center, dir, half = 3, dist = 20) {
    const c = this.cam; c.left = -half; c.right = half; c.top = half; c.bottom = -half; c.near = 0.1; c.far = dist * 2;
    c.position.copy(center).addScaledVector(dir.clone().normalize(), dist); c.up.set(0, 1, 0);
    if (Math.abs(dir.y) > 0.98) c.up.set(0, 0, 1);
    c.lookAt(center); c.updateProjectionMatrix(); c.updateMatrixWorld();
    c.layers.set(0);
    const ov = scene.overrideMaterial, bg = scene.background; scene.overrideMaterial = this.mat; scene.background = null;
    this.r.setRenderTarget(this.rt); this.r.clear(); this.r.render(scene, c); this.r.setRenderTarget(null);
    scene.overrideMaterial = ov; scene.background = bg;
    U.uShadowMat.value.multiplyMatrices(c.projectionMatrix, c.matrixWorldInverse);
    U.uShadowOn.value = 1;
  }
}
