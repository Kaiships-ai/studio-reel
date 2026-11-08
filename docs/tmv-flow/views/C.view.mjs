const L = { hook:"3 hook từ thư viện", research:"2 luật thật cho tập, có nguồn", hold:"Thiếu nguồn",
  write:"Kịch bản từng giây: You, NHƯNG / VÌ VẬY", check:"Máy kiểm: ≤12 từ, nối, nguồn, vote, 80-90 s", panel:"Reader panel 4 người xem",
  voice:"Gemini thu 1 lần cả tập", quota:"Hết quota", align:"Cắt lặng + căn từng từ",
  timeline:"Timeline theo từng từ (≤3 s/cắt)", render:"Render 720p theo đoạn 8 s", crash:"Render dừng giữa chừng",
  gates:"11 gate + agent xem sheet", fix:"Gate trượt: agent sửa shot", safe:"Dùng bộ shot an toàn của style",
  stuck:"Báo khách: lỗi gì, 2 hướng sửa", review:"Bạn xem bản 720p", final:"Full 1080p + kiểm lại", next:"→ ⑤ Đăng" };
const G = { hook:"Ý tập", research:"Ý tập", hold:"Ý tập", write:"Kịch bản", check:"Kịch bản", panel:"Kịch bản",
  voice:"Giọng", quota:"Giọng", align:"Giọng", timeline:"Hình", render:"Hình", crash:"Hình", gates:"Hình", fix:"Hình", safe:"Hình", stuck:"Hình",
  review:"Duyệt", final:"Duyệt", next:"Duyệt" };
const C = { hook:"yellow", research:"teal", hold:"pink", write:"teal", check:"teal", panel:"teal", voice:"teal", quota:"pink", align:"teal",
  timeline:"teal", render:"teal", crash:"pink", gates:"teal", fix:"pink", safe:"pink", stuck:"pink", review:"yellow", final:"teal", next:"purple" };
export const state = (v) => [G[v.phase], L[v.phase]];
export const group = (v) => C[v.phase];
export const colors = { teal:"teal", yellow:"yellow", pink:"pink", purple:"purple" };
export const title = "④ Một tập: kịch bản → giọng → hình → duyệt — vàng: khách · xanh: agent · hồng: sự cố";
const S = { HookPick:"chọn 1", NoSource:"không tìm được", HoldDone:"bạn tự thử / bỏ ý", Sourced:"đủ nguồn", Written:"viết xong",
  CheckFail:"✗ agent sửa", CheckPass:"✓", PanelDrop:"bỏ xem ở giây X", PanelPass:"giữ được người xem",
  Quota:"429", QuotaBack:"reset", Recorded:"xong", VoiceGaps:"lặng > 0,6 s: thu lại", VoiceStuck:"vẫn lặng",
  Aligned:"giọng liền", TLDone:"xong", Crash:"máy dừng", Resume:"chạy tiếp từ đoạn hỏng", Rendered:"xong",
  GateFail:"trượt (≤2 lần)", FixDone:"render lại đoạn đó", GoSafe:"trượt lần 3", SafeRender:"render lại", GateStuck:"vẫn trượt",
  CrashStuck:"dừng lần 3", StuckPick:"bạn chọn hướng", GatesPass:"11/11 ✓",
  EditLine:"sửa câu / sửa truyện", NewStyle:"đổi style (giữ giọng)", Approve:"duyệt", FinalRedo:null, FinalDone:"✓", Done:null };
export const step = (a) => S[a];
