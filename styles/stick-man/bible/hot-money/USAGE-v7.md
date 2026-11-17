# v7 dùng gì: trong và ngoài danh mục

Câu hỏi: một checker có tìm được phần v7 dùng mà danh mục không có không? Chưa làm checker, chỉ đếm.

Nguồn số: `node styles/stick-man/bible/usage-probe.mjs --films <main checkout>/films` (17/11). Probe nạp 19 act của
`films/hm-ep01-r2` (s4, s5, s6: `reel.js` + `reel2.js`, như `engine/play.js`) trong node, không ghi gì, rồi so với `catalog.json`.
Nó bọc `buildTrack` và `stepTurn` của `s4/lib.js` để thấy key tay đúng như phim viết.

## Số đếm

| Loại | Trong danh mục | Ngoài danh mục | Đơn vị |
|---|---|---|---|
| Clip thư viện | 16 (5 clip) | 0 | clip key |
| Key tay cho động tác có clip | 0 | 69: 58 key (23 pose) + 10 `stepTurn` + 1 đoạn đi bằng key | key, lần gọi |
| Key tay khác (diễn xuất, pose không có clip) | 117 key, không phải phần danh mục | | key |
| Nét mặt | 136 (22 mặt `y_*`) | 0 | lần đặt `expr` |
| Máy quay | 2651 (flyCam 2630, bullet 21) | 0 thấy được, 15 ẩn (xem 4) | frame |
| Đạo cụ cầm tay | 507 (`s4ghost`) | 190 (8 đạo cụ phim tự dựng) | key |
| Overlay 2D | 160 (text 155, meter 4, path 1) | 0 | overlay |
| Hiệu ứng `make` | 0 | 18 (`ao_anim` 14, `sparks` 4) | make |
| Module bối cảnh | 0 | 19 act (3 file `s4/s5/s6/set.js`) | act |
| Look (grade) | 13 act (`look.finish-s4`) | 6 act (`s6/shared.js` LOOK) | act |

Phần riêng biệt: 34 trong (5 clip, 22 mặt, 2 di máy, 1 đạo cụ, 3 overlay, 1 look), 49 ngoài (34 động tác key tay,
8 đạo cụ, 2 hiệu ứng, 3 module bối cảnh, 1 look, 1 rung máy cầm tay).

Không có lần nào v7 gọi thẳng nét mặt kit (31 mặt) hay loại shot kit (15 `KIND`): mọi mặt qua `closeFaces`, mọi frame qua `flyCam`.

## 5 ví dụ ngoài danh mục

1. **Chạy bằng key tay.** `s5/drive.js:68` `stepTurn({ steps: 8, pose: 'C_RUNGUN' })`: cảnh sát chạy 7,2 m bằng 8 bước key tay.
   Thư viện có `clip.Move_Run_Fwd_Loop` cho thân `thin` (R5, S3-034). Ghi chú trong file: key tay để súng ở yên trong tay.
   Kit dự kiến làm việc này bằng clip chạy cộng một lớp key tay cho cánh tay (`layer` của `buildTrack`).
2. **Đèn pin tự dựng.** 146 key cảnh sát cầm `flashlight` (`set/cast.js` FLASHLIGHT). Kit có `prop.hand.torch`.
   Tương tự `s5revolver` (32 key) khi kit có `prop.hand.pistol`.
3. **Ngồi, nhặt, đưa bằng pose tay.** `SIT_LOW`, `SIT_GUARD`, `SIT_TALL` (9 key) khi có `clip.Idle_Sit_Loop`;
   `HEAVE*`, `REACH_LOW` (9 key) khi có `clip.Act_PickUp_Once`; `PAY`, `PAY_OFF`, `OFFER`, `T_TAKE`, `C_TAKE` (13 key) khi có `clip.Act_HandOver_Once`.
4. **Rung máy cầm tay.** `s4/s3.js:170` `hand(flyCam(...), 0.004)` trên act `s3feet` (f 801-815). Probe không thấy: frame vẫn mang nhãn flyCam.
5. **Look ngày của s6/s7.** 6 act dùng `LOOK` của `s6/shared.js` (bloom 0.3, con 1.05; slice đã duyệt là 0.4, 1.04) và `dayBright`.
   Danh mục chỉ có `look.finish-s4` và `look.night-bright`.

Thêm: `make` `sparks` (physfx, 4) lúc nổ súng và `ao_anim` (nắp cốp key tay, `allout/fx.js`, 14) không có trong danh mục.

## Checker tìm được không

| Loại | Tìm được? | Cần thêm |
|---|---|---|
| Nét mặt, đạo cụ cầm tay, overlay, `make`, clip key | Có, chính xác | Chạy act trong node như probe (19/19 act nạp được) |
| Module bối cảnh | Có theo đường dẫn | Danh mục cần mục cho `set.js` của phim, hoặc đồ thị import |
| Động tác key tay khi có clip | Một phần | Bảng pose → clip ở đây là suy đoán theo tên. Cần phim ghi `act: '<id>'` cho mỗi động tác. Cần biết thân: 12 key `C_AIM2`, `C_FIRE2`, `C_TAKE` là cảnh sát thân `thin`, clip súng và đưa đồ chỉ có thân `adult`, nên có thể là báo nhầm |
| Di máy | Một phần | Hiện đoán theo chữ trong `why`. Cần `flyCam` và mỗi lớp bọc (`hand`) ghi id phần |
| Look, ánh sáng | Một phần | Grade so được theo giá trị. `nightBright` / `dayBright` là hàm có tham số, cần ghi id preset |
| Nhân vật | Chưa | Danh mục ghi theo file (`cast.sheet`), chưa theo từng spec (YOU, YOU_CAP, COP_THIN, DEALER, TELLER_1-3, CLERK, GUARD) |

Kết luận: chạy act trong node là được. Phần chính xác (mặt, đạo cụ, overlay, hiệu ứng, clip) làm được ngay. Ba phần
(động tác, di máy, look) cần phim tự ghi id phần đang dùng, rồi checker chỉ việc so id với danh mục.
