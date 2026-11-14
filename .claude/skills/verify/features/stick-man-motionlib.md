# Stick-man motion library and carried loads

A stick-man reel's motion v2 `anim` takes library clips: `{ f, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] }`
expands into the clip's keys (`styles/stick-man/motion-lib`, 45 clips, 5 body types; the adult's 18 Mixamo captures (ref/mocap.js): run, sprint, walk with their captured start and stops, jump, idle, look around, talk, point, wave, sit down, sit, stand up, seated point, pick up, quarter turn). The rig under it gained body
proportions (cast spec `scale`, `headScale`, `legScale`, `kg`), a hand that grips keeps its target or reports the gap
(rig K4), and a carried prop that is a solid with mass (rig K5). A reel without `clip` keys or new spec fields renders as
before, except where an old one had a hand forced off a target (now kept when reachable) or a held prop inside the body.

## Sub-features

- `clip` keys: `to` (heading, fitted cycles, first and closing steps), `times`, `stop`, `pos`, `yaw`, `swap`, `expr`.
- Body types (`motion-lib/bodies.js` `bodySpec`): adult, heavy (girth 1.9), thin (0.6), child (scale 0.62, head 1.3, legs
  0.8), elder (stooped posture); each with its own walk, run and breath.
- Gaits (`base.js` `gaitLoop`, every walk and run): sampled a key a frame from curves. The hips are solved from the
  stance leg's knee curve (`knees` in `bodies.js`, `legReach` now in `engine/body.js`), so a knee never snaps; the swing
  foot is the hip-to-ankle line swung forward; hips shift, turn and tilt, shoulders counter-rotate, arms widest just
  after contact and not twins; a trailing heel peels as the leg needs (at most 16 deg a frame); a run lands its foot
  0.3 step ahead and has a gravity flight. Rules: `styles/stick-man/docs/MOTION-RULES.md`. The walks of all five bodies
  keep solved knees and elbows <= 27 deg a frame (test).
- `toPose(m, scale)`: a scaled figure's planted feet land where they were keyed in metres (`engine/play.js` passes the
  root scale; a `scale:k` costume benefits too).
- Rig K4: `solveArm({ keep })` tries every elbow turn before moving a gripping hand; `rigWorld()` `L/R.targetGapCm`, `grip`.
- Rig K5: hand props collide with legs, trunk and head (the holding arm moves, `propPenCm0/propPenCm`), their mass
  (`x_kg<side>` or the prop's `userData.mass`) is in the centre of mass (`carryKg`); `x_yaw<side>` turns an upright prop;
  `x_pitch<side>` tips it; `x_hpH_<kind>` wears a prop on the head; a prop with `userData.soft` (the cap) has no contact push.
  The arm re-solve after a prop push keeps the elbow on its side. `shrugL` / `shrugR` drop one shoulder (motion v2).
- Legs draw a deep knee as an angle: `cast.js` `hose(..., fold)` fades the bend roundness from 60 to 120 deg of flex
  (a knee in a climb or a squat no longer loops); walks (under ~65 deg) are unchanged. Hand props are in `__dbg` `held`, so `shot.mjs --report` (d) measures them (a two-hand prop from the hands' midpoint
  to its grip socket).
- `shot.mjs --report` lines (h) hand off its target while gripping (FAIL > 2 cm) and (i) held prop inside the body
  (FAIL > 1 cm after the solve).

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/motion-lib/props.js'`, a cast spec from `bodySpec(SPECS.X, 'child')`,
and `anim: { kid: [{ f: 0, clip: 'Move_Run_Fwd_Loop', body: 'child', to: [4, 0] }] }`.

## Driving it

- Offline checks of every clip: `node styles/stick-man/tools/motionlib.mjs` (32 PASS lines, exit 0); each line ends with the
  clip run through cast.js headless (fake 2D canvases): grip cm, prop cm, the solved joints' largest change a frame.
- One clip in the browser: `node styles/stick-man/tools/shot.mjs --film styles/stick-man/motion-lib/proof --w 540 --h 960
  --query "clip=Act_LiftHeavy_Once&phys=1" --frames 0-100 --report /tmp/lift.txt --fast 1`; read (h) and (i): PASS.
- A contact sheet: `node styles/stick-man/tools/motionlib.mjs --sheet Act --out /tmp/sheets`.
- Everything (mp4s on and off, reports, sheets; minutes, one render process): `--proof <dir>`.
- Regression: `node --test test/unit/stick-motionlib.test.mjs test/unit/stick-body.test.mjs test/unit/stick-motion.test.mjs`.

## Gotchas

- Clips plant feet with `footW`; a carried `footW` channel overrides `foot`, so hand keys after a clip use `footW`.
- Balance is the floor: a load held far out moves the hips (balanceCm) and a near-full reach then leaves its target, so
  heavy clips key the hips back and hand the weight to the floor or a sill while the load rests there.
- A shared clip on a smaller body scales its metres: its set pieces (`needs.marks`) must scale the same way.
- `x_hpB_<kind>` hangs a prop at the midpoint of the hands; a switch between sides in one frame jumps the prop by half
  the hands' spacing (the library hangs heavy bags on the right fist instead).
