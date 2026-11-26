#!/bin/bash
# kit-showcase on the Mac Pro (run from ~/v5-wif5, under pro-fans): render-pro.sh stills | loop | dbg
cd ~/v5-wif5 || exit 1
export OPENSSL_CONF=$HOME/v5-wif5/.pixi/envs/default/ssl/openssl.cnf; N=.pixi/envs/default/bin/node
S=styles/stick-man/tools/render/shot.mjs; F=films/kit-showcase; O=$F/renders; mkdir -p $O $F/review
# the loop needs a vo/vo.wav to mux (the showcase has no voice): a silent one, made here, never committed
[ -f $F/vo/vo.wav ] || .pixi/envs/default/bin/ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=24000:cl=mono -t 7.1 $F/vo/vo.wav
case "$1" in
  wide) $N $S --film $F --tier still --frames 99,100 --out $O/w_%d.jpg --no-cache 1 --lock-wait 1800 > $O/wide.log 2>&1; cp -f $O/w_100.jpg $O/wide.jpg;;
  lineup) $N $S --film $F/lineup --tier still --frames 119,120 --out $O/l_%d.jpg --no-cache 1 --lock-wait 1800 > $O/lineup.log 2>&1; cp -f $O/l_120.jpg $O/lineup.jpg;;
  loop) $N $S --film $F --w 480 --h 854 --frames 0-209 --mp4 $O/loop_480.mp4 --no-cache 1 --lock-wait 1800 > $O/loop.log 2>&1;;
  dbg) $N $S --film $F --frames 0-209 --dbg $F/review/rows.jsonl > $O/dbg.log 2>&1;;
esac
echo "done $1 $(date +%T)" >> $O/times.txt
