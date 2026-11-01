# Voice

The script in `vo/script.json` becomes the spoken voice, per-word timings in `src/vo.js` and `vo/word_times.txt`,
checked against the voice rules and transcribed back by Whisper.

## Sub-features

- `vo.tts`: edge-tts per line, joined into `vo/vo.wav`, `vo/vo.json` (`duration`, `lines`, `words`).
- `vo.rules`: `check_vo.py` (rate, ≤ 28 words a line, CTA in one breath). Warnings only: pace outside 5.0–6.4 syl/s,
  over 5 s of speech without a pause, a hook line ending after 3.5 s, no "Comment <KEYWORD>" in the last line.
- `vo.asr`: every line transcribes back to its words (or its `asr` field); a mismatch makes the step exit non-zero.

## How to get to it (user POV)

- Write or edit `films/<name>/vo/script.json`, then `node styles/kai-hand-draw/tools/make.mjs films/<name> vo`.

## Driving it with draft.mjs / make.mjs

Preconditions: network (edge-tts; the first Whisper run also downloads its model), setup done (`pixi run studio
doctor` all ✓: edge-tts and faster-whisper come from the pixi env).

- Run: `make.mjs films/verify-smoke vo` → `✓ voice rules pass`, one `OK` per line (a `DIFF` line names a mismatch), `mismatches: 0`.
  `--no-asr` skips the Whisper check; that is not a pass.
- Timings reach the page: `draft.mjs films/verify-smoke` → "picture length = voiceover ± 1/30 s" ✓ and no
  `vo(): … not in the voiceover` warning.
- A word the chapters cue but the script no longer says: change it in the script, run `vo`, run the draft →
  ✗ "no page errors" naming the word.

## Gotchas

- Offline, edge-tts fails: report the voice step as unverified.
- "Clawd" is heard as "Claude": that is what the `asr` field is for, not a failure.
- After any script change run `audio` too, or the mix is stale and "audio length = picture" fails.
