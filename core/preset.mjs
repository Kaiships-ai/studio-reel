// preset.mjs: render presets. No preset is the real reel (1080×1920 at the film's fps, full quality); `test` is a tiny,
// fast render for trying the pipeline: one cook renders in seconds and the machine stays cool. Not for posting.
// A film's preset: REEL_PRESET in the environment, else `preset` in films/<slug>/job.json, which core/job.mjs copies
// from `preset: test` in the script's front matter (workspace/scripts/<slug>.md) or takes from `--preset=test`.
// make.mjs (render, verify), video.mjs (--preset) and the draft verify honour it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

//   w×h: the output size (the page still draws at its own size and is scaled down) · fps · maxDur: seconds rendered
//   at most · jpeg: frame quality · crf, x264: the H.264 encode
export const PRESETS = {
  test: { w: 270, h: 480, fps: 12, maxDur: 15, jpeg: 60, crf: 35, x264: 'ultrafast' },
};

/** The named preset ({ name, ...settings }), or null for none. Throws on a name that is not in PRESETS. */
export function preset(name) {
  if (!name) return null;
  if (!PRESETS[name]) throw new Error(`unknown preset "${name}": use ${Object.keys(PRESETS).join(', ')}`);
  return { name, ...PRESETS[name] };
}

/** The film's preset: REEL_PRESET, else job.json's `preset`, else null. */
export function presetOf(film) {
  const file = join(film, 'job.json');
  let name = process.env.REEL_PRESET;
  if (!name && existsSync(file)) try { name = JSON.parse(readFileSync(file, 'utf8')).preset; } catch {}
  return preset(name);
}
