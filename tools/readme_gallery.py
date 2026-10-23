# readme_gallery.py: the style gallery in README.md, from every styles/<slug>/style.json + showcase.jpg.
#   pixi run python tools/readme_gallery.py
# showcase.jpg is our own 540×960 frame of the shared "Ship it." brief, made with the style's engine (films/showcase-<slug>/).
# Rewrites the block between the GALLERY markers in README.md; the order is styles/README.md's (category, then num).
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]
START, END = '<!-- GALLERY:START (tools/readme_gallery.py) -->', '<!-- GALLERY:END -->'
COLS = 4

styles = []
for f in sorted(ROOT.glob('styles/*/style.json')):
    s = json.loads(f.read_text())
    if (f.parent / 'showcase.jpg').exists(): styles.append(s)

order = [c for c in re.findall(r'^## (.+)$', (ROOT / 'styles/README.md').read_text(), re.M)]
styles.sort(key=lambda s: (order.index(s['category_en']) if s['category_en'] in order else 99, s['num']))

out = [START, '']
for cat in dict.fromkeys(s['category_en'] for s in styles):
    group = [s for s in styles if s['category_en'] == cat]
    out += [f'### {cat}', '', '| ' + ' | '.join([' '] * COLS) + ' |', '|' + '---|' * COLS]
    for i in range(0, len(group), COLS):
        cells = [f'<a href="styles/{s["slug"]}/STYLE.md"><img src="styles/{s["slug"]}/showcase.jpg" width="190" alt="{s["en"]}"></a><br>'
                 f'**{s["en"]}**' for s in group[i:i + COLS]]
        out.append('| ' + ' | '.join(cells + [' '] * (COLS - len(cells))) + ' |')
    out.append('')
out.append(END)

readme = (ROOT / 'README.md').read_text()
block = '\n'.join(out)
readme = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda _: block, readme, flags=re.S) if START in readme else readme
(ROOT / 'README.md').write_text(readme)
print(f'{len(styles)} styles in the gallery')
