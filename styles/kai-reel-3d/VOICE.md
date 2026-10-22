# Voice: Gemini TTS, one take for the whole dialogue

Kai approved this on 2026-10-15 ("woaaaaa, tuyệt nha … quá pick"). Docs: https://ai.google.dev/gemini-api/docs/speech-generation

## Cast (locked)
| Who | Gemini voice | Google's label |
|---|---|---|
| Kai | **Achird** | Friendly |
| Clawd (every mode) | **Puck** | Upbeat |

Model `gemini-3.8-flash-tts` (set in `vo/script.json`). Two speakers per call is the API limit, and the rule.

## Run
```bash
uv run -q --python 3.12 --with faster-whisper --with speechbrain --with torch --with torchaudio --with soundfile --with numpy \
  python vo/make_vo.py              # one Gemini call → vo/takes/take-NN.wav → vo/vo.wav, stems, src/vo.js, src/vo_env.js, vo/voice-qa.md
python vo/make_vo.py --take 2        # re-cut an earlier take, no API call (same uv prefix)
python vo/make_vo.py --wav x.wav     # cut any wav. Outputs are 48 kHz (what audio/score.py expects)
```
The request body is the one that made the approved take (`template/ref/gemini_v5.py`, 2026-10-15).
Key: `GOOGLE_API_KEY` in `OpenMontage/.env` (git-ignored). One call ≈ 15–20 s for ~40 s of dialogue, ~1,000 audio tokens.

## How to direct
- `text` = the words verbatim + vocal tags (`<gasp>`, `<sigh>`, `<laugh>`, `<short pause>`); CAPS = stress.
- `style` = short delivery per line. Empty style first, then add only where the line needs it.
- Don't write "keep the same voice" or long persona notes: Google says they increase voice drift.
- Takes vary: if one line is off, re-take the whole call (cheap) rather than patching one line from another take.
- **Clawd's style words come only from the reel58 palette:** calm · calm, curious · matter-of-fact · gentle, sorry · sweet · cheerful ·
  happy · proud · proud, innocent · whisper. Never flat / deadpan / dry / quiet: they pull Puck down to ~80 Hz and it sounds like another
  voice across reels (reel60 v1, Kai 2026-10-17). The deadpan lives in the words, not the style.
- **3 takes per reel, pick the closest to reel58:** ECAPA similarity to `published/reel58-api-key/vo/vo_<who>.wav` + median pitch
  (reel58: Kai ≈ 140 Hz, Clawd ≈ 123 Hz). Then `--take N` re-cuts the winner. Also whisper the whole take once: a line missing there
  = Gemini skipped it (reel61 take 1 dropped the heart line).

## voice-qa.md (read it every take)
1. **Words heard per line** (whisper small.en vs script, ≥ 80 %). ❌ = the model skipped or garbled a line → re-take.
   ⚠️ "whisper missed it, voice present" = short words whisper drops ("Done."); the line is placed from the loudness → check by ear.
2. **Extra speech** = words in no line. Seen on the first approved take: the style "whispered, tattling" was **read aloud**
   at 21.3 s (now rephrased to "quiet, sneaky" in the example). Any row here → re-take, or rephrase that style.
3. **One voice per character** (ECAPA, advisory only): acted lines score low by nature; Kai's ear decides.
4. `src/vo.js` words are the script's words with whisper's times (`heard` = what whisper wrote, `est` = time estimated).
Known whisper spellings are aliased (Claude/Klot→Clawd, codecs→Codex, OK→okay, 47→forty-seven); add new ones to `ALIAS` in make_vo.py.
Whisper writes spoken numbers as digits ("2,000", "300", "11"): add them to `NUMW` in make_vo.py (reel60/61) or the line shows a false ❌. A line missing from the full-take transcript (whisper on the whole vo.wav) = Gemini skipped it → re-take (reel61 take 1 dropped the heart line).
Words whisper splits in two ("to" "-do" = todo, "read" "me" = README) are glued back. A stamp that is still wrong (check energy/pitch
around the word) goes into `vo/word-fix.json` (`{line: {s?, e?, words: {word: [s, e]}}}`), then re-cut with `--take N` (reel58).

## Limits and cost (checked 2026-10-15)
- Free tier: TTS models are free of charge; per-day limits are not published — see aistudio.google.com/rate-limit.
  Reset at midnight Pacific (14:00 Vietnam in summer time, 15:00 in winter). One reel take = 1 request.
- On 429: switch `model` to `gemini-3.8-flash-lite-tts` or `gemini-3.1-flash-tts-preview` (own quotas), or wait for the reset.
- Paid (Tier 1): ≈ $0.01 per take (≈ 1,000 audio tokens at $9 per 1M through 2026, $18 from 2027).
- Free-tier content may be used by Google to improve its products — fine for scripts, never send private data.

## Fallbacks (only if Gemini is down)
ElevenLabs `eleven_v3` text-to-dialogue (Will / River, acted with tags; costs credits) → edge-tts BrianMultilingual +20% (free,
flat; rewrite the script so the words carry the emotion). Local IndexTTS-2.5 was tried and rejected (slow, 10–15 GB RAM, takes vary).
