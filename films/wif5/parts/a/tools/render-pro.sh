#!/bin/bash
# wif5 part a on the Mac Pro (run from ~/v5-wif5): render-pro.sh stills | clip | both. 720x1280 (--tier review) only.
# A face still renders f-1 first, then f (LIGHT-RECIPE-V3: face light is one frame late); only the asked frames are kept.
cd ~/v5-wif5 || exit 1; export OPENSSL_CONF=$HOME/v5-wif5/.pixi/envs/default/ssl/openssl.cnf; N=.pixi/envs/default/bin/node; F=films/wif5/parts/a; O=$F/renders; mkdir -p $O
S=styles/stick-man/tools/render/shot.mjs; what=${1:-both}
if [ "$what" != clip ]; then t=$(date +%s)
  $N $S --film $F --tier review --frames 0,59,60,149,150,299,300 --out $O/st_%d.jpg --lock-wait 1800 > $O/stills.log 2>&1; rc=$?
  rm -f $O/st_59.jpg $O/st_149.jpg $O/st_299.jpg; echo "stills rc=$rc $(( $(date +%s) - t ))s" >> $O/times.txt; fi
if [ "$what" != stills ]; then t=$(date +%s)
  $N $S --film $F --tier review --frames 0-150 --mp4 $O/a_0-150_720.mp4 --audio films/wif5/audio/mix.wav --no-cache 1 --lock-wait 1800 > $O/clip.log 2>&1; rc=$?
  echo "clip rc=$rc $(( $(date +%s) - t ))s" >> $O/times.txt; fi
echo "done $what" >> $O/times.txt
