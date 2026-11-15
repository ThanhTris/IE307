# GM-42 — Kết quả kiểm trên QA

Đã chạy trên Supabase QA `gm4243-pinned`, CLI `2.120.0`, baseline `1e232dc`, migrations `0058` và `0059`. DB và worker chạy cô lập trên loopback. Dữ liệu hoàn toàn synthetic.

| Ca | Expected | Actual |
| --- | --- | --- |
| Phòng 2 và 20 người, tên trùng, đổi tên sau khóa | History trả đúng roster và vai trò tại lúc khóa | Pass qua HTTP. Ca 20 người có 11 ballot. |
| ACL | Outsider không đọc được mục, client và sender không đọc được schema private | Pass qua HTTP và SQL. |
| Consent bật muộn, thu hồi, hết hạn | Lịch sử cá nhân hợp lệ tiếp tục có kết quả và bỏ trường `participants` | Pass qua HTTP và SQL. |
| Xóa và retry | Xóa group snapshot, retry giữ ACK | Pass qua HTTP và SQL. |
| Finalize rollback và race | Chỉ một result, history và outbox, retry không tái tạo lịch sử đã xóa | Pass trong regression producer. |

Suite kết hợp đạt 226 assertion và validate 1.073 envelope. Xem [kết quả từng ca GM-42](qa-results.json) và [cách chạy](HANDOFF.md). Suite Python toàn repo chạy 690 test với hai skip và một lỗi môi trường `WinError 1314` khi test GM-40 tạo symlink.

QA riêng `gm-42-independent` từ `origin/main` đạt 213 assertion và kiểm 1103 envelope. DB chỉ nhận migration của GM-42.
