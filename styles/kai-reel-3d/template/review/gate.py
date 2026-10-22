# review/gate.py: pre-render gate. Turns the verifier's round-1 findings on reel60/61 into checks, so the first 1080p render
# is already clean. Run after `node review/audit.mjs` and the mix (audio/sfx.wav + audio/vo_m.wav):
#   uv run -q --python 3.12 --with numpy --with scipy python review/gate.py      → review/gate.txt, exit 1 on any FAIL
# FAIL = fix before rendering 1080p. WARN = look at the frames/strings it names, then decide (write the call in REVIEW.md).
import json, re, sys, wave, os
import numpy as np
from scipy.signal import butter, sosfilt

FPS, HOLD_MIN, BUTTON_HOLD = 30, 12, 30          # frames: any shot ≥ 12 (0.4 s); the button line's shot ≥ 30 (1 s)
SAFE_Y = 0.80                                     # head/face centre must sit above y 1536/1920 (IG caption + buttons)
A = json.load(open('review/audit-page.json')); R, L = A['rows'], A['lines']
out, fails = [], 0
def res(name, ok, msg, warn=False):
    global fails
    tag = 'PASS' if ok else ('WARN' if warn else 'FAIL'); fails += tag == 'FAIL'; out.append(f'{tag:4}  {name:18} {msg}')

# 1. shot length (verifier r1: 3–6 frame flashes, a 5-frame punchline)
runs, cur = [], [R[0]['shot'], 0, 0]
for r in R[1:]:
    if r['shot'] == cur[0]: cur[2] = r['f']
    else: runs.append(cur); cur = [r['shot'], r['f'], r['f']]
runs.append(cur)
short = [(s, round(a / FPS, 2), b - a + 1) for s, a, b in runs[:-1] if b - a + 1 < HOLD_MIN]
res('shot length', not short, f'{len(runs)} shots, min {min(b - a + 1 for _, a, b in runs[:-1])} f' + (f' · short: {short}' if short else ''))
last = L[-1]; bs = [b - a + 1 for s, a, b in runs if a / FPS <= last['s'] + 0.05 <= (b + 1) / FPS]
res('button hold', bs and bs[0] >= BUTTON_HOLD, f'button line {last["id"]} shot = {bs[0] if bs else "?"} f (≥ {BUTTON_HOLD})')

# 2. caption over a head (r1: CM/CO shots only protected one head). With __dbg.capY the caption band is known per shot:
#    a caption above the heads must end above the highest head top; one placed low (≥ 0.6) sits on bodies/screen, not heads.
CH = 0.045                                                       # half height of a 2-line caption pill (frame fraction)
def cap_bad(r):
    if not r['capOn']: return False
    y = r.get('capY')
    if y is None: return r['topY'] < A['CAP_CLEAR'] - 0.005
    return y < 0.6 and y + CH > r['topY']
over = [r['f'] for r in R if cap_bad(r)]
res('caption vs head', not over, f'{len(over)} frames where the caption band reaches a head top' + (f' · first at {over[0] / FPS:.2f} s' if over else '') + ('' if 'capY' in R[0] and R[0]['capY'] is not None else ' (no __dbg.capY: CAP_CLEAR rule)'))

# 3. IG safe zone (r1: Clawd's right eye at x 907–973, Kai's face past 900). Uses the projected RIGHT EDGE of Kai's head (kre)
#    and of Clawd's outer eye (cre) when audit.mjs records them, else the centre with a margin. Screen inserts (SCR*) are skipped:
#    the characters sit behind the screen there.
EDGE = 900 / 1080
def zone(edge, ctr, own):
    bad, side = [], []
    for r in R:
        if r['shot'].startswith('SCR'): continue
        x, y = ctr(r)
        if not (0 < x < 1 and 0 < y < 1): continue
        e = r.get(edge)
        if (e if e is not None else x + 0.07) > EDGE or y > SAFE_Y: (bad if re.match(own, r['shot']) else side).append((r['f'], r['shot']))
    return bad, side
for who, edge, ctr, own in (('Kai face', 'kre', lambda r: (r['khx'], r['khy']), r'^(K|W)'), ('Clawd eyes', 'cre', lambda r: ((r['cx'] + 1) / 2, (1 - r['cyy']) / 2), r'^(C|W)')):
    bad, side = zone(edge, ctr, own)
    for lst, warn, tag in ((bad, False, 'in own/wide shots'), (side, True, "at the edge of the other one's shot (cut or crop it)")):
        shots = sorted({s_ for _, s_ in lst})
        res(f'safe zone {who}', not lst, f'{len(lst)} frames past x 900 px / y {SAFE_Y} {tag}' + (f' · shots {shots}, first {lst[0][0] / FPS:.2f} s' if lst else ''), warn=warn)

# 4. Kai's mouth open in silence (r1: frozen "O" through the end card)
kai = [(l['s'] - 0.1, l['e'] + 0.15) for l in L if l['who'] == 'kai']
op = [r['f'] for r in R if r['ko'] > 0.05 and not any(a <= r['f'] / FPS <= b for a, b in kai)]
res('Kai mouth silent', not op, f'{len(op)} frames open outside his lines' + (f' · {op[0] / FPS:.2f}–{op[-1] / FPS:.2f} s' if op else ''))

# 5. hook frame 0 (r1: a closed mouth reads as a calm smile; the panic face must be there from frame 0)
hk = L[0]['who'] == 'kai' and R[0]['shot'].startswith('K')
res('hook face', not hk or R[0]['km'] != 'closed', f'frame 0 = {R[0]["shot"]}, Kai mouth {R[0]["km"]} (closed reads as a calm smile: open the "O" from frame 0; cover = a frame with the O + hook text)', warn=True)

# 6. SFX over spoken words, 2–8 kHz per 10 ms (r1: alarm on "Clawd", stamp on "March", chime on "fix")
if os.path.exists('audio/sfx.wav') and os.path.exists('audio/vo_m.wav'):
    def rd(p):
        with wave.open(p) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768; return (x.reshape(-1, w.getnchannels()).mean(1) if w.getnchannels() > 1 else x), w.getframerate()
    vo, sr = rd('audio/vo_m.wav'); sfx, _ = rd('audio/sfx.wav'); n = min(len(vo), len(sfx)); w = int(0.01 * sr); k = n // w
    sos = butter(4, [2000 / (sr / 2), 8000 / (sr / 2)], 'band', output='sos')
    rms = lambda x: np.sqrt((sosfilt(sos, x[:k * w]).reshape(k, w) ** 2).mean(1)) + 1e-12
    ve, se = rms(vo), rms(sfx); AUD = np.percentile(ve[ve > 1e-6], 50) * 10 ** (-30 / 20);   # audible = within 30 dB of the median
    W = json.loads(re.search(r'VO_WORDS = (\[.*?\]);', open('src/vo.js').read(), re.S).group(1)); worst = []
    for x in W:
        a, b = int(x['s'] / 0.01), int(x['e'] / 0.01); m = (se[a:b] > 1e-5) & (ve[a:b] > AUD)   # only where the voice is audible
        if m.any(): worst.append((round(float((20 * np.log10(se[a:b][m] / ve[a:b][m])).max()), 1), x['w'], x['s']))
    bad = sorted([q for q in worst if q[0] > -6], reverse=True)
    res('SFX vs words', not bad, f'{len(worst)} words with SFX under them, {len(bad)} within 6 dB' + (f' · worst {bad[:4]}' if bad else ''))
else: res('SFX vs words', False, 'no audio/sfx.wav + audio/vo_m.wav yet: run the sound step first', warn=True)

# 7. numbers on screen must come from the script (r1: a 0→2,000 counter; brief allows only script numbers)
WORDNUM = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'eleven': 11, 'twelve': 12, 'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50, 'hundred': 100, 'thousand': 1000}
txt = ' '.join(l['text'].lower() for l in L); ok = {int(n) for n in re.findall(r'\d+', txt.replace(',', ''))}
ws = re.findall(r'[a-z]+', txt)
for i, x in enumerate(ws):                                       # "three hundred" → 300, "two thousand" → 2000
    if x in WORDNUM and x not in ('hundred', 'thousand'):
        v = WORDNUM[x]; nx = ws[i + 1] if i + 1 < len(ws) else ''
        ok |= {v, v * 100 if nx == 'hundred' else v, v * 1000 if nx == 'thousand' else v}
code = open('src/reel.js').read() + open('src/set.js').read()
lit = [m[1] for m in re.finditer(r"(?:fillText|lbl)\(\s*(['\"`])((?:(?!\1).)*)\1", code)]   # literal text drawn on screen
odd = sorted({x for x in lit if '${' not in x and any(int(n) not in ok for n in re.findall(r'\d+', x.replace(',', '')) if len(n) < 7)})
cnt = sorted({m.group(0)[:60] for m in re.finditer(r'fillText\([^;]*?(toLocaleString|Math\.(round|floor)\([^;]*\bt\b)', code)})
res('screen numbers', not odd, f'{len(lit)} literal screen strings, {len(odd)} with numbers not in the script' + (f': {odd[:8]}' if odd else '') + ' (allowed: ' + ','.join(map(str, sorted(ok))) + ')', warn=True)
res('screen counters', not cnt, f'{len(cnt)} fillText calls that animate a number (counters are banned)' + (f': {cnt[:3]}' if cnt else ''), warn=True)

open('review/gate.txt', 'w').write('\n'.join(out) + '\n'); print('\n'.join(out)); print('FAIL' if fails else 'GATE PASS', f'({fails} fail)')
sys.exit(1 if fails else 0)
