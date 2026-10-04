# Cấu trúc báo cáo đồ án Manabi tiếng Nhật

Đây là dàn ý, không phải báo cáo đã có kết quả. Chỉ ghi số liệu từ app/build và pilot thật; tách rõ chức năng triển khai, prototype và đề xuất.

## Phần đầu theo template LaTeX

Bìa, nhận xét, lời cảm ơn nếu cần, mục lục, danh mục hình/bảng, thuật ngữ và tóm tắt.

## 1 Giới thiệu đề tài

### 1.1 Lý do chọn đề tài

Mô tả việc chuẩn bị thẻ tiếng Nhật, ôn lặp và khó kiểm tra mình thực sự nhớ nghĩa hay chỉ nhận ra đáp án. Nêu vai trò của offline đối với học hằng ngày.

### 1.2 Khoảng trống và vấn đề chưa giải quyết

Trình bày như giả thuyết có dữ liệu kiểm chứng: phỏng vấn/khảo sát nhỏ, so sánh luồng Anki/Quizlet theo phiên bản cụ thể, cách tạo câu hỏi từ thẻ đã học, kiểm tra đáp án nhiễu và mức tác động của game/quiz lên lịch ôn. Không tuyên bố ứng dụng khác thiếu một tính năng nếu chưa kiểm tra.

### 1.3 Mục tiêu

Mục tiêu sản phẩm và tiêu chí đo: import tiếng Nhật, học/SRS, ba game, độ đúng và chi phí quiz AI, khả năng offline/fallback, pilot ảnh, release Android.

### 1.4 Đối tượng và phạm vi

Người tự học tiếng Nhật; ưu tiên từ vựng và card có nghĩa rõ. Nêu giới hạn với từ đa nghĩa, ngữ pháp, kanji ngoài pilot, ảnh từ trừu tượng và deck chỉ lưu local.

### 1.5 Phương pháp thực hiện

Quy trình AIDD, phát triển lặp, kiểm thử và usability study.

## 2 Nghiên cứu và công nghệ liên quan

### 2.1 Flashcard và spaced repetition

Giải thích đủ để hiểu scheduler và vì sao game signal có trọng số giới hạn.

### 2.2 Ứng dụng liên quan

So sánh tập trung vào use case của đề tài; không giới thiệu lịch sử dài dòng. Mọi nhận định phải có nguồn và ngày truy cập.

### 2.3 Độ tin cậy của quiz AI và ảnh ngữ cảnh

Phân biệt câu trả lời đúng từ card đã xác nhận với nội dung Gemini đề xuất; giải thích vì sao JSON hợp lệ chưa đủ bảo đảm một đáp án duy nhất. Nêu cách chọn nguồn ảnh, kiểm tra license/ghi công và đo lỗi ghép ảnh–nghĩa.

### 2.4 React Native và Expo trong đề tài

Nêu lý do một codebase, development build, navigation, component/props/state/event, lifecycle và list virtualization được áp dụng ở module nào.

### 2.5 UI đa thiết bị

Core Components, StyleSheet/NativeWind, Flexbox/Yoga, safe area, responsive/adaptive, dark mode và accessibility.

### 2.6 SQLite, PostgreSQL JSONB và Supabase

Tập trung vào offline-first, JSON schema linh hoạt, RLS và sync.

## 3 Hệ thống đề xuất

### 3.1 Kiến trúc tổng thể

Sơ đồ mobile-domain-repository-SQLite-sync-Supabase.

### 3.2 Thành phần chính

Deck/card, import, study/SRS, ba game, quiz AI có validator/cache, pilot ảnh, progress và release. Auth/sync chỉ mô tả mức thực tế đã làm.

### 3.3 Luồng dữ liệu

Sequence diagram cho import, review event và tạo/duyệt quiz Gemini; thêm sync/conflict khi tính năng đó được triển khai.

### 3.4 Backend và API

Auth, PostgREST/RPC/Edge Functions, validation, idempotency và error model.

### 3.5 Client mobile

Route/module, state, component tree, list/render strategy và platform differences.

### 3.6 Database

ERD, SQLite mapping, PostgreSQL/JSONB, index, migration và backup.

### 3.7 Authentication và authorization

Session, RLS, user isolation và policy tests.

### 3.8 Dịch vụ bên thứ ba

Gemini, nguồn ảnh có license, Supabase, Expo/EAS và Google Play; ghi rõ chi phí, giới hạn, consent và tài khoản/xét duyệt. App Store Connect chỉ khi có nhánh iOS thật.

## 4 Kết quả và thảo luận

### 4.1 Kết quả backend

Migration, RLS/API test, sync/conflict và số liệu lỗi.

### 4.2 Kết quả Android và iOS nếu có

Build Android và ảnh/chỉ số trên thiết bị thử nghiệm; ghi iOS riêng nếu được thực hiện.

### 4.3 Kết quả chức năng

Import, JSON fields, study/SRS, ba game, progress và backup; quiz AI và ảnh chỉ ghi là kết quả nếu có build chạy và evidence.

### 4.4 Đánh giá

Test pass rate, performance, device matrix, usability result, tỷ lệ quiz bị loại/sai/mơ hồ, độ trễ và chi phí Gemini, lỗi ảnh–nghĩa/quyền ảnh, hạn chế và threat to validity. Không tạo số liệu giả.

### 4.5 Thảo luận

So sánh mục tiêu với kết quả; thảo luận card nguồn sai, khả năng đoán trắc nghiệm, kiểm duyệt của con người, offline/fallback, chi phí và phạm vi ảnh đời sống.

## 5 Kết luận và khuyến nghị

Tóm tắt kết quả, giới hạn, bài học AIDD và roadmap sau môn học.

## Phụ lục

- Bảng phân công và bằng chứng đóng góp.
- API contract, JSON schema, test cases và device matrix.
- Hướng dẫn build/release/demo.
- Link video/file lớn trên Drive có quyền truy cập cho `duypn@uit.edu.vn`.

## Checklist nộp

- PDF báo cáo.
- PPTX.
- Mã nguồn và LaTeX.
- Demo và hướng dẫn chạy.
- ZIP tên `IE307.R11_DoAn_NhomX.ZIP`.
- Link Drive đã kiểm tra quyền bằng tài khoản khác.
