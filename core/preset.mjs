// preset.mjs: render presets. Every film renders `medium` (720×1280 at the film's fps, a review copy) unless it names
// another preset. `test` is a tiny, fast render for trying the pipeline: one cook renders in seconds and the machine
// stays cool. `full` (1080×1920, full quality, for posting) is gated: it renders only when the film has an
// APPROVED-FULL file, which `node core/approve-full.mjs <film> --by "<who asked, when>"` writes after the user asks for
// the full render. Never write it on your own.
// A film's preset: REEL_PRESET in the environment, else `preset` in films/<slug>/job.json, which core/job.mjs copies
// from `preset: test` in the script's front matter (workspace/scripts/<slug>.md) or takes from `--preset=test`.
// make.mjs (render, verify), reel.mjs, video.mjs (--preset) and the draft verify honour it.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

//   w×h: the output size (the page still draws at its own size and is scaled down) · fps · maxDur: seconds rendered
//   at most · jpeg: frame quality · crf, x264: the H.264 encode
export const PRESETS = {
  test: { w: 270, h: 480, fps: 12, maxDur: 15, jpeg: 60, crf: 35, x264: 'ultrafast' },
  medium: { w: 720, h: 1280, jpeg: 85, crf: 28, x264: 'veryfast' },
};
export const DEFAULT = 'medium', FULL = 'full', APPROVAL = 'APPROVED-FULL';
const NAMES = [...Object.keys(PRESETS), FULL].join(', ');

/** The named preset ({ name, ...settings }); null for none or `full` (the page's own size). Throws on an unknown name. */
export function preset(name) {
  if (!name || name === FULL) return null;
  if (!PRESETS[name]) throw new Error(`unknown preset "${name}": use ${NAMES}`);
  return { name, ...PRESETS[name] };
}

/** The film's preset: REEL_PRESET, else job.json's `preset`, else medium. `full` needs the film's APPROVED-FULL file. */
export function presetOf(film) {
  const file = join(film, 'job.json');
  let name = process.env.REEL_PRESET;
  if (!name && existsSync(file)) try { name = JSON.parse(readFileSync(file, 'utf8')).preset; } catch {}
  name ||= DEFAULT;
  if (name === FULL && !existsSync(join(film, APPROVAL)))
    throw new Error(`the full render needs the user's go: ask them, then run node core/approve-full.mjs ${film} --by "<who asked, when>"`);
  return preset(name);
}
