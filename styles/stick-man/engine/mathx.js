// Scalar helpers with no imports, so faces.js, cast.js and the face styles can share them without the verbs.js -> cast.js
// cycle. verbs.js re-exports them for the rest of the engine.
export const DEG = Math.PI / 180;
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
export const lerp = (a, b, t) => a + (b - a) * t;
