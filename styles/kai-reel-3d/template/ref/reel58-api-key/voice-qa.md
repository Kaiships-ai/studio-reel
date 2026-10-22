# voice QA · vo/takes/take-01.wav

whisper words heard vs script (≥ 80 % per line). 20/20 lines without ❌. Clean = no ❌ and no extra speech (or Kai accepted the take by ear).

Extra speech (heard but in no line: a style read aloud, an ad-lib). Anything here = re-take, or cut it out:
- none

| line | who | time | heard | ok | text |
|---|---|---|---|---|---|
| l01 | kai | 0.00–2.84 | 8/8 | ✅ | Clawd. I pushed my API key to GitHub. |
| l02 | clawd | 4.06–4.40 | 2/2 | ✅ | Which repo? |
| l03 | kai | 5.28–5.88 | 3/3 | ✅ | My todo app. |
| l04 | clawd | 6.44–7.18 | 3/3 | ✅ | The public one? |
| l05 | kai | 7.74–9.82 | 8/8 | ✅ | It has two stars. Nobody looks at it. |
| l06 | clawd | 10.32–12.66 | 8/8 | ✅ | Bots do. They found it in forty-seven seconds. |
| l07 | kai | 13.62–16.22 | 5/5 | ✅ | Okay. I deleted the commit. |
| l08 | clawd | 16.94–17.90 | 5/5 | ✅ | It's still in the history. |
| l09 | kai | 18.52–19.20 | 4/4 | ✅ | How bad is it? |
| l10 | clawd | 20.02–22.86 | 9/9 | ✅ | Someone in another country is using it. Right now. |
| l11 | kai | 23.44–24.80 | 6/6 | ✅ | Why is my bill going UP? |
| l12 | clawd | 25.48–27.52 | 8/8 | ✅ | Good news. Your app is very popular now. |
| l13 | kai | 28.18–28.78 | 3/3 | ✅ | Clawd, do something! |
| l14 | clawd | 29.36–31.86 | 8/8 | ✅ | I already turned that key off. Last night. |
| l15 | kai | 32.36–32.86 | 2/2 | ✅ | You what? |
| l16 | clawd | 33.52–35.90 | 8/8 | ✅ | You said, "commit everything." So I checked everything. |
| l17 | kai | 36.37–40.02 | 6/6 | ✅ | Clawd. You saved my credit card. |
| l18 | clawd | 40.66–41.90 | 7/7 | ✅ | I even made you a new key. |
| l19 | kai | 42.54–43.90 | 6/6 | ✅ | Nice. Where did you put it? |
| l20 | clawd | 44.24–45.88 | 8/8 | ✅ | In the README. So you won't lose it. |

One voice per character (advisory, never a gate): ECAPA cosine of each line (≥ 1 s) vs that character's other lines. Whispered / shouted / big-acting lines score low by nature; trust Kai's ear.

| who | line | cos | ok | style |
|---|---|---|---|---|
| clawd | l06 | 0.43 | ⚠️ drift | matter-of-fact |
| clawd | l10 | 0.56 | ✅ | whisper |
| clawd | l12 | 0.45 | ✅ | cheerful |
| clawd | l14 | 0.44 | ⚠️ drift | calm, proud |
| clawd | l16 | 0.61 | ✅ | sweet |
| clawd | l18 | 0.57 | ✅ | happy |
| clawd | l20 | 0.45 | ✅ | proud, innocent |
| kai | l01 | 0.48 | ✅ | quiet, panicked |
| kai | l05 | 0.44 | ⚠️ drift | defensive |
| kai | l07 | 0.42 | ⚠️ drift | relieved, quick |
| kai | l11 | 0.24 | ⚠️ drift | panicked, rising |
| kai | l17 | 0.53 | ✅ | amazed, grateful |
| kai | l19 | 0.45 | ✅ | relieved, casual |

## Manual checks (2026-10-16, after the high-effort voice verifier)
- Stems clean (−180 dB bleed), true peak −2.1 dBFS, 0 clipped samples, no word mis-said, no extra speech.
- whisper stamped two words wrong; fixed from energy + pitch in `vo/word-fix.json` (re-cut, no API call): l07 "Okay." = 13.65–13.95
  (the `<short pause>` after it is 1.55 s = the relief beat), l17 "Clawd." = 36.40–36.95, "You" = 38.82 (37.7 s is a breath, not a word).
- Verdict: take-01 clean, used as is. Gemini calls used: 1.
