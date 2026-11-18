# GM-44 — Bàn giao tìm phòng đang tham gia

GM-44.1 dùng migration `0060_gm44_active_room.sql` (schema `0.31.5`) trên nhánh đích có `0059`. App gọi `dish_session('activeRoom', {contractVersion})` theo GM-07.B-supplement. Consumer nhận tóm tắt phòng hoặc `null`. Quyền quay lại vẫn theo ADR-027. Home, Join và Continue kiểm tiếp snapshot trước khi đưa người dùng về bước tương ứng.

## Chạy lại trên QA

1. Chạy `npm ci` ở root và `mobile`.
2. Từ root, chạy `npm run qa:start -- --run-id gm44-active-room --api-port 54371 --db-port 54372`. Dùng quyền và key do runner tạo trong workspace ignore. Kiểm runner đã xác minh ledger, source SQL và heartbeat worker.
3. Đặt `GM03_QA_MANIFEST` trỏ vào `.work/qa/gm44-active-room/manifest.json` và `GM03_QA_WORKDIR` trỏ vào `.work/qa/gm44-active-room`. Chạy `node scripts/gm20_canonical_http.mjs` để kiểm fixture synthetic bằng Auth, REST và SQL. Các dòng `GM-44` kiểm riêng chức năng tìm phòng. Có thể dùng `supabase/tests/http/GM-44.http` với JWT của fixture.
4. Trỏ `EXPO_PUBLIC_SUPABASE_URL` và `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` của Metro vào QA. Reverse cổng Metro và REST qua ADB. Kiểm Home, Join, Continue với tài khoản có và không có phòng, rồi đưa phòng qua các trạng thái bỏ phiếu.
5. Dùng `npm run qa:stop -- --run-id gm44-active-room` để dọn đúng môi trường QA này.

## Triển khai

Áp migration rồi kiểm ledger, quyền RPC và body function thực tế trước cập nhật app. App yêu cầu query mới. Khi cần hạ phiên bản app, bản app trước GM-44 vẫn gọi các query cũ qua cùng router. Khi cần bỏ migration, phát hành migration nối tiếp khôi phục router từ `dish_session_before_gm44` sau khi kiểm các wrapper đã phát hành sau 0060.
