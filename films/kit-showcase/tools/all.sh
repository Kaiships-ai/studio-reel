#!/bin/bash
cd /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5 || exit 1
rsync -a films/kit-showcase/ pro:v5-wif5/films/kit-showcase/ --exclude vo/vo.wav --exclude renders --exclude review
ssh pro 'cd ~/v5-wif5 && PATH=$HOME/v5-wif5/.pixi/envs/default/bin:$PATH ~/pro-fans.sh run bash films/kit-showcase/tools/render-pro.sh dbg >/dev/null 2>&1'
scp -q pro:v5-wif5/films/kit-showcase/review/rows.jsonl films/kit-showcase/review/rows.jsonl
for g in facegate handgrip; do node styles/stick-man/tools/gates/$g.mjs --rows films/kit-showcase/review/rows.jsonl 2>&1|tail -1|cut -c1-200; done
bash films/kit-showcase/tools/loop.sh
