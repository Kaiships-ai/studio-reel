# Stick-man motion library and carried loads

A stick-man reel's motion v2 `anim` takes library clips: `{ f, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] }`
expands into the clip's keys (`styles/stick-man/motion-lib`, 46 clips, 5 body types; the adult's 29 Mixamo and 8 Quaternius UAL (CC0) captures; standard poses STAND, SIT, CARRY, LIE, HUG (a duffel hugged to the chest); captured keys play without the drag (motion.js raw) (ref/mocap.js): run, sprint, walk with their captured start and stops, jump, idle, look around, talk, point, wave, sit down, sit, stand up, seated point, pick up, quarter turn, a window climb from two captures joined (mocapJoin: feet and hands on a sill, ref/mocap.js surfaces)). The rig under it gained body
proportions (cast spec `scale`, `headScale`, `legScale`, `kg`), a hand that grips keeps its target or reports the gap
(rig K4), and a carried prop that is a solid with mass (rig K5). A reel without `clip` keys or new spec fields renders as
before, except where an old one had a hand forced off a target (now kept when reachable) or a held prop inside the body.

## Sub-features

- `clip` keys: `to` (heading, fitted cycles, first and closing steps), `times` (a captured loop in place blends in once,
  repeats its capture, blends out once: a phone stays at the ear), `stop`, `pos`, `yaw`, `swap`, `expr`. Every clip starts
  at its own origin (`index.js` zeroes its first key and its marks), so clips chained in one track never jump the actor.
- `fit`: a clip fitted to the film's set, `{ clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85 } }`,
  `{ clip: 'Trans_JumpWindow_Once', fit: { sill: 0.8, top: 1.9, width: 1.0 } }` (index.js `fitClip`; a record's `fit(opts)`
  makes it, its `fitChecks` are checked by motionlib.mjs as rows of their own; `--proof <dir> --only <clip> --fit '<json>'`).
- `support`: a clip key `pos: [x, y, h]` plays the clip on a surface h m high (a bed, a stage): every key is lifted and
  held up there (motion.js counts a flight only above `support`); the next clip carries it on.
- Props are declared: a clip whose keys hold `x_hp<L|R|B>_<prop>` names it in `needs.props` on `needs.hands`
  (`base.js holdKeys`); `motion-lib/props.js` adds `hugbag` (both arms), `crate` (pushed, stands on the floor:
  `userData.floor`), `hotdog`, `pistol`. A prop's `userData.grip` is the point the fist holds: a film's own prop (`swap`)
  sets its grip and mode, no offset.
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
- Rig K4: `solveArm({ keep })` tries every elbow turn before moving a gripping hand, and a gripping hand that no turn clears
  stays on its grip (the overlap is reported as `penCm`, the hand never steps off); the upper arm's first half is not
  tested against the trunk or the head (the shoulder is fixed to them); `rigWorld()` `L/R.targetGapCm`, `grip`.
- Rig K5: hand props collide with legs, trunk and head (the holding arm moves, `propPenCm0/propPenCm`), their mass
  (`x_kg<side>` or the prop's `userData.mass`) is in the centre of mass (`carryKg`); `x_yaw<side>` turns an upright prop;
  `x_pitch<side>` tips it; `x_hpH_<kind>` wears a prop on the head; a prop with `userData.soft` (the cap) has no contact push.
  The arm re-solve after a prop push keeps the elbow on its side. `shrugL` / `shrugR` drop one shoulder (motion v2).
- Legs draw a deep knee as an angle: `cast.js` `hose(..., fold)` fades the bend roundness from 60 to 120 deg of flex
  (a knee in a climb or a squat no longer loops); walks (under ~65 deg) are unchanged. Hand props are in `__dbg` `held`, so `shot.mjs --report` (d) measures them (a two-hand prop from the hands' midpoint
  to its grip socket).
- `shot.mjs --report` lines (h) hand off its target while gripping (FAIL > 2 cm) and (i) held prop inside the body
  (FAIL > 1 cm after the solve).
- Set pieces a clip names (`needs.marks`: window, trunk and its floor, counter) are solid through `base.js markColliders`,
  one list for the render (`proof/set.js`) and the headless check, so the check sees what the render does.
- Props as scene objects (`engine/propobj.js`, PR C): a prop a clip key holds is one object for the key's span
  (`placeClip` `props`, `track.props`), and beyond it to the track's end once let go (or from its start before a grab).
  `x_hp` is the attach weight (holdKeys ramps it over 4 frames centred on `from` / `to`): 1 in the hand; 0 before a grab
  at rest where the hand will take it (set down on the floor or a collider top); 0 after a release falling from the hand
  with the hand's speed plus the clip's `toss` (m/s, clip space) onto the floor or a collider top; between, lerp + slerp.
  A floor prop (the crate) stays at its rest until the hands hold it fully. The rests are the rig's own transforms at the
  edge frames, cached once per track (`propPlan(track, Qat, S)`; play.js, rigClip and films share it; `Q.propRest`). The
  load is `x_kg` times the weight; a floor prop weighs nothing. The arm blends its gripping and free contact solves by the
  weight (no 7 cm step at a release). `S.propState[id] = { w, v }`; `__dbg` held counts only w = 1.
- Balance (rig B4) is weighed: `(1 - fall) (1 - x_raw) (1 - lean on a floor prop) x_stand`. `x_raw` (motion.js): a
  captured pose carries its own balance. `x_stand` (motion.js): both feet down, eased over 3 + 3 frames each side, so the
  solve never switches as a sole lands. `rigWorld().balanceCm`, `S.rig.balanceHip` (the hips' shift, W).
- gaitLoop on a capture: frames with both feet up keep the stance's hip correction (eased between stances), so the hips
  no longer jump as the last foot lifts (Move_PushHeavy_Loop loop frame 37: 8 cm).
- `docs/MOTION-LIB.md` is written by `motionlib.mjs --catalogue` from the clips (a test fails when it is stale).

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/motion-lib/props.js'`, a cast spec from `bodySpec(SPECS.X, 'child')`,
and `anim: { kid: [{ f: 0, clip: 'Move_Run_Fwd_Loop', body: 'child', to: [4, 0] }] }`.

## Driving it

- Offline checks of every clip: `node styles/stick-man/tools/motionlib.mjs` (one PASS line a clip, exit 0); each line ends
  with the clip run through cast.js headless (fake 2D canvases) with its set pieces, physics on and off: grip cm, prop cm,
  held frames, the solved joints' largest change a frame. It fails a clip that holds an undeclared prop, declares one it
  never holds, acts on a thing (`OBJECT_ACT`) without one, moves its root faster than 4 cm a frame outside the capture, or
  starts off its origin. Physics gates on and off (`physicsFails`): a prop moves no more than its hand (times w) plus
  gravity plus 1 cm a frame (`PROP_SLIP_CM`), a declared prop is in the scene every frame of the clip, the balance solve
  moves the pelvis at most 4 cm a frame (`BAL_CM`: pelvis balance on minus off), the load steps at most 35 % a frame.
- One clip in the browser: `node styles/stick-man/tools/shot.mjs --film styles/stick-man/motion-lib/proof --w 540 --h 960
  --query "clip=Act_PutDown_Once&phys=1" --frames 0-350 --report /tmp/putdown.txt --fast 1`; read (h) and (i): PASS.
- A contact sheet: `node styles/stick-man/tools/motionlib.mjs --sheet Act --out /tmp/sheets`.
- Everything (mp4s on and off, reports, sheets; minutes, one render process): `--proof <dir>`.
- Regression: `node --test test/unit/stick-motionlib.test.mjs test/unit/stick-body.test.mjs test/unit/stick-motion.test.mjs`.

## Gotchas

- Clips plant feet with `footW`; a carried `footW` channel overrides `foot`, so hand keys after a clip use `footW`.
- Balance is the floor: a load held far out moves the hips (balanceCm) and a near-full reach then leaves its target, so
  heavy clips key the hips back (Act_DropInTrunk keys the 0.21 W the solve wanted) and hand the weight to the floor or a
  sill while the load rests there. A captured clip gets no balance solve (its capture has it).
- A release is blended: a toss whose hands stop dead drags the bag back toward them; the hands follow it out (DropInTrunk).
- A film that drew its own floor bag where a clip let one go now shows two: the clip's prop stays in the scene.
- A shared clip on a smaller body scales its metres: its set pieces (`needs.marks`) must scale the same way.
- `x_hpB_<kind>` hangs a prop at the midpoint of the hands; a switch between sides in one frame jumps the prop by half
  the hands' spacing (the library hangs heavy bags on the right fist instead).
