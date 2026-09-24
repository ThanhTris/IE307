# Definition of Done

Một task chỉ Done khi đáp ứng tất cả mục áp dụng:

- Acceptance criteria được kiểm tra và ghi kết quả.
- Code build, lint/typecheck và test liên quan đạt.
- Không còn lỗi blocker/critical do task tạo ra.
- Có empty/loading/error/offline state nếu là UI hoặc network flow.
- Có accessibility label/state và kiểm tra layout compact/medium nếu là UI.
- Có migration/rollback/fixture nếu thay đổi dữ liệu.
- Có RLS/auth test nếu thay đổi backend.
- Có evidence path: screenshot, video ngắn, test output hoặc dữ liệu đo.
- Spec, ADR, report evidence và task workbook đã cập nhật.
- Reviewer khác owner chấp thuận.
