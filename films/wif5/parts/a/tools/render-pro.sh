#!/bin/bash
# wif5 part a on the Mac Pro (run from ~/v5-wif5): render-pro.sh stills. 720x1280 (--tier review) only, stills only.
# Each still renders f-1 first, then f (LIGHT-RECIPE-V3: face light is one frame late); only the beat frames are kept, renamed
# to beat_<f>.jpg / contact_<what>.jpg, then sheet.jpg (6 x 2, 1728 px wide).
cd ~/v5-wif5 || exit 1; export OPENSSL_CONF=$HOME/v5-wif5/.pixi/envs/default/ssl/openssl.cnf; N=.pixi/envs/default/bin/node; FF=.pixi/envs/default/bin/ffmpeg
F=films/wif5/parts/a; O=$F/renders; mkdir -p $O; S=styles/stick-man/tools/render/shot.mjs; t=$(date +%s)
KEEP="beat_0:3 beat_90:90 beat_200:200 contact_dad-daughter-hands:230 contact_old-couple-hands:250 beat_300:300 beat_310:310 beat_329:329 beat_342:342 beat_360:360 beat_450:450"
DO=${ONLY:-$KEEP}   # ONLY="beat_331:331 ...": re-render just those; the sheet still tiles every KEEP still
FR=0; for kv in $DO; do f=${kv#*:}; [ $f -gt 0 ] && FR="$FR,$((f-1)),$f"; done
rm -f $O/st_*.jpg
$N $S --film $F --tier review --frames $FR --out $O/st_%d.jpg --no-cache 1 --lock-wait 1800 > $O/stills.log 2>&1; rc=$?
mkdir -p $F/review; DF=$(echo $DO | tr ' ' '\n' | cut -d: -f2 | paste -sd, -)
$N $S --film $F --frames $DF --dbg $F/review/shot-rows.jsonl >> $O/stills.log 2>&1; echo "dbg rc=$?" >> $O/times.txt   # rows for handgrip/facegate/shotgate
for kv in $DO; do n=${kv%%:*}; f=${kv#*:}; cp -f $O/st_$f.jpg $O/$n.jpg; done
IN=""; for kv in $KEEP; do IN="$IN -i $O/${kv%%:*}.jpg"; done
$FF -y -loglevel error $IN -f lavfi -i color=c=black:s=288x512 -filter_complex "$(for i in 0 1 2 3 4 5 6 7 8 9 10; do printf "[$i]scale=288:512[s$i];"; done)[s0][s1][s2][s3][s4][s5]hstack=6[a];[s6][s7][s8][s9][s10][11]hstack=6[b];[a][b]vstack" -frames:v 1 $O/sheet.jpg
rm -f $O/st_*.jpg
echo "stills rc=$rc $(( $(date +%s) - t ))s" >> $O/times.txt; echo "done stills" >> $O/times.txt
