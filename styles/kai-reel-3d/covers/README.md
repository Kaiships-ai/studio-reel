# covers-diorama: one 1080x1920 "diorama poster" cover (Blocky Kai + Clawd in a miniature night room, title on a hanging wooden sign)
Render (from `films/covers/`, made once by `node styles/kai-reel-3d/tools/make.mjs covers`): `pixi run node render/sheet.mjs --page cover.html --times 0 --size 1080x1920 --nolabel --q "scene=plugins&title=4%20PLUGINS%20BEFORE%20YOU%20VIBE%20CODE" --out renders/<name>.png`
Params: `title` (URL-encoded, auto-uppercased, auto-split into 2 lines and fit), `scene` = desk | plugins | compact; tweaks: cx cy cz tx ty fov (camera), ap (blur), mouth (closed|small|open|wide|O), cyaw, arm.
Add a scene: in `src/cover.js` add one key to `SCENES` (a function that builds props with box/cyl/laptop/lamp/mug/books/label; ROOM coords for room props, `scene` for things near the cast), then render with `scene=<key>`.
Keep sign + both characters inside y 12–88% / x 8–92% (IG 3:4 grid crop); open the PNG and check before use.
