"""The 95 % score: one stick-man reel against one reference short, ten aspects 0-100, the lowest is the score.
  python styles/stick-man/tools/score95.py --ref <ref dir> --ours <mp4> --words <words.json> --out <dir> [--tag r1]
     [--film films/<slug>] [--judges 3] [--blind 3] [--no-judge 1]
<ref dir> holds ref.mp4 and words.json ({word, t0, t1}); it must stay out of git (styles/ref-private/ is self-ignored).
Measured aspects use the reference's own measuring scripts (tools/forensic/, the same code path on both videos):
metric score = 100 * (1 - |ours - ref| / |ref|), 0 at worst (dB values compared as amplitude, hue on the circle); an
aspect's measured score = mean of its metrics. Judged aspects: N independent headless Sonnet reviews (claude -p, no tools,
empty cwd) see the reference and ours side by side at the same timestamps and never see a score; the median counts.
Aspect score = measured, judged, or min(measured, judged) where both exist (MEASURED / JUDGED below). PASS = every aspect
>= 95 and the blind test passed (at most 1 of N blind judges picks the original for a reason of quality).
Writes <out>/score-<tag>.json, score-<tag>.txt and the sheets the judges saw (score-<tag>-*.jpg)."""
import argparse, json, os, re, shutil, statistics, subprocess, sys, tempfile, random
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
for k in ('ref', 'ours', 'words', 'out'): ap.add_argument('--' + k, required=True)
ap.add_argument('--tag', default='r1'); ap.add_argument('--film'); ap.add_argument('--judges', type=int, default=3)
ap.add_argument('--blind', type=int, default=3); ap.add_argument('--no-judge', default='0'); ap.add_argument('--seed', type=int, default=7)
A = ap.parse_args()
os.makedirs(A.out, exist_ok=True)
REF_MP4, REF_WORDS = os.path.join(A.ref, 'ref.mp4'), os.path.join(A.ref, 'words.json')

ASPECTS = ['hook', 'pacing / cuts', 'body motion', 'faces', 'camera', 'set / props / fx', '2D look (ink + colour)',
           'sound / music', 'captions', 'story shown']
# measured metrics per aspect: (name, where in the measure dict, kind)  kind: lin | db | hue
MEASURED = {
    'pacing / cuts': [('boundaries / 10 s', 'shots.boundaries_per10s', 'lin'), ('dissolve share', 'shots.dissolve_share', 'lin'),
                      ('shot length median s', 'shots.shot_len_med_s', 'lin'), ('shot length CV', 'shots.shot_len_cv', 'lin'),
                      ('words / s', 'words.wps', 'lin'), ('pause p90 ms', 'audio.pause_p90_ms', 'lin'), ('voice on share', 'audio.speech_frac', 'lin')],
    'camera': [('move peak p90 px/f', 'moves.move_peak_p90', 'lin'), ('moves / 10 s', 'moves.moves_per10s', 'lin'),
               ('time in moves %', 'moves.time_in_moves_pct', 'lin'), ('drift median px/f', 'moves.drift_med_pxf', 'lin'),
               ('first move frame', 'shots.first_change_f', 'lin')],
    'body motion': [('heads moving %', 'acting.moving_pct', 'lin'), ('head speed p90 W/s', 'acting.head_speed_p90_Wps', 'lin'),
                    ('hold length median f', 'acting.hold_len_med', 'lin')],
    'faces': [('mouth area CV', 'acting.mouth_area_cv_med', 'lin'), ('expression changes / face / 10 s', 'acting.expr_per_face_10s', 'lin'),
              ('blinks / face / min', 'acting.blinks_per_face_min', 'lin')],
    '2D look (ink + colour)': [('outline thick/thin', 'lines.rim_side_ratio_med', 'lin'), ('outline % head W', 'lines.rim_pct_W_med', 'lin'),
                               ('YAVG median', 'render.yavg_med', 'lin'), ('YAVG shot std', 'shots.yavg_shot_std', 'lin'),
                               ('SATAVG median', 'render.sat_med', 'lin'), ('HSV S median', 'render.hsv_s_med', 'lin'),
                               ('luma std median', 'render.ystd_med', 'lin'), ('shadow hue', 'render.shadow_hue_med', 'hue'),
                               ('shadow sat', 'render.shadow_sat_med', 'lin')],
    'sound / music': [('loudness LUFS', 'audio.I_LUFS', 'db'), ('true peak dBFS', 'audio.TP_dBFS', 'db'), ('LRA', 'audio.LRA', 'lin'),
                      ('bed vs voice dB', 'audio.bed_minus_voice_dB', 'db'), ('transients / 10 s', 'audio.transients_per10s', 'lin'),
                      ('non-speech transients / 10 s', 'audio.nonspeech_transients_per10s', 'lin'), ('hits / 10 s', 'audio.hits_per10s', 'lin'),
                      ('air in pauses dB', 'audio.hi_band_share_in_pause_dB', 'db'), ('bass voice-pause dB', 'audio.low_band_speech_minus_pause_dB', 'db')],
    'captions': [('caption on screen %', 'caps.present_pct', 'lin'), ('caption centre y', 'caps.y_centre', 'lin'),
                 ('caption height px', 'caps.height_px', 'lin'), ('caption changes / 10 s', 'caps.changes_per10s', 'lin'),
                 ('caption stroke px', 'caps.stroke_px', 'lin')],
}
JUDGED = ['hook', 'body motion', 'faces', 'camera', 'set / props / fx', '2D look (ink + colour)', 'captions', 'story shown']


def ff(*a, capture=False):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *a], capture_output=True, check=True)
    return r.stdout if capture else None


def dur_of(mp4):
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)


def load_words(p):
    W = json.load(open(p)); W = W['words'] if isinstance(W, dict) else W
    return [{'word': w['word'], 't0': w['t0'], 't1': w['t1'], 'line': w.get('line')} for w in W]


# ---------------------------------------------------------------- captions (same code both sides)
def captions(mp4):
    w, h, fps = 540, 960, 10
    raw = ff('-i', mp4, '-vf', f'fps={fps},scale={w}:{h}:flags=area,format=rgb24', '-f', 'rawvideo', '-', capture=True)
    F = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    y0, y1 = int(0.50 * h), int(0.90 * h); band = F[:, y0:y1].astype(np.int16)
    white = (band > 225).all(-1); black = (band < 45).all(-1)
    near = np.zeros_like(black)
    for d in (1, 2, 3):
        near[:, :, d:] |= black[:, :, :-d]; near[:, :, :-d] |= black[:, :, d:]
    cap = white & near
    on = cap.sum((1, 2)) >= 60
    ys, hts, strokes, ch, prev = [], [], [], 0, None
    for i in range(len(cap)):
        m = cap[i]
        if not on[i]:
            if prev is not None: prev = None
            continue
        rows = np.where(m.sum(1) >= 3)[0]
        ys.append((y0 + rows.mean()) / h)
        best = cur = 0; last = -9
        for r in rows:
            cur = cur + 1 if r == last + 1 else 1; best = max(best, cur); last = r
        hts.append(best * 1920 / h)
        r = int(np.median(rows)); row = black[i, r]; runs = np.diff(np.flatnonzero(np.diff(np.r_[0, row.astype(np.int8), 0])))[::2]
        strokes += [x * 2 for x in runs if 1 <= x <= 10]
        mm = m.reshape(m.shape[0] // 4, 4, m.shape[1] // 4, 4).any((1, 3))
        if prev is None: ch += 1
        else:
            inter = (mm & prev).sum(); uni = (mm | prev).sum()
            if uni and inter / uni < 0.5: ch += 1
        prev = mm
    n = len(cap); dur = n / fps
    med = lambda xs: float(np.median(xs)) if len(xs) else None
    return dict(present_pct=round(100 * on.mean(), 1), y_centre=round(med(ys), 3) if ys else None, height_px=round(med(hts), 1) if hts else None,
                changes_per10s=round(ch / dur * 10, 2), stroke_px=med(strokes))


# ---------------------------------------------------------------- the forensic numbers (tools/forensic, kept data)
def measure(mp4, words, cache):
    if cache and os.path.exists(cache): return json.load(open(cache))
    out = tempfile.mkdtemp(prefix='score95-')
    r = subprocess.run([sys.executable, os.path.join(HERE, 'forensic', 'measure.py'), mp4, '--words', words, '--out', os.path.join(out, 'm.json'), '--keep', '1'],
                       capture_output=True, text=True, check=True)
    D = re.search(r'kept (\S+)', r.stderr).group(1)
    M = json.load(open(os.path.join(out, 'm.json')))['metrics']
    S = json.load(open(f'{D}/reel.shots.json')); mv = json.load(open(f'{D}/moves.json'))['stats']['reel']
    R = json.load(open(f'{D}/render.json'))['res']['reel']['stats']; AC = json.load(open(f'{D}/acting.json'))['stats']['reel']
    LN = json.load(open(f'{D}/lines.json')).get('reel', {}); AU = json.load(open(f'{D}/audio.json'))['reel']
    W = load_words(words); dur = M['dur_s']
    res = dict(
        shots=dict(boundaries_per10s=round(M['boundaries'] / dur * 10, 2), dissolve_share=M['dissolve_share'], shot_len_med_s=M['shot_len_med_s'],
                   shot_len_cv=M['shot_len_cv'], first_change_f=M['first_change_f'], yavg_shot_std=M['yavg_shot_std'], kinds=M['kinds']),
        moves=mv, render=R, acting=AC, lines={k: v for k, v in LN.items() if not isinstance(v, list)}, audio=AU,
        words=dict(n=len(W), wps=round(len(W) / dur, 2)), caps=captions(mp4), dur_s=dur)
    shutil.rmtree(D, ignore_errors=True); shutil.rmtree(out, ignore_errors=True)
    if cache: json.dump(res, open(cache, 'w'), indent=1, default=float)
    return res


def get(d, path):
    for k in path.split('.'): d = d.get(k) if isinstance(d, dict) else None
    return d


def close(o, r, kind):
    if o is None or r is None: return 0.0
    if kind == 'db': o, r = 10 ** (o / 20), 10 ** (r / 20)
    if kind == 'hue': return round(100 * max(0.0, 1 - abs((o - r + 180) % 360 - 180) / 180), 1)
    return round(100 * max(0.0, 1 - abs(o - r) / max(abs(r), 1e-9)), 1)


# ---------------------------------------------------------------- sheets (same timestamps, ref left, ours right)
def font(s):
    for f in ('/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'):
        if os.path.exists(f): return ImageFont.truetype(f, s)
    return ImageFont.load_default(size=s)


def grab(mp4, t, w, h, tmp, tag):
    p = os.path.join(tmp, f'{tag}_{t:07.3f}.png')
    if not os.path.exists(p): ff('-ss', f'{t:.3f}', '-i', mp4, '-frames:v', '1', '-vf', f'scale={w}:{h}:flags=lanczos', p)
    return Image.open(p).convert('RGB')


def line_at(words, t, script=None):
    if script and words and words[0].get('line'):
        cur = None
        for w in words:
            if w['t0'] <= t + 0.05: cur = w['line']
        return script.get(cur, '') if cur else ''
    return ' '.join(w['word'] for w in words if t - 1.6 <= w['t0'] <= t + 1.6)


def wrap(d, text, f, width):
    out, cur = [], ''
    for wd in text.split():
        if d.textlength(cur + ' ' + wd, font=f) > width and cur: out.append(cur); cur = wd
        else: cur = (cur + ' ' + wd).strip()
    return out + ([cur] if cur else [])


def pair_sheet(ts, path, tmp, rw, ow, script):
    tw, th, cols, txt = 176, 313, 4, 46
    rows = (len(ts) + cols - 1) // cols; pw = 2 * tw + 6
    S = Image.new('RGB', (cols * (pw + 14), rows * (18 + th + txt)), 'white'); d = ImageDraw.Draw(S); f, fs = font(13), font(11)
    for i, t in enumerate(ts):
        x, y = (i % cols) * (pw + 14), (i // cols) * (18 + th + txt)
        d.text((x + 2, y + 2), f't = {t:.1f} s   REFERENCE | OURS', fill='black', font=f)
        S.paste(grab(REF_MP4, t, tw, th, tmp, 'r'), (x, y + 18)); S.paste(grab(A.ours, min(t, OURS_DUR - 0.1), tw, th, tmp, 'o'), (x + tw + 6, y + 18))
        ly = y + 18 + th + 1
        for lab, txt_ in (('REF', line_at(rw, t)), ('OURS', line_at(ow, t, script))):
            for k, ln in enumerate(wrap(d, f'{lab}: {txt_}', fs, pw)[:2]):
                d.text((x, ly), ln, fill='#333', font=fs); ly += 11
    S.save(path, quality=88)


def strip_sheet(rows_spec, path, tmp, tw=150, th=267):
    """rows_spec: [(label, [(mp4, t), ...])] -> one row per entry"""
    n = max(len(r[1]) for r in rows_spec)
    S = Image.new('RGB', (n * (tw + 4) + 4, len(rows_spec) * (th + 20)), 'white'); d = ImageDraw.Draw(S); f = font(13)
    for j, (lab, frames) in enumerate(rows_spec):
        y = j * (th + 20); d.text((4, y + 2), lab, fill='black', font=f)
        for i, (mp4, t) in enumerate(frames): S.paste(grab(mp4, t, tw, th, tmp, 'r' if mp4 == REF_MP4 else 'o'), (4 + i * (tw + 4), y + 18))
    S.save(path, quality=88)


# ---------------------------------------------------------------- headless Sonnet reviews (as tools/judge.mjs)
def claude(content, system):
    import base64
    blocks = []
    for c in content:
        if isinstance(c, str): blocks.append({'type': 'text', 'text': c})
        else: blocks.append({'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/jpeg', 'data': base64.b64encode(open(c[1], 'rb').read()).decode()}})
    cwd = tempfile.mkdtemp(prefix='score95-r-')
    try:
        p = subprocess.run([os.environ.get('CLAUDE_BIN', 'claude'), '-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose',
                            '--model', 'sonnet', '--effort', 'medium', '--tools', '', '--strict-mcp-config', '--setting-sources', '',
                            '--disable-slash-commands', '--system-prompt', system], cwd=cwd, capture_output=True, text=True,
                           input=json.dumps({'type': 'user', 'message': {'role': 'user', 'content': blocks}}) + '\n', timeout=900)
    finally: shutil.rmtree(cwd, ignore_errors=True)
    r = next((o for o in (json.loads(l) for l in p.stdout.splitlines() if l.startswith('{')) if o.get('type') == 'result'), None)
    if not r or r.get('is_error'): raise RuntimeError(f'claude failed: {p.stderr[:300]} {r and r.get("result")}')
    t = r['result']; u = r['usage']
    out = json.loads(t[t.index('{'): t.rindex('}') + 1])
    out['_tokens'] = u['input_tokens'] + u.get('cache_creation_input_tokens', 0) + u.get('cache_read_input_tokens', 0) + u['output_tokens']
    out['_cost'] = r.get('total_cost_usd', 0)
    return out


JUDGE = """You compare two vertical animated shorts in the same style. REFERENCE = the original studio's short (the target). OURS = an imitation that tells a story on the same topic with the same beat structure, in its own words, with its own characters and shots.
Each pair shows both at the SAME time stamp (reference left, ours right), with the line being spoken printed under it. The stories differ on purpose: never score how similar the content is; score how close OURS comes to the REFERENCE's craft quality in each aspect.
Scale 0-100: 100 = as good as the reference in this aspect (a viewer could not tell which studio made which); 90 = nearly, one small visible weakness; 75 = clearly weaker in one visible way; 50 = clearly a cheaper imitation; 25 = a different league. Do not be generous; when unsure, score lower.
Aspects:
- hook: the first 3 seconds (HOOK sheet): is the first frame already mid-action, does it pull you in as hard as the reference?
- body motion: characters act with the whole body and travel through space (MOTION sheet: consecutive frames 0.13 s apart) as much and as well as the reference; contact with props; nothing passes through objects.
- faces: expressions as strong, varied, well drawn and readable as the reference.
- camera: framing, angles (aerial, wide, low, top-down, close-up, insert) and their variety and composition.
- set / props / fx: richness and detail of the world, props, effects; the world itself shows what the line says.
- 2D look (ink + colour): the drawn-cartoon character look (bold ink outline, flat fills), colour palette, light and materials.
- captions: font, weight, size, stroke, placement, words per caption.
- story shown: with the sound off, each frame shows what its line says, as clearly as the reference does."""
JFMT = 'Reply with JSON only: {"scores": {' + ', '.join(f'"{a}": n' for a in JUDGED) + '}, "gap": {' + ', '.join(f'"{a}": "the biggest visible difference, one line"' for a in JUDGED) + '}}'
BLIND = """Two vertical animated clips, A and B, each shown as 12 frames in time order (left to right, top to bottom). One clip is from the ORIGINAL studio's series; the other is an imitation made by someone else in the same style, on a similar topic. Which clip is the ORIGINAL? Then say what decided it: "quality" (craft: drawing, models, materials, light, animation, camera, captions) or "content" (story, topic, wording, characters' identity)."""
BFMT = 'Reply with JSON only: {"original": "A" | "B", "decided_by": "quality" | "content", "why": "one line"}'


def main():
    global OURS_DUR
    OURS_DUR = dur_of(A.ours); ref_dur = dur_of(REF_MP4)
    cache_ref = os.path.join(A.ref, 'score-ref.json')
    with ThreadPoolExecutor(2) as ex:
        fr = ex.submit(measure, REF_MP4, REF_WORDS, cache_ref); fo = ex.submit(measure, A.ours, A.words, None)
        MR, MO = fr.result(), fo.result()
    metrics = {}
    for asp, ms in MEASURED.items():
        rows = []
        for name, key, kind in ms:
            r, o = get(MR, key), get(MO, key)
            rows.append(dict(metric=name, ref=r, ours=o, score=close(o, r, kind)))
        metrics[asp] = dict(rows=rows, score=round(float(np.mean([x['score'] for x in rows])), 1))
    judged, blind, sheets = {}, None, []
    if A.no_judge != '1':
        tmp = tempfile.mkdtemp(prefix='score95-s-')
        script = None
        if A.film and os.path.exists(os.path.join(A.film, 'vo', 'script.json')):
            script = {l['id']: re.sub(r'<[^>]+>', '', l['text']) for l in json.load(open(os.path.join(A.film, 'vo', 'script.json')))['lines']}
        rw, ow = load_words(REF_WORDS), load_words(A.words)
        D = min(ref_dur, OURS_DUR)
        ts = [round((i + 0.5) * D / 24, 2) for i in range(24)]
        P = lambda k: os.path.join(A.out, f'score-{A.tag}-{k}.jpg')
        pair_sheet(ts[:12], P('pairs1'), tmp, rw, ow, script); pair_sheet(ts[12:], P('pairs2'), tmp, rw, ow, script)
        hook_t = [i * 0.5 for i in range(7)]
        strip_sheet([('REFERENCE 0-3 s', [(REF_MP4, t) for t in hook_t]), ('OURS 0-3 s', [(A.ours, t) for t in hook_t])], P('hook'), tmp)
        mts = [round(D * k, 2) for k in (0.18, 0.42, 0.66, 0.86)]
        rows = []
        for t in mts:
            rows.append((f'REFERENCE from {t:.1f} s', [(REF_MP4, t + i * 4 / 30) for i in range(8)]))
            rows.append((f'OURS from {t:.1f} s', [(A.ours, min(OURS_DUR - 0.1, t + i * 4 / 30)) for i in range(8)]))
        strip_sheet(rows, P('motion'), tmp, tw=120, th=213)
        sheets = [P(k) for k in ('hook', 'pairs1', 'pairs2', 'motion')]
        content = ['HOOK sheet:', ('img', P('hook')), 'PAIRS sheet 1 of 2:', ('img', P('pairs1')), 'PAIRS sheet 2 of 2:', ('img', P('pairs2')),
                   'MOTION sheet:', ('img', P('motion')), JUDGE + '\n\n' + JFMT]
        # blind: two strips, the same 12 time stamps, order shuffled per judge
        bts = [round((i + 0.5) * D / 12, 2) for i in range(12)]
        def strip12(mp4, path):
            tw, th = 150, 267; S = Image.new('RGB', (6 * (tw + 4), 2 * (th + 4)), 'white')
            for i, t in enumerate(bts): S.paste(grab(mp4, min(t, dur_of(mp4) - 0.1), tw, th, tmp, 'r' if mp4 == REF_MP4 else 'o'), ((i % 6) * (tw + 4), (i // 6) * (th + 4)))
            S.save(path, quality=88)
        strip12(REF_MP4, os.path.join(tmp, 'b_ref.jpg')); strip12(A.ours, os.path.join(tmp, 'b_ours.jpg'))
        rnd = random.Random(A.seed); orders = [rnd.random() < 0.5 for _ in range(A.blind)]
        bjobs = [['Clip A:', ('img', os.path.join(tmp, 'b_ref.jpg' if o else 'b_ours.jpg')), 'Clip B:', ('img', os.path.join(tmp, 'b_ours.jpg' if o else 'b_ref.jpg')), BLIND + '\n\n' + BFMT] for o in orders]
        with ThreadPoolExecutor(A.judges + A.blind) as ex:
            js = [ex.submit(claude, content, 'You judge animation craft. Reply with JSON only.') for _ in range(A.judges)]
            bs = [ex.submit(claude, b, 'You judge animation frames. Reply with JSON only.') for b in bjobs]
            JR = [j.result() for j in js]; BR = [b.result() for b in bs]
        for a in JUDGED:
            v = [float(r['scores'][a]) for r in JR if r.get('scores', {}).get(a) is not None]
            judged[a] = dict(votes=v, score=float(statistics.median(v)) if v else 0.0, gap=[r.get('gap', {}).get(a, '') for r in JR])
        right_q = 0
        for o, b in zip(orders, BR):
            b['truth'] = 'A' if o else 'B'; b['right'] = str(b.get('original', '')).strip().upper().startswith(b['truth'])
            right_q += int(b['right'] and str(b.get('decided_by', '')).lower().startswith('qual'))
        blind = dict(judges=BR, right_for_quality=right_q, of=A.blind, passed=right_q <= 1)
        tokens = sum(r['_tokens'] for r in JR + BR); cost = round(sum(r['_cost'] or 0 for r in JR + BR), 3)
        shutil.rmtree(tmp, ignore_errors=True)
    else: tokens, cost = 0, 0
    final = {}
    for a in ASPECTS:
        m = metrics.get(a, {}).get('score'); j = judged.get(a, {}).get('score')
        final[a] = min(x for x in (m, j) if x is not None) if (m is not None or j is not None) else None
    lowest = min((v for v in final.values() if v is not None), default=0)
    passed = all(v is not None and v >= 95 for v in final.values()) and bool(blind and blind['passed'])
    out = dict(tag=A.tag, ours=A.ours, ref=os.path.basename(os.path.abspath(A.ref)), ours_dur=OURS_DUR, ref_dur=ref_dur,
               aspects=final, lowest=lowest, passed=passed, measured=metrics, judged=judged, blind=blind, sheets=sheets, tokens=tokens, cost_usd=cost,
               rule='aspect = measured, judged or min of both; PASS = all 10 >= 95 and blind passed (<= 1 judge right for quality)')
    json.dump(out, open(os.path.join(A.out, f'score-{A.tag}.json'), 'w'), indent=1, default=float)
    L = [f'score95 {A.tag}: {"PASS" if passed else "FAIL"}  lowest {lowest}  (ours {OURS_DUR:.1f} s vs ref {ref_dur:.1f} s)']
    for a in ASPECTS:
        m = metrics.get(a, {}).get('score'); j = judged.get(a, {})
        L.append(f'{"  " if (final[a] or 0) >= 95 else "! "}{a:24s} {final[a]!s:6s} measured {m!s:6s} judged {j.get("score")!s:6s} {j.get("votes", "")}')
        for r in metrics.get(a, {}).get('rows', []): L.append(f'      {r["metric"]:34s} ref {r["ref"]!s:10s} ours {r["ours"]!s:10s} -> {r["score"]}')
        for g in j.get('gap', []): L.append(f'      gap: {g}')
    if blind: L.append(f'blind: {blind["right_for_quality"]}/{blind["of"]} judges picked the original for quality ({"PASS" if blind["passed"] else "FAIL"}); ' +
                       ' | '.join(f'{b.get("original")}/{b["truth"]} {b.get("decided_by")}: {b.get("why", "")}' for b in blind['judges']))
    L.append(f'judge tokens {tokens}, ${cost}')
    open(os.path.join(A.out, f'score-{A.tag}.txt'), 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))


OURS_DUR = 0.0
if __name__ == '__main__': main()
