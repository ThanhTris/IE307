# Kế hoạch xây dựng Memo Vocabulary trong hai tháng

## 1 Tổng quan và kết luận kế hoạch

Nhóm phát triển Memo Vocabulary thành ứng dụng React Native chạy Android và iOS, có thể tạo release build và chuẩn bị hồ sơ phát hành. Nhóm đặt mốc release candidate nội bộ vào ngày 15/11/2026, sớm hơn mốc hai tháng 24/11/2026 để dành chín ngày kiểm thử, sửa lỗi và hoàn thiện gói nộp.

Phiên bản đầu giải quyết hai vấn đề chính: người học mất nhiều thời gian chuẩn bị dữ liệu flashcard và dễ chán khi chỉ học bằng thao tác lật thẻ. Sản phẩm kết hợp thẻ nhiều trường theo JSON schema, nhập CSV/Excel/dán văn bản, ôn tập ngắt quãng và ba trò chơi dùng cùng dữ liệu học.

## 2 Khoảng trống cần kiểm chứng

Đây là giả thuyết sản phẩm cần được kiểm chứng bằng khảo sát và usability test, không phải kết luận có sẵn:

- Công cụ SRS mạnh có thể tạo cảm giác nhiều thiết lập và tốn thời gian chuẩn bị bộ thẻ.
- Công cụ học dễ tiếp cận có thể không cho người dùng đủ quyền tùy biến cấu trúc trường và cách lưu dữ liệu.
- Game hóa thường tách khỏi lịch ôn hoặc đánh giá quá mạnh câu trả lời có sẵn.

Memo kiểm chứng hướng kết hợp: nhập nhanh, schema thẻ linh hoạt, offline-first, SRS minh bạch và game chỉ tạo tín hiệu bổ sung có trọng số vừa phải.

## 3 Mục tiêu đo được

- Người dùng nhập và sửa được một bộ ít nhất 100 thẻ từ CSV/Excel hoặc văn bản.
- Deck định nghĩa được trường tùy biến; card hợp lệ theo JSON schema của deck.
- Học flashcard, đánh giá Again/Hard/Good/Easy và tạo lịch ôn tiếp theo.
- Matching, Word Ninja và Four Choices dùng chung card đã học; lỗi thao tác hoặc vật phẩm không làm sai lịch ôn.
- Hoạt động ngoại tuyến; đăng nhập và đồng bộ khi có mạng.
- Android AAB build thành công; iOS archive/TestFlight hoàn thành nếu tài khoản Apple cho phép.
- Không có lỗi blocker/critical trong luồng demo; crash-free cho bộ test thiết bị của nhóm.
- Báo cáo, slide, demo, mã nguồn và LaTeX được đóng gói đúng yêu cầu.

## 4 Phạm vi MVP

### Bắt buộc

- Onboarding tối thiểu và authentication.
- Tạo, sửa, xóa, tìm kiếm deck/card.
- Deck schema và card fields dạng JSON có validation.
- Nhập CSV, Excel, dán văn bản; ánh xạ cột, preview, xử lý dòng trống và trùng.
- Flashcard study và lịch ôn cơ bản.
- Ba game: Matching, Word Ninja, Four Choices.
- Tiến độ, lịch sử, thẻ thường sai.
- SQLite offline, export/import JSON backup, Supabase sync.
- Responsive/adaptive UI, safe area, dark mode cơ bản và accessibility.
- Release build, store metadata và checklist phát hành.

### Sau MVP

- AI tạo thẻ/ví dụ trực tiếp trong app.
- Kho deck cộng đồng, lớp học, giao bài và phụ huynh.
- Import trực tiếp qua API riêng của Quizlet/Anki.
- Hệ thống gợi ý nâng cao hoặc mô hình học máy.

## 5 Kiến trúc và công nghệ

- Expo React Native và TypeScript cho một codebase Android/iOS.
- Expo Router cho điều hướng, development build cho native capability.
- StyleSheet/NativeWind, Flexbox/Yoga, `useWindowDimensions`, safe area và platform-specific style.
- SQLite lưu offline. Trường tùy biến được serialize JSON; cột lịch ôn và đồng bộ được chuẩn hóa để query hiệu quả.
- Supabase PostgreSQL dùng JSONB cho `field_schema` và `fields`, Auth cho tài khoản, RLS cho phân quyền.
- Edge Functions/RPC chỉ dùng cho nghiệp vụ cần transaction hoặc đồng bộ theo lô.
- JSON Schema trong `schemas` là contract giữa mobile, local DB và backend.

## 6 Kế hoạch tám tuần

| Giai đoạn | Thời gian | Kết quả bắt buộc | Cổng nghiệm thu |
| --- | --- | --- | --- |
| Chuẩn bị | 24/09-27/09 | Repo, plan, AIDD, PRD, kiến trúc, task sheet | Phạm vi và owner được nhóm xác nhận |
| Tuần 1 | 28/09-04/10 | Expo app, navigation, tokens, SQLite/Supabase skeleton, LaTeX | App chạy Android và iOS simulator/device |
| Tuần 2 | 05/10-11/10 | Deck/card JSON schema, CRUD, import text/CSV/Excel, preview | Import 100 thẻ và rollback lỗi đúng |
| Tuần 3 | 12/10-18/10 | Study screen, scheduler, review history, tests | Again/Hard/Good/Easy sinh lịch đúng fixture |
| Tuần 4 | 19/10-25/10 | Ba game, game result policy, progress | Game dùng card đã học và không làm sai SRS |
| Tuần 5 | 26/10-01/11 | Auth, RLS, offline queue, sync/conflict, export backup | Hai thiết bị đồng bộ không mất dữ liệu |
| Tuần 6 | 02/11-08/11 | Accessibility, responsive, performance, E2E, store assets | Không còn blocker/critical; build CI sạch |
| Tuần 7 | 09/11-15/11 | RC, Android AAB, iOS archive, báo cáo, slide, demo | RC đóng băng; demo rehearsal đạt |
| Buffer | 16/11-23/11 | Sửa lỗi, kiểm tra chéo, hoàn thiện ZIP | Checklist nộp bài đạt 100% |

## 7 Cách phối hợp

- Trí chịu trách nhiệm kỹ thuật mobile và tích hợp.
- Trang chịu trách nhiệm backend, auth, sync và release.
- Tâm chịu trách nhiệm schema, local data và migration.
- Vinh chịu trách nhiệm import, scheduler data, analytics và fixture.
- Trung chịu trách nhiệm product, QA, báo cáo và quản lý yêu cầu.
- Tuấn chịu trách nhiệm UI/UX, accessibility, slide, demo và visual QA.

Mỗi task có một owner và một reviewer khác owner. Thay đổi schema/sync cần review chéo fullstack và data.

## 8 Chiến lược kiểm thử

- Unit: schema validation, import parser, SRS, game result policy, conflict resolution.
- Component: form, deck list, study controls, error/empty/loading states.
- Integration: SQLite repositories, Supabase RLS, offline queue và resume sync.
- E2E smoke: import deck, học thẻ, chơi game, đồng bộ, export backup.
- Device matrix: ít nhất hai Android có kích thước khác nhau và một iOS simulator/device.
- Usability: 10-15 người dùng; đo thời gian nhập, tỷ lệ hoàn thành, lỗi và phản hồi SUS/rút gọn.

## 9 Kế hoạch báo cáo và demo

Báo cáo được viết song song từ tuần 1. Mỗi pull request liên quan tính năng phải bổ sung evidence: ảnh, test output, số liệu hoặc sơ đồ. Tuần 7 chỉ tổng hợp và chỉnh sửa, không bắt đầu viết từ đầu.

Demo chuẩn gồm: nhập dữ liệu, chỉnh schema, học flashcard, đánh giá SRS, chơi một game, xem tiến độ, bật offline, đăng nhập đồng bộ và trình bày release build.

## 10 Tiêu chí dừng phạm vi

Nếu chậm hơn kế hoạch quá ba ngày, ưu tiên theo thứ tự: dữ liệu/CRUD, import, study/SRS, một game hoàn chỉnh, auth/sync, hai game còn lại, polish. Không cắt validation, backup, RLS hoặc release evidence để giữ hiệu ứng giao diện.
