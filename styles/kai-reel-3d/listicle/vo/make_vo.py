# make_vo.py: the whole skit dialogue as ONE Gemini TTS performance (2 speakers), then cut into lines for the reel.
# Run from the reel project root:
#   uv run -q --python 3.12 --with faster-whisper --with speechbrain --with torch --with torchaudio --with soundfile --with numpy \
#     python vo/make_vo.py            # new take: one Gemini call → vo/takes/take-NN.wav → vo/vo.wav
#   ... python vo/make_vo.py --take 2 # re-cut an existing take (no API call): vo/takes/take-02.wav → vo/vo.wav
#   ... python vo/make_vo.py --wav x.wav  # cut any wav (e.g. a take made elsewhere)
# Reads vo/script.json: {"model", "cast": {"kai": "Achird", "clawd": "Puck"}, "lines": [{"id","who","role","style","text"}]}.
# text = the spoken words verbatim + vocal tags <gasp> <sigh> <laugh> <short pause>; CAPS = emphasis; delivery goes in style.
# Writes vo/vo.wav, vo/vo_kai.wav + vo/vo_clawd.wav (each voice alone, silence elsewhere: they drive the mouths),
# src/vo.js (VO_LINES, VO_WORDS, VO_END: line/word times from whisper word timestamps), src/vo_env.js (via vo/env.py),
# vo/voice-qa.md (words heard vs script per line + one-voice check per character). Key: GOOGLE_API_KEY in the library root's .env (git-ignored).
import os, re, sys, json, glob, time, base64, wave, difflib, subprocess, urllib.request, urllib.error, pathlib
import numpy as np, soundfile as sf
ROOT = pathlib.Path.cwd(); SR = 48000; GEM_SR = 24000   # outputs at 48 kHz = what audio/score.py and the review tools expect; Gemini PCM is 24 kHz
S = json.load(open('vo/script.json')); LINES = S['lines']; os.makedirs('vo/takes', exist_ok=True)
args = sys.argv[1:]; opt = lambda k: args[args.index(k) + 1] if k in args else None

# ---------------------------------------------------------------- 1. one Gemini call for the whole dialogue (or reuse a take)
def env_key():
    for p in [ROOT, *ROOT.parents]:
        f = p / '.env'
        if f.exists():
            for l in open(f):
                if l.startswith('GOOGLE_API_KEY='): return l.split('=', 1)[1].strip().strip('"\'')
    sys.exit('GOOGLE_API_KEY not found in any .env above this folder')
def gemini(model):
    body = {'model': model,
            'input': [{'type': 'user_input', 'content': [{'type': 'text', 'text': l['text'],
                       'annotations': [{'type': 'speech_metadata', 'speaker': l['who'], 'style': l.get('style', '')}]} for l in LINES]}],
            'response_format': {'type': 'audio'},
            'generation_config': {'speech_config': {'mode': 'conversational', 'speakers': [{'speaker': w, 'voice': v} for w, v in
                                  ({**S['cast'], 'unused': 'Puck'} if len(S['cast']) == 1 else S['cast']).items()]}}}   # reel63 listicle: the API needs exactly 2 speakers; the 2nd one has no lines
    req = urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/interactions', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json', 'x-goog-api-key': env_key()})
    t = time.time()
    try: resp = json.loads(urllib.request.urlopen(req, timeout=300).read())
    except urllib.error.HTTPError as e:
        msg = e.read().decode()[:400]
        sys.exit(f'Gemini HTTP {e.code}: {msg}\n429 = free quota used up: try model gemini-3.8-flash-lite-tts / gemini-3.1-flash-tts-preview, or wait for the reset (midnight Pacific).')
    def find(o):
        if isinstance(o, dict):
            if isinstance(o.get('data'), str) and (str(o.get('mime_type', '')).startswith('audio') or o.get('type') == 'audio'): return o['data']
            for v in o.values():
                if (r := find(v)): return r
        if isinstance(o, list):
            for v in o:
                if (r := find(v)): return r
    a = find(resp)
    if not a: json.dump(resp, open('vo/takes/last-response.json', 'w'), indent=1); sys.exit('no audio in the response → vo/takes/last-response.json')
    raw = base64.b64decode(a); n = max([int(re.findall(r'\d+', os.path.basename(f))[0]) for f in glob.glob('vo/takes/take-*.wav')] or [0]) + 1
    fn = f'vo/takes/take-{n:02d}.wav'
    if raw[:4] == b'RIFF': open(fn, 'wb').write(raw)
    else:
        with wave.open(fn, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(GEM_SR); w.writeframes(raw)
    print(f'take {n:02d}: {model} · {time.time() - t:.1f}s · usage {json.dumps(resp.get("usage", {}).get("total_output_tokens"))} audio tokens')
    return fn
src = opt('--wav') or (f'vo/takes/take-{int(opt("--take")):02d}.wav' if opt('--take') else gemini(S.get('model', 'gemini-3.8-flash-tts')))
x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', src, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-']), np.int16).astype(np.float32) / 32768
sf.write('vo/vo.wav', x, SR); json.dump({'source': src}, open('vo/vo.source.json', 'w'))

# ---------------------------------------------------------------- 2. word times (whisper) aligned to the script, line by line
from faster_whisper import WhisperModel
x16 = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', 'vo/vo.wav', '-f', 's16le', '-ac', '1', '-ar', '16000', '-']), np.int16).astype(np.float32) / 32768
segs, _ = WhisperModel('small.en', device='cpu', compute_type='int8').transcribe(x16, word_timestamps=True, language='en')   # array in: some PyAV builds reject faster-whisper's file open
HW = []
for s_ in segs:
    for w in s_.words:                                            # whisper splits "5.5" into "5" + ".5": glue them back
        t = w.word.strip()
        if HW and re.match(r'^\.\d', t) and re.search(r'\d$', HW[-1][0]): HW[-1] = (HW[-1][0] + t, HW[-1][1], w.end)
        else: HW.append((t, w.start, w.end))
NUMW = {'2000': 'two thousand', '300': 'three hundred', '11': 'eleven', '9': 'nine', '800': 'eight hundred', '4000': 'four thousand', '54': 'fifty-four', '20': 'twenty', '350': 'three hundred fifty', '15': 'one and a half', '25': 'twenty-five', '1': 'one', '2': 'two', '3': 'three', '4': 'four'}   # whisper writes digits for spoken numbers: expand to the script's words, time split evenly
G = []
for t, a, b in HW:                                                # glue "2" + ",000"
    if G and re.match(r'^,\d{3}', t) and re.search(r'\d$', G[-1][0]): G[-1] = (G[-1][0] + t, G[-1][1], b)
    else: G.append((t, a, b))
HW = []
for t, a, b in G:
    k = re.sub(r'[^\d]', '', t); ws = NUMW.get(k, '').split() if k and re.fullmatch(r'[\d,.]+', t.rstrip('.,!?')) else []
    if ws: HW += [(w_, a + (b - a) * i_ / len(ws), a + (b - a) * (i_ + 1) / len(ws)) for i_, w_ in enumerate(ws)]
    else: HW.append((t, a, b))
HW = [('percent', a, b) if t.strip() == '%' else (t, a, b) for t, a, b in HW]   # reel63: whisper writes '54 %'
ALIAS = {'claude': 'clawd', 'cloud': 'clawd', 'codecs': 'codex', 'ok': 'okay', '47': 'fortyseven', 'klot': 'clawd'}   # what whisper writes for our words
def norm(w):
    w = re.sub(r"[^a-z0-9'.]", '', w.lower()).strip('.'); w = w.replace('.', 'point') if re.search(r'\d\.\d', w) else w.replace('.', '')
    return ALIAS.get(w, w)
spoken = lambda t: re.sub(r'\s+', ' ', re.sub(r'<[^>]*>', ' ', t)).strip()
VOCAB = {norm(w) for l in LINES for w in spoken(l['text']).split()}
CONTR = {'is': "'s", 'are': "'re", 'will': "'ll", 'not': "n't", 'have': "'ve", 'am': "'m"}   # whisper writes "Where is" for "Where's": glue it back
i = 0
while i + 1 < len(HW):
    a, b = HW[i], HW[i + 1]; c = re.sub(r'[^\w]', '', a[0]) + CONTR.get(norm(b[0]), '')
    if norm(b[0]) in CONTR and norm(c) in VOCAB: HW[i:i + 2] = [(c + re.sub(r"[\w']", '', b[0]), a[1], b[2])]
    i += 1
i = 0                                                             # whisper splits one script word in two ("to" "-do" = todo, "read" "me" = README): glue them back
while i + 1 < len(HW):
    a, b = HW[i], HW[i + 1]
    if norm(a[0]) + norm(b[0]) in VOCAB and norm(a[0]) + norm(b[0]) not in (norm(a[0]), norm(b[0])):
        HW[i:i + 2] = [(re.sub(r'[^\w]', '', a[0]) + re.sub(r'^[^\w]+', '', b[0]), a[1], b[2])]
    i += 1
json.dump(HW, open('vo/whisper-words.json', 'w'))                  # for debugging the alignment
TOK = [(w, li) for li, l in enumerate(LINES) for w in spoken(l['text']).split() if norm(w)]   # script words as written
SW = [(norm(w), li) for w, li in TOK]
hw = [norm(w) for w, _, _ in HW]
m = difflib.SequenceMatcher(a=[w for w, _ in SW], b=hw, autojunk=False)
hit = {}                                                          # script word index → whisper word index
for a0, b0, n in m.get_matching_blocks():
    for k in range(n): hit[a0 + k] = b0 + k
span = {li: [] for li in range(len(LINES))}
for si, (w, li) in enumerate(SW):
    if si in hit: span[li].append(hit[si])
owner = {j: li for li, js in span.items() for j in js}            # whisper word → line
for li in range(len(LINES)):                                      # unmatched whisper words next to a line that still misses words join that line
    js = span[li]
    if not js: continue
    miss_tail = [si for si, (w, l2) in enumerate(SW) if l2 == li and si not in hit and (not hit or si > max(k for k in hit if SW[k][1] == li))]
    miss_head = [si for si, (w, l2) in enumerate(SW) if l2 == li and si not in hit and si < min(k for k in hit if SW[k][1] == li)]
    j = max(js) + 1
    while miss_tail and j < len(HW) and j not in owner and len(span[li]) < sum(1 for w, l2 in SW if l2 == li) + 1:
        owner[j] = li; span[li].append(j); j += 1
    j = min(js) - 1
    while miss_head and j >= 0 and j not in owner and len(span[li]) < sum(1 for w, l2 in SW if l2 == li) + 1:
        owner[j] = li; span[li].append(j); j -= 1
EXTRA = [HW[j] for j in range(len(HW)) if j not in owner]          # speech that belongs to no line (e.g. the model read a style aloud)
FILLER = {'uh', 'um', 'oh', 'ooh', 'hmm', 'ah'}
VO_LINES, VO_WORDS = [], []
for li, l in enumerate(LINES):
    idx = span[li]; heard = sum(1 for si, (w, j) in enumerate(SW) if j == li and si in hit)
    n_words = sum(1 for si, (w, j) in enumerate(SW) if j == li and (si in hit or w not in FILLER))   # whisper drops fillers: don't count them
    if idx: s, e = HW[min(idx)][1], HW[max(idx)][2]
    else: s = e = None
    VO_LINES.append({'id': l['id'], 'who': l['who'], 'role': l.get('role', ''), 'text': spoken(l['text']).replace('  ', ' ').strip(),
                     'style': l.get('style', ''), 's': s, 'e': e, 'heard': heard, 'words': n_words})
fr = x16[:len(x16) // 160 * 160].reshape(-1, 160); DB = 20 * np.log10(np.sqrt((fr ** 2).mean(1)) + 1e-9)   # 10 ms loudness
VOICED = np.percentile(DB, 95) - 25
for i, L in enumerate(VO_LINES):                                  # a line whisper missed entirely: place it in the gap between its neighbours
    if L['s'] is None:
        a = next((VO_LINES[j]['e'] for j in range(i - 1, -1, -1) if VO_LINES[j]['e'] is not None), 0.0)
        b = next((VO_LINES[j]['s'] for j in range(i + 1, len(VO_LINES)) if VO_LINES[j]['s'] is not None), len(x) / SR)
        L['guessed'] = True; fa, fb = int((a + 0.05) * 100), int((b - 0.05) * 100)          # look for voice inside the gap (10 ms frames)
        v = np.where(DB[fa:fb] > VOICED)[0] if fb > fa else np.array([])
        if len(v): L['s'], L['e'], L['energy'] = round((fa + v[0]) / 100, 3), round((fa + v[-1] + 1) / 100, 3), True
        else: L['s'], L['e'] = round(a + 0.05, 3), round(max(a + 0.1, b - 0.05), 3)
for i, L in enumerate(VO_LINES):                                  # head words whisper dropped ("Uh.", "Done."): open the line at the voice before its first heard word
    first = next(si for si, (w, j) in enumerate(SW) if j == i)
    if L.get('guessed') or first in hit or not i: continue
    fa, fb = int((VO_LINES[i - 1]['e'] + 0.08) * 100), int((L['s'] - 0.05) * 100)
    v = np.where(DB[fa:fb] > VOICED)[0] if fb > fa else np.array([])
    if len(v): L['s'] = round((fa + v[0]) / 100, 3)
for i, L in enumerate(VO_LINES):                                  # tags (<gasp>, <sigh>) sit before the first word: open the line a little earlier
    prev_e = VO_LINES[i - 1]['e'] if i else -1.0
    lead = 0.35 if LINES[i]['text'].lstrip().startswith('<') else 0.04
    L['s'] = round(max(0.0, prev_e + 0.02, L['s'] - lead), 3)
    L['e'] = round(L['e'], 3)
for li, L in enumerate(VO_LINES):                                 # words = the SCRIPT's words (so W('l01','Clawd') works) with whisper times;
    ws = [(si, w) for si, (w, j) in enumerate(TOK) if j == li]    # words whisper missed get times spread between their known neighbours
    tm = {si: (HW[hit[si]][1], HW[hit[si]][2]) for si, _ in ws if si in hit}
    for k, (si, w) in enumerate(ws):
        if si in tm: a, b, est = *tm[si], False
        else:
            pa = next((tm[ws[q][0]][1] for q in range(k - 1, -1, -1) if ws[q][0] in tm), L['s'])
            nb = next((tm[ws[q][0]][0] for q in range(k + 1, len(ws)) if ws[q][0] in tm), L['e'])
            r0 = k
            while r0 > 0 and ws[r0 - 1][0] not in tm: r0 -= 1
            r1 = k
            while r1 + 1 < len(ws) and ws[r1 + 1][0] not in tm: r1 += 1
            step = (nb - pa) / (r1 - r0 + 1); a = pa + (k - r0) * step; b = a + step; est = True
        VO_WORDS.append({'w': w, 's': round(a, 3), 'e': round(b, 3), 'line': L['id'], 'who': L['who'], **({'est': True} if est else {}),
                         **({'heard': HW[hit[si]][0]} if si in hit and HW[hit[si]][0] != w else {})})
    if ws: L['s'] = round(min(L['s'], VO_WORDS[-len(ws)]['s']), 3)
FIX = json.load(open('vo/word-fix.json')) if os.path.exists('vo/word-fix.json') else {}   # measured by ear/energy where whisper's stamp is wrong: {line: {s?, e?, words: {word: [s, e]}}}
for L in VO_LINES:
    f = FIX.get(L['id'], {})
    for k in ('s', 'e'):
        if k in f: L[k] = f[k]
    for W_ in VO_WORDS:
        if W_['line'] == L['id'] and W_['w'] in f.get('words', {}): W_['s'], W_['e'] = f['words'][W_['w']]; W_['fixed'] = True
VO_END = round(min(len(x) / SR, VO_LINES[-1]['e'] + 0.8), 3)

# ---------------------------------------------------------------- 3. one stem per voice (mouth drivers) + vo.js + envelopes
for who in sorted({l['who'] for l in VO_LINES}):
    st = np.zeros_like(x)
    for i, L in enumerate(VO_LINES):
        if L['who'] != who: continue
        end = min(L['e'] + 0.12, VO_LINES[i + 1]['s'] - 0.01) if i + 1 < len(VO_LINES) else L['e'] + 0.12   # never bleed into the next line
        a, b = int((L['s'] - 0.03) * SR), int(min(len(x), end * SR)); a = max(0, a); f = int(0.01 * SR)
        if b - a <= 2 * f: continue
        g = np.ones(b - a, np.float32); g[:f] = np.linspace(0, 1, f); g[-f:] = np.linspace(1, 0, f); st[a:b] = x[a:b] * g
    sf.write(f'vo/vo_{who}.wav', st, SR)
open('src/vo.js', 'w').write('// vo.js: generated by vo/make_vo.py (one Gemini dialogue take: ' + src + '; times from whisper word stamps)\n'
    f'const VO_LINES = {json.dumps(VO_LINES)};\nconst VO_WORDS = {json.dumps(VO_WORDS)};\nconst VO_END = {VO_END};\n')
subprocess.run([sys.executable, 'vo/env.py'], check=True)

# ---------------------------------------------------------------- 4. voice QA: words heard per line + one voice per character
rows, bad = [], 0
for L in VO_LINES:
    ok = L['heard'] >= max(1, round(0.8 * L['words'])) and not L.get('guessed')
    mark = '✅' if ok else ('⚠️ whisper missed it, voice present: check by ear' if L.get('energy') else '❌')
    bad += mark == '❌'
    rows.append(f"| {L['id']} | {L['who']} | {L['s']:.2f}–{L['e']:.2f} | {L['heard']}/{L['words']} | {mark} | {L['text']} |")
cons = []
try:
    import torch; from speechbrain.inference.speaker import EncoderClassifier
    enc = EncoderClassifier.from_hparams(source='speechbrain/spkrec-ecapa-voxceleb', savedir=os.path.expanduser('~/.cache/sb-ecapa'))
    def emb(a, b): e = enc.encode_batch(torch.tensor(x16[int(a * 16000):int(b * 16000)])[None]).squeeze().cpu().numpy(); return e / np.linalg.norm(e)
    for who in sorted({l['who'] for l in VO_LINES}):
        Ls = [L for L in VO_LINES if L['who'] == who and L['e'] - L['s'] >= 1.0 and not L.get('guessed')]   # ECAPA is unreliable under ~1 s
        if len(Ls) < 3: cons.append(f'| {who} | – | – | n/a (fewer than 3 lines ≥ 1 s) | |'); continue
        E = {L['id']: emb(L['s'], L['e']) for L in Ls}
        for L in Ls:
            others = [E[k] for k in E if k != L['id']]
            if not others: continue
            c = np.mean(others, 0); c /= np.linalg.norm(c); cos = float(E[L['id']] @ c)
            cons.append(f"| {who} | {L['id']} | {cos:.2f} | {'✅' if cos >= 0.45 else '⚠️ drift'} | {L['style']} |")
except Exception as ex: cons.append(f'| – | – | – | skipped: {ex} | |')
ex = '\n'.join(f'- {t:.2f}s: "{w}"' for w, t, _ in EXTRA) or '- none'
open('vo/voice-qa.md', 'w').write(f"# voice QA · {src}\n\nwhisper words heard vs script (≥ 80 % per line). {len(VO_LINES) - bad}/{len(VO_LINES)} lines without ❌. Clean = no ❌ and no extra speech (or Kai accepted the take by ear).\n\n"
    f"Extra speech (heard but in no line: a style read aloud, an ad-lib). Anything here = re-take, or cut it out:\n{ex}\n\n"
    "| line | who | time | heard | ok | text |\n|---|---|---|---|---|---|\n" + '\n'.join(rows) +
    "\n\nOne voice per character (advisory, never a gate): ECAPA cosine of each line (≥ 1 s) vs that character's other lines. Whispered / shouted / big-acting lines score low by nature; trust Kai's ear.\n\n"
    "| who | line | cos | ok | style |\n|---|---|---|---|---|\n" + '\n'.join(cons) + '\n')
print(f'vo.wav {len(x) / SR:.1f}s · {len(VO_LINES)} lines · {len(VO_WORDS)} words · {len(VO_LINES) - bad}/{len(VO_LINES)} lines without ❌ · {len(EXTRA)} extra words → vo/voice-qa.md')
