# Voice

The script in `vo/script.json` becomes the spoken voice, per-word timings in `src/vo.js` and `vo/word_times.txt`,
checked against the voice rules and transcribed back by Whisper.

## Sub-features

- `vo.tts`: edge-tts per line, joined into `vo/vo.wav`, `vo/vo.json` (`duration`, `lines`, `words`).
- `vo.rules`: `check_vo.py` (rate, ≤ 28 words a line, CTA in one breath, 5.0–6.4 syl/s).
- `vo.asr`: every line transcribes back to its words (or its `asr` field).

## How to get to it (user POV)

- Write or edit `films/<name>/vo/script.json`, then `node styles/kai-hand-draw/tools/make.mjs films/<name> vo`.

## Driving it with draft.mjs / make.mjs

Preconditions: network (edge-tts), `.venv` with faster-whisper.

- Run: `make.mjs films/verify-smoke vo` → `✓ voice rules pass`, one `OK` per line, `mismatches: 0`.
- Timings reach the page: `draft.mjs films/verify-smoke` → "picture length = voiceover ± 1/30 s" ✓ and no
  `vo(): … not in the voiceover` warning.
- A word the chapters cue but the script no longer says: change it in the script, run `vo`, run the draft →
  ✗ "no page errors" naming the word.

## Gotchas

- Offline, edge-tts fails: report the voice step as unverified.
- "Clawd" is heard as "Claude": that is what the `asr` field is for, not a failure.
- After any script change run `audio` too, or the mix is stale and "audio length = picture" fails.
