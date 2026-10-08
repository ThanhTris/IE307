# Cấu trúc React Native / Expo

Đây là cấu trúc nguồn đề xuất, chưa có package/config/build native. Các thư mục rỗng có `.gitkeep` để nhóm thấy ranh giới; GM-02 tạo file ứng dụng sau review, không coi placeholders là tính năng.

```text
mobile/
  src/
    app/                   Expo Router: routes/layouts mỏng
    features/
      identity/            guest, account link
      rooms/               create/join/lobby/preferences
      voting/              card, ballot, submission
      results/             result/no-consensus/Maps
      partners/            bạn quen/lời mời hai chiều P0
      history/             history tối thiểu/consent P0, sync đa thiết bị P1
    domain/decision/       kiểu/policy thuần TypeScript
    data/
      supabase/            RPC/realtime adapters
      local/               draft/cache/session adapters
    shared/
      ui/                  Button/Chip/Card/EmptyState
      theme/               semantic tokens
      lib/                 errors/validation/date
      types/               kiểu chung thật sự cần chia sẻ
  assets/                  hình/font có quyền dùng
  tests/                   unit/component/integration mobile
supabase/
  migrations/              schema/policies/functions versioned
  seed/                    catalogue demo, không dữ liệu cá nhân
  tests/                   SQL/RLS/RPC tests
tests/
  fixtures/                đầu vào/kết quả quyết định chia sẻ
  e2e/                     Android flow theo test plan
```

Mỗi feature triển khai dùng `screens/`, `components/`, `hooks/`, `services/`, `types.ts`, `index.ts` khi thực sự cần; không tạo mọi tầng cho một file đơn giản. Chỉ feature public API được import ra ngoài. Domain không import React hoặc SDK. Supabase adapter không chứa JSX.

## Route dự kiến (GM-02 sẽ tạo)

`src/app/_layout.tsx`, `index.tsx`, `room/create.tsx`, `room/join.tsx`, `room/[id]/preferences.tsx`, `room/[id]/lobby.tsx`, `room/[id]/vote.tsx`, `room/[id]/final-round.tsx`, `room/[id]/result.tsx`, `partners/index.tsx` `history/index.tsx` và `notifications/index.tsx` (P0); account/recovery (P1).

Route chỉ parse params/guard và render feature screen. ID trên URL không cấp quyền. Android Back trong phòng theo ROOM_SPEC, không cho back sửa phiếu đã nộp.

## Config sẽ bổ sung ở bootstrap

`mobile/package.json`, một lockfile, `app.config.ts`, `tsconfig.json`, lint/test config, `.env.example`, `expo-env.d.ts`. Không để config placeholder giả chạy. `android/ios` theo chiến lược Expo prebuild quyết định ở GM-02; không commit build artifacts. Supabase config/migration đầu ở GM-05.

Nguồn cũ nằm trong lịch sử Git (commit `6086c16`); `docs/decision/` cũ đã được gỡ trong lần chuyển đề tài, không là nguồn hiện hành.

## Phạm vi v0.2

features/notifications dự kiến chứa inbox/permission/token/navigation; data/local chứa SQLite draft/cache/outbox/history, data/supabase chứa RPC/realtime adapters. trusted push sender dự kiến supabase/functions, dùng secrets server. Chỉ là sơ đồ, chưa có packages hoặc file triển khai. [Spec index](../specs/README.md).

## Food-v1

GM-10 bổ sung feature/context và adapter vị trí/anchor trước create UI; GM-11 domain/eligibility thuần và SQL query; GM-08 verified seed/coverage/schedules. Đây là đích task, chưa có implementation. `scripts/task_readiness.py` kiểm gate và sinh các task indexes từ frontmatter. [Dependency map](TASK_DEPENDENCIES.md).
