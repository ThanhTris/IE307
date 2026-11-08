# Bước5 — failure states và UI port

UI port dishSetupGateway nhận own/account defaults, catalogue/friends,
room/settings; không dùng RoomContext, không chạm API/schema/migration.
Mock ở bootstrap, có12 nhóm fixture lỗi/shortage/closed/unknown taxonomy.

Writer khóa đồng bộ trước render chống double submit; UNKNOWN giữ nguyên
requestId/payload, ACK rồi read lỗi chỉ read lại; so room ID/code/version
trước chuyển bước. Phòng closed không lưu, stale phải tải lại, offline
chặn gửi nhưng vẫn giữ/sửa nháp và Back xác nhận. Shortage hiển thị cả
requested/available; chỉ giảm sau xác nhận >=10, dưới10 không tạo phòng.
Có picker bạn tìm kiếm/empty và giữ lựa chọn khi hủy; chưa gửi lời mời thật.

TypeScript/scoped ESLint/architecture Pass; flow suite10 tests Pass15.391s:
shortage/explicit confirmation, below10, intent replay, ACK-read-only retry,
skip+consent, save rejection giữ nháp, stale, offline/closed và double submit.
Tách ca UI shortage với ca hook xác nhận để giữ timeout runner nguyên vẹn;
không tăng timeout hoặc bỏ assertions về requested/available/room version.

Không claim persistence qua restart, API nhiều máy hoặc thiết bị Pass.
Python QA dependencies phù hợp Python3.15 được chuẩn bị riêng trong .work;
không đổi package/lockfile app hoặc cài vào Python global. Regression chạy
khi kiểm bước6; chưa ghi Pass từ việc cài dependency.
