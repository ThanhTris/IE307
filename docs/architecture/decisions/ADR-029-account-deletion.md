# ADR-029 — Xóa tài khoản

**Trạng thái:** Proposed. Trí review theo GM-49.

Cả khách và tài khoản email tự xóa qua `delete-account`. JWT đã được GoTrue xác thực và phiên phải tồn tại lúc chuẩn bị và lúc xóa. Edge dùng khóa service chỉ ở server. Client chỉ gửi request UUID. Trong phòng chờ hoặc vòng đang chơi, trả `ACTIVE_ROOM`. Người dùng rời hoặc hủy phòng chờ bằng luồng hiện hành, hoặc đợi vòng kết thúc.

GoTrue hard-delete người dùng. Trigger trong cùng giao dịch xóa hồ sơ, quan hệ, lời mời, inbox, thiết bị, consent, khẩu vị, phiếu riêng, ACK và tài liệu lịch sử cá nhân. Dọn phòng đã kết thúc hoặc hết hạn có liên hệ với tài khoản theo thứ tự retention. Link phòng có thể hết hiệu lực sớm. Phòng đang hoạt động của người khác và kết quả lịch sử của người còn quyền được giữ theo ACL và TTL.

Lịch sử nhóm canonical giữ kết quả và quyền của người còn lại. Thay tên đã xóa bằng “Thành viên đã xóa”. Khi roster đã hết hạn, hiển thị tên chung cho các vị trí chưa đối chiếu được. Bản nhóm legacy gói danh tính và quyền xem chung trong một bản ghi được dọn nếu chứa danh tính đã xóa. Bản lịch sử cá nhân của người còn lại giữ TTL hiện hành.

Biên nhận hoàn tất chỉ chứa UUID yêu cầu, hash JWT và hạn của JWT. Thử lại cùng JWT còn hạn chỉ nhận lại xác nhận. Dọn biên nhận khi hết hạn. Edge và bằng chứng QA không ghi token, email hoặc phiếu. Audit log do Supabase quản lý có chính sách riêng cần kiểm khi dựng hosted.
