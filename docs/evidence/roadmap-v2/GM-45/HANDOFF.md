# GM-45 — Realtime phiên bản phòng

Baseline `0b34900`, contract `GM-45.1`, migration `0061_gm45_room_realtime.sql`, schema `0.31.6`.

## Backend và consumer

Migration tạo `public.room_version_signals(room_id, version)`, RLS theo `gm17_private.is_member` và publication Supabase Realtime. Trigger cập nhật version của phòng v4 trong cùng transaction, gồm đường worker. Khi retention xóa phòng, FK dọn dòng version tương ứng. Publication chỉ phát INSERT và UPDATE để DELETE không đưa ID phòng ra ngoài chính sách RLS. Inbox dùng INSERT trong cùng publication. [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes#receiving-old-records)

App subscribe INSERT và UPDATE bằng JWT hiện hành, xác nhận quyền và capability qua SELECT hai trường, rồi đọc snapshot sau khi channel đăng ký xong. RoomUpdatesContext được nối mặc định trong RoomRepositoryProvider. Lobby và hai hook voting dùng chung bộ đồng bộ, mỗi subscription có một request snapshot đang chạy. Event trùng hoặc cũ bị bỏ, event mới được gộp, reconnect và foreground đọc bù.

Khi mất Realtime, nhịp snapshot là 2,5 → 5 → 10 → 30 giây ngay cả khi REST trả về bình thường. Khi channel kết nối lại, app đọc bù và đặt lại nhịp. Lỗi mạng, timeout hoặc rate limit từ Auth giữ cả retry socket và fallback snapshot. Nếu Auth xác nhận mất phiên thì dừng cả hai.

RLS chặn sự kiện cuối của người bị kick. Vì vậy consumer có lease SELECT hai trường mỗi 30 giây để phát hiện mất membership/expiry và thu hồi subscription. Đây là kiểm quyền riêng, không tải snapshot mỗi chu kỳ. Missing table trả CONTRACT_MISMATCH, row bị RLS lọc trả NOT_MEMBER. Epoch của identity, phòng, lifecycle và submit ngăn response cũ ghi đè state. Unmount/background/mất quyền/đã chuyển kết quả dọn socket/timer.

## Chạy lại

Mỗi lần chạy dùng run-id mới vì runner giữ hồ sơ của lần đã cleanup. Ví dụ trên PowerShell:

```powershell
$qaRun = 'gm45-review-' + (Get-Date -Format 'yyyyMMddHHmmss')
npm run qa:start -- --run-id $qaRun --api-port 54375 --db-port 54376
$env:GM03_QA_WORKDIR = (Resolve-Path ".work/qa/$qaRun").Path
$env:GM03_QA_MANIFEST = (Resolve-Path ".work/qa/$qaRun/manifest.json").Path
node scripts/gm45_realtime_check.mjs
npm run qa:stop -- --run-id $qaRun
```

Các bước dưới đây mô tả run đã nghiệm thu. Thay `gm45-room-realtime` bằng run-id mới khi thực hiện lại.

1. `npm ci` ở root và mobile, dùng lockfile hiện hành.
2. `npm run qa:start -- --run-id gm45-room-realtime --api-port 54375 --db-port 54376`.
3. Đặt GM03_QA_MANIFEST và GM03_QA_WORKDIR trỏ vào manifest/workdir tương ứng trong `.work/qa/gm45-room-realtime`. Chạy `node scripts/gm45_realtime_check.mjs`. Runner kiểm ownership, JWT/REST, hai subscription, outsider/kick và worker. Report nằm trong `.work/gm45-realtime/results.json`, không chứa credentials.
4. HTTP manual tại `supabase/tests/http/GM-45.http`. Probe SELECT là capability GM-45, schema row tại `docs/architecture/schemas/room-version-signal.schema.json`.
5. Trỏ Metro vào URL/public key QA. ADB reverse 54375 và cổng Metro, mở Expo Go trên AVD. Vào lobby bằng member, thay ready/settings/start bằng client khác để kiểm tự đồng bộ. Ngắt/kết nối mạng và đổi foreground để kiểm catch-up.
6. `npm run qa:stop -- --run-id gm45-room-realtime` chỉ dọn QA owned.

Mobile chạy `npm --prefix mobile run check`. Kiểm riêng với `npm --prefix mobile test -- --runTestsByPath tests/unit/roomRealtime.test.ts tests/component/votingSnapshotLifecycle.test.tsx`.

## Triển khai và khôi phục

Áp 0061 trước cập nhật app. Kiểm ledger, definition trigger, RLS/grants, publication và worker trên target thực tế. Lưu cấu hình publication trước khi áp vì cờ publish áp dụng cho toàn bộ bảng trong publication này. Nếu cần hạ app, dùng bản app trước GM-45. Khi cần gỡ backend sau khi consumer đã hạ, dùng migration nối tiếp gỡ bảng tín hiệu khỏi publication, gỡ trigger rồi xóa bảng/schema riêng của GM-45.
