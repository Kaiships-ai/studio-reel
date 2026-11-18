# Stick-man depth behind the subject

Every stick-man shot gets depth behind its subject without the act asking for it. Four parts, measured against the
Rick clip bench (`styles/stick-man/bench/TABLE.md`, depth ratio, luma, saturation):

- Lens blur by the lens. `lensBlur(lens, dist)` in `engine/camera.js` sizes the blur of a background at infinity like a
  thin lens, 1.26 x (lens / 30)^2 / focus distance, capped at 0.42, sharp from 0.7x to 1.6x the focus distance. The `two`, `ms` and `follow` presets and every
  `allout/director.js` shot without its own `dof` use it, absolute `{ pos, aim }` flights included (focus on the aim).
- Sky with form. When an act's background is a colour, `engine/look.js` draws a dome from it: zenith darker and cooler,
  horizon lifted, two stretched cloud layers. A set's own dome (`rail-kit` `sky()`, r 60) sits in front of it (r 70).
- Air. A pass after the ink and before the lens blur fades far surfaces toward the sky colour in their view direction
  and takes out saturation, 1 - exp(-(z - 6 m) / 30 m), at most 0.35. At night it scatters a darker colour than the glow.
- Far backdrop. `allout/sets/backdrop.js` places town rows from `assets/backdrop/` (built by
  `tools/backdrop_blend.py`, exported by `tools/export_glb.py`) 20-60 m out, past a set's walls.

## Sub-features

- A shot's `dof` (camera.js `opt.dof`, director `dof: { gain }`) always wins; `{ gain: 0 }` turns the blur off.
- `look.dofAuto` still gives its gain to a director shot closer than `below`.
- Act `grade.sky` (`{ glow, clouds }` or `false`) and `grade.air` (`{ k, near, scale, desat }` or `false`) tune or turn
  off the dome and the air for one act.
- `backdrop(stage, rows, { tint })`: a row `{ piece, at, rot, scale, tint }`. The toon ramp ignores light intensity, so a
  night set graded up 2-3x needs a dark tint (about 0.17). Lit windows keep their glow. The pieces ignore the act's
  linear haze; the air pass fades them.
- Captions and overlays are drawn on the 2D canvas over the WebGL one, so the blur never reaches a word.

## How to get to it (user POV)

Any stick-man film picks up the lens blur, sky and air on its next render. A set adds the far rows in its `build()`.

## Driving it

- Unit: `node --test test/unit/camera-dof.test.mjs`.
- Stills: `node styles/stick-man/tools/shot.mjs --film films/<slug> --frames <f,...> --w 720 --h 1280 --out <dir>/f_%d.png`,
  then the bench on a render: `node styles/stick-man/tools/refbench.mjs <mp4> --out <json>`.
- Look for: the background behind a medium shot softens while the face ink stays crisp; over a wall the sky shows a
  gradient and clouds; a far row reads as a mass with a few lit windows, not a flat colour.

## Gotchas

- An absolute flight whose aim is not on the subject focuses on the aim, so a subject well in front of it softens. Give
  that shot `dof: { gain: 0 }` or aim it at the subject.
- A night set built as a closed box shows no sky: the depth there comes from the blur and the far rows only.
- Interiors (closer than 6 m) get no air; their depth is the lens blur alone.
