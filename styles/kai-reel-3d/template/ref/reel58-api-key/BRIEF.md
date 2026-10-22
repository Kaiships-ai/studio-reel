# reel58 · skit · "API key"  — keyword KEY

Make one 3D skit reel for @kaiships.ai with Blocky Kai and Clawd, end to end. Read
`kaiship-business/.agents/skills/ksa-reel-skit/SKILL.md` first (and its SKIT-WRITING, VOICE, MOTION, SFX files).
**The script is already LOCKED** (`vo/script.json`, Kai approved 2026-10-16): skip the gate, start at the voice step. Don't
change a word of it. At the end, hand over the MP4 and the results table; don't wait for anything else.

## The seed
First reel of the "Kai & Clawd" campaign (leads + followers). Remix of the structure of a hit reel by @base.learn,
"Claude, I deleted the database" (251k likes, 2.3k comments): disaster in line 1 → "which one?" → each short line adds one
new bad fact → hope → fall → Clawd quietly saved the day → the button repeats the original mistake.
Their flop (198 likes, "absolutely right") had no stakes, long run-on lines and no hope/fall. Learn from both:
- Every line = one new piece of information; hold a beat on the big reveals (l06, l08, l10, l14, l20).
- The rollercoaster must read on screen: relief on l07, the drop on l08, panic l11, the save l14, awe l17.
- The button (l20) lands in silence: show the README with the key, hold Kai's frozen face ~1 s, then the end card.

## Facts (the joke stands on these; don't invent more)
- Truffle Security planted a canary AWS key in a public GitHub repo: scanners found it in **47 s**; first API calls came
  from another country (Eastern Europe) within **4 min**. Don't name the country on screen.
  (trufflesecurity.com/research/secret-detection/anatomy-github-secret-leak-commit-to-compromise)
- Deleting the commit doesn't remove the key: it stays in git history. The right fix = turn the key off (rotate) and make a new one.
  (jwatte.com/blog/leaked-api-keys-found-in-minutes-gitignore-rotation-plan/)
- The bill is an on-screen counter only; no real amounts or provider names that could look like a real invoice.
- Clawd is cheerful and competent-but-oblivious, never evil. Kai's repo is a fake "todo-app" with 2 stars; keys on screen
  must be obviously fake (`sk-TOTALLY-REAL-123`-style), never a real-looking secret format.

## CTA (decided)
- Keyword **KEY** (one uppercase word, Skool free, decision 0003). Not spoken. In `CAPTION.md` and an end-card text after the button.
- Gift (for ksa-ig-magnet, not this reel): "Leaked an API key? The 5-minute checklist" + a good `.gitignore` + a pre-commit secret scan.
- KEY is unused in posts.csv / dm-flows (checked 2026-10-16). ChatbotX MCP was down: re-check there before posting.
- Caption: funny with taste (Kai asked for that on reel57). Hook first, the 47-second fact, then CTA.

## The creative part is yours
- Set, screen content (GitHub page with the red key line, a 00:47 bot timer, bot eyes, the bill counter, README at the end),
  camera, cut rhythm, motion and reactions on every line (MOTION.md), SFX design (SFX.md, use and grow `kaiship-business/assets/sfx/`).
- Beat reel57 (hook 6–7/10). Hook ≥ 8: line 1 is the disaster, make the first frame scream it.

## What is fixed
- Blocky Kai + default Clawd (orange), sitting together, 9:16, cut to the speaker.
- Gemini voice: Kai = Achird, Clawd = Puck, one call (VOICE.md). No pitch/stretch/per-line speed. voice-qa clean.
- Every hit keyed to a spoken word. Captions clear of heads. Never post.
- Kai's rules: write a short note of what you will do before each heavy step; run heavy jobs one at a time (16 GB Mac);
  Opus medium; high-effort verifier only for the voice and the final video check.
- **Review: exactly 2 verifier rounds** (Kai asked). After round 2, fix its ❌ and stop; list open 💡 in REVIEW.md.

## Hand-over
`renders/reel58-api-key.mp4`, `renders/cover.png`, `CAPTION.md` (KEY CTA), `REVIEW.md` (no ❌), `vo/voice-qa.md` clean,
QA-REPORT, results table. Move the folder to `projects/backlog/`. Ship kaiship-business changes with `ksa-ship`.
Then SendMessage **morphy-clone-2** with the results table and the MP4 path.
