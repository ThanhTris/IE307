# Kế hoạch 8 tuần — đề xuất

6 người, khoảng 2 tháng, Android-first, mục tiêu chi phí dịch vụ 0 trong demo. Tuần tính từ khi nhóm duyệt baseline, chưa gắn ngày deadline khi chưa biết lịch học.

| Tuần | Kết quả cần review | Task chính | Gate |
| --- | --- | --- | --- |
| 1 | PRD/UI/ADR được review; Expo chạy; fixture/catalogue/schema đầu | GM-00..04 | Duyệt policy và kiến trúc trước code phụ thuộc |
| 2 | Guest, security/RLS, home và RPC phòng | GM-05..08 | Guest không đọc phiếu người khác |
| 3 | Phòng chờ và sở thích, engine pure | GM-09..11 | Roster/pool giống nhau trên máy |
| 4 | Submit nguyên tử, UI ba mức, kết quả | GM-12..14 | Demo dọc hai máy từ tạo phòng đến chốt |
| 5 | Vòng hai, no-match, reconnect | GM-15..16 | Không NO winner, không vòng ba, retry ổn định |
| 6 | QR/Maps, contract tests; P1 nếu core ổn | GM-17..20 | P1 không chặn core; đổi tài khoản giữ quyền đúng |
| 7 | Android E2E/a11y, 2/4/8 clients, thử người dùng | GM-21 | Ghi cả phiên thất bại; xử lý blocker |
| 8 | Sửa lỗi, release APK, báo cáo/demo | GM-22 | Reviewer xác nhận DoD |

GM-23/24 (OCR/AI) chỉ mở sau GM-22 nếu còn thời gian; không cam kết trong 8 tuần. Ưu tiên người đã nhường qua các bữa chưa có task triển khai, chỉ là nghiên cứu P2.

## Cắt phạm vi khi trễ

Giữ nguyên P0: private votes, hai vòng, error/reconnect, Android. Dời P1 bạn ăn cùng/tài khoản/history trước khi cắt kiểm thử core. Không hạ bảo mật thành ẩn UI để kịp demo. Không thêm chat/booking/location API.

## Ước lượng

Backlog dùng S/M/L là độ lớn tương đối, không là giờ. GM-06/12/16 có rủi ro cao; kiểm tải theo evidence mỗi tuần. Mỗi người tối đa một task triển khai chính và một review; số task bằng nhau không bảo đảm công bằng giờ.

Demo dọc từ tuần 4, không chờ tuần cuối tích hợp. [Rủi ro](RISK_REGISTER.md), [test plan](../testing/TEST_PLAN.md).
