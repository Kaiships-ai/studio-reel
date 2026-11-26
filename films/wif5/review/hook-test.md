by: agent:ep1-prepro-review
date: 2026-11-26
of: review/hook-thumbs.jpg, review/previs/hook-H1.mp4, hook-H2.mp4, hook-H3.mp4 (first 6 s each, grey blockout, phone size 480x854, with the film's first 6 s of sound)

# Hook test (◇1)

What a viewer gets: all three are grey boxes with labels. The title text (L01) and the real faces are not in these clips, so I judge frame one at phone size, what changes, and what makes me ask "then what?".

| Hook | Frame 1 at phone size | Over 6 s | Muted |
|---|---|---|---|
| H1 question | two tiny figures far back, labels unreadable ("TO SQUARE", "dad" at 6 px) | one cut at 3.7 s into the same wide: nothing happens for 6 s | I swipe |
| H2 shock | a dad, torso large, label "dad" and TOWN SQUARE readable | 3 cuts, 1.5 s on him, then the same tiny wide as H1 for 4.5 s; the vanish is not in the 6 s, the daughter is still there | a close face, then nothing |
| H3 mystery | the last man's face fills the width, "lastman" and SMALL ROOM readable | 3 s on the face, a 1.3 s plain grey torso shot (SHj02), then the square | a face and a question: who, where |

## Pick

H3 (mystery). A big face reads at phone size from frame one, and a label that says "lastman" next to a square of a happy crowd makes the viewer ask who and why before any text. H2 starts as well, but the shock it sells (hand closing on air) is not inside its 6 s: the daughter is still there at 6 s, so it is a plain wide. H1 is the weakest: it is the current opening, tiny figures, a static wide for 6 s, only the title carries it.

Conditions on H3: (1) SHj02 as built is a blank grey torso for 1.3 s, a dead frame; the final must be the hands on the photo frame, or drop it. (2) the title over the face must stay inside the text-safe box (y 14-65 %), and the face needs headroom: SHj03 crops the forehead. (3) the flash-forward must not show the photo itself; keep it for L24 at 2640 f.

Taste check (five roots): the grey boxes cannot show colour or face feel, so the pick is on readability and the curiosity gap only. The reviewer cannot confirm calm faces or bright subjects at this tier.

## Decisions (DECISIONS.json)

| Id | Verdict | Reason |
|---|---|---|
| D01 | approved | on-screen wording is V4's locked text; checks match the text in timeline.py (Remember him. in b, ? in j, Send this in j) |
| D02 | approved | 3016 f = 100.53 s, take-01 is the count; maxSec 100.6 holds |
| D03 | approved | part frames match PARTS in timeline.py (a 0, b 504 ... j 2336, k 2876; total 3016) |
| D04 | approved | structure is in the beats; the 23:59 tag is in SHb (cradle tag) and the photo in SHj03 |
| D05 | rejected | the lab scene has SHh04 "one of them bends, defeated" in a lab coat: a stoop in a coat, which D05 itself forbids. Fix the action (stand, shoulders drop) or the garment, then approve |
| D06 | approved | toon hair on every person is a kit rule enforced by fits.mjs noHair; the stills show hair on a, b. Intent only: grey previs cannot show it |
| D07 | approved with a risk | the stills read; but the recipe puts a and e median luma under 30. colourgate at ◇5 (film luma >= 100, dark s <= 15 %) may fail; that is the maker's to fix in light, not by grade |
| D08 | approved | hand in part a is in SHa04 and SHa08-a09; the 23:59 boy = last man = photo is placed in b and j |

The "waive-K1-S1" entry is Kai's, not mine; I leave it untouched.
