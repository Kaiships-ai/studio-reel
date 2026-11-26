# Hot Money: danh mục (Kai duyệt 17/11)

Sinh từ `tokens.json` và `catalog.json` bởi `node styles/stick-man/bible/catalog.mjs`. Đừng sửa tay file này.

117 token (50 giá trị gốc, 52 theo mục đích, 15 theo thành phần), 4 chỗ trống. 163 thành phần (21 ổn định, 142 thử, 0 bỏ), 20 nằm trong phim, chờ đưa vào kit.

## Clip chuyển động (55)

| id | thân | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `clip.Move_Run_Fwd_Loop` | adult, child, elder, heavy, thin | ổn định | chạy thoát, chạy đuổi (thay cho DASH, C_RUNGUN) | chạy bằng key tay | +S3-013 +S3-003 -S3-002 |
| `clip.Move_Walk_Fwd_Loop` | adult, child, elder, heavy, thin, toddler | thử | đi bộ thường (thay cho walk) | đi bằng key tay khi có clip |  |
| `clip.Move_Sprint_Fwd_Loop` | adult | ổn định | chạy nước rút | dừng gấp không bước hãm | +S3-013 |
| `clip.Act_Jump_Once` | adult | thử | nhảy tại chỗ | lăn nghiêng giữa không trung | -S3-007 |
| `clip.Idle_Stand_Loop` | adult | ổn định | đứng chờ, nghe | đứng như tượng hơn 3 s | +S3-013 |
| `clip.Idle_LookAround_Loop` | adult | thử | dò xét xung quanh (thay cho PEER) | không có lý do trong truyện |  |
| `clip.Gest_Talk_Loop` | adult | thử | nhân vật tự nói | khi chỉ người dẫn chuyện nói |  |
| `clip.Gest_Wave_Loop` | adult | thử | vẫy tay | lặp như tật |  |
| `clip.Trans_SitDown_Once` | adult, elder | ổn định | ngồi xuống | nhảy cóc vào tư thế ngồi; xích với Idle_Sit_Loop trên một ghế (người già: ghế 0.528 m và 0.386 m) | +S3-013 |
| `clip.Idle_Sit_Loop` | adult, elder | thử | ngồi chờ (thay cho SIT_TALL, SIT_LOW, SIT_GUARD) | ngồi im cả cảnh; xích sau Trans_SitDown_Once trên một ghế (người già: ghế 0.386 m và 0.528 m) |  |
| `clip.Trans_StandUp_Once` | adult | thử | đứng dậy | bật dậy không dồn lực |  |
| `clip.Gest_PointSeated_Loop` | adult | thử | ngồi chỉ tay | lặp như tật |  |
| `clip.Act_PickUp_Once` | adult | ổn định | nhặt túi, hộp (thay cho REACH_LOW, HEAVE, HEAVE_UP, HEAVE_LO, HEAVE_SH) | đồ có sẵn trong tay sau cắt | +S3-026 -S3-021 -S3-023 -S3-024 -S3-025 |
| `clip.Move_TurnLeft_Once` | adult | thử | quay trái tại chỗ (thay cho turn) | xoay người trượt chân |  |
| `clip.Trans_LieDown_Once` | adult | thử | nằm xuống | tay chân xuyên giường |  |
| `clip.Idle_Sleep_Loop` | adult | thử | ngủ | giữa cảnh hành động |  |
| `clip.Trans_GetUp_Once` | adult | thử | ngồi dậy từ nằm | bật dậy không dồn lực |  |
| `clip.Trans_JumpWindow_Once` | adult | ổn định | nhảy qua cửa sổ, cầm túi | tay xuyên tường | +S3-017 -S3-019 -S3-016 |
| `clip.Act_Phone_Once` | adult | ổn định | rút, xem điện thoại (thay cho T_PHONE, D_PHONE) | điện thoại hiện ra từ không | +S3-014 |
| `clip.Move_CarryBag_Walk_Loop` | adult | ổn định | đi xách túi nặng | túi nặng như giấy | +S3-014 +S3-022 -S3-018 -S3-039 |
| `clip.Move_PushHeavy_Loop` | adult | thử | đẩy vật nặng | tay không chạm vật |  |
| `clip.Idle_CarryBag_Loop` | adult | ổn định | đứng ôm túi | túi trượt khỏi tay | +S3-014 |
| `clip.Act_PutDown_Once` | adult | ổn định | đặt túi xuống mặt (thay cho PUT, LOWER) | túi lơ lửng khi buông | +S3-026 -S3-021 -S3-039 |
| `clip.React_Startle_Once` | adult | thử | giật mình có nguyên nhân | giật mình vô cớ | -S3-042 -S3-043 |
| `clip.Gest_LookBack_Once` | adult | thử | ngoái lại | lặp mỗi shot |  |
| `clip.Act_PistolShoot_Once` | adult | ổn định | bắn súng ngắn (thay cho C_AIM2, C_FIRE2) | cầm súng như đồ chơi | +S3-014 |
| `clip.Act_TorchReady_Loop` | adult, heavy, thin | thử | cầm đèn pin sẵn (thay cho C_LIGHT) | đèn rung trong tay |  |
| `clip.Act_Drive_Loop` | adult | thử | lái xe | tay rời vô lăng |  |
| `clip.Act_HandOver_Once` | adult | thử | đưa đồ cho người khác (thay cho OFFER, PAY, PAY_OFF, T_TAKE, C_TAKE) | đồ nhảy giữa hai tay |  |
| `clip.Act_Consume_Once` | adult | thử | ăn, uống (thay cho SIT_EAT) | không có đồ trong tay |  |
| `clip.Gest_PhoneCall_Loop` | adult | ổn định | gọi điện | máy rời tai | +S3-014 |
| `clip.Gest_LookBackCarry_Once` | adult | ổn định | ngoái lại khi xách túi | túi đứng yên khi thân quay | +S3-014 |
| `clip.Move_WalkFlashlight_Loop` | adult, heavy, thin | thử | đi soi đèn pin | đèn chỉ lung tung |  |
| `clip.Idle_Breath_Loop` | child, elder, heavy, teen, thin, toddler | thử | đứng thở (thân khác adult) | cho adult (dùng Idle_Stand) |  |
| `clip.Idle_Fidget_Loop` | child | thử | trẻ con đứng không yên: vặn người, đung đưa tay | thân khác child; cảnh cần nó đứng im |  |
| `clip.Gest_LookUp_Once` | * | thử | ngước nhìn | không có gì ở trên |  |
| `clip.Act_DropInTrunk_Once` | * | ổn định | thả túi vào cốp | túi biến mất sau khi thả | +S3-026 -S3-037 -S3-040 |
| `clip.Act_PushBagOutWindow_Once` | * | ổn định | đẩy túi qua cửa sổ (thay cho PUSH_OUT) | túi xuyên khung cửa | +S3-026 |
| `clip.React_Cry_Loop` | adult | thử | đứng khóc, tay ôm mắt | cần thấy rõ mắt suốt clip |  |
| `clip.React_Surprise_Once` | adult | thử | giật mình, tay vung lên, người ngả ra sau | cú sốc kéo dài |  |
| `clip.React_Terrified_Once` | adult | thử | sợ hãi tại chỗ, quay nhìn phía sau | cần bỏ chạy hoặc lùi lại |  |
| `clip.React_SitDisbelief_Once` | adult | thử | ngồi, ngả người ôm đầu không tin nổi | ghế sát tường phía sau |  |
| `clip.Gest_Clap_Loop` | adult | thử | đứng vỗ tay | một tay đang cầm đồ |  |
| `clip.Gest_SitClap_Loop` | adult | thử | ngồi vỗ tay | một tay đang cầm đồ |  |
| `clip.Move_OldWalk_Fwd_Loop` | elder | thử | cụ già lê bước | nhân vật trẻ |  |
| `clip.Idle_Stooped_Loop` | elder | thử | cụ già đứng khom | nhân vật trẻ |  |
| `clip.Gest_SitTalk_Loop` | adult | thử | ngồi nói chuyện, mặt hướng trước | một tay đang cầm đồ |  |
| `clip.Act_Type_Loop` | adult | thử | ngồi gõ phím | không có bàn phím dưới tay |  |
| `clip.Gest_PhoneTalk_Loop` | adult | thử | đứng gọi điện, mặt hướng trước | cần đi lại khi gọi |  |
| `clip.Gest_NodYes_Once` | adult | thử | gật đầu đồng ý | đang nói dài |  |
| `clip.Gest_ShakeNo_Once` | adult | thử | lắc đầu khó chịu | từ chối buồn |  |
| `clip.React_Defeated_Once` | adult | thử | gập người ôm mặt rồi buông xuôi | thua nhẹ |  |
| `clip.Gest_Yawn_Once` | adult | thử | vươn vai ngáp | cảnh gấp |  |
| `clip.Gest_Point_Once` | adult | thử | đứng chỉ tay về trước | ngồi chỉ (có clip riêng) |  |
| `clip.Act_Give_Once` | elder | thử | người già đưa tay ra trao | đưa tay bằng key tay |  |

## Nét mặt (34)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `face.neutral` | neutral | thử | trung tính | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.calm` | calm | thử | bình thản | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.happy` | happy | thử | vui | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.grin` | grin | thử | cười toe | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.closed` | closed | thử | nhắm mắt | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.smug` | smug | thử | đắc ý | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.sly` | sly | thử | ranh mãnh | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.stern` | stern | thử | nghiêm | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.worried` | worried | thử | lo | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.shock` | shock | thử | sốc khi lộ chuyện | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.sleep` | sleep | thử | ngủ | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.manic` | manic | thử | điên cuồng | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.panic` | panic | thử | hoảng | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.blush` | blush | thử | ngượng | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.angry` | angry | thử | giận | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.furious` | furious | thử | giận dữ | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.nervous` | nervous | thử | bồn chồn | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.sad` | sad | thử | buồn | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.cry` | cry | thử | khóc | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.dizzy` | dizzy | thử | choáng | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.confused` | confused | thử | bối rối | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.excited` | excited | thử | phấn khích | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.deadpan` | deadpan | thử | mặc định: nhìn thẳng | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.suspicious` | suspicious | thử | nghi ngờ | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.scream` | scream | thử | hét | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.pain` | pain | thử | đau | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.proud` | proud | thử | tự hào | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.disgust` | disgust | thử | ghê | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.laugh` | laugh | thử | cười lớn | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.skeptic` | skeptic | thử | hoài nghi | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.bored` | bored | thử | chán | không có nguyên nhân; lặp như tật | -S3-042 -S3-043 |
| `face.system.swap` | đổi mặt nhanh, đầu nghiêng, mắt liếc theo cung | ổn định | mọi lần đổi nét mặt | A→B→A trong 0,5 s | +S2-022 |
| `face.system.flat2d` | nét mặt 2D phẳng trên mặt đầu | thử | mọi khuôn mặt | cầu 3D có bóng | +S2-016 -S4-002 -S4-004 |
| `face.set.closed` | bộ mặt ngậm miệng y_* (không há miệng giật) | thử (phim) | mọi nhân vật S1-S7 | há miệng khi người dẫn chuyện nói | +S3-061 |

## Loại shot (15)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `cam.two` | two | thử | hai người | cắt cứng trong cùng một nơi |  |
| `cam.ms` | ms | thử | trung cảnh, mặc định | cắt cứng trong cùng một nơi |  |
| `cam.follow` | follow | thử | đi theo | cắt cứng trong cùng một nơi |  |
| `cam.cu` | cu | thử | cận mặt | cắt cứng trong cùng một nơi |  |
| `cam.insert` | insert | thử | cận đồ vật | cắt insert khi push-in được |  |
| `cam.wide` | wide | thử | toàn cảnh | cắt cứng trong cùng một nơi |  |
| `cam.est` | est | thử | thiết lập nơi chốn | cắt cứng trong cùng một nơi |  |
| `cam.aerial` | aerial | thử | trên cao, chậm | cắt cứng trong cùng một nơi |  |
| `cam.top` | top | thử | từ trên xuống: đồ vật, time-lapse | cắt cứng trong cùng một nơi |  |
| `cam.macro` | macro | thử | cận đồ, xóa phông | cắt cứng trong cùng một nơi |  |
| `cam.low` | low | thử | góc thấp anh hùng (gia vị) | quá 1/8 số góc | -S3-060 |
| `cam.ots` | ots | thử | qua vai | cắt cứng trong cùng một nơi |  |
| `cam.profile` | profile | thử | nghiêng, hai người sát | cắt cứng trong cùng một nơi |  |
| `cam.dutch` | dutch | thử | nghiêng khung, hoảng (gia vị) | quá 1/8 số góc | -S3-060 |
| `cam.punch` | punch | thử | cận giật, cú gag | cắt cứng trong cùng một nơi |  |

## Di máy (4)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `cam.move.flycam` | một cú bay liên tục qua waypoint | thử (phim) | mỗi nơi một cú bay | dừng hoặc giật giữa waypoint | +S3-061 -S3-036 |
| `cam.move.bullet` | máy bay theo viên đạn | thử (phim) | tiếng súng, cao trào | thay cho cú bay chính | +S1-016 +S1-020 |
| `cam.move.solver` | giữ đầu trong khung, push-in, rung va chạm, mờ ống kính | thử | shot kit theo KIND | cắt đầu, góc thấp bó hẹp | -S2-003 -S2-026 |
| `cam.move.camera-pass` | phương pháp camera-pass: đồ thị cường độ, 3 phương án | ổn định | lên kế hoạch máy mỗi shot | bỏ qua khi dựng cảnh mới | +S2-028 |

## Đạo cụ (10)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `prop.object` | đồ vật là vật thể: theo tay, rơi, nằm trên mặt | ổn định | mọi đồ được cầm | đồ hiện, mất, đổi cỡ | +S3-026 -S3-021 -S3-023 -S3-024 -S3-025 |
| `prop.hand.bag` | túi tiền | thử | túi tiền | cầm như đồ chơi | -S3-021 -S3-039 |
| `prop.hand.torch` | đèn pin | thử | đèn pin (thay cho flashlight) | cầm như đồ chơi |  |
| `prop.hand.cash` | xấp tiền | thử | xấp tiền (thay cho bill, s6cash, s6cash2) | cầm như đồ chơi |  |
| `prop.hand.cap` | mũ lưỡi trai | thử | mũ lưỡi trai | cầm như đồ chơi | -S3-051 |
| `prop.hand.pistol` | súng ngắn | thử | súng ngắn (thay cho s5revolver, s5revolver_fire, hm_revolver_lit) | cầm như đồ chơi |  |
| `prop.bag-beat` | đời một túi theo đoạn: nằm, nhấc, ôm, đặt | thử (phim) | túi qua tay | túi mới sau mỗi cắt | +S3-061 -S3-037 -S3-040 |
| `prop.hand.kit` | đồ cầm tay kit (cốc, búa, bút, điện thoại, loa...) | thử | đồ cầm tay có sẵn | cầm như đồ chơi |  |
| `prop.hand.motion` | đồ cầm tay của thư viện chuyển động (túi ôm, thùng, bánh mì) | thử | đồ đi kèm clip | cỡ khác cỡ clip |  |
| `prop.hand.allout` | đồ cầm tay allout, chiếu sáng thật (súng lục, vỉ thuốc, khăn) | thử | đồ cầm tay trong set allout | trộn với đồ có nét mực |  |

## Bối cảnh (13)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `set.motel` | nhà nghỉ | thử (phim) | nhà nghỉ Hot Money | sai tỉ lệ người 1,7 m | +S1-030 -S3-049 |
| `set.interiors` | nội thất | thử (phim) | nội thất Hot Money | sai tỉ lệ người 1,7 m | +S1-030 -S3-049 |
| `set.bank` | ngân hàng | thử (phim) | ngân hàng Hot Money | sai tỉ lệ người 1,7 m | +S1-030 -S3-049 |
| `set.lot` | bãi xe | thử (phim) | bãi xe Hot Money | sai tỉ lệ người 1,7 m | +S1-030 -S3-049 |
| `set.s4-world` | thế giới s4 (phòng 9, lối đi, bãi xe) | thử (phim) | mọi act trong phòng 9, lối đi, bãi xe sau | sửa riêng cho một act (đổi qua setOpts) | +S3-061 |
| `set.s5-world` | thế giới s5 (bãi xe, cửa sổ, cảnh sát) | thử (phim) | cửa sổ phòng 9, xe cảnh sát tới, đạn, xe chạy | sửa riêng cho một act (đổi qua setOpts.s5) |  |
| `set.s6-world` | thế giới s6 (phố, đại lý, ngân hàng, đêm) | thử (phim) | phố, đại lý, ngân hàng, phòng đêm | sửa riêng cho một act (đổi qua setOpts) |  |
| `set.car` | xe | thử (phim) | xe Hot Money | sai tỉ lệ người 1,7 m | +S1-030 -S3-049 |
| `set.grime` | bụi bẩn, ẩm, cũ | thử (phim) | mọi bối cảnh | vân sợi, nhiễu, đốm | +M-001 -S1-025 -S1-027 |
| `set.camblock` | khối va chạm cho máy và người | thử (phim) | mọi cú bay | máy hoặc thân xuyên tường | -S2-002 -S1-002 |
| `set.pieces` | món bày bối cảnh kit (ghế, thùng, đèn, biển...) | thử | đồ bày nền | món mới tinh, sạch bóng |  |
| `set.allout-kit` | bộ dựng phòng allout (phòng, cửa sổ, nhãn) | thử | dựng phòng, cửa sổ | tường không có bề mặt |  |
| `set.glb` | bối cảnh từ gói glb | thử | set dựng từ asset | asset không qua toon |  |

## Nhân vật (6)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `cast.sheet` | mỗi nhân vật một model sheet | thử (phim) | mọi nhân vật chính | ba phiên bản "you" | -S1-023 |
| `cast.extras` | người qua đường kit | thử | đám đông, người qua | thay nhân vật chính |  |
| `cast.hoodie` | áo hoodie từ bản vải Blender | ổn định | áo của "you" | nhiễu, tua, mép răng cưa | +S1-022 +S1-026 -S1-025 -S1-027 |
| `cast.hood` | mũ trùm của phim | thử (phim) | mũ trùm trên đầu | mũ nổi trên sọ | +S1-022 -S1-021 |
| `cast.hair` | tóc, mũ kit (mũ lưỡi trai, mũ bảo vệ, tóc xoăn, lưỡi trai che) | thử | đặt dáng nhân vật | mũ xuyên mũ trùm |  |
| `cast.bodies` | năm thân của thư viện chuyển động | thử | mỗi nhân vật một thân | clip thân adult cho thân khác |  |

## Bộ xương (2)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `rig.skeleton` | bộ xương, thân, tay | ổn định | mọi nhân vật | gập khớp không có thật | +S2-021 +S2-020 |
| `rig.motion` | phát chuyển động 12 nguyên tắc | ổn định | mọi track | key tay thay clip | +S2-014 +S2-021 |

## Phụ đề (2)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `caption.word` | phụ đề từng từ (mode word) | thử | mọi lời dẫn | quá 3 từ, kể hành động bằng chữ |  |
| `caption.chunk` | phụ đề cụm 1-3 từ (mặc định) | thử | lời dài, nhịp chậm | quá 3 từ |  |

## Thẻ 2D (6)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `card.explain-panel` | thẻ giải thích 2D trong ô, khớp từ | thử (phim) | một thẻ một lúc, cạnh phụ đề | phụ đề + đồng hồ + thẻ cùng lúc | +S3-065 -S2-017 |
| `card.overlay.text` | chữ trên hình | thử | chữ trên hình | thêm khối chữ thứ ba |  |
| `card.overlay.loupe` | kính lúp | thử | kính lúp | thêm khối chữ thứ ba |  |
| `card.overlay.arrows` | mũi tên | thử | mũi tên | thêm khối chữ thứ ba |  |
| `card.overlay.meter` | đồng hồ đo | thử | đồng hồ đo | thêm khối chữ thứ ba |  |
| `card.overlay.path` | đường đi | thử | đường đi | thêm khối chữ thứ ba |  |

## Hiệu ứng trong cảnh (12)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `fx.rays` | tia sáng | thử | tia sáng trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.flow` | dòng chảy | thử | dòng chảy trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.shimmer` | hơi nóng | thử | hơi nóng trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.cutbox` | cắt lộ bên trong | thử | cắt lộ bên trong trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.callout` | vòng chỉ + nhãn | thử | vòng chỉ + nhãn trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.bars` | cột so sánh | thử | cột so sánh trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.split` | chia đôi | thử | chia đôi trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.stamp` | dấu đóng | thử | dấu đóng trong thế giới 3D | che mặt quá 0,3 s |  |
| `fx.phys` | hiệu ứng vật lý kit: tia lửa, khói, nổ, nứt, vỡ | thử | đạn trúng, va chạm, khói | che mặt nhân vật |  |
| `fx.story` | đạo cụ truyện động (story.js) | thử | đạo cụ kể chuyện có chuyển động | đạo cụ không có trong cảnh |  |
| `fx.ao-anim` | prop bối cảnh tự chuyển động theo key (allout) | thử | nắp cốp, vật trong set chuyển động | chuyển động không theo frame |  |
| `fx.make-kit` | hiệu ứng kit: túi sáng, bột, tiền bay, sao nổ, giọt, đồng hồ, sóng radio | thử | nhịp truyện cần hiệu ứng | thay cho hành động thật |  |

## Ánh sáng, màu (4)

| id | tên | trạng thái | dùng khi | không bao giờ | Kai |
|---|---|---|---|---|---|
| `look.night-bright` | đêm sáng: key ấm, bóng nâng, sương | thử (phim) | mọi cảnh đêm | khung tối dưới luma 70 | +S3-061 -S4-005 |
| `look.finish-s4` | grade của slice đã duyệt | thử (phim) | mọi act | grade riêng mỗi act | +S3-061 |
| `look.toon-stage` | toon, nét mực, grade sân khấu | thử | mọi khung | vân sợi, nhiễu |  |
| `look.colour-script` | kịch bản màu A | thử (phim) | màu từng cảnh | một màu bão hòa phủ khung | +S1-029 +S2-019 -S3-052 |

## Token: giá trị gốc (50)

| tên | giá trị | đơn vị | dùng khi | gốc | nguồn | trạng thái |
|---|---|---|---|---|---|---|
| `color.ink.plum` | [0.018, 0.014, 0.017] | rgb-linear | nét mực, mắt, miệng | R3 | kit-gate S4-002 S4-004 | ổn định |
| `color.white` | #FFFFFF | hex | chữ phụ đề | R3 | measured | ổn định |
| `color.black` | #000000 | hex | viền chữ phụ đề | R3 | measured | ổn định |
| `color.amber` | [1, 0.5, 0.14] | rgb-linear | đèn đường đêm | R3 | kai S3-061 | thử |
| `color.warm` | [1, 0.8, 0.56] | rgb-linear | đèn ấm trong phòng | R3 | kai S3-061 | thử |
| `color.police.red` | [1, 0.07, 0.04] | rgb-linear | đèn cảnh sát đỏ | R3 | kai S3-061 | thử |
| `color.police.blue` | [0.14, 0.26, 1] | rgb-linear | đèn cảnh sát xanh | R3 | kai S3-061 | thử |
| `luma.rick.prison` | 131 | luma-0-255 | mốc sáng Rick | R3 | measured | ổn định |
| `luma.rick.western` | 111 | luma-0-255 | mốc sáng Rick | R3 | measured | ổn định |
| `luma.rick.emperor` | 112 | luma-0-255 | mốc sáng Rick | R3 | measured | ổn định |
| `luma.100` | 100 | luma-0-255 | mức sáng | R3 | measured | ổn định |
| `luma.135` | 135 | luma-0-255 | mức sáng | R3 | measured | ổn định |
| `luma.70` | 70 | luma-0-255 | ngưỡng tối | R3 | measured | ổn định |
| `lens.mm.18` | 18 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.20` | 20 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.22` | 22 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.26` | 26 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.28` | 28 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.30` | 30 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.38` | 38 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.40` | 40 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.44` | 44 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.48` | 48 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `lens.mm.55` | 55 | mm | tiêu cự | R4 | kit-gate | ổn định |
| `height.adult` | 1.7 | m | người lớn chuẩn | R2 | kai S3-049 | ổn định |
| `height.door` | 2 | m | cửa ra vào | R2 | kai S3-049 | ổn định |
| `dur.f.0` | 0 | frames | không lần nào | R1 | kai S3-037 S3-025 | ổn định |
| `dur.f.4` | 4 | frames | thời lượng | R3 | judgement | ổn định |
| `dur.f.6` | 6 | frames | thời lượng | R3 | judgement | ổn định |
| `dur.f.9` | 9 | frames | 0,3 s | R3 | kai S3-044 S3-051 S3-052 | ổn định |
| `dur.f.14` | 14 | frames | 0,45 s rơi 1 m | R1 | kit-gate | ổn định |
| `dur.f.15` | 15 | frames | 0,5 s | R1 | kai S3-033 S3-042 S3-043 | ổn định |
| `dur.f.30` | 30 | frames | 1 s | R5 | measured | ổn định |
| `dur.f.40` | 40 | frames | thời lượng | R3 | kit-gate | ổn định |
| `dur.f.60-120` | 60-120 | frames | 2-4 s | R4 | measured | ổn định |
| `dur.f.90` | 90 | frames | 3 s | R5 | measured | ổn định |
| `dur.f.330` | 330 | frames | 11 s | R4 | measured | ổn định |
| `dur.f.450` | 450 | frames | 15 s đầu | R5 | measured | ổn định |
| `dur.f.18-40` | 18-40 | frames | lướt máy | R4 | kit-gate | ổn định |
| `size.px.74` | 74 | px@1080 | cỡ chữ | R3 | kit-gate | ổn định |
| `size.px.8` | 8 | px@1080 | viền chữ (đo được 7) | R3 | kit-gate | ổn định |
| `weight.900` | 900 | font-weight | độ đậm chữ | R3 | kit-gate | ổn định |
| `count.3` | 3 | count | số đếm | R3 | kit-gate | ổn định |
| `count.14` | 14 | chars | số ký tự | R3 | kit-gate | ổn định |
| `deg.25` | 25 | deg/frame | tốc độ khớp | R1 | kit-gate | ổn định |
| `mm.1` | 1 | mm/frame | trượt chân | R1 | kit-gate | ổn định |
| `m.0.04` | 0.04 | m/frame | dịch hông cân bằng | R1 | kit-gate | ổn định |
| `m.0.02` | 0.02 | m | lệch tay cầm | R2 | kit-gate | ổn định |
| `m.0.01` | 0.01 | m | xuyên thân / trễ đồ | R1 | kit-gate | ổn định |
| `accel.g` | 9.8 | m/s2 | trọng lực | R1 | kit-gate | ổn định |

## Token: theo mục đích (52)

| tên | giá trị | đơn vị | dùng khi | gốc | nguồn | trạng thái |
|---|---|---|---|---|---|---|
| `format.frame` | 1080x1920@30 | px@fps | mọi reel | R3 | judgement | ổn định |
| `luma.film.mean` | 100-135 | luma-0-255 | trung bình cả phim (chỉ tham khảo, không còn là cổng: Kai 22/11 chọn look A, sáng-tối theo từng cảnh trong colour-script.json) | R3 | measured | thử |
| `luma.second.p10.min` | luma.70 = 70 | luma-0-255 | p10 mỗi giây (chỉ tham khảo, không còn là cổng: Kai 22/11 chọn look A, sáng-tối theo từng cảnh trong colour-script.json) | R3 | measured | thử |
| `luma.dark.threshold` | luma.70 = 70 | luma-0-255 | giây tối là dưới mức này (chỉ tham khảo, không còn là cổng: Kai 22/11 chọn look A, sáng-tối theo từng cảnh trong colour-script.json) | R3 | measured | thử |
| `luma.dark.share.max` | 0.15 | share-of-runtime | giây tối tối đa (chỉ tham khảo, không còn là cổng: Kai 22/11 chọn look A, sáng-tối theo từng cảnh trong colour-script.json) | R3 | measured | thử |
| `light.face.night` | trống | luma-0-255 | TRỐNG: TOKENS.md chỉ nói "trắng ngà, không tối hơn nền", chưa có số luma | R3 | kai S3-051 | thử |
| `light.night.preset` | nightBright | preset | cảnh đêm | R3 | kai S3-061 M-001 | thử |
| `palette.signature` | color.amber = [1, 0.5, 0.14] | rgb-linear | màu chữ ký của phim (colour-script.json palette.signature: warm) | R3 | kai | ổn định |
| `palette.offColor` | color.police.blue = [0.14, 0.26, 1] | rgb-linear | màu lệch duy nhất (colour-script.json palette.offColor: cool) | R3 | kai | ổn định |
| `palette.flood.max` | trống | share-of-frame | TRỐNG: "phần lớn khung" chưa có % | R3 | kai S3-052 | thử |
| `cut.hard.perMinute` | 1 | per-minute | nhịp cắt cứng | R4 | measured | ổn định |
| `cut.hard.perMinute.max` | 2 | per-minute | trần cắt cứng | R4 | measured | ổn định |
| `cut.hard.where` | change of place or time | rule | chỉ cắt khi đổi nơi/giờ | R4 | measured S3-036 | ổn định |
| `view.change.interval` | dur.f.60-120 = 60-120 | frames | đổi góc bằng máy bay | R4 | measured | ổn định |
| `view.hold.max` | dur.f.330 = 330 | frames | giữ một góc tối đa | R4 | measured | ổn định |
| `camera.height.default` | -5-15 | deg-elevation | tầm mắt, mặc định | R4 | kai S3-060 | ổn định |
| `camera.height.metres` | trống | m | TRỐNG: TOKENS.md chỉ cho góc ngẩng, không cho mét | R4 | inferred | thử |
| `camera.lowAngle.share.max` | 0.125 | share-of-views | góc thấp tối đa 1/8 | R4 | kai S3-060 | ổn định |
| `camera.headroom.min` | 0.04 | share-of-height | đỉnh đầu dưới mép trên | R4 | kit-gate | ổn định |
| `camera.move.peak` | 90 | px/frame@1080 | đỉnh tốc độ di máy | R4 | kit-gate | ổn định |
| `camera.move.glide` | dur.f.18-40 = 18-40 | frames | vào/ra một cú lướt | R4 | kit-gate | ổn định |
| `subject.size.close` | 0.4-0.65 | share-of-height | người trong MS/CU | R3 | inferred | ổn định |
| `subject.size.wide` | 0.1-0.15 | share-of-height | người trong toàn cảnh | R3 | inferred | ổn định |
| `subject.wide.handover` | dur.f.40 = 40 | frames | toàn cảnh phải chuyển | R3 | inferred | ổn định |
| `face.size.close` | 0.25-0.35 | share-of-width | mặt cận | R3 | inferred | ổn định |
| `face.cover.max` | dur.f.9 = 9 | frames | mặt bị che tối đa | R3 | kai S3-044 S3-051 S3-052 | ổn định |
| `face.change.interval` | dur.f.60-120 = 60-120 | frames | đổi nét mặt theo nhịp truyện | R2 | inferred | ổn định |
| `face.flicker.window` | dur.f.15 = 15 | frames | không A→B→A trong khoảng này | R1 | kai S3-033 S3-042 S3-043 | ổn định |
| `face.swap.frames` | 4 | frames | đổi mặt nhanh rồi giữ | R1 | kai S2-022 | thử |
| `head.ratio` | 0.3 | share-of-figure | đầu so với thân | R3 | inferred | ổn định |
| `prop.pop.frames` | dur.f.0 = 0 | frames | đồ vật hiện/mất | R1 | kai S3-037 S3-040 | ổn định |
| `prop.size.change` | 0 | percent | kích thước đồ vật | R1 | kai S3-021 | ổn định |
| `prop.fall.gravity` | accel.g = 9.8 | m/s2 | đồ rơi khi buông | R1 | kit-gate | ổn định |
| `prop.fall.frames` | dur.f.14 = 14 | frames | rơi 1 m | R1 | kit-gate | ổn định |
| `prop.follow.slack` | m.0.01 = 0.01 | m | đồ theo tay | R1 | kai S3-023 S3-024 | ổn định |
| `grip.offset.max` | m.0.02 = 0.02 | m | tay trên đồ cầm | R2 | kai S3-039 S3-018 | ổn định |
| `body.through.max` | m.0.01 = 0.01 | m | đồ xuyên thân | R2 | kit-gate | ổn định |
| `passthrough.frames` | dur.f.0 = 0 | frames | xuyên tường/thân | R1 | kai S1-002 S2-002 S3-019 | ổn định |
| `motion.joint.max` | deg.25 = 25 | deg/frame | khớp trong clip | R1 | kit-gate | ổn định |
| `motion.join.joint.max` | motion.joint.max = 25 | deg/frame | khớp qua chỗ nối clip | R1 | inferred | ổn định |
| `motion.foot.slide.max` | mm.1 = 1 | mm/frame | chân trụ | R1 | kit-gate | ổn định |
| `motion.balance.pelvis.max` | m.0.04 = 0.04 | m/frame | giải cân bằng | R1 | kit-gate | ổn định |
| `scale.adult` | height.adult = 1.7 | m | thước đo cảnh | R2 | kai S3-049 | ổn định |
| `scale.door` | height.door = 2 | m | cửa | R2 | kai S3-049 | ổn định |
| `scale.effect` | trống | m | TRỐNG: "đúng cỡ thật" chưa có bảng số | R2 | kai S3-049 S3-066 | thử |
| `hook.frames` | dur.f.30 = 30 | frames | sự kiện đậm trong giây đầu | R5 | measured | ổn định |
| `opening.views` | 7-8 | views-per-450f | 15 s đầu | R5 | measured | ổn định |
| `dead.stretch` | dur.f.90 = 90 | frames | đoạn đứng yên đáng xem lại | R5 | measured | ổn định |
| `busy.min` | 0.0025 | busy.tsv | ngưỡng chuyển động | R5 | inferred | ổn định |
| `repeat.shots.max` | 2 | shots | lặp mặt/động tác/góc | R5 | kai S3-060 | ổn định |
| `action.coverage` | 1 | share | hành động kịch bản lên hình | R5 | kai S1-003 S3-034 | ổn định |
| `text.blocks.max` | 2 | blocks | phụ đề + tối đa 1 thẻ | R3 | kai S3-065 | ổn định |

## Token: theo thành phần (15)

| tên | giá trị | đơn vị | dùng khi | gốc | nguồn | trạng thái |
|---|---|---|---|---|---|---|
| `caption.size` | size.px.74 = 74 | px@1080 | phụ đề | R3 | measured | ổn định |
| `caption.weight` | weight.900 = 900 | font-weight | phụ đề | R3 | measured | ổn định |
| `caption.stroke` | size.px.8 = 8 | px@1080 | phụ đề | R3 | measured | ổn định |
| `caption.fill` | color.white = #FFFFFF | hex | phụ đề | R3 | measured | ổn định |
| `caption.strokeColor` | color.black = #000000 | hex | phụ đề | R3 | measured | ổn định |
| `caption.words.max` | count.3 = 3 | words | phụ đề | R3 | measured | ổn định |
| `caption.chars.max` | count.14 = 14 | chars | phụ đề | R3 | kit-gate | ổn định |
| `caption.y` | 0.7 | share-of-height | tâm phụ đề | R3 | measured | ổn định |
| `card2d.slot.y` | 0.44-0.63 | share-of-height | ô thẻ giải thích 2D | R3 | kai S3-065 | thử |
| `card2d.lead` | dur.f.4 = 4 | frames | thẻ hiện sớm hơn từ | R3 | kai S3-065 | thử |
| `card2d.exit` | dur.f.6 = 6 | frames | thẻ thoát | R3 | kai S3-065 | thử |
| `camera.kind.ms.lens` | lens.mm.30 = 30 | mm | shot ms | R4 | kit-gate | ổn định |
| `camera.kind.cu.lens` | lens.mm.38 = 38 | mm | shot cu | R4 | kit-gate | ổn định |
| `camera.kind.wide.lens` | lens.mm.26 = 26 | mm | shot wide | R4 | kit-gate | ổn định |
| `camera.kind.low.lens` | lens.mm.18 = 18 | mm | shot low (gia vị) | R4 | kit-gate | ổn định |

Ký hiệu: `+S3-013` là Kai khen, `-S3-002` là Kai chê (id trong kai-taste). "(phim)" là phần nằm trong `films/`, chưa vào kit.
