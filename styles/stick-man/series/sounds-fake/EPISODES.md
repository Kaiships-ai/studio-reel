# Sounds Fake · season 1, episodes 1-3

Source of truth: `story/chapters/chapter-0N.md` (prose = narration) and `story/research/`. Times below assume Achird at 3.1 words/s plus ~0.2 s between lines; the real times come from `vo/words.json` after align.

| Ep | Title | Logline | Status |
|---|---|---|---|
| 1 | The Doctor Who Drank the Bug | To prove ulcers come from a bug, not stress, a laughed-at doctor drinks a beaker of bacteria, gets sick on purpose, and 21 years later collects the Nobel Prize. | full script, 206 words, research verified |
| 2 | The Americans Are Very Strong | In 1944 two French cyclists watch four GIs pick up a tank, because a secret unit of artists is fighting with 93-pound rubber tanks and loudspeakers. | outline; research open (anecdote needs a 2nd source) |
| 3 | The Hotel That Went Up | To climb out of the mud, Chicago jacks up whole buildings, and lifts a hotel six feet while the guests stay inside. | outline; research disputed (crew and jackscrew counts) |

## Episode 1 · The Doctor Who Drank the Bug

**Episode question:** will drinking the bug prove the experts wrong? **Motif:** "bug" ×5 + the beaker (l01, l07, l13) and the spiral drawing. **Doubter:** Bram as the experts. **Quoted line:** Marshall, verbatim (l08). **Last word:** "Prize" on the medal.

### Narration (script.json-compatible, `story/adaptations/reel/ep01.script.json`)

Word count: **206** (est. 62-71 s at 2.9-3.3 words/s; ~69 s at 3.1).

```json
{ "model": "gemini-3.8-flash-tts", "cast": { "nar": "Achird" }, "lines": [
 { "id": "l01", "who": "nar", "style": "fast, intrigued", "text": "To win an argument, a doctor drank a beaker of live bacteria." },
 { "id": "l02", "who": "nar", "style": "fast", "text": "Western Australia, the early 1980s. Everyone knows ulcers come from stress, spicy food and too much acid." },
 { "id": "l03", "who": "nar", "style": "fast, matter-of-fact", "text": "But Barry Marshall and pathologist Robin Warren keep finding the same tiny spiral bug in ulcer patients." },
 { "id": "l04", "who": "nar", "style": "fast, amused", "text": "The experts laugh. Reviewers rank their paper in the bottom ten percent of the year." },
 { "id": "l05", "who": "nar", "style": "fast, mocking", "text": "The bug? Just a contaminant, they say." },
 { "id": "l06", "who": "nar", "style": "fast, determined", "text": "So he tries to infect piglets. Nothing. That leaves one test animal: himself." },
 { "id": "l07", "who": "nar", "style": "fast", "text": "July 1984. His lab tech scrapes two dishes of bacteria into beef broth, and he knocks it back like a shot." },
 { "id": "l08", "who": "nar", "style": "fast, sly", "text": "He doesn't clear it with the hospital, or his wife. In his words: \"easier to get forgiveness than permission.\"" },
 { "id": "l09", "who": "nar", "style": "fast, grossed out", "text": "Days later, his breath smells putrid. Then he's throwing up every morning." },
 { "id": "l10", "who": "nar", "style": "fast, excited", "text": "Wait. A camera down his throat finds his stomach swollen and red, crawling with the spiral bug." },
 { "id": "l11", "who": "nar", "style": "fast, explaining", "text": "You see, the real culprit was the bug. It inflames the stomach lining, and that's where most ulcers start." },
 { "id": "l12", "who": "nar", "style": "fast, matter-of-fact", "text": "Kill the bug, and the ulcer is cured. Two weeks of pills instead of surgery." },
 { "id": "l13", "who": "nar", "style": "fast, triumphant", "text": "Twenty-one years after that putrid drink, the two men they laughed at walk on stage in Stockholm and collect the Nobel Prize." }
] }
```

### Timed beat outline (what the viewer sees; storyboard input)

| Line | ~Time | Beat | Place (set) · light | See (sound off) | Acting | Prop / FX / printed label |
|---|---|---|---|---|---|---|
| l01 | 0.0-4.1 | HOOK | lab bench · cool white | frame 0: Kai mid-gulp, beaker tipped; rush in on the beaker on "bacteria" | Kai `drink` (new) → `recoil` | beaker "BEEF BROTH" |
| l02 | 4.1-9.8 | SETUP | diner · warm noon (dissolve) | aerial into Halden, then Bram eats a chilli and clutches his belly | Bram `eat` → `clutch` | menu "HOT CHILLI", poster "STRESS?", antacid jar; label "WESTERN AUSTRALIA · 1982" on a bus-stop poster |
| l03 | 9.8-15.4 | SETUP | lab · microscope corner | top-down on a slide, Warren (extra) at the microscope, Kai points at a spiral drawn on the board | Kai `point_lean` | chalk draws the spiral; board "FREMANTLE HOSPITAL" |
| l04 | 15.4-20.5 | DOUBT | lecture hall · tungsten (dissolve) | wide: rows of doctors roaring; low angle on Bram laughing; insert: a stamp hits the paper | Bram `laugh`, extras `laugh` | paper stamped "BOTTOM 10 %" (`sign` board on the desk) |
| l05 | 20.5-22.9 | DOUBT | lecture hall cu | Bram smug, chalk crosses the spiral out with "CONTAMINANT" | Bram `hands_on_hips`, smug | chalk |
| l06 | 22.9-27.3 | LADDER 1-2 | lab corner pen | three piglets trot happily; Kai shrugs; whip-pan to Kai pointing at himself | Kai `crouch` → `shrug` → `present` (to self) | piglets (new prop) |
| l07 | 27.3-34.3 | ACT | lab bench top-down → ms | hands scrape two dishes into the beaker; Kai knocks it back on "shot", head back | Kai `drink` | petri dishes, beaker; label "JULY 1984" on the wall calendar |
| l08 | 34.3-40.6 | ACT + QUOTE | lab corridor | Kai tiptoes past a door "ETHICS COMMITTEE" and past a photo of Mabel; finger to lips on "forgiveness" | Kai `tiptoe` → `shush`, sly | door plaque `sign` |
| l09 | 40.6-44.7 | COST | kitchen · blue morning (dissolve) | Mabel leans in, recoils from a green breath puff; wall clock spins; Kai at the sink, back to camera | Mabel `lean_in` → `recoil` disgust; Kai `clutch` | `steam` (green breath), `splash` in sink, clock |
| l10 | 44.7-50.4 | TURN | lab clinic stool → INTO the stomach | music stops on "Wait."; camera flies down the scope tube into the stomach model: red, spirals wriggling | Kai on stool, nervous | stomach model `inflame`, `bugs`; fly-through = the transition |
| l11 | 50.4-56.7 | YOU SEE | stomach model on the bench, Kai beside it | spirals dig in, the lining glows red, a crater opens on "ulcers start" | Kai `present` | stomach `ulcer`; `crack` glow |
| l12 | 56.7-61.8 | YOU SEE | same, then wide | pills drop in, spirals puff away, lining turns pink on "cured"; a "SURGERY" sign falls, a pill box "2 WEEKS" stays | Kai `celebrate` | stomach `cure`; `fall`, `smoke` |
| l13 | 61.8-69.1 | PAYOFF | plaza stage · night spotlight (dissolve) | aerial crane down to the stage, banner "STOCKHOLM · 2005"; low angle: Kai and Warren step forward; last word = the gold medal glints in Kai's hand, Bram jaw-dropped in the front row | Kai `proud`, Bram `lean_away` shock | medal (new); spotlight |

Places / framings: 14 in ~69 s (2.0 per 10 s, ref 2.1). Printed labels: 9. FX in world: chalk, sign, steam, splash, crack glow, fall, smoke. Dark shot: l13 night.

### Sources (all opened 11/11/2026; line-by-line table in `story/research/ep01-marshall-fact-check.md`)

- Nobel Foundation, Barry J. Marshall, Biographical: https://www.nobelprize.org/prizes/medicine/2005/marshall/biographical/ (l01, l05, l06, l08 quote, l10, l12)
- Nobel Assembly press release, 3 Oct 2005: https://www.nobelprize.org/prizes/medicine/2005/press-release/ (l02, l03, l11, l12, l13)
- Award ceremony speech, Stockholm Concert Hall, 10 Dec 2005: https://www.nobelprize.org/prizes/medicine/2005/ceremony-speech/ (l10, l11, l13)
- Lasker Foundation, "Gut feeling": https://laskerfoundation.org/gut-feeling/ (l01, l04, l07, l08, l09)
- Wikipedia, Barry Marshall (bottom 10 %, piglets, endoscopy days, citing Klein, Discover, Nobel lecture): https://en.wikipedia.org/wiki/Barry_Marshall (l02, l04, l06, l09, l10)

## Episode 2 · The Americans Are Very Strong (outline)

Roles: Kai = Cpl. Arthur Shilstone (guard); Bram = a tank officer stuck with rubber tanks; Mabel = a French cyclist. Motif: "strong" ×3 + the rubber tank. Last word: "strong."

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

Roles: Kai = George Pullman; Bram = the hotel guest who finds the steps steeper; Mabel = a passer-by on Lake Street. Motif: "up" ×4 + the jackscrew. Last word: "head" (the windows above the guest's head).

| ~Time | Beat | Story | Place · light | Key image |
|---|---|---|---|---|
| 0-4 | HOOK | A city lifts a hotel six feet into the air with the guests still inside. | Halden street (stone bank as hotel) · grey morning | the hotel already rising, frame 0 |
| 4-16 | SETUP | 1850s Chicago sits in swamp mud; cholera; in 1856 the city plans sewers, so the streets must go up. | muddy street | Mabel sinks to the knee; label "CHICAGO · 1856" |
| 16-24 | DOUBT | Raise the street and every door ends up underground. | street | Bram's front door half buried, `facepalm` |
| 24-40 | LADDER | 1860: half a block of Lake Street, 600 men, 6,000 jackscrews, 4 ft 8 in in five days, shops open. | under-building cutaway · lanterns | rows of men turning screws in time |
| 40-48 | TURN | "Wait." 1861: they try it on a six-storey hotel full of guests (Ely, Smith and Pullman). | hotel lobby (bank-lobby re-signed "TREMONT HOUSE") | guests carry on, unaware |
| 48-60 | YOU SEE | Each man turns his screws a little on one signal, so the building rises evenly. | jack trench insert, macro | a quarter turn on a whistle, ×hundreds |
| 60-68 | PAYOFF | The guest who thought the steps got steeper checks out; the windows are now above his head. | street · sun breaks | Bram looking up, jaw dropped |

To build: jackscrew row cutaway (keyed `turn`, `rise`), mud ground dressing, hotel sign. Sources: en.wikipedia.org/wiki/Raising_of_Chicago, en.wikipedia.org/wiki/Tremont_House_(Chicago). Blocker: crew and jackscrew counts disputed; open the 1861 Tribune and Macrae 1870 before scripting.
