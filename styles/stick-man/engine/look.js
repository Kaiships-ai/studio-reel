// Stick-man stage: renderer, sun + sky + fake bounce, toon-leaning materials, prop-only ink, lens blur, glow, grade.
// Everything here is deterministic; a frame is a pure function of what the caller set before stage.render().
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const PROPS = 1;                                            // layer that gets the ink line
export const B = (x, y, z) => new THREE.Vector3(x, z, -y);         // Blender Z-up -> three Y-up
export const lin = (r, g, b) => new THREE.Color(r, g, b);          // colours are linear, like Blender's
const s8 = c => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)));
export const css = (c, k = 1) => `rgb(${s8(c[0] * k)},${s8(c[1] * k)},${s8(c[2] * k)})`;
export const INK_RGB = [0.006, 0.006, 0.009];

// Toon-leaning material. Only the SUN (light 0, with its shadow) picks the point on the ramp, so window bars and
// prop shadows fall across a head as a cool lilac patch; the other lights just lift the shade a little.
// sheen = tight specular, broad = wide soft highlight on the sunlit side.
// soft (0..1): 0 = two-tone cel ramp (characters, props); 1 = set surfaces: a form gradient from the sun angle, while the
// cast shadow stays a hard edge in the blue shade tone (reference: sunlit floors with crisp blue-grey shadows).
export function toon(rgb, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: lin(...rgb), roughness: o.rough ?? 0.45, metalness: 0, map: o.map || null });
  return toonify(m, o);
}

// turns any MeshStandardMaterial into the toon ramp in place (createStage does this to every set material it meets)
export function toonify(m, o = {}) {
  const U = {
    uShade: { value: lin(...(o.shade || [0.66, 0.64, 0.90])) }, uGain: { value: o.gain ?? 1.0 },
    uSheen: { value: o.sheen ?? 0.15 }, uBroad: { value: o.broad ?? 0.0 }, uRim: { value: o.rim ?? 0.35 }, uSoft: { value: o.soft ?? 0.0 }, uRimLit: { value: o.rimLit ?? 0.0 },
  };
  m.userData.toon = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uShade; uniform float uGain, uSheen, uBroad, uRim, uSoft, uRimLit;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      float ndl = 0.0, shw = 1.0; vec3 sunD = vec3(0.0, 1.0, 0.0);
      #if NUM_DIR_LIGHTS > 0
        sunD = directionalLights[ 0 ].direction;
        ndl = dot(geometryNormal, sunD);
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          DirectionalLightShadow dls = directionalLightShadows[ 0 ];
          shw = getShadow( directionalShadowMap[ 0 ], dls.shadowMapSize, dls.shadowIntensity, dls.shadowBias, dls.shadowRadius, vDirectionalShadowCoord[ 0 ] );
        #endif
      #endif
      float sunL = saturate(ndl) * shw;
      float k = mix(smoothstep(0.02, 0.22, sunL), smoothstep(-0.10, 0.75, ndl) * smoothstep(0.35, 0.65, shw), uSoft);
      vec3 dif = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      float alb = max(dot(diffuseColor.rgb, vec3(0.3333)), 1e-3);
      float amb = clamp(dot(dif, vec3(0.3333)) / alb * 3.14159 / 3.0, 0.0, 1.0);
      float fr = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 2.2) * uRim;
      vec3 shade = uShade * (0.88 + 0.12 * amb);
      vec3 sunC = vec3(1.0);
      #if NUM_DIR_LIGHTS > 0
        sunC = directionalLights[ 0 ].color / max(max(directionalLights[ 0 ].color.r, directionalLights[ 0 ].color.g), max(directionalLights[ 0 ].color.b, 1e-3));
      #endif
      vec3 col = diffuseColor.rgb * mix(shade, uGain * mix(vec3(1.0), sunC, 0.7 * uSoft), k * (1.0 - fr));
      col += reflectedLight.directSpecular * uSheen * mix(1.0, shw, uSoft) + totalEmissiveRadiance;
      col += vec3(1.0, 0.97, 0.92) * uBroad * k * pow(saturate(dot(geometryNormal, normalize(sunD + geometryViewDir))), 5.0);
      // rimLit: a bright back-light edge on the sun side (the glossy reference heads), never in cast shadow
      col += vec3(1.0, 0.97, 0.92) * uRimLit * pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 3.0) * smoothstep(-0.3, 0.4, ndl) * shw;
      gl_FragColor = vec4(col, diffuseColor.a);`);
  };
  m.needsUpdate = true;
  return m;
}

// set-surface defaults for toonify (every MeshStandardMaterial a set or prop makes without toon()); SET_LOOK is the
// one place to tune them for all sets at once
export const SET_LOOK = { soft: 1.0, gain: 1.0, shade: [0.36, 0.43, 0.72], sheen: 0.45, rim: 0.0 };
// per-set grade (colour per shot gate, GATES.md "Look gates"): exp scales the finished frame, lift raises the shadows
// toward white (lift * (1 - c)), gam < 1 brightens the mids, sat scales saturation, haze scales the light-shaft density. Tuned per set against the reference tiles p10-p90
// (YAVG 84-158, YLOW 36-101); an act can override with `grade: {exp, lift, gam}`.
export const SET_GRADE = {
  // measured 10/11 on stick06-robe / stick06-levels v1 (per-set median YAVG / YLOW, full range) -> aim YAVG ~140, YLOW ~70
  park: { exp: 0.86, gam: 1.06, lift: 0.03 },              // v1 129 / 60 (robe), 133 / 45 (levels)
  lab: { exp: 0.90, gam: 1.0, sat: 1.25 },                 // v1 139 / 65, SAT 18 (low)
  cutaway: { exp: 0.86, gam: 1.06 },                       // v1 134 / 54
  'bank-lobby': { exp: 1.0, gam: 0.96, lift: 0.06 },      // Q1: YLOW 30-33 (too dark)
  street: { exp: 1.0, lift: 0.09, sat: 1.25 },             // v1 117 / 29, SAT 20
  'halden-street': { exp: 0.80, gam: 1.22, lift: 0.04, sat: 1.15, haze: 0.45 },   // v1 194 / 112; v2 traffic YLOW 21-28, SAT 12-17 (haze)
  classroom: { exp: 0.86, gam: 1.23 },                     // v1 177 / 101
  'halden-plaza': { exp: 0.84, gam: 1.13, sat: 1.3 },      // v1 175 / 95, SAT 18
  island: { exp: 0.79, gam: 1.74 },                        // v1 207 / 139
};

export function std(rgb, rough, o = {}) {
  return new THREE.MeshStandardMaterial({ color: lin(...rgb), roughness: rough, metalness: 0, ...o });
}

const FS_QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

// light shafts: in-scatter of the sun, ray-marched through the sun's shadow map at half size, so light through windows,
// bars and leaves shows as beams in the air (reference sets). density per metre; phase g leans the glow toward the sun.
const SHAFT_V = FS_QUAD_V;
const SHAFT_F = `#include <packing>
  uniform sampler2D tD, tS; uniform mat4 invProj, camWorld, sMat; uniform vec3 camPos, sunDir, sCol; uniform float cNear, cFar, dens, maxD, g, on;
  varying vec2 vUv;
  float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
  void main(){
    if (on < 0.5) { gl_FragColor = vec4(0.0); return; }
    float d = texture2D(tD, vUv).x;
    vec4 vp = invProj * vec4(vUv*2.0 - 1.0, d*2.0 - 1.0, 1.0); vp /= vp.w;
    vec3 wp = (camWorld * vp).xyz, rd = wp - camPos; float L = d > 0.9999 ? 0.45*maxD : min(length(rd), maxD); rd = normalize(rd);   // sky: short haze only
    const int N = 28; float lit = 0.0, j = ign(gl_FragCoord.xy);
    for (int i = 0; i < N; i++) {
      vec3 p = camPos + rd * L * (float(i) + j) / float(N);
      vec4 sc = sMat * vec4(p, 1.0); sc.xyz /= sc.w;
      float v = 1.0;
      if (sc.x > 0.0 && sc.x < 1.0 && sc.y > 0.0 && sc.y < 1.0 && sc.z < 1.0) v = step(sc.z - 0.002, unpackRGBAToDepth(texture2D(tS, sc.xy)));
      lit += v;
    }
    lit *= L / float(N);
    float c = dot(rd, sunDir), ph = (1.0 - g*g) / pow(1.0 + g*g - 2.0*g*c, 1.5) * pow(1.0 + g*g, 1.5) / (1.0 - g*g);
    gl_FragColor = vec4(sCol * (1.0 - exp(-dens * lit)) * ph, 1.0);
  }`;
class ShaftPass extends Pass {
  constructor(width, height, camera, sun, depthTex, o) {
    super();
    this.camera = camera; this.sun = sun;
    this.rt = new THREE.WebGLRenderTarget(Math.round(width / 2), Math.round(height / 2), { type: THREE.HalfFloatType });
    this.march = new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: SHAFT_V, fragmentShader: SHAFT_F, uniforms: {
      tD: { value: depthTex }, tS: { value: null }, invProj: { value: new THREE.Matrix4() }, camWorld: { value: new THREE.Matrix4() },
      sMat: { value: new THREE.Matrix4() }, camPos: { value: new THREE.Vector3() }, sunDir: { value: new THREE.Vector3() },
      sCol: { value: lin(1.0, 0.88, 0.70) }, cNear: { value: camera.near }, cFar: { value: camera.far },
      dens: { value: o.dens }, maxD: { value: o.maxD }, g: { value: o.g }, on: { value: 1 } } }));
    this.mix = new FullScreenQuad(new THREE.ShaderMaterial({ vertexShader: FS_QUAD_V, uniforms: { tDiffuse: { value: null }, tS: { value: this.rt.texture },
      texel: { value: new THREE.Vector2(2 / width, 2 / height) }, k: { value: o.k } },
      fragmentShader: `uniform sampler2D tDiffuse, tS; uniform vec2 texel; uniform float k; varying vec2 vUv;
        void main(){ vec3 s = vec3(0.0);
          for (int y = -2; y <= 2; y++) for (int x = -2; x <= 2; x++) s += texture2D(tS, vUv + vec2(x, y)*texel).rgb;
          vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(c.rgb + k*s/25.0, c.a); }` }));
  }
  render(renderer, writeBuffer, readBuffer) {
    const U = this.march.material.uniforms, sh = this.sun.shadow;
    U.on.value = sh.map ? 1 : 0; U.tS.value = sh.map ? sh.map.texture : null;
    U.invProj.value.copy(this.camera.projectionMatrixInverse); U.camWorld.value.copy(this.camera.matrixWorld);
    U.camPos.value.setFromMatrixPosition(this.camera.matrixWorld); U.sMat.value.copy(sh.matrix);
    U.sunDir.value.copy(this.sun.position).sub(this.sun.target.position).normalize();
    renderer.setRenderTarget(this.rt); this.march.render(renderer);
    this.mix.material.uniforms.tDiffuse.value = readBuffer.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer); this.mix.render(renderer);
  }
}

// stick06 judge round 2 (lighting/shading 4/10 'flat, washed out, evenly lit'): sat 1.25 -> 1.38, con 1.12 -> 1.18, sky fill
// 1.15 -> 0.85, sun lowered to <= 35 deg; set ink 2.6 -> 2.1 px (ink gate median 4 px; judge: set lines compete with figures);
// round 3 ('washed out, hazy overlays'): highlight bloom 0.38 -> 0.28, shafts 0.032 -> 0.024
export function createStage({ width, height, exposure = 0.88, ink = 2.1, sat = 1.38, con = 1.18, vig = 0.30, split = 0.7, bloom = 1.1,
  hot = 0.28, shafts = 0.024, shaftK = 1.6, dofK = 0.55 } = {}) {
  const stage = {};                                               // late-bound parts (setSun runs before the passes exist)
  const px = height / 1920;                                       // every pixel-size number scales with this
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(width, height);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = exposure;
  document.body.appendChild(renderer.domElement);
  const gl = renderer.getContext();
  const scene = new THREE.Scene();
  scene.background = lin(0.5, 0.7, 1.0);
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.05, 80);
  camera.layers.enable(PROPS);

  // sun: 4096 map fitted tight round what the shot sees; PCF with a small radius keeps bar edges straight, not stepped
  const sun = new THREE.DirectionalLight(lin(1.0, 0.93, 0.80), 6.0);
  sun.castShadow = true; sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.006; sun.shadow.radius = 1.0;   // hard-edged cast shadows (reference)
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(lin(0.44, 0.60, 1.0), lin(0.80, 0.68, 0.58), 0.85);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(lin(0.80, 0.84, 1.0), 0.45);
  scene.add(fill, fill.target);

  function setSun(dirB, centerB, half = 6) {
    const d = B(...dirB).normalize();
    // a high sun (over ~35 deg) is lowered to 35 deg: longer cast shadows that read on the ground, as in the reference
    if (-d.y > 0.57) { const h = Math.hypot(d.x, d.z) || 1; d.set(d.x / h * 0.82, -0.57, d.z / h * 0.82).normalize(); }
    sun.target.position.copy(B(...centerB));
    sun.position.copy(sun.target.position).addScaledVector(d, -30);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 50 });
    sun.shadow.camera.updateProjectionMatrix();
    if (stage.shafts) stage.shafts.march.material.uniforms.maxD.value = Math.min(22, 3 * half);   // haze length follows the set's scale
    fill.position.copy(B(...centerB)).add(new THREE.Vector3(-2, 8, 10)); fill.target.position.copy(B(...centerB));
  }

  // fake bounce: warm unshadowed point lights where the sun lands, so shade next to a sun pool turns warm
  function addBounce(posB, rgb, intensity = 1.2, distance = 4.5) {
    const l = new THREE.PointLight(lin(...rgb), intensity, distance, 1.6);
    l.position.copy(B(...posB)); scene.add(l); return l;
  }

  function setCamera(posB, tgtB, lens = 30) {
    camera.fov = 2 * Math.atan(18 / lens) * 180 / Math.PI;      // 36 mm tall sensor, like the Blender camera
    camera.position.copy(B(...posB)); camera.lookAt(B(...tgtB));
    camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }

  function prop(o) { o.traverse(c => c.layers.enable(PROPS)); return o; }
  // k scales the colour that feeds the bloom (the mesh itself still renders normally)
  function glow(o, k = 1) {
    o.traverse(c => { if (!c.isMesh) return; const m = c.material;
      c.userData.glow = new THREE.MeshBasicMaterial({ color: (m.emissive && !m.isMeshBasicMaterial ? m.emissive.clone() : m.color.clone()).multiplyScalar(k) }); });
    return o;
  }

  // ---- ink prepass: view normal in rgb, object id in alpha (0 = not a prop), plus a depth texture
  const nrt = new THREE.WebGLRenderTarget(width, height, { depthTexture: new THREE.DepthTexture(width, height, THREE.UnsignedIntType),
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const nMat = id => new THREE.ShaderMaterial({ uniforms: { flag: { value: id / 255 } },
    vertexShader: 'varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform float flag; varying vec3 vN; void main(){ gl_FragColor = vec4(normalize(vN)*0.5+0.5, flag); }', side: THREE.DoubleSide });
  const NM = [nMat(0)], black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  let nextId = 0;
  const idMat = m => { if (!m.userData.inkId) m.userData.inkId = 1 + (nextId++ % 254); const i = m.userData.inkId; return NM[i] || (NM[i] = nMat(i)); };
  const list = [], saved = [], hidden = [];
  function swap(fn, rt, bg) {
    list.length = saved.length = hidden.length = 0;
    scene.traverseVisible(o => { if (o.isMesh) list.push(o); });
    for (const m of list) { saved.push(m.material); const r = fn(m); if (r === null) { m.visible = false; hidden.push(m); } else if (r) m.material = r; }
    const sbg = scene.background; scene.background = bg;
    renderer.setClearColor(0x000000, 0); renderer.shadowMap.autoUpdate = false;
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera); renderer.setRenderTarget(null);
    renderer.toneMapping = tm; renderer.shadowMap.autoUpdate = true; scene.background = sbg;
    list.forEach((m, i) => { m.material = saved[i]; });
    hidden.forEach(m => { m.visible = true; });
  }
  // ink on every set and prop mesh: props (layer PROPS) always; any other opaque front-faced mesh unless it belongs to a
  // stick figure (cast.js marks the root userData.stick; figures carry their own inverted-hull outline) or says noInk
  const inkable = m => {
    if (m.userData.inkable !== undefined) return m.userData.inkable;
    let ok = m.layers.isEnabled(PROPS);
    if (!ok) {
      const mt = Array.isArray(m.material) ? m.material[0] : m.material;
      ok = !!mt && mt.side !== THREE.BackSide && !mt.transparent && !m.userData.noInk;
      for (let p = m; ok && p; p = p.parent) if (p.userData.stick || p.userData.noInk) ok = false;
    }
    return (m.userData.inkable = ok);
  };
  const prepass = () => swap(m => m.userData.noPrepass ? null : (inkable(m) ? idMat(m) : NM[0]), nrt, null);
  // every plain MeshStandardMaterial (sets, glb dressing without toon, props) gets the set toon ramp once
  const seen = new WeakSet();
  const autoToon = () => scene.traverseVisible(o => { if (!o.isMesh) return;
    for (const mt of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!mt || seen.has(mt)) continue; seen.add(mt);
      if (mt.isMeshStandardMaterial && !mt.userData.toon && !mt.userData.noToon) toonify(mt, SET_LOOK);
    } });

  const inkPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tN: { value: null }, tD: { value: null }, texel: { value: new THREE.Vector2(1 / width, 1 / height) },
      cNear: { value: camera.near }, cFar: { value: camera.far }, w: { value: ink * px } },
    vertexShader: FS_QUAD_V,
    fragmentShader: `#include <packing>
      uniform sampler2D tDiffuse, tN, tD; uniform vec2 texel; uniform float cNear, cFar, w; varying vec2 vUv;
      float Z(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cNear, cFar); }
      // one-sided edges so a line is never drawn twice: it lands on the nearer object, ties go to the higher id
      float mask(vec2 uv){
        vec4 nc = texture2D(tN, uv); if (nc.a < 0.5/255.0) return 0.0;
        float zc = Z(uv), e = 0.0; vec3 n0 = nc.xyz*2.0-1.0;
        vec2 S[4] = vec2[4](vec2(1,0), vec2(0,1), vec2(1,1), vec2(1,-1));
        for (int a = 0; a < 4; a++) for (int r = 1; r <= 4; r++) {
          float d = float(r) - 0.5; float cw = clamp(w + 0.5 - d, 0.0, 1.0); if (cw <= 0.0) break;
          for (int k = 0; k < 2; k++) {
            vec2 uq = uv + (k == 0 ? -1.0 : 1.0)*S[a]*texel*float(r);
            vec4 nq = texture2D(tN, uq); float zq = Z(uq);
            bool other = abs(nq.a - nc.a) > 0.5/255.0;
            bool nearer = zc < zq*0.985 || (abs(zc - zq) <= zq*0.015 && nc.a > nq.a);
            if (other && nearer) e = max(e, cw);
            else if (!other) {
              // same object: a hard crease, or a fold where the surface steps back (inverse depth is linear on a plane)
              float zo = Z(uv - (uq - uv)); float s = (1.0/zq + 1.0/zo - 2.0/zc)*zc;
              e = max(e, smoothstep(0.03, 0.06, -s)*cw);
              if (abs(zq-zc) < zc*0.02) e = max(e, (1.0 - smoothstep(0.55, 0.75, dot(n0, nq.xyz*2.0-1.0)))*cw*step(0.5, float(k)));
            }
          }
        }
        return e;
      }
      void main(){
        vec4 c = texture2D(tDiffuse, vUv);
        float a = 0.25*mask(vUv) + 0.125*(mask(vUv+vec2(texel.x,0.0)) + mask(vUv-vec2(texel.x,0.0)) + mask(vUv+vec2(0.0,texel.y)) + mask(vUv-vec2(0.0,texel.y)))
                + 0.0625*(mask(vUv+texel) + mask(vUv-texel) + mask(vUv+vec2(texel.x,-texel.y)) + mask(vUv+vec2(-texel.x,texel.y)));
        gl_FragColor = vec4(mix(c.rgb, vec3(0.0008, 0.0008, 0.0012), clamp(a*1.3, 0.0, 1.0)), c.a);   // solid, not grey: bold ink
      }` });
  inkPass.uniforms.tN.value = nrt.texture; inkPass.uniforms.tD.value = nrt.depthTexture;   // ShaderPass clones uniforms

  // ---- lens blur (after ink, so ink blurs with what it outlines). Sharp between near and far, soft outside.
  const dofPass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, tD: { value: null }, texel: { value: new THREE.Vector2(1 / width, 1 / height) },
      cNear: { value: camera.near }, cFar: { value: camera.far }, near: { value: 1 }, far: { value: 3 }, maxR: { value: 14 * px }, gain: { value: 2.0 } },
    vertexShader: FS_QUAD_V,
    fragmentShader: `#include <packing>
      uniform sampler2D tDiffuse, tD; uniform vec2 texel; uniform float cNear, cFar, near, far, maxR, gain; varying vec2 vUv;
      float Z(vec2 uv){ return -perspectiveDepthToViewZ(texture2D(tD, uv).x, cNear, cFar); }
      float coc(float z){ float c = z > far ? (1.0/far - 1.0/z)*far : (z < near ? (1.0/z - 1.0/near)*near : 0.0); return clamp(c*gain, 0.0, 1.0); }
      void main(){
        float zc = Z(vUv), cc = coc(zc); vec4 acc = vec4(texture2D(tDiffuse, vUv).rgb, 1.0);
        if (cc > 0.0) for (int i = 1; i < 48; i++) {
          float fi = float(i), r = sqrt(fi/48.0)*cc*maxR, a = fi*2.39996;
          vec2 uv = vUv + vec2(cos(a), sin(a))*r*texel; float zs = Z(uv), cs = coc(zs);
          // a sharp thing in front must not smear into the blurred background behind it
          float wgt = zs < zc*0.97 ? smoothstep(0.0, 1.0, cs*maxR/max(r, 1.0)) : 1.0;
          acc += vec4(texture2D(tDiffuse, uv).rgb*wgt, wgt);
        }
        gl_FragColor = vec4(acc.rgb/acc.a, 1.0);
      }` });
  dofPass.uniforms.tD.value = nrt.depthTexture; dofPass.enabled = false;
  function setDof(o) {
    if (!o) { dofPass.enabled = false; return; }
    Object.assign(dofPass.uniforms.near, { value: o.near }); dofPass.uniforms.far.value = o.far;
    dofPass.uniforms.maxR.value = (o.px ?? 14) * px * 0.75; dofPass.uniforms.gain.value = (o.gain ?? 2.0) * dofK; dofPass.enabled = true;   // lighter lens blur: the reference keeps the set readable
  }

  // ---- glow: only meshes marked glow() feed the bloom; everything else renders black but still hides them
  const gw = Math.round(width / 2), gh = Math.round(height / 2);
  const grt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType });
  const bloomComposer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(gw, gh, { type: THREE.HalfFloatType }));
  bloomComposer.renderToScreen = false; bloomComposer.setPixelRatio(1); bloomComposer.setSize(gw, gh);
  const copyIn = new ShaderPass({ uniforms: { tDiffuse: { value: null }, tG: { value: grt.texture } }, vertexShader: FS_QUAD_V,
    fragmentShader: 'uniform sampler2D tG; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tG, vUv); }' });
  copyIn.uniforms.tG.value = grt.texture;
  bloomComposer.addPass(copyIn);
  bloomComposer.addPass(new UnrealBloomPass(new THREE.Vector2(gw, gh), bloom, 0.6, 0.0));
  const mixPass = new ShaderPass({ uniforms: { tDiffuse: { value: null }, tB: { value: null } }, vertexShader: FS_QUAD_V,
    fragmentShader: 'uniform sampler2D tDiffuse, tB; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); gl_FragColor = vec4(c.rgb + texture2D(tB, vUv).rgb, c.a); }' });

  const gradePass = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, sat: { value: sat }, con: { value: con }, vig: { value: vig }, split: { value: split },
      aspect: { value: width / height }, tPrev: { value: null }, uPrev: { value: 0 }, uFlash: { value: 0 },
      uExp: { value: 1 }, uLift: { value: 0 }, uGam: { value: 1 }, uSat: { value: 1 } },
    vertexShader: FS_QUAD_V,
    fragmentShader: `uniform sampler2D tDiffuse, tPrev; uniform float sat, con, vig, split, aspect, uPrev, uFlash, uExp, uLift, uGam, uSat; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722));
        c = mix(vec3(l), c, sat);
        // split tone: shade leans blue-lilac, light leans warm, like the sunlit reference sets
        float sh = 1.0 - smoothstep(0.12, 0.62, l), hi = smoothstep(0.55, 0.95, l);
        c *= mix(vec3(1.0), vec3(0.93, 0.92, 1.10), sh*split) * mix(vec3(1.0), vec3(1.03, 1.0, 0.95), hi*split);
        c = (c - 0.5)*con + 0.5;
        vec2 d = (vUv - 0.5)*vec2(aspect, 1.0); c *= 1.0 - vig*smoothstep(0.25, 0.75, length(d)*1.25);
        c = clamp(c, 0.0, 1.0);
        c = pow(c, vec3(uGam)) * uExp; c += uLift * (1.0 - c);               // per-set grade (SET_GRADE)
        c = clamp(mix(vec3(dot(c, vec3(0.2126,0.7152,0.0722))), c, uSat), 0.0, 1.0);
        if (uPrev > 0.0) c = mix(c, texture2D(tPrev, vUv).rgb, uPrev);       // dissolve: the other act's finished frame on top
        c = mix(c, vec3(1.0, 0.99, 0.96), uFlash);                           // full-frame white flash
        gl_FragColor = vec4(c, 1.0); }` });
  // dissolves: grab() keeps the finished frame on the canvas; the next render(o) lays it over at o.prev (0..1)
  const prevTex = new THREE.FramebufferTexture(width, height);
  gradePass.uniforms.tPrev.value = prevTex;
  function grab() { renderer.setRenderTarget(null); renderer.copyFramebufferToTexture(prevTex); }
  const crt = new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, crt);
  composer.setPixelRatio(1);
  composer.addPass(new RenderPass(scene, camera));
  const shaftPass = stage.shafts = new ShaftPass(width, height, camera, sun, nrt.depthTexture, { dens: shafts, maxD: 22, g: 0.35, k: shaftK });
  shaftPass.enabled = shafts > 0;
  composer.addPass(shaftPass);
  composer.addPass(inkPass);
  composer.addPass(dofPass);
  composer.addPass(mixPass);
  // highlights bloom too (lamps, sunlit white, specular), not only meshes marked glow()
  const hotPass = new UnrealBloomPass(new THREE.Vector2(gw, gh), hot, 0.5, 1.4);
  hotPass.enabled = hot > 0;
  composer.addPass(hotPass);
  composer.addPass(new OutputPass());
  composer.addPass(gradePass);

  const one = new Uint8Array(4);
  function render(o = {}) {
    const t0 = performance.now();
    gradePass.uniforms.uPrev.value = o.prev || 0; gradePass.uniforms.uFlash.value = Math.min(1, o.flash || 0);
    const gr = o.grade || {}; if (stage.shafts) stage.shafts.march.material.uniforms.dens.value = shafts * (gr.haze ?? 1); gradePass.uniforms.uExp.value = gr.exp ?? 1; gradePass.uniforms.uLift.value = gr.lift ?? 0; gradePass.uniforms.uGam.value = gr.gam ?? 1; gradePass.uniforms.uSat.value = gr.sat ?? 1;
    camera.updateMatrixWorld();
    autoToon();
    prepass();
    swap(m => m.userData.glow || (m.userData.noPrepass ? null : black), grt, new THREE.Color(0, 0, 0));
    bloomComposer.render();
    mixPass.uniforms.tB.value = bloomComposer.readBuffer.texture;
    composer.render();
    gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    return performance.now() - t0;
  }
  return { THREE, renderer, scene, camera, sun, hemi, fill, px, setSun, addBounce, setCamera, setDof, prop, glow, render, grab,
    passes: { ink: inkPass, grade: gradePass, dof: dofPass, shafts: shaftPass, hot: hotPass } };
}
