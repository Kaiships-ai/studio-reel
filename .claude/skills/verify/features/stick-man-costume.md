# Stick-man costume: the grey hoodie

A stick-man cast entry (or its spec) wears `costume: ['hoodie:grey']` (hood up) or `['hoodie:grey:down']` (hood folded
on the upper back). The garment replaces the torso's surface and bends with the spine; the hood is skinned between chest
and head; with `PHYS.on` the hood's back peak springs and the cords swing (`allout/cloth.js`). A cast entry without a
costume renders exactly as before.

## Sub-features

- `hoodie:grey`: garment, hood shell from `styles/stick-man/assets/costume/hoodie_grey.glb`, face rim, cowl, two cords.
- `hoodie:grey:down`: garment, rolled collar, the folded hood pad and the hood bunched round the back of the neck (a
  roll, thickest at the nape); a cap from the spec's `hair` sits on the head.
- A spec's own `costume` is worn by default (`engine/play.js`: `c.costume ?? SPECS[c.spec].costume`).
- `?hoodstats` in the page query logs `HOODIE {pen, p99, lag, cord, rimOff, cordPen, cordFly, cordV, ...}` per frame (hood
  up only).
- The face opening turns with the face (twist weight 0.75 at the skirt, 1 from the cheeks up, less at the throat): the
  face stays framed through a 90 deg head turn.
- Cords: a soft tether toward hanging at rest; they collide with the head's volume, the jersey's own surface (the
  garment's warp inverted, `jerseyDepth`) and the arm bones.

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/allout/costume.js'; import '/styles/stick-man/allout/hoodie.js'`, then a
cast entry `{ spec: 'ENGINEER', costume: ['hoodie:grey'] }`. Give the spec `hair: []` for the hood up (a hair cap is bigger
than the hood's clearance).

## Driving it

- A sheet: a film with six static figures (hood up at yaw 0/45/90/180, hood down with a red `flatCap`), one direct shot per
  frame, then `node styles/stick-man/tools/shot.mjs --film films/<name> --frames 0-5 --w 540 --h 960 --out f_%d.png`.
- Numbers: add `--query hoodstats=1` on a moving shot and read the `HOODIE` lines: `pen` 0 (m into the body), `p99`
  under 0.15 (edge stretch), `cord` about 0 (cord stretch), `rimOff` under ~5 deg in a head turn (degrees the face opening
  slid off the face; nods still slide it, ~36 deg), `cordPen` 0 (m the drawn cord sinks into the jersey: the old number
  checked only the body volumes and read 0 while a cord went through the jersey), `cordFly` (m a cord's lower part
  stands off the jersey: ~0.05 after a fast turn, more in a run), `cordV` under 0.002 in a hold (settled, no jitter).
- The hm-ep01 clip-1 head turn close-up (`films/hm-ep01/review/rig/src`, `?clip=1&cam=close`, frames 66-110) is the
  close-up check for K1-K3: cords hang, the face stays inside the rim, no notch at the brow peak, no grey smear at the nape.
- Regression: `node --test test/unit/stick-cloth.test.mjs`; `node .claude/skills/verify/draft.mjs films/verify-smoke`.

## Gotchas

- `hoodie.js` loads the glb with top-level await from `/styles/stick-man/assets/...`: the page must be served from the
  library root (shot.mjs does this).
- A still that does not follow the previous frame starts the springs from rest, so a frame renders the same alone or in
  a run.
- Known open looks (the source build's self-check): a few-pixel background sliver at the back shoulder junction, busy
  throat lines at extreme close-up, and the far brow can read cut under the brim. A nod still slides the face under the
  brim. In a turn past ~70 deg of neck, the skirt slides round on the shoulders and its folds show streaks.
- The hood's shading normals are broad (out from the head, then out from the body over the skirt): the drape's own normals
  put a smeared second terminator at the nape. The brow lip is rounded at load (`roundLip`): the drape left a notch there.
