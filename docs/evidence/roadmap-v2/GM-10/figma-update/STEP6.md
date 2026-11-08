# Bước6 — route và interface bàn giao

Entry GM-09 nhận callback tới setup. Default mock context/preferences
không có roomId chuyển sang form mới; legacy=1 dành compatibility QA,
roomId/real callers giữ đúng client đã nhận. Layout không seed discovery
hoặc tạo phòng legacy khi chỉ mở setup. Đã có integration tests cho entry
và hai direct link; regression legacy vẫn được giữ.

Danh mục fixture đủ P01–P11/R01–R15 + biên/shortage/unknown/member. Thay
fixture remount sạch, khóa khi intent pending/unknown. Member chỉ đọc form
host, vẫn vào own preferences mà không gửi settings. Receipt giữ handle/
version; sửa và Back trong flow không tạo phòng khác.

Không xóa source còn caller real GM-24/25 hoặc regression. Những lối vào
mock sản phẩm không gắn phiên legacy đã chuyển; không dùng form cũ làm
UI dish-only. Adapter/lobby B thật chưa có, nhận callback/interface ở
[handoff](HANDOFF.md), không giả xong integration hoặc send lời mời thật.

Kiểm toàn mobile44 suites/840 tests Pass123.925s. TypeScript,
ESLint src/tests/scripts, architecture Pass. PNG28 cases Pass; kiểm mới
phát hiện antialias bị lượng tử hóa bởi overload Clamp của PowerShell,
đã dùng double Max/Min và regenerate14 glyphs, giữ nguyên assertions alpha.
Tách dialog shortage để kiểm UI nhỏ và hook transition riêng; không giảm
kiểm available/requested/explicit confirm hoặc tăng timeout.

Python650 Pass/6 skipped/1 lỗi quyền symlink; full lint còn4 import của
file QA local cũ. Chi tiết [CHECKS](CHECKS.md). Native/visual/Expo Go sau sửa
Not run; thực hiện bước7 trước nghiệm thu. Chưa push hoặc tự đổi Project.

Android Hermes export Pass (entry-5d339fe0f6185fa2c67947a081adfef9.hbc),
không thay kiểm thiết bị. Manifest49 source files khớp trước commit.
