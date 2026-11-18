# GM-45 — Realtime phiên bản phòng

Baseline `0b34900`, contract `GM-45.1`, migration `0061_gm45_room_realtime.sql`, schema `0.31.6`.

## Backend và consumer

Migration tạo `public.room_version_signals(room_id, version)`, RLS theo `gm17_private.is_member` và publication Supabase Realtime. Trigger INSERT/UPDATE version của phòng v4 cập nhật bảng tín hiệu trong cùng transaction, gồm đường worker. Bảng có một dòng mỗi phòng, được xóa theo FK khi phòng bị xóa.

App subscribe bằng JWT hiện hành, xác nhận quyền và capability qua SELECT hai trường, rồi đọc snapshot sau khi channel đăng ký xong. RoomUpdatesContext được nối mặc định trong RoomRepositoryProvider. Lobby và hai hook voting dùng chung coordinator, mỗi subscription có một request snapshot đang chạy. Event trùng/cũ bị bỏ, event mới được gộp, reconnect/foreground đọc bù. Snapshot lỗi hoặc disconnect retry 2,5/5/10/30 giây. Khi channel khỏe, snapshot chỉ đọc khi cần đồng bộ.

RLS chặn sự kiện cuối của người bị kick. Vì vậy consumer có lease SELECT hai trường mỗi 30 giây để phát hiện mất membership/expiry và thu hồi subscription. Đây là kiểm quyền riêng, không tải snapshot mỗi chu kỳ. Missing table trả CONTRACT_MISMATCH, row bị RLS lọc trả NOT_MEMBER. Epoch của identity, phòng, lifecycle và submit ngăn response cũ ghi đè state. Unmount/background/mất quyền/đã chuyển kết quả dọn socket/timer.

## Chạy lại

1. `npm ci` ở root và mobile, dùng lockfile hiện hành.
2. `npm run qa:start -- --run-id gm45-room-realtime --api-port 54375 --db-port 54376`.
3. Đặt GM03_QA_MANIFEST và GM03_QA_WORKDIR trỏ vào manifest/workdir tương ứng trong `.work/qa/gm45-room-realtime`. Chạy `node scripts/gm45_realtime_check.mjs`. Runner kiểm ownership, JWT/REST, hai subscription, outsider/kick và worker. Report nằm trong `.work/gm45-realtime/results.json`, không chứa credentials.
4. HTTP manual tại `supabase/tests/http/GM-45.http`. Probe SELECT là capability GM-45, schema row tại `docs/architecture/schemas/room-version-signal.schema.json`.
5. Trỏ Metro vào URL/public key QA. ADB reverse 54375 và cổng Metro, mở Expo Go trên AVD. Vào lobby bằng member, thay ready/settings/start bằng client khác để kiểm tự đồng bộ. Ngắt/kết nối mạng và đổi foreground để kiểm catch-up.
6. `npm run qa:stop -- --run-id gm45-room-realtime` chỉ dọn QA owned.

Mobile chạy `npm --prefix mobile run check`. Kiểm riêng với `npm --prefix mobile test -- --runTestsByPath tests/unit/roomRealtime.test.ts tests/component/votingSnapshotLifecycle.test.tsx`.

## Triển khai và khôi phục

Áp 0061 trước cập nhật app. Kiểm ledger, definition trigger, RLS/grants, publication và worker trên target thực tế. Nếu cần hạ app, dùng bản app trước GM-45. Khi cần gỡ backend, migration nối tiếp phải gỡ publication/trigger rồi bảng/schema riêng của GM-45 sau khi consumer đã hạ.
