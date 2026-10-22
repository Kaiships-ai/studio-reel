"""cast/page.py: write Kai's casting book HTML from cast/roles.json (+ cast/img/<id>.jpg, <id>-turn.jpg).
   python page.py roles.json <out.html>      (called by tools/make.mjs cast; images are linked relative to the skill folder)"""
import json, sys, os, html

roles = json.load(open(sys.argv[1]))
out = sys.argv[2]
img = os.path.relpath(os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'img'), os.path.dirname(os.path.abspath(out)))
CATS = [('all', 'Tất cả'), ('default', 'Mặc định'), ('office', 'Văn phòng'), ('job', 'Nghề nghiệp'), ('meme', 'Meme'), ('shark', 'Shark Tank'),
        ('culture', 'Văn hoá'), ('anime', 'Anime'), ('ninjago', 'Ninjago'), ('creator', 'Creator'), ('tech', 'CEO tech'), ('internet', 'Internet'),
        ('halloween', 'Halloween'), ('holiday', 'Lễ hội'), ('game', 'Game'), ('sport', 'Thể thao'), ('movie', 'Phim'), ('history', 'Lịch sử'), ('life', 'Đời sống VN')]
default = {'id': 'kai-default', 'cat': 'default', 'name': 'Clawd của Kai (mặc định)', 'outfit': 'zipped red jacket', 'head': 'red >>> headband',
           'face': '', 'hand': '', 'back': '', 'sign': 'red >>> headband + zipped red jacket, like Blocky Kai', 'use': 'every skit unless a role fits better', 'risk': ''}
rows = [default] + roles
E = lambda s: html.escape(str(s or ''))

cards = []
for r in rows:
    parts = ' · '.join(x for x in (r['outfit'], r['head'], r['face'], r['hand'], r['back']) if x)
    risk = f'<span class="risk">{E(r["risk"])}</span>' if r.get('risk') else ''
    cards.append(f'''<button class="card" data-cat="{E(r['cat'])}" data-id="{E(r['id'])}">
  <img src="{img}/{E(r['id'])}.jpg" alt="{E(r['name'])}" loading="lazy">
  <div class="meta"><b>{E(r['name'])}</b><code>{E(r['id'])}</code>
  <p class="sign">{E(r['sign'])}</p><p class="use">Dùng khi: {E(r['use'])}</p>{risk}</div>
  <template><img src="{img}/{E(r['id'])}-turn.jpg" alt="8 góc"><p><b>Trang phục:</b> {E(parts)}</p></template>
</button>''')

chips = ''.join(f'<button class="chip{" on" if k == "all" else ""}" data-f="{k}">{v} <span>{len(rows) if k == "all" else sum(1 for r in rows if r["cat"] == k)}</span></button>' for k, v in CATS)
page = f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Clawd Casting Book</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500&family=Instrument+Sans:wght@400;600&family=IBM+Plex+Mono&display=swap" rel="stylesheet">
<style>
:root{{--bg:#FAF9F5;--surface:#FFFFFF;--surface-2:#F3F0E8;--ink:#1F1E1D;--muted:#625E55;--faint:#948F85;--line:#E6E1D6;--line-2:#D4CDBF;--clay:#D97757;--clay-ink:#B4583A;--clay-bg:#D977571A;
--serif:"Newsreader",Georgia,serif;--sans:"Instrument Sans",system-ui,sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#1C1B19;--surface:#252421;--surface-2:#2E2C28;--ink:#EEEBE3;--muted:#ABA69A;--faint:#7A766C;--line:#383631;--line-2:#4A4740;--clay:#E08966;--clay-ink:#EFA184;--clay-bg:#E089661F}}}}
:root[data-theme="dark"]{{--bg:#1C1B19;--surface:#252421;--surface-2:#2E2C28;--ink:#EEEBE3;--muted:#ABA69A;--faint:#7A766C;--line:#383631;--line-2:#4A4740;--clay:#E08966;--clay-ink:#EFA184;--clay-bg:#E089661F}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.55 var(--sans)}}
main{{max-width:1240px;margin:0 auto;padding:32px 16px 72px}}
h1{{font:500 40px/1.1 var(--serif);margin:0 0 6px}} .lead{{color:var(--muted);max-width:760px;margin:0 0 18px}}
.gloss{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:0 0 22px}}
.gloss div{{background:var(--surface);border:1.5px solid var(--line);border-radius:12px;padding:10px 12px;font-size:13.5px}}
.gloss b{{font:500 11px var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--clay-ink);display:block}}
.chips{{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}}
.chip{{font:500 13px var(--sans);border:1.5px solid var(--line-2);background:var(--surface);color:var(--ink);border-radius:999px;padding:6px 12px;cursor:pointer}}
.chip span{{color:var(--faint);font-family:var(--mono);font-size:11.5px}} .chip.on{{background:var(--clay-bg);border-color:var(--clay);color:var(--clay-ink)}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
.card{{all:unset;cursor:pointer;background:var(--surface);border:1.5px solid var(--line);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}}
.card:hover,.card:focus-visible{{border-color:var(--clay)}} .card>img{{width:100%;aspect-ratio:1;object-fit:cover;background:#1b2230;display:block}}
.meta{{padding:10px 12px 12px}} .meta b{{display:block;font-size:15px}} .meta code{{font:12px var(--mono);color:var(--faint)}}
.sign{{margin:6px 0 2px;font-size:13.5px}} .use{{margin:0;color:var(--muted);font-size:13px}}
.risk{{display:inline-block;margin-top:6px;font:500 11px var(--mono);color:var(--clay-ink);background:var(--clay-bg);border-radius:6px;padding:2px 6px}}
dialog{{border:none;border-radius:16px;padding:0;max-width:min(980px,94vw);background:var(--surface);color:var(--ink)}} dialog::backdrop{{background:#0009}}
dialog .in{{padding:14px}} dialog img{{width:100%;border-radius:10px;display:block;background:#1b2230}} dialog h2{{font:500 26px var(--serif);margin:4px 0 8px}}
dialog .x{{float:right;font:600 14px var(--sans);border:1.5px solid var(--line-2);background:var(--surface-2);color:var(--ink);border-radius:8px;padding:4px 10px;cursor:pointer}}
</style></head><body><main>
<h1>Clawd Casting Book</h1>
<p class="lead">Clawd là diễn viên. Thân cam, 2 mắt khe, 4 chân và cách nhún nhảy giữ nguyên. Mỗi vai chỉ thay trang phục và phụ kiện. Bấm một vai để xem 8 góc.</p>
<div class="gloss">
<div><b>id</b>Tên vai trong code: <code>loadClawdDefault(scene, scale, 'id')</code>.</div>
<div><b>Dấu nhận ra</b>Thứ người xem phải thấy trong 1 giây, kể cả ở cỡ 100 px.</div>
<div><b>Nod (gợi)</b>Người thật, anime, Ninjago: chỉ gợi bằng trang phục. Không giống mặt, không logo.</div>
<div><b>Set prop</b>Đạo cụ quanh Clawd (lửa, ghế, mũi tên). Reel tự bật hoặc tắt.</div>
</div>
<div class="chips">{chips}</div>
<div class="grid">{''.join(cards)}</div>
<dialog id="dlg"><div class="in"><button class="x" onclick="dlg.close()">Đóng</button><h2 id="dt"></h2><div id="db"></div></div></dialog>
</main><script>
const dlg=document.getElementById('dlg');
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{{document.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===c));
  const f=c.dataset.f;document.querySelectorAll('.card').forEach(k=>k.style.display=(f==='all'||k.dataset.cat===f)?'':'none');}});
document.querySelectorAll('.card').forEach(k=>k.onclick=()=>{{document.getElementById('dt').textContent=k.querySelector('b').textContent;
  document.getElementById('db').innerHTML=k.querySelector('template').innerHTML;dlg.showModal();}});
</script></body></html>'''
open(out, 'w').write(page)
print('wrote', out, len(rows), 'roles')
