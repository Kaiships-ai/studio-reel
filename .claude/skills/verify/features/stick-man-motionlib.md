# Stick-man motion library and carried loads

A stick-man reel's motion v2 `anim` takes library clips: `{ f, clip: 'Move_Walk_Fwd_Loop', body: 'elder', to: [3, 0] }`
expands into the clip's keys (`styles/stick-man/motion-lib`, 52 clips, 5 body types; the adult's 29 Mixamo and 8 Quaternius UAL (CC0) captures; standard poses STAND, SIT, CARRY, LIE, HUG (a duffel hugged to the chest); captured keys play without the drag (motion.js raw) (ref/mocap.js): run, sprint, walk with their captured start and stops, jump, idle, look around, talk, point, wave, sit down, sit, stand up, seated point, pick up, quarter turn, a window climb from two captures joined (mocapJoin: feet and hands on a sill, ref/mocap.js surfaces)). The rig under it gained body
proportions (cast spec `scale`, `headScale`, `legScale`, `kg`), a hand that grips keeps its target or reports the gap
(rig K4), and a carried prop that is a solid with mass (rig K5). A reel without `clip` keys or new spec fields renders as
before, except where an old one had a hand forced off a target (now kept when reachable) or a held prop inside the body.

## Sub-features

- `clip` keys: `to` (heading, fitted cycles, first and closing steps), `times` (a captured loop in place blends in once,
  repeats its capture, blends out once: a phone stays at the ear), `stop`, `pos`, `yaw`, `swap`, `expr`. Every clip starts
  at its own origin (`index.js` zeroes its first key and its marks), so clips chained in one track never jump the actor.
- `fit`: a clip fitted to the film's set, `{ clip: 'Act_DropInTrunk_Once', fit: { lip: 0.85 } }`,
  `{ clip: 'Trans_JumpWindow_Once', fit: { sill: 0.8, top: 1.9, width: 1.0 } }` (a narrower window draws the airborne legs in
  toward the hips and thrusts the bag through ahead), `{ clip: 'Act_HandOver_Once', fit: { top: 1.12 } }` (the cash set down on
  a higher counter), `{ clip: 'Act_PushBagOutWindow_Once', fit: { sill: 0.8, top: 1.9, width: 1.0, depth: 0.138 } }` (the bag heaved
  over a window's sill and out: it falls outside on the ground) (index.js `fitClip`; a record's `fit(opts)`
  makes it, its `fitChecks` are checked by motionlib.mjs as rows of their own; `--proof <dir> --only <clip> --fit '<json>'`).
- Bag size (PR E): a clip whose record names `fitProps: ['bag']` (Act_DropInTrunk_Once, Act_PushBagOutWindow_Once) fits
  itself to the bag it holds: the key's `fit.bag` (`{ w, l, h, grip }`, m), else the prop the key swaps in, read off the built
  prop (`index.js propSize`: its `userData.size` [w, h, l] and grip, else its meshes' box). A swapped prop with neither (a
  film builder that returns an empty group until its set is built) throws in `propFit`, naming the clip and the prop; it
  used to drop out of the fit silently and play the kit bag's keys (Hot Money ep01: hand 7.76 cm off). The kit bag names its size
  (`props.js` BAG); `sizedBag(dims)` registers a kit bag of another size (fitChecks and the proof page play it for a fit
  that names a bag). A deeper bag is heaved from further off the edge (the trunk / window mark moves out 1.25 times the
  extra depth), a higher handle raises the fists, the bag is tossed up as it leaves the fingers. At Hot Money ep01's duffel
  (0.36 x 0.62, handle 0.415) on a 0.85 m lip: hand 19.6 -> 1.7 cm off its target, the bag in the trunk, not on the ground.
  Trans_JumpWindow_Once takes no bag size yet: with that duffel the leap puts it in the head and the hand 7.7 cm off (open).
- Film keys in the gate (PR H): `motionlib.mjs keyed(C, key)` plays a clip as a film's key does, with its `swap`, `pos`,
  `yaw` and `collide` (the set pieces beside it); a swap value is a prop kind or a prop's contract `{ mode, grip, size }`
  (`props.js heldProp`, a box; `propSwap` throws on a kind nothing registered). A record's `propChecks` are checked as rows
  of their own (Gest_PhoneCall_Loop: Hot Money ep01's desk handset turned up), and `--only <clip> --check '<json>'` runs one
  film key. `contractFails`: a swapped prop longest along another axis than the kit prop it stands in for fails (the ep01
  handset, long side across: hand 10.6 cm off, 10.6 cm in the head; the kit gate had said 0). At SH245's place, 0.30 m behind
  its counter, the reach to the ear stops on the counter: 18.85 cm off at frame 195, as the film's render. The proof page
  takes `swap=<json>` the same way.
- `support`: a clip key `pos: [x, y, h]` plays the clip on a surface h m high (a bed, a stage): every key is lifted and
  held up there (motion.js counts a flight only above `support`); the next clip carries it on: Trans_LieDown_Once ->
  Idle_Sleep_Loop -> Trans_GetUp_Once on a 0.55 m bed (test). A capture blend whose pelvis turns more than 45 deg (the
  sleeper rolling from LIE onto the side) turns it as a lying body does (`base.js slerpPelvis`: the trunk's line kept
  lying, rolled about it), a key a frame: the sleeper no longer sits up as the loop opens and closes.
- Prop spans ride on the keys: placeClip puts them on every key of the clip key (`clipProps`, frames from that key), so a
  film that copies, maps, spreads, re-sorts or trims its anim keeps a prop it lets go (play.js `.map()`ped them away).
- The set stops held props as it stops hands (`body.js worldBox boxPush`: the prop's box against each piece, out toward the
  body holding it, never through a thin wall); a held prop the arms cannot take out stays on the piece and the hands stay
  where they got to (their gap is reported). A prop at rest or falling (`propobj.js`) is tested by its extent and settles
  out of a piece it lands across.
- Ik poles: a keyed pole takes the elbow from where the FK arm has it as far as ikw goes (cast.js); the reach tables
  (`mocap_contact.mjs`, `mocap_reach.mjs`) bake the captured elbow's own side per row (`body.js elbowSide`). Knee poles do
  not flip for a foot out to the side at hip height (cast.js legPole). The captured arm swing's seam sits behind the head
  (ref/mocap.js), not straight up, and the captured arm's raise and swing are held to the rig's ranges with the elbow's
  roll measured round the held upper arm. A captured trailing foot peels its heel over the 6 frames before it lifts, as
  far as its captured knee needs (base.js peelFor; CarryBag walk knee 33.4 -> 20.4 deg/f). A grounded capture's raised
  foot shows the captured knee (reachFoot).
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
- Faults by the shot's camera (`tools/faults.mjs`, `engine/visible.js`, `window.__vis`): every (h), (i) and joint-step
  fault frame is tagged `in`, `occluded` or `off` from the camera of that render. The tag uses the points that show the
  fault: the hand, its target and the props it holds (`rigWorld()` `L/R.target`, `heldPts`), the prop's box
  (`propPts`), and the joints and bones a channel moves (`jointstep.mjs` `stepPoints`). A ray hits only opaque meshes
  the render draws (glass hides nothing). The actor's own body and what it holds never hide its own fault. Only `in`
  frames are judged. The others print on an `ẩn` line with their frames and worst number. The library gate keeps
  judging in 3D. Check it: `node --test test/unit/stick-visibility.test.mjs` (SH245 rows), then `shot.mjs --report`
  on a film with a counter. The (h) line lists the hidden frames under it.
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
- gaitLoop on a capture: frames with both feet up keep the stance's hip correction (eased between stances), and the
  correction changes at most 0.01 W a frame, so the hips no longer jump as the last foot lifts (Move_PushHeavy_Loop loop
  frame 37: 8 cm) or as one foot leaves double support (Move_CarryBag_Walk_Loop's captured stop: 6 cm).
- Body versions of the flashlight walk: `Heavy_` / `Thin_Move_WalkFlashlight_Loop` (`flashlightWalk(body)`); a walk faster than
  the adult's takes its closing step that much longer (thin: knee 26.5 -> 20 deg/f).
- `docs/MOTION-LIB.md` is written by `motionlib.mjs --catalogue` from the clips (a test fails when it is stale).

## How to get to it (user POV)

In a film's `reel.js`: `import '/styles/stick-man/motion-lib/props.js'`, a cast spec from `bodySpec(SPECS.X, 'child')`,
and `anim: { kid: [{ f: 0, clip: 'Move_Run_Fwd_Loop', body: 'child', to: [4, 0] }] }`.

## Known gaps (PR G, waiting on Kai)

- The gate's figure wears a cap only for clips with `needs.cap`. Wearing the guard's cap, these clips hold a prop in it
  today: Act_Consume_Once 4.07 cm, Act_Phone_Once 7.74, Gest_PhoneCall_Loop 2.97, Act_PickUp_Once 1.14, Act_PutDown_Once
  1.29, Move_PushHeavy_Loop 1.39, the DropInTrunk and PushBagOutWindow bag fits (physics off).
- Only worn head gear is tested every 2 cm of a prop's box; the body and legs still take the box's 27 corner, edge and face
  points. Tested every 2 cm, the bag of Gest_LookBackCarry_Once (1.32 cm), Move_CarryBag_Walk_Loop (1.77) and the two bag
  fits (2.2) sit in the body (physics off).
- A film that swaps in its own, bigger prop is not gated (ep01 SH172's 1.53x `hm_pistol`: 1.46 cm in the cap, the hand
  5.27 cm off): PR H.
- tools/mocap_contact.mjs now eases the hand's offset from the capture, not its position; only `ref/reach/pistol_head.js`
  is baked that way. The other tables change on their next bake.

## Driving it

- Offline checks of every clip: `node styles/stick-man/tools/motionlib.mjs` (one PASS line a clip, exit 0); each line ends
  with the clip run through cast.js headless (fake 2D canvases) with its set pieces, physics on and off: grip cm, prop cm,
  held frames, the solved joints' largest change a frame. It fails a clip that holds an undeclared prop, declares one it
  never holds, acts on a thing (`OBJECT_ACT`) without one, moves its root faster than 4 cm a frame outside the capture, or
  starts off its origin. The solved-joint gate (`jointExcess`, `jointFails`, physics on and off) uses the film report's
  own measure, `tools/jointstep.mjs` (`jointSteps`, shared with `shot.mjs`): every flex (knee, elbow, foot pitch), the
  torso's lean and roll and the four limb bones' directions turn at most 25 deg a frame, with no allowance for a capture
  that turns faster. `JOINT_KNOWN` lists the 12 rows it fails today with their measured excess over 25 (runs' and leaps'
  knees and feet, see the comments):
  a listed row fails if its excess grows or if it passes clean (delete it), so the list only shrinks. A held prop stops
  on what the head wears as on the skull (cast.js `headWear`: a cap's crown and its peak, tested every 2 cm of the prop's
  box); the figure is bare headed unless the clip says `needs.cap` (Act_PistolShoot_Once: the guard's cap, also on the
  proof page). A prop inside a set
  piece fails (`propInSet`). `rigClip(C, body, { obstacles })` takes a film's own set pieces (ep01's 1.12 m counter beside
  the phone call). Physics gates on and off (`physicsFails`): a prop moves no more than its hand (times w) plus
  gravity plus 1 cm a frame (`PROP_SLIP_CM`, `propExcess`; a prop seen again after a gap is measured from where it was
  last seen), a declared prop is in the scene every frame of the clip, the balance solve moves the pelvis at most 4 cm a
  frame (`BAL_CM`: only the balance shift, pelvis balance on minus off; the raw pelvis speed is reported, not gated), the
  load steps at most 35 % a frame (`MASS_STEP`; holdKeys' linear ramp is 25 %, a keyed release eased by the dose peaks
  higher: Act_DropInTrunk_Once is 34 %).
- The bag clips at a film's bag: `node styles/stick-man/tools/motionlib.mjs --proof <dir> --only Act_PushBagOutWindow_Once --fit
  '{"sill":0.8,"top":1.9,"width":1.0,"depth":0.138,"bag":{"w":0.36,"l":0.62,"h":0.30,"grip":0.415}}'` (the proof page plays a
  kit bag of that size); the side view: shot.mjs `--query "clip=Act_PushBagOutWindow_Once&fit=...&view=side&wide=1"`.
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
