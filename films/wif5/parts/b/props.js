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

// the bundle: a blanket roll 0.40 long across (x), its bottom at y 0; the head at +x peeks out of a hood, face up and forward
export const BLANKET = [0.36, 0.56, 0.82];
export function bundle(blanket = BLANKET) {
  const g = new THREE.Group();
  const body = solid(new THREE.CapsuleGeometry(0.088, 0.16, 6, 16), blanket); body.rotation.z = Math.PI / 2; body.position.set(-0.01, 0.095, 0); g.add(body);
  const fold = solid(new THREE.TorusGeometry(0.088, 0.017, 8, 24), blanket.map(v => v * 0.82)); fold.rotation.y = Math.PI / 2; fold.position.set(0.04, 0.095, 0); g.add(fold);
  const hood = solid(new THREE.SphereGeometry(0.098, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), blanket); hood.rotation.z = -Math.PI / 2; hood.rotation.y = -0.5; hood.position.set(0.12, 0.11, -0.01); g.add(hood);
  const head = solid(new THREE.SphereGeometry(0.068, 20, 14), [0.90, 0.72, 0.60], { ink: 0.006 }); head.position.set(0.135, 0.12, 0.035); g.add(head);
  const dark = new THREE.MeshBasicMaterial({ color: srgb([0.10, 0.06, 0.06]) });
  for (const s of [-1, 1]) {   // two closed sleeping eyes: small arcs on the face (+z, a little up)
    const e = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0032, 6, 12, Math.PI), dark); e.position.set(0.135 + s * 0.022, 0.135, 0.098); e.rotation.z = Math.PI; g.add(e); }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), new THREE.MeshBasicMaterial({ color: srgb([0.75, 0.30, 0.32]) })); mouth.position.set(0.135, 0.098, 0.099); g.add(mouth);
  g.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
  return g;
}
// held to the chest in both arms (the hugbag's contract: both hands under its lower sides)
BUILD.wif5_baby = () => { const g = bundle(); g.userData = { mode: 'both', grip: [0, 0.07, 0.03], size: [0.36, 0.19, 0.19], mass: 3.4 }; return g; };

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
