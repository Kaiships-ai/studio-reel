// wif5 part b: the film's own props (no kit shape): a swaddled newborn (a hand prop held in both arms, and the same bundle
// lying in a cradle), the cradle's name tag "23:59" and the mother's photo. Three.js y-up; a hand prop's forward is +z.
// The hand prop registers into the kit's BUILD (kit/cast/handprops.js) under a film-only name; it is played through the
// hugbag clips' swap (Idle_CarryBag_Loop: { swap: { hugbag: 'wif5_baby' } }) and waived as untested in reel.js.
import * as THREE from 'three';
import { BUILD } from '/styles/stick-man/kit/cast/handprops.js';

const srgb = c => new THREE.Color().setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);
const hull = new THREE.MeshBasicMaterial({ color: srgb([0.05, 0.05, 0.07]), side: THREE.BackSide });
function solid(geo, c, { ink = 0.010, rough = 0.85, emit = null } = {}) {
  const m = new THREE.MeshStandardMaterial({ color: srgb(c), roughness: rough, ...(emit ? { emissive: srgb(emit) } : {}) }); m.userData.noToon = true;
  const x = new THREE.Mesh(geo, m); x.castShadow = true; x.receiveShadow = true;
  if (ink) { const h = new THREE.Mesh(geo, hull); h.scale.setScalar(1 + ink / 0.12); x.add(h); }
  return x;
}

// the baby: a newborn about 50 cm, swaddled. The face, small and pink, looks out of a hooded blanket; the body is a soft
// egg, not a tube. lying: along x in a cradle, face up (+y). held: upright in both arms, the blanket's fold over both forearms
// (its ends where the fists are) and the baby on it against the chest, face out (+z)
export const BLANKET = [0.36, 0.56, 0.82];
const SKIN = [0.93, 0.70, 0.60];
function face(g, at, up, out, r = 0.064) {   // a head with a sleeping face: closed-eye arcs, a mouth, cheeks; `out` the face's direction
  const head = solid(new THREE.SphereGeometry(r, 20, 14), SKIN, { ink: 0.006 }); head.position.copy(at); g.add(head);
  const dark = new THREE.MeshBasicMaterial({ color: srgb([0.10, 0.06, 0.06]) }), pink = new THREE.MeshBasicMaterial({ color: srgb([0.95, 0.52, 0.55]) });
  const side = new THREE.Vector3().crossVectors(up, out).normalize(), P = (a, b, c) => at.clone().addScaledVector(side, a).addScaledVector(up, b).addScaledVector(out, c);
  const look = new THREE.Matrix4().lookAt(new THREE.Vector3(), out, up);
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.TorusGeometry(r * 0.19, r * 0.05, 6, 12, Math.PI), dark); e.position.copy(P(s * r * 0.36, r * 0.12, r * 0.93)); e.quaternion.setFromRotationMatrix(look); e.rotateZ(Math.PI); g.add(e);
    const c = new THREE.Mesh(new THREE.CircleGeometry(r * 0.17, 12), pink); c.position.copy(P(s * r * 0.55, -r * 0.2, r * 0.84)); c.quaternion.setFromRotationMatrix(look); c.rotateY(Math.PI); g.add(c); }
  const m = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), new THREE.MeshBasicMaterial({ color: srgb([0.70, 0.28, 0.30]) })); m.position.copy(P(0, -r * 0.38, r * 0.93)); g.add(m);
  return head;
}
export function bundle(blanket = BLANKET) {   // lying in a cradle, along x, the head at +x, face up
  const g = new THREE.Group();
  const body = solid(new THREE.SphereGeometry(1, 20, 14), blanket); body.scale.set(0.15, 0.075, 0.1); body.position.set(-0.04, 0.075, 0); g.add(body);
  const hood = solid(new THREE.SphereGeometry(0.085, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.6), blanket); hood.rotation.z = -Math.PI / 2 - 0.6; hood.position.set(0.12, 0.075, 0); g.add(hood);
  face(g, new THREE.Vector3(0.13, 0.085, 0), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), 0.06);
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
export function heldBaby(blanket = BLANKET) {   // upright in both arms: the fold's ends at the fists (x +-0.24), the face at y ~0.40
  const g = new THREE.Group();
  // the swaddle's tail: a sling of the same blanket hanging under the baby from fist to fist (a U across x, open on top)
  const sling = solid(new THREE.CylinderGeometry(0.07, 0.07, 0.48, 20, 1, true, Math.PI / 2, Math.PI), blanket); sling.material.side = THREE.DoubleSide; sling.rotation.z = Math.PI / 2; sling.position.set(0, 0.075, 0); g.add(sling);
  for (const sx of [-1, 1]) { const end = solid(new THREE.SphereGeometry(0.05, 12, 10), blanket); end.scale.set(0.6, 1, 1.3); end.position.set(sx * 0.235, 0.04, 0); g.add(end); }
  const body = solid(new THREE.SphereGeometry(1, 20, 14), blanket); body.scale.set(0.095, 0.14, 0.085); body.position.set(0, 0.16, 0.0); g.add(body);
  const hood = solid(new THREE.SphereGeometry(0.088, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), blanket); hood.rotation.x = -Math.PI / 2 + 0.35; hood.position.set(0, 0.32, -0.012); hood.scale.setScalar(0.82); g.add(hood);
  face(g, new THREE.Vector3(0, 0.32, 0.01), new THREE.Vector3(0, 1, 0.25).normalize(), new THREE.Vector3(0, -0.25, 1).normalize(), 0.055);
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// held to the chest in both arms (the hugbag's contract: both fists at the fold's lower sides)
BUILD.wif5_baby = () => { const g = heldBaby(); g.userData = { mode: 'both', grip: [0, 0.03, 0], size: [0.5, 0.38, 0.17], mass: 3.4 }; return g; };

// the cradle's name card: "BOY · 23:59 · 31 DEC" on a blue card (canvas texture, for K.card)
export function tagCanvas() {
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 320; const c = cv.getContext('2d');
  c.fillStyle = '#7fa9d6'; c.fillRect(0, 0, 512, 320); c.fillStyle = '#eef0ea'; c.fillRect(18, 18, 476, 284);
  c.fillStyle = '#2a4f86'; c.fillRect(18, 18, 476, 62); c.fillStyle = '#eef0ea'; c.font = '900 46px InterReel, Arial Black, sans-serif'; c.textAlign = 'center'; c.fillText('BABY BOY', 256, 66);
  c.fillStyle = '#16161c'; c.font = '900 132px InterReel, Arial Black, sans-serif'; c.fillText('23:59', 256, 222);
  c.font = '700 34px InterReel, Arial, sans-serif'; c.fillStyle = '#3a3a44'; c.fillText('31 DEC · 3.4 kg', 256, 280);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// the mother's photo: a young woman (the kit's look: round cream head, dot eyes, a smile, long dark hair) holding the bundle
export function photoCanvas() {
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 480; const c = cv.getContext('2d');
  c.fillStyle = '#ede7da'; c.fillRect(0, 0, 400, 480);
  const gr = c.createLinearGradient(0, 24, 0, 380); gr.addColorStop(0, '#f2b98a'); gr.addColorStop(1, '#c9785a'); c.fillStyle = gr; c.fillRect(24, 24, 352, 356);
  c.fillStyle = '#2b1a14'; c.beginPath(); c.ellipse(200, 170, 108, 118, 0, 0, 7); c.fill(); c.fillRect(92, 170, 216, 170);   // long hair
  c.fillStyle = '#c8475f'; c.beginPath(); c.moveTo(70, 380); c.quadraticCurveTo(200, 250, 330, 380); c.fill();          // her top
  c.fillStyle = '#efe4d4'; c.beginPath(); c.arc(200, 160, 80, 0, 7); c.fill();                                            // face
  c.fillStyle = '#2b1a14'; c.beginPath(); c.ellipse(200, 104, 84, 40, 0, Math.PI, 0); c.fill();                          // fringe
  c.fillStyle = '#16161c'; for (const x of [172, 228]) { c.beginPath(); c.arc(x, 162, 9, 0, 7); c.fill(); }
  c.strokeStyle = '#16161c'; c.lineWidth = 6; c.beginPath(); c.arc(200, 182, 30, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
  c.fillStyle = '#e98a8a'; for (const x of [150, 250]) { c.beginPath(); c.arc(x, 192, 13, 0, 7); c.fill(); }
  c.fillStyle = '#5c8fd0'; c.beginPath(); c.ellipse(200, 330, 82, 44, -0.15, 0, 7); c.fill();                            // the bundle in her arms
  c.fillStyle = '#e6c2a6'; c.beginPath(); c.arc(248, 314, 26, 0, 7); c.fill();
  c.fillStyle = '#3a3a44'; c.font = '700 40px InterReel, Arial, sans-serif'; c.textAlign = 'center'; c.fillText('Mum ♥', 200, 440);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
