> **Reference only.** This is the real storyboard/review of one finished reel (54.8 s, 7 chapters, hook 8/10), kept to show the bar and the process. It used a second character, a shopkeeper, and a few helpers (`kai()`, `dancer()`, `mood()`, `canonRack`) that are NOT in this kit: cast your own (e.g. a second `clawd()` in another colour). Do not copy its story.

# reel45 · "If you're vibe coding with Claude Code or Codex…" · storyboard

1080×1920, 30 fps, **53.5 s**. VO = `vo/vo.wav` (52.24 s). Word times: `vo/word_times.txt` (video seconds, no remap).
Engine: read `REEL_GUIDE.md` + `ANIMATION_GUIDE.md`, then `src/kit.js`, `src/clawd.js`.

## The concept: IT'S DANGEROUS TO GO ALONE — CLAWD'S ITEM SHOP
Clawd is a tiny vibe-coding adventurer, the shopkeeper runs the painted RPG item shop, and every plugin is a legendary item
he hands over ("It's dangerous to go alone, take this!") — each one immediately tested in a game-familiar mini-quest.

The whole reel is one world: a watercolour fantasy shop (wood counter, lantern light, shelves of glowing jars) whose
back wall is an **equipment rack with 5 empty slots**. Each chapter: the shopkeeper slides an item across the counter → Clawd
equips it (item-get pose: holds it overhead, sparkle chord) → we smash-zoom into a mini-quest that shows what it does
→ the item drops into its slot on the rack. By c7 the rack is full and Clawd is a fully kitted hero.

| plugin | item (our own drawing) | mini-quest (familiar) |
|---|---|---|
| Playwright CLI | **Spyglass-camera** (brass telescope with a shutter) | "photo mode": Clawd peeks into his own built castle, snaps it, catches bugs before the shopkeeper sees |
| Supabase plugin | **Bottomless backpack-vault** (green-teal chest that never ends) | Tetris-like stacking of table blocks into a database tower, inside a terminal window |
| Strix | **Sparring dummy that fights back** → a squad of hooded hacker-Clawds | dojo raid / siege on Clawd's app-castle, cracks found and patched |
| SkillUI | **Copy-brush / chameleon palette** | point at a painted website, it sucks out colours, fonts, spacing, components into a DESIGN.md scroll |
| Context7 | **Living map / enchanted library card** | dusty old spellbook vs. freshly updated glowing book; Clawd codes from the new one |

Cast: Clawd = `clawd()` / `dancer()` / `emote()` / `mood()` / `move()`; the shopkeeper = painted `kai(pose,x,y,h,o)` (talks
automatically; shopkeeper apron is just a painted overlay rect). Kit: `bgWash`, `chip`, `statCard`, `burst`, `twinkle`,
`codeBars`, `fileIcon`, `laptop`, `HAND/MONO/MARKER`, `textW`. **Do not use `pluginTitle`, `PLUG`, `plugProp`** (reel11-only).
Digits with `HAND()` only.

## Fact rule
On-screen text may only be: plugin names `PLAYWRIGHT CLI`, `SUPABASE PLUGIN`, `STRIX`, `SKILLUI`, `CONTEXT7`;
`CLAUDE CODE`, `CODEX`; short fact phrases from BRIEF (`open browsers`, `screenshot`, `check what it built`,
`databases`, `from the terminal`, `AI hackers`, `find + fix vulnerabilities`, `open-source`, `DESIGN.md`, `colours`,
`fonts`, `spacing`, `components`, `up-to-date docs`, `latest version`, `outdated`); the numbers 1–5 as item slot
indices (the script says first…fifth) and `5 PLUGINS`; keyword `BUILD`, `COMMENT`. Game dressing with no factual
content is fine: `ITEM GET!`, `NEW ITEM`, `EQUIPPED`, `BUG!`, `PATCHED`, `SHOP`, `!`, `?`. No stars, prices, other numbers.
No real logos: browser = our own painted window with three dots; Supabase = generic green bolt-free chest; Strix = hood
mask; no Claude/OpenAI marks (Claude Code / Codex as plain painted signs).

## Layout (every frame)
- Load-bearing stuff in **x 60..1020, y 250..1300**. Captions band **y 1320–1470**: no faces, labels, items or the shopkeeper's
  head ever inside it; the counter top sits at y≈1240, shopkeeper/Clawd feet never below y 1300 unless only legs/floor.
- Below y 1500 = floor/counter front only.
- Labels: glyph height ≥ 46 px (`HAND(60)` min for chips, `MARKER(110+)` for item names).
- Transitions cover ±0.2 s at each cut; nothing important in the first/last 0.24 s of a chapter.

## Palette
Shop base: paper `#F3EBDC`, wood `PAL.clayDk`, lantern `PAL.ochre`, ink `PAL.ink`. Each item has its own glow:
Playwright `PAL.sky`/`PAL.indigo` · Supabase `PAL.teal`/`PAL.sap` · Strix `PAL.night` + `PAL.rose` alarm ·
SkillUI `PAL.violet` + rainbow `SYN` · Context7 `PAL.ochre` + cream. CTA = warm shop at night, `PAL.night` + ochre.

---

## c1_hook.js · 0.00 – 4.85 · THE BUG STAMPEDE → THE SHOP
Words: If .16 you're .30 vibe .41 coding .69 with 1.03 Claude 1.17 Code 1.47 or 1.74 Codex 1.87–2.40 · then 2.80
here 2.95 are 3.19 five 3.31 plugins 3.56 you 3.92 guys 3.99 need 4.19 to 4.32 have 4.39–4.71

Visible event every ~0.3 s; camera never still.
- **0.00** mid-action: extreme close tracking shot (zoom 1.6), Clawd sprinting right→left across a painted desert of
  code, laptop under one arm, legs cycling, dust puffs, speed lines. Behind him a wave of ink-blot BUGS (round beetles
  with 6 legs) chasing. Camera shakes with each footfall.
- **0.16 "If"** a bug lands on Clawd's laptop (thunk + tiny burst), screen flashes red.
- **0.41 "vibe"** Clawd swats it off while running, laptop screen bursts into confetti code bars (`codeBars`) — vibe.
- **0.69 "coding"** he trips on a rock: whip-tilt, he tumbles in an arc (stretch), laptop flies up.
- **1.03 "with"** mid-air, two painted signposts flash by as the camera whips: `CLAUDE CODE` sign on **1.17 "Claude"**,
- **1.47 "Code"** sign slams into frame (burst), bugs crash into it.
- **1.50 SURPRISE / scale break:** Clawd lands — on a huge wooden SHOP sign. The camera whips back (zoom 1.6 → 0.7)
  revealing the whole "desert" was a tabletop map on the shopkeeper's shop counter, and the shopkeeper (giant in frame, y feet off-screen,
  head at y≈450) looms over it holding a lantern. Bugs are tiny ink dots that the shopkeeper flicks away (1.74 "or").
- **1.87 "Codex"** second sign `CODEX` pops opposite the first (burst); Clawd stands, dizzy swirl eyes (`emote`).
- **2.10** the shopkeeper leans down, eye-to-eye; Clawd "!" emote. Push-in.
- **2.40–2.80** (pause) the shopkeeper yanks a cord: the back curtain rips away — whoosh — the **equipment rack with 5 glowing
  empty slots** slides in, light rays (`twinkle` dust in the beam). Camera cranes up.
- **3.19 "are"** slots light in a quick chase 1→5 (one per ~0.07 s).
- **3.31 "five"** giant `5` (HAND 300) slams in over the rack + shake; **3.56 "plugins"** it becomes `5 PLUGINS`
  chip (HAND 90).
- **3.92 "you guys"** Clawd hops onto the counter, sparkling eyes, points at the rack.
- **4.19 "need"** the shopkeeper slams a closed treasure crate on the counter (squash, dust).
- **4.39 "have"** crate lid cracks open, light blasts out (bloom) → splat wipe at 4.85 (night/indigo).

## c2_playwright.js · 4.85 – 13.20 · ITEM 1: THE SPYGLASS CAMERA
Words: The 4.97 first 5.05 is 5.39 Playwright 5.54 CLI 5.96–6.51 · This 6.71 … AI 7.34 power 7.72 open 8.10 browsers 8.35
screenshot 8.84 what 9.44 just 9.61 built 9.82–10.16 · and 10.37 catch 10.55 messy 10.80 outputs 11.08 and 11.52 errors
11.52–11.87 before 11.88 you 12.15 guys 12.22 even 12.47 see 12.64 it 12.84–13.05
- **4.97–5.40** inside the crate light: slot `1` flashes on the rack; the shopkeeper's hand slides a brass spyglass across the
  counter (camera pans with it).
- **5.54 "Playwright"** Clawd grabs it, ITEM-GET pose (holds overhead, rays, sparkle chord); name plate
  `PLAYWRIGHT CLI` (MARKER 120) drops in on **5.96 "CLI"** with bounce. `ITEM GET!` chip.
- **7.34 "AI"** Clawd puts the spyglass to his eye → iris-style vignette, the camera dives *through* the lens.
- **8.10 "open"** inside the lens: a painted browser window (three dots) swings OPEN like shutters; chip `open browsers`.
- **8.35 "browsers"** two more browser windows fan out (stack, rotate).
- **8.84 "screenshot"** SHUTTER: white flash, frame freezes as a polaroid that spits out and spins (`screenshot` chip).
- **9.82 "built"** polaroid lands: it's Clawd's sandcastle-app (a painted web page castle). Camera pushes into it.
- **10.55 "catch"** spyglass lens sweeps over the polaroid like a magnifier; **10.80 "messy"** smudged blobs revealed;
  **11.52 "errors"** 3 red `BUG!` beetles light up, each popped by a net swipe (burst ×3 at 11.52 / 11.70 / 11.88).
- **12.15 "you guys"** zoom out: the shopkeeper, behind the counter, turns around only now (back pose → front) — **12.64 "see"**
  everything is clean, Clawd whistles innocently; spyglass flies into slot 1 (clink) at 12.90. Chip `check what it built`.

## c3_supabase.js · 13.20 – 20.22 · ITEM 2: THE BOTTOMLESS VAULT
Words: second 13.38 Supabase 14.20 plugin 14.71–15.16 · help 15.61 build 15.88 entire 16.13 databases 16.60 apps 17.46
manage 17.90 without 18.50 leave 19.40 your 19.59 terminal 19.68–20.07
- **13.38 "second"** slot `2` flashes teal; the shopkeeper heaves a green-teal iron chest onto counter (big squash, counter bounces).
- **14.20 "Supabase"** lid swings open, Clawd peers in, falls in head-first (**14.71 "plugin"** plate `SUPABASE PLUGIN`).
- **15.30** camera falls with him: inside the vault is an endless painted dark-terminal shaft (`PAL.night`), MONO
  prompt `>_` blinking.
- **15.88 "build"** Clawd lands on a floor; table blocks (cream cards with codeBars rows) start falling Tetris-style.
- **16.13 "entire"** / **16.60 "databases"** he stacks them fast — 4 blocks snap in on 16.60/16.80/17.00/17.20, each with
  a thunk; a tall database cylinder tower forms. Chip `databases`.
- **17.46 "apps"** little app-window houses light up at the tower base, linked by ink lines.
- **17.90 "manage"** Clawd conducts with a baton: rows re-sort, swap colours (rhythmic).
- **18.50 "without"** a painted door labelled `EXIT` appears; Clawd glances at it — **19.40 "leave"** shakes head
  "nope", slams it shut.
- **19.59 "your terminal"** pull out: the whole tower lives inside a terminal window; chip `from the terminal`; chest
  shrinks into slot 2 (clink) ~20.00.

## c4_strix.js · 20.22 – 27.42 · ITEM 3: THE HACKERS YOU HIRE
Words: third 20.41 Strix 20.75–21.13 attack 21.49 vibe-coded 21.91 app 22.39 real 23.04 hacker 23.30–23.73 · find 24.18
fix 24.54 security 25.03 vulnerabilities 25.42–26.06 left 26.61 behind 26.83–27.26
- **20.41 "third"** slot `3` flashes; lights go DOWN in the shop (night palette, rose alarm lamp spinning).
- **20.75 "Strix"** three hooded Clawd silhouettes drop from the ceiling on ropes (thud ×3 ~20.8/20.95/21.1), eyes
  glow; plate `STRIX` + chip `AI hackers` · `open-source`.
- **21.49 "attack"** Clawd's app is a little painted castle on the counter; hackers charge it — camera whips low.
- **21.91 "vibe-coded"** castle wobbles (it's made of sticky notes), **22.39 "app"** one hacker kicks a wall → cracks.
- **23.04 "real"** / **23.30 "hacker"** hacker pulls a crowbar, pries a door; red `!` crack-markers pop on 3 spots (shake).
- **24.18 "find"** spyglass-style magnifier circles each crack (rose glow).
- **24.54 "fix"** hackers flip their hoods — they're helpers: they slap painted patch-plasters on each crack
  (24.55/24.75/24.95), each `PATCHED` stamp. Chip `find + fix vulnerabilities`.
- **25.42 "vulnerabilities"** castle rebuilds sturdier: stone texture washes over sticky notes.
- **26.61 "left behind"** lights come back up; hackers bow and vanish in smoke puffs; a hood mask drops into slot 3.

## c5_skillui.js · 27.42 – 36.20 · ITEM 4: THE COPY-BRUSH
Words: fourth 27.59 SkillUI 27.92–28.42 frontend 28.56 point 29.30 any 29.72 site 29.86 like 30.34 · go through 30.60
reverse 31.19 engineer 31.53 whole 31.98 design 32.14 system 32.44 markdown 32.97 file 33.33 · your AI 33.75 build 34.34
project 34.66 exact 35.18 same 35.49 style 35.64–36.04
Beat A — the pick (27.4–30.6):
- **27.59 "fourth"** slot `4` violet; the shopkeeper spins a lazy-susan of painted websites (gallery frames on the counter).
- **27.92 "SkillUI"** Clawd catches a fat paintbrush with a rainbow palette head; plate `SKILLUI` + chip `frontend` 28.56.
- **29.30 "point"** Clawd aims the brush like a wand; gallery stops on one gorgeous painted website (hero, buttons,
  cards); **29.86 "site"** target reticle snaps on it.
Beat B — the extraction (30.6–33.6):
- **31.19 "reverse"** brush SUCKS: colour swatches peel off the site and fly into the palette (31.2, 31.4, 31.6),
  site goes grey behind; **31.53 "engineer"** fonts (big Aa), spacing ruler, button components fly in after.
  Chips (HAND 60) pop as they fly: `colours` `fonts` `spacing` `components`.
- **32.14 "design system"** palette spins and squeezes it all out as ink → **32.97 "markdown file"** a scroll unrolls:
  `fileIcon` big, label `DESIGN.md` (MONO 64). Squash-stretch on unroll at 33.33.
Beat C — the build (33.6–36.2):
- **33.75 "your AI"** Clawd feeds the scroll into his laptop; **34.34 "build"** a new site paints itself stroke by
  stroke next to the original (split screen, camera trucks right);
- **35.18 "exact same"** both sites side-by-side matching, **35.64 "style"** ding + matching sparkles; brush clinks
  into slot 4.

## c6_context7.js · 36.20 – 47.02 · ITEM 5: THE ALWAYS-NEW SPELLBOOK
Words: fifth 36.48 Context7 36.99–37.74 · provides 38.26 coding assistant 38.69/39.00 latest 39.60 version 39.91 all
40.40 libraries 40.74–41.34 · tools 41.76 dependencies 42.28 top 42.99 performers 43.21 use 43.63 · never 44.62 code 45.09
against 45.44 outdated 45.87 version 46.29 again 46.55–46.86
Beat A — the reveal (36.2–38.1):
- **36.48 "fifth"** last slot `5` flashes ochre; the shop shakes, the counter splits, a golden spellbook rises on a
  pedestal (crane up). **36.99 "Context7"** book flaps open, page-light bloom; plate `CONTEXT7`.
Beat B — the old vs. new (38.1–41.6):
- **38.26 "provides"** Clawd at his laptop holds a dusty brown old book (cobwebs, moth flies out on 38.7).
- **39.60 "latest"** golden book's pages flip fast (page riffle), **39.91 "version"** chip `latest version`.
- **40.40 "all"** / **40.74 "libraries"** library shelves zoom past behind (camera dolly), books fly from them into
  the golden book (3 on 40.8/41.0/41.2). Chip `up-to-date docs`.
Beat C — tools & the top shelf (41.6–44.3):
- **41.76 "tools"** wrench/hammer icons pop out of pages; **42.28 "dependencies"** they chain together with ink links.
- **42.99 "top performers"** camera cranes to the top shelf where tiny pro-adventurer Clawds (capes, sunglasses)
  nod and give thumbs up; **43.63 "use"** they hold the same golden book.
Beat D — goodbye old book (44.3–47.0):
- **44.62 "never"** Clawd holds the dusty book over a bin; **45.87 "outdated"** chip `outdated` stamped on it (rose);
- **46.29 "version"** he tosses it — it crumbles into dust; **46.55 "again"** golden book snaps shut and flies into
  slot 5 (final clink, rack complete glow).

## c7_cta.js · 47.02 – 53.50 · FULL LOADOUT
Words: So 47.12 try 47.83 all these 48.08/48.20 yourselves 48.35 comment 48.99 BUILD 49.72–50.18 below 50.46 send 51.10
directly 51.65–52.15 · hold to 53.5
- **47.12** the rack glows complete (5 items lit). **47.83 "try"** Clawd steps into a beam, items fly from the rack
  onto him one by one on **48.08–48.70** (spyglass on belt, vault backpack, hood, brush, book) = full hero loadout,
  pose with a sword-like brush.
- **48.99 "comment"** the shopkeeper (front, waving) leans in at right: a painted speech-bubble/comment box (`COMMENT`) unfolds.
- **49.72 "BUILD"** `BUILD` (MARKER 220, ochre) slams in at y≈800, biggest shake of the reel, burst + confetti.
- **50.46 "below"** a big painted arrow bounces down toward y 1290 (stops above the caption band).
- **51.10 "send"** the shopkeeper flicks a scroll; it flies toward camera; **51.65 "directly"** Clawd + the shopkeeper high-five (burst).
- **52.2–53.5** hold alive: Clawd bob idle, lantern flicker, twinkles, `BUILD` breathing scale; no fade to static.

## Cut list (= TRANS in src/timeline.js)
| t | kind | colours | why |
|---|---|---|---|
| 4.85 | splat | night / indigo at (540,820) | crate light blasts out |
| 13.20 | brush | teal / #2E7F86 | into the vault |
| 20.22 | splat | clayDk / clay at (540,760) | lights out for the raid |
| 27.42 | brush dir -1 | violet / #5B3F8C | paint for the copy-brush |
| 36.20 | iris | ink, (540,760)→(540,780) | spotlight on the spellbook |
| 47.02 | brush | ochre / #D98E2B | warm full-loadout finale |

## Cue sheet (music / SFX)
Music: light adventurous plucked/marimba loop ~110 BPM, ducked −14 dB under VO; tension swell into each item-get.
| time | sound |
|---|---|
| 0.00 | running footsteps + bug skitter swarm (bed to 1.5) |
| 0.16 | thunk on laptop |
| 0.41 | glitch swish |
| 0.69 | trip + whoosh |
| 1.17 / 1.47 | wooden sign slam ×2 |
| 1.50 | big camera whoosh / reveal boom |
| 1.87 | sign slam |
| 2.40 | curtain rip + choir "aah" |
| 3.19 | 5-note ascending chime chase |
| 3.31 | heavy impact |
| 4.19 | crate thud |
| 4.39 | lid creak + light bloom |
| 4.85 | splat |
| 5.54 | ITEM GET jingle |
| 8.84 | camera shutter |
| 11.52 / 11.70 / 11.88 | net swipe pops ×3 |
| 12.90 | clink into slot |
| 13.20 | brush whoosh |
| 13.38 | metal chest thud |
| 14.71 | falling whistle |
| 16.60 / 16.80 / 17.00 / 17.20 | block thunks |
| 19.40 | door slam |
| 20.00 | clink |
| 20.22 | splat |
| 20.41 | power-down + alarm loop (to 26.6) |
| 20.8 / 20.95 / 21.1 | rope drop thuds |
| 22.39 | crack |
| 23.30 | crowbar creak + alarm stab |
| 24.55 / 24.75 / 24.95 | patch slaps / stamps |
| 26.61 | smoke puffs + clink |
| 27.42 | brush whoosh |
| 27.92 | ITEM GET jingle |
| 29.86 | reticle lock beep |
| 31.2–31.9 | suction whoosh + paint blips |
| 33.33 | scroll unroll |
| 35.64 | ding + sparkle, clink |
| 36.20 | iris swoosh |
| 36.48 | rumble + rising pedestal |
| 36.99 | page bloom choir |
| 38.7 | moth flutter |
| 39.60 | page riffle |
| 40.8 / 41.0 / 41.2 | book whooshes |
| 43.63 | tiny crowd "ooh" |
| 46.29 | dust crumble |
| 46.55 | book snap + final clink + rack complete chord |
| 47.02 | brush whoosh |
| 48.08–48.70 | 5 equip clinks |
| 49.72 | big impact + confetti |
| 51.65 | high-five clap |
| 52.2–53.5 | music resolve sting, tail to 53.5 |
