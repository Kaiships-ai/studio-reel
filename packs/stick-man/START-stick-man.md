# Stick-man reels: start here

The stick-man pack makes short vertical story reels (1080x1920, 30 fps) with 3D stick figures: your idea becomes a
script, a voice, a scene with characters who act and react, an automatic camera, captions and sound. Everything runs
on your computer; only the voice uses an online service (Google Gemini, with your own key).

What is in the pack: [`styles/stick-man/README.md`](styles/stick-man/README.md). Licences:
[`styles/stick-man/LICENSES.md`](styles/stick-man/LICENSES.md).

Run every command from this folder (the one this file is in).

## 1. Install (once, about 10 minutes)

**Unzip into a short folder path**, for example `~/kaiships-studio` (macOS, Linux) or `C:\kaiships-studio` (Windows).
The full path of the folder must be **83 characters or fewer**: the installer stops with `✗ folder path` in a longer one
(a Downloads folder inside a synced cloud drive is often too long). Moving the folder after installing breaks it: unzip
again instead.

Open a terminal in that folder. If `pixi --version` prints nothing, install pixi first (one line, no admin rights),
then open a new terminal so it is on your PATH:

```
macOS / Linux / Git Bash:  curl -fsSL https://pixi.sh/install.sh | PIXI_VERSION=v0.82.1 PIXI_NO_TELEMETRY=1 bash
Windows PowerShell:        $env:PIXI_VERSION='v0.82.1'; $env:PIXI_NO_TELEMETRY='1'; irm -useb https://pixi.sh/install.ps1 | iex
```

Then set up the studio:

```
pixi run studio install
```

This installs Node, Python, ffmpeg, the browser that draws the frames, and the speech aligner, all inside this folder.
Run it again any time: finished steps are skipped. `pixi run studio doctor` checks the setup in a few seconds.

For your own voice-overs, add a Google AI Studio key (free tier available at https://aistudio.google.com/apikey) to a
file named `.env` in this folder:

```
GOOGLE_API_KEY=your-key-here
```

The sample reel in step 2 already has its voice, so it needs no key.

## 2. Make the sample reel (about 1 minute)

```
pixi run node styles/stick-man/tools/pack/new.mjs --sample
pixi run node styles/stick-man/tools/pack/export.mjs films/stick-sample
```

Open `films/stick-sample/out/stick-sample.mp4`: 15 seconds, two characters in a living room, voice, captions and
sound. If it plays, everything works. (Problems: `pixi run studio doctor`, then the table at the end of this page.)

## 3. Make your first reel

Open Claude Code in this folder and type your idea:

```
/make-reel-stick-man why do cats knock things off tables
```

Claude writes the script, records the voice with your key, builds the scene, checks it, and exports
`films/<name>/out/<name>.mp4`. It shows you the script and a draft on the way, and asks only when it needs a decision
from you. The skill's own page, `.claude/skills/make-reel-stick-man/SKILL.md`, has the steps and the options.

## When something goes wrong

| You see | Do |
|---|---|
| `pixi: command not found` | install pixi (step 1), then open a new terminal |
| `✗ folder path: this folder's path is … characters` | unzip again into a short path such as `~/kaiships-studio`, then `pixi run studio install` there |
| `ffmpeg is not installed in this folder yet` | `pixi run studio install` |
| `no GOOGLE_API_KEY` | add the key to `.env` (step 1) |
| `the page failed: ...` | a mistake in `reel.js`; the message names it. Ask Claude to fix it |
| `✗ joints` / `✗ feet` / `✗ captions` | the check names the frame: `pixi run node styles/stick-man/tools/pack/render.mjs --film films/<name> --frames <frame>` shows it |
| The render is slow | normal on a computer without a graphics chip: about 1 minute per 15 s at 720p on a recent Mac |
