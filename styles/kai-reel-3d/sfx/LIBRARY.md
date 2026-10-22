# SFX library

Licensed sounds for Kai's reels. 48 kHz mono 16-bit WAV, leading silence trimmed. One folder per category.
Used through `audio/sfx.py` in a ksa-reel-3d project (cue kind → 1–3 layers). Add a row for every new file.

| File | What it is | Source · license | First used in |
|---|---|---|---|
| clawd/toy-tap.wav | tiny hollow plastic toy foot tapping a keyboard key | ElevenLabs sound-generation (Kai's account; generated output, commercial use per ElevenLabs terms) · 2026-10-16 | reel57-permission (Clawd's typing hops) |
| clawd/toy-land.wav | small vinyl toy landing on a keyboard, soft thud + tiny squeak | ElevenLabs sound-generation · 2026-10-16 | reel57-permission (Clawd's hops) |
| foley/enter-clack.wav | one heavy mechanical ENTER key press, deep thock | ElevenLabs sound-generation · 2026-10-16 | reel57-permission (Kai's "Yes" on the ENTER key) |
| foley/poof.wav | cartoon dust poof with paper rustle | ElevenLabs sound-generation · 2026-10-16 | reel57-permission (folders vanish) |
| foley/cloth-stand.wav | jumping up from a chair, cloth rustle + creak | ElevenLabs sound-generation · 2026-10-16 | reel57-permission (Kai stands / slumps) |
| ui/toggle-danger.wav | chunky toggle flip + two-tone warning beep | ElevenLabs sound-generation · 2026-10-16 | reel57-permission (bypass permissions on) |
| ui/px-pop.wav | soft UI pop | Pixabay · Pixabay Content License (via OpenMontage hyperframes-media/assets/sfx) | reel57-permission (prompt card, folder pop) |
| ui/px-click-soft.wav | soft click | Pixabay · Pixabay Content License | reel57-permission (prompt card) |
| ui/px-notification.wav | notification | Pixabay · Pixabay Content License | (spare) |
| ui/px-sparkle.wav | sparkle shimmer | Pixabay · Pixabay Content License | reel57-permission (celebrations) |
| ui/px-chime.wav | chime | Pixabay · Pixabay Content License | reel57-permission (end card) |
| ui/px-glitch-1.wav | digital glitch | Pixabay · Pixabay Content License | reel57-permission (rm -rf line, low) |
| ui/px-error.wav | error tone | Pixabay · Pixabay Content License | (spare) |
| foley/px-key-press.wav | keyboard key press | Pixabay · Pixabay Content License | reel57-permission (ENTER layer, landings) |
| foley/px-typing.wav | keyboard typing burst | Pixabay · Pixabay Content License | reel57-permission (rm -rf line) |
| whoosh/px-whoosh-short.wav | short whoosh | Pixabay · Pixabay Content License | reel57-permission (take-off, poof, snap) |
| whoosh/px-whoosh.wav | whoosh | Pixabay · Pixabay Content License | reel57-permission (slump) |
| ui/alarm-stinger.wav | two quick red-alert beeps + low synth hit | ElevenLabs sound-generation (Kai's account; commercial use per ElevenLabs terms) · 2026-10-16 | reel58-api-key (frame 1 leak, "Right now" flare) |
| ui/robot-blip.wav | tiny robot eye powering on, blip + servo | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (bot eyes switch on) |
| ui/timer-tick.wav | fast digital stopwatch ticks speeding up | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (00:00 → 00:47) |
| ui/sonar-ping.wav | single ominous radar ping | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (calls from another country) |
| ui/counter-roll.wav | rising digital counter, slot-machine ticks | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (the bill counter) |
| impact/low-boom.wav | deep cinematic boom with a short sub tail | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (00:47, "history" drop, stamp layer) |
| foley/power-down.wav | device powering down, falling whine + click | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (key turned off, bot eyes shut) |
| foley/key-jingle.wav | a metal door key clinking onto a desk | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (the new key pops) |
| ambience/night-room-tone.wav | quiet night room tone, soft computer fan (6 s, loops) | ElevenLabs sound-generation · 2026-10-16 | reel58-api-key (bed under everything, −30 dB vs dialog) |

Also tried for reel58 and dropped: a rubber-stamp thunk and a UI check tick (first takes near-silent; the re-take hit 401, credits used up). Stamp = enter-clack + low-boom + chime; check = click-soft + pop.
