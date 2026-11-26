// wif5 parts f-j: code-built hand props held by a figure. A set prop (K.anim) is moved every frame, after the engine posed
// the cast, onto a figure's hand dot (or both hands' midpoint, or its chest), so a held thing touches the hand in every frame.
// The figure is found in the scene by its person() name (the cast root is named after its spec); its parts by the order
// engine/cast.js adds them: root.children[0] = body (torso first), [1] = head group, then the hand dots (16x10 spheres, L then R).
// Blender metres outside (x right, y depth, z up); three.js world inside (x, z up -> y, y -> -z).
export function holder(stage, T) {
  const roots = {};
  const fig = name => {
    if (roots[name]?.parent) return roots[name];
    let r = null; stage.scene.traverse(o => { if (!r && o.name === name && o.userData.stick) r = o; });
    return (roots[name] = r);
  };
  const v = new T.Vector3(), q = new T.Quaternion(), e = new T.Euler();
  const handsOf = r => r.children.filter(m => m.isMesh && m.geometry?.type === 'SphereGeometry' && m.geometry.parameters.widthSegments === 16
    && m.geometry.parameters.heightSegments === 10 && m.geometry.parameters.radius < 0.05);
  // where a figure's anchor is, three.js world: 'L' | 'R' hand, 'B' both hands' midpoint, 'chest', 'head', 'feet'
  function at(name, where) {
    const r = fig(name); if (!r) return null; r.updateMatrixWorld(true);
    if (where === 'L' || where === 'R' || where === 'B') {
      const h = handsOf(r); if (h.length < 2) return null;
      const L = h[0].getWorldPosition(new T.Vector3()), R = h[1].getWorldPosition(new T.Vector3());
      return where === 'L' ? L : where === 'R' ? R : L.add(R).multiplyScalar(0.5);
    }
    if (where === 'chest') { const torso = r.children[0].children[0]; const b = new T.Box3().setFromObject(torso); return b.getCenter(new T.Vector3()).setY(b.min.y + 0.70 * (b.max.y - b.min.y)); }
    if (where === 'head') return r.children[1].children[0].getWorldPosition(new T.Vector3());
    return r.getWorldPosition(new T.Vector3());
  }
  // the figure's facing (radians about world up): the root's yaw
  function yaw(name) { const r = fig(name); if (!r) return 0; r.getWorldQuaternion(q); e.setFromQuaternion(q, 'YXZ'); return e.y; }
  // hold obj at a figure's anchor: off = [right, up, forward] metres in the figure's frame; rot = [pitch, yaw, roll] deg on top
  function hold(obj, name, where, { off = [0, 0, 0], rot = [0, 0, 0], show = true } = {}) {
    const p = at(name, where), r = fig(name);
    if (!p || !show || !r?.visible) { obj.visible = false; return; }
    const y = yaw(name);
    v.set(off[0], off[1], off[2]).applyAxisAngle(new T.Vector3(0, 1, 0), y);
    obj.position.copy(p).add(v); obj.rotation.set(rot[0] * Math.PI / 180, y + rot[1] * Math.PI / 180, rot[2] * Math.PI / 180, 'YXZ'); obj.visible = true;
  }
  return { fig, at, yaw, hold };
}

// a frame window: on(f, [a, b]) is true for a <= f < b
export const on = (f, w) => w.some(([a, b]) => f >= a && f < b);

// ---------------------------------------------------------------- code-built props (three.js local frame: x right, y up,
// z the holder's forward). Every material is the set's lit standard one (K.mat), no ink, nothing flat near-white.
const sm = (T, geo, m, cast = true) => { const x = new T.Mesh(geo, m); x.castShadow = cast; x.receiveShadow = true; x.userData.noInk = true; return x; };

// a baby wrapped in a blanket: long axis along x, the face at +x looking up and to +z (the viewer when held across a chest)
// cry: the mouth open wide, tears; colour: the blanket (sRGB hex)
export function bundle(K, tex, { colour = '#7ea7cf', foldColour = '#6f93b8', cry = false, s = 1.25 } = {}) {
  const T = K.THREE, g = new T.Group(), env = 0.4, M = (c, r = 0.85) => K.mat(c, r, { env });
  const wrap = M(colour), fold = M(foldColour);
  const body = sm(T, new T.SphereGeometry(1, 28, 18), wrap); body.scale.set(0.19 * s, 0.085 * s, 0.10 * s); g.add(body);
  for (const x of [-0.06, 0.04]) { const b = sm(T, new T.TorusGeometry(0.088 * s, 0.012 * s, 8, 24), fold); b.rotation.y = Math.PI / 2; b.position.x = x * s; b.scale.set(1, 0.95, 1.12); g.add(b); }
  // drawn squeezed into the middle of the wrap (u 0.35-0.65): the sphere's equator is 2*pi*r round, so a face drawn across the
  // whole texture wraps half the head and only its middle (no features) faces the lens
  const face = tex(256, 256, (c, w) => { c.fillStyle = '#e8cbb0'; c.fillRect(0, 0, w, w); c.translate(w / 2, w * 0.5); c.scale(0.3, 0.85); c.translate(-w / 2, -w * 0.5);
    c.fillStyle = 'rgba(226,120,110,0.45)';
    for (const x of [0.28, 0.72]) { c.beginPath(); c.ellipse(x * w, 0.62 * w, 0.09 * w, 0.06 * w, 0, 0, 7); c.fill(); }
    c.strokeStyle = '#2a1a14'; c.lineWidth = 0.035 * w; c.lineCap = 'round';
    if (cry) {
      for (const x of [0.33, 0.67]) { c.beginPath(); c.moveTo((x - 0.09) * w, 0.40 * w); c.lineTo((x + 0.09) * w, 0.46 * w * (x < 0.5 ? 1 : 0.88)); c.stroke(); }
      c.fillStyle = '#5a1a1e'; c.beginPath(); c.ellipse(0.5 * w, 0.70 * w, 0.15 * w, 0.13 * w, 0, 0, 7); c.fill();
      c.fillStyle = '#d95a5a'; c.beginPath(); c.ellipse(0.5 * w, 0.76 * w, 0.08 * w, 0.05 * w, 0, 0, 7); c.fill();
      c.strokeStyle = 'rgba(90,150,220,0.9)'; c.lineWidth = 0.03 * w; for (const x of [0.22, 0.78]) { c.beginPath(); c.moveTo(x * w, 0.48 * w); c.lineTo(x * w, 0.64 * w); c.stroke(); }
    } else {
      for (const x of [0.34, 0.66]) { c.beginPath(); c.arc(x * w, 0.44 * w, 0.08 * w, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke(); }
      c.beginPath(); c.arc(0.5 * w, 0.64 * w, 0.06 * w, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke();
    } });
  const fm = K.mat('#ffffff', 0.8, { env, map: face });
  // the face is the head sphere's +z side (u 0.5 turned from +x to +z): look(cam) turns it to the lens every frame
  const hg = new T.SphereGeometry(0.068 * s, 24, 16); hg.rotateY(-Math.PI / 2);
  const head = sm(T, hg, fm); head.position.set(0.16 * s, 0.03 * s, 0.03 * s); g.add(head);
  const hood = sm(T, new T.TorusGeometry(0.074 * s, 0.026 * s, 10, 28), wrap); hood.position.z = -0.012 * s; head.add(hood);
  const back = sm(T, new T.SphereGeometry(0.08 * s, 20, 14), wrap); back.position.z = -0.03 * s; back.scale.set(1, 1, 0.7); head.add(back);
  const w = new T.Vector3();
  g.userData.look = cam => { if (!cam) return; g.updateMatrixWorld(true); w.copy(cam.position); head.lookAt(w); };
  return g;
}

// a tin of baby formula: upright cylinder, a printed wrap, a gold lid; the grip at its middle
export function tin(K, tex, { s = 1 } = {}) {
  const T = K.THREE, g = new T.Group(), R = 0.07 * s, H = 0.17 * s;
  const wrap = tex(512, 160, (c, w, h) => { c.fillStyle = '#3f7fc4'; c.fillRect(0, 0, w, h); c.fillStyle = '#f2e6c4'; c.fillRect(0, h * 0.30, w, h * 0.42);
    c.fillStyle = '#1d2f63'; c.font = `900 ${h * 0.24}px InterReel, Arial Black, sans-serif`; c.textAlign = 'center'; c.fillText('BABY MILK', w * 0.27, h * 0.60); c.fillText('BABY MILK', w * 0.77, h * 0.60);
    c.fillStyle = '#e0a63a'; for (const x of [0.27, 0.77]) { c.beginPath(); c.arc(x * w, h * 0.16, h * 0.08, 0, 7); c.fill(); } });
  const body = sm(T, new T.CylinderGeometry(R, R, H, 40), K.mat('#ffffff', 0.45, { env: 0.6, map: wrap })); g.add(body);
  const lid = sm(T, new T.CylinderGeometry(R * 1.04, R * 1.04, 0.025 * s, 40), K.mat('#c99a32', 0.3, { env: 0.7, metal: 0.6 })); lid.position.y = H / 2 + 0.012 * s; g.add(lid);
  const rim = sm(T, new T.TorusGeometry(R, 0.006 * s, 6, 40), K.mat('#8a8f98', 0.3, { metal: 0.7 })); rim.rotation.x = Math.PI / 2; rim.position.y = -H / 2; g.add(rim);
  return g;
}

// a plaid blanket: folded (a soft block, carried) or a drape (a sheet over a seated pair: w x d, sagging over the knees)
export function plaid(tex) {
  return tex(256, 256, (c, w) => { c.fillStyle = '#8c3b32'; c.fillRect(0, 0, w, w);
    for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(40,60,110,0.55)'; c.fillRect(i * w / 4 + w / 16, 0, w / 10, w); c.fillRect(0, i * w / 4 + w / 16, w, w / 10);
      c.fillStyle = 'rgba(230,190,110,0.5)'; c.fillRect(i * w / 4 + w / 5, 0, w / 40, w); c.fillRect(0, i * w / 4 + w / 5, w, w / 40); } }, { repeat: [2, 2] });
}
export function foldedBlanket(K, tex) {
  const T = K.THREE, g = new T.Group(), m = K.mat('#ffffff', 0.95, { env: 0.35, map: plaid(tex) });
  for (let i = 0; i < 3; i++) { const b = sm(T, new (T.BoxGeometry)(0.36, 0.05, 0.26), m); b.position.y = i * 0.048; b.scale.set(1 - 0.02 * i, 1, 1 - 0.02 * i); g.add(b);
    const roll = sm(T, new T.CylinderGeometry(0.026, 0.026, 0.25 - 0.006 * i, 14), m); roll.rotation.x = Math.PI / 2; roll.position.set(0.18, i * 0.048, 0); g.add(roll); }
  return g;
}
// a drape: a sheet laid as a height field over the shapes given (fn(x, z) -> top y, local), w along x, d along z
export function drape(K, tex, w, d, top, { seg = 40 } = {}) {
  const T = K.THREE, geo = new T.PlaneGeometry(w, d, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, top(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const m = K.mat('#ffffff', 0.95, { env: 0.35, map: plaid(tex), side: T.DoubleSide });
  return sm(T, geo, m);
}
