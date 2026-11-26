# wif5 part a: how to rebuild and render (first slice, frames 0-330)

1. Files: `reel.js` (person() via kit/film.js, clips, camera, light), `set.js` (place('street') + code-built square), `vo/words.json` (synthetic, no voice), empty `storyboard.json`.
2. Gate (on any Mac, headless): `node styles/stick-man/tools/gates/fits.mjs films/wif5/parts/a` must exit 0.
3. Pro tree: the Desktop checkout is not readable over ssh (macOS "Operation not permitted"). Use `~/v5-wif5`: `git archive 68041324 | ssh pro 'tar -xf - -C ~/v5-wif5'`, then
   `ln -s ~/wwr2/node_modules node_modules; ln -s ~/wwr2/.pixi .pixi` (same lock hashes; kit206-look's .pixi is empty). The script sets OPENSSL_CONF
   (the env points at the Desktop copy) and passes `--no-cache 1` (the tree has no .git). Stills use `--tier review`: `--tier still` is fixed at 1080x1920.
4. Send the part: `rsync -a films/wif5/parts/a/ pro:~/v5-wif5/films/wif5/parts/a/` and `rsync films/wif5/audio/mix.wav pro:~/v5-wif5/films/wif5/audio/`.
5. Before rendering: `pgrep -fl "shot.mjs|ffmpeg|chrome-headless"` must print nothing, and `df -h /` must show 8 GB or more free.
6. Render in the background: `ssh pro 'nohup ~/pro-fans.sh run bash ~/v5-wif5/films/wif5/parts/a/tools/render-pro.sh both > /dev/null 2>&1 &'`
   (`stills` = frames 0, 60, 150, 300 as 720x1280 `--tier review` jpgs, rendered f-1 then f for face light; `clip` = 0-150 mp4 with the mix).
7. Bring back: `rsync pro:~/v5-wif5/films/wif5/parts/a/renders/ films/wif5/parts/a/renders/`. `renders/times.txt` holds the render times.
8. Light knobs (LIGHT-RECIPE-V3): every `K.point` in set.js is 8-26 power at 3.4-4.6 m reach; act `light.hemi` is 0.28 and `light.power` 0.8 (moon); `ENV_K` is 0.4; there is no grade.
9. Waivers: one per set prop, `light|street/<prop>|square-night`, in set.js `place()`.
