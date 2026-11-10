# sound_cues.py: writes the hand-written stand-in <film>/audio/cues.json for stick01 from vo/words.json (the picture engine will
# emit its own cues later). Each row = (line, anchor word, sound, where: 't0' word start | 't1' word end, extra).
# usage: python styles/stick-man/tools/sound_cues.py films/stick01-dye-pack
import json, os, sys

ROWS = [
    ('l01', 'robs', 'slide'), ('l01', 'HELPS', 'thud'), ('l01', 'pack', 'thud'),
    ('l02', 'lifts', 'rustle'), ('l02', 'plate', 'ting'), ('l02', 'drops', 'thud'),
    ('l03', 'day', 'ding', 't1'),
    ('l04', 'Easiest', 'whoosh'), ('l04', 'strolls', 'steps5:door'), ('l04', 'door', 'beep', 't1'),
    ('l05', 'ten', 'tick'), ('l05', 'seconds', 'tick'), ('l05', 'later', 'tick'), ('l05', 'EXPLODES', 'poof'), ('l05', 'EXPLODES', 'hiss'),
    ('l06', 'Wait', 'scratch'),
    ('l07', 'hollow', 'pop'), ('l07', 'asleep', 'snore'), ('l07', 'magnet', 'clunk'), ('l07', 'picked', 'blip'),
    ('l08', 'door', 'ping', 't0', 2, 0.36), ('l08', 'timer', 'tick', 't1', 3, 0.2),
    ('l09', 'burning', 'sizzle'), ('l09', 'four', 'slide_whistle_up'), ('l09', 'spraying', 'hiss'), ('l09', 'bill', 'flutter'),
    ('l10', 'worthless', 'wah'), ('l10', 'red', 'siren', 't0', 1, 0, 0.3), ('l10', 'town', 'sting', 't1'),
]


def word(words, line, w):
    return next(x for x in words if x['line'] == line and x['word'].strip('.,?!"').lower() == w.lower())


def cues(words):
    out = []
    for r in ROWS:
        line, w, name = r[:3]; where = r[3] if len(r) > 3 else 't0'; reps = r[4] if len(r) > 4 else 1
        gap = r[5] if len(r) > 5 else 0; strength = r[6] if len(r) > 6 else 1.0
        if name.startswith('steps'):                                   # 5 steps evenly from this word's start to the next anchor's start
            k, end = name[5:].split(':'); a, b = word(words, line, w)['t0'], word(words, line, end)['t0']; k = int(k)
            out += [dict(t=round(a + j * (b - a) / (k - 1), 3), name='step_l' if j % 2 == 0 else 'step_r', strength=0.8) for j in range(k)]
            continue
        t = word(words, line, w)[where]
        out += [dict(t=round(t + j * gap, 3), name=name, strength=strength) for j in range(reps)]
    return sorted(out, key=lambda c: c['t'])


if __name__ == '__main__':
    film = sys.argv[1]; words = json.load(open(os.path.join(film, 'vo/words.json')))
    os.makedirs(os.path.join(film, 'audio'), exist_ok=True); c = cues(words)
    with open(os.path.join(film, 'audio/cues.json'), 'w') as f: f.write('[\n' + ',\n'.join(json.dumps(x) for x in c) + '\n]\n')
    print(len(c), 'cues ->', os.path.join(film, 'audio/cues.json'))
