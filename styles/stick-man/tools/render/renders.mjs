// The film's final render in renders/: a final*.mp4 wins; otherwise the highest _v<N> by number, with an optional size
// suffix (hm-ep01_A_v9_720.mp4, Kai renders 720 by rule). Shared by postcheck.mjs and cutgate.mjs.
import fs from 'node:fs';

const VERSION = /_v(\d+)(?:_\d+)?\.mp4$/;

export function pickFinal(names) {
  const finals = names.filter(f => /final.*\.mp4$/.test(f)).sort();
  if (finals.length) return finals.at(-1);
  const v = f => +f.match(VERSION)[1];
  return names.filter(f => VERSION.test(f)).sort((a, b) => v(a) - v(b) || a.localeCompare(b)).at(-1);
}

export const finalRender = dir => (fs.existsSync(dir) ? pickFinal(fs.readdirSync(dir)) : undefined);
