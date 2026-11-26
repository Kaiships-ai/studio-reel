// A prop's drawn solid part: a mesh with geometry that is not its contact-shadow disc (catalog.js userData.contact) nor
// an additive overlay (a glow, a light card). See-through glass is solid: a hand grips it and does not pass through it
// (GLTFLoader turns depth writing off on every blended glass, so transparency says nothing about solidity). The one
// filter grip.js (held-prop air), cast.js propBox and collide.js (solid boxes) measure a prop by.
import * as THREE from 'three';

export const drawnSolid = m => !!(m.isMesh && m.geometry && !m.userData.contact && m.material?.blending !== THREE.AdditiveBlending);

// shown: the object and every parent up its chain visible
export const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
