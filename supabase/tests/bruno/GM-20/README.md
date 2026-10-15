# GM-20 local fixture và Bruno

Chỉ dữ liệu mô phỏng trong DB namespace sở hữu; không reset DB ứng dụng,
không publish catalogue draft. Supabase local phải chạy trước:

```sh
npm ci
node scripts/backend.mjs start
node scripts/gm20_http_check.mjs
# Giữ fixture cho Bruno sau suite tự động:
node scripts/gm20_http_check.mjs --bruno
# Chạy lại suite tự động trên fixture đang giữ:
node scripts/gm20_http_check.mjs --against
# Regression GM19 rồi reset riêng DB disposable và kiểm lại GM20:
node scripts/gm20_gm19_regression.mjs
node scripts/gm20_http_check.mjs --against --reset
# Stop phiên owned và cleanup:
node scripts/gm20_http_stop.mjs
```

Python cần runtime đã có pandas/lxml. Có thể đặt `GM20_PYTHON=/path/to/python` (regression dùng `GM19_PYTHON`);
không thêm package. Node24, Docker/Supabase CLI từ lockfile. Lần chạy đầu có thể
phải pull các image của cấu hình Supabase hiện hành; runner disposable dùng image
PostgREST đã có với `--pull never`.

Mở collection folder này, chọn `Local.runtime.private`, Run Collection theo thứ tự.
File môi trường và runtime state0600 được ignore, chứa JWT/control; không copy vào
PR/evidence. `Local.bru` chỉ placeholder. Chạy01 Reset tạo phòng mới và lấy pool,
02–03 accepted/exact ACK,04–05 round2 không default KEEP,06–08 chốt COMPROMISE và
snapshot persisted,09 outsider403. Chạy lại từ01, không sửa row/pool/version thủ công.
Reset chỉ trong DB owned, không xóa fixture của phiên khác. Stop hoặc Ctrl+C để
runner dọn container disposable, DB và tagged guest identities. Stack Supabase
nền giữ để task khác dùng. File runtime bị chỉnh/thay bởi phiên khác sẽ được giữ
và báo cleanup failure thay vì xóa nhầm.

Port54332 loopback dành GM20; không là URL của điện thoại. Không expose auth/DB
ra mạng hoặc dùng service_role trong client. HTTP suite tự động chứa race, fault
injection và parity; Bruno9 requests chỉ walkthrough submit/snapshot/privacy,
không được coi là đã chạy toàn bộ race hoặc Android integration.

Runner gọi entrypoint Node Supabase qua `cliArgs` của nền, để package chính thức
tự chọn windows/darwin/linux và kiến trúc. `node --test tests/gm20-cli.test.mjs`
kiểm launch CLI thật không cần Docker; workflow GM-20 CLI portability chạy ba OS.
CLI launch không là API Pass; HTTP suite vẫn cần Docker Linux và Python theo trên.
