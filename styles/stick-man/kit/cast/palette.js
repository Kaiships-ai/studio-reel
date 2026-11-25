// The wardrobe's colours (kit/cast/wardrobe.js): outfit palettes, the uniforms' own colours, tones. Linear, as everywhere in
// the kit (a :rrggbb is read as costume.js reads it).
import { INK_RGB } from '#engine/look.js';

export const mul = (c, k) => c.map(x => Math.min(0.8, x * k));
const lum = c => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
// the line a seam, a pocket or a placket is drawn with: near ink on a light cloth, a light tone of it on a dark one (a navy
// seam drawn darker is not seen)
export const ln = c => (lum(c) < 0.09 ? c.map(x => Math.min(0.8, x * 1.7 + 0.16)) : c.map((x, i) => 0.16 * x + 0.84 * INK_RGB[i]));
// a second tone of a cloth, clearly off it: darker on a light cloth, lighter on a dark one
export const tone = (c, k = 0.55) => (lum(c) < 0.06 ? c.map(x => Math.min(0.8, x * 2.2 + 0.05)) : mul(c, k));

// ---------------------------------------------------------------- colours
// Outfit palettes for a crowd: in this order every neighbour differs in value (light / dark) and in hue, so two people side by
// side never read as one (test/unit/stick-wardrobe.test.mjs measures it). main = the garment, accent = its trims (a sash,
// stripes, buttons).
export const PALETTES = {
  sand: { main: [0.60, 0.44, 0.24], accent: [0.30, 0.10, 0.04] },
  navy: { main: [0.035, 0.06, 0.19], accent: [0.70, 0.45, 0.08] },
  coral: { main: [0.80, 0.26, 0.15], accent: [0.05, 0.08, 0.20] },
  forest: { main: [0.04, 0.15, 0.06], accent: [0.62, 0.48, 0.24] },
  sky: { main: [0.32, 0.52, 0.78], accent: [0.05, 0.07, 0.20] },
  plum: { main: [0.17, 0.045, 0.15], accent: [0.74, 0.50, 0.20] },
  mustard: { main: [0.70, 0.44, 0.05], accent: [0.10, 0.06, 0.04] },
  slate: { main: [0.07, 0.085, 0.11], accent: [0.80, 0.30, 0.16] },
  rose: { main: [0.74, 0.30, 0.38], accent: [0.15, 0.03, 0.06] },
  teal: { main: [0.012, 0.15, 0.15], accent: [0.80, 0.42, 0.10] },
};
export const PALETTE_ORDER = Object.keys(PALETTES);
export const outfit = i => PALETTE_ORDER[((i % PALETTE_ORDER.length) + PALETTE_ORDER.length) % PALETTE_ORDER.length];
// the uniforms' own colours
export const UNIFORM = {
  coat: [0.60, 0.645, 0.68], chef: [0.66, 0.63, 0.54], toque: [0.68, 0.65, 0.56], shirt: [0.40, 0.55, 0.78], police: [0.10, 0.22, 0.52],
  policeCap: [0.02, 0.03, 0.09], pilot: [0.022, 0.032, 0.095], gold: [0.78, 0.50, 0.10], steel: [0.46, 0.48, 0.52], tube: [0.06, 0.13, 0.30],
  teal: [0.03, 0.33, 0.33], hivis: [0.80, 0.25, 0.015], silver: [0.50, 0.52, 0.55], hard: [0.80, 0.52, 0.035], charcoal: [0.055, 0.06, 0.075],
  crimson: [0.38, 0.03, 0.05], work: [0.10, 0.17, 0.30], tag: [0.40, 0.52, 0.66], leather: [0.050, 0.038, 0.030], jeans: [0.035, 0.07, 0.17], red: [0.58, 0.03, 0.03], pack: [0.50, 0.07, 0.05], dark: [0.03, 0.03, 0.035],
};
const hexC = h => { const n = parseInt(h, 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; };
// a colour by name: a palette, a uniform's, or rrggbb; no name: def. A name nobody knows throws (it was drawn in def, silently)
export function colourOf(x, def) { if (!x) return def; if (PALETTES[x]) return PALETTES[x].main; if (UNIFORM[x]) return UNIFORM[x]; if (/^[0-9a-f]{6}$/i.test(x)) return hexC(x); throw new Error(`costume colour "${x}": no such colour (${[...Object.keys(PALETTES), ...Object.keys(UNIFORM)].join(', ')}, or rrggbb)`); }
export const oneOf = (layer, x, list) => { if (!list.includes(x)) throw new Error(`costume ${layer}:${x}: one of ${list.join(', ')}`); };
export const accentOf = (x, def) => (x && PALETTES[x] ? PALETTES[x].accent : def);
