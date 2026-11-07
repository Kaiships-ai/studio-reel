# make_vo3.py · TMV Ep1 v3: the whole chapter as ONE Gemini TTS performance (one speaker, one call, one text block).
# Run from the film folder: python vo3/make_vo3.py → vo3/takes/take-NN.wav (24 kHz PCM as delivered). No cutting here:
# vo3/tighten.py turns a take into the timeline voice.
import os, re, sys, json, glob, time, base64, wave, urllib.request, urllib.error, pathlib
ROOT = pathlib.Path.cwd(); S = json.load(open('vo3/script3.json'))
def env_key():
    for p in [ROOT, *ROOT.parents]:
        f = p / '.env'
        if f.exists():
            for l in open(f):
                if l.startswith('GOOGLE_API_KEY='): return l.split('=', 1)[1].strip().strip('"\'')
    sys.exit('GOOGLE_API_KEY not found')
text = ' '.join(S['paras'])
body = {'model': S['model'],
        'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': text,
                   'annotations': [{'type': 'speech_metadata', 'speaker': 'kai', 'style': S['style']}]}]}],
        'response_format': {'type': 'audio'},
        'generation_config': {'speech_config': {'speakers': [{'speaker': 'kai', 'voice': S['voice']}, {'speaker': 'unused', 'voice': 'Puck'}]}}}
req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=json.dumps(body).encode(),
                             headers={'Content-Type': 'application/json', 'x-goog-api-key': env_key()})
t = time.time()
try: resp = json.loads(urllib.request.urlopen(req, timeout=300).read())
except urllib.error.HTTPError as e: sys.exit(f'Gemini HTTP {e.code}: {e.read().decode()[:400]}')
def find(o):
    if isinstance(o, dict):
        if isinstance(o.get('data'), str) and (str(o.get('mime_type', '')).startswith('audio') or o.get('type') == 'audio'): return o['data']
        for v in o.values():
            if (r := find(v)): return r
    if isinstance(o, list):
        for v in o:
            if (r := find(v)): return r
a = find(resp)
if not a: json.dump(resp, open('vo3/takes/last-response.json', 'w'), indent=1); sys.exit('no audio → vo3/takes/last-response.json')
raw = base64.b64decode(a); n = max([int(re.findall(r'\d+', os.path.basename(f))[0]) for f in glob.glob('vo3/takes/take-*.wav')] or [0]) + 1
fn = f'vo3/takes/take-{n:02d}.wav'
if raw[:4] == b'RIFF': open(fn, 'wb').write(raw)
else:
    with wave.open(fn, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
print(f'{fn} · {time.time() - t:.1f}s')
