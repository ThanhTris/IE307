# Cấu trúc UI, BE và Data — roadmap-v2

Cấu trúc đích để các task bàn giao; main hiện có tài liệu/prototype/skeleton, code thử ở nhánh sanbox được tái sử dụng sau đối chiếu. Không coi .gitkeep hoặc path trong plan là implementation.

```text
mobile/                         GM-02: config/lockfile/runner
  src/app/                      routes/layouts mỏng, file riêng mỗi màn
  src/features/
    home/ rooms/ context/ preferences/ voting/ result/
    friends/ inbox/ history/ account/
  src/shared/theme/             GM-05 tokens
  src/shared/ui/                GM-05 components theo mẫu
  src/domain/decision/          GM-15 luật thuần
  src/domain/eligibility/       GM-18 lọc/rank thuần và parity
  src/data/api/                 GM-07 contracts/client/mock; adapters thật về sau
  src/data/auth/                GM-16 secure session
  src/data/local/               GM-31 SQLite/cache/outbox
  tests/                        unit/component/integration
supabase/                       GM-03 config/local runner
  migrations/                   GM-06 schema; migration riêng từng task BE
  functions/_shared/            BE helper/transport; không secret mobile
  functions/push-sender/        GM-23
  seed/templates/               GM-04 field/template
  seed/verified/                GM-08 dataset manifest/data đã kiểm
  tests/                        SQL/schema/RLS/RPC/race
docs/data/                      dictionary/database mapping/dataset handoff
tests/fixtures/                 mẫu tổng hợp, không publish verified
docs/evidence/roadmap-v2/        output/test/handoff/review theo task mới
tasks/archive/roadmap-v1/        snapshot JSON giữ task/mapping cũ
```

Feature dùng screens/components/hooks/services/types/index khi cần, không tạo lớp rỗng bắt buộc. Domain không React/SDK/network. UI nhận DTO/view props và repository interface; composition root chọn mock hay real, production không âm thầm fallback fixture.

Route theo màn: index, room/create/join/[id]/preferences/lobby/vote/final-round/result, friends, inbox, history. GM-02 chỉ tạo shell và quy ước; task màn thêm route của mình. Permission/native modules đưa vào task chức năng GM-24/29/30/31, không chặn xem UI mẫu.

Owner file: GM-02 mobile package/lockfile/config; GM-03 BE tooling/config; GM-04 dictionary/template; GM-05 UI components; GM-06 migrations/schema convention; GM-07 DTO/client/mock. Các task sau bàn giao migration/file riêng, không sửa migration đã merge hoặc tạo contract trùng.

[Task/owner](TASK_SUMMARY.md) · [luồng bàn giao](IMPLEMENTATION_ROADMAP.md).
