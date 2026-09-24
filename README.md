# Memo Vocabulary

Memo Vocabulary là ứng dụng flashcard đa nền tảng cho Android và iOS. Phiên bản đồ án tập trung vào nhập dữ liệu linh hoạt, thẻ nhiều trường, ôn tập ngắt quãng, ba trò chơi học tập và trải nghiệm offline-first.

## Mục tiêu phát hành

- Release candidate nội bộ: 15/11/2026.
- Buffer kiểm thử và sửa lỗi: 16/11/2026 đến 23/11/2026.
- Đầu ra: Android AAB, iOS archive/TestFlight nếu tài khoản cho phép, PDF báo cáo, PPTX, mã nguồn, LaTeX và demo.

## Kiến trúc dự kiến

- Mobile: React Native, Expo Development Build, TypeScript, Expo Router.
- UI: Core Components, StyleSheet/NativeWind, Flexbox/Yoga, responsive/adaptive UI.
- Local data: SQLite; dữ liệu trường thẻ lưu dưới dạng JSON có schema theo bộ thẻ.
- Backend: Supabase Auth, PostgreSQL/JSONB, Row Level Security, Storage và Edge Functions khi cần.
- Đồng bộ: offline-first, hàng đợi thay đổi và xử lý xung đột theo phiên bản bản ghi.

## Bắt đầu từ đâu

1. Đọc `AGENTS.md` nếu dùng AI coding agent.
2. Đọc `docs/project/PROJECT_PLAN.md` và `docs/product/PRODUCT_REQUIREMENTS.md`.
3. Chọn task trong `tasks/backlog`, chuyển sang `tasks/in-progress` và cập nhật workbook phân công.
4. Chỉ triển khai sau khi task có acceptance criteria, người review và evidence path.

## Thư mục chính

```text
apps/mobile/                 Ứng dụng Expo React Native
services/api/                Edge Functions và tài liệu API
packages/domain/             Kiểu dữ liệu, schema, SRS và logic dùng chung
packages/ui/                 Design tokens và component dùng chung
supabase/                    Migration, policy, seed và cấu hình local
schemas/                     JSON Schema cho deck, card và sync event
docs/                        Product, kiến trúc, spec, báo cáo và tài liệu AI
tasks/                       Backlog, đang làm, đã xong và template task
design/                      Prototype và quy chuẩn giao diện
deliverables/                Báo cáo, slide, demo, release và gói nộp
scripts/                     Công cụ đồng bộ tài liệu và kiểm tra dự án
```

## Nguồn tham chiếu

- Ý tưởng chức năng: `docs/references/source/Tai_lieu.docx`.
- Prototype: `design/prototypes/memo-vocabulary.html`.
- Bài giảng IE307: đọc `docs/references/course/COURSE_TRACEABILITY.md` và chạy `scripts/sync-course-materials.ps1` khi thư mục `D:\UIT\IE307` có cập nhật.
