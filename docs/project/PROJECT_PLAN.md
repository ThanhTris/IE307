# Tiến độ 8 tuần — baseline tài liệu v0.2

2026-10-07. 6 người, Android-first, mục tiêu chi phí demo gần 0. GM-00 đã được Trí duyệt; W1 bắt đầu khi nhóm chốt người nhận và môi trường GM-01. Chưa có ngày bắt đầu/hạn môn học nên hạn task là tuần tương đối. Tài liệu đã soạn, app/API chưa triển khai; không coi ngày hôm nay là W1 hoặc tiến độ code.

## Mốc và điều kiện hoàn tất

| Tuần | Đầu ra review | Task dự kiến | Gate |
| --- | --- | --- | --- |
| W1 | Review PRD/spec/ADR/policy/privacy; Expo development build và spike native | GM-00/01, bắt đầu 03/04 | Chốt dependency, môi trường/credentials push, loại lỗi hạ tầng sớm |
| W2 | Catalogue/giá/ảnh, schema, UI primitives, guest/RLS nền | GM-02..06 | Data có nguồn; user A/host không đọc phiếu B; migration thật |
| W3 | Create/join/lobby/context 2 máy, engine v2/fixtures | GM-07..11 | Roster/pool giống nhau; category mềm, ready reset; engine không NO winner |
| W4 | Submit → card double-tap → hai vòng/tier; kết bạn/inbox | GM-12..15, GM-17 | Demo dọc 4 máy; một resultId; accept invite không tự ready |
| W5 | Cache/outbox/reconnect và remote push mời/kết quả | GM-16/25 | Kill/restart/lost ACK/stale vote đạt; pending khác ACK; push thật |
| W6 | History consent/chống lặp; QR/link/location/review integration | GM-18/20 | Consent/group ACL/TTL, cold-warm link, location deny/browser fallback |
| W7 | Regression, a11y 2/4/8 máy và >=5 nhóm pilot | GM-19/21 | Critical/blocker được sửa; không dùng HTML làm native evidence |
| W8 | Freeze, APK, demo và báo cáo | GM-22 | Independent DoD, evidence + giới hạn + chi phí, không tự publish store |
| Sau W8 nếu còn | Account/recovery/history sync, venue pilot, OCR/AI | GM-26/27 P1; GM-23/24 P2 | GM-22 review đạt; không chặn đồ án core |

Mốc tuần là mục tiêu, dependency task có quyền ưu tiên hơn lịch. GM-08/RLS nền được nghiệm thu theo AC nền; tích hợp history/notification/outbox có AC riêng và cổng regression cuối. Không yêu cầu mọi tính năng backend có từ task nền rồi tạo vòng dependency.

## Đường găng và phối hợp

GM-00 → GM-04/05/06 → GM-08 → GM-09/10 → GM-12/13/14/15 → GM-16 → GM-19/21 → GM-22. Catalogue/engine chạy nhánh riêng sau GM-00. GM-17 → GM-25 và GM-18/20 cần xong trước GM-19/21. UI có thể thiết kế mock trước, nhưng task tích hợp chỉ review đạt khi API dependency thật đã duyệt.

Trí tập trung RPC/security/sync; Tâm schema/history; Trung identity/friends/push; Tuấn Expo/lobby/result/QR-links; Trang primitives/context/card; Vinh catalogue/engine/regression/QA. Cân tải hàng tuần, một task chính/người, reviewer có thời gian thật. 23 P0 có nhiều task L, cần spike sớm và phạm vi hẹp; không bảo đảm xong chỉ vì đã chia đủ task.

## Theo dõi mỗi tuần

Mỗi thành viên cập nhật đã làm/còn lại/blocker/file/test/evidence trên task; chỉ xác nhận in-progress khi nhận việc. Reviewer ghi quyết định có ngày. Báo cáo checkpoint gồm milestone đạt/chưa đạt, blocker owner, quota/chi phí thực, demo native ngắn. Không dùng % tự ước lượng thay số AC/evidence. Lịch ngày cụ thể chờ ngày khởi động/hạn môn học.

## Cắt phạm vi nếu trễ

Dời P1/P2 trước: account nâng cao, venue radius, OCR/AI. Core vẫn giữ transaction/RLS, NO/hai vòng, basic realtime/outbox, QR/link, avatar/inbox, minimal history và push hai event. Nếu phải giảm core, chủ dự án chốt thay đổi scope và ghi ADR/thông báo giảng viên; không tự bỏ test hoặc giả push bằng local notification. Gợi ý giao diện chỉ dùng ảnh/icon có quyền và giá nullable, không xây kho quán cả nước.

[Task summary](TASK_SUMMARY.md) · [backlog](../../tasks/backlog/MASTER_BACKLOG.md) · [risk](RISK_REGISTER.md) · [test](../testing/TEST_PLAN.md).
