// Helpers the prop, set and allout libraries share.
import { toon } from '../engine/look.js';

// Park-Miller random numbers in [0, 1) from a raw 32-bit state (0 becomes 1)
export function parkMiller(state) { let s = state >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
// the same, with the seed spread first, so seeds 1, 2, 3 do not start on neighbouring numbers
export const lcg = seed => parkMiller(seed * 9973 + 7);
// a toon material per colour and option set, built once: base = this library's default toon options
export function toonCache(base) {
  const C = new Map();
  return (rgb, o = {}) => { const k = rgb.join(',') + JSON.stringify(o); if (!C.has(k)) C.set(k, toon(rgb, { ...base, ...o })); return C.get(k); };
}
