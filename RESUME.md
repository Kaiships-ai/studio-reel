# RESUME kit-hair30 (PR #213, hair set B)

State 26/11: step 1 (long hair option A) built and measured; STOPPED on the measure, waiting for Studio.

- engine/cast.js: hair groups with userData.neckBound are drawn each pose2 where the head would be without the neck's nod/tilt/turn (S.neckLm).
- kit/cast/hair.js: mullet, bob, long, braids, lob have `neck: true`, `cut` removed (designed lengths back); falls/tails go into a neck-bound group. Bob has no falls, so nothing of it is bound (its hem is the head's scalp field).
- test/unit/hair-seam.mjs: seam opening per style/clip (mm further out of the crown than at rest, and slide mm).
- hair-measure.mjs: bound points measured through S.neckLm.

Seam result (max mm opening / slide mm): long 197/368, lob 190/411, braids 165/406, mullet 119/405, bob 0 (nothing bound).
Every clip opens >= 37 mm, incl. run and idle look-around: the head turns up to ~90 deg on the neck, so the crown's back
leaves the lengths. Option A as written tears at the crown. Not yet run: stick-hair-body sweep, temple fix, renders, sheet.

Next (after Studio decides, e.g. bind the lengths to a blend of head + neck, or limit head turn for long styles):
  cd ~/orca/workspaces/studio-reel/kit-hair-30
  for s in long bob lob braids mullet; do node test/unit/hair-seam.mjs $s; done
  node --test test/unit/stick-hair-body.test.mjs

## PAUSED 26/11 (Kai: budget to V5 until 1/12). Start no renders until resumed.

Remaining steps, in order:
1. Long hair option A: Studio decides how to handle the seam (above). Then run stick-hair-body (HAIR_IN_MM 4, frozen, never loosen),
   scalpgate stays <= 0.1 %, and fix the temple patches (hard straight edge at the cheek in 3/4).
   Studio's look notes, also in step 1:
   - 3/4 view: bob, long, braids, lob show a hard straight vertical edge across the cheek (a slab). Break it into locks.
   - bob, long, braids, buzz read as dark helmets/bowls: separated locks at the hem and round the face, face-framing strands on
     the long styles, braids that read as braids from the front.
   - very dark brown loses lock shading: test one lighter brown on the sheet.
   Proof: 720p close-ups per long style on Pro (run + look-up; check `ssh pro pgrep -f render/shot.mjs` first, queue behind part a),
   rebuild docs/hair-sheet/hair-sheet-mw.jpg:
     shot.mjs --page styles/stick-man/tools/run/hairsheet.html --query type=mw --frames 0-89
     hairsheet_compose.py <dir> docs/hair-sheet/hair-sheet-mw.jpg mw
2. Children: 4-6 popular kid styles, men/women order kept; scalpgate, hair-in-body, buzz/bald deliberate at beat-0 size; children sheet.
3. Teens and elders, only if 1-2 are clean.
