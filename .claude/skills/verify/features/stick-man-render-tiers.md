# Stick-man render tiers

`styles/stick-man/tools/render/shot.mjs --tier <tier>` renders a stick-man film for one purpose at the size and look that
purpose needs. The tiers live in `styles/stick-man/tools/render/tiers.mjs`. Without `--tier`, every old flag works as
before.

| Tier | Name | Size | Look | Use |
|---|---|---|---|---|
| T0 | `dbg` | none | none | `--dbg`, `--report`, `--vis`, `--cues` data. `--mp4` and `--out` are refused. |
| T1 | `still` | 1080x1920 | full, lens blur on | stills only. `--scenes 1` picks the middle frame of each storyboard shot in `--frames`. |
| T2 | `proof` | 480x854 | `engine/look.js` `QUALITY.proof`: no MSAA, a 1024 sun shadow map, no lens blur, every light kept | a cheap watch at 1x speed |
| T3 | `review` | 720x1280 | full | what Kai watches, and what `colourgate.mjs` and `refbench.mjs` measure |
| T4 | `final` | 1080x1920 | full | refused unless `--kai-ok "<Kai's words>"` |

## Sub-features

- Quality reaches the page as `reel.html?q=proof`, which calls `setQuality` in `engine/look.js` before the stage is built.
- Segment cache (`render/cache.mjs`). A tier mp4 writes `<mp4>.json` beside it. The sidecar holds a key over the kit
  (the git trees of `styles/stick-man` and `kit/`, plus any uncommitted change), the tier, the size, the query, the
  frames, `vo/words.json`, the bible data, the muxed audio, and the content of every file the page loaded. The next run
  with the same inputs prints `cache hit` and renders nothing. A render starts by removing the old sidecar, writes the mp4 to a temp file renamed on success, and writes the sidecar last with the mp4's size and hash, so a killed or overwritten render is never a hit. Any change prints `cache miss: <input> changed`. A render
  from another tier is never reused. `--no-cache 1` always renders.
- Render lock (`render/lock.mjs`). Every pixel tier holds `~/.cache/stick-man/render.lock` (or `$STICK_RENDER_LOCK`)
  with a heartbeat every 20 s. On this host a lock is taken over only when its process is gone; from another host, after 120 s without a heartbeat. Takeover runs under an exclusive `<lock>.takeover` guard, so two takers never both win.
  `--lock-wait <s>` sets the wait (default 3600). `--min-free-gb` (default 5) refuses to start on a full disk.
- Audio shorter than the picture (`render/mux.mjs`). `--mp4` ends with the audio (`-shortest`), so a voice that stops
  before the last frame drops those frames: shot.mjs warns `[shot] the audio ends at ... lacks its last N frame(s)`.
  `--pad-audio 1` pads the audio with silence and keeps every frame (it joins the cache key only when set). Regression:
  `node --test test/unit/stick-shot-mux.test.mjs` (real ffmpeg: 30 of 60 frames without it, 60 with it).
- Pixel gates. `colourgate.mjs` exits 2 on a T2 proof (read from the sidecar) or on any mp4 under 720 wide, and tells
  you to render with `--tier review`.
- Mac Pro (`render/pro.mjs`). `node styles/stick-man/tools/render/pro.mjs -- <shot.mjs args>` packs `films/<ep>`
  without `renders/` and `deliver/`, then copies it by scp to `pro:stick-sync/<job>/`. An Orca terminal on `mac-pro`
  runs `git pull --ff-only origin main` and `pro.mjs --remote`. The remote side refuses when its HEAD is not the
  origin/main this machine fetched. It unpacks the episode, runs shot.mjs (lock and disk check), and packs the outputs.
  The local side copies them back into `films/<ep>/`. Outputs must sit under `films/<ep>/renders/`, stills in a folder of their own there. `--dry-run 1` prints every step and runs nothing.
- Delivery copy (`gates/copycheck.mjs`). A copy against the approved film: K1 frames and rate, K2a median SSIM over every
  approved frame, K2b torn frames (the local difference jumping over 90 against its neighbours), K2c no frame repeated or
  skipped (each frame's change against the approved's), K3 the same audio samples. The report always lists frames to look
  at beside the approved (`lookAt`): K2b only sees short tears in quiet stretches, and its limit comes from one film.
  Regression: `node --test test/unit/stick-copycheck.test.mjs` (clean, torn, shifted, short, re-mixed, dropped+repeated).

## Driving it

- `node styles/stick-man/tools/render/shot.mjs --film films/hm-ep01/parts/gun --frames 1200-1209 --tier proof --mp4 <dir>/c.mp4`
  run twice prints `cache miss: no earlier render with a sidecar`, then `cache hit: same inputs`. With `--frames
  1200-1210` it prints `cache miss: frames changed`.
- `node styles/stick-man/tools/gates/colourgate.mjs --mp4 <dir>/c.mp4 --script films/hm-ep01/colour-script.json` exits 2
  with "needs a T3 review render".
- `node styles/stick-man/tools/render/shot.mjs --film films/hm-ep01/parts/gun --frames 1140-1346 --tier dbg --dbg <rows>`
  writes rows byte-identical to the same command without `--tier`.
- Regression: `node --test test/unit/stick-render-tiers.test.mjs`.

## Gotchas

- At 480x854 a frame is only about 15 % cheaper than at 720x1280 on the MacBook Air. Per-frame scene work, not pixel
  count, sets the time there, so T2 saves less than its size suggests.
- Capping the lights at 8 point plus 4 spot saved about 30 % of a proof frame, but it dropped the warm car light from
  the hm-ep01 gun shot. T2 keeps every light.
- A part re-rendered alone restarts its cloth from rest on its first frame. The cache keys on the frame range, so a
  part's first frames match only an earlier render of the same range.
- The bible gate runs before the cache check. A bypassed film logs its bypass line on a cache hit too.
