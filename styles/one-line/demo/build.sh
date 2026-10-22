#!/bin/sh
# 从零重现成片：配音 → whisper 校对 → 事件 → 配乐 → 混音 → 逐帧渲染 → 合成（−14 LUFS，grain 0）→ 字幕 / 海报 / 风格帧
set -e
cd "$(dirname "$0")/../../.."
D=styles/one-line/demo
pixi run -e full python core/tts/tts.py $D/lines.json $D/voices
pixi run -e full python core/tts/asr_check.py $D/lines.json $D/voices
node core/render/events.mjs $D
pixi run -e full python $D/music/score.py
pixi run -e full python $D/mix.py
node core/render/video.mjs $D --fps 24 --workers 3 --out $D/out/video24.mp4
node core/render/mux.mjs $D/out/video24.mp4 $D/mix.wav styles/one-line/one-line.mp4 24 0
pixi run -e full python $D/cues_export.py
pixi run -e full python core/render/srt.py $D/cues.json styles/one-line/one-line.srt
node core/render/still.mjs $D 46.9 --out $D/out/poster --prefix p_ && cp $D/out/poster/p_46.9.jpg styles/one-line/poster.jpg
node core/render/still.mjs $D 39.3 --q nosub=1 --out $D/out/poster --prefix s_ && cp $D/out/poster/s_39.3.jpg $D/stills/styleframe.jpg
echo done
