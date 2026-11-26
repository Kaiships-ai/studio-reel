// The air between a hand and the prop it holds (tools/gates/handgrip.mjs reads it from the rows as held[].gapCm).
// The prop's anchor is its grip socket (userData.grip, prop-local: one for both hands or { L, R }); a prop with none is
// measured to the nearest point of its box. The hand is the dot's centre; the dot's own radius is not air.
import * as THREE from 'three';
import { W_M } from './cast.js';

export const HAND_R = 0.040 * W_M;                                 // the hand dot's radius, m (cast.js)

// hand: world point; prop: Object3D with its world matrix up to date -> { cm, anchor: 'grip' | 'bounds' }
export function gripGap(hand, prop, side) {
  const g = prop.userData.grip, gl = g && (Array.isArray(g) ? g : g[side]);
  const d = gl ? prop.localToWorld(new THREE.Vector3(...gl)).distanceTo(hand)
    : new THREE.Box3().setFromObject(prop).clampPoint(hand, new THREE.Vector3()).distanceTo(hand);
  return { cm: +(Math.max(0, d - HAND_R) * 100).toFixed(2), anchor: gl ? 'grip' : 'bounds' };
}
