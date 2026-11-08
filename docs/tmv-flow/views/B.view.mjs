const L = { spark:"Kể ý tưởng: app, người xem", whatif:"8-12 hướng \"what if\"", logline:"Câu tóm tắt + 3 test", title:"Tên series",
  init:"Tạo project truyện + kiểm", initfix:"Kiểm ✗: agent sửa",
  you:"Bạn (You): muốn, sợ, điều tin sai", clash:"Tên trùng", rival:"Đối thủ + nhân vật phụ",
  render3:"Vẽ nhân vật CỦA BẠN ở 3 style", render3fix:"1 style vẽ lỗi", pick:"Chọn 1 style ✨",
  places:"2-3 địa điểm, vẽ đúng style", rules:"Luật thật của ngành bạn, có nguồn", hold:"Chưa có nguồn: giữ lại",
  branches:"Mùa 6 tập, mỗi tập vote 2 hướng", bible:"Bible xong · tiến độ 3/7", next:"→ ④ Kịch bản tập 1" };
const G = { spark:"Ý tưởng", whatif:"Ý tưởng", logline:"Ý tưởng", title:"Ý tưởng", init:"Ý tưởng", initfix:"Ý tưởng",
  you:"Nhân vật", clash:"Nhân vật", rival:"Nhân vật", render3:"Style ✨", render3fix:"Style ✨", pick:"Style ✨",
  places:"Thế giới", rules:"Thế giới", hold:"Thế giới", branches:"Mùa phim", bible:"Mùa phim", next:"Mùa phim" };
const C = { spark:"yellow", whatif:"yellow", logline:"yellow", title:"yellow", init:"teal", initfix:"pink", you:"yellow", clash:"pink",
  rival:"yellow", render3:"teal", render3fix:"pink", pick:"yellow", places:"yellow", rules:"teal", hold:"pink", branches:"yellow", bible:"teal", next:"purple" };
export const state = (v) => [G[v.phase], L[v.phase]];
export const group = (v) => C[v.phase];
export const colors = { teal:"teal", yellow:"yellow", pink:"pink", purple:"purple" };
const S = { SparkTold:"agent viết", WhatIfPick:"chọn 1-3 hoặc gộp", LoglineOk:"ok", TitlePick:"chọn 1", InitBad:"✗", InitFixed:"chạy lại",
  InitOk:"✓", YouClash:"trùng tên", ClashFixed:"đổi tên", YouDone:"xong", RivalDone:"xong · ~1 phút", RenderBad:"lỗi", RenderRetry:"thử lại",
  Render2Left:"lỗi lần 2: còn 2 style", RenderOk:"3 ảnh cạnh nhau", StylePick:"chọn 1", ChangeStyle:"đổi style", PlacesOk:"duyệt",
  RuleNoSource:"thiếu nguồn", HoldResolved:"bạn tự thử / bỏ ý", RulesOk:"đủ nguồn", BranchesOk:"đồng ý", BibleDone:"xong", Done:null };
export const step = (a) => S[a];
