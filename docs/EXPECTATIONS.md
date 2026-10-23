# Kỳ vọng của Kai cho Kaiships Studio (dev only, không ship)

Agent đọc file này trước mỗi việc lớn. Kai chỉ sửa file này. Agent tự lên kế hoạch, tự chạy cho tới khi đạt "xong khi",
và chỉ quay lại hỏi Kai những dòng trong **Quyết định chỉ Kai làm được**.

## Đích: v1.6 = bản stable

Người mua tải zip về, gõ `/studio` rồi nói một ý tưởng còn mơ hồ. Studio gợi ý style và dạng nội dung hợp với ý đó.
Người mua chọn, studio làm ra reel hoàn chỉnh kèm caption và cover cho kênh của họ.

| # | Kỳ vọng (người mua thấy gì) | Xong khi (kiểm được) | Trạng thái |
|---|---|---|---|
| E1 | README showcase các style bằng **ảnh do Kai làm**, không phải demo của Lemo | Mỗi style được mời chọn có `styles/<slug>/showcase.jpg` 9:16 cùng một brief ("Ship it."); README chỉ dùng ảnh này | xong (PR #13): 52/52 style |
| E2 | Onboarding: `/studio` → người mua nói ý mơ hồ → studio đối chiếu với các style và đề xuất 2–3 style kèm ảnh → người mua chọn | Ba ý mơ hồ mẫu đều nhận về 2–3 style hợp lý kèm lý do; style được chọn đi thẳng vào bước làm reel | xong (PR #14) |
| E3 | Sau khi chọn style: studio đề xuất input (script, storyboard nếu muốn) và cho chọn mode | Hai mode: **`cook`** (Claude sáng tạo hết cỡ, để show off) và **`direct`** (người mua đưa script/storyboard, Claude làm đúng theo) | xong (PR #14) |
| E4 | Bank dạng nội dung: listicle (thế mạnh), explanation (cần cải thiện), why, education; mở rộng dần | `content-types/<tên>.md`: nhịp, hook, thời lượng, ví dụ; style nào cũng dùng được | xong: 5 dạng (thêm promo) |
| E5 | Output: reel hoàn chỉnh + caption + cover | `films/<slug>/`: MP4 1080×1920, cover, `CAPTION.md`; verify pass | `core/render/reelcheck.mjs` kiểm mọi style; reel risograph đang hoàn thiện làm bằng chứng |
| E6 | Crowsnest và DM: đưa vào waitlist để người mua thấy và muốn (FOMO) | `/studio` và README có mục "Sắp có" kèm link waitlist; `/ig-dm` không còn trong bản bán | README có mục "Coming soon" (Crowsnest), chưa có link; `/ig-dm` vẫn trong Pro, chờ Q2 |
| E7 | v1.6 stable | CI clean-install xanh trên 5 máy; mỗi style được mời chọn qua bài render thử 9:16 từ zip sạch; `/verify` draft pass; CHANGELOG; tag `v1.6` | chưa làm |
| E8 | Kai không phải babysit | Mỗi việc kết thúc bằng PR + bảng kết quả; agent chỉ hỏi các dòng Q | đang áp dụng |

## Thứ tự chạy

1. **Pilot 9:16** (đang chạy): 3 style ở 3 họ khác nhau, đo chất lượng, thời gian, token → chốt cách làm cho 51 style.
2. **Showcase**: chạy cho mọi style qua được pilot; style không lên được 9:16 thì không mời chọn trong v1.6 (vẫn có trong thư viện).
3. **Content-type bank** từ những gì đã chứng minh: listicle (kai-hand-draw, reel63), education (reel65).
4. **Onboarding** trong `/studio` + `/make-reel <style>` với mode `cook` / `direct`.
5. **Waitlist** cho Crowsnest + DM.
6. **Stable**: test render cho các style được mời chọn, 5 máy xanh, tag `v1.6`.

## Quyết định chỉ Kai làm được

| # | Câu hỏi | Đề xuất của agent |
|---|---|---|
| Q1 | Tên mode (**Kai chốt 2026-10-23: `cook` / `direct`**) | `cook` (Claude đi hết cỡ, giống "let him cook") + `direct` (bạn là đạo diễn). Không dùng `studio:flow`: dễ lẫn với `/studio` và không gợi được tinh thần sáng tạo |
| Q2 | Waitlist: link ở đâu (Loops form? trang web?); bản Pro còn gì khi DM chuyển sang waitlist, giá có đổi không | Loops form trên kaiships.ai; Pro giữ $79 với plan, reel, human, caption, viral |
| Q3 | v1.6 mời chọn bao nhiêu style | **Kai chốt 2026-10-23: cả 52** (cả 52 đều lên được 9:16) |

## Không làm lúc này
Crowsnest (waitlist), DM (waitlist), reel 3D cho khách (dev only), đổi giá.

## Cách Kai thêm một kỳ vọng
`Kỳ vọng: <khách thấy gì>. Xong khi: <cái gì kiểm được, nếu nghĩ ra>. Không muốn: <điều Kai ghét, nếu có>.`
