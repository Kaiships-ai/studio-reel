// The air between a hand and the prop it holds (tools/gates/handgrip.mjs reads it from the rows as held[].gapCm).
// The prop's anchor is its grip socket (userData.grip, prop-local: one for both hands or { L, R }); a prop with none is
// measured to the nearest point of its box. The hand is the dot's centre; the dot's own radius is not air.
import * as THREE from 'three';
import { W_M } from './cast.js';

export const HAND_R = 0.040 * W_M;                                 // the hand dot's radius, m (cast.js)

// hand: world point; prop: Object3D with its world matrix up to date; side 'L' | 'R', or 'B' for one hand of a prop held
// in both (its socket hangs at the hands' midpoint, so it would always read 0: each hand is measured to the box)
// -> { cm, anchor: 'grip' | 'bounds' }, or { cm: null, anchor: 'empty' } for a prop with no socket and nothing drawn to
// measure to (a fault, never read as rows made before the gate)
export function gripGap(hand, prop, side) {
  const g = side !== 'B' && prop.userData.grip, gl = g && (Array.isArray(g) ? g : g[side]);
  if (gl) return { cm: +(Math.max(0, prop.localToWorld(new THREE.Vector3(...gl)).distanceTo(hand) - HAND_R) * 100).toFixed(2), anchor: 'grip' };
  const bb = new THREE.Box3().setFromObject(prop);
  if (bb.isEmpty()) return { cm: null, anchor: 'empty' };
  return { cm: +(Math.max(0, bb.clampPoint(hand, new THREE.Vector3()).distanceTo(hand) - HAND_R) * 100).toFixed(2), anchor: 'bounds' };
}
