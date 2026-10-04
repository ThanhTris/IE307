# Definition of Done — Manabi

Task chỉ được chuyển từ `tasks/review` sang `tasks/done` khi **mọi mục áp dụng** dưới đây có evidence trong task và reviewer khác owner đã chấp thuận. AI thực hiện không tự xác nhận review.

- Acceptance criteria được kiểm tra từng mục; quyết định và giới hạn còn lại được ghi rõ.
- Code build, lint/typecheck và test liên quan đạt nếu task có code. Task chỉ sửa tài liệu cần kiểm liên kết, tính nhất quán và phạm vi, không giả vờ có build/test app.
- Không còn lỗi blocker/critical do task tạo ra. Có trạng thái rỗng, lỗi, loading và fallback offline nếu là UI/network flow.
- UI có kiểm tra safe area, font scaling, accessibility label/state, dark mode và layout compact/medium/expanded theo thiết bị mục tiêu.
- Thay đổi schema/persistence có version, migration/rollback hoặc đường nâng cấp, fixture và test tái lập; thay đổi SRS/game có test idempotency và trường hợp biên.
- Backend có kiểm tra auth/RLS, quyền deck, quota và xử lý lỗi; không lộ secret. Dữ liệu gửi dịch vụ ngoài có consent và tối thiểu hóa.
- Task **bật quiz AI cho người dùng** cần provenance/version, kiểm một đáp án đúng và ba nhiễu, từ chối câu mơ hồ, bộ đánh giá độc lập và thống kê failure cases. Task bật tác động quiz lên SRS phải qua shadow mode và review policy.
- Task **phát bài tập ảnh** cần nguồn, tác giả, license/ghi công, thời điểm kiểm tra và liên kết nghĩa đã duyệt; ảnh không hợp lệ không được phát.
- Evidence có đường dẫn ổn định trong task: test output, screenshot/video, fixture, bảng đánh giá hoặc báo cáo số liệu phù hợp. Không commit token, dữ liệu cá nhân, deck riêng tư hay ảnh thiếu quyền.
- Spec/ADR, PRD/plan và tài liệu release được cập nhật khi quyết định thật sự thay đổi. Reviewer xác nhận độc lập trước khi đóng task.
- Task có đủ cập nhật đã làm/còn lại/lỗi/file đổi/test/bước tiếp theo/quyết định; DOCX và fingerprint đã tái tạo, checker đạt theo [TEAM_WORKFLOW](TEAM_WORKFLOW.md). Không coi báo cáo được sinh tự động là bằng chứng code chạy đúng.
