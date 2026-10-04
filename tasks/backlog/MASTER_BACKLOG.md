# Manabi backlog index on `main`

**Không giao task từ các mục Memo bên dưới.** Đây là backlog của baseline cũ, giữ lại để đối chiếu lịch sử. Manabi dùng [lộ trình và cách bắt đầu](../../docs/project/START_HERE.md), [cổng nghiệm thu](../../docs/project/PROJECT_PLAN.md) và task chi tiết trên nhánh `origin/codex/manabi-task004-restore-2026-10-04`. Chỉ khi đã đọc acceptance criteria, dependency và trạng thái review trên nhánh đó mới nhận task.

| Cổng Manabi | Nội dung khái quát |
| --- | --- |
| G1 | Expo/CI, dữ liệu mẫu và quyết định SQLite local |
| G2 | Deck/card, import, SRS, flashcard và backup offline |
| G3 | Matching, Four Choices, Word Ninja và tiến độ |
| G4 | Pilot quiz Gemini và ảnh đời sống sau consent/review |
| G5–G6 | Chất lượng, build Android, báo cáo và bàn giao |

## Backlog Memo cũ — không áp dụng cho Manabi

## Chuẩn bị và nền tảng

- `SETUP-001` Khởi tạo Expo TypeScript development build và workspace. Owner Trí, reviewer Trang.
- `SETUP-002` Navigation shell, route groups và environment strategy. Owner Trí, reviewer Tuấn.
- `DATA-001` SQLite schema, migration runner và repositories. Owner Tâm, reviewer Trí.
- `BACK-001` Supabase project, schema skeleton và local setup. Owner Trang, reviewer Tâm.
- `UI-001` Design tokens và component nền tảng từ prototype. Owner Tuấn, reviewer Trí.
- `REP-001` Khởi tạo LaTeX, mục lục và evidence registry. Owner Trung, reviewer Tuấn.

## Deck card và import

- `DATA-002` Deck/card JSON validation và schema versioning. Owner Tâm, reviewer Vinh.
- `MOB-001` Deck list, detail, search và empty/error state. Owner Trí, reviewer Tuấn.
- `MOB-002` Dynamic card editor theo fieldSchema. Owner Trí, reviewer Tâm.
- `IMP-001` Paste/CSV parser và fixture Unicode. Owner Vinh, reviewer Tâm.
- `IMP-002` XLSX reader, column mapping, preview và duplicate policy. Owner Vinh, reviewer Trang.
- `QA-001` Acceptance test import 100 card và rollback. Owner Trung, reviewer Vinh.

## Study và SRS

- `SRS-001` Chốt scheduler version và fixture. Owner Vinh, reviewer Tâm.
- `SRS-002` Scheduler domain service và unit tests. Owner Tâm, reviewer Trí.
- `MOB-003` Study screen, flip, ratings và counts. Owner Trí, reviewer Tuấn.
- `DATA-003` Review event history và due queries. Owner Tâm, reviewer Trang.
- `QA-002` Kiểm thử timezone, offline nhiều ngày và duplicate event. Owner Trung, reviewer Vinh.

## Games và tiến độ

- `GAME-001` Matching vertical slice. Owner Tuấn, reviewer Trí.
- `GAME-002` Four Choices và distractor validation. Owner Vinh, reviewer Tuấn.
- `GAME-003` Word Ninja logic, reduce motion và performance. Owner Tuấn, reviewer Trí.
- `GAME-004` Game result policy và SRS signal limit. Owner Vinh, reviewer Tâm.
- `MOB-004` Progress, history và frequently missed cards. Owner Trí, reviewer Trung.

## Auth sync và backup

- `AUTH-001` Auth flow và secure session. Owner Trang, reviewer Trí.
- `BACK-002` PostgreSQL/JSONB migrations và RLS. Owner Trang, reviewer Tâm.
- `SYNC-001` Local queue và idempotent event contract. Owner Tâm, reviewer Trang.
- `SYNC-002` Batch push/pull và conflict UI. Owner Trang, reviewer Trí.
- `SYNC-003` Hai thiết bị và failure recovery fixtures. Owner Vinh, reviewer Tâm.
- `DATA-004` Export/import versioned JSON backup. Owner Vinh, reviewer Trang.

## Chất lượng release và báo cáo

- `QA-003` Responsive, safe area, font scaling, dark mode và accessibility. Owner Tuấn, reviewer Trung.
- `QA-004` E2E smoke Android/iOS và device matrix. Owner Trung, reviewer Trí.
- `QA-005` Performance list/import/game và crash triage. Owner Trí, reviewer Vinh.
- `REL-001` Icon, splash, privacy text và store screenshots. Owner Tuấn, reviewer Trang.
- `REL-002` Android signed AAB và Play internal track. Owner Trang, reviewer Trí.
- `REL-003` iOS archive/TestFlight khi tài khoản cho phép. Owner Trang, reviewer Trí.
- `REP-002` Chương 1-3 và sơ đồ. Owner Trung, reviewer Trí/Tâm.
- `REP-003` Chương kết quả, đánh giá, kết luận và phụ lục. Owner Trung, reviewer toàn nhóm.
- `SLIDE-001` Slide thuyết trình và Q&A bank. Owner Tuấn, reviewer Trung.
- `DEMO-001` Kịch bản, dữ liệu và rehearsal demo. Owner Tuấn, reviewer Trung.
- `PKG-001` ZIP nộp bài, Drive links và quyền truy cập. Owner Trung, reviewer Trang.
