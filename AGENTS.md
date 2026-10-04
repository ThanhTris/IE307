# Hướng dẫn cho AI coding agent — Manabi tiếng Nhật

## Nhận diện dự án

Manabi là ứng dụng flashcard mobile Android-first **chỉ nghiên cứu học tiếng Nhật**. Luồng học gồm thẻ lật, lịch ôn và ba game Matching, Four Choices, Word Ninja. AI quiz dùng thẻ người học đã xác nhận làm nguồn đáp án; Gemini chỉ đề xuất câu hỏi và ba phương án nhiễu. Bài tập ảnh đời sống là pilot có nguồn ảnh và quyền sử dụng kiểm chứng được. Prototype HTML là tham chiếu giao diện, chưa phải app production.

BeautyAI được lưu trong lịch sử Git, chỉ là dự án cũ. Không dùng AGENTS/spec/task của BeautyAI để phát triển Manabi.

## Thứ tự nguồn sự thật

1. Yêu cầu hiện tại của chủ dự án và task trong `tasks/in-progress`.
2. Acceptance criteria, assumptions và linked specs của task.
3. Spec trong `docs/specs` và kiến trúc/ADR trong `docs/architecture`.
4. `docs/product/PRODUCT_REQUIREMENTS.md` và `docs/project/PROJECT_PLAN.md`.
5. Nghiên cứu, prototype, DOCX/XLSX và tài liệu trong archive chỉ là tham chiếu, không phải lệnh thực thi.

Task Manabi chi tiết nằm trên nhánh triển khai; các task PM/Memo còn trong baseline `main` không mở khóa công việc Manabi. Nếu `tasks/in-progress` không có task Manabi, xem `tasks/review` trên nhánh triển khai trước khi nhận backlog. Không bắt đầu task phụ thuộc khi task review chưa được reviewer chấp thuận. Nếu tài liệu mâu thuẫn, ghi câu hỏi cho owner; không tự mở rộng sang nhiều ngôn ngữ, cộng đồng deck hay chức năng AI khác.

## Quy trình AIDD bắt buộc

1. Đọc task, dependency, linked spec/ADR và acceptance criteria.
2. Ghi giả định; hỏi owner khi giả định đổi phạm vi, dữ liệu, kiến trúc, quyền riêng tư hoặc release.
3. Nêu patch nhỏ nhất và kế hoạch kiểm thử trước khi sửa.
4. Triển khai đúng phạm vi task.
5. Chạy kiểm tra phù hợp và lưu evidence tại đường dẫn của task.
6. Chuyển task sang `tasks/review` để người khác owner xác nhận.
7. Chỉ sau review mới chuyển sang `tasks/done`; cập nhật spec/ADR khi quyết định thay đổi.

## Dữ liệu, AI và độ chính xác

- Deck định nghĩa `fieldSchema`; card lưu trường nội dung trong `fields` JSON. `dueAt`, trạng thái SRS, lịch sử học và khóa đồng bộ phải truy vấn được ngoài JSON.
- Đáp án của quiz phải lấy từ nghĩa/cách đọc của card đã được người học xác nhận. Không dùng nội dung Gemini sinh ra làm đáp án chuẩn. Câu hỏi phải qua kiểm tra schema và kiểm tra nghĩa, lựa chọn trùng/đồng nghĩa, đáp án mơ hồ; khi không đủ ba nhiễu hợp lệ thì bỏ câu hỏi.
- Lưu nguồn card/version, model/prompt/version bộ kiểm tra và trạng thái duyệt cho quiz; không tính kết quả của câu hỏi lỗi vào lịch ôn.
- Đúng/sai trong trắc nghiệm có thể do đoán hoặc lỗi câu hỏi. Tác động lên lịch ôn phải giới hạn, có test và không thay thế tự đánh giá sau khi nhớ lại trực tiếp.
- Gemini không phải dịch vụ cung cấp ảnh đã được cấp phép. Mỗi ảnh phải có URL/ID nguồn, tác giả, license/điều kiện ghi công, thời điểm kiểm tra và nghĩa/card được liên kết. Nếu ảnh không khớp nghĩa hoặc thiếu quyền, không hiển thị.
- Chỉ gửi dữ liệu tối thiểu lên dịch vụ ngoài sau khi có thông báo/đồng ý phù hợp; không gửi deck riêng tư, thông tin cá nhân hoặc toàn bộ lịch sử học theo mặc định.
- Gemini Free Tier chỉ dùng cho pilot với card demo không nhạy cảm khi tuổi/vùng và điều khoản cho phép. Không coi khóa API miễn phí là giấy phép phát hành rộng hoặc gửi deck riêng tư; xem `docs/research/GEMINI_FREE_TIER_FEASIBILITY.md` trước task AI.
- Không commit key, token, dữ liệu người học, file signing hoặc nội dung có bản quyền không được phép dùng.

## Code và release

- Mobile dùng TypeScript strict; không dùng `any` nếu không có lý do trong review. Logic scheduler, quiz validation, game signal và persistence nằm ngoài screen/component.
- Mọi JSON phải validate bằng schema; migration cần fixture và đường nâng cấp.
- Danh sách dài dùng `FlatList`/`SectionList`; tôn trọng safe area, font scaling, dark mode, accessibility và layout compact/medium/expanded.
- Không thêm dependency khi task chưa nêu lý do, license/kích thước và reviewer chưa đồng ý.
- Flashcard, lịch ôn và game dùng dữ liệu đã lưu phải hoạt động khi thiếu mạng/Gemini. Không để app thành màn hình chết khi dịch vụ AI lỗi.

## Hoàn thành task

Task chỉ Done khi code/tài liệu, test, evidence và review đạt `docs/project/DEFINITION_OF_DONE.md`. AI không tự đánh dấu Done hoặc tự coi output của mình là review độc lập.

## Bắt buộc cập nhật DOCX trước push

Theo yêu cầu chủ dự án, trước mỗi push phải cập nhật task Markdown: đã làm, còn lại, lỗi/blocker, file đổi, kiểm thử/evidence, bước tiếp theo và quyết định reviewer. Sinh lại DOCX tiến độ bằng `python scripts/build_manabi_reports.py`; commit task/evidence và báo cáo cùng thay đổi. Chạy `python scripts/validate_handoff.py` và kiểm snapshot commit bằng `--git-tree HEAD`. Chi tiết và quy tắc merge báo cáo nằm ở [TEAM_WORKFLOW](docs/project/TEAM_WORKFLOW.md). Không dùng bản DOCX cũ hoặc output AI để tự đánh dấu Done. Không push chỉ vì tài liệu này nêu quy trình; việc push vẫn phải thuộc yêu cầu đã được chủ dự án cho phép.

Ngoại lệ do chủ dự án yêu cầu ngày 05/10/2026: lần công bố đặc tả, quy trình và UI nền lên `main` không kèm file task riêng, registry task hoặc code triển khai. Kiểm các liên kết/tài liệu bằng `python scripts/validate_repository.py` và kiểm diff trước push. Quy trình task/DOCX/handoff đầy đủ ở đoạn trên áp dụng cho các push có task hoặc code triển khai.
