# Animation-principle numbers for one clip, read from shot.mjs --dbg rows (world joint positions per frame).
#   python styles/stick-man/tools/motion_metrics.py <dbg.jsonl> [--json out.json] [--actors eng,c1] [--from F --to F]
# A "move" = a run of frames where a joint travels faster than 0.25 m/s for at least 4 frames. Per move:
#   arc      max distance of the path from its chord / chord length (0 = a straight line; arcs read from ~0.08 up)
#   ease     speed in the move's first and last fifth / its peak speed (slow in / out: well under 0.5)
#   antic    the joint first travels against the move's direction (>= 1.5 cm in the 12 frames before it)
#   settle   frames the joint keeps moving (> 0.05 m/s) after the body root stopped (follow-through; 0 = stops dead)
#   lag      frames between the hip's speed peak and this joint's speed peak inside the move (overlap: the head and hands
#            trail the body by 2-6 frames)
#   pops     frames whose speed jumps by more than 3x both neighbours' (a joint snapping, not a fast move)
#   squash   range of the head and body scale (dbg `sq`, absent = 0: no squash and stretch)
import json, math, sys, argparse

ap = argparse.ArgumentParser(); ap.add_argument('dbg'); ap.add_argument('--json'); ap.add_argument('--actors'); ap.add_argument('--from', dest='f0', type=int); ap.add_argument('--to', dest='f1', type=int)
A = ap.parse_args()
rows = [json.loads(l) for l in open(A.dbg)]
if A.f0 is not None: rows = [r for r in rows if r['f'] >= A.f0]
if A.f1 is not None: rows = [r for r in rows if r['f'] <= A.f1]
FPS, MOVE_V, STOP_V = 30, 0.25, 0.05
sub = lambda a, b: [b[i] - a[i] for i in range(3)]
nrm = lambda v: math.sqrt(sum(x * x for x in v))

def series(name, key):
    out = []
    for r in rows:
        a = r['actors'].get(name)
        if not a or not a.get('inFrame') or 'limbs' not in a: out.append(None); continue
        L = a['limbs']
        p = a.get('headW') if key == 'head' else a.get('pos') if key == 'root' else L[key[-1]]['hip'] if key.startswith('hip') else L[key[-1]][key[:-1]]
        out.append(p if p and len(p) == 3 else (p + [0] if p else None))
    return out

def speeds(ps): return [None if ps[i] is None or ps[i + 1] is None else FPS * nrm(sub(ps[i], ps[i + 1])) for i in range(len(ps) - 1)]

def moves(sp):
    out, i = [], 0
    while i < len(sp):
        if sp[i] is not None and sp[i] > MOVE_V:
            j = i
            while j < len(sp) and sp[j] is not None and sp[j] > MOVE_V: j += 1
            if j - i >= 4: out.append((i, j))
            i = j
        else: i += 1
    return out

def arc(ps):
    a, b = ps[0], ps[-1]; ch = sub(a, b); L = nrm(ch)
    if L < 0.03: return None
    u = [x / L for x in ch]; dev = 0
    for p in ps:
        w = sub(a, p); t = sum(w[k] * u[k] for k in range(3)); dev = max(dev, nrm([w[k] - t * u[k] for k in range(3)]))
    return dev / L

def actor_metrics(name):
    hipL, root = series(name, 'hipL'), series(name, 'root')
    hip_sp, root_sp = speeds(hipL), speeds(root)
    res = {}
    for key in ['head', 'handL', 'handR']:
        ps = series(name, key); sp = speeds(ps); M = []
        for i, j in moves(sp):
            seg = [p for p in ps[i:j + 1] if p]; pk = max(sp[i:j]); n5 = max(1, (j - i) // 5)
            ease = max(max(sp[i:i + n5]), max(sp[j - n5:j])) / pk if pk else None
            d = sub(seg[0], seg[-1]); dl = nrm(d) or 1
            pre = [p for p in ps[max(0, i - 12):i + 1] if p]
            back = max([-sum(sub(pre[0], q)[k] * d[k] / dl for k in range(3)) for q in pre] + [0])
            hp = [x or 0 for x in hip_sp[i:j]]; lag = (sp[i:j].index(pk) - hp.index(max(hp))) if hp and max(hp) > MOVE_V else None
            M.append({'f': rows[i]['f'], 'frames': j - i, 'arc': None if arc(seg) is None else round(arc(seg), 3), 'ease': round(ease, 2) if ease is not None else None,
                      'antic': back >= 0.015, 'lag': lag})
        # settle: after each root stop, how long this joint keeps moving
        st = []
        for k in range(1, len(root_sp)):
            if root_sp[k - 1] is not None and root_sp[k] is not None and root_sp[k - 1] > MOVE_V and root_sp[k] <= STOP_V:
                n = 0
                while k + n < len(sp) and sp[k + n] is not None and sp[k + n] > STOP_V: n += 1
                st.append(n)
        pops = sum(1 for k in range(1, len(sp) - 1) if None not in (sp[k - 1], sp[k], sp[k + 1]) and sp[k] > 0.4 and sp[k] > 3 * max(sp[k - 1], sp[k + 1], 0.05))
        res[key] = {'moves': M, 'settle': st, 'pops': pops}
    sq = [(r['actors'][name].get('limbs') or {}).get('sq') for r in rows if name in r['actors'] and r['actors'][name].get('inFrame')]
    sq = [s for s in sq if s is not None]
    res['squash'] = round(max(sq) - min(sq), 3) if sq else 0
    rp = sum(1 for k in range(1, len(root_sp) - 1) if None not in (root_sp[k - 1], root_sp[k], root_sp[k + 1]) and root_sp[k] > 0.4 and root_sp[k] > 3 * max(root_sp[k - 1], root_sp[k + 1], 0.05))
    res['root_pops'] = rp
    return res

names = A.actors.split(',') if A.actors else sorted({n for r in rows for n, a in r['actors'].items() if a.get('inFrame') and 'limbs' in a})
out = {n: actor_metrics(n) for n in names}
# one summary line per actor: the share of moves that pass each principle's bar
def summary(m):
    mv = [x for k in ('head', 'handL', 'handR') for x in m[k]['moves']]
    n = len(mv) or 1
    arcs = [x['arc'] for x in mv if x['arc'] is not None]
    return {'moves': len(mv), 'arcs>=0.08': f"{sum(a >= 0.08 for a in arcs)}/{len(arcs)}", 'eased<=0.5': f"{sum(1 for x in mv if x['ease'] is not None and x['ease'] <= 0.5)}/{len(mv)}",
            'antic': f"{sum(x['antic'] for x in mv)}/{len(mv)}", 'lag>=2': f"{sum(1 for x in mv if x['lag'] is not None and x['lag'] >= 2)}/{len(mv)}",
            'settle_frames': [s for k in ('head', 'handL', 'handR') for s in m[k]['settle']], 'pops': sum(m[k]['pops'] for k in ('head', 'handL', 'handR')) + m['root_pops'], 'squash': m['squash']}
for n in names: print(n, json.dumps(summary(out[n])))
if A.json: json.dump({'per_actor': out, 'summary': {n: summary(out[n]) for n in names}}, open(A.json, 'w'), indent=1)
