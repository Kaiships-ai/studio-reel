// Stick-man stage: renderer, sun + sky + fake bounce, toon-leaning materials, prop-only ink, lens blur, glow, grade.
// Everything here is deterministic; a frame is a pure function of what the caller set before stage.render().
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const PROPS = 1;                                            // layer that gets the ink line
export const B = (x, y, z) => new THREE.Vector3(x, z, -y);         // Blender Z-up -> three Y-up
export const lin = (r, g, b) => new THREE.Color(r, g, b);          // colours are linear, like Blender's
const s8 = c => Math.round(255 * Math.min(1, Math.max(0, c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)));
export const css = (c, k = 1) => `rgb(${s8(c[0] * k)},${s8(c[1] * k)},${s8(c[2] * k)})`;
export const INK_RGB = [0.006, 0.006, 0.009];

// Toon-leaning material. Only the SUN (light 0, with its shadow) picks the point on the ramp, so window bars and
// prop shadows fall across a head as a cool lilac patch; the other lights just lift the shade a little.
// sheen = tight specular, broad = wide soft highlight on the sunlit side.
export function toon(rgb, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: lin(...rgb), roughness: o.rough ?? 0.45, metalness: 0, map: o.map || null });
  const U = {
    uShade: { value: lin(...(o.shade || [0.66, 0.64, 0.90])) }, uGain: { value: o.gain ?? 1.0 },
    uSheen: { value: o.sheen ?? 0.15 }, uBroad: { value: o.broad ?? 0.0 }, uRim: { value: o.rim ?? 0.35 },
  };
  m.userData.toon = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = 'uniform vec3 uShade; uniform float uGain, uSheen, uBroad, uRim;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `
      float sunL = 0.0; vec3 sunD = vec3(0.0, 1.0, 0.0);
      #if NUM_DIR_LIGHTS > 0
        sunD = directionalLights[ 0 ].direction;
        sunL = saturate(dot(geometryNormal, sunD));
        #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
          DirectionalLightShadow dls = directionalLightShadows[ 0 ];
          sunL *= getShadow( directionalShadowMap[ 0 ], dls.shadowMapSize, dls.shadowIntensity, dls.shadowBias, dls.shadowRadius, vDirectionalShadowCoord[ 0 ] );
        #endif
      #endif
      float k = smoothstep(0.02, 0.22, sunL);
      vec3 dif = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      float alb = max(dot(diffuseColor.rgb, vec3(0.3333)), 1e-3);
      float amb = clamp(dot(dif, vec3(0.3333)) / alb * 3.14159 / 3.0, 0.0, 1.0);
      float fr = pow(1.0 - saturate(dot(geometryNormal, geometryViewDir)), 2.2) * uRim;
      vec3 shade = uShade * (0.88 + 0.12 * amb);
      vec3 col = diffuseColor.rgb * mix(shade, vec3(uGain), k * (1.0 - fr));
      col += reflectedLight.directSpecular * uSheen + totalEmissiveRadiance;
      col += vec3(1.0, 0.97, 0.92) * uBroad * k * pow(saturate(dot(geometryNormal, normalize(sunD + geometryViewDir))), 5.0);
      gl_FragColor = vec4(col, diffuseColor.a);`);
  };
  return m;
}

export function std(rgb, rough, o = {}) {
  return new THREE.MeshStandardMaterial({ color: lin(...rgb), roughness: rough, metalness: 0, ...o });
}

const FS_QUAD_V = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';

export function createStage({ width, height, exposure = 1.0, ink = 2.6, sat = 1.0, con = 1.06, vig = 0.24, split = 0.5, bloom = 0.9 } = {}) {
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
  sun.shadow.bias = -0.0002; sun.shadow.normalBias = 0.006; sun.shadow.radius = 1.6;
  scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight(lin(0.44, 0.60, 1.0), lin(0.80, 0.68, 0.58), 1.15);
  scene.add(hemi);
  const fill = new THREE.DirectionalLight(lin(0.80, 0.84, 1.0), 0.45);
  scene.add(fill, fill.target);

  function setSun(dirB, centerB, half = 6) {
    const d = B(...dirB).normalize();
    sun.target.position.copy(B(...centerB));
    sun.position.copy(sun.target.position).addScaledVector(d, -30);
    Object.assign(sun.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 10, far: 50 });
    sun.shadow.camera.updateProjectionMatrix();
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
  const prepass = () => swap(m => m.userData.noPrepass ? null : (m.layers.isEnabled(PROPS) ? idMat(m) : NM[0]), nrt, null);

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
        gl_FragColor = vec4(mix(c.rgb, vec3(0.0008, 0.0008, 0.0012), clamp(a*1.1, 0.0, 1.0)), c.a);
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
    dofPass.uniforms.maxR.value = (o.px ?? 14) * px; dofPass.uniforms.gain.value = o.gain ?? 2.0; dofPass.enabled = true;
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
      aspect: { value: width / height }, tPrev: { value: null }, uPrev: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: FS_QUAD_V,
    fragmentShader: `uniform sampler2D tDiffuse, tPrev; uniform float sat, con, vig, split, aspect, uPrev, uFlash; varying vec2 vUv;
      void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = dot(c, vec3(0.2126,0.7152,0.0722));
        c = mix(vec3(l), c, sat);
        // split tone: shade leans blue-lilac, light leans warm, like the sunlit reference sets
        float sh = 1.0 - smoothstep(0.12, 0.62, l), hi = smoothstep(0.55, 0.95, l);
        c *= mix(vec3(1.0), vec3(0.93, 0.92, 1.10), sh*split) * mix(vec3(1.0), vec3(1.03, 1.0, 0.95), hi*split);
        c = (c - 0.5)*con + 0.5;
        vec2 d = (vUv - 0.5)*vec2(aspect, 1.0); c *= 1.0 - vig*smoothstep(0.25, 0.75, length(d)*1.25);
        c = clamp(c, 0.0, 1.0);
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
  composer.addPass(inkPass);
  composer.addPass(dofPass);
  composer.addPass(mixPass);
  composer.addPass(new OutputPass());
  composer.addPass(gradePass);

  const one = new Uint8Array(4);
  function render(o = {}) {
    const t0 = performance.now();
    gradePass.uniforms.uPrev.value = o.prev || 0; gradePass.uniforms.uFlash.value = Math.min(1, o.flash || 0);
    camera.updateMatrixWorld();
    prepass();
    swap(m => m.userData.glow || (m.userData.noPrepass ? null : black), grt, new THREE.Color(0, 0, 0));
    bloomComposer.render();
    mixPass.uniforms.tB.value = bloomComposer.readBuffer.texture;
    composer.render();
    gl.finish(); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, one);
    return performance.now() - t0;
  }
  return { THREE, renderer, scene, camera, sun, hemi, fill, px, setSun, addBounce, setCamera, setDof, prop, glow, render, grab,
    passes: { ink: inkPass, grade: gradePass, dof: dofPass } };
}
