# Sounds Fake · series bible v1.1 (11/11/2026)

Production bible for the stick-man 3D series. Story canon (characters, places, facts) lives in the story-skills project `story/` and wins over this file if they differ (series-continuity rule: one owner per fact). Numbers marked "ref" are measured on the 4 Ricks Clips reference shorts in `tmv/kit/records/stickman-style/FORENSIC.md`.

**Quality bar (≥ 8.5/10):** `styles/stick-man/tools/judge.mjs` (headless Sonnet reviewers, our sheets vs reference sheets, 10 categories): PASS = mean overall ≥ 8.5 and no category mean < 8. Every episode is judged; "even quality" = all three episodes of a day PASS.

Names: the troupe's Doer is **Kip** (kit spec `KAI` unchanged). "Kai" in this folder always means Kai the owner.

## 1. Premise, tone, narrator

| Item | Decision |
|---|---|
| Premise | One true story a day that sounds made up: someone does a thing everyone laughs at, and it works bigger than anyone guessed. The last word proves it. |
| Controlling idea | An idea everyone laughs at wins when it obeys a real rule the laughers never checked. (Counter: "if it sounds silly, it is silly", Bram's belief.) |
| Frame | Three stick actors (the troupe) restage every story in the toy city of Halden. A real place = a Halden set + one printed label with the real name and year. |
| Tone | Wry, fast, warm. Delighted by the absurd, kind to real people. Gross = gag, never gore. |
| Narrator | One voice: Gemini TTS, Achird, 2.9-3.3 words/s. Third person, present tense (hook may be past). Never "like and follow", never "in this video". |
| Story source | Kai's (owner) script, or "next episode" = pick a true story from the backlog (`LEDGER.md`) that passes the fit-check (`FLOW.md`). |

## 2. Format card

| Slot | Rule | Reason |
|---|---|---|
| Length | 60-80 s, aim 64-70 s; 195-235 words, aim ~205 (60-80 s at 2.9-3.3 words/s) | ref mean 64.7 s; Achird is slower than ref (3.1 vs 3.52 words/s) |
| Frame | 1080×1920, 30 fps | kit and ref |
| Hook (l01) | The odd act stated as a plain fact, ≤ 12 words, the reason saved for later ("A doctor swallowed a beaker of bacteria. On purpose."); first word at 0.00 s; frame 0 already mid-action; first camera rush or dissolve by f30 | ref 4/4 open on the verb; first move median f24.5 |
| Open | No title card, no logo. The first place change shows the restage label (place · year) printed in the world | ref: zero stickers; "the set says the line" |
| Sign-off | No spoken sign-off. The last frame shows Bram's face (shock / facepalm) next to the climax image | last word must be the climax; tail ≤ 0.3 s |
| CTA slot | Not in the audio. Post caption: one line + keyword (default "SOURCE": the DM sends the episode's source list), "AI voice", and a "Don't try this at home" line whenever the story is a risky act (who did it, why it was safe for them) | ref has no spoken CTA; keeps the last word clean |
| Captions | 1-2 words, ~66 % one-word, ~72 px font, 7 px black stroke, top at y 1322, no pop, punctuation kept, no ALL CAPS, no colour emphasis | FORENSIC section 8 |
| Music | Section plan in `audio/music.json`: playful (hook-doubt) → build (ladder) → stop dead on "Wait." → curious (You see,) → urgent → resolve chord on the last word. Bed −10 to −12 dB under the voice in pauses, bass under pauses | FORENSIC section 9 |

**~65 s beat template** (times scale with the take; an episode may merge or swap beats when its story needs it)

| Time | Beat | Must contain | Ref device |
|---|---|---|---|
| 0-4 s | HOOK | odd act as plain fact, mid-action | 4/4 |
| 4-15 s | SETUP | place · year label; the common belief; who the doer is (name plaque) | |
| 15-24 s | DOUBT | the doubter mocks (laugh, rejection, insult, newspaper); Bram on screen | 3/4 |
| 24-42 s | ACT + LADDER | the odd act in 2-3 rising rungs; one verbatim quoted line from a source | ladder 4/4, quotes 3/4 |
| 42-50 s | TURN | "Wait." a cost or surprise; music stops | reversals 2-3 per ref |
| 50-62 s | YOU SEE | "You see," + the hidden rule, shown as an explainer insert | 3/4 |
| 62-70 s | PAYOFF | the biggest image lands on the last word; Bram's face; end ≤ 0.3 s after | 4/4 |

Motif: one word repeated 3-4 times AND one prop that carries it, seen ≥ 3 times (ref pink: "15 minutes" ×4 + stopwatch).

## 3. World: Halden (build lazily)

| Place (story id) | Kit set | Mood and its own light | Status | First used |
|---|---|---|---|---|
| Lab `halden-lab` | `lab` | cool fluorescent, teal shadows, amber/green accent | exists | ep 1 |
| Diner `halden-diner` | `diner` (.glb) | warm noon, red neon accent | exists | ep 1 |
| Lecture hall `halden-lecture-hall` | `classroom` (.glb), re-signed | warm tungsten, dim back rows | exists | ep 1 |
| Kitchen `halden-kitchen` | new `kitchen` (code set, ~15 min) | early-morning blue window, yellow pendant | **build for ep 1** | ep 1 |
| Prize stage `halden-plaza-stage` | `halden-plaza` + `use: ['concert']` | night, one warm spotlight, magenta-blue shadows | exists, night grade new | ep 1 |
| Countryside field | `park` re-dressed (hedgerows, mud road) | dawn mist, low cold sun | build at ep 2 | ep 2 |
| Artists' tent | `workshop` (.glb), re-signed | lantern warm inside, blue outside | exists | ep 2 |
| Muddy street / under-building | `halden-street` + stone_bank.glb as hotel; new jack trench cutaway | grey 1850s overcast; trench lit by lanterns | build at ep 3 | ep 3 |
| Others on hand | `bank-lobby`, `street`, `harbour`, `island`, `cutaway` | each keeps its own grade | exist | when a story fits |

New props and verbs for ep 1 only: beaker + 2 petri dishes (printed "BEEF BROTH"), stomach model (keys `bugs`, `inflame`, `ulcer`, `cure`), 3 piglets (code prop), Nobel-style gold medal (plain disc, no logo), verb `drink`, one-off extra `warren`, plaza night grade. Everything goes into the kit with its SETS.md / VERBS.md row so later episodes reuse it.

## 4. Cast

| | Kip · the Doer | Bram · the Doubter | Mabel · the Witness |
|---|---|---|---|
| Kit spec | `KAI` (`engine/cast.js`; actor name Kip) | `BRAM` (`lib/cast/extras.js`) | `MABEL` (`lib/cast/extras.js`) |
| Thumbnail silhouette | bushy curls + red bandana knot | flat cap with a pale grey band, darkest body on screen | widest: straw sun hat brim |
| Colour | white shirt, orange vest, green strap | navy-black + pale cap band; cool rim light on dark sets | lilac shirt, teal vest |
| Prop | the episode's odd object in hand | empty hands (to cross arms) | none; notices with the body |
| Personality | curious, cocky, never angry, commits with the whole body | sensible, loud laugher, "everyone knows"; not a villain | notices first (a smell, a noise, steeper steps), practical, nosy |
| 5 signature poses | `point_lean`, `present`, `arms_wide`, `lift_heavy`, `celebrate` | `arms_crossed`, `laugh`, `hands_on_hips`, `facepalm`, `lean_away` | `shade_eyes`, `cup_ear`, `lean_in`, `recoil`, `flail` |
| Face range | excited, sly, smug, proud, grin, nervous, pain | deadpan, smug, suspicious, closed, disgust → shock | suspicious, confused, worried, disgust, shock, happy, blush |
| Plays (S1) | Marshall · Shilstone · Pullman | the experts · tank officers · the hotel guest | Adrienne · a cyclist · a passer-by |

Narrator: voice only (Achird), the only speaker. Characters never talk on screen; the narrator quotes them and the speaker is shown saying it to a listener, both in frame (kit rule).

**One-off extras rule:** build from `lib/cast/extras.js` (name, shirt, ≤ 1 hair item). Muted shirts (saturation < 0.35) so the three mains own the strong colours; never red bandana, near-black, or a wide sun hat (so `WREN` is benched). Max 4 extras in one frame. An extra used in 2+ episodes gets a story `characters/` file.

## 5. Principles (defaults with the reason; break one when the story needs it, and say why in the storyboard)

| Principle | Reference number | Why |
|---|---|---|
| Dissolve or fly between places; almost never hard-cut | ref 53 % dissolves (~9 f), 38 % camera-driven, 1 % hard cuts | cuts read as a slideshow; ours were 87 % cuts |
| Hold, then rush | drift 0.5-3 px/f; moves peak ~100 px/f at 1080 (p90); ~5 moves per 10 s; 49 % of time in moves | speed comes from contrast, not constant motion |
| Irregular shot rhythm | shot length median 2.3 s, CV 0.84 (0.3-12 s) | a 1-second grid feels mechanical (robe CV 0.21) |
| Wide and odd angles carry a third | establishing + wide 32 %, low 7 %, top/aerial 11.5 %, inserts 15 %, full figure ≤ 15 % | the world tells the story, not talking heads |
| A new place every ~5 s | 2.1 places per 10 s (13.8 per video) | each line gets its own picture |
| Every place has its own light | per-shot brightness std ≥ 20 (ref 23-25); ≥ 1 dark shot (Y < 95); cool coloured shadows (hue 200-300°) | one flat daylight is the biggest look gap |
| One saturated accent per place | median pixel saturation ≥ 0.38 (ref 0.45) | the eye needs one hot spot |
| Act big, then hold | head moves 12-15 f, ~2.3 head widths; holds up to 86 f; face ramps 3-5 drawings in 12 f; mouth-area CV ~0.47 | small constant fidget reads as nervous puppets |
| The set says the line | ≥ 1 printed in-world label per ~15 s (posters, cans, banners) | facts read without stickers |
| FX are matter | ~1.2 FX per 10 s: smoke, cracks, splashes, sparks that stay in the set; an FX can be the transition | ref: 0 overlays, all physical |
| Doubt is staged; the motif is a prop | doubter 3/4, quoted lines 2 per video, reversals 2-3, ladder 4/4 | the payoff needs someone who was wrong |
| No dead air | pauses ≤ 390 ms (p90 ≤ 240) | ref max 390 ms |
| Dark figures keep an edge | Bram (navy-black) gets a cool rim light on any set darker than Y 95 and his pale cap band always shows | at thumbnail size a dark figure on a dark set vanishes |
| Name the real people like the places | the first appearance of each real person shows a printed name (plaque, badge, door sign, newspaper) | same reason as the place · year label: the set says the line, never a sticker |

## 6. Hard rules (break one and the series visibly breaks)

| # | Rule |
|---|---|
| 1 | Troupe identity is fixed: Kip, Bram, Mabel keep their kit spec colours and hair/hat; a role adds at most one piece (tie, badge, hand prop). |
| 2 | One narrator only: Achird, Gemini TTS. No character voices, no second narrator. |
| 3 | Format slots: 1080×1920, 30 fps, 60-80 s, 195-235 words; first word at 0.00 s and frame 0 mid-action; last word = the climax image, ≤ 0.3 s tail. |
| 4 | Every factual claim is true and listed in the episode's `story/research/` note with a URL that was opened; a claim without one is cut. Quotes are verbatim. |
| 5 | No floating text stickers; words on screen are captions or printed on things in the world. |
| 6 | Real people: admiring or neutral tone, no invented lines, no mocking a real person's body; living people get extra care (research note `risk: defamation`); dead people are named with the same respect (ep 1: Marshall living, Warren died 2024). |
| 7 | Never copy reference frames, stories or characters into the repo. |
| 8 | Kai (owner) approves every render before it runs (he sees script, board and stills in one approval pack); nothing is posted by an agent. |
