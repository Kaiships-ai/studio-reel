const L = { bought:"Mua, giải nén", trust:"Dán 1 lệnh, Claude hỏi tin thư mục", exited:"Đã thoát", nopixi:"Thiếu pixi",
  sample:"Xem tập mẫu", key:"Tạo key Gemini → .env", waitinst:"Chờ cài xong", doctor:"Doctor kiểm 1 lượt",
  quota:"Hết quota hôm nay", slow:"Không GPU: báo ~1 giờ/tập", help:"Báo đúng dòng lỗi + Discord", mode:"Cook hay từng bước?", story:"→ ② Truyện" };
const G = { bought:"Mở", trust:"Mở", exited:"Mở", nopixi:"Mở",
  sample:"Cài chạy nền (2-4 phút)", key:"Cài chạy nền (2-4 phút)", waitinst:"Cài chạy nền (2-4 phút)", help:"Cài chạy nền (2-4 phút)",
  doctor:"Kiểm máy", quota:"Kiểm máy", slow:"Kiểm máy", mode:"Chọn chế độ", story:"Chọn chế độ" };
const C = { bought:"teal", trust:"yellow", exited:"pink", nopixi:"pink", sample:"teal", key:"yellow", waitinst:"teal", help:"pink",
  doctor:"teal", quota:"pink", slow:"pink", mode:"yellow", story:"purple" };
export const state = (v) => [G[v.phase], L[v.phase]];
export const group = (v) => C[v.phase];
export const colors = { teal:"teal", yellow:"yellow", pink:"pink", purple:"purple" };
export const title = "① Bắt đầu — xanh: agent làm · vàng: khách làm · hồng: sự cố";
const S = { PasteFirst:"dán lệnh", TrustNo:"chọn No", Reopen:"mở lại claude", TrustNoPixi:"chưa có pixi", PixiInstalled:"cài pixi, terminal mới",
  TrustStart:"chọn Yes · bắt đầu cài", AskKey:"agent dẫn từng bước", KeySaved:"khách nói xong", InstallOk:null, InstallFail:null, InstallRetry:null,
  InstallHelp:"cài lỗi lần 2", HelpFixed:"khách làm theo, chạy lại", RunDoctor:"cài xong", KeyBad:"key sai", Quota:"429", QuotaReset:"quota reset",
  NoGpu:"không GPU", SlowOk:"khách đồng ý", AllGood:"tất cả ✓", PickCook:"chọn", PickStep:"chọn", Done:null };
export const step = (a) => S[a];
