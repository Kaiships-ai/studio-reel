#!/bin/bash
cd /Users/kienbeovl/orca/workspaces/studio-reel/whatif1-v5 || exit 1
R="ssh -o ServerAliveInterval=30 pro"; P='cd ~/v5-wif5 && export OPENSSL_CONF=$HOME/v5-wif5/.pixi/envs/default/ssl/openssl.cnf PATH=$HOME/v5-wif5/.pixi/envs/default/bin:$PATH'
G=styles/stick-man/tools/gates; K=films/kit-showcase
rsync -a $K/ pro:v5-wif5/$K/ --exclude vo/vo.wav --exclude renders --exclude review
$R "$P; ~/pro-fans.sh run bash $K/tools/render-pro.sh dbg >/dev/null 2>&1"; scp -q pro:v5-wif5/$K/review/rows.jsonl $K/review/rows.jsonl || echo SCP-FAIL-rows
echo ROWS; for g in facegate handgrip; do node $G/$g.mjs --rows $K/review/rows.jsonl 2>&1|tail -1|cut -c1-200; done
$R "$P; ~/pro-fans.sh run bash $K/tools/render-pro.sh loop >/dev/null 2>&1"; scp -q pro:v5-wif5/$K/renders/loop_480.mp4 $K/renders/ || echo SCP-FAIL-loop
echo VALUE; node $G/valuegate.mjs --mp4 $K/renders/loop_480.mp4 --rows $K/review/rows.jsonl 2>&1|tail -8|cut -c1-250
for c in wide lineup; do $R "$P; ~/pro-fans.sh run bash $K/tools/render-pro.sh $c >/dev/null 2>&1"; done
scp -q pro:v5-wif5/$K/renders/{wide.jpg,lineup.jpg} $K/renders/ || echo SCP-FAIL-stills
$R "$P; for d in stills lineup; do ~/pro-fans.sh run node styles/stick-man/tools/render/shot.mjs --film $K/\$d --tier still --frames 118,119,120,121 --out /tmp/ks_%d.jpg --dbg $K/review/rows_\$d.jsonl --no-cache 1 --lock-wait 1800 >/dev/null 2>&1; done"
scp -q pro:v5-wif5/$K/review/rows_{stills,lineup}.jsonl $K/review/
echo STILLS; for d in stills lineup; do node $G/facegate.mjs --rows $K/review/rows_$d.jsonl 2>&1|tail -1|cut -c1-200; done
node $G/fits.mjs $K 2>&1|tail -1|cut -c1-200; node $G/clothgate.mjs $K 2>&1|tail -1|cut -c1-200
echo CHAIN-DONE
