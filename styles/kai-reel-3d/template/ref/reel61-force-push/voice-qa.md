# voice QA · vo/takes/take-03.wav

whisper words heard vs script (≥ 80 % per line). 24/24 lines without ❌. Clean = no ❌ and no extra speech (or Kai accepted the take by ear).

Extra speech (heard but in no line: a style read aloud, an ad-lib). Anything here = re-take, or cut it out:
- 1.26s: "push"

| line | who | time | heard | ok | text |
|---|---|---|---|---|---|
| l01 | kai | 0.00–1.80 | 5/6 | ✅ | Clawd, I force pushed to main. |
| l02 | clawd | 2.33–3.20 | 2/2 | ✅ | How hard? |
| l03 | kai | 3.92–5.40 | 4/4 | ✅ | Very. Dash dash force. |
| l04 | clawd | 6.10–7.08 | 5/5 | ✅ | Whose work was on main? |
| l05 | kai | 7.86–9.28 | 4/4 | ✅ | Everyone's. The whole week. |
| l06 | clawd | 10.06–12.08 | 5/5 | ✅ | Eleven people. Three hundred commits. |
| l07 | kai | 13.00–13.76 | 4/4 | ✅ | Can we undo it? |
| l08 | clawd | 14.28–15.76 | 4/4 | ✅ | Yes. If nobody pulled. |
| l09 | kai | 16.19–17.94 | 3/3 | ✅ | Okay. Nobody pulled. |
| l10 | clawd | 18.48–19.38 | 4/4 | ✅ | Standup was at nine. |
| l11 | kai | 19.96–20.56 | 3/3 | ✅ | They all pulled? |
| l12 | clawd | 21.04–22.64 | 4/4 | ✅ | All eleven. Your version. |
| l13 | kai | 23.26–24.70 | 6/6 | ✅ | Why did I even force push? |
| l14 | clawd | 24.70–28.24 | 7/7 | ✅ | To fix one typo. In the README. |
| l15 | kai | 28.62–29.66 | 5/5 | ✅ | Tell the team I'm sick. |
| l16 | clawd | 30.28–32.30 | 4/4 | ✅ | They're typing. All eleven. |
| l17 | kai | 33.18–33.96 | 2/2 | ✅ | It's over. |
| l18 | clawd | 34.91–36.80 | 5/5 | ✅ | I pushed a branch first. |
| l19 | kai | 37.46–37.84 | 2/2 | ✅ | You what? |
| l20 | clawd | 38.54–41.58 | 6/6 | ✅ | You said, trust me. I didn't. |
| l21 | kai | 41.84–43.48 | 5/5 | ✅ | Clawd. You saved my job. |
| l22 | clawd | 44.10–44.90 | 3/3 | ✅ | Restoring main now. |
| l23 | kai | 45.30–46.18 | 5/5 | ✅ | Did you fix the typo? |
| l24 | clawd | 46.86–47.52 | 3/3 | ✅ | Not touching it. |

One voice per character (advisory, never a gate): ECAPA cosine of each line (≥ 1 s) vs that character's other lines. Whispered / shouted / big-acting lines score low by nature; trust Kai's ear.

| who | line | cos | ok | style |
|---|---|---|---|---|
| clawd | l06 | 0.46 | ✅ | matter-of-fact |
| clawd | l08 | 0.29 | ⚠️ drift | calm |
| clawd | l12 | 0.31 | ⚠️ drift | calm |
| clawd | l14 | 0.52 | ✅ | cheerful |
| clawd | l16 | 0.51 | ✅ | calm |
| clawd | l18 | 0.38 | ⚠️ drift | sweet |
| clawd | l20 | 0.46 | ✅ | gentle |
| kai | l01 | 0.48 | ✅ | guilty, fast |
| kai | l03 | 0.34 | ⚠️ drift | sheepish |
| kai | l05 | 0.36 | ⚠️ drift | small voice |
| kai | l09 | 0.40 | ⚠️ drift | relieved |
| kai | l13 | 0.40 | ⚠️ drift | exasperated |
| kai | l15 | 0.15 | ⚠️ drift | whispered |
| kai | l21 | 0.21 | ⚠️ drift | grateful, emotional |
