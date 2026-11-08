# Bước3 — hẹn giờ và nháp

Picker native không thêm package: ngày/lịch tháng, giờ/phút nhập được,
xác nhận/hủy; UTC+7 độc lập timezone máy, reject ngày normalize/giờ đã qua.
Đổi lịch giữ buổi/số món/ngân sách; picker giữ riêng bản sửa tới xác nhận.
Back khi dirty mở xác nhận bỏ thay đổi; hardware Back được frame xử lý.

Khác Figma: dùng trường giờ/phút native và lịch ngày có nhãn thay wheel,
để nhập chính xác và không thêm native dependency. Native keyboard/font200
chưa kiểm; chưa coi đạt visual parity. Nháp hiện trong bộ nhớ flow, chưa
claim lưu bền qua tắt app hoặc đồng bộ phòng thật.

TypeScript/scoped ESLint Pass; 2 suites/7 tests Pass18.554s, có ngày không
tồn tại, giờ24/phút60, UTC+7 roundtrip và reject quá giờ/confirm/cancel.
