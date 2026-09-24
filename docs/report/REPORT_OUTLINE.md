# Cấu trúc báo cáo đồ án Memo Vocabulary

## Phần đầu theo template LaTeX

Bìa, nhận xét, lời cảm ơn nếu cần, mục lục, danh mục hình/bảng, thuật ngữ và tóm tắt.

## 1 Giới thiệu đề tài

### 1.1 Lý do chọn đề tài

Mô tả chi phí chuẩn bị flashcard, sự nhàm chán của thao tác lặp và nhu cầu học đa nền tảng/offline.

### 1.2 Khoảng trống và vấn đề chưa giải quyết

Trình bày như giả thuyết có dữ liệu kiểm chứng: phỏng vấn/khảo sát nhỏ, so sánh luồng Anki/Quizlet, thời gian tạo bộ thẻ, mức tùy biến và cách game tác động lịch ôn.

### 1.3 Mục tiêu

Mục tiêu sản phẩm và các tiêu chí đo: import, học, game, offline, sync, release.

### 1.4 Đối tượng và phạm vi

Người tự học, sinh viên/giáo viên; MVP và phần phát triển sau.

### 1.5 Phương pháp thực hiện

Quy trình AIDD, phát triển lặp, kiểm thử và usability study.

## 2 Nghiên cứu và công nghệ liên quan

### 2.1 Flashcard và spaced repetition

Giải thích đủ để hiểu scheduler và vì sao game signal có trọng số giới hạn.

### 2.2 Ứng dụng liên quan

So sánh tập trung vào use case của đề tài; không giới thiệu lịch sử dài dòng. Mọi nhận định phải có nguồn và ngày truy cập.

### 2.3 React Native và Expo trong đề tài

Nêu lý do một codebase, development build, navigation, component/props/state/event, lifecycle và list virtualization được áp dụng ở module nào.

### 2.4 UI đa thiết bị

Core Components, StyleSheet/NativeWind, Flexbox/Yoga, safe area, responsive/adaptive, dark mode và accessibility.

### 2.5 SQLite, PostgreSQL JSONB và Supabase

Tập trung vào offline-first, JSON schema linh hoạt, RLS và sync.

## 3 Hệ thống đề xuất

### 3.1 Kiến trúc tổng thể

Sơ đồ mobile-domain-repository-SQLite-sync-Supabase.

### 3.2 Thành phần chính

Deck/card, import, study/SRS, games, progress, auth/sync và release.

### 3.3 Luồng dữ liệu

Ba sequence diagram: import, review event, offline sync/conflict.

### 3.4 Backend và API

Auth, PostgREST/RPC/Edge Functions, validation, idempotency và error model.

### 3.5 Client mobile

Route/module, state, component tree, list/render strategy và platform differences.

### 3.6 Database

ERD, SQLite mapping, PostgreSQL/JSONB, index, migration và backup.

### 3.7 Authentication và authorization

Session, RLS, user isolation và policy tests.

### 3.8 Dịch vụ bên thứ ba

Supabase, Expo/EAS, Google Play và App Store Connect; ghi rõ phụ thuộc tài khoản/xét duyệt.

## 4 Kết quả và thảo luận

### 4.1 Kết quả backend

Migration, RLS/API test, sync/conflict và số liệu lỗi.

### 4.2 Kết quả Android và iOS

Ảnh cùng luồng trên hai nền tảng, build artifact và khác biệt cần xử lý.

### 4.3 Kết quả chức năng

Import, JSON fields, study/SRS, ba game, progress và backup.

### 4.4 Đánh giá

Test pass rate, performance, device matrix, usability result, hạn chế và threat to validity. Không tạo số liệu giả.

### 4.5 Thảo luận

So sánh mục tiêu, trade-off JSON linh hoạt/khả năng query, offline/sync và game/SRS.

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
