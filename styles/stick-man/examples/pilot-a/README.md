# Pilot A (an older worked example, 12/11)

20.5 s, one narrator, set `canyon-edge`, style `kaiships`. Kai approved every gate of the process as it stood on 12/11.
Read it for how stage 3 keys look: `reel.js` (cameras from two camera passes, overlays, blocking with `hold`, then
`polish`, sound beats), `storyboard.json` (see / still / act / props per line), `script.json` + `words.json` (voice
text and alignment), `music.json` (the music arc), `LEDGER.md` (what each stage made and how it was proven).

It is not a film that passes today's gates. It has no `DECISIONS.json`, no `colour-script.json`, no `faceStyle` (it
uses the kit faces), no sound plan, no cover, caption, subtitles or `CREDITS`. Its camera looks up at the lead in 53 % of
frames, so the `low-camera` gate (at most 25 %) fails it. Start a new film with `node styles/stick-man/tools/new_film.mjs
<slug>` and follow `.claude/skills/make-reel-stick-man/SKILL.md`.

To replay it: copy into `films/pilot-a/` (script.json and words.json under `vo/`, music.json under `audio/`), record
the voice with `tools/voice.py`, then follow the skill.
