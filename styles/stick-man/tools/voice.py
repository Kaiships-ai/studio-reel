# Narrator voice for a stick-man film: one Gemini TTS call (interactions API) per voice, the whole script in one take.
#   python styles/stick-man/tools/voice.py films/<slug> --samples Achird Charon Fenrir   -> vo/samples/<Voice>.wav + words/s
#   python styles/stick-man/tools/voice.py films/<slug> --take Achird                    -> vo/takes/take-NN.wav, vo/vo.wav (48 kHz mono)
# Options: --env <path to .env with GOOGLE_API_KEY> (default: .env in the library root).
# Reads vo/script.json {model, cast:{nar:<voice>}, lines:[{id, who, style, text}]}. Never send speech_config.mode: the
# interactions API answers HTTP 400. Reel 1: Achird, styles "fast, ...", ~3.7 words/s.
import json, os, subprocess, sys, base64, wave, time, urllib.request, urllib.error

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../..'))
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
args = sys.argv[1:]
if len(args) < 3 or args[1] not in ('--samples', '--take'):
    sys.exit('usage: voice.py films/<slug> --samples V1 [V2 ...] | --take Voice  [--env path/.env]')
film = os.path.abspath(args[0]); env = os.path.join(ROOT, '.env')
if '--env' in args: i = args.index('--env'); env = args[i + 1]; args = args[:i] + args[i + 2:]
mode, voices = args[1], args[2:]
S = json.load(open(os.path.join(film, 'vo', 'script.json'))); LINES = S['lines']
if not LINES: sys.exit('vo/script.json has no lines')
key = os.environ.get('GOOGLE_API_KEY') or next((l.split('=', 1)[1].strip().strip('"\'') for l in open(env) if l.startswith('GOOGLE_API_KEY=')), None)
if not key: sys.exit(f'no GOOGLE_API_KEY in the environment or {env}')


def find(o):
    if isinstance(o, dict):
        if isinstance(o.get('data'), str) and (str(o.get('mime_type', '')).startswith('audio') or o.get('type') == 'audio'): return o['data']
        o = list(o.values())
    if isinstance(o, list):
        for v in o:
            r = find(v)
            if r: return r


def call(voice, fn):
    body = {'model': S.get('model', 'gemini-3.8-flash-tts'),
            'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': l['text'],
                       'annotations': [{'type': 'speech_metadata', 'speaker': 'nar', 'style': l.get('style', '')}]} for l in LINES]}],
            'response_format': {'type': 'audio'},
            'generation_config': {'speech_config': {'speakers': [{'speaker': 'nar', 'voice': voice}, {'speaker': 'unused', 'voice': 'Puck'}]}}}
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': key})
    t = time.time()
    try: resp = json.loads(urllib.request.urlopen(req, timeout=300).read())
    except urllib.error.HTTPError as e:
        print(voice, 'HTTP', e.code, e.read().decode()[:300]); return None
    a = find(resp)
    if not a: print(voice, 'no audio in response', str(resp)[:200]); return None
    raw = base64.b64decode(a); os.makedirs(os.path.dirname(fn), exist_ok=True)
    if raw[:4] == b'RIFF': open(fn, 'wb').write(raw)
    else:
        with wave.open(fn, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw)
    with wave.open(fn) as w: dur = w.getnframes() / w.getframerate()
    words = sum(len(l['text'].replace('"', '').split()) for l in LINES)
    print(f'{fn}: {voice} {dur:.1f} s, {words / dur:.2f} words/s, call {time.time() - t:.0f} s')
    return fn


if mode == '--samples':
    for v in voices: call(v, os.path.join(film, 'vo', 'samples', f'{v}.wav'))
else:
    tk = os.path.join(film, 'vo', 'takes'); os.makedirs(tk, exist_ok=True)
    n = 1 + len([f for f in os.listdir(tk) if f.startswith('take-')])
    fn = call(voices[0], os.path.join(tk, f'take-{n:02d}.wav'))
    if not fn: sys.exit(1)
    subprocess.run([FFMPEG, '-y', '-v', 'error', '-i', fn, '-ac', '1', '-ar', '48000', os.path.join(film, 'vo', 'vo.wav')], check=True)
    print(os.path.join(film, 'vo', 'vo.wav'), '48 kHz mono (listen, then align)')
