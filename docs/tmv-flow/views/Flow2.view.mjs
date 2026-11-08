const L = {
  install: "Cài + dán key", sample: "Xem tập mẫu", premise: "Premise", character: "Nhân vật",
  style: "3 style vẽ nhân vật của bạn", world: "Thế giới theo style", branches: "Nhánh vote",
  script: "Viết tập N", panel: "Reader panel", voice: "Thu giọng", quota: "Chờ quota",
  preview: "Bản 720p + 11 gate", stuck: "Báo khách", review: "Khách xem", final: "Full 1080p",
  pack: "Cover + caption", vote: "Đếm vote", season: "Hết mùa",
};
const G = {
  install: "① Bắt đầu", sample: "① Bắt đầu",
  premise: "② Truyện", character: "② Truyện",
  style: "③ Style + thế giới", world: "③ Style + thế giới", branches: "③ Style + thế giới",
  script: "④ Kịch bản", panel: "④ Kịch bản",
  voice: "⑤ Dựng", quota: "⑤ Dựng", preview: "⑤ Dựng", stuck: "⑤ Dựng",
  review: "⑥ Duyệt", final: "⑥ Duyệt",
  pack: "⑦ Đăng", vote: "⑦ Đăng", season: "⑦ Đăng",
};
export const state = (v) => [G[v.phase], L[v.phase]];
export const group = (v) => G[v.phase];
export const colors = { "① Bắt đầu": "teal", "② Truyện": "purple", "③ Style + thế giới": "pink", "④ Kịch bản": "blue", "⑤ Dựng": "orange", "⑥ Duyệt": "yellow", "⑦ Đăng": "tan" };
export const title = "Luồng khách: từ cài đặt đến cả series";
const S = {
  InstallDone: "xong", PickCook: "chọn: cook hoặc từng bước", PickStep: "chọn: cook hoặc từng bước",
  PremiseChosen: "chọn 1/3", CharacterMade: "tên, muốn, sợ, dáng", StylePicked: "chọn 1/3 ✨",
  WorldBuilt: "duyệt", BranchesAgreed: "đồng ý", WriteScript: "viết xong", PanelFix: "tự sửa",
  PanelPass: "đạt", QuotaOut: "hết quota", QuotaBack: "reset", VoiceDone: "xong",
  GateFix: "tự sửa ≤2", GateStuck: "trượt lần 3", StuckChoice: "bạn chọn hướng", GatesPass: "11/11 đạt",
  ChangeStory: "sửa truyện", ChangeStyle: "đổi style", Approve: "duyệt", FinalDone: "xong",
  CustomerPosts: "bạn tự đăng", NextEpisode: "tập sau", SeasonEnds: "tập cuối", Done: null,
};
export const step = (a) => S[a];
