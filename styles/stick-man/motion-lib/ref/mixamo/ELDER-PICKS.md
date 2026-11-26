# Elder batch (26/11): 6 acts, Kai-approved, nothing else downloaded

Mixamo has no elderly captures beyond "Old Man Idle" and "Old Man Walk" (already here), so each pick is a plain capture chosen because
it differs from the adult clip the library already holds for the same act. Measured by `tools/gates/motionlib.mjs --only <clip>`
(the frozen body limits in `tools/gates/bodylife.mjs`) and `tools/gates/fits.mjs --person '{"body":"elder",...}' --clips ...`
(frozen `kit/compat-limits.json`). One try each; a fail is blocked, no limit changed.

| Act | Mixamo name (file) | Elder clip | Why it fits | Result |
|---|---|---|---|---|
| sit down | "Sitting" (sit_down_elder.js, 134 f) | `Trans_SitDown_Once` | a different capture of sitting down (Mixamo "Sitting") from the adult's "Stand To Sit" | PASS: joint 3 deg/f, slide 0 mm/f, body gate against the adult's clip clean |
| seated idle with life | "Sitting" looking side to side (sitting_side_look.js, 121 f) | `Idle_Sit_Loop` | glances left and right while seated; the adult's is a still breathing idle | PASS: joint 5.3 deg/f, slide 0, still check clean |
| hand over | "Reaching Out" (reaching_out.js, 121 f) | `Act_Give_Once` (new clip, no adult twin) | one arm reaches out and offers; no cash or counter (the adult's `Act_HandOver_Once` is a counter clip) | PASS on joint 4.1 deg/f, grip 0; NOT compared with an adult clip (none of this name), so the body gate had nothing to judge |
| standing clap | "Standing Clap" (standing_clap.js, 134 f) | `Gest_Clap_Loop` | a different clap from "Clapping" | BLOCKED: body gate, elder's hand arc 2.88 of the adult's (limit <= 0.85). Clip not registered; capture kept here |
| seated clap | "Sitting Clap" (sitting_clap_b.js, 126 f) | `Gest_SitClap_Loop` | a longer, other capture than the 101-frame one in sitting_clap.js | BLOCKED: body gate, elder's hand arc 2.03 of the adult's (limit <= 0.85). Clip not registered; capture kept here |
| look up | "Looking" (looking_shade.js, 144 f) | `Gest_LookUpShade_Once` (new name) | meant: head tips up, a hand shades the eyes | BLOCKED by review, unregistered: the independent review watched it on the Pro: from about f100 to f215 the elder leans 63 deg, looks at the floor, hand to chin, and never shades the eyes. It does the opposite of its name. No second try; capture kept here |

Fits (`kit/compat.json`, 3 registered clips x 7 elder outfits, 21 rows): 26 pass; blocked: `cardigan+shirt:office+skirt` x
`Trans_SitDown_Once` (16.8 mm of cloth in an arm) and `Idle_Sit_Loop` (22 mm of cloth in a hand), the skirt in a seated hand.

Not seen: the clips in motion, in a set and camera (a gate pass is not a review). Picks were made from Mixamo's names, descriptions and previews, not from viewing the elder body play them.

Open issue: nothing checks that a clip does the act its name says (the look-up passed every gate while looking at the floor).

Seats: the elder `Trans_SitDown_Once` ends with the hips on a 0.528 m seat; the elder `Idle_Sit_Loop` needs a 0.386 m seat (hips 0.43 m). The two must NOT be chained on one seat (the hips would jump 14 cm): use them in separate shots. `kit/film.js` refuses it when a film names one `seat` for both (`seatTop` in `motion-lib/index.js`).
