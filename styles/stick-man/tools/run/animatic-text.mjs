// The drawtext filter for one on-screen `text` entry of a shot, kept apart from animatic.mjs so a test can read it.
// `box` takes the same shapes as the engine overlay (REEL_DATA.md): true, { color, alpha, pad, r }, or (older) an ffmpeg colour string.
const INK = '0x262124', INK_ALPHA = 0.82;   // the engine's boxed-label ink at 82 %

// '#c62828' -> '0xc62828'; names ('black'), '0x..' and 'colour@alpha' strings pass through
export const ffColor = c => { const s = String(c).trim(); return /^#[0-9a-f]{3}$/i.test(s) ? '0x' + [...s.slice(1)].map(h => h + h).join('') : /^#[0-9a-f]{6,8}$/i.test(s) ? '0x' + s.slice(1) : s; };

// -> the boxcolor value and the border width in px, or null for no box. `W` is the frame width; `pad` is in px at 1080 wide.
export function boxOf(box, sz, W) {
  if (box == null || box === false) return null;
  if (typeof box === 'string') return { color: ffColor(box), pad: Math.round(sz * 0.35) };
  const o = box === true ? {} : box;
  const base = o.color ? ffColor(o.color) : INK, alpha = o.alpha ?? INK_ALPHA;
  return { color: base.includes('@') ? base : `${base}@${alpha}`, pad: o.pad != null ? Math.round(o.pad * W / 1080) : Math.round(sz * 0.35) };
}

// expansion=none: drawtext otherwise reads `%{...}` and `%%` inside the text, so a bare `%` broke the render. The text itself
// travels in a textfile, so `:` `'` `\` need no filter escaping; only the file's path does (done by the caller).
export const textFilter = ({ font, file, size, color, box, W, x, y, enable }) => {
  const b = boxOf(box, size, W);
  return `drawtext=fontfile='${font}':textfile='${file}':expansion=none:fontcolor=${ffColor(color || 'white')}:fontsize=${size}`
    + (b ? `:box=1:boxcolor=${b.color}:boxborderw=${b.pad}` : '') + `:x=${x}:y=${y}:enable='${enable}'`;
};
