# Rick clip benchmark table

Written by `refbench.mjs table` from the rows in this folder. Method and limits: README.md.

| Metric | Rick median | Rick band | hm-ep01-r4_v1 | hm-ep01-r4_v2 | gap hm-ep01-r4_v1 | gap hm-ep01-r4_v2 | noise floor | real gap? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| hard cuts / min | 0.9 | 0.9 to 1.1 | 8.0 | 8.0 | +7.1 | +7.1 | 0.0 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| longest take (s) | 41.8 | 38.9 to 61.8 | 16.0 | 16.0 | -25.8 | -25.8 | 0.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| median take (s) | 32.4 | 28.1 to 32.6 | 5.1 | 5.1 | -27.3 | -27.3 | 0.0 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| mean luma (Y, 0-255) | 112.0 | 111.8 to 131.3 | 97.7 | 96.5 | -14.3 | -15.6 | 0.2 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| mean saturation | 24.7 | 23.1 to 27.3 | 35.6 | 35.9 | +10.9 | +11.2 | 0.0 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| sharpest edges (1/px) | 3.035 | 2.243 to 3.226 | 2.294 | 2.303 | -0.742 | -0.732 | 0.123 | no |
| softest edges, background (1/px) | 1.696 | 1.012 to 1.706 | 1.406 | 1.411 | -0.290 | -0.285 | 0.107 | no |
| depth ratio (sharp / soft) | 1.87 | 1.80 to 2.20 | 1.65 | 1.64 | -0.23 | -0.23 | 0.07 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| camera motion (px/frame @1080) | 4.13 | 2.93 to 5.96 | 6.37 | 6.58 | +2.24 | +2.45 | 0.04 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| camera still (share of frames) | 0.04 | 0.04 to 0.10 | 0.00 | 0.00 | -0.04 | -0.04 | 0.00 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| motion inside slow shots, pan removed (px/frame @1080) | 3.57 | 2.79 to 3.63 | 4.34 | 4.15 | +0.77 | +0.58 | 0.12 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| motion while the camera is still (px/frame @1080) | 1.89 | 1.21 to 3.67 | n/a | n/a | n/a | n/a | 0.17 | no |
| loudness, whole film (LUFS) | -14.1 | -14.2 to -14.0 | -14.1 | -14.2 | 0.0 | -0.1 | 0.0 | no |
| loudness, first 3 s (LUFS) | -14.1 | -14.4 to -13.9 | -12.8 | -12.8 | +1.3 | +1.3 | 0.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| loudness, last 5 s (LUFS) | -13.4 | -14.0 to -13.2 | -14.7 | -14.7 | -1.3 | -1.3 | 0.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| loudness spread, 3 s short-term every 1 s (p90 - p10, LU) | 1.7 | 1.4 to 1.7 | 4.8 | 4.5 | +3.2 | +2.8 | 0.2 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| loudness range (LU) | 2.1 | 1.7 to 2.2 | 5.4 | 5.0 | +3.3 | +2.9 | 0.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| true peak (dBFS) | -2.2 | -2.4 to -1.9 | 2.3 | -2.4 | +4.5 | -0.2 | 1.3 | yes (hm-ep01-r4_v1) |
| loudest moment, the payoff (s from the start) | 35.6 | 16.3 to 63.7 | 51.1 | 51.1 | +15.5 | +15.5 | 0.1 | no |
| dip before the payoff, depth under the film median (dB) | 2.0 | 1.7 to 5.8 | -0.3 | -0.3 | -2.3 | -2.3 | 0.4 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| dip before the payoff, length > 10 dB under (s) | 0.0 | 0.0 to 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | no |
| speech (share of time) | 1.00 | 1.00 to 1.00 | 0.69 | 0.69 | -0.31 | -0.31 | 0.01 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| music/ambience bed present (share of 5 s sections) | 1.00 | 1.00 to 1.00 | 1.00 | 1.00 | 0.00 | 0.00 | 0.00 | no |
| bed level (dBFS, median of 5 s sections) | -29.3 | -31.1 to -29.1 | -32.0 | -32.0 | -2.7 | -2.7 | 2.9 | no |
| bed under the loud parts (dB) | 15.5 | 15.4 to 17.3 | 18.2 | 18.2 | +2.7 | +2.7 | 2.9 | no |
| biggest bed drop between sections (dB) | 4.0 | 3.5 to 6.9 | 17.0 | 17.0 | +13.0 | +13.0 | 4.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| bed in the 2 s before the payoff minus the median bed (dB) | 3.2 | 1.5 to 8.9 | 15.3 | 15.1 | +12.1 | +11.9 | 4.1 | yes (hm-ep01-r4_v1), yes (hm-ep01-r4_v2) |
| effects / min (sfx stem, or a listening count) | 15.7 | 15.6 to 23.5 | 12.7 | n/a | -3.0 | n/a | 4.0 | no |
| cuts with an effect within 0.1 s (needs a stem) | n/a | n/a | 0.25 | n/a | n/a | n/a | n/a | no floor |
| blinks / 10 s (blind agent count) | 10.1 | 8.0 to 16.3 | 12.5 | 13.2 | +2.4 | +3.1 | 5.0 | no |
| depth planes (blind agent count) | 3.3 | 3.1 to 3.9 | 3.1 | 3.0 | -0.2 | -0.3 | 0.7 | no |
