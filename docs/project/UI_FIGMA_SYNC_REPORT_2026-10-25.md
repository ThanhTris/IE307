# Báo cáo đồng bộ task UI theo Figma — 2026-10-25

## Trạng thái push

Các thay đổi tài liệu/task trong lượt này đã được push lên `main`.

- Commit: [`0c0bdb9`](https://github.com/ThanhTris/IE307/commit/0c0bdb9c49c7eb214a882bbf243174bcffd8912f)
- Xác minh sau push: `origin/main` và `HEAD` cùng trỏ `0c0bdb9c49c7eb214a882bbf243174bcffd8912f`; worktree sạch.
- Phạm vi commit: 8 file tài liệu/task; không có app/runtime, schema, migration hoặc API code.

## Đã làm

- Chuẩn hóa hướng dẫn cho GM-02 để lấy đúng Figma frame/state bằng MCP, lưu screenshot và revision vào FIGMA_PARITY.
- Bổ sung yêu cầu state cho G01–G05 trong task map và task liên quan. Inbox G02 được xác định là hộp thư thông báo, không phải lời mời phòng. G05 xóa các trường mật khẩu sau lỗi mạng/server; G04 giữ dữ liệu hồ sơ để sửa/retry theo xác nhận của Trí.
- Liệt kê các tình huống cần xử lý qua các flow tạo/vào phòng, role host/member, reconnect, ACK chưa rõ, session hết hạn, no-consensus, tải kết quả/Places, history legacy và tài khoản.
- Thêm ma trận sơ bộ UI → field/command → producer/thiếu hụt → task BE/Data/owner vào kế hoạch đồng bộ.
- Ghi rõ ma trận BE/Data mới là sơ bộ cho đến khi các gap có frame/node/revision và được Trí review.
- Cập nhật body các GitHub issue #63, #75, #89, #92 và #96. Không đổi status, assignee, Deadline hoặc priority trên Project #2.

## Chưa hoàn tất

- G01–G05 chưa có frame Figma mới. Trong `UI_FIGMA_TASK_MAP.json`, cả năm vẫn là `Pending design` và `screenNodeId` đang null. Owner cần bổ sung frame/variant, cập nhật node/revision; Trí review trước khi coi gap đã được thiết kế.
- Chưa thực hiện vòng rà BE/Data cuối sau các frame gap. Ma trận hiện tại là đầu vào sơ bộ; cần cập nhật mapping state/field và task producer sau khi Figma được bổ sung, review.
- Chưa sửa hoặc triển khai BE/Data, API, database, migration, consumer app, Places provider hay policy runtime. Phiên v2/v3 vẫn giữ nguyên.
- Chưa chạy Expo, Android/native hoặc DB/API runtime; không có kết quả Pass cho các tầng này.
- Chưa có visual parity screenshot từ app so với Figma cho các gap.

## Kiểm tra

- `python scripts/validate_repository.py`: Pass.
- `python scripts/task_readiness.py --check-docs`: Pass.
- `python -m unittest discover -s tests -p "test_ui_refinement_task.py"`: 5/5 Pass.
- JSON parse và `git diff --check`: Pass.
- Regression đầy đủ trước đó chạy 594 test, 6 skipped, 21 failures. Các lỗi được báo nằm ở kiểm tra liên kết `MOBILE_API_TEST_MATRIX.md` cho GM-24 và kỳ vọng chuỗi “Android thật” trong device cases GM-24..35; không nằm trong 8 file của commit này. Có cảnh báo GitHub API `429` trong lúc suite chạy. Chưa dùng kết quả này để khẳng định toàn bộ regression Pass.

## File đã push

- `docs/design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md`
- `docs/design/UI_FIGMA_TASK_MAP.json`
- `docs/project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md`
- `tasks/review/GM-02.md`
- `tasks/backlog/GM-14.md`
- `tasks/backlog/GM-28.md`
- `tasks/backlog/GM-31.md`
- `tasks/backlog/GM-35.md`
