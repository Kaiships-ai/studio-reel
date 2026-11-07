# gen_tl3.py · TMV Ep1 v3 timeline → tl3.json (main.js, audio/tmv3/build3.py) + renders/shots_v3.json (check_reel.py).
# Run from the film folder: python3 src/tmv3/gen_tl3.py
# The voice is ONE take (vo3/vo3_tight.wav, starts at OFF on the reel). Every cut and event is read off the voice's own word
# stamps (vo3/words3.json): the picture follows the voice. A cut sits LEAD s before the word that opens the shot.
import json
OFF, LEAD = 0.15, 0.08
WD = json.load(open('vo3/words3.json'))
WORDS = [{'w': w['w'], 's': round(w['s'] + OFF, 3), 'e': round(w['e'] + OFF, 3)} for w in WD]
def at(word, near, end=False):
    # the occurrence of `word` whose start is nearest to `near` (seconds in the voice file, read off vo3/words3.json)
    c = [w for w in WORDS if w['w'].lower().strip('.,:?!') == word.lower()]
    w = min(c, key=lambda w: abs(w['s'] - OFF - near))
    assert abs(w['s'] - OFF - near) < 0.6, (word, near, w)
    return w['e'] if end else w['s']
cut = lambda word, near: round(at(word, near) - LEAD, 2)
VO_END = WORDS[-1]['e']
import math
END_A = round(VO_END + 0.2, 2); T = math.ceil((END_A + 2.7) * 30) / 30   # a whole number of frames: video and audio end together
# id, start, kind, idea, face(who|None), expression     (each shot ends where the next begins)
S = [
    ('A1', 0.0,                 'story',   'phone-buzzing-10m-lock',         None,   None),
    ('A2', 1.35,                'story',   'you-shock-at-10m',               'you',  'exp_shock'),
    ('A3', cut('twelve', 2.68),       'story',   'the-12s-reel-studio-clip',       None,   None),
    ('A4', cut('the', 4.54),       'story',   'built-at-night-with-clawd',      'you',  'exp_determined'),
    ('A5', cut('and', 6.18),       'story',   'hud-lands-it-starts-now',        'you',  'exp_worried'),
    ('A6', cut('because', 8.06),      'story',   'tagline-every-view-half-life',   None,   None),
    ('B1', cut('problem', 10.39),   'story',   'p1-ten-million-isnt',            None,   None),
    ('B2', cut('instagram', 13.28), 'explain', 'rule-a-start-is-a-view-replays', None,   None),
    ('B3', cut('one', 16.92),       'explain', 'one-person-eleven-views',        None,   None),
    ('B4', cut('so', 19.96),        'story',   'you-cant-tell-how-many-people',  'you',  'exp_doubt'),
    ('C1', cut('problem', 23.24),   'story',   'p2-caption-link-cant-tap',       None,   None),
    ('C2', cut('on', 26.96),           'explain', 'rule-caption-link-is-text',      None,   None),
    ('C3', cut('so', 29.5),        'story',   'you-pinged-comments-pile',       'you',  'exp_nervous'),
    ('C4', cut('link', 31.12),      'story',   'comment-flood-price-passes',     None,   None),
    ('C5', cut('and', 34.84),       'story',   'you-scroll-past',                'you',  'exp_tired'),
    ('C6', cut('rule', 36.32),         'card',    'rule-1-cant-tap-doesnt-exist',   None,   None),
    ('D1', cut('so', 39.24),        'story',   'you-get-smart',                  'you',  'exp_smirk'),
    ('D2', cut('you', 40.26),       'story',   'link-to-bio',                    None,   None),
    ('D3', cut('then', 43.58),         'story',   'you-watch-clicks',               'you',  'exp_excited'),
    ('D4', cut('four', 45.04),         'story',   'count-4',                        None,   None),
    ('D5', cut('eleven', 45.46),    'story',   'count-11',                       'you',  'exp_proud'),
    ('D6', cut('twenty-six', 46.24),   'story',   'count-26',                       None,   None),
    ('D7', cut('forty-one', 47.22), 'story',   'count-41',                       None,   None),
    ('E1', cut('forty-one', 48.22), 'story',   'forty-one-out-of-ten-million',   None,   None),
    ('E2', cut('that', 50.04),      'story',   'that-number-has-a-name',         'you',  'exp_sad'),
    ('E3', cut('vanity', 51.22),       'story',   'vanity-metric-over-scene',       None,   None),
    ('E4', cut('and', 55.14),       'story',   'theo-answering-your-comments',   'theo', 'exp_grin'),
    ('E5', cut('same', 57.94),         'story',   'same-clip-side-by-side',         None,   None),
    ('E6', cut('his', 59.74),          'story',   'his-link-works-clawd-turns',     None,   None),
    ('E7', cut('you', 61.76),      'story',   'you-know-that-face',             'you',  'exp_angry'),
    ('E8', cut('theo', 62.98),         'story',   'theo-name',                      'theo', 'exp_smirk'),
    ('E9', cut('half', 63.8),      'story',   'half-your-code-already-selling', None,   None),
    ('F1', cut('day', 66.14),       'card',    'day-1',                          None,   None),
    ('F2', cut('ten', 66.84),       'explain', 'where-you-stand',                None,   None),
    ('F3', cut('and', 70.14),       'story',   'one-copy-works-better',          None,   None),
    ('G1', cut('and', 72.86),      'story',   'counter-still-climbing',         None,   None),
    ('G2', cut('you', 74.4),      'story',   'chase-the-wave-want',            'you',  'exp_excited'),
    ('G3', cut('or', 76.28),        'story',   'answer-one-by-one-wave-dies',    'you',  'exp_thinking'),
    ('G4', cut('comment', 79.16),   'vote',    'vote-chase-or-answer',           'you',  'exp_excited'),
    ('G5', END_A,               'card',    'end-fiction-real-rules',         None,   None),
]
shots = []
for i, (sid, a, kind, idea, who, ex) in enumerate(S):
    b = S[i + 1][1] if i + 1 < len(S) else T
    shots.append({'id': sid, 'a': round(a, 2), 'b': round(b, 2), 'kind': kind, 'idea': idea, 'face': bool(who), 'who': who, 'expression': ex})
for s in shots: assert 0.35 <= s['b'] - s['a'] <= 4.3, (s['id'], round(s['b'] - s['a'], 2))
ideas = [s['idea'] for s in shots]; assert len(set(ideas)) == len(ideas)
E = lambda w, near, end=False: round(at(w, near, end), 3)
EV = {
    'tenM': E('ten', 0.94), 'views0': E('views', 1.66), 'hudIn': [E('starts', 7.24) - 0.25, E('starts', 7.24) - 0.05, E('now', 7.46) + 0.0], 'startsNow': E('now', 7.46),
    'halfLife': E('half-life', 9.52), 'p1': E('problem', 10.39), 'isnt': E("isn't", 11.86),
    'plays': [E('counts', 13.62), E('every', 14.24), E('starts', 15.12)], 'replay': [E('replays', 16.24), E('too', 16.34)],
    'loopRun': [E('loops', 17.48), E('times', 18.04) + 0.15], 'elevenSlam': E('eleven', 18.96), 'people': E('people', 20.6), 'noWay': E('tell', 22.7),
    'p2': E('problem', 23.24), 'tap1': E('tap', 26.28), 'tap2': E('it', 26.5), 'justText': E('text', 28.84),
    'pile': E('pile', 30.14), 'pings': [round(E('pile', 30.14) - 0.3 + 0.24 * i, 3) for i in range(7)],
    'linkW': [E('link', 31.12), E('link', 31.56), E('where\'s', 32.04)], 'price': E('price', 34.04), 'pastIt': E('past', 35.4),
    'rule1': E('rule', 36.32), 'ruleLine': E('if', 37.0),
    'smart': E('smart', 39.76), 'bioFly': [E('move', 40.5), E('bio', 41.14, True)], 'linkInBio': E('link', 42.72), 'clicksIn': E('clicks', 44.14),
    'n4': E('four', 45.04), 'n11': E('eleven', 45.46), 'n26': E('twenty-six', 46.24), 'n41': E('forty-one', 47.22),
    'outOf': E('out', 48.62), 'nameLine': E('name', 50.68), 'vanity': E('vanity', 51.22), 'winning': E('winning', 53.4), 'paysNothing': E('nothing', 54.38),
    'counting': E('counting', 55.7), 'answering': E('answering', 57.14), 'replies': [round(E('someone', 56.54) + 0.45 * i, 3) for i in range(4)],
    'sideBySide': E('same', 57.94), 'theoHeader': E('account', 59.88), 'linkWorks': E('works', 61.04), 
    'face': E('face', 62.22), 'theoName': E('theo', 62.98), 'blame': E('half', 63.8), 'selling': E('selling', 65.34),
    'day1': E('day', 66.14), 'rows': [E('views', 67.24), E('clicks', 68.32), E('zero', 69.14), E('zero', 69.14) + 0.55], 'copyLine': E('copy', 70.56), 'better': E('better', 71.8),
    'climbing': E('climbing', 73.72), 'followUp': E('follow-up', 74.94), 'wave': E('wave', 75.74), 'answerC': E('answer', 76.5), 'dies': E('dies', 78.42),
    'chase': E('chase', 79.76), 'answer': E('answer', 80.62), 'day2': E('day', 81.32), 'pick': E('pick', 82.26),
    'fiction': round(END_A + 0.7, 2),
}
EV.update({'buzz0': 0.05, 'viewsSlam': EV['views0'], 'tap1': E('nobody', 25.8), 'tap2': E('tap', 26.28), 'theoTap': round(E('link', 60.74) - 0.1, 3),
           'reply': E('answer', 76.5), 'sent': E('time', 77.96), 'newReel': E('post', 74.62), 'waveDies': round(E('dies', 78.42) - 0.3, 3)})
EV['checkout'] = round(EV['theoTap'] + 0.18, 3)
EV['copies'] = round(EV['linkWorks'] + 0.12, 3)
json.dump({'T': T, 'OFF': OFF, 'VO_END': VO_END, 'shots': shots, 'words': WORDS, 'ev': EV}, open('tl3.json', 'w'), indent=1)
json.dump([{k: s[k] for k in ('id', 'a', 'b', 'kind', 'idea', 'face', 'expression')} for s in shots], open('renders/shots_v3.json', 'w'), indent=1, ensure_ascii=False)
yf = sum(s['b'] - s['a'] for s in shots if s['who'] == 'you'); tf = sum(s['b'] - s['a'] for s in shots if s['who'] == 'theo')
print(f'T={T} VO_END={VO_END} end card {END_A}–{T} · shots={len(shots)} avg={T/len(shots):.2f}s · longest {max(s["b"]-s["a"] for s in shots):.2f}s · you-face={yf:.1f}s theo-face={tf:.1f}s')
print(' '.join(f"{s['id']}:{s['a']:.2f}" for s in shots))
