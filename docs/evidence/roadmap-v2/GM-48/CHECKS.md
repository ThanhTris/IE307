# GM-48 · Kiểm thử và điều kiện review

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `10651dd`. GM-20 đã Done và có bàn giao.

| Ca | Kỳ vọng | Kết quả hiện tại |
| --- | --- | --- |
| Lịch tick và prune | Hai job riêng theo tên, lịch 2 giây và prune mỗi giờ, quyền postgres | Chờ job GM-48 QA trên GitHub |
| Idempotency, rollback, quyền | Chạy lại giữ job IDs, rollback gỡ đúng hai job, không cấp EXECUTE cho ba role client | Chờ job GM-48 QA trên GitHub |
| Fallback, cron-only, overlap | REST/JWT hai người, timeout nhận ballot thật, roster và ACK giữ nguyên | QA macOS dừng trước test tại `QA_HOST_BINDING_NOT_LOOPBACK`, cleanup xong. Chờ Linux QA. |
| Hosted staging | Lịch giây chạy được và kết quả phòng đọc lại qua REST | Chưa chạy, chờ project staging được xác nhận. |

[Handoff và lệnh kiểm](HANDOFF.md). Hồ sơ không ghi khóa, token hoặc phiếu thật.
