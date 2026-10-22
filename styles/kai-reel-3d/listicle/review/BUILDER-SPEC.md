# listicle · chapter builder spec (one builder per chapter file) · from reel63 v2 (Kai 100/10)

Orchestrator: copy to the reel's `review/`, fill every `<…>`, paste it into each builder's prompt with the chapter id + times.

Project: `films/<reelNN-slug>/` in the studio-reel library (run every command from there, through `pixi run`).

**Goal.** Build YOUR chapter with the ADHD camera from round 1: motion metric median **≥ 12** on the blurred render (reference @nocodealex 12.0;
reel63 v2 chapters 15–22, Kai 100/10). Follow the storyboard's story beats, cast and continuity prop. Go all out inside
the frame: you own the creative calls (which move, which prop, which gag).

**Read first:** `STORYBOARD.md` (your row in the camera-beat table + "Hard rules"), your chapter file `src/ch/<id>.js`,
`src/ch/kit.js` (bottom: `camPath(t, K)` and `shake(t, times, amp)` — use them for cam()), `src/set.js` (canon sizes), `src/motion.js`.

**Camera rules (LISTICLE.md v1):** a camera beat every 1–1.5 s keyed to a word (`W(line, word)`, never a hard-coded second); shot
scale alternates ECU/CU ↔ MED/WIDE at least every 2 s; props fly TOWARD the lens (pass close, never over a face); an on-screen event every
0.3–0.5 s; fast moves (whip 0.15–0.3 s, crash zoom, push-through) ease in/out via camPath (motion blur is added at render: `--sub 4`).
Banned: a hidden snap (a 1-frame jump with no motion around it), any `Math.random`, hard-coded seconds for hits.

**Hard rules (paste of LISTICLE.md):**
- 1080×1920, 30 fps. Nothing important at y > 0.80 or x > 0.833 (IG UI). No face or key object in the caption band y 0.68–0.77.
- Every number on screen comes from the script (54, 20, 350+, 1.5B, 25, CODING, LIMIT). Invent visuals freely, never facts.
- Nothing drawn over Clawd's face (props, plates, debris). Plates leave the frame before a zoom; never tiny text (≥ 46 px glyphs at 1080 w).
- Clawd canon (2 vertical slot eyes, no mouth). Every Clawd the viewer should read faces the camera: `yaw = yawTo(pos, camPos)` or 60 % there;
  both eyes visible. Hero action in y 0.22–0.66. No helmet/visor over eyes.
- Only edit your own `src/ch/<id>.js`. Need a change in a shared file (`set.js`, `reel.js`, `kit.js`, `stage.js`)? Do not edit it: write
  the request in your report.
- Pure function of t; `hsh` for randomness; easing/spring numbers from `src/motion.js` / kit helpers.
- The router (reel.js) adds ONE sideways camera offset per chapter to keep the hero's eyes at x ≤ 0.79 (`chapterOffset`). Frame your hero so
  the offset stays ≈ 0 (check: `node render/dbg.mjs "window.__dbg.OFF(<chapter index>)" 2>/dev/null | tail -1`; want ≤ 0.2 — a big offset shifts your WIDE shots off-centre).
- Keep `cues` up to date: one cue `{ t, kind, note }` per hit/event that should have a sound (kinds in audio/sfx.py, e.g. whoosh, impact,
  pop, click, clank, coins, tumble, spring, land, rev, flag, drop, shimmer, toggle, ratchet). Add `whoosh` cues on fast whips/crash zooms.

**Measure before you report (no number = not done). Chapter times:** <from `node render/dbg.mjs "JSON.stringify(window.__dbg.CH.map(c=>[c.id,c.t0,c.t1]))"`>.
1. Motion metric (your window = chapter t0 + 0.15 → t1 − 0.15, which skips the router's wipe):
   `node render/shot.mjs --fps 30 --sub 4 --shutter 0.5 --workers 2 --size 540x960 --start <t0+0.15> --end <t1-0.15> --out renders/_m_<id>.mp4 && pixi run python review/motion.py renders/_m_<id>.mp4`
   → median ≥ 12 (report median + p75).
2. Hidden snaps: `node review/ref-measure/camspeed.mjs 2>/dev/null | pixi run python review/snaps.py <t0> <t1>` → `snaps 0` (report the line).
3. Faces in the safe zone, every frame of your chapter (the router's hero = your `hero(t)`):
   `node render/dbg.mjs "JSON.stringify((()=>{const D=window.__dbg,o=[];for(let f=<F0>;f<<F1>;f++){const s=D.prep(f/30);D.camera.position.copy(s.pos);D.camera.fov=s.fov;D.camera.updateProjectionMatrix();D.camera.lookAt(s.tgt);D.camera.updateMatrixWorld();const p=D.S_.face.clone().project(D.camera),x=(p.x+1)/2,y=(1-p.y)/2;if(p.z<1&&(x>0.83||x<0.05||y>0.8||y<0.05||(y>0.68&&y<0.77)))o.push([f,+x.toFixed(2),+y.toFixed(2)])}return o})())" 2>/dev/null | grep -v -e LOG -e ERR`
   (F0/F1 = frame numbers = seconds × 30) → `[]` or a short list you explain.
4. Look: `node render/sheet.mjs --from <t0> --to <t1> --n 24 --cols 8 --size 270x480 --out review/sheet_<id>.png` and open it with Read.
   Check: eyes visible, nothing over faces, plates readable, the beats read, no empty frames. Fix and re-measure.
Do not run `review/audit.mjs`, `review/gate.py` or `audio/score.py` (the orchestrator runs them; other builders work in parallel).
Delete your `renders/_m_<id>.mp4` when done.

**Report (≤ 20 lines):** motion median/p75, snaps line, face-check result, OFF value, the beat list you built (word → move → scale),
cues added, any shared-file request, anything you are unsure about. Never write "checked" without the number.

**Lessons from reel63 (read before you start):**
- Measure motion on a BLURRED render (`--fps 30 --sub 4 --size 540x960`): blur lowers the number 1.5–3 vs the 10 fps sheet render. Report the
  weakest half second too (`review/motion.py <mp4> a-b …`): it is usually the payoff hold — give it a push + events (sparks, hops, puffs).
- The face check uses the hero face POINT; it cannot see occluders (a cockpit rim, a hose, a gauge). Eyes count only if you see both on the sheet.
- Plates/numbers: project their 4 corners per frame (not by eye); inside x 0.12–0.8, y 0.18–0.66; scale them away right after their beat
  (no cut fragments later); never under the title strip (y 0.10–0.17).
- `camPath` orbit/dolly holds are safe; shake amp ≤ 0.07 (0.12 made a snap).
