// The film's face style (reel.js faceStyle). s2, the rubber face, is the kit's default (Kai 21/11: "s2 thành mặc định");
// 'kit' keeps the kit's own faces (engine/faces.js EXPR) drawn and timed exactly as before styles existed.
const STYLES = { kit: null, s2: () => import('./s2.js') };
export const DEFAULT_FACE_STYLE = 's2';
export const FACE_STYLE_NAMES = Object.keys(STYLES);

export async function useFaceStyle(name = DEFAULT_FACE_STYLE) {
  if (!Object.hasOwn(STYLES, name)) throw new Error(`reel.js faceStyle ${JSON.stringify(name)}: not a face style (${FACE_STYLE_NAMES.map(n => `'${n}'`).join(', ')}; left out = '${DEFAULT_FACE_STYLE}')`);
  if (STYLES[name]) (await STYLES[name]()).use();
  return name;
}
