// ch/c3_graphify.js · "Three, Graphify." paper storm around the data-scientist navigator on the nose → pages fold into a
// glowing node graph on "knowledge" → storm stops dead and drops on "stops" → two stray pages flip on "again", swatted away →
// the graph shrinks into a hologram on slot p3. Pure function of t.
import { yawTo, THREE, V, W, WE, ez, pulse, pop, pose, clawd, BL, hsh, lerp, clamp, ss, seg, camPath, shake } from './kit.js';

export default async function build(ctx) {
  const { S, car, driver, ch } = ctx;
  const group = new THREE.Group();
  const T0 = ch.t0, T1 = ch.t1;
  const Tg = W('p3a', 'Graphify'), Tk = W('p3b', 'knowledge'), Ts = W('p3b', 'stops');
  const Ta1 = W('p3b', 'again', 1), Ta2 = W('p3b', 'again', 2), Tsh = WE('p3b', 'again', 1) - 0.15;

  // ---------------------------------------------------------------- navigator on the nose
  const nav = clawd(S.scene, 'data-scientist'); group.add(nav.group);
  const NAV = V(1.32, 0.24, 0.02), NAV_BL = BL(T0, T1, 2.6, 7);
  const navYaw = 0.55;

  // ---------------------------------------------------------------- pages (instanced)
  const pc = document.createElement('canvas'); pc.width = 128; pc.height = 170; const pg = pc.getContext('2d');
  pg.fillStyle = '#fbf8f0'; pg.fillRect(0, 0, 128, 170); pg.fillStyle = '#d8622f'; pg.fillRect(12, 14, 60, 9);
  pg.fillStyle = '#8b8f99'; for (let r = 0; r < 11; r++) pg.fillRect(12 + (r % 3) * 8, 34 + r * 12, 50 + (hsh(r, 4) * 50), 5);
  const ptex = new THREE.CanvasTexture(pc); ptex.colorSpace = THREE.SRGBColorSpace;
  const N = 64, M = 22;                                           // M pages fold into graph nodes
  const pages = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.17), new THREE.MeshStandardMaterial({ map: ptex, side: THREE.DoubleSide, roughness: 0.8 }), N);
  pages.castShadow = true; pages.frustumCulled = false; group.add(pages);

  // ---------------------------------------------------------------- knowledge graph (nodes + edges)
  const GC = V(1.2, 1.0, 0.05), GR = 0.36;
  const nodeL = [];
  for (let i = 0; i < M; i++) {                                   // fibonacci sphere + jitter
    const y = 1 - 2 * (i + 0.5) / M, r = Math.sqrt(1 - y * y), a = i * 2.39996;
    const k = 0.65 + 0.35 * hsh(i, 9);
    nodeL.push(V(Math.cos(a) * r * k, y * k * 0.85, Math.sin(a) * r * k).multiplyScalar(GR));
  }
  const edges = [];
  for (let i = 0; i < M; i++) {
    const d = nodeL.map((p, j) => [p.distanceTo(nodeL[i]), j]).filter(x => x[1] !== i).sort((a, b) => a[0] - b[0]);
    for (const [, j] of d.slice(0, 3)) if (!edges.some(e => (e[0] === i && e[1] === j) || (e[0] === j && e[1] === i))) edges.push([i, j]);
  }
  const blue = '#4fb3ff';
  const nodeMat = new THREE.MeshStandardMaterial({ color: '#bfe4ff', emissive: blue, emissiveIntensity: 2.2, roughness: 0.3 });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.038, 16, 12), nodeMat, M); nodes.frustumCulled = false; group.add(nodes);
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.06, 20, 16), nodeMat); group.add(hub);
  const lineGeo = new THREE.BufferGeometry(); lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(edges.length * 6), 3));
  const lineMat = new THREE.LineBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lines = new THREE.LineSegments(lineGeo, lineMat); lines.frustumCulled = false; group.add(lines);
  const glow = new THREE.PointLight(blue, 0, 2.5, 2); group.add(glow);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(GR * 1.25, 24, 16), new THREE.MeshBasicMaterial({ color: blue, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  group.add(halo);

  // ---------------------------------------------------------------- hologram on slot p3 (car upgrade)
  const holo = new THREE.Group(); car.slot.p3.add(holo); holo.position.set(0, 0.12, 0);
  const hNodes = [], HN = 9, hs = 0.09;
  const hPts = [];
  for (let i = 0; i < HN; i++) { const p = nodeL[i * 2].clone().multiplyScalar(hs / GR * 1.4); hPts.push(p);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), nodeMat); m.position.copy(p); holo.add(m); hNodes.push(m); }
  const hl = []; for (let i = 0; i < HN; i++) { const j = (i + 1) % HN, k = (i + 4) % HN; hl.push(...hPts[i].toArray(), ...hPts[j].toArray(), ...hPts[i].toArray(), ...hPts[k].toArray()); }
  const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(hl, 3));
  holo.add(new THREE.LineSegments(hg, new THREE.LineBasicMaterial({ color: '#8fd0ff', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 20), new THREE.MeshStandardMaterial({ color: '#1b1d22', emissive: blue, emissiveIntensity: 0.6 }));
  base.position.y = -0.1; holo.add(base);
  const holoState = (t) => { holo.rotation.y = t * 1.2; holo.position.y = 0.12 + 0.015 * Math.sin(t * 3); };

  // ---------------------------------------------------------------- camera (v2 ADHD: one beat per word via camPath, jolts on hits)
  const T3 = W('p3a', 'Three'), Tc = W('p3b', 'codebase'), Tf = W('p3b', 'files');
  const K = [
    { t: T0, pos: V(3.9, 1.05, 3.8), tgt: V(1.2, 0.5, 0.0), fov: 38 },                              // WIDE drift in
    { t: T3, d: 0.25, pos: V(2.7, 0.78, 2.3), tgt: V(1.3, 0.55, 0.0), fov: 36, roll: 0.04 },      // whip into the storm (MED)
    { t: Tg, d: 0.4, pos: V(2.5, 0.72, 2.0), tgt: V(1.32, 0.48, 0.02), fov: 34, roll: -0.03 },    // push-through to navigator (CU)
    { t: Tc, d: 0.3, pos: V(4.6, 1.6, 2.6), tgt: V(1.1, 0.55, 0.0), fov: 42, orbit: 0.3 },                 // fast orbit WIDE
    { t: Tk - 0.1, d: 0.5, pos: V(2.6, 1.15, 1.8), tgt: V(1.22, 0.64, 0.05), fov: 37 },           // crane up to the graph (CU)
    { t: Ts, d: 0.2, pos: V(2.35, 0.95, 1.75), tgt: V(1.25, 0.6, 0.02), fov: 33, roll: 0.05 },                 // crash zoom as the storm drops
    { t: Tf, d: 0.35, pos: V(3.1, 0.92, 2.6), tgt: V(1.3, 0.42, 0.3), fov: 36 },                   // pull back MED
    { t: Ta1, d: 0.18, pos: V(2.5, 0.7, 2.0), tgt: V(1.45, 0.4, 0.35), fov: 34, roll: -0.04 },               // snap ECU on the swat
    { t: Ta2, d: 0.25, pos: V(2.95, 0.82, 2.1), tgt: V(1.3, 0.45, 0.1), fov: 36, roll: 0.03 },     // whip with the last page
  ];
  const JOLT = [Ts + 0.1, Ta1 + 0.08, Ta2 + 0.08];
  const cam = (t) => {
    const c = camPath(t, K); c.pos.x += 0.06 * Math.sin(t * 2.1); c.pos.z += 0.06 * Math.cos(t * 1.7); const tgt = c.tgt.add(shake(t, JOLT, 0.035));
    return { pos: c.pos, tgt, fov: c.fov, roll: c.roll, focus: V(1.3, 0.55 + 0.35 * ez(t, Tk - 0.1, 0.5) * (1 - ez(t, Ts, 0.2)), 0.02), aperture: 0.45 };
  };

  // ---------------------------------------------------------------- page motion
  const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), SC = V(), P = V();
  const storm = (i, t) => {
    const a = hsh(i, 1) * 6.283, sp = 1.6 + 1.4 * hsh(i, 2), r = 0.42 + 0.5 * hsh(i, 3), h = 0.08 + 0.95 * hsh(i, 4);
    const k = 0.45 + 0.55 * ez(t, Tg - 0.15, 0.3), th = a + t * sp * (0.6 + 0.4 * k);
    return V(NAV.x + Math.cos(th) * r * (0.7 + 0.3 * k), NAV.y + h + 0.06 * Math.sin(t * 5 + i), NAV.z + Math.sin(th) * r * (0.7 + 0.3 * k));
  };
  const stormRot = (i, t) => E.set(t * (2 + 3 * hsh(i, 5)) + i, t * (1.5 + 2 * hsh(i, 6)), t * (3 * hsh(i, 7) - 1.5));
  const SPOT = [V(1.85, 0.012, 0.75), V(1.35, 0.012, 0.85)];
  const graphRot = (t) => (t - Tk) * 0.9;
  const nodeW = (i, t, s = 1) => { const p = nodeL[i].clone().multiplyScalar(s); p.applyAxisAngle(V(0, 1, 0), graphRot(t)); return p.add(GC); };
  const holoW = () => { car.g.updateMatrixWorld(true); return car.slot.p3.localToWorld(V(0, 0.12, 0)); };

  function clearFace(p, face, camPos, RR = 0.34) {                          // push a page off the camera → face sight line
    const d = face.clone().sub(camPos), L = d.length(); d.normalize();
    const v = p.clone().sub(camPos), s = clamp(v.dot(d), 0, L + 0.3), q = camPos.clone().addScaledVector(d, s), off = p.clone().sub(q), dist = off.length();
    const R = RR * clamp(s / L, 0.3, 1); if (dist < R) { if (dist < 1e-4) off.set(1, 0.3, 0); p.copy(q).addScaledVector(off.normalize(), R); }
  }

  function update(t) {
    // shrink into the slot
    const sh = ez(t, Tsh, 0.45);
    car.slot.p3.visible = sh > 0.85; holoState(t);
    holo.scale.setScalar(car.slot.p3.visible ? 0.6 + 0.4 * pop(t, Tsh + 0.38, 3.4, 7) : 0);

    // navigator
    const swat = (ta) => pulse(t, ta + 0.08, 1, 0.3);
    const sw = Math.max(swat(Ta1), swat(Ta2));
    const awe = ez(t, Tk, 0.3);
    const camPos = cam(t).pos;
    const nv = pose(nav, t, { pos: NAV, yaw: yawTo(NAV, camPos) + 0.25 * sw, bow: -0.25 * awe * (1 - ez(t, Ts, 0.3)), seed: 5, blinkTimes: NAV_BL,
      hops: [[Tg, Tg + 0.3, 0.07], [Tk + 0.05, Tk + 0.35, 0.05], [Ta1 + 0.05, Ta1 + 0.25, 0.04], [Ta2 + 0.05, Ta2 + 0.25, 0.04]],
      armL: t < Tk ? 0.6 + 0.4 * Math.abs(Math.sin(t * 9)) * ez(t, Tg - 0.1, 0.2) : 0.9 * (1 - ez(t, Ts, 0.3)) + sw * 0.2,
      armR: t < Tk ? 0.6 + 0.4 * Math.abs(Math.cos(t * 9)) * ez(t, Tg - 0.1, 0.2) : sw + 0.9 * (1 - ez(t, Ts, 0.3)),
      roll: 0.15 * Math.sin(t * 11) * (t < Tk ? ez(t, Tg - 0.1, 0.2) : 0) - 0.1 * sw,
      expr: t < Tg - 0.1 ? 'worried' : t < Tk ? 'wide' : t < Ta1 ? 'happy' : sw > 0.3 ? 'squint' : 'happy',
      look: t < Tk ? [Math.sin(t * 7) * 0.6, 0.3] : t < Ts ? [0, 1] : [0.4 * sw, 0] });
    ctx.nav = nv;

    // driver reacts
    car.g.updateMatrixWorld(true);
    ctx.driverPose = pose(driver, t, { pos: car.g.localToWorld(car.seat.clone()), yaw: Math.PI / 2, seed: 2, blinkTimes: BL(T0, T1, 3, 3),
      hops: [[Tk + 0.1, Tk + 0.35, 0.03]], expr: t < Tk ? 'worried' : t < Ts ? 'wide' : 'happy',
      look: t < Tk ? [0.6, 0.2] : [0.3, 1], armL: 0.7 * ez(t, Ts, 0.3) * (1 - ez(t, Tsh, 0.4)) });

    // graph
    const gIn = ez(t, Tk, 0.2), gs = lerp(1, 0.18, sh);
    const center = GC.clone().lerp(holoW(), sh);
    for (let i = 0; i < M; i++) {
      const tn = Tk + i * 0.009, k = pop(t, tn, 5, 7);
      const p = nodeW(i, t, gs).sub(GC).add(center);
      M4.compose(p, Q.identity(), SC.setScalar(k * (1 + 0.25 * pulse(t, tn, 1, 0.3)) * lerp(1, 0.5, sh) * (sh > 0.97 ? 0 : 1))); nodes.setMatrixAt(i, M4);
    }
    nodes.instanceMatrix.needsUpdate = true;
    hub.position.copy(center); hub.scale.setScalar(pop(t, Tk, 5, 7) * lerp(1, 0.4, sh) * (sh > 0.97 ? 0 : 1));
    const pa = lineGeo.attributes.position.array;
    edges.forEach(([a, b], e) => { const A = nodeW(a, t, gs).sub(GC).add(center), B = nodeW(b, t, gs).sub(GC).add(center); pa.set([...A.toArray(), ...B.toArray()], e * 6); });
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.9 * gIn * (1 - ez(t, Tsh + 0.3, 0.12));
    glow.position.copy(center); glow.intensity = 3 * gIn * (1 - 0.6 * sh) + 4 * pulse(t, Tk, 1, 0.4);
    halo.position.copy(center); halo.scale.setScalar(gs); halo.material.opacity = (0.08 * gIn + 0.15 * pulse(t, Tk, 1, 0.4)) * (1 - sh);

    // pages
    for (let i = 0; i < N; i++) {
      let s = 1;
      if (i < M) {                                                   // fold into node i
        const u = ez(t, Tk - 0.22 + i * 0.009, 0.22);
        P.copy(storm(i, Math.min(t, Tk))).lerp(nodeW(i, t, gs).sub(GC).add(center), u); stormRot(i, t);
        s = 1 - u; if (u < 1) { E.x += u * 4; }
      } else if (t < Ts) { P.copy(storm(i, t)); stormRot(i, t); }
      else {                                                         // stops dead (hold 3 f), then drops flat
        const p0 = storm(i, Ts), dt = Math.max(0, t - Ts - 0.1), j = i - M;
        stormRot(i, Ts);
        const yf = p0.y - 0.5 * 9.8 * dt * dt, land = yf <= 0.012;
        P.set(p0.x, Math.max(0.012, yf), p0.z);
        if (j < 2) { const fl = ez(t, Ts + 0.1, 0.35); P.x = lerp(p0.x, SPOT[j].x, fl); P.z = lerp(p0.z, SPOT[j].z, fl); }
        if (land) E.set(-Math.PI / 2, hsh(i, 8) * 6, 0);
        if (j < 2) {                                                 // "again": lift, flap, get swatted away
          const ta = j ? Ta2 : Ta1, lift = ez(t, ta - 0.04, 0.16), fly = Math.max(0, t - ta - 0.2);
          if (t > ta - 0.04) {
            const toC = camPos.clone().sub(SPOT[j]).normalize();
            P.set(SPOT[j].x + toC.x * fly * 2.4 + fly * 1.5, 0.012 + 0.35 * lift + fly * 1.6 - 1.5 * fly * fly, SPOT[j].z + toC.z * fly * 2.4);
            s = 2.6; if (j === 1) clearFace(P, nv.face, camPos, 0.6);
            E.set(-Math.PI / 2 + lift * (1.2 + 0.5 * Math.sin(t * 40)), t * 9 * (fly > 0 ? 1 : 0), 0.3 * Math.sin(t * 30));
            if (fly > 0.55) s = 0;
          }
        }
      }
      if (s > 0 && s < 2) {                                        // keep the face side clear: pages in the face band swing behind him
        const dx = P.x - NAV.x, dz = P.z - NAV.z, cd = V(camPos.x - NAV.x, 0, camPos.z - NAV.z).normalize(), f = dx * cd.x + dz * cd.z;
        if (Math.abs(P.y - nv.face.y) < 0.32 && f > -0.15) { P.x -= cd.x * (f + 0.25 + 0.1 * hsh(i, 11)) * 1; P.z -= cd.z * (f + 0.25 + 0.1 * hsh(i, 11)); }
        clearFace(P, nv.face, camPos);
      }
      M4.compose(P, Q.setFromEuler(E), SC.setScalar(s)); pages.setMatrixAt(i, M4);
    }
    pages.instanceMatrix.needsUpdate = true;
  }

  function final(t) { car.slot.p3.visible = true; holo.scale.setScalar(1); holoState(t); }

  const hero = (t) => { const p = ctx.nav; return p ? { c: nav, face: p.face, top: p.top, sq: p.sq, blink: p.blink } : null; };

  const cues = [
    { t: T0 + 0.2, kind: 'paper', note: 'pages rustle around the navigator' },
    { t: Tg, kind: 'flutter', note: 'Graphify: paper storm whips up' },
    { t: Tk, kind: 'shimmer', note: 'knowledge: pages fold into the glowing graph' },
    { t: Tk + 0.35, kind: 'click', note: 'graph locks' },
    { t: Ts + 0.1, kind: 'drop', note: 'stops: storm drops dead' },
    { t: Ta1 + 0.08, kind: 'swat', note: 'again #1 swatted' },
    { t: Ta2 + 0.08, kind: 'swat', note: 'again #2 swatted' },
    { t: T3, kind: 'whoosh', note: 'Three: whip into the storm' },
    { t: Tg, kind: 'whoosh', note: 'Graphify: push-through the pages' },
    { t: Tc, kind: 'whoosh', note: 'codebase: fast orbit' },
    { t: Ts, kind: 'whoosh', note: 'stops: crash zoom' },
    { t: Ta1, kind: 'whoosh', note: 'again: snap ECU' },
    { t: Ta2, kind: 'whoosh', note: 'again: whip' },
    { t: Tsh + 0.4, kind: 'click', note: 'graph hologram docks on slot p3' },
  ];
  return { group, update, final, cam, hero, cues };
}
