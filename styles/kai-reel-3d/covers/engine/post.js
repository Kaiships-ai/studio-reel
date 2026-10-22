// post.js (6-opus-wow copy of 5-kai-3d/src/v2/post.js): normal pass swaps in per-mesh bend-aware normal materials
// (mesh.userData.nMat) instead of one override material; adds chromatic aberration + radial zoom blur for impacts.
// Original header: screen-space finishing. Beauty (with hull outlines) + a normal/depth pass → interior ink lines (depth and
// normal discontinuities, varied width, noise-broken), MV-style grade (warm lift, cool shadows), soft bloom on the
// brights, paper grain, vignette. Optional in-page motion-blur accumulation (N sub-frames → 1 frame).
import * as THREE from 'three';
import { U, LAYER_OUTLINE, normalMat } from './look.js';

export const LAYER_NOEDGE = 2;   // in beauty, not in the normal pass (lenses, sky, fx)

const QUAD_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;

const COMP_F = /* glsl */`
uniform sampler2D tColor, tDepth, tNormal, tBloom; uniform vec2 uRes; uniform float uNear, uFar, uBoil, uLine, uGrain, uVig, uBloom, uEdge;
uniform float uFocus, uAperture;
uniform vec3 uInk, uLift, uGain, uSplitS, uSplitH; uniform float uSat, uTime, uCA, uZoom, uContrast, uExpo; uniform vec2 uZoomC;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f*f*(3.-2.*f);
  return mix(mix(h21(i), h21(i+vec2(1,0)), f.x), mix(h21(i+vec2(0,1)), h21(i+vec2(1,1)), f.x), f.y); }
float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
vec3 nrm(vec2 uv){ return texture2D(tNormal, uv).xyz * 2. - 1.; }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  // cheap depth of field: 16-tap golden-angle disc, radius = circle of confusion from the linear depth
  float coc = 0.0;
  if (uAperture > 0.0) {
    float dz = lin(texture2D(tDepth, vUv).r);
    coc = clamp(abs(dz - uFocus) / max(dz, 1e-3) * uAperture, 0.0, 1.0);
    if (coc > 0.02) {
      vec3 acc = col; float wsum = 1.0; float rad = coc * 14.0;
      for (int i = 1; i < 24; i++) { float fi = float(i); float r = sqrt(fi / 24.0) * rad; float a = fi * 2.39996;
        vec2 o = vec2(cos(a), sin(a)) * r / uRes; acc += texture2D(tColor, vUv + o).rgb; wsum += 1.0; }
      col = acc / wsum;
    }
  }
  if (uZoom > 0.0) {            // radial zoom blur toward uZoomC
    vec3 acc = col; vec2 d = (vUv - uZoomC) * uZoom / 12.0;
    for (int i = 1; i < 12; i++) acc += texture2D(tColor, vUv - d * float(i)).rgb;
    col = acc / 12.0;
  }
  if (uCA > 0.0) {              // chromatic aberration, radial
    vec2 d = (vUv - 0.5) * uCA;
    col.r = texture2D(tColor, vUv + d).r; col.b = texture2D(tColor, vUv - d).b;
  }
  // varied-width ink: sample radius modulated by low-freq screen noise (boiled at 12 fps)
  float wn = vn(vUv * uRes / 38. + uBoil * 7.1);
  float r = uLine * (0.55 + 0.9 * wn);
  vec2 px = r / uRes;
  float d0 = lin(texture2D(tDepth, vUv).r); vec3 n0 = nrm(vUv);
  float de = 0., ne = 0.;
  for (int i = 0; i < 4; i++) {
    vec2 o = i == 0 ? vec2(px.x, 0) : i == 1 ? vec2(-px.x, 0) : i == 2 ? vec2(0, px.y) : vec2(0, -px.y);
    float d1 = lin(texture2D(tDepth, vUv + o).r);
    de = max(de, (d1 - d0) / d0);           // only the far side of a depth step draws (line sits on the near object's edge)
    vec3 n1 = nrm(vUv + o);
    ne = max(ne, 1. - dot(n0, n1));
  }
  float bg = step(0.9999, texture2D(tDepth, vUv).r);
  float e = max(smoothstep(0.035, 0.07, de), smoothstep(0.32, 0.55, ne) * (1. - bg));
  e *= smoothstep(0.15, 0.45, vn(vUv * uRes / 20. + uBoil * 3.3) + 0.38);  // occasional brush breaks
  col = mix(col, uInk, e * uEdge * (1.0 - smoothstep(0.05, 0.35, coc)));
  // bloom
  col += texture2D(tBloom, vUv).rgb * uBloom;
  // grade: lift shadows toward violet, warm gain, saturation
  float l = dot(col, vec3(.299, .587, .114));
  col = mix(vec3(l), col, uSat);
  col = col * uGain + uLift * (1. - col);
  // perceptual S-curve + split toning (cool shadows, warm highlights)
  vec3 pc = pow(max(col * uExpo, 0.), vec3(1. / 2.2));
  pc = mix(pc, pc * pc * (3. - 2. * clamp(pc, 0., 1.)), uContrast);
  float pl = dot(pc, vec3(.3, .6, .1));
  pc += uSplitS * (1. - pl) + uSplitH * pl;
  col = pow(max(pc, 0.), vec3(2.2));
  // vignette + grain
  vec2 q = vUv - .5; col *= 1. - uVig * dot(q, q) * 1.6;
  float g = h21(vUv * uRes + fract(uTime * 13.7) * 97.) - .5;
  col += g * uGrain;
  gl_FragColor = vec4(col, 1.);
}`;

const BRIGHT_F = `uniform sampler2D t; uniform float uTh; varying vec2 vUv;
void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, 1.0, l), 1.); }`;
const BLUR_F = `uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = vec3(0.); float w[5]; w[0]=.227; w[1]=.194; w[2]=.121; w[3]=.054; w[4]=.016;
  c += texture2D(t, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) { c += texture2D(t, vUv + uDir * float(i)).rgb * w[i]; c += texture2D(t, vUv - uDir * float(i)).rgb * w[i]; }
  gl_FragColor = vec4(c, 1.); }`;
const ACC_F = `uniform sampler2D t; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * uW, 1.); }`;
const COPY_F = `uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb, 1.);
#include <colorspace_fragment>
}`;

export class Post {
  constructor(renderer, w, h) {
    this.r = renderer; this.w = w; this.h = h;
    const lin = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace };
    this.beauty = new THREE.WebGLRenderTarget(w, h, { ...lin, samples: 4 });
    this.beauty.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
    this.normal = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 0 });
    this.normal.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
    this.comp = new THREE.WebGLRenderTarget(w, h, lin);
    this.acc = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType });
    const bw = w >> 2, bh = h >> 2;
    this.b1 = new THREE.WebGLRenderTarget(bw, bh, lin); this.b2 = new THREE.WebGLRenderTarget(bw, bh, lin);
    this.nBend = normalMat(true); this.nRigid = normalMat(false); this.nBend2 = normalMat(true, THREE.DoubleSide); this.nRigid2 = normalMat(false, THREE.DoubleSide);
    this.swap = [];
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.qs = new THREE.Scene(); this.qs.add(this.quad);
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mk = (f, u) => new THREE.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: f, uniforms: u, depthTest: false, depthWrite: false });
    this.compMat = mk(COMP_F, {
      tColor: { value: this.beauty.texture }, tDepth: { value: this.normal.depthTexture }, tNormal: { value: this.normal.texture }, tBloom: { value: this.b2.texture },
      uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 0.05 }, uFar: { value: 100 }, uBoil: U.uBoil, uLine: { value: 1.4 * h / 1920 * 2 },
      uGrain: { value: 0.035 }, uVig: { value: 0.35 }, uBloom: { value: 0.55 }, uEdge: { value: 0.9 },
      uInk: U.uInk, uLift: { value: new THREE.Color(0.014, 0.011, 0.012) }, uGain: { value: new THREE.Color(1.02, 1.0, 0.97) }, uSat: { value: 1.12 }, uFocus: { value: 2.0 }, uAperture: { value: 0 }, uTime: { value: 0 }, uContrast: { value: 0.35 }, uExpo: { value: 1.0 }, uSplitS: { value: new THREE.Vector3(-0.012, 0.0, 0.03) }, uSplitH: { value: new THREE.Vector3(0.03, 0.012, -0.02) }, uCA: { value: 0 }, uZoom: { value: 0 }, uZoomC: { value: new THREE.Vector2(0.5, 0.5) },
    });
    this.brightMat = mk(BRIGHT_F, { t: { value: this.beauty.texture }, uTh: { value: 0.72 } });
    this.blurMat = mk(BLUR_F, { t: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.accMat = mk(ACC_F, { t: { value: this.comp.texture }, uW: { value: 1 } });
    this.accMat.blending = THREE.AdditiveBlending; this.accMat.transparent = true;
    this.copyMat = mk(COPY_F, { t: { value: null } });
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
  // render one image of the scene into this.comp (linear)
  render(scene, camera, t = 0) {
    const r = this.r;
    this.compMat.uniforms.uNear.value = camera.near; this.compMat.uniforms.uFar.value = camera.far; this.compMat.uniforms.uTime.value = t;
    const mask = camera.layers.mask;
    camera.layers.enable(0); camera.layers.enable(LAYER_OUTLINE); camera.layers.enable(LAYER_NOEDGE);
    r.setRenderTarget(this.beauty); r.clear(); r.render(scene, camera);
    camera.layers.set(0);
    const bg = scene.background; scene.background = null;
    const sw = this.swap; sw.length = 0;
    scene.traverseVisible(o => {
      if (!(o.isMesh || o.isSkinnedMesh || o.isInstancedMesh) || !o.layers.test(camera.layers)) return;
      const m = o.material, bend = o.userData.bend ?? !!(m.uniforms && m.uniforms.uBendOn && m.uniforms.uBendOn.value > 0.5);
      const ds = m.side === THREE.DoubleSide;
      sw.push(o, m); o.material = o.userData.nMat || (bend ? (ds ? this.nBend2 : this.nBend) : (ds ? this.nRigid2 : this.nRigid));
    });
    r.setClearColor(0x8080ff, 1); r.setRenderTarget(this.normal); r.clear(); r.render(scene, camera); r.setClearColor(0x000000, 1);
    for (let i = 0; i < sw.length; i += 2) sw[i].material = sw[i + 1];
    scene.background = bg; camera.layers.mask = mask;
    this.pass(this.brightMat, this.b1);
    const bu = this.blurMat.uniforms;
    for (let i = 0; i < 2; i++) {
      bu.t.value = this.b1.texture; bu.uDir.value.set(1.6 / this.b1.width, 0); this.pass(this.blurMat, this.b2);
      bu.t.value = this.b2.texture; bu.uDir.value.set(0, 1.6 / this.b1.height); this.pass(this.blurMat, this.b1);
    }
    bu.t.value = this.b1.texture; bu.uDir.value.set(1.0 / this.b1.width, 0); this.pass(this.blurMat, this.b2);
    this.pass(this.compMat, this.comp);
  }
  // motion blur: frame(tFn, n) calls tFn(sub-time) n times and averages
  frame(scene, camera, prep, t0, shutter, n) {
    if (n <= 1) { prep(t0); this.render(scene, camera, t0); this.copyMat.uniforms.t.value = this.comp.texture; this.pass(this.copyMat, null); return; }
    this.r.setRenderTarget(this.acc); this.r.setClearColor(0, 1); this.r.clear();
    for (let i = 0; i < n; i++) {
      const t = t0 + (i / n) * shutter; prep(t); this.render(scene, camera, t);
      this.accMat.uniforms.uW.value = 1 / n; this.r.autoClear = false; this.pass(this.accMat, this.acc); this.r.autoClear = true;
    }
    this.copyMat.uniforms.t.value = this.acc.texture; this.pass(this.copyMat, null);
  }
}
