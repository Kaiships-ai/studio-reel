const L = { cover:"3 cover từ khung đẹp nhất", caption:"Caption + comment ghim (cách vote, hạn)", capfix:"Máy kiểm chữ ✗", when:"Gợi ý giờ đăng",
  posted:"Bạn tự đăng", wait:"Chờ 24 giờ · đếm ngược", paste:"Bạn dán comment", count:"Máy đếm: 1 người 1 phiếu", few:"Ít phiếu (< 10)",
  count2:"Đếm với số phiếu đang có", result:"Kết quả: A hay B (hoà → A)", recap:"Thẻ PREVIOUSLY + câu tóm", next:"→ ④ Tập N+1 theo nhánh thắng",
  season:"Tập cuối: reel tổng kết mùa", end:"Hết mùa: mở mùa 2?" };
const G = { cover:"Gói đăng", caption:"Gói đăng", capfix:"Gói đăng", when:"Gói đăng", posted:"Đăng", wait:"Vote", paste:"Vote", count:"Vote",
  few:"Vote", count2:"Vote", result:"Vote", recap:"Tập sau", next:"Tập sau", season:"Hết mùa", end:"Hết mùa" };
const C = { cover:"yellow", caption:"teal", capfix:"pink", when:"teal", posted:"yellow", wait:"teal", paste:"yellow", count:"teal", few:"pink",
  count2:"teal", result:"teal", recap:"teal", next:"purple", season:"teal", end:"yellow" };
export const state = (v) => [G[v.phase], L[v.phase]];
export const group = (v) => C[v.phase];
export const colors = { teal:"teal", yellow:"yellow", pink:"pink", purple:"purple" };
export const title = "⑤ Đăng + vote + tập sau — vàng: khách · xanh: agent · hồng: sự cố";
const S = { CoverPick:"chọn 1", CapBad:"✗", CapFixed:"agent sửa", CapOk:"✓", YouPost:"bạn đăng (agent không đăng)", LinkGiven:"bạn dán link",
  VoteCloses:"hết giờ", Pasted:"dán xong", FewVotes:"ít phiếu", Extend:"thêm 24 giờ (1 lần)", KeepGoing:"đi tiếp", Counted:"xong",
  NextEp:"còn tập", RecapDone:"xong", LastOne:"tập cuối", SeasonDone:"xong", Done:null };
export const step = (a) => S[a];
