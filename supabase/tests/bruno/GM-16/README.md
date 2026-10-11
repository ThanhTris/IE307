# GM-16 — Bruno local

Open Collection → chọn thư mục này trong Bruno. Collection có10 requests chạy
theo thứ tự00..09. Chọn environment `Local.private`, rồi Run Collection một lần.
`Local` chỉ là template trống; không ghi key thật vào file tracked.

Chuẩn bị backend bằng `npm run backend:start` ở root; cần Docker Linux engine.
Sau khi backend chạy, `node scripts/gm16_bruno_setup.mjs` đọc local CLI status,
chỉ lấy anon/publishable key và ghi environment `.private.bru` đã gitignore.
Không dùng service_role, không gửi request lên remote.

Tests kiểm health, guest/server identity, metadata spoof, restore, missing/forged
JWT, refresh/caller, invalid refresh, logout và refresh đã revoke. Token truyền
bằng runtime variables; không persist hoặc console.log token. Không export raw
response/report chứa credentials. Bruno có thể hiển thị token trong response
signup/refresh; không chia sẻ ảnh/tab đó.

Mỗi lần chạy tạo1 synthetic guest còn trong Auth local; không reset DB hoặc xóa
người dùng tự động. Không chạy lặp collection để thử rate limit. Probe429 riêng
dùng setup `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gm16_rate_limit_setup.ps1`
rồi runner `node scripts/gm16_auth_check.mjs --rate-limit` trên môi trường cô lập.

Collection không kiểm SecureStore/restart/expiry thực hoặc SQL policies. Dùng
native evidence và `node scripts/gm16_auth_check.mjs --sql` riêng. HTTP200 ở health
không thay toàn bộ AC. Chưa chạy thì ghi Not run, không ghi Pass.
