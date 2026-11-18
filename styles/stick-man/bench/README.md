# Rick clip benchmark

Kai's bar for a stick-man film is the three "Rick clip" shorts. This folder turns that bar into numbers. One tool,
`styles/stick-man/tools/refbench.mjs`, measures the Rick clips and our renders the same way. `TABLE.md` holds the gap
per metric, and every later kit or film fix aims at closing one of those gaps.

A reference is a bar only. The Rick mp4 files and their frames never enter git or a shipped file. This folder keeps
the numbers measured from them.

## What is here

| File | What it holds |
| --- | --- |
| `rick/<id>.json` | One row per Rick clip: film-level metrics, one row per shot, the loudness curve, the 5 s bed levels. |
| `ours/<film>.json` | The same rows for our renders (round 4 v1 and v2). |
| `noise-<clip>.json` | The noise floor: the same clip measured twice, then three re-encodes. |
| `counts.json` | Blinks and depth planes, counted by two blind agents on 30-frame strips. |
| `TABLE.md` | The gap table, written by `refbench.mjs table`. |

## Rebuild

Run these from the repository root. One clip takes 15 to 25 s on an M-series Mac.

```sh
~/.local/bin/yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]" --merge-output-format mp4 -o "<cache>/%(id)s.mp4" https://www.youtube.com/shorts/HxqtHI62otM
node styles/stick-man/tools/refbench.mjs <cache>/HxqtHI62otM.mp4 --url https://www.youtube.com/shorts/HxqtHI62otM --out styles/stick-man/bench/rick/HxqtHI62otM.json
node styles/stick-man/tools/refbench.mjs films/<film>/renders/<film>_v1.mp4 --stems films/<film>/audio/stems --out styles/stick-man/bench/ours/<film>_v1.json
node styles/stick-man/tools/refbench.mjs noise <mp4> --out styles/stick-man/bench/noise-<clip>.json
node styles/stick-man/tools/refbench.mjs table styles/stick-man/bench
```

The three clips are `HxqtHI62otM`, `LC8hYwUZ-kU` and `VS1Z_Q-Klt8`. YouTube serves them at 1080x1920, 30 fps. The
`--stems` folder needs an `sfx.wav` rendered with the same mix as the mp4. Without it, the two effect rows read n/a.

## The noise floor

Every metric is deterministic: two runs on the same file give the same value, to the last digit. The floor is the spread
over three copies that a viewer cannot tell apart from the original: CRF 28, 720x1280, and the film shifted by one frame.
`TABLE.md` uses the larger floor of the two clips measured (Rick clip 1 and our v1). A gap counts as real only when it
is larger than the floor and our value sits outside the Rick band (the lowest to the highest of the three clips).
An estimate checked against ground truth also carries its method error (`methodErr` in `METRICS`), and the floor is the
larger of the two. The bed rows carry 2.9 dB, and the bed drop carries 4.1 dB (see Bed below). The two agent counts
use the largest spread between the two agents as their floor.

The 720x1280 copy found one bias. At first the tool measured sharpness at 540x960. Rick clip 1 read 2.85, and its
720p copy read 2.32. That gap is about half of the distance to our 720p renders, so it came from resolution, not from
the craft. Now sharpness and flow run at 360x640, and the 720p copy reads 3.00 against 3.04 for the original.

## Metrics: method, what a number can tell, what it cannot

**Cut rhythm** (hard cuts a minute, longest take, median take). This uses the same code as `cutgate.mjs`: an ffmpeg
scene score of 0.30 or more at 270 px wide, with hits less than 0.2 s apart merged into one cut. It can tell how often
the picture jumps. It cannot see a dissolve, a whip pan or a flight that changes the view. The Rick clips change the
view every 1.5 to 2 s with camera flights and dissolves, so one cut a minute does not mean "one view a minute".

**Luma and saturation.** These are the mean of ffmpeg `signalstats` YAVG and SATAVG over every frame at 180 px wide,
the chain the round 4 film log uses. They can tell overall brightness and colour strength. They cannot tell where the
light sits in the frame or whether the colour script fits the mood.

**Depth** (sharpest edges, softest edges, depth ratio). The frame is split into 20 px cells at 360x640. The caption
band (60 to 80 % of the height) and the top HUD band (0 to 10 %) are left out. A cell counts when its 95th-percentile
gradient is 6 grey levels a pixel or more. Its edge sharpness is the 95th-percentile Laplacian over the
95th-percentile gradient. For a blurred step edge this ratio is about 1 / blur width, whatever the edge contrast, so a
flat wall does not read as blurry. "Sharpest" is the 90th percentile of the cells, the in-focus plane. "Softest" is the
25th percentile, mostly the background. Depth ratio is sharpest over softest. The unit test proves the scale: Gaussian
blur sigma 4 against sigma 8 gives a ratio of about 2. These rows can tell how much the focus falls off across the
frame. They cannot tell which cell is the subject, because a sharp prop behind a soft face reads the same as the
reverse. Painted-in softness (a soft-textured backdrop) reads like lens blur.

**Motion** (camera motion, camera still share, motion inside slow shots, motion while the camera is still).
Lucas-Kanade flow runs on 20 px cells at 360x640 on every frame pair, with the caption and HUD bands left out and the
pairs across a hard cut skipped. Camera motion is the median cell speed. A pair counts as still under 0.2 px a frame
and as slow under 2 px a frame (both at 1080 wide). "Inside slow shots" takes out the median vector (the pan) and
reports the 90th percentile of what is left. That is the moving figure, plus parallax when the camera travels. "While
the camera is still" uses still pairs only, so it holds no parallax, but it needs 15 still pairs and reads n/a
otherwise. These rows can tell whether things move inside a held view and how fast the camera travels. They cannot
separate a breath from a gesture or a figure from a moving prop. Our round 4 camera never stops (0 still pairs in 2,700),
so for our films the figure's idle motion and the camera's parallax cannot be told apart. The Rick clips hold still in
about 4 % of their frames.

**Blinks and depth planes** (counts). The `strips` command writes ten 30-frame strips per video, spread evenly over
the film. Their names are shuffled, and two fresh agents count each strip without knowing its video. Blinks per 10 s
come from the strips where the agent saw a face. Depth planes are the distance layers in each strip's first frame. The
spread between the two agents is the floor of these rows. A count can tell whether faces blink at all and how layered
a set looks. It cannot be precise, because faces are small in wide shots.

**Loudness** (whole film, first 3 s, range, true peak). These come from ffmpeg `ebur128` with `peak=true`. The first
3 s is the integrated loudness of the audio cut at 3 s. These rows can tell the level and the dynamics. They cannot tell
what makes the sound loud: voice, music or an effect.

**Speech share.** This is the Silero voice detector bundled with faster-whisper. It can tell how much of the film has
a voice. It reads the Rick clips as 100 % speech, because their narration runs from the first frame to the last with
music under it.

**Bed** (presence, level, under the loud parts, biggest drop). The audio is cut into 50 ms blocks and grouped into 5 s
sections. A section's bed level is its 10th-percentile block, the quiet moments between words, where only music and
ambience remain. "Under the loud parts" is the 90th-percentile block minus the bed, as a median over sections. A
section counts as having a bed when that level is over -45 dBFS. The biggest drop is the largest fall in bed level
between two neighbouring sections. We checked this against our v1 stems: the estimate tracks the real music and
ambience level with a correlation of 0.80, a bias of -2.0 dB and a spread of 2.9 dB (18 sections). These rows can tell
whether a bed runs under the film and where it drops. They cannot tell music from ambience, or a bed from a sustained
effect.

**Effects** (effects a minute, cuts with an effect within 0.1 s). These are spectral-flux onsets on the sfx stem that
come within 3 dB of the mix level, so a buried tick does not count. They need a stem. On a finished mix, the same
detector found the effects of our v1 with a precision of 0.12 and a recall of 0.65 against its own sfx stem. Speech
syllables swamp it. So the Rick clips read n/a here. Their effect rate needs a listening count, by a person or by an
audio model.

## Where the numbers come from

Our v1 row reads the same values as the round 4 film log: mean luma 97.7 (log 97.7) and 12 hard cuts (`cutgate.mjs`
12). The blur, still-camera and loudness rows each have a synthetic clip with a known answer in
`test/unit/refbench.test.mjs`.
