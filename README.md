# Manabi — flashcard học tiếng Nhật

Manabi là đề tài mobile Android-first giúp người học tự tạo hoặc nhập bộ thẻ tiếng Nhật, ôn bằng flashcard và ba trò chơi: Matching, Four Choices, Word Ninja. Hướng khác biệt đang nghiên cứu là **câu hỏi bốn lựa chọn từ chính các thẻ đã học**: Gemini đề xuất cách hỏi và ba phương án nhiễu, hệ thống kiểm tra trước khi cho học, rồi dùng kết quả làm tín hiệu có giới hạn cho lịch ôn. Hướng thứ hai là bài tập nhận biết từ trong ảnh đời sống, thử nghiệm với từ cụ thể và ảnh có quyền sử dụng rõ ràng.

Đây là repository **đang ở giai đoạn đặc tả/prototype**. `design/prototypes/manabi-vocabulary.html` cho thấy giao diện và ba game, nhưng dữ liệu/lịch ôn trong đó là mẫu; `apps/mobile` chưa có ứng dụng production. Không mô tả prototype như tính năng Gemini, tìm ảnh hay SRS đã triển khai.

## Phạm vi hiện tại

- Nội dung học: tiếng Nhật, ưu tiên từ vựng với mặt chữ, cách đọc, nghĩa tiếng Việt và ví dụ. Card tùy biến vẫn được giữ để nhập dữ liệu; AI quiz chỉ áp dụng cho card đủ trường và đã được xác nhận.
- Luồng cốt lõi: tạo/nhập deck, học thẻ, tự đánh giá Again/Hard/Good/Easy, ôn theo lịch, ba game và xem tiến độ.
- AI quiz: một đáp án từ card nguồn và ba lựa chọn nhiễu được kiểm tra, có cache và fallback khi mạng/API lỗi. Kết quả đúng/sai được lưu riêng và chỉ điều chỉnh lịch theo chính sách trong `docs/specs/SRS_SPEC.md`.
- Ảnh đời sống: pilot cho một tập nhỏ từ chỉ vật thể/hành động dễ nhận biết; ảnh cần nguồn, license và kiểm duyệt khớp nghĩa. Không giả định Gemini tự cung cấp một kho ảnh hợp pháp/chính xác.
- Cộng đồng chia sẻ deck, thương mại, nhiều ngôn ngữ và chấm điểm ngữ pháp tự động nằm ngoài phạm vi nghiên cứu hiện tại.

## Bắt đầu từ `main`

1. [Bắt đầu Manabi](docs/project/START_HERE.md) nêu quyết định đã chốt, nguồn task hiện hành và cách kiểm tra clone mới.
2. `AGENTS.md` nêu thứ tự nguồn sự thật và quy tắc cho AI coding agent; [yêu cầu sản phẩm](docs/product/PRODUCT_REQUIREMENTS.md) và [kế hoạch](docs/project/PROJECT_PLAN.md) nêu phạm vi và cổng triển khai.
3. Task Manabi chi tiết được theo dõi trên nhánh `origin/codex/manabi-task004-restore-2026-10-04`; bản `main` này công bố đặc tả, quy trình và UI tham chiếu. Task Memo còn trong `main` không thuộc lộ trình Manabi.
4. Các đặc tả trong `docs/specs` là hợp đồng chức năng. `docs/architecture` nêu kiến trúc dự kiến, chưa phải mã đã chạy.

## Cấu trúc

```text
apps/mobile/          Vị trí ứng dụng Expo React Native; main chưa có scaffold chạy được
packages/domain/      Domain, scheduler và logic game sẽ triển khai
schemas/              JSON Schema hiện có cho deck/card/sync event
design/prototypes/    Prototype HTML và ghi chú UI Manabi
docs/                 PRD, spec, kiến trúc, nghiên cứu và quy trình
tasks/                Chỉ mục task; trạng thái Manabi chi tiết ở nhánh triển khai
```

Snapshot BeautyAI trước khi đổi hướng được lưu trong lịch sử ở commit `5034d52`; bản tài liệu `main` không dùng snapshot đó làm nguồn phát triển Manabi.

## Yêu cầu, phân công và báo cáo

- [18 yêu cầu chức năng](docs/product/FUNCTIONAL_REQUIREMENTS.md) và [12 yêu cầu phi chức năng](docs/product/NON_FUNCTIONAL_REQUIREMENTS.md).
- [Phân công sáu thành viên](docs/project/TEAM_AND_RESPONSIBILITIES.md) và kế hoạch 36 task; file task chi tiết ở nhánh triển khai.
- [Quy tắc cập nhật DOCX trước push](docs/project/TEAM_WORKFLOW.md) và [quy ước báo cáo](deliverables/report/README.md).
- [ADR-004](docs/architecture/decisions/ADR-004-json-storage-and-database.md): chủ dự án đã chọn giai đoạn đầu SQLite trên thiết bị, backup JSON, không tài khoản/cloud sync; ADR vẫn chờ review kỹ thuật. [Đánh giá database](docs/research/DATABASE_FEASIBILITY.md) là căn cứ nghiên cứu, còn Supabase/PostgreSQL chỉ là phương án cloud tùy chọn sau này.

Trí phụ trách BE/điều phối; Trang UI/FE; Tâm và Vinh data; Trung và Tuấn FE/BE/data. Mỗi người được dự kiến 6 task (32 điểm tương đối) và 6 lượt review (6 điểm). Roadmap theo cổng nghiệm thu, chưa có deadline mới. Trạng thái task được quản lý trên nhánh triển khai; `main` chưa có chức năng app production.
