# Cấu trúc UI, BE và Data — roadmap-v2

Cấu trúc nền GM-02/03 đã triển khai local theo yêu cầu chủ dự án, đang kiểm/nghiệm thu; các feature/schema/API sau vẫn quy hoạch. Code sandbox chỉ tái sử dụng ý tưởng/config sau đối chiếu, không nhập capability spike. Không coi .gitkeep hoặc path trong plan là implementation.

Chủ dự án xác nhận cấu trúc/bộ package và review GM-01/ADR-001 trong hội thoại 2026-10-10. [Plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) ghi file nền và scope/gate; [chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md) bắt buộc UI mở trên Expo, BE có request/output/assertion, Data đủ fields/schema/templates cho BE làm song song.

```text
package.json / package-lock.json GM-03: BE tooling local; không phải Node server
scripts/backend.mjs             GM-03: runner portable/local-only
scripts/README.md               mục lục script theo nhóm; không di chuyển script (CI/evidence tham chiếu đường dẫn)
mobile/                         GM-02: config/lockfile/runner; app chỉ dùng backend thật
  package.json / package-lock.json
  app.config.ts / tsconfig.json / eslint.config.js / .env.example / README.md
  src/README.md                 sơ đồ thư mục, route ↔ feature, quy ước (cập nhật 2026-11-10)
  src/app/                      routes mỏng: index, welcome, tutorial, continue-session, friends, history, inbox, push-settings, profile, join/
    room/                       create, join, setup (chủ phòng và thành viên), lobby, vote, final-round, result, no-consensus
  src/bootstrap/                providers: font, theme, RoomRepositoryProvider (phiên khách + repository)
  src/features/                 home, auth, rooms, context (DishSetupFlow), preferences, voting, result, friends, inbox, history, account
  src/shared/theme/             GM-05 tokens
  src/shared/ui/                GM-05 components chia file theo nhóm (layout, buttons, forms, cards, room, result, feedback, dialogs, tutorial) + index.ts
  src/domain/decision/          GM-15 luật thuần
  src/domain/eligibility/       GM-18 lọc/rank thuần và parity
  src/data/api/                 GM-07 contracts/, client/ + barrel; app chỉ tạo client thật
  src/data/auth/                GM-16 secure session
  src/data/local/               GM-31 SQLite/cache/outbox; bestEffort.ts giới hạn thời gian chờ lưu cục bộ
  tests/README.md               bố cục và lệnh chạy
  tests/unit/ component/ integration/
  tests/mocks/api/              MockApiClient + dữ liệu mock (chỉ dùng trong test)
  tests/fixtures/               dữ liệu và màn preview cho test
supabase/                       GM-03 config/local runner
  config.toml / .env.example / README.md
  migrations/                   GM-06 schema; migration riêng từng task BE
  functions/_shared/            BE helper/transport; không secret mobile
  functions/push-sender/        GM-23
  seed/templates/               GM-04 field/template
  seed/verified/                GM-08 dataset manifest/data đã kiểm
  tests/                        SQL/schema/RLS/RPC/race
    database/00_local_smoke.test.sql GM-03: kết nối/basic assertion
    http/GM-03.http              GM-03: health/API nền local, output/assertion thật
    http/GM-XX.http              mỗi task API sở hữu request suite riêng
    functions/                  khi có Edge Function trong scope
docs/data/                      dictionary/database mapping/dataset handoff
docs/project/audits/            các báo cáo rà soát, đồng bộ UI-BE-Data, báo cáo đóng giai đoạn theo mốc thời gian
tests/fixtures/                 mẫu tổng hợp, không publish verified
docs/evidence/roadmap-v2/        output/test/handoff/review theo task mới
tasks/archive/roadmap-v1/        snapshot JSON giữ task/mapping cũ
```

Feature dùng screens/components/hooks/services/types/index khi cần, không tạo lớp rỗng bắt buộc. Domain không React/SDK/network. UI nhận DTO/view props và repository interface; app luôn dùng client thật, thiếu cấu hình thì báo lỗi, không fallback fixture. Mock chỉ nằm trong mobile/tests.

Route theo màn: index, room/create/join/setup/lobby/vote/final-round/result/no-consensus, friends, inbox, history, profile. Thành viên dùng chung room/setup với stage=preferences. Task màn thêm route của mình. Permission/native modules đưa vào task chức năng GM-24/29/30/31, không chặn xem UI mẫu.

Owner file: GM-02 mobile package/lockfile/config; GM-03 root package/lockfile (chỉ BE tooling)/runner/config; GM-04 dictionary/schema/template/field coverage; GM-05 UI components; GM-06 migrations/schema convention; GM-07 DTO/client/mock. Các task sau bàn giao migration/request/test/file riêng, không sửa migration đã merge hoặc tạo contract trùng. Hai lockfile không là monorepo framework; thư mục quy hoạch của task sau không cần file rỗng hàng loạt.

[Task/owner](TASK_SUMMARY.md) · [luồng bàn giao](IMPLEMENTATION_ROADMAP.md).

## Chuẩn bị dữ liệu khảo sát

data-preparation chứa notebook chia cell, scripts/runner Python, config và snapshots draft. Raw/cache/kết quả thực thi trong datasets được Git bỏ qua; notebook tự tạo thư mục. Xem [hướng dẫn](../../data-preparation/README.md). Scope dữ liệu GM-03 roadmap-v1 chuyển sang GM-04/GM-07 roadmap-v2; catalogue khảo sát không thay verified import GM-08. Không phục hồi task BE GM-03 bằng metadata task dữ liệu cũ.
