# wif5 stills brief (shared by every part builder; director ep-whatif1-v5-director)

DESIRED RESULT: for your parts, one 720x1280 still per beat at FINAL light (no motion render yet), plus a close still at every
contact frame (a hand on a held thing, the blow). A viewer with the sound off must read the beat from the still alone.
The film: "What if every woman on Earth disappeared?" Read films/wif5/TREATMENT.md (your rows) and films/wif5/CAST.md.

PIPELINE: copy films/wif5/parts/a/ as your template (BUILD.md = Pro render steps, ~/v5-wif5 on the Mac Pro, renders take
seconds). One folder per part: films/wif5/parts/<p>/. Never edit tracked files, core/ or styles/. Part frames (film clock,
30 fps): a 0-504, b 504-984, c 984-1134, d 1134-1343, e 1343-1518, f 1518-1671, g 1671-1894, h 1894-2111, i 2111-2336,
j 2336-2876. Words on screen per frame: films/wif5/tools/timeline.py TEXT (they are drawn later, in the middle band).

RULES (from the first slice's blind review, films/wif5/FAULTS.md, and Studio):
- Fill the frame: the hero is at least 1/3 of the frame height in a beat still; camera low or close; a lit foreground
  (people, a counter, a prop catching light). No band of near-black floor or empty sky over 25 % of the frame.
- Keep hero faces and hands out of the middle band (y 38-62 %) while words are on screen; put them in the lower third
  or frame the face top, words between.
- The beat must read on the face AND the body: each beat its own expression (kit faces / person().expression()), the head
  turned to what he looks at. A look-up shows the head tilted up and the thing seen in the same frame.
- Thin black legs vanish on dark ground: light the floor under people (a practical pool) or pick a lighter floor.
- Light: films/wif5/LIGHT-RECIPE-V3.md. Colour lives in lights; no grade, no overlay, no full-screen colour fill (red alarm
  = red practicals on faces and walls). No hard light line across a face. Nothing flat near-white. Faces readable.
- Kit only through person()/place() from styles/stick-man/kit/film.js; casting from CAST.md: elder = 5 clips only
  (Idle_Breath, Idle_Stooped, Move_OldWalk, Walk, Run), child = Move_Walk_Fwd_Loop only (no child standing still in shot),
  no running/sitting/stooping in a coat, skirt, dress or apron. Hand props and set lights are untested: each pair needs a
  waiver { pair, why: 'V5 stills, measure not built', by: 'ep-whatif1-v5-director' }. Babies = a wrapped bundle prop.
- Every held thing touches the hand in the still (no prop in the air); nothing floats; feet on the ground.
- `node styles/stick-man/tools/gates/fits.mjs films/wif5/parts/<p>` exits 0 before rendering.
- Mac Pro only for renders; check `pgrep -fl "shot.mjs|ffmpeg|chrome-headless"` (another builder may be rendering: wait
  for it, a few seconds) and df; ~/pro-fans.sh run; delete only your own outputs. Commands over ~3 min in the background;
  timeouts; never hang; stop only your own pids. No downloads, no credentials, no messages to anyone.

ACCOUNTABILITY: per part, renders/beat_<frame>.jpg (+ contact_<what>.jpg), and a sheet renders/sheet.jpg (all stills side by
side, 1440 px wide). Return at most 15 lines: per part the sheet path, fits.mjs last line, waivers count, what you could not
do. CONSEQUENCE: a blind reader judges only the stills; what is not visible there is not done.
