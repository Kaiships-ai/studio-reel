// A rotating light bar (police, ambulance, a warehouse alarm): two heads half a turn apart that sweep, never blink. Each
// head's level is a smooth pulse of the turn, so the light washes up and away the way a real rotating head does, frame
// by frame, instead of switching a lamp on and off. The bar stands still in the world (a light never rides a figure).
//   lightBarAt(f, o) -> [a, b], each 0..1. o: { from (first frame of light), rise (frames: the first head comes up low and
//                       red-first, a car turning in), spin (frames a turn, 10 = 3 Hz at 30 fps), sharp (pulse width: higher
//                       is a narrower beam), fade: [f0, f1] (the whole bar goes down to 0 over those frames) }
//   lightBar(stage, o)  a group holding one point light a head at `at` (Blender metres), with userData.anim(f) set, so a set
//                       returns it as a prop and the act keys it with make: { bar: { kind: 'ao_anim', prop: 'bar' } }.
//                       o: { at, colors (two css colours), power (each head's peak intensity), reach (m), gap (m between
//                       the heads), ...the lightBarAt timing }
import * as THREE from 'three';

const ss = u => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
export function lightBarAt(f, { from = 0, rise = 0, spin = 10, sharp = 3, fade = null } = {}) {
  if (f < from) return [0, 0];
  const env = fade ? 1 - ss((f - fade[0]) / Math.max(1, fade[1] - fade[0])) : 1;
  if (f < from + rise) { const u = (f - from + 1) / rise; return [env * 0.5 * u * u, env * 0.06 * u]; }
  const ph = ((f - from - rise) % spin) / spin, head = p => Math.max(0, Math.cos(2 * Math.PI * p)) ** sharp;
  return [env * head(ph), env * head(ph - 0.5)];
}

export function lightBar(stage, { at, colors = ['#ff1a0d', '#2647ff'], power = 12, reach = 7, gap = 0.5, ...timing }) {
  const g = new THREE.Group(); g.name = 'lightBar'; g.position.set(at[0], at[2], -at[1]);
  const heads = colors.map((c, i) => {
    const l = new THREE.PointLight(new THREE.Color(c), 0, reach, 2); l.position.set((i - 0.5) * gap, 0, 0); g.add(l); return l;
  });
  g.userData.anim = f => { const k = lightBarAt(f, timing); heads.forEach((l, i) => { l.intensity = power * k[i]; }); };
  g.userData.anim(0);
  stage.scene.add(g);
  return g;
}
