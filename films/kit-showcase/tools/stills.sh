#!/bin/bash
cd /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5 || exit 1
rsync -a films/kit-showcase/ pro:v5-wif5/films/kit-showcase/ --exclude vo/vo.wav --exclude renders --exclude review
for c in wide lineup; do ssh pro "cd ~/v5-wif5 && PATH=\$HOME/v5-wif5/.pixi/envs/default/bin:\$PATH ~/pro-fans.sh run bash films/kit-showcase/tools/render-pro.sh $c >/dev/null 2>&1"; done
scp -q pro:v5-wif5/films/kit-showcase/renders/{wide.jpg,lineup.jpg,wide.log,lineup.log} films/kit-showcase/renders/; tail -3 films/kit-showcase/renders/wide.log
