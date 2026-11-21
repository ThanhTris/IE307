# GM-48 · Kiểm thử và điều kiện review

Owner Tâm, reviewer Trí. Start gate 20/11/2026 trả `READY_TO_CLAIM` trên `10651dd`. Merge checker với `--verify-outputs` trả `READY_FOR_MERGE_REVIEW` lúc 23:32 ICT. GM-20 đã Done và hai merge commit `ad8478d`, `e3f7058` đều có trên target. Gate staging nằm trong bảng bên dưới.

QA dùng Supabase cô lập trên Ubuntu, PostgreSQL 17, guest Auth và REST thật với dữ liệu thử. [Job cron-qa](https://github.com/ThanhTris/IE307/actions/runs/44775999333/job/136425854175) chạy ngày 20/11/2026 trên head `ae753d9` và base `10651dd`.

| Ca | Kỳ vọng | Kết quả hiện tại |
| --- | --- | --- |
| Lịch tick và prune | Hai job riêng theo tên, tick 2 giây dưới quyền postgres, prune mỗi giờ | Pass. Lịch sử ghi nhiều lần chạy thành công; dùng đúng command prune xóa log đã hoàn tất quá hạn. |
| Idempotency, rollback, quyền | Chạy lại giữ job IDs, rollback gỡ đúng hai job; client không gọi được tick | Pass. Cả trước và sau khi cài Cron đều kiểm đồng thời `USAGE` schema và `EXECUTE`. |
| Worker khi thiếu extension | Migration bỏ qua lịch; sau ngưỡng chờ, REST trả DECIDED và cùng ACK | Pass. Dời mốc chờ của riêng phòng thử đến gần hạn để kiểm worker; roster 2, ballot 1. |
| Worker + cron và tick đồng thời | Hai lần gọi tick đồng thời, cùng roster và cùng ACK | Pass. Phòng thử đã quá hạn; REST trả DECIDED, roster 2, ballot 1; replay ACK khớp. |
| Chỉ cron, ngưỡng 60 giây thật | Sau khi dừng worker, cron cập nhật heartbeat và xử lý phòng có người chưa nộp phiếu | Pass. WAITING lúc 16:43:42 UTC, DECIDED đọc được lúc 16:44:44 UTC; roster 2, ballot 1, replay ACK khớp. |
| Hosted staging | Lịch giây chạy được và kết quả phòng đọc lại qua REST | Not run. Chờ project staging được nhóm xác nhận. |

Kiểm bổ sung trên PostgreSQL cô lập với pg_cron 1.6.4 và hai hàm tick thử: scheduler gọi cả hai hàm dưới quyền postgres, với `search_path=pg_catalog`. Prune giữ log của job đối chứng; rollback giữ job đối chứng. Lần Supabase QA trên macOS dừng do cổng loopback và đã cleanup. Lượt Ubuntu chạy toàn bộ bộ kiểm trên.

Regression cục bộ chạy 720 ca, gồm 6 skip theo môi trường. Validator repo, task index và diff đều pass. Evidence commit chỉ cập nhật tài liệu.

[Handoff và lệnh kiểm](HANDOFF.md). Hồ sơ không ghi khóa, token hoặc phiếu thật.
