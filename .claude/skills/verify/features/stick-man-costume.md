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
  face stays framed through a 90 deg head turn. On a nod the opening follows the face too (more at the brim, fading round
  the crown), saturating at ~26 deg so the back of the hood does not stretch past 15 %.
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
  under 0.15 (edge stretch), `cord` about 0 (cord stretch), `rimOff` under ~5 deg in a head turn and ~12 deg on a 26 deg nod
  (degrees the face opening slid off the face; ~24 deg at the 45 deg ROM-limit nod), `cordPen` 0 (m the drawn cord sinks into the jersey: the old number
  checked only the body volumes and read 0 while a cord went through the jersey), `cordFly` (m a cord's lower part
  stands off the jersey: ~0.05 after a fast turn, more in a run), `cordV` under 0.002 in a hold (settled, no jitter).
- Cord shake: `shot.mjs --report` prints `cords: shake max <m/frame^2> (frame f) ...; frames over 0.015: ...` per hoodie
  wearer (from `__dbg` `actors[n].cord`, faults.mjs `cordShake`; a report line, not a gate yet). Motion-lib carry walk,
  walk and turn read ~0.01; before the 17/11 fix they read 0.2-0.37 (the tip flipped between two shapes every frame,
  Kai: "the cords jitter"), because the jersey sat at this frame's pose while the anchor eased from the last one. Every
  collider, the anchors and the tether targets of a sub-step use one eased pose (`hoodie.js` step: `lerpRigid` root +
  `jerseyAt` garment pose; the arms ride the eased root in this frame's pose). `shot.mjs` runs `__motion` before
  `__dbg` for each frame: the other order stepped the cloth back a frame and every row read a fresh cord.
- Cut that moves the wearer: a body jump between two frames that follow each other (`cloth.js bodyJump`: the throat's
  world travel is over 1 m in a frame and off last frame's by over 0.5 m (over 1.5 m on the frame after a restart), or
  the chest turns over 90 deg; a hard stop or a stepped run changes the travel but is no jump) re-seats the cords and
  the hood at rest on the new pose and settles them (`hoodie.js` step, as on a first frame; `__dbg` `cord.jump: true` on
  that frame); the next frame the cords move off with the body (`Cloth.carry`); the hood builds its lag again from rest
  within two frames. `node styles/stick-man/tools/cordjump.mjs` plays every motion-lib clip on every body it plays on in
  the real hoodie and lists the frames the rule fires on: none (largest travel 0.23 m/frame, change 0.16, turn 18 deg). Before the
  17/11 fix the Hot Money ep01 r2 bank cuts (s6 f1633 and f1662, 3.5 m) were eased across in 8 sub-steps: the cord was
  flung sideways and shook for 15 frames (`cords: shake` 0.56 at f1664). Check: `shot.mjs --film films/hm-ep01-r2/s6
  --frames 1600-1700 --dbg …` reads `jump` on 1633 and 1662 only, and the rows before the first jump are byte-identical
  to a run without the fix. A pose that snaps by a few cm at a cut (s6 f1971) is no jump and still flicks the cords.
- The report runs on a multi-act film directed one shot per frame (every frame a cut: `faults.mjs camStats` prints
  `camera speed at 720p: none`) and on a set with a sprite (`engine/visible.js` gives the ray its camera).
- Nod close-up: a film whose lead nods 20 deg down and 18 up at a 3/4 close camera (the hood2 proof stage `?part=nod`)
  with `hoodstats=1`; read `rimOff` and `p99`.
- The hm-ep01 clip-1 head turn close-up (`films/hm-ep01/review/rig/src`, `?clip=1&cam=close`, frames 66-110) is the
  close-up check for K1-K3: cords hang, the face stays inside the rim, no notch at the brow peak, no grey smear at the nape.
- Regression: `node --test test/unit/stick-cloth.test.mjs`; `node .claude/skills/verify/draft.mjs films/verify-smoke`.

## Gotchas

- `hoodie.js` loads the glb with top-level await from `/styles/stick-man/assets/...`: the page must be served from the
  library root (shot.mjs does this).
- A still that does not follow the previous frame starts the springs from rest, so a frame renders the same alone or in
  a run.
- Known open looks (the source build's self-check): a few-pixel background sliver at the back shoulder junction, busy
  throat lines at extreme close-up, and the far brow can read cut under the brim. Past ~26 deg a nod still turns the
  head inside the hood. A faint screen-space AO band sits under the back of the hood's ball when the film look has `ao`.
  In a turn past ~70 deg of neck, the skirt slides round on the shoulders and its folds show streaks.
- The hood's shading normals are broad (out from the head, then out from the body over the skirt): the drape's own normals
  put a smeared second terminator at the nape. The brow lip and the skirt are smoothed at load (`roundLip`): the drape left a notch at the brow and
  gathers on the skirt (a smeared grey band at the nape). The rim's second pass is drawn 7 mm fatter so rim and lip read
  as one black line.
