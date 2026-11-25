// The film's face style (reel.js faceStyle). s2, the rubber face, is the kit's default (Kai 21/11: "s2 thành mặc định"),
// and since 25/11 the only one this studio draws: every face is in the H2 V2.1 style, no dot eyes. 'kit' (the old dot-eye
// faces) is retired here and draws s2 with a warning, so a posted film that named it still renders; the buyer pack keeps
// the dot faces (kit.manifest [stick_edit] empties RETIRED there).
const STYLES = { kit: null, s2: () => import('./s2.js') };
export const DEFAULT_FACE_STYLE = 's2';
export const FACE_STYLE_NAMES = Object.keys(STYLES);
const RETIRED = { kit: 's2' };

export async function useFaceStyle(name = DEFAULT_FACE_STYLE) {
  if (!Object.hasOwn(STYLES, name)) throw new Error(`reel.js faceStyle ${JSON.stringify(name)}: not a face style (${FACE_STYLE_NAMES.map(n => `'${n}'`).join(', ')}; left out = '${DEFAULT_FACE_STYLE}')`);
  if (Object.hasOwn(RETIRED, name)) { console.warn(`[kit] faceStyle '${name}' is retired: every face draws in '${RETIRED[name]}'`); name = RETIRED[name]; }
  if (STYLES[name]) (await STYLES[name]()).use();
  return name;
}
