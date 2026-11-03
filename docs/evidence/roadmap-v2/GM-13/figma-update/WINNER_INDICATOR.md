# GM-13 — phân biệt món đã chốt khi đồng hạng

Ngày2026-11-03, bản sửa sau commit `64af867`, nhánh
`codex/gm-13-figma-update`.

Ảnh Phở mẫu có viền xanh sẵn trong PNG; renderer trước đây còn tô viền
xanh cho mọi rank1. Vì vậy độ đậm giữa ảnh phở và món khác không phản ánh
đúng winner của projection. Món đang tìm quán chỉ lấy từ winner đã chốt.

- Giữ PNG gốc; mock artwork được zoom1.08 trong clip tròn bên trong
  khung, loại viền baked khỏi vùng nhìn thấy. Kích thước khung và alignment
  giữ nguyên; real artwork mặc định scale1. Vinh danh dùng cùng cách crop.
- Viền2px xanh đậm chỉ cho isWinner; các món khác dùng viền trung tính,
  kể cả cùng rank1. Kích thước ảnh/chiều cao bục vẫn theo rank, không theo winner.
- Nhãn “Món được chọn · …” giữ nguyên và thêm “Tìm quán cho: …” ngay
  dưới heading quán trong mọi trạng thái. Có tên món, không chỉ dựa vào màu.
- Không đổi score/rank/winner/policy hoặc biến podium thành bộ chọn món.
  Places/Maps tiếp tục bám resultId/winnerDishId đã chốt. Lỗi quán giữ winner.

Live gate14:22:24Z ngày03/11: READY_TO_CLAIM, không cập nhật Project.

Kiểm:6 suites/63 tests Pass61.965s, TypeScript/lint file sửa Pass0 warnings.
Bao gồm winner Cơm tấm trong nhóm đồng hạng: chỉ cơm tô viền đậm,
caption và Maps target theo cơm; projection nguyên trạng. Các trường hợp
1/2/3 món, ties, lỗi/khôi phục/legacy, shared components và vinh danh đạt.
Architecture, repository validator, task indexes và diff check Pass.
Đã xem diagnostic clipping của ba PNG với Cơm tấm làm winner: cả ba
không còn viền baked, chỉ cơm có viền đậm. Đây là render kiểm asset bằng
System.Drawing, không phải native screenshot hoặc nghiệm thu Expo.

CHECKS.json/SOURCE_MANIFEST.json và bundle bước6 giữ snapshot lịch sử.
Không chạy lại full mobile/Python hoặc native export cho bản vá này.
Người dùng cần tải lại Expo, kiểm các tie/winner/quán/motion trên thiết bị.
Theo yêu cầu hiện hành, commit local sau kiểm đạt; không push.
