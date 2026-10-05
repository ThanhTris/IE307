# Hướng dẫn AI coding agent — Manabi

## Dự án

Manabi là đồ án Android-first học tiếng Nhật: deck/card, flashcard, lịch ôn, Matching, Four Choices, Word Ninja, tiến độ và backup JSON. Core dùng SQLite và hoạt động offline. Auth/sync là mở rộng tùy chọn; Gemini quiz và ảnh đời sống là pilot có điều kiện review.

Hiện dự án có plan, spec, UI mẫu, workflow và [36 task dự kiến](tasks/backlog/MASTER_BACKLOG.md) cho [sáu thành viên](docs/project/TEAM_AND_RESPONSIBILITIES.md). Chưa triển khai app/API. Prototype là tham chiếu giao diện.

## Nguồn yêu cầu

1. Yêu cầu hiện tại của chủ dự án và task được giao.
2. Acceptance criteria, giả định, dependency và spec liên kết của task.
3. `docs/specs` và `docs/architecture`.
4. `docs/product/PRODUCT_REQUIREMENTS.md` và `docs/project/PROJECT_PLAN.md`.
5. Nghiên cứu và prototype hỗ trợ quyết định; báo cáo tổng hợp từ nguồn task.

Trước khi code, chốt task Markdown với owner/reviewer, phạm vi, AC, dependency và test plan. Chỉ nhận task khi dependency đã được review chấp thuận. Hỏi owner khi có mâu thuẫn hoặc thay đổi phạm vi, kiến trúc, dữ liệu, quyền riêng tư hay release.

## Quy trình AIDD

1. Đọc task, dependency, spec/ADR và acceptance criteria.
2. Ghi giả định, nêu patch nhỏ nhất và kế hoạch kiểm thử trước khi sửa.
3. Triển khai đúng phạm vi.
4. Chạy kiểm tra phù hợp, lưu evidence tại đường dẫn task.
5. Chuyển task sang `tasks/review` để reviewer khác owner xác nhận.
6. Chỉ chuyển `tasks/done` sau review đạt [Definition of Done](docs/project/DEFINITION_OF_DONE.md). Cập nhật spec/ADR khi quyết định thay đổi.

## Dữ liệu và AI

- Deck định nghĩa `fieldSchema`; nội dung card nằm trong `fields` JSON. `dueAt`, SRS state, lịch sử và khóa đồng bộ phải truy vấn ngoài JSON.
- Quiz lấy đáp án từ nghĩa/cách đọc của card đã được người học xác nhận. Gemini chỉ đề xuất câu hỏi và ba nhiễu. Validate schema, nghĩa, trùng/đồng nghĩa và đáp án mơ hồ; thiếu ba nhiễu hợp lệ thì bỏ câu.
- Lưu nguồn card/version, model/prompt/version validator và trạng thái duyệt. Câu lỗi không được chấm vào lịch ôn.
- Tín hiệu trắc nghiệm có ảnh hưởng giới hạn lên SRS, có test và review; mặc định shadow mode. Tự đánh giá sau nhớ lại trực tiếp là tín hiệu chính.
- Ảnh phải có URL/ID nguồn, tác giả, license/ghi công, thời điểm kiểm tra và liên kết nghĩa/card được duyệt. Thiếu quyền hoặc sai nghĩa thì không hiển thị.
- Chỉ gửi dữ liệu tối thiểu lên dịch vụ ngoài sau thông báo/consent phù hợp; không gửi private deck, PII hoặc toàn bộ lịch sử mặc định.
- Trước task Gemini, đọc [đánh giá Free Tier](docs/research/GEMINI_FREE_TIER_FEASIBILITY.md). Pilot dùng card demo không nhạy cảm và phải đáp ứng điều kiện tuổi/vùng/tier.
- Không commit key, token, dữ liệu người học, signing hoặc nội dung chưa có quyền sử dụng.

## Code

- TypeScript strict; `any` cần lý do review. Scheduler, quiz validation, game signal và persistence nằm ngoài screen/component.
- JSON có schema validation; migration có version, fixture và đường nâng cấp.
- Danh sách dài dùng `FlatList`/`SectionList`. Hỗ trợ safe area, font scaling, dark mode, accessibility và compact/medium/expanded.
- Dependency mới phải có lý do, license/kích thước và reviewer đồng ý.
- Học thẻ, lịch ôn và game dùng dữ liệu đã lưu phải hoạt động khi mất mạng hoặc Gemini lỗi.

## Tài liệu và bàn giao

- Cập nhật plan/spec/UI/workflow: không cần tạo task riêng hoặc registry; chạy `python scripts/validate_repository.py` và kiểm diff.
- Khi triển khai task/code: cập nhật task Markdown, evidence và báo cáo theo [TEAM_WORKFLOW](docs/project/TEAM_WORKFLOW.md). Sinh DOCX bằng `python scripts/build_manabi_reports.py`, chạy `python scripts/validate_handoff.py` và kiểm commit bằng `--git-tree HEAD` trước push.
- Push phải thuộc yêu cầu được chủ dự án cho phép. AI không tự duyệt hoặc tự đánh dấu Done.
