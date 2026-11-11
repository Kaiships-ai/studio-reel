// Allout set kit: physically lit set pieces for the reference look (soft CG render: bevelled edges, image-based light,
// warm practicals against cool fill, no ink on the world; only the cast is inked). Every set in allout/sets builds with it.
// Colours are sRGB hex or [r, g, b] 0..1 sRGB (art-directed by eye); geometry in Blender metres (x right, y in, z up).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export const B = (x, y, z) => new THREE.Vector3(x, z, -y);
export const col = c => typeof c === 'number' ? new THREE.Color(c) : Array.isArray(c) ? new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace) : new THREE.Color(c);
let rectInit = false;

// seeded random
export function rng(seed = 1) { let s = (seed * 9301 + 49297) % 233280 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

// canvas texture (sRGB), repeat optional
export function tex(w, h, draw, { repeat = null, srgb = true, aniso = 8 } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const hex = c => '#' + col(c).getHexString(THREE.SRGBColorSpace);
export const css = hex;

// ---------------------------------------------------------------- procedural surfaces
export const SURF = {
  // painted plaster: a soft blotchy tone so a wall never reads as flat CG
  plaster: (c, seed = 1) => tex(512, 512, (g, w, h) => { g.fillStyle = hex(c); g.fillRect(0, 0, w, h); const r = rng(seed);
    for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, s = 20 + r() * 80, a = 0.025 + r() * 0.03; g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`; g.beginPath(); g.arc(x, y, s, 0, 7); g.fill(); } }, { repeat: [1, 1] }),
  // weathered boards (study gap 8): planks with grain, dark gaps, sun-faded patches, grime toward the bottom, nail heads
  weathered: (c, seed = 6, n = 8) => tex(512, 512, (g, w, h) => { const r = rng(seed), cc = col(c), bw = h / n;
    for (let i = 0; i < n; i++) { const k = 0.86 + 0.24 * r(); g.fillStyle = `rgb(${255 * cc.r * k},${255 * cc.g * k},${255 * cc.b * k})`; g.fillRect(0, i * bw, w, bw);
      for (let j = 0; j < 9; j++) { g.strokeStyle = `rgba(0,0,0,${0.05 + 0.07 * r()})`; g.lineWidth = 1 + 2 * r(); g.beginPath(); const y = i * bw + r() * bw; g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + (r() - 0.5) * 8, w * 0.7, y + (r() - 0.5) * 8, w, y + (r() - 0.5) * 6); g.stroke(); }
      g.fillStyle = 'rgba(20,12,6,0.55)'; g.fillRect(0, i * bw, w, 3); for (const x of [w * 0.1, w * 0.9]) { g.fillStyle = 'rgba(30,25,20,0.7)'; g.beginPath(); g.arc(x, i * bw + bw / 2, 3, 0, 7); g.fill(); } }
    for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(255,250,235,${0.05 + 0.08 * r()})`; g.beginPath(); g.ellipse(r() * w, r() * h, 20 + 60 * r(), 8 + 20 * r(), 0, 0, 7); g.fill(); }
    const gr = g.createLinearGradient(0, h * 0.7, 0, h); gr.addColorStop(0, 'rgba(60,40,20,0)'); gr.addColorStop(1, 'rgba(60,40,20,0.35)'); g.fillStyle = gr; g.fillRect(0, h * 0.7, w, h * 0.3);
  }),
  // floor tiles with grout and a little tone change per tile
  tiles: (c, grout, n = 4, seed = 2) => tex(512, 512, (g, w, h) => { const r = rng(seed), s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = 0.92 + 0.12 * r(); const cc = col(c); g.fillStyle = `rgb(${255 * Math.min(1, cc.r ** (1 / 2.2) * k)},${255 * Math.min(1, cc.g ** (1 / 2.2) * k)},${255 * Math.min(1, cc.b ** (1 / 2.2) * k)})`; g.fillRect(i * s, j * s, s, s); }
    g.strokeStyle = hex(grout); g.lineWidth = 5; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.stroke(); g.beginPath(); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); } }),
  // checker lino (two colours)
  checker: (a, b, n = 8) => tex(512, 512, (g, w, h) => { const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = (i + j) % 2 ? hex(a) : hex(b); g.fillRect(i * s, j * s, s, s); } }),
  // planks along u
  wood: (c, n = 6, seed = 3) => tex(512, 512, (g, w, h) => { const r = rng(seed), s = h / n, cc = col(c);
    for (let j = 0; j < n; j++) { const k = 0.85 + 0.25 * r(); g.fillStyle = `rgb(${255 * Math.min(1, cc.r ** (1 / 2.2) * k)},${255 * Math.min(1, cc.g ** (1 / 2.2) * k)},${255 * Math.min(1, cc.b ** (1 / 2.2) * k)})`; g.fillRect(0, j * s, w, s);
      for (let q = 0; q < 14; q++) { g.strokeStyle = `rgba(0,0,0,${0.04 + 0.05 * r()})`; g.lineWidth = 1 + 2 * r(); const y = j * s + r() * s; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(w * 0.3, y + 6 * (r() - 0.5), w * 0.7, y + 6 * (r() - 0.5), w, y); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, j * s, w, 2); const x = r() * w; g.fillRect(x, j * s, 2, s); } }),
  // brick
  brick: (c, mortar, seed = 4) => tex(512, 512, (g, w, h) => { g.fillStyle = hex(mortar); g.fillRect(0, 0, w, h); const r = rng(seed), bh = h / 12, bw = w / 4, cc = col(c);
    for (let j = 0; j < 12; j++) for (let i = -1; i < 5; i++) { const k = 0.8 + 0.35 * r(); g.fillStyle = `rgb(${255 * Math.min(1, cc.r ** (1 / 2.2) * k)},${255 * Math.min(1, cc.g ** (1 / 2.2) * k)},${255 * Math.min(1, cc.b ** (1 / 2.2) * k)})`;
      g.fillRect(i * bw + (j % 2) * bw / 2 + 3, j * bh + 3, bw - 6, bh - 6); } }),
  // a soft vertical gradient (skies, backdrops, glow cards)
  grad: (stops, w = 64, h = 512) => tex(w, h, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); for (const [t, c] of stops) gr.addColorStop(t, hex(c)); g.fillStyle = gr; g.fillRect(0, 0, W, H); }),
};

// a printed label / sign: text lines on a card (bg null = transparent)
export function label(lines, { w = 512, h = 256, bg = '#f4efe2', fg = '#1b1b22', font = 'InterReel, Arial Black, sans-serif', weight = 900, size = null, border = null, align = 'center', pad = 0.08 } = {}) {
  return tex(w, h, (g, W, H) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
    if (border) { g.strokeStyle = border; g.lineWidth = W * 0.03; g.strokeRect(W * 0.03, H * 0.05, W * 0.94, H * 0.9); }
    const L = Array.isArray(lines) ? lines : [lines], n = L.length;
    L.forEach((ln, i) => {
      const t = typeof ln === 'string' ? { t: ln } : ln, s = (t.s ?? 1) * (size ?? H * 0.62 / n);
      g.font = `${t.w ?? weight} ${s}px ${font}`; g.fillStyle = t.c ?? fg; g.textAlign = align; g.textBaseline = 'middle';
      let fs = s; while (g.measureText(t.t).width > W * (1 - 2 * pad) && fs > 6) { fs *= 0.94; g.font = `${t.w ?? weight} ${fs}px ${font}`; }
      g.fillText(t.t, align === 'center' ? W / 2 : W * pad, H * (i + 0.5) / n + (t.dy ?? 0) * H);
    });
  });
}

// ---------------------------------------------------------------- environment light
// a PMREM map from a small room: sky / ceiling colour above, a horizon band, floor bounce below, plus emissive panels
// (windows, lamps) in given directions. Gives every set material soft fill and real reflections.
export function envMap(renderer, { top = [0.55, 0.62, 0.75], mid = [0.75, 0.72, 0.68], bottom = [0.35, 0.30, 0.26], panels = [] } = {}) {
  const sc = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 48, 24), c = [], p = g.attributes.position, T = col(top), M = col(mid), Bo = col(bottom);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const k = y > 0 ? M.clone().lerp(T, Math.pow(y, 0.7)) : M.clone().lerp(Bo, Math.pow(-y, 0.5)); c.push(k.r, k.g, k.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  for (const q of panels) {   // { dir: [x, y, z] Blender, size, color, power }
    const m = new THREE.Mesh(new THREE.PlaneGeometry(q.w ?? q.size ?? 3, q.h ?? q.size ?? 3), new THREE.MeshBasicMaterial({ color: col(q.color).multiplyScalar(q.power ?? 3), side: THREE.DoubleSide }));
    const d = B(...q.dir).normalize(); m.position.copy(d).multiplyScalar(8); m.lookAt(0, 0, 0); sc.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer); const rt = pm.fromScene(sc, 0.03); pm.dispose();
  return rt.texture;
}

// ---------------------------------------------------------------- the kit
export function createKit(stage, { env = {}, envK = 1.0 } = {}) {
  if (!rectInit) { RectAreaLightUniformsLib.init(); rectInit = true; }
  const root = new THREE.Group(); root.userData.noInk = true; stage.scene.add(root);
  const ENV = envMap(stage.renderer, env);
  const props = {};
  const mats = {};
  const K = {
    root, props, ENV, THREE, B,
    // materials: never toonified, never inked
    mat(c, rough = 0.6, o = {}) {
      const key = o.key; if (key && mats[key]) return mats[key];
      const m = new (o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({ color: col(c), roughness: rough, metalness: o.metal ?? 0,
        envMap: ENV, envMapIntensity: o.env ?? envK, map: o.map || null, emissive: o.emit ? col(o.emit) : new THREE.Color(0), emissiveIntensity: o.emitK ?? 1,
        transparent: !!o.opacity && o.opacity < 1, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, depthWrite: o.depthWrite ?? !(o.opacity < 1),
        ...(o.physical ? { clearcoat: o.clearcoat ?? 0, clearcoatRoughness: o.ccRough ?? 0.2, sheen: o.sheen ?? 0, sheenColor: o.sheenColor ? col(o.sheenColor) : new THREE.Color(0) } : {}) });
      if (o.map && o.repeat) { o.map.wrapS = o.map.wrapT = THREE.RepeatWrapping; o.map.repeat.set(...o.repeat); }
      m.userData.noToon = true; if (key) mats[key] = m; return m;
    },
    glass(c = [0.85, 0.95, 1.0], o = {}) {
      const m = new THREE.MeshPhysicalMaterial({ color: col(c), roughness: o.rough ?? 0.05, metalness: 0, envMap: ENV, envMapIntensity: o.env ?? 1.6,
        transparent: true, opacity: o.opacity ?? 0.28, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide, specularIntensity: 1 });
      m.userData.noToon = true; return m;
    },
    glow(c, k = 2) { const m = new THREE.MeshBasicMaterial({ color: col(c).multiplyScalar(k), toneMapped: true }); m.userData.noToon = true; return m; },
    add(m, parent = root, { cast = true, recv = true } = {}) { m.traverse(o => { if (o.isMesh) { o.castShadow = cast; o.receiveShadow = recv; o.userData.noInk = true; } }); parent.add(m); return m; },
    group(at = [0, 0, 0], rotZ = 0, parent = root) { const g = new THREE.Group(); g.position.copy(B(...at)); g.rotation.y = rotZ * Math.PI / 180; g.userData.noInk = true; parent.add(g); return g; },
    // bevelled box from corner lo to hi (r = bevel radius)
    box(lo, hi, m, { r = 0.012, parent = root, cast = true, seg = 2 } = {}) {
      const a = B(...lo), b = B(...hi), sx = Math.abs(b.x - a.x), sy = Math.abs(b.y - a.y), sz = Math.abs(b.z - a.z);
      const rr = Math.min(r, sx / 2.01, sy / 2.01, sz / 2.01);
      const geo = rr > 0.0005 ? new RoundedBoxGeometry(sx, sy, sz, seg, rr) : new THREE.BoxGeometry(sx, sy, sz);
      const x = new THREE.Mesh(geo, m); x.position.copy(a).add(b).multiplyScalar(0.5); return K.add(x, parent, { cast });
    },
    // box by centre + size [sx (x), sy (y depth), sz (height)], local to parent
    cube(at, size, m, { r = 0.012, parent = root, rotZ = 0, cast = true } = {}) {
      const rr = Math.min(r, ...size.map(s => s / 2.01));
      const geo = rr > 0.0005 ? new RoundedBoxGeometry(size[0], size[2], size[1], 2, rr) : new THREE.BoxGeometry(size[0], size[2], size[1]);
      const x = new THREE.Mesh(geo, m); x.position.copy(B(...at)); x.rotation.y = rotZ * Math.PI / 180; return K.add(x, parent, { cast });
    },
    cyl(at, r, h, m, { r2 = r, seg = 32, parent = root, open = false, cast = true, axis = 'z' } = {}) {
      const x = new THREE.Mesh(new THREE.CylinderGeometry(r2, r, h, seg, 1, open), m); x.position.copy(B(...at));
      if (axis === 'x') x.rotation.z = Math.PI / 2; if (axis === 'y') x.rotation.x = Math.PI / 2;
      return K.add(x, parent, { cast });
    },
    sphere(at, r, m, { parent = root, sx = 1, sy = 1, sz = 1, seg = 32 } = {}) {
      const x = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.round(seg * 0.6)), m); x.position.copy(B(...at)); x.scale.set(sx, sz, sy); return K.add(x, parent);
    },
    // lathe: profile [[r, z], ...] upright at `at`
    lathe(at, prof, m, { parent = root, seg = 40 } = {}) {
      const x = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, z]) => new THREE.Vector2(r, z)), seg), m); x.position.copy(B(...at)); return K.add(x, parent);
    },
    torus(at, R, r, m, { parent = root, arc = Math.PI * 2, rx = Math.PI / 2, seg = 48 } = {}) {
      const x = new THREE.Mesh(new THREE.TorusGeometry(R, r, 12, seg, arc), m); x.position.copy(B(...at)); x.rotation.x = rx; return K.add(x, parent);
    },
    // a flat card (poster, sign, painted backdrop) facing -y (the camera side) unless rotZ; emissive = self-lit (sky)
    card(at, w, h, map, { parent = root, rotZ = 0, rotX = 0, emissive = 0, rough = 0.8, cast = false, transparent = false, env = 0.5, fog = !emissive } = {}) {
      // fog: a self-lit sky never takes the act haze (it is the haze's colour); a distant self-lit range can (fog: true)
      const m = emissive ? new THREE.MeshBasicMaterial({ map, color: new THREE.Color(emissive, emissive, emissive), transparent, depthWrite: !transparent, fog })
        : new THREE.MeshStandardMaterial({ map, roughness: rough, envMap: ENV, envMapIntensity: env, transparent, alphaTest: transparent ? 0.02 : 0 });
      m.userData.noToon = true;
      const x = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); x.position.copy(B(...at)); x.rotation.order = 'YXZ'; x.rotation.y = rotZ * Math.PI / 180; x.rotation.x = rotX * Math.PI / 180;
      x.userData.noPrepass = !!emissive; return K.add(x, parent, { cast, recv: !emissive });
    },
    // lights (Blender coordinates)
    point(at, c, power = 2, dist = 6, { shadow = false, parent = root } = {}) {
      const l = new THREE.PointLight(col(c), power, dist, 2); l.position.copy(B(...at)); if (shadow) { l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.002; l.shadow.radius = 4; } parent.add(l); return l;
    },
    spot(at, target, c, power = 10, { angle = 35, pen = 0.6, dist = 12, shadow = true, parent = root } = {}) {
      const l = new THREE.SpotLight(col(c), power, dist, angle * Math.PI / 180, pen, 2); l.position.copy(B(...at)); l.target.position.copy(B(...target));
      if (shadow) { l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.bias = -0.0005; l.shadow.radius = 3; }
      parent.add(l, l.target); return l;
    },
    // a soft window / panel light: RectAreaLight at `at`, facing `target`
    area(at, target, w, h, c, power = 4, { parent = root } = {}) {
      const l = new THREE.RectAreaLight(col(c), power, w, h); l.position.copy(B(...at)); l.lookAt(B(...target)); parent.add(l); return l;
    },
    // planks (study gap 8): a deck, a wall or a boardwalk as separate boards with gaps, each a little off in height, tone and
    // angle: lo / hi corners like box(); along 'x' | 'y' = the boards' length; board (m) width; gap (m); m: a material or an array
    planks(lo, hi, m, { along = 'y', board = 0.16, gap = 0.012, parent = root, seed = 5 } = {}) {
      const r = rng(seed), ax = along === 'x' ? 1 : 0, span = ax ? hi[1] - lo[1] : hi[0] - lo[0], n = Math.max(1, Math.round(span / board)), w = span / n, out = [];
      for (let i = 0; i < n; i++) { const a = (ax ? lo[1] : lo[0]) + i * w, z = hi[2] + (r() - 0.5) * 0.008, mm = Array.isArray(m) ? m[Math.floor(r() * m.length)] : m;
        const L = ax ? [lo[0], a + gap / 2, lo[2]] : [a + gap / 2, lo[1], lo[2]], H = ax ? [hi[0], a + w - gap / 2, z] : [a + w - gap / 2, hi[1], z];
        const b = K.box(L, H, mm, { r: 0.006, parent }); b.rotation.z = (r() - 0.5) * 0.004; out.push(b); }
      return out;
    },
    // extras (study gap 8): background people as simple inked-free silhouettes (a body, a head, a hat), to fill a street or a
    // crowd far from the lens where the haze softens them. list: [{ at: [x, y, z], yaw, body: rgb, head: rgb, hat: rgb|null, s }]
    extras(list, { parent = root } = {}) {
      for (const e of list) { const g = K.group(e.at, e.yaw ?? 0, parent), s = e.s ?? 1;
        K.cyl([0, 0, 0.42 * s], 0.025 * s, 0.84 * s, K.mat([0.08, 0.08, 0.09], 0.8), { parent: g }); K.cyl([0, 0, 0.95 * s], 0.16 * s, 0.5 * s, K.mat(e.body || [0.6, 0.3, 0.2], 0.85), { parent: g });
        K.sphere([0, 0, 1.38 * s], 0.2 * s, K.mat(e.head || [0.95, 0.93, 0.88], 0.9), { parent: g, sy: 1.0, sz: 1.15 });
        if (e.hat) { K.cyl([0, 0, 1.6 * s], 0.32 * s, 0.03 * s, K.mat(e.hat, 0.8), { parent: g }); K.cyl([0, 0, 1.68 * s], 0.16 * s, 0.16 * s, K.mat(e.hat, 0.8), { parent: g }); } }
    },
    // skyDome (study): a sky that rides the camera (a back-faced sphere inside the far plane, re-centred on the lens just
    // before it draws, never culled, no fog, no depth write): deep blue at the zenith, pale at the horizon, cartoon clouds in
    // a band above it. A texture as scene.background is not safe in this pipeline (a dark rectangle showed up in the post).
    skyDome({ zenith = '#3a8bf0', mid = '#72b2f5', horizon = '#e2f0fb', clouds = 16, seed = 11, r = 60 } = {}) {
      const t = tex(2048, 1024, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h / 2); gr.addColorStop(0, zenith); gr.addColorStop(0.6, mid); gr.addColorStop(1, horizon);
        g.fillStyle = gr; g.fillRect(0, 0, w, h / 2); g.fillStyle = horizon; g.fillRect(0, h / 2, w, h / 2); const q = rng(seed);
        for (let i = 0; i < clouds; i++) { const cx = q() * w, cy = h * (0.3 + 0.15 * q()), s = 18 + 26 * q();
          for (let k = 0; k < 6; k++) { g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(cx + (k - 2.5) * s * 0.55, cy - Math.abs(Math.sin(k * 1.3)) * s * 0.35, s * (0.45 + 0.2 * q()), s * 0.36, 0, 0, 7); g.fill(); }
          g.fillStyle = 'rgba(190,215,240,0.9)'; g.fillRect(cx - s * 1.7, cy + s * 0.12, s * 3.4, s * 0.12); } });
      const m = new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, depthWrite: false, fog: false }); m.userData.noToon = true;
      const d = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), m); d.frustumCulled = false; d.renderOrder = -10; d.userData.noPrepass = true; d.userData.noInk = true;
      d.onBeforeRender = (rd, sc, cam) => { d.position.copy(cam.position); d.updateMatrixWorld(); d.modelViewMatrix.multiplyMatrices(cam.matrixWorldInverse, d.matrixWorld); };
      root.add(d); return d;
    },
    prop(name, obj, { grip = null } = {}) { obj.name = name; obj.userData.rest = { pos: K.toB(obj.position), rot: obj.rotation.y }; if (grip) obj.userData.grip = grip; props[name] = obj; return obj; },
    // a named thing the reel can key (allout/fx.js ao_anim): anim(f, v) runs every frame after the engine posed the props
    anim(name, obj, fn) { obj.name = name; obj.userData.anim = fn; props[name] = obj; return obj; },
    toB: v => [v.x, -v.z, v.y],
  };
  return K;
}

// ---------------------------------------------------------------- common pieces
// a room shell: floor, back wall, side walls, ceiling, skirting. Opening on the -y side for the camera.
export function room(K, { x0 = -4, x1 = 4, y0 = -6, y1 = 3, h = 3.2, wall, floor, ceil, skirt = null, side = null, ceiling = true, doorR = null } = {}) {
  K.box([x0 - 0.3, y0, -0.2], [x1 + 0.3, y1 + 0.3, 0], floor, { r: 0 });
  K.box([x0 - 0.3, y1, 0], [x1 + 0.3, y1 + 0.25, h], wall, { r: 0 });
  K.box([x0 - 0.25, y0, 0], [x0, y1, h], side || wall, { r: 0 });
  if (doorR) { const [a, b, zh] = doorR; K.box([x1, y0, 0], [x1 + 0.25, a, h], side || wall, { r: 0 }); K.box([x1, b, 0], [x1 + 0.25, y1, h], side || wall, { r: 0 }); K.box([x1, a, zh], [x1 + 0.25, b, h], side || wall, { r: 0 }); }
  else K.box([x1, y0, 0], [x1 + 0.25, y1, h], side || wall, { r: 0 });
  if (ceiling) K.box([x0 - 0.3, y0, h], [x1 + 0.3, y1 + 0.3, h + 0.15], ceil || wall, { r: 0, cast: false });
  if (skirt) { K.box([x0, y1 - 0.025, 0], [x1, y1, 0.12], skirt, { r: 0.004 }); K.box([x0, y0, 0], [x0 + 0.025, y1, 0.12], skirt, { r: 0.004 }); K.box([x1 - 0.025, y0, 0], [x1, y1, 0.12], skirt, { r: 0.004 }); }
}

// a window in a wall facing -y: frame, mullions, glass, a painted view behind (emissive), optional blinds
export function windowY(K, { cx, y, z0, w, h, frame, view, viewK = 1.4, blinds = null, mull = [2, 2], depth = 0.12, parent = K.root }) {
  const t = 0.05;
  K.box([cx - w / 2 - t, y - depth, z0 - t], [cx + w / 2 + t, y + 0.02, z0], frame, { parent }); K.box([cx - w / 2 - t, y - depth, z0 + h], [cx + w / 2 + t, y + 0.02, z0 + h + t], frame, { parent });
  K.box([cx - w / 2 - t, y - depth, z0], [cx - w / 2, y + 0.02, z0 + h], frame, { parent }); K.box([cx + w / 2, y - depth, z0], [cx + w / 2 + t, y + 0.02, z0 + h], frame, { parent });
  for (let i = 1; i < mull[0]; i++) K.box([cx - w / 2 + w * i / mull[0] - 0.015, y - 0.05, z0], [cx - w / 2 + w * i / mull[0] + 0.015, y - 0.01, z0 + h], frame, { parent });
  for (let j = 1; j < mull[1]; j++) K.box([cx - w / 2, y - 0.05, z0 + h * j / mull[1] - 0.015], [cx + w / 2, y - 0.01, z0 + h * j / mull[1] + 0.015], frame, { parent });
  K.box([cx - w / 2 - 0.12, y - depth - 0.12, z0 - t - 0.04], [cx + w / 2 + 0.12, y - depth + 0.02, z0 - t], frame, { parent });   // sill
  if (view) K.card([cx, y + 0.9, z0 + h / 2], w * 2.2, h * 2.0, view, { emissive: viewK, parent });
  if (blinds) for (let j = 0; j < Math.floor(h * blinds.n); j++) {
    const z = z0 + h - (j + 0.5) / blinds.n; const sl = K.box([cx - w / 2, y - 0.09, z - 0.012], [cx + w / 2, y - 0.07, z + 0.012], blinds.mat, { r: 0.003, parent }); sl.rotation.x = (blinds.tilt ?? 0.6);
  }
}
