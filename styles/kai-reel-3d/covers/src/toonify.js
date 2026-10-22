// toonify.js: the exact Clawd2 treatment from test-3d-studio/engine/cast.js (lines 36–40), applied to any cast group,
// so Kai-blocky and Clawd2 share one look: toonMat(c, {hatch 0.4, hiAmt 0.45}), emit parts flat, hull outline width 1.1.
import * as THREE from 'three';
import { toonMat, addOutline } from '../engine/look.js';
export const OUTLINE_W = 1.1;
const GLASS_V = 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }';
const GLASS_F = 'varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.-abs(dot(normalize(vN),normalize(vV))),2.2); gl_FragColor = vec4(mix(vec3(.72,.86,1.),vec3(1.),f), .1+.55*f); }';
export function toonify(group) {
  const meshes = []; group.traverse(m => m.isMesh && !m.userData.outline && meshes.push(m));
  for (const m of meshes) {
    const c = m.material.color ? '#' + m.material.color.getHexString() : '#d8622f';
    if (m.userData.glass) { m.material = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.FrontSide, vertexShader: GLASS_V, fragmentShader: GLASS_F }); m.renderOrder = 5; continue; }
    if (m.material.transparent) { m.visible = false; continue; }
    const em = m.userData.emit; m.material = toonMat(c, em ? { hatch: 0, hiAmt: 0, emit: em, emitAmt: 1, shadeK: 0 } : { hatch: 0.4, hiAmt: 0.45 });
    m.castShadow = m.castShadow || !em;
    if (!m.userData.noOutline) addOutline(m, OUTLINE_W);
  }
}
