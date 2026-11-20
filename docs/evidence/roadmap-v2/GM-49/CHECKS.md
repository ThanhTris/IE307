# GM-49 — Kiểm xóa tài khoản

Baseline `0174746`. Migration `0064`, schema `0.31.8`. QA owned `gm49-email-1120` ngày 20/11/2026 với Auth, REST, Edge Runtime, Realtime và worker. Email provider được bật trên cấu hình QA riêng để thử tài khoản email.

| Kiểm | Kết quả |
| --- | --- |
| ACL SQL | 9/9 đạt. Chỉ service role gọi RPC chuẩn bị và biên nhận. Anon, authenticated và tài khoản không tồn tại bị từ chối. |
| HTTP qua Edge/GoTrue | 23 assertion đạt. Khách và email xóa được. Host, member trong lobby hoặc đang bầu nhận ACTIVE_ROOM. Token hết hạn, phiên thu hồi và body có userId bị từ chối. Cùng email đăng ký lại được. |
| Giao dịch và retry | Hai request đồng thời có một lần xóa commit. Retry cùng UUID/JWT nhận lại xác nhận. Lỗi SQL chèn trên QA rollback việc dọn hồ sơ. Bỏ lỗi và dùng lại request thì xóa thành công. |
| Dữ liệu và quyền | Xác minh Auth, profile, lịch sử cá nhân và phòng terminal đã dọn. Người còn lại thấy kết quả nhóm có “Thành viên đã xóa”. Outsider không xem được. JWT đã xóa không đọc profile hay nhận version Realtime. JWT hợp lệ nhận được version của cùng lượt kiểm. |
| Log | Edge và runner chỉ xuất nhãn kiểm hoặc mã lỗi. Đối chiếu bằng số đếm cho thấy GoTrue local ghi bốn mục audit `user_deleted` có trường `user_email`. Chính sách lưu audit của Supabase cần xác minh ở GM-52. |

Xem [HANDOFF](HANDOFF.md) để chạy lại. Phạm vi giữ lịch sử và chính sách đối với bản ghi nhóm legacy ghi trong [ADR-029](../../../architecture/decisions/ADR-029-account-deletion.md).
