# wif5 part a: how to rebuild and render (V5 stills, frames 0-504)

1. Files: `path.js` (where the walk, the clock, the board and the elders are; shared), `reel.js` (14 people via person(), keys, cameras, light), `set.js` (place('street') + code-built square, big clock, countdown board, scarf), `vo/words.json` (synthetic).
2. Gate (headless, any Mac): `node styles/stick-man/tools/gates/fits.mjs films/wif5/parts/a` must exit 0 before any render.
3. Pro tree: `~/v5-wif5` (git archive of 68041324, `node_modules` and `.pixi` linked from `~/wwr2`). The Pro has no `timeout` command.
4. Send: `rsync -a --exclude renders films/wif5/parts/a/ pro:~/v5-wif5/films/wif5/parts/a/`.
5. Before rendering: `pgrep -fl "shot.mjs|ffmpeg|chrome-headless"` prints nothing and `df -h /` shows 8 GB or more free.
6. Render: `ssh pro 'nohup ~/pro-fans.sh run bash ~/v5-wif5/films/wif5/parts/a/tools/render-pro.sh stills > /dev/null 2>&1 &'` (about 20 s).
   It renders f-1 then f at 720x1280 `--tier review --no-cache 1` for every `KEEP` entry (beats 0 90 200 300 329 331 360 450, contacts at 230 and 250) and tiles `renders/sheet.jpg` (5x2, 1440 wide).
7. Bring back: `rsync pro:~/v5-wif5/films/wif5/parts/a/renders/ films/wif5/parts/a/renders/`; `renders/times.txt` ends with `done stills`.
8. Cameras: one `cam(f, why, pos, aim, lens)` per cut in reel.js `direct`; plan new ones by projecting path.js points before rendering.
9. Light (LIGHT-RECIPE-V3): act power 0.7, hemi 0.32, warm fill 0.25; point pools along the walk and under each couple in set.js; no grade.
10. Waivers: 5, one per set prop, `light|street/<prop>|square-night`, why 'V5 stills, measure not built', by ep-whatif1-v5-director.
