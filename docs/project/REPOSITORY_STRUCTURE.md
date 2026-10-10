# Cấu trúc UI, BE và Data — roadmap-v2

Cấu trúc nền GM-02/03 đã triển khai local theo yêu cầu chủ dự án, đang kiểm/nghiệm thu; các feature/schema/API sau vẫn quy hoạch. Code sandbox chỉ tái sử dụng ý tưởng/config sau đối chiếu, không nhập capability spike. Không coi .gitkeep hoặc path trong plan là implementation.

Chủ dự án xác nhận cấu trúc/bộ package và review GM-01/ADR-001 trong hội thoại 2026-10-10. [Plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) ghi file nền và scope/gate; [chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md) bắt buộc UI mở trên Expo, BE có request/output/assertion, Data đủ fields/schema/templates cho BE làm song song.

```text
package.json / package-lock.json GM-03: BE tooling local; không phải Node server
scripts/backend.mjs             GM-03: runner portable/local-only
mobile/                         GM-02: config/lockfile/runner
  package.json / package-lock.json
  app.config.ts / tsconfig.json / eslint.config.js / .env.example / README.md
  src/app/                      routes/layouts mỏng, file riêng mỗi màn
    _layout.tsx / index.tsx / +not-found.tsx
  src/bootstrap/AppProviders.tsx nền providers/composition
  src/features/
    home/screens/AppShellScreen.tsx GM-02: shell sản phẩm
    home/ rooms/ context/ preferences/ voting/ result/
    friends/ inbox/ history/ account/
  src/shared/theme/             GM-05 tokens
  src/shared/ui/                GM-05 components theo mẫu
  src/domain/decision/          GM-15 luật thuần
  src/domain/eligibility/       GM-18 lọc/rank thuần và parity
  src/data/api/                 GM-07 contracts/client/mock; adapters thật về sau
  src/data/auth/                GM-16 secure session
  src/data/local/               GM-31 SQLite/cache/outbox
  tests/README.md                lệnh chạy và scope
  tests/component/AppShellScreen.test.tsx GM-02: smoke shell
  tests/unit/ / tests/integration/ task sau bổ sung theo scope
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
tests/fixtures/                 mẫu tổng hợp, không publish verified
docs/evidence/roadmap-v2/        output/test/handoff/review theo task mới
tasks/archive/roadmap-v1/        snapshot JSON giữ task/mapping cũ
```

Feature dùng screens/components/hooks/services/types/index khi cần, không tạo lớp rỗng bắt buộc. Domain không React/SDK/network. UI nhận DTO/view props và repository interface; composition root chọn mock hay real, production không âm thầm fallback fixture.

Route theo màn: index, room/create/join/[id]/preferences/lobby/vote/final-round/result, friends, inbox, history. GM-02 chỉ tạo shell và quy ước; task màn thêm route của mình. Permission/native modules đưa vào task chức năng GM-24/29/30/31, không chặn xem UI mẫu.

Owner file: GM-02 mobile package/lockfile/config; GM-03 root package/lockfile (chỉ BE tooling)/runner/config; GM-04 dictionary/schema/template/field coverage; GM-05 UI components; GM-06 migrations/schema convention; GM-07 DTO/client/mock. Các task sau bàn giao migration/request/test/file riêng, không sửa migration đã merge hoặc tạo contract trùng. Hai lockfile không là monorepo framework; thư mục quy hoạch của task sau không cần file rỗng hàng loạt.

[Task/owner](TASK_SUMMARY.md) · [luồng bàn giao](IMPLEMENTATION_ROADMAP.md).
