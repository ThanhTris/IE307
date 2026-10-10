# GM-01 — xác nhận duyệt từ chủ dự án

Reviewed-by: Trí
Reviewed-at: 2026-10-10
Decision: Approved — baseline roadmap-v2/cấu trúc và stack, theo xác nhận trực tiếp của chủ dự án.

Owner: Codex. Contract: `food-v1/roadmap-v2/GM-01.1`. Bản nền tại `4f154af714411e81351e7761ceca281b1436fa68`, kèm working-tree cập nhật yêu cầu đầu ra UI/API/Data trong lượt này; chưa có commit mới. Người dùng không cung cấp SHA review riêng. Hồ sơ này ghi nguồn xác nhận, không giả một review GitHub/commit hay test app đã diễn ra.

## Nguồn quyết định

Câu hỏi trong hội thoại: “Để bắt đầu code GM-02/03, reviewer Trí đã duyệt GM-01 và ADR-001 (Expo + Supabase) chưa? Nếu đã duyệt, bạn cho mình phạm vi và revision/evidence review để ghi nhận đúng; hiện repo vẫn ghi GM-01 ở trạng thái review.”

Chủ dự án trả lời: “duyệt rồi”.

Sau khi trình bộ dependency Expo 57.0.27, Router 57.0.25, React 19.2.3, React Native 0.86.3, TypeScript 6.0.3, ESLint/Jest, testing-library 14.1.0 và Supabase CLI 2.120.0, đồng thời xin phép ghi GM-01 Done/Approved và giữ nguyên phân công, chủ dự án trả lời: “Đồng ý bộ package và cập nhật hồ sơ GM-01”.

## Phạm vi và giới hạn

- Roadmap 38 task, dependency/input-output, cấu trúc UI/BE/Data đã thống nhất; chuẩn bàn giao chạy được được bổ sung theo yêu cầu trực tiếp của chủ dự án.
- Expo + Supabase, bộ package nền tối thiểu cho GM-02/03; không camera/push/SQLite, server Node riêng hoặc remote deployment. Peer/transitive dependencies được khóa và kiểm compatibility trong task nền, không bỏ qua peer conflict.
- Codex chỉ ghi nhận quyết định được người dùng cho phép; không tự duyệt app/API, schema/dataset thực hoặc các task GM-02..38. GM-02/03 vẫn cần reviewer và evidence riêng.
- Giữ owner/reviewer cũ: GM-02 Tuấn/Trí, GM-03 Trí/Tâm. Codex hỗ trợ triển khai theo yêu cầu chủ dự án; không giả thành viên đã nhận việc trên GitHub.

## Đối chiếu nền

GM-00 Approved v0.2 và artifact có tại ref local `origin/main` SHA `4f154af714411e81351e7761ceca281b1436fa68`. Checker GM-01 merge trả READY_FOR_MERGE_REVIEW trước khi ghi nhận approval. Chưa fetch xác minh freshness remote trong lượt này; approval và thay đổi mới chưa push/merge. Downstream merge phải đối chiếu target đã cập nhật, không coi start-ready local là đã có trên remote.

[Checks](CHECKS.md) · [Handoff](HANDOFF.md).
