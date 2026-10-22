# gemini_v5.py: the v5 script (edge/script-v5.json text) as ONE Gemini TTS multi-speaker call (2 speakers: Kai, Clawd),
# acted per turn with a short `style` plus inline vocal tags (<gasp>, <sigh>, <short pause>) and CAPS emphasis, per
# ai.google.dev/gemini-api/docs/speech-generation (Interactions API). Key: GOOGLE_API_KEY in the library root's .env (git-ignored).
# usage: python3 gemini_v5.py [model]   (default gemini-3.8-flash-tts) → gemini/reel-gemini-v5.wav (+ gemini/last-response.json on error)
import os, sys, json, time, base64, pathlib, urllib.request, urllib.error
HERE = pathlib.Path(__file__).parent; OUT = HERE / 'gemini'; OUT.mkdir(exist_ok=True)
MODEL = sys.argv[1] if len(sys.argv) > 1 else 'gemini-3.8-flash-tts'
KEY = next(l.split('=', 1)[1].strip().strip('"\'') for l in open(HERE.parents[2] / '.env') if l.startswith('GOOGLE_API_KEY='))
VOICE = {'Kai': 'Achird', 'Clawd': 'Puck'}
TURNS = [('Kai', 'casual, confident', 'Clawd, switch to Haiku 5.5.'),
         ('Clawd', 'instantly, bubbly and eager', 'Done!'),
         ('Kai', 'casual', 'Make the design look better.'),
         ('Clawd', 'very proud, excited', 'Perfect! It looks AMAZING!'),
         ('Kai', 'confused', 'Wait. <short pause> Why is the menu on the logo?'),
         ('Clawd', 'bubbly, fast', 'Fixed it!'),
         ('Kai', 'panicked, rising', "Stop. Stop! <gasp> That's even WORSE!"),
         ('Clawd', 'oblivious, cheerful', 'Perfect!'),
         ('Kai', 'exasperated', '<sigh> Okay. Switch to Opus 5.5.'),
         ('Kai', 'whispered, tattling', 'Haiku broke everything. Please fix it.'),
         ('Clawd', 'calm, measured', 'I see the problem.'),
         ('Clawd', 'calm', 'Done.'),
         ('Kai', 'surprised, impressed', "Oh. <short pause> That's actually good."),
         ('Kai', 'eager', 'Now add a pricing page.'),
         ('Clawd', 'calm', 'Done.'),
         ('Kai', 'excited, fast', 'Yes! Okay, now the onboarding...'),
         ('Clawd', 'flat, apologetic', "You've reached your usage limit."),
         ('Kai', 'disbelief', 'Seriously?'),
         ('Kai', 'whispered, guilty', "Sorry, Clawd. <short pause> I'm trying Codex.")]
body = {'model': MODEL,
        'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': t, 'annotations': [{'type': 'speech_metadata', 'speaker': s, 'style': st}]}
                                                     for s, st, t in TURNS]}],
        'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': {'mode': 'conversational', 'speakers': [{'speaker': s, 'voice': v} for s, v in VOICE.items()]}}}
req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=json.dumps(body).encode(),
                             headers={'Content-Type': 'application/json', 'x-goog-api-key': KEY})
t = time.time()
try: raw = urllib.request.urlopen(req, timeout=300).read()
except urllib.error.HTTPError as e:
    (OUT / 'last-response.json').write_bytes(e.read()); sys.exit(f'HTTP {e.code} after {time.time() - t:.1f}s → gemini/last-response.json')
dt = time.time() - t; resp = json.loads(raw)
def find_audio(o):                               # the audio sits base64-encoded somewhere in the response; find it
    if isinstance(o, dict):
        mt = str(o.get('mime_type') or o.get('mimeType') or '')
        if isinstance(o.get('data'), str) and (mt.startswith('audio') or o.get('type') == 'audio'): return o['data'], mt
        for v in o.values():
            r = find_audio(v)
            if r: return r
    if isinstance(o, list):
        for v in o:
            r = find_audio(v)
            if r: return r
if not (a := find_audio(resp)):
    (OUT / 'last-response.json').write_text(json.dumps(resp, indent=1)[:20000]); sys.exit('no audio in response → gemini/last-response.json')
data, mt = base64.b64decode(a[0]), a[1]
fn = OUT / 'reel-gemini-v5.wav'
if data[:4] != b'RIFF':                          # raw PCM 24 kHz mono 16-bit → wrap in a WAV header
    import wave
    with wave.open(str(fn), 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(data)
else: fn.write_bytes(data)
print(f'OK {MODEL} · {dt:.1f}s · mime {mt} · {len(data) / 1e6:.2f} MB → {fn}')
print('usage:', json.dumps(resp.get('usage') or resp.get('usage_metadata') or resp.get('usageMetadata') or {})[:300])
