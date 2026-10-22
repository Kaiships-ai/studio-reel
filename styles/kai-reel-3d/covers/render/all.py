# render every row of titles.tsv → renders/all/NN-<code>.png (NN = row order, 01 = newest); prints the plan table
import csv, sys, subprocess, urllib.parse
ROLES = {'Deq6jUbBx3p':'astronaut','DemyKSfB9r3':'f1','DekMJIPyGH3':'firefighter','Dei1eMQSQU3':'terminator-nod','DeQNRxTyS-v':'shark',
         'DeQNslWylzu':'youtuber','DeHkZbfSi-D':'detective','Dd7qmaBSJMg':'sensei','Dd7pn4nSh2t':'hormozi','Dd6nguzSt4G':'boxer'}
POSES = ['wave','hip','thumbs','hips','rest']
rows = list(csv.DictReader(open(sys.argv[1]), delimiter='\t'))
for i, r in enumerate(rows):
    t, code = r['title'].strip(), r['code'].strip()
    scene = 'plugins' if 'PLUGINS' in t else 'compact' if '/COMPACT' in t else 'desk'
    role, pose = ROLES.get(code, ''), POSES[i % 5]
    q = urllib.parse.urlencode({'title': t, 'scene': scene, 'role': role, 'pose': pose})
    out = f'renders/all/{i+1:02d}-{code}.png'
    if 'tag' in r:                                     # eye layout (round 6): tsv has tag + sentence-case title + hl (highlighted last words)
        scene, pose = ('plugins' if 'plugins' in t.lower() else 'desk'), ('2.6' if i % 3 == 1 else '0.5')   # every 3rd: chin on hand
        q = {'title': t, 'tag': r['tag'], 'hl': r['hl'], 'role': role, 'sitt': r.get('sitt') or pose}
        q.update({k: r[k] for k in ('mouth', 'sky', 'col', 'pose', 'mopen', 'flip', 'mugx', 'mugr', 'mugh', 'mx') if r.get(k)})   # round 7+ columns (titles-eye3.tsv)
        q['catch'] = '1'
        q = urllib.parse.urlencode(q)
        out = f'renders/eye/{i+1:02d}-{code}.png'
    if len(sys.argv) < 3: subprocess.run(['node','render/sheet.mjs','--page','cover.html','--times','0','--size','1080x1920','--nolabel','--q',q,'--out',out], check=True, capture_output=True)
    print(f'{i+1:02d} | {code} | {t} | {role or "default"} | {pose} | {scene}')
