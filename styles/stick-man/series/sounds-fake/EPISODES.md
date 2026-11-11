# Sounds Fake · season 1, episodes 1-3

Source of truth: `story/chapters/chapter-0N.md` (prose = narration) and `story/research/`. Times below assume Achird at 3.1 words/s plus ~0.2 s between lines; the real times come from `vo/words.json` after align. Kip, Bram and Mabel are the troupe actors (Kip uses kit spec `KAI`).

| Ep | Title | Logline | Status |
|---|---|---|---|
| 1 | The Doctor Who Drank the Bug | To prove ulcers come from a bug, not stress, a scoffed-at doctor swallows a beaker of bacteria, gets sick on purpose, and 21 years later collects the Nobel Prize. | full script v2, 200 words, research verified, independent review applied |
| 2 | The Americans Are Very Strong | In 1944 two French cyclists watch four GIs pick up a tank, because a secret unit of artists is fighting with 93-pound rubber tanks and loudspeakers. | outline; research open (anecdote needs a 2nd source) |
| 3 | The Hotel That Went Up | To climb out of the mud, Chicago jacks up whole buildings, and lifts a hotel six feet while the guests stay inside. | outline; research disputed (crew and jackscrew counts) |

## Episode 1 · The Doctor Who Drank the Bug

**Episode question:** will drinking the bug prove the experts wrong? **Motif:** "bug" ×6 + the beaker (l01, l07, l14) and the spiral drawing. **Doubter:** Bram as the experts. **Quoted line:** Marshall, verbatim (l08). **Last word:** "Prize" on the medal.

### Narration (script.json-compatible, `story/adaptations/reel/ep01.script.json`)

Word count: **200** (61-69 s of speech at 2.9-3.3 words/s; ~67 s with pauses at 3.1).

```json
{ "model": "gemini-3.8-flash-tts", "cast": { "nar": "Achird" }, "lines": [
 { "id": "l01", "who": "nar", "style": "fast, intrigued", "text": "A doctor swallowed a beaker of bacteria. On purpose." },
 { "id": "l02", "who": "nar", "style": "fast", "text": "1982, Perth, Australia. Everyone knows ulcers come from stress and spicy food." },
 { "id": "l03", "who": "nar", "style": "fast, matter-of-fact", "text": "But Barry Marshall and pathologist Robin Warren keep seeing the same tiny spiral bug in sick stomachs, again and again." },
 { "id": "l04", "who": "nar", "style": "fast, amused", "text": "The experts scoff. Reviewers rank their paper in the bottom ten percent they received that year." },
 { "id": "l05", "who": "nar", "style": "fast, mocking", "text": "The bug? Just a contaminant, they say. Harmless." },
 { "id": "l06", "who": "nar", "style": "fast, determined", "text": "He spends six months trying to infect piglets. It fails. So, to win the argument, he picks one last test animal: himself." },
 { "id": "l07", "who": "nar", "style": "fast", "text": "1984. Two dishes of the bug go into a beaker of beef broth, and down it goes." },
 { "id": "l08", "who": "nar", "style": "fast, sly", "text": "He doesn't clear it with the hospital, or his wife. In his words: \"easier to get forgiveness than permission.\"" },
 { "id": "l09", "who": "nar", "style": "fast, grossed out", "text": "Days later, his wife notices his breath smells putrid. Then he's throwing up every morning." },
 { "id": "l10", "who": "nar", "style": "fast, excited", "text": "Wait. A camera down his throat finds his stomach inflamed. The biopsy grows the spiral bug." },
 { "id": "l11", "who": "nar", "style": "fast, explaining", "text": "You see, the bug is behind most ulcers, not stress. It keeps the stomach lining inflamed." },
 { "id": "l12", "who": "nar", "style": "fast, matter-of-fact", "text": "Kill the bug, and the ulcer heals for good." },
 { "id": "l13", "who": "nar", "style": "fast, matter-of-fact", "text": "Two weeks of pills. No surgery." },
 { "id": "l14", "who": "nar", "style": "fast, triumphant", "text": "Twenty-one years after that putrid drink, the doctor they laughed at collects the Nobel Prize." }
] }
```

### Timed beat outline (what the viewer sees; storyboard input)

| Line | ~Time | Beat | Place (set) · light | See (sound off) | Acting | Prop / FX / printed label |
|---|---|---|---|---|---|---|
| l01 | 0.0-3.1 | HOOK | lab bench · cool white | frame 0: Kip mid-gulp, beaker tipped; rush in on the beaker; on "On purpose." he slams it down | Kip `drink` (new) → `recoil` | beaker "BEEF BROTH" |
| l02 | 3.1-7.2 | SETUP | diner · warm noon (dissolve) | aerial into Halden, then Bram eats a chilli and clutches his belly | Bram `eat` → `clutch` | menu "HOT CHILLI", poster "STRESS?"; label "PERTH · 1982" on a bus-stop poster |
| l03 | 7.2-13.8 | SETUP | lab · microscope corner | top-down on a slide, Warren (extra) at the microscope, Kip points at a spiral drawn on the board | Kip `point_lean` | chalk draws the spiral; name plaques "DR BARRY MARSHALL", "DR ROBIN WARREN" |
| l04 | 13.8-19.2 | DOUBT | lecture hall · tungsten (dissolve) | wide: rows of doctors scoffing; low angle on Bram; insert: a stamp hits the paper | Bram `laugh`, extras `arms_crossed` | paper stamped "BOTTOM 10 %" (`sign` board on the desk) |
| l05 | 19.2-22.0 | DOUBT | lecture hall cu | Bram smug, chalk crosses the spiral out with "CONTAMINANT" | Bram `hands_on_hips`, smug | chalk |
| l06 | 22.0-29.3 | LADDER | lab corner pen | wall calendar flips six months; three piglets trot happily, untouched; Kip shrugs; whip-pan to Kip pointing at himself on "himself" | Kip `crouch` → `shrug` → `present` (to self) | piglets (new prop), calendar |
| l07 | 29.3-34.9 | ACT | lab bench top-down → ms | two dishes tip into the beaker; Kip downs it, head back, on "goes" | Kip `drink` | petri dishes, beaker; board "FREMANTLE HOSPITAL · 1984" |
| l08 | 34.9-41.3 | ACT + QUOTE | lab corridor | Kip tiptoes past a door "ETHICS COMMITTEE" and past a photo of Mabel; finger to lips on "forgiveness" | Kip `tiptoe` → `shush`, sly | door plaque `sign` |
| l09 | 41.3-46.3 | COST | kitchen · blue morning (dissolve) | Mabel leans in, recoils from a green breath puff; wall clock spins; Kip at the sink, back to camera | Mabel `lean_in` → `recoil` disgust; Kip `clutch` | `steam` (green breath), `splash` in sink, clock |
| l10 | 46.3-51.7 | TURN | lab clinic stool → scope view | music stops on "Wait."; camera flies down the scope tube: the lining is red and swollen (gastritis), NO crater; cut-in: a petri dish where spirals grow on "grows" | Kip on stool, nervous | stomach model `inflame` only; biopsy dish; fly-through = the transition |
| l11 | 51.7-57.0 | YOU SEE | generic stomach model on the bench (printed tag "MODEL"), Kip beside it | spirals settle in, the lining stays red; on "ulcers" a crater opens on the MODEL only | Kip `present` | stomach `bugs`, `ulcer`; `crack` glow |
| l12 | 57.0-60.1 | YOU SEE | same | pills drop in, spirals puff away, lining turns pink on "heals" | Kip `arms_wide` | stomach `cure`; `smoke` |
| l13 | 60.1-62.3 | YOU SEE | same, wide | a "SURGERY" sign falls flat; a pill box "2 WEEKS" stays | Kip `celebrate` | `fall`; pill box |
| l14 | 62.3-67.3 | PAYOFF | plaza stage · night spotlight (dissolve) | aerial crane down to the stage, banner "STOCKHOLM · 2005"; low angle: Kip and Warren step forward; last word = the gold medal glints in Kip's hand, Bram jaw-dropped in the front row | Kip `proud`, Bram `lean_away` shock | medal (new); spotlight |

Places / framings: 14 in ~67 s (2.1 per 10 s, ref 2.1). Printed labels: 11 (incl. 2 name plaques). FX in world: chalk, sign, steam, splash, crack glow, fall, smoke. Dark shot: l14 night.

### Post pack (caption draft)

> A doctor drank a beaker of bacteria to prove a point. It worked. Sources: comment SOURCE.
> Don't try this at home: he was a trained doctor, it made him ill, and he treated himself with antibiotics.
> AI voice.

### Sources (all opened 11/11/2026; line-by-line table in `story/research/ep01-marshall-fact-check.md`)

- Nobel Foundation, Barry J. Marshall, Biographical: https://www.nobelprize.org/prizes/medicine/2005/marshall/biographical/ (l01, l02, l04, l05, l06, l08 quote, l10, l13)
- Nobel Assembly press release, 3 Oct 2005: https://www.nobelprize.org/prizes/medicine/2005/press-release/ (l02, l03, l11, l14)
- Award ceremony speech, Stockholm Concert Hall, 10 Dec 2005: https://www.nobelprize.org/prizes/medicine/2005/ceremony-speech/ (l10, l11, l12, l14)
- Nobel Foundation, J. Robin Warren (died 23 Jul 2024): https://www.nobelprize.org/laureate/790 (cast note)
- Lasker Foundation, "Gut feeling": https://laskerfoundation.org/gut-feeling/ (l01, l04, l07, l08, l09)
- Penn State News, "Gut instincts": https://www.psu.edu/news/research/story/gut-instincts-profile-nobel-laureate-barry-marshall (l06, l07)
- Wikipedia, Barry Marshall (citing Klein, Discover, Nobel lecture): https://en.wikipedia.org/wiki/Barry_Marshall (l02, l04, l06, l07, l09, l10)

## Episode 2 · The Americans Are Very Strong (outline)

Roles: Kip = Cpl. Arthur Shilstone (guard); Bram = a tank officer stuck with rubber tanks; Mabel = a French cyclist. Motif: "strong" ×3 + the rubber tank. Last word: "strong."

| ~Time | Beat | Story | Place · light | Key image |
|---|---|---|---|---|
| 0-4 | HOOK | Two French cyclists watch four soldiers pick up a tank and turn it around. | field · dawn mist | four GIs lift a tank, frame 0 mid-lift |
| 4-14 | SETUP | 1944, France. A secret US unit of about 1,100 men, many of them artists. | artists' tent (workshop) · lantern | sketchbooks, paint, a label "23RD HQ SPECIAL TROOPS" |
| 14-24 | DOUBT | Officers who once commanded 32-ton tanks feel "frustrated and helpless" with rubber ones (official history, verbatim). | field | Bram kicks a tyre: it bounces |
| 24-42 | LADDER | Overnight: inflate tanks, fake tracks, speakers playing tank noise heard 15 miles away. | field · night | tanks swell up (`grow`); `speakers` pump; fake tracks drawn in mud |
| 42-48 | TURN | "Wait." Two cyclists ride right past the guard. | country road · dawn | Mabel on a bike, `shade_eyes` |
| 48-60 | YOU SEE | A rubber M-4 weighs 93 pounds; from far off it is a tank; 20+ deceptions; secret until 1996. | top-down on the tank park; insert on a printed tag "93 LB" | spy-plane view of real-looking tanks |
| 60-68 | PAYOFF | The guard shrugs: "The Americans are very strong." | field · sunrise | four men holding the tank over their heads; Bram's facepalm |

To build: inflatable tank prop (keys `deflated`, `grow`, `bounce`), bike rider pose (or `dress` bike + push), park re-dress as hedgerow field. Sources: ghostarmy.com/bio/f/Equipment, worksthatwork.com/6/ghost-army, en.wikipedia.org/wiki/Ghost_Army. Blocker: a second source for the cyclist anecdote.

## Episode 3 · The Hotel That Went Up (outline)

Roles: Kip = George Pullman; Bram = the hotel guest who finds the steps steeper; Mabel = a passer-by on Lake Street. Motif: "up" ×4 + the jackscrew. Last word: "head" (the windows above the guest's head).

| ~Time | Beat | Story | Place · light | Key image |
|---|---|---|---|---|
| 0-4 | HOOK | A city lifts a hotel six feet into the air with the guests still inside. | Halden street (stone bank as hotel) · grey morning | the hotel already rising, frame 0 |
| 4-16 | SETUP | 1850s Chicago sits in swamp mud; cholera; in 1856 the city plans sewers, so the streets must go up. | muddy street | Mabel sinks to the knee; label "CHICAGO · 1856" |
| 16-24 | DOUBT | Raise the street and every door ends up underground. | street | Bram's front door half buried, `facepalm` |
| 24-40 | LADDER | 1860: half a block of Lake Street, 600 men, 6,000 jackscrews, 4 ft 8 in in five days, shops open. | under-building cutaway · lanterns | rows of men turning screws in time |
| 40-48 | TURN | "Wait." 1861: they try it on a six-storey hotel full of guests (Ely, Smith and Pullman). | hotel lobby (bank-lobby re-signed "TREMONT HOUSE") | guests carry on, unaware |
| 48-60 | YOU SEE | Each man turns his screws a little on one signal, so the building rises evenly. | jack trench insert, macro | a quarter turn on a whistle, ×hundreds |
| 60-68 | PAYOFF | The guest who thought the steps got steeper checks out; the windows are now above his head. | street · sun breaks | Bram looking up, jaw dropped |

To build: jackscrew row cutaway (keyed `turn`, `rise`), mud ground dressing, hotel sign. Sources: en.wikipedia.org/wiki/Raising_of_Chicago, en.wikipedia.org/wiki/Tremont_House_(Chicago). Blockers: crew and jackscrew counts disputed (open the 1861 Tribune and Macrae 1870); the "one signal" mechanism and "six-storey" must be sourced before they are said.
