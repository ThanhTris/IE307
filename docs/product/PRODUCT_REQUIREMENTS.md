# Yêu cầu sản phẩm — Manabi tiếng Nhật

Phiên bản 2.0, ngày 02/10/2026. Chủ dự án đã chọn tên Manabi và phạm vi tiếng Nhật; hợp đồng triển khai, ngưỡng nghiệm thu, chính sách quiz AI và ảnh cần reviewer duyệt trước khi code. Tài liệu không chứng minh app production đã tồn tại.

## Bài toán và người dùng

Manabi phục vụ người tự học **tiếng Nhật** cần ghi nhớ từ vựng, cách đọc và nghĩa, rồi gặp lại từ trong nhiều kiểu câu hỏi. Nguồn kiến thức đầu vào là deck do người dùng tạo/nhập và tự xác nhận; app không cần sở hữu một cơ sở dữ liệu bao trùm mọi từ chuyên ngành. Nếu card gốc sai, AI không tự làm nó đúng: người học phải sửa hoặc báo lỗi.

## Danh mục yêu cầu và tài liệu thực thi

- [Chức năng FR-01–FR-18](FUNCTIONAL_REQUIREMENTS.md): hành vi, phạm vi và đặc tả liên kết cho task.
- [Phi chức năng NFR-01–NFR-12](NON_FUNCTIONAL_REQUIREMENTS.md): mục tiêu đo và evidence; các ngưỡng là đề xuất chưa đo.
- [Đặc tả lưu trữ](../specs/DATA_STORAGE_SPEC.md): nội dung JSON linh hoạt, metadata truy vấn được, SQLite local + Supabase/PostgreSQL JSONB baseline; nghiên cứu MongoDB không đồng nghĩa đã chuyển database.
- [Prototype hiện tại](../../design/prototypes/manabi-vocabulary.html): giữ giao diện đã chọn, chỉ cập nhật tên; native app cần safe area/accessibility chứ không yêu cầu thiết kế mới.
- [Kế hoạch](../project/PROJECT_PLAN.md), [phân công sáu thành viên](../project/TEAM_AND_RESPONSIBILITIES.md) và [workflow review/merge](../project/TEAM_WORKFLOW.md): nguồn task/dependency/owner/reviewer. Task Markdown là trạng thái chuẩn; báo cáo DOCX được tái tạo trước push để owner xem done/chưa làm/lỗi.

Giả thuyết khác biệt cần kiểm chứng bằng thử nghiệm người dùng:

1. Quiz sinh từ chính những card đã học, nhưng đáp án chuẩn giữ từ card, có kiểm tra ba lựa chọn nhiễu trước khi dùng.
2. Kết quả quiz và game cung cấp thêm tín hiệu về trí nhớ, song chỉ tác động có giới hạn lên lịch ôn vì câu bốn lựa chọn có thể đoán đúng.
3. Bài tập ảnh đời sống giúp nối từ với ngữ cảnh thật đối với nhóm nghĩa nhìn thấy được; không ép mọi từ trừu tượng thành ảnh.

Đây là giả thuyết sản phẩm, không phải khẳng định Anki/Quizlet thiếu hoàn toàn các tính năng này. Phần so sánh cần dùng bản hiện hành và kịch bản thử nghiệm tương đương trước khi viết claim phát hành; xem [đối chiếu theo tài liệu chính thức](../research/COMPETITIVE_POSITION.md).

## Phạm vi nội dung

- Bản nghiên cứu đầu tiên: từ vựng tiếng Nhật với `term`, `reading`, `meaning` tiếng Việt và `example` tùy chọn. Cấu trúc card/deck tùy biến vẫn hỗ trợ import, nhưng quiz AI chỉ nhận thẻ có cặp hỏi–đáp rõ, đã học và được xác nhận.
- Có thể lưu thẻ kanji hoặc mẫu ngữ pháp bằng field tùy biến; sinh quiz tự động cho những loại đó nằm ngoài phạm vi đầu tiên vì kiểm tra một đáp án duy nhất khó hơn.
- Không tự suy ra nghĩa từ từ điển như chân lý cuối. Tra cứu từ điển, nếu thêm sau, phải ghi nguồn/license và cho người học duyệt nghĩa phù hợp ngữ cảnh.

## Luồng người học

1. Tạo hoặc nhập deck; xem trước, sửa, xử lý trùng và xác nhận card.
2. Học card mới; lật thẻ, tự đánh giá Again/Hard/Good/Easy.
3. Ôn card đến hạn bằng flashcard; chơi Matching, Four Choices hoặc Word Ninja với card đã học.
4. Khi có mạng, tài khoản/consent và đủ card hợp lệ, yêu cầu bộ quiz từ deck đã học; hiển thị câu đã qua kiểm tra, phản hồi lý do đúng/sai, cho báo lỗi.
5. Lưu kết quả quiz riêng; chính sách SRS có version xử lý tín hiệu này, bắt đầu bằng shadow mode trước khi điều chỉnh lịch thật.
6. Với card có ảnh được duyệt, thử bài “nhìn ảnh, chọn nghĩa tiếng Việt” gồm một nghĩa chuẩn của card và ba phương án nhiễu hợp lệ; không có ảnh hoặc không đủ lựa chọn thì vẫn học/ôn bình thường.
7. Xem tiến độ, câu thường sai, xuất backup.

## Chức năng cốt lõi

- CRUD deck/card, tìm kiếm, tag và archive; `fieldSchema` có key ổn định, card có `fields` JSON và version.
- Import paste/CSV; XLSX là nhánh sau khi luồng cơ bản ổn. Có column mapping, preview, báo lỗi và chính sách duplicate rõ.
- SRS lưu trạng thái New/Learning/Review/Relearning, review event bất biến và lịch sử. Đánh giá trực tiếp bằng bốn nút là tín hiệu chính.
- Matching, Four Choices và Word Ninja dùng card đã học. Game không ghi kết quả tự động hoặc lỗi thao tác thành quên bài.
- Local-first bằng SQLite cho dữ liệu, lịch ôn, ba game; tài khoản/sync/backup được triển khai theo task riêng.

## Quiz dùng Gemini — chức năng nghiên cứu trọng tâm

- Đầu vào tối thiểu là các card đã học/được xác nhận có câu hỏi, đáp án và nghĩa rõ; người dùng được thông báo/đồng ý gửi phần dữ liệu cần thiết lên dịch vụ AI.
- Trước khi bật Gemini, kiểm tra cổng tuổi/vùng phân phối và cách dùng dữ liệu của gói API đã chọn. Free Tier chỉ phù hợp pilot có kiểm soát với card không nhạy cảm; xem [đánh giá khả thi Free Tier](../research/GEMINI_FREE_TIER_FEASIBILITY.md). Không coi consent là cách bỏ qua điều khoản dịch vụ.
- Mỗi câu có một đáp án đúng từ card nguồn và **ba phương án nhiễu** lấy từ card ứng viên trong deck; Gemini có thể viết câu dẫn, chọn/đề xuất nhiễu, nhưng không tự sửa đáp án chuẩn.
- Kiểm tra JSON/schema, ID card, không trùng lặp/đồng nghĩa, cùng chiều hỏi, không có đáp án thứ hai hợp lý; câu lỗi bị loại hoặc chuyển duyệt thủ công. Người học có nút báo lỗi và không bị phạt lịch ôn vì câu đã bị vô hiệu.
- Cache theo phiên bản card, prompt, model và bộ kiểm tra. Key chung của admin ở backend; giới hạn **10 câu mới đã duyệt/người/ngày theo Asia/Ho_Chi_Minh**, ngày do server xác định, cộng hạn mức request/token toàn hệ thống, atomic reservation và idempotency. Một lời gọi API thông thường tạo tối đa 5 bản nháp, tối đa hai lượt tạo để đạt 10 câu hợp lệ; không dùng “10 câu” như đồng nghĩa “10 lời gọi”. Câu bị reject/retry vẫn tiêu hao quota nhà cung cấp và có ngân sách riêng. Chơi lại câu cache không tiêu hao quota câu mới. Không có mạng, hết quota hay bị từ chối consent thì quay về Four Choices offline từ card.
- Kết quả quiz lưu riêng với game và review trực tiếp. Chỉ sau khi kiểm thử mới cho phép tác động giới hạn đến SRS theo `docs/specs/AI_QUIZ_SPEC.md` và `docs/specs/SRS_SPEC.md`.

## Ảnh đời sống — pilot có cổng kiểm chứng

- Thử với 30–50 nghĩa cụ thể. Backend tìm ảnh ứng viên qua API của nguồn ảnh có điều kiện sử dụng kiểm tra được; mỗi ảnh có URL/ID nguồn, tác giả, license/ghi công và liên kết ảnh–nghĩa được duyệt.
- Bài tập là “nhìn ảnh, chọn nghĩa tiếng Việt” từ card đã học và nghĩa đã được người học xác nhận. API có thể đề xuất bốn lựa chọn, nhưng đáp án đúng phải khóa từ nghĩa của card; ba nhiễu lấy từ nghĩa card hợp lệ cùng miền chủ đề. Loại câu có lựa chọn trùng, đồng nghĩa, nhiều đáp án hợp lý hoặc không đủ ba nhiễu.
- OCR và kiểm tra nội dung loại ảnh có chữ hoặc chi tiết tiết lộ đáp án, nhiều vật thể gây mơ hồ hay sai nghĩa; người duyệt xác nhận trước khi phát. Kết quả tìm kiếm, OCR hoặc Gemini Vision không chứng minh quyền ảnh hay tính đúng nghĩa.
- Lưu nguồn và version card/ảnh cùng model, prompt, version bộ kiểm tra và trạng thái duyệt của câu hỏi; nguồn đổi hoặc card sửa thì vô hiệu cache. Ảnh/câu thiếu quyền, không tải được hoặc không qua kiểm tra sẽ bỏ qua và dùng luồng học chữ/flashcard.
- Chỉ mở rộng sau pilot đo được tỷ lệ ảnh hợp lệ, lỗi nghĩa, công duyệt, tốc độ và chi phí. Từ trừu tượng hoặc thiếu ảnh giữ luồng flashcard/text.
- Chi tiết và các lựa chọn nguồn: `docs/specs/IMAGE_CONTEXT_SPEC.md` và `docs/research/AI_IMAGE_FEASIBILITY.md`.

## Phi chức năng và release

- Android-first, TypeScript strict, safe area/font scaling/dark mode/accessibility; danh sách lớn dùng virtualization. Ngưỡng performance và thiết bị mục tiêu nằm trong [NFR](NON_FUNCTIONAL_REQUIREMENTS.md), là mục tiêu nghiệm thu đề xuất, chưa phải số đo.
- Deck, lịch ôn và game đã lưu phải hoạt động offline. Lỗi API/thiếu backend không làm app crash hoặc chặn luồng học cơ bản.
- Key Gemini ở server; quyền đọc deck theo user, rate limit, không log nội dung card. Không dùng dữ liệu học để huấn luyện riêng khi chưa có consent.
- Backup versioned có thể validate/import lại. Đo latency, số request và chi phí quiz; ghi lỗi câu hỏi/ảnh đã bị loại trong báo cáo nghiên cứu.
- Chỉ mô tả tính năng đã chạy trên build release; tính năng nghiên cứu phải có nhãn và fallback.

## Ngoài phạm vi hiện tại

Nhiều ngôn ngữ, cộng đồng chia sẻ deck, marketplace, mô hình AI tự train, chấm phát âm, tạo ảnh hàng loạt, tư vấn học cá nhân kiểu chatbot, thanh toán và lớp học. Chưa cam kết BYOK Gemini vì luồng bảo mật, UX và điều khoản cần nghiên cứu riêng.
