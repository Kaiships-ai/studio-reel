// bg.js · reel63 v2 background life (Kai 2026-10-18: "hậu cảnh thêm 1 tí chuyển động mờ mờ", ideas 1 + 2). Always on, behind the action,
// soft (the depth of field blurs it), low contrast, no text. Pure function of t.
//   1. rival cars: every ~2.2 s a team car (blue / green / yellow livery) streaks along the garage apron (z −2.05) behind our car.
//   2. the bays: in each of the 3 garage bays a dark crew Clawd works on the beat (124 BPM) and a grinder throws a spray of sparks.
import * as THREE from 'three';
import { makeCar, PIT, std } from './set.js';
import { clawd, pose, hsh, V, clamp } from './ch/kit.js';

const BEAT = 60 / 124, LANE_Z = PIT.wallZ + 0.55, SPAN = [-11, 13], PASS = 0.42;
export function buildBg(S) {
  const g = new THREE.Group(); S.scene.add(g);
  // ---- 1. rival cars
  const TEAM = ['#3d6fd8', '#2f9e63', '#e2b62f'], cars = TEAM.map(c => { const k = makeCar(); k.mats.red.color.set(c); k.g.scale.setScalar(0.95); g.add(k.g); return k; });
  const passes = []; for (let t = 1.1, i = 0; t < 40; i++) { passes.push({ t, car: i % 3 }); t += 2.2 + 0.6 * (hsh(i, 21) - 0.5); }
  // ---- 2. bay crews + sparks
  const BAYS = [-3.2, 0, 3.2], crew = [], sparks = [];
  const sparkM = new THREE.MeshStandardMaterial({ color: '#ffd38a', emissive: new THREE.Color('#ffb24a'), emissiveIntensity: 5, roughness: 1 });
  const sparkG = new THREE.SphereGeometry(0.012, 6, 4);
  BAYS.forEach((x, b) => {
    const c = clawd(g, 'plain'); for (const k of ['body', 'limb']) if (c.materials[k]) c.materials[k].color.set('#6b5a52');   // dusky silhouette
    g.add(c.group); crew.push({ c, x, b });
    for (let i = 0; i < 14; i++) { const s = new THREE.Mesh(sparkG, sparkM); g.add(s); sparks.push({ s, b, x, i }); }
  });
  function update(t) {
    // cars: the active pass slides across the apron with a little speed wobble; the others park far off-screen
    cars.forEach(k => { k.g.position.set(100, 0, 0); });
    for (const p of passes) { const u = (t - p.t) / PASS; if (u < 0 || u > 1) continue;
      const k = cars[p.car]; k.g.position.set(SPAN[0] + (SPAN[1] - SPAN[0]) * u, 0, LANE_Z); k.g.rotation.set(0, 0, 0);
      k.wheels.forEach(w => { w.rotation.z = -t * 60; }); }
    // bay crew: a working bob on every beat, turned 3/4 to the bay
    crew.forEach(({ c, x, b }) => { const ph = (t / BEAT + b * 0.33) % 1;
      pose(c, t, { pos: V(x + 0.35, 0, PIT.wallZ + 0.42), yaw: Math.PI * 0.85, bow: 0.25 * Math.max(0, Math.sin(ph * Math.PI * 2)), armR: 0.6 + 0.4 * Math.sin(ph * Math.PI * 2), seed: b }); });
    // sparks: a burst every 2 beats per bay (staggered), arcs out and falls, 0.45 s life
    sparks.forEach(({ s, b, x, i }) => {
      const T0 = Math.floor((t / BEAT + b * 0.7) / 2) * 2 - b * 0.7, age = t - T0 * BEAT - hsh(i, b) * 0.06, life = 0.45;
      if (age < 0 || age > life) { s.visible = false; return; }
      const a = (hsh(i, b + 7) - 0.5) * 2.2, v = 1.2 + hsh(i, b + 3) * 1.4;
      s.visible = true; s.position.set(x + 0.1 + Math.sin(a) * v * age, 0.55 + Math.cos(a) * 0.9 * v * age - 4.9 * age * age, PIT.wallZ + 0.5 + hsh(i, b + 5) * 0.3);
      s.scale.setScalar(clamp(1 - age / life) * 1.4 + 0.2);
    });
  }
  return { g, update, passes: passes.map(p => p.t) };
}
