// stage.js (TMV v3: + PAPER print mode: the 3D frame re-inked as a pale print on cream, for explanations laid over the scene)
// (ep01 v2): r01-saas's renderer (PBR → HDR target with MSAA + depth → bloom → comp: DOF, ACES, grade, vignette, grain)
// plus what this episode needs: per-shot grade (lift/gain/sat/contrast/split-tone), chromatic aberration + VHS (rewind),
// a colour flash for hits, and sub-frame motion blur. 2D overlay canvas (#fx) on top for HUD, captions, titles.
// Contract with render/shot.mjs + render/sheet.mjs: window.__frame(t, sub, shutter, fps), window.__T_END.
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = (x) => x * x * (3 - 2 * x);
export const sio = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
export const eout = (x) => 1 - Math.pow(1 - x, 3);
export const lerp = THREE.MathUtils.lerp;
export const hsh = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

const QUAD_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const BRIGHT_F = `uniform sampler2D t; uniform float uTh; varying vec2 vUv;
void main(){ vec3 c = texture2D(t, vUv).rgb; float l = max(c.r, max(c.g, c.b)); gl_FragColor = vec4(c * smoothstep(uTh, uTh * 2.5, l), 1.); }`;
const BLUR_F = `uniform sampler2D t; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = vec3(0.); float w[5]; w[0]=.227; w[1]=.194; w[2]=.121; w[3]=.054; w[4]=.016;
  c += texture2D(t, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) { c += texture2D(t, vUv + uDir * float(i)).rgb * w[i]; c += texture2D(t, vUv - uDir * float(i)).rgb * w[i]; }
  gl_FragColor = vec4(c, 1.); }`;
const COMP_F = /* glsl */`
uniform sampler2D tColor, tDepth, tBloom; uniform vec2 uRes; uniform float uNear, uFar, uFocus, uAperture, uMaxR;
uniform float uBloom, uExpo, uVig, uGrain, uTime, uSat, uContrast, uChroma, uVHS, uFlash, uPaper, uPaperEdge; uniform vec3 uLift, uGain, uShadowTint, uHiTint, uFlashCol, uPaperShade, uPaperCream, uPaperInk;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float cocAt(vec2 uv){ float dz = lin(texture2D(tDepth, uv).r); return clamp(abs(dz - uFocus) / max(dz, 1e-3) * uAperture, 0.0, 1.0); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 sampleCol(vec2 uv){
  if (uChroma <= 0.0) return texture2D(tColor, uv).rgb;
  vec2 d = (uv - .5) * uChroma;
  return vec3(texture2D(tColor, uv + d).r, texture2D(tColor, uv).g, texture2D(tColor, uv - d).b);
}
void main(){
  vec2 uv = vUv;
  if (uVHS > 0.0) {                 // tape: per-line wobble, a rolling tracking band that tears sideways
    float band = smoothstep(0.035, 0.0, abs(fract(uv.y * 1.0 - uTime * 1.7) - 0.5) - 0.02);
    uv.x += (sin(uv.y * 900. + uTime * 60.) * 0.0008 + (h21(vec2(floor(uv.y * 240.), floor(uTime * 30.))) - .5) * 0.004) * uVHS + band * 0.035 * uVHS;
  }
  vec3 col = sampleCol(uv);
  float coc = uAperture > 0.0 ? cocAt(uv) : 0.0;
  if (coc > 0.01) {                 // gather disc: 64 golden-angle taps, bright taps weigh more (bokeh)
    float rad = coc * uMaxR, rot = h21(uv * uRes) * 6.2832; vec3 acc = vec3(0.); float ws = 0.;
    for (int i = 0; i < 64; i++) { float fi = float(i) + 0.5; float r = sqrt(fi / 64.0) * rad; float a = fi * 2.39996 + rot;
      vec2 u2 = uv + vec2(cos(a), sin(a)) * r / uRes; vec3 c = texture2D(tColor, u2).rgb;
      float cn = cocAt(u2); float w = (cn * uMaxR >= r * 0.8 || cn >= coc * 0.7 ? 1.0 : 0.15) * (1.0 + 3.0 * smoothstep(0.8, 4.0, max(c.r, max(c.g, c.b))));
      acc += c * w; ws += w; }
    col = mix(col, acc / ws, smoothstep(0.01, 0.06, coc));
  }
  col += texture2D(tBloom, uv).rgb * uBloom;
  col = aces(col * uExpo);
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, uSat);
  col = col * uGain + uLift * (1. - col);
  col *= mix(uShadowTint, uHiTint, smoothstep(0.05, 0.7, l));          // split tone: shadows → one hue, highlights → another
  col = mix(col, col * col * (3. - 2. * col), uContrast);
  vec2 q = uv - .5; col *= 1. - uVig * dot(q, q) * 1.8;
  col = mix(col, uFlashCol, uFlash);
  if (uPaper > 0.0) {               // paper print: tone → shade..cream, depth + light edges → ink lines
    float lp = dot(col, vec3(.2126, .7152, .0722));
    vec2 px = 1.6 / uRes; float d0 = lin(texture2D(tDepth, uv).r), e = 0., le = 0.;
    float L0 = log(dot(texture2D(tColor, uv).rgb, vec3(.2126, .7152, .0722)) + 0.03);
    for (int i = 0; i < 4; i++) {
      vec2 o = (i == 0 ? vec2(1., 0.) : i == 1 ? vec2(-1., 0.) : i == 2 ? vec2(0., 1.) : vec2(0., -1.)) * px;
      float d = lin(texture2D(tDepth, uv + o).r); e += abs(d - d0) / max(d0, 1e-3);
      le += abs(log(dot(texture2D(tColor, uv + o).rgb, vec3(.2126, .7152, .0722)) + 0.03) - L0);
    }
    float edge = clamp(smoothstep(0.02, 0.12, e) * 0.85 + smoothstep(0.5, 1.6, le) * 0.5, 0., 0.9) * uPaperEdge;
    vec3 pc = mix(uPaperShade, uPaperCream, smoothstep(0.02, 0.45, pow(max(lp, 0.), 0.8)));
    col = mix(col, mix(pc, uPaperInk, edge), uPaper);
  }
  if (uVHS > 0.0) { col *= 1. - uVHS * 0.18 * step(0.5, fract(gl_FragCoord.y * 0.5)); col += uVHS * 0.05 * (h21(uv * uRes + uTime) - .5); }
  col = toSRGB(clamp(col, 0., 1.));
  col += (h21(vUv * uRes + fract(uTime * 13.7) * 97.) - .5) * uGrain;
  gl_FragColor = vec4(col, 1.);
}`;

const NOGRAIN = new URLSearchParams(location.search).has('nograin');
export function createStage() {
  const W = innerWidth, H = innerHeight, DPR = devicePixelRatio, w = Math.round(W * DPR), h = Math.round(H * DPR);
  const fx = document.getElementById('fx'), g2 = fx.getContext('2d'); fx.width = w; fx.height = h;
  const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: false, preserveDrawingBuffer: true });
  renderer.setPixelRatio(DPR); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(35, W / H, 0.02, 400);
  const hdr = { type: THREE.HalfFloatType, colorSpace: THREE.LinearSRGBColorSpace };
  const beauty = new THREE.WebGLRenderTarget(w, h, { ...hdr, samples: 4 });
  beauty.depthTexture = new THREE.DepthTexture(w, h, THREE.FloatType);
  const b1 = new THREE.WebGLRenderTarget(w >> 2, h >> 2, hdr), b2 = new THREE.WebGLRenderTarget(w >> 2, h >> 2, hdr);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)), qs = new THREE.Scene(), qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); qs.add(quad);
  const mk = (f, u) => new THREE.ShaderMaterial({ vertexShader: QUAD_V, fragmentShader: f, uniforms: u, depthTest: false, depthWrite: false });
  const C = (r, g, b) => new THREE.Color(r, g, b);
  const comp = mk(COMP_F, { tColor: { value: beauty.texture }, tDepth: { value: beauty.depthTexture }, tBloom: { value: b2.texture },
    uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: camera.near }, uFar: { value: camera.far }, uFocus: { value: 1 }, uAperture: { value: 0 },
    uMaxR: { value: 0.022 * h }, uBloom: { value: 0.6 }, uExpo: { value: 0.66 }, uVig: { value: 0.75 }, uGrain: { value: 0.035 }, uTime: { value: 0 },
    uSat: { value: 1.05 }, uContrast: { value: 0.12 }, uLift: { value: C(0.018, 0.016, 0.045) }, uGain: { value: C(1.02, 1.0, 0.98) },
    uShadowTint: { value: C(1, 1, 1) }, uHiTint: { value: C(1, 1, 1) }, uChroma: { value: 0 }, uVHS: { value: 0 }, uFlash: { value: 0 }, uFlashCol: { value: C(1, 1, 1) },
    uPaper: { value: 0 }, uPaperEdge: { value: 1 }, uPaperShade: { value: C(0.62, 0.58, 0.52) }, uPaperCream: { value: C(0.87, 0.84, 0.79) }, uPaperInk: { value: C(0.25, 0.22, 0.2) } });
  const bright = mk(BRIGHT_F, { t: { value: beauty.texture }, uTh: { value: 1.0 } }), blur = mk(BLUR_F, { t: { value: null }, uDir: { value: new THREE.Vector2() } });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, qc); };
  const compRT = new THREE.WebGLRenderTarget(w, h, hdr), accRT = new THREE.WebGLRenderTarget(w, h, hdr);
  const COPY_F = `uniform sampler2D t; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * uW, 1.); }`;
  const add = mk(COPY_F, { t: { value: compRT.texture }, uW: { value: 1 } }), copy = mk(COPY_F, { t: { value: accRT.texture }, uW: { value: 1 } });
  Object.assign(add, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, transparent: true });
  function post(out = null) {
    renderer.setRenderTarget(beauty); renderer.clear(); renderer.render(scene, camera);
    pass(bright, b1);
    for (const k of [1, 2.2, 4]) { blur.uniforms.t.value = b1.texture; blur.uniforms.uDir.value.set(k / (w >> 2), 0); pass(blur, b2);
      blur.uniforms.t.value = b2.texture; blur.uniforms.uDir.value.set(0, k / (h >> 2)); pass(blur, b1); }
    comp.uniforms.tBloom.value = b1.texture; comp.uniforms.uNear.value = camera.near; comp.uniforms.uFar.value = camera.far;
    pass(comp, out);
  }
  const S = { W, H, DPR, fx, g2, renderer, scene, camera, comp, bright };
  S.setCamera = (s) => {
    camera.fov = s.fov ?? 35; camera.near = s.near ?? 0.02; camera.updateProjectionMatrix();
    camera.position.copy(s.pos); camera.up.set(0, 1, 0); camera.lookAt(s.tgt); camera.rotateZ(s.roll || 0); camera.updateMatrixWorld();
  };
  const U = comp.uniforms;
  function grade(g = {}) {   // per-shot look (defaults = neutral)
    U.uExpo.value = g.expo ?? 0.8; U.uBloom.value = g.bloom ?? 0.6; bright.uniforms.uTh.value = g.bloomTh ?? 1.0;
    U.uVig.value = g.vig ?? 0.9; U.uGrain.value = NOGRAIN ? 0 : (g.grain ?? 0.035); U.uSat.value = g.sat ?? 1.05; U.uContrast.value = g.contrast ?? 0.15;
    U.uLift.value.set(...(g.lift ?? [0.018, 0.016, 0.045])); U.uGain.value.set(...(g.gain ?? [1, 1, 1]));
    U.uShadowTint.value.set(...(g.shadow ?? [1, 1, 1])); U.uHiTint.value.set(...(g.hi ?? [1, 1, 1]));
    U.uPaper.value = g.paper ?? 0; U.uPaperEdge.value = g.paperEdge ?? 1; U.uPaperShade.value.set(...(g.paperShade ?? [0.62, 0.58, 0.52])); U.uPaperCream.value.set(...(g.paperCream ?? [0.87, 0.84, 0.79])); U.uPaperInk.value.set(...(g.paperInk ?? [0.25, 0.22, 0.2]));
    U.uChroma.value = g.chroma ?? 0; U.uVHS.value = g.vhs ?? 0; U.uFlash.value = g.flash ?? 0; U.uFlashCol.value.set(...(g.flashCol ?? [1, 1, 1]));
  }
  // prep(t) poses everything for time t and returns the shot spec {pos, tgt, fov, roll, focus, aperture, grade}; overlay(t, s) draws 2D
  S.run = ({ prep, overlay = () => {}, T_END }) => {
    const shoot = (ti, t, out) => { const s = prep(ti, t); S.setCamera(s);   // prep(sub-frame time, frame time): the shot is picked by the frame time
      // v3: the per-shot grade() was never called in v2 (it sat in this comment), so v2's look = the defaults. Keep that look;
      // apply only the paper print and the flash from the shot's grade.
      const g_ = s.grade ?? {}; U.uPaper.value = g_.paper ?? 0; U.uPaperEdge.value = g_.paperEdge ?? 1; U.uFlash.value = g_.flash ?? 0; U.uFlashCol.value.set(...(g_.flashCol ?? [1, 1, 1]));
      U.uPaperShade.value.set(...(g_.paperShade ?? [0.7, 0.66, 0.59])); U.uPaperCream.value.set(...(g_.paperCream ?? [0.88, 0.85, 0.79])); U.uPaperInk.value.set(...(g_.paperInk ?? [0.3, 0.27, 0.24]));
      if (g_.paper) { U.uVig.value = 0; } else { U.uVig.value = 0.75; }
      U.uFocus.value = s.focus ?? 1; U.uAperture.value = s.aperture ?? 0; U.uTime.value = t; post(out); return s; };
    window.__frame = (t, sub = 1, shutter = 0.5, fps = 30) => {
      let s;
      if (sub > 1) {
        renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear(); add.uniforms.uW.value = 1 / sub;
        for (let i = 0; i < sub; i++) {
          const ti = clamp(t + ((i + 0.5) / sub - 0.5) * shutter / fps, 0, (window.__T_END || 1e9) - 1e-4);
          shoot(ti, t, compRT); renderer.autoClear = false; quad.material = add; renderer.setRenderTarget(accRT); renderer.render(qs, qc); renderer.autoClear = true;
        }
        pass(copy, null); s = prep(t, t); S.setCamera(s);
      } else s = shoot(t, t, null);
      g2.clearRect(0, 0, w, h); overlay(t, s); return true;
    };
    window.__T_END = T_END;
    const Q = new URLSearchParams(location.search);
    if (!Q.has('norender')) { window.__frame(Number(Q.get('t') || 0)); window.__done = true; }
  };
  return S;
}
