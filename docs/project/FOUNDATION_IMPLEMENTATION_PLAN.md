# Plan GM-02/03 — cấu trúc đã được chủ dự án xác nhận

2026-10-10. Chủ dự án đồng ý cây thư mục UI/BE và yêu cầu triển khai, bổ sung chuẩn đầu ra Expo/API/Data, xác nhận GM-01/ADR-001 đã duyệt và cho phép ghi nhận approval cùng bộ package nền; xem [evidence](../evidence/roadmap-v2/GM-01/REVIEW.md). [GM-02](../../tasks/review/GM-02.md) owner Tuấn/reviewer ThanhTris; [GM-03](../../tasks/review/GM-03.md) owner Trí/reviewer ThanhTris. Codex hỗ trợ triển khai theo yêu cầu; không tự duyệt code/AC của hai task này.

## Trước triển khai code

1. Nhận review GM-01 và contract/stack từ hồ sơ xác nhận; approval chỉ phạm vi baseline/stack, không thay review code/AC GM-02/03.
2. Bộ package nền đã được chủ dự án chốt: Expo 57.0.27, Router 57.0.25, React 19.2.3, React Native 0.86.3, TypeScript 6.0.3, ESLint/Jest/testing-library 14.1.0, Supabase CLI 2.120.0. Dùng peer/tooling tương thích, Node 24.15.0 hiện có; không thêm capability native. Codex triển khai theo patch/test plan này, không đổi owner/reviewer hoặc giả assignment bên GitHub.
3. Chạy readiness từng task; nhận HANDOFF baseline/commit trên nhánh. Giữ graph: GM-02/03 cùng chờ GM-01, không chờ GM-04/data PR hoặc nhau.
4. Đối chiếu sandbox trước reuse, lấy đúng shell/tooling phù hợp, không kéo capability/gallery hoặc contract cũ vào nền.

## Cấu trúc nền phải bàn giao

```text
Project/
  package.json / package-lock.json        GM-03: local BE tooling, không HTTP server
  scripts/backend.mjs                    GM-03: runner Windows/Linux, local only
  mobile/
    package.json / package-lock.json      GM-02: dependencies mobile riêng
    app.config.ts / tsconfig.json / eslint.config.js
    .env.example / README.md / assets/
    src/app/_layout.tsx / index.tsx / +not-found.tsx
    src/bootstrap/AppProviders.tsx
    src/features/home/screens/AppShellScreen.tsx
    src/features/rooms/context/preferences/voting/result/
    src/features/friends/inbox/history/account/
    src/shared/ui/theme/lib/types/
    src/domain/decision/eligibility/
    src/data/api/auth/local/
    tests/README.md
    tests/component/AppShellScreen.test.tsx
    tests/unit/ / tests/integration/
  supabase/
    config.toml / .env.example / README.md
    migrations/
    functions/_shared/README.md
    seed/templates/ / seed/verified/
    tests/README.md
    tests/database/00_local_smoke.test.sql
    tests/http/GM-03.http
    tests/functions/
```

Danh sách thư mục feature/shared/domain/data/seed là vị trí quy hoạch; không phải chuỗi folder lồng nhau và không có nghĩa phải code mọi module. Không tạo hàng loạt file rỗng để vượt gate. File bắt buộc ở task map phải thật sự bàn giao. Data/api/auth/local thay những tên placeholder cũ theo [cấu trúc hiện hành](REPOSITORY_STRUCTURE.md); kiểm tracked files trước rename, không xóa code sandbox/người dùng.

## GM-02 — app shell Expo chạy được

- Tạo cấu hình/runner và lockfile tối thiểu đã review; routes mỏng/default export. `index` mở shell sản phẩm, không capability gallery.
- AppProviders chỉ nền cần thiết (safe area/navigation/config); chưa thêm SDK auth/API, camera/push/SQLite hoặc mock business contract trước task chủ sở hữu.
- AppShellScreen là UI shell thật với label/hành động navigation cần smoke; không làm Home/create/join/lobby nghiệp vụ của GM-09..14.
- Quy tắc import: domain không React/SDK/network; feature không gọi Supabase trực tiếp; shared không import ngược feature. GM-07 sẽ lắp mock/real ở composition root, production không tự fallback fixture.
- README ghi clone sạch → working directory → npm ci → dev LAN/tunnel → route/default screen, Expo Go vs development build; lệnh typecheck/lint/test/bundle đã chạy thật. Không bắt SDK Android/APK để nghiệm thu shell.
- CHECKS: mở app thật trên Expo Go Android, startup/route/back/not-found, screenshot/video/device/runtime/revision; typecheck/lint/shell test/bundle. Chưa có device ghi Not run, không suy từ export bundle.

## GM-03 — BE local có output HTTP và DB smoke

- Root package chỉ CLI/runner local đã review; không server Node mới. `backend.mjs` tránh lệnh phụ thuộc shell Unix/fcntl, chốt cwd/config/projectId/ports của stack local.
- Config không deploy/link remote; seed business chưa bật, chưa thêm room/vote/data schema trước GM-04/06. Env example không secret; status/log bỏ token/key/connection password.
- Runner có start/status/stop/smoke/test; reset chỉ loopback/project local xác định, có guard/xác nhận, không chạy reset trong smoke/test thông thường. Thiếu Docker/CLI/services báo lỗi actionable và exit nonzero.
- `GM-03.http` ghi các health/API nền được CLI đang dùng hỗ trợ, local base URL và expected status/body; không phát minh endpoint nghiệp vụ. Chạy bằng Postman/curl/HTTP runner và lưu assertions output đã che secret.
- `00_local_smoke.test.sql` thực thi DB connection/basic assertion; không runner 0 case gọi là pass. Hướng dẫn test nền và quy ước migration/RPC/auth/errors/functions, để task sau không tự đoán.
- CHECKS: start/status → HTTP request/assertion → database smoke/assertion → stop; lỗi services chưa chạy/thiếu runtime. Không log secret, không network provider hay remote project.

## Làm song song và merge

- GM-02 sở hữu mobile config/lockfile/routes/shell; GM-03 sở hữu root tooling/backend runner/supabase config/tests nền.
- Root README, .gitignore/.gitattributes và CI thống nhất người sửa; chia file nhỏ để tránh conflict. Chỉ pin/change package theo review; checksum artifact nên có newline/UTF-8 xác định trên Windows/Linux.
- Nhánh đề xuất `codex/gm-02-ui-foundation` và `codex/gm-03-be-foundation`; chưa tự tạo/commit/push trong đợt cập nhật plan.
- Sau start gate, hai task làm song song; nếu chủ dự án chọn merge tuyệt đối theo số thì merge GM-02 rồi GM-03, không biến thứ tự merge thành dependency start.
- Reviewer kiểm AC/CHECKS/HANDOFF và gate merge với ref đích cập nhật. Done/Approved chỉ do reviewer độc lập; backend/application smoke không được thay bằng repository docs validator.

## Task nhận tiếp

GM-05 nhận UI shell để dựng component, GM-06 nhận BE local và GM-04 fields để dựng schema, GM-07 nhận UI/BE structure + GM-04 contract để làm client/mock và đối chiếu GM-06 trước merge. GM-08 nạp dữ liệu sau schema; API query thật nhận verified dataset. Không cần merge PR #62 chỉ để làm GM-02/03.
