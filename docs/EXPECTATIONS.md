# Kỳ vọng của Kai cho Kaiships Studio (dev only, không ship)

Agent đọc file này trước mỗi việc lớn. Kai chỉ sửa file này; agent tự nghĩ cách làm, tự chạy tới khi "xong khi" đạt,
và chỉ quay lại với Kai cho các dòng trong **Quyết định chỉ Kai làm được**.

## Sản phẩm là gì
Người mua tải zip, mở bằng Claude Code, gõ một lệnh, và nhận video hoàn chỉnh về chủ đề của họ, theo style họ chọn trong 52 style.

## Kỳ vọng

| # | Kỳ vọng (người mua thấy gì) | Xong khi (kiểm được) | Trạng thái |
|---|---|---|---|
| E1 | Workflow hợp lý cho cả 52 style, không chỉ hand-draw: khách biết có style gì, chọn một, ra film | `/studio` và `/make-reel` cho chọn style; mỗi style được mời chọn đều render được từ một zip sạch (test tự động) | chưa làm, chờ quyết định Q1 |
| E2 | Show off các style | README có gallery poster của 52 style (PR #11); mỗi style có link xem demo video | gallery xong (PR #11); video demo chưa có |
| E3 | Cài được trên macOS, Windows, Linux không cần admin | CI clean-install xanh trên 5 máy cho mỗi tag `v*` | xong (v1.5) |
| E4 | Kai không phải babysit | Mỗi việc kết thúc bằng PR + bảng kết quả (việc · output · bằng chứng · trạng thái); agent chỉ hỏi Kai các dòng Q bên dưới | đang áp dụng |

## Quyết định chỉ Kai làm được

| # | Câu hỏi | Đề xuất của agent |
|---|---|---|
| Q1 | 51 style kia hiện là phim **ngang 16:9** (chỉ kai-hand-draw là reel dọc 9:16). Với khách, chúng là gì? A) reel dọc cho Instagram: chuyển từng style sang 9:16 · B) phim ngang (YouTube, landing page) giữ nguyên · C) B ngay, rồi chuyển dần 5–10 style hợp reel nhất sang 9:16 | C: khách dùng được cả 52 ngay, và reel dọc mở rộng theo style bán chạy |
| Q2 | Bản Starter có bao nhiêu style? (D4 trong kế hoạch v1.5) | sau E1: Starter = các style qua test zip sạch mà không cần gói tải thêm |
| Q3 | Video demo của từng style để ở đâu? (git không chứa MP4) | GitHub Releases của repo + link từ gallery |

## Không làm lúc này
Crowsnest (D6), reel 3D cho khách (dev only), đổi giá.

## Cách Kai thêm một kỳ vọng
Một dòng là đủ, agent tự viết phần còn lại:
`Kỳ vọng: <khách thấy gì>. Xong khi: <cái gì kiểm được, nếu nghĩ ra>. Không muốn: <điều Kai ghét, nếu có>.`
