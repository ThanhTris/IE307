# GM-46 — Tránh món gần đây

Contract task `dish-session-v4/roadmap-v2/GM-46.1`, migration `0062_gm46_has_recent_history.sql`, schema `0.31.7`.

`dish_session(getDefaultPreferences)` trả thêm `data.hasRecentHistory` trên supplement. Cờ lấy từ consent cá nhân đang bật và dòng lịch sử cá nhân còn hạn có món thắng, cùng điều kiện với `start`. Mobile dùng cờ cho phòng mới hoặc host, tắt ô nếu backend cũ thiếu cờ. Payload command baseline giữ nguyên.

## Chạy trên QA cô lập

```powershell
npm ci
npm run qa:start -- --run-id gm46-qa --api-port 54379 --db-port 54380
$env:GM03_QA_MANIFEST = (Resolve-Path .work/qa/gm46-qa/manifest.json).Path
node scripts/gm46_http_check.mjs
npm --prefix mobile test -- --runTestsByPath tests/unit/pr155RemainingFlows.test.ts tests/unit/roomRepository.test.ts tests/unit/pr155ReviewCurrent.test.ts
npm run qa:stop -- --run-id gm46-qa
```

Dùng run-id mới cho lần chạy mới. Runner tạo fixture qua Auth và REST trên chính QA owned, kiểm SQL expiry bằng lịch sử synthetic rồi đối chiếu cờ qua REST. Bộ request manual ở `supabase/tests/http/GM-46.http`.

Trên AVD, trỏ app vào cùng QA bằng `EXPO_PUBLIC_SUPABASE_URL` và publishable key. Mở phần thiết lập bằng tài khoản chưa có lịch sử, rồi kiểm lại sau khi đã lưu một bữa có món thắng. Áp migration trước khi phát hành app để ô hoạt động với người đủ điều kiện. Kiểm ledger và worker sau khi deploy.
