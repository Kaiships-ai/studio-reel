// Which light makes it (Kai 23/11, Hot Money A v11: four spots still blown after the light budget, each from a different
// source: one practical over a door, the act's fog lifted by the exposure, a car lid past the roll-off knee, a sunlit wall).
// Guessing a light scale and re-rendering found none of them; dimming one source at a time found each in one round.
// ?ablate=<source> on the page (shot.mjs --query ablate=<source>) renders with that one source dimmed:
//   sun | hemi | fill   the stage's key, sky and fill lights x DIM
//   lamps               every point and spot light in view x DIM
//   light<i>            the i-th point or spot light (the order ?ablate=list prints) off
//   fog                 the act's distance fog off
//   air | shafts | hot  the aerial-perspective pass, the light shafts, the highlight bloom off
//   list                nothing dimmed; prints the lights with their index, position and power
// tools/gates/blame.mjs renders a flagged frame once per source and ranks what lifts the region.
export const DIM = 0.25;
export const SOURCES = ['sun', 'hemi', 'fill', 'lamps', 'fog', 'air', 'shafts', 'hot'];

// the point and spot lights that light this frame (shown, lit), in scene order: light<i> indexes this list
export function frameLights(scene) {
  const out = [];
  scene.traverse(o => {
    if (!(o.isPointLight || o.isSpotLight) || !(o.intensity > 0)) return;
    for (let q = o; q; q = q.parent) if (!q.visible) return;
    out.push(o);
  });
  return out;
}

// dim one source for one render: returns the grade to render with and undo() to put everything back. `lights`: the list
// light<i> indexes (engine/play.js freezes the first render's list, so a dissolve frame's second act cannot shift it)
export function ablate(stage, which, grade = {}, lights = frameLights(stage.scene)) {
  const undo = [], set = (o, k, v) => { const v0 = o[k]; o[k] = v; undo.push(() => { o[k] = v0; }); };
  let gr = grade;
  const m = /^light(\d+)$/.exec(which || '');
  if (which === 'sun' || which === 'hemi' || which === 'fill') set(stage[which], 'intensity', stage[which].intensity * DIM);
  else if (which === 'lamps') for (const l of frameLights(stage.scene)) set(l, 'intensity', l.intensity * DIM);
  else if (m) { const l = lights[+m[1]]; if (!l) throw new Error(`ablate: no ${which} (${lights.length} lights)`); set(l, 'intensity', 0); }
  else if (which === 'fog') set(stage.scene, 'fog', null);
  else if (which === 'air') gr = { ...grade, air: false };
  else if (which === 'shafts') gr = { ...grade, haze: 0 };
  else if (which === 'hot' && stage.passes?.hot) set(stage.passes.hot, 'enabled', false);
  return { grade: gr, undo: () => { for (const u of undo.reverse()) u(); } };
}

// one line per light for ?ablate=list (Blender world: x, -z, y)
export const listLights = scene => frameLights(scene).map((l, i) => { const p = l.getWorldPosition(l.position.clone());
  return `light${i} ${l.isSpotLight ? 'spot' : 'point'} at ${[p.x, -p.z, p.y].map(v => v.toFixed(2)).join(', ')} power ${l.intensity.toFixed(2)} reach ${(l.distance || 0).toFixed(1)}${l.parent?.name ? ` (${l.parent.name})` : ''}`; });
