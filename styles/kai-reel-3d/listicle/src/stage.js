// stage.js: the Morphy-look renderer. PBR scene (both characters keep their own materials) → linear HDR target
// (MSAA, depth) → bloom (1/4 res) → comp: depth-of-field with bright bokeh discs, ACES, night grade (violet lift,
// warm highs), vignette, grain → sRGB. 2D overlay canvas on top for captions.
// Contract with render/shot.mjs + render/sheet.mjs:
//   window.__frame(t, sub, shutter, fps)  renders the frame at video time t (pure function of t, any order)
//   window.__T_END                        reel length in seconds
import * as THREE from 'three';

export const V = (x, y, z) => new THREE.Vector3(x, y, z);
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ss = (x) => x * x * (3 - 2 * x), sio = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
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
uniform float uBloom, uExpo, uVig, uGrain, uTime, uSat, uContrast; uniform vec3 uLift, uGain;
varying vec2 vUv;
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float lin(float d){ float z = d * 2. - 1.; return 2. * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
float cocAt(vec2 uv){ float dz = lin(texture2D(tDepth, uv).r); return clamp(abs(dz - uFocus) / max(dz, 1e-3) * uAperture, 0.0, 1.0); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1. / 2.4)) - 0.055, step(0.0031308, c)); }
void main(){
  vec3 col = texture2D(tColor, vUv).rgb;
  float coc = uAperture > 0.0 ? cocAt(vUv) : 0.0;
  if (coc > 0.01) {                 // gather disc: 64 golden-angle taps, per-pixel rotation, bright taps weigh more (bokeh)
    float rad = coc * uMaxR, rot = h21(vUv * uRes) * 6.2832; vec3 acc = vec3(0.); float ws = 0.;
    for (int i = 0; i < 64; i++) { float fi = float(i) + 0.5; float r = sqrt(fi / 64.0) * rad; float a = fi * 2.39996 + rot;
      vec2 uv = vUv + vec2(cos(a), sin(a)) * r / uRes; vec3 c = texture2D(tColor, uv).rgb;
      float cn = cocAt(uv); float w = (cn * uMaxR >= r * 0.8 || cn >= coc * 0.7 ? 1.0 : 0.15) * (1.0 + 3.0 * smoothstep(0.8, 4.0, max(c.r, max(c.g, c.b))));
      acc += c * w; ws += w; }
    col = mix(col, acc / ws, smoothstep(0.01, 0.06, coc));
  }
  col += texture2D(tBloom, vUv).rgb * uBloom;
  col = aces(col * uExpo);
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, uSat);
  col = col * uGain + uLift * (1. - col);
  col = mix(col, col * col * (3. - 2. * col), uContrast);
  vec2 q = vUv - .5; col *= 1. - uVig * dot(q, q) * 1.8;
  col = toSRGB(clamp(col, 0., 1.));
  col += (h21(vUv * uRes + fract(uTime * 13.7) * 97.) - .5) * uGrain;
  gl_FragColor = vec4(col, 1.);
}`;

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
  const comp = mk(COMP_F, { tColor: { value: beauty.texture }, tDepth: { value: beauty.depthTexture }, tBloom: { value: b2.texture },
    uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: camera.near }, uFar: { value: camera.far }, uFocus: { value: 1 }, uAperture: { value: 0 },
    uMaxR: { value: 0.022 * h }, uBloom: { value: 0.6 }, uExpo: { value: 0.66 }, uVig: { value: 0.75 }, uGrain: { value: 0.03 }, uTime: { value: 0 },
    uSat: { value: 1.05 }, uContrast: { value: 0.12 }, uLift: { value: new THREE.Color(0.018, 0.016, 0.045) }, uGain: { value: new THREE.Color(1.02, 1.0, 0.98) } });
  const bright = mk(BRIGHT_F, { t: { value: beauty.texture }, uTh: { value: 1.0 } }), blur = mk(BLUR_F, { t: { value: null }, uDir: { value: new THREE.Vector2() } });
  const pass = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(qs, qc); };
  const compRT = new THREE.WebGLRenderTarget(w, h, hdr), accRT = new THREE.WebGLRenderTarget(w, h, hdr);   // v2 motion blur: sub-frame accumulation
  const COPY_F = `uniform sampler2D t; uniform float uW; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).rgb * uW, 1.); }`;
  const add = mk(COPY_F, { t: { value: compRT.texture }, uW: { value: 1 } }), copy = mk(COPY_F, { t: { value: accRT.texture }, uW: { value: 1 } });
  Object.assign(add, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, transparent: true });
  function post(out = null) {
    renderer.setRenderTarget(beauty); renderer.clear(); renderer.render(scene, camera);
    pass(bright, b1);
    for (const k of [1, 2.2]) { blur.uniforms.t.value = b1.texture; blur.uniforms.uDir.value.set(k / (w >> 2), 0); pass(blur, b2);
      blur.uniforms.t.value = b2.texture; blur.uniforms.uDir.value.set(0, k / (h >> 2)); pass(blur, b1); }
    comp.uniforms.tBloom.value = b1.texture; comp.uniforms.uNear.value = camera.near; comp.uniforms.uFar.value = camera.far;
    pass(comp, out);
  }
  const S = { W, H, DPR, fx, g2, renderer, scene, camera, comp };
  S.setCamera = (s) => {
    camera.fov = s.fov ?? 35; camera.updateProjectionMatrix();
    camera.position.copy(s.pos); camera.up.set(0, 1, 0); camera.lookAt(s.tgt); camera.rotateZ(s.roll || 0); camera.updateMatrixWorld();
  };
  // prep(t) poses everything for time t and returns the shot spec {pos, tgt, fov, roll, focus, aperture}; overlay(t, s) draws 2D
  S.run = ({ prep, overlay = () => {}, T_END }) => {
    const shoot = (ti, t, out) => { const s = prep(ti); S.setCamera(s);
      comp.uniforms.uFocus.value = s.focus ?? 1; comp.uniforms.uAperture.value = s.aperture ?? 0; comp.uniforms.uTime.value = t; post(out); return s; };
    // v2 (listicle ADHD camera): sub > 1 renders `sub` sub-frames spread over shutter/fps around t and averages them (motion blur on
    // whips and crash zooms). Grain keeps t so it does not average away. The last prep(t) leaves the scene posed at t for audits.
    window.__frame = (t, sub = 1, shutter = 0.5, fps = 30) => {
      let s;
      if (sub > 1) {
        renderer.setRenderTarget(accRT); renderer.setClearColor(0x000000, 1); renderer.clear(); add.uniforms.uW.value = 1 / sub;
        for (let i = 0; i < sub; i++) {
          const ti = clamp(t + ((i + 0.5) / sub - 0.5) * shutter / fps, 0, (window.__T_END || 1e9) - 1e-4);
          shoot(ti, t, compRT); renderer.autoClear = false; quad.material = add; renderer.setRenderTarget(accRT); renderer.render(qs, qc); renderer.autoClear = true;
        }
        pass(copy, null); s = prep(t); S.setCamera(s);
      } else s = shoot(t, t, null);
      g2.clearRect(0, 0, w, h); overlay(t, s); return true;
    };
    window.__T_END = T_END;
    const Q = new URLSearchParams(location.search);
    if (!Q.has('norender')) { window.__frame(Number(Q.get('t') || 0)); window.__done = true; }
  };
  return S;
}
