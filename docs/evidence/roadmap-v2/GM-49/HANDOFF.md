# GM-49 — API xóa tài khoản

Contract `release-v1/2026-11-20/GM-49.1`, migration `0064_gm49_delete_account.sql`, schema `0.31.8`. [ADR-029](../../../architecture/decisions/ADR-029-account-deletion.md).

`POST /functions/v1/delete-account` với Bearer JWT và JSON `{"requestId":"<UUID>"}`. Trả `200` với `{ok:true,data:{requestId,deleted:true}}` khi transaction đã commit. `409 ACTIVE_ROOM` yêu cầu rời/hủy phòng chờ hoặc đợi vòng kết thúc. `409 DELETION_IN_PROGRESS` nghĩa là đang có yêu cầu của cùng tài khoản. Khi gặp lỗi mạng hoặc `503 DELETE_RETRY`, giữ cùng request UUID và cùng bearer ban đầu khi còn hạn. `401 AUTH_REQUIRED` nghĩa là phiên hay credential hết quyền. GM-53 xác nhận lại mật khẩu email và dọn dữ liệu local sau khi nhận ACK.

## Chạy trên QA cô lập

Để kiểm email, bật `[auth.email].enable_signup` trong bản sao cấu hình dùng riêng cho QA trước khi khởi tạo stack. Suite tạo/xác minh hai tài khoản email synthetic qua Admin API rồi đăng nhập qua password grant. Cấu hình mặc định của repo vẫn dùng guest Auth.

```powershell
npm ci
npm run qa:start -- --run-id gm49-qa --api-port 54381 --db-port 54382
$qaPath = (Resolve-Path .work/qa/gm49-qa).Path
New-Item -ItemType Directory -Force -Path (Join-Path $qaPath 'supabase/functions/delete-account') | Out-Null
Copy-Item supabase/functions/delete-account/index.ts (Join-Path $qaPath 'supabase/functions/delete-account/index.ts')
$network = (Get-Content (Join-Path $qaPath 'state.json') -Raw | ConvertFrom-Json).networkId
node node_modules/supabase/dist/supabase.js functions serve delete-account --workdir $qaPath --network-id $network --no-verify-jwt
```

Trong terminal thứ hai đặt `GM03_QA_MANIFEST` trỏ tới manifest của run, chạy `node scripts/gm49_http_check.mjs` và bộ SQL `supabase/tests/database/GM-49_delete_account.test.sql`. Dừng Edge local rồi `npm run qa:stop -- --run-id gm49-qa`. Manual suite ở `supabase/tests/http/GM-49.http`.

GM-52 áp migration trước khi deploy Edge và xác minh ledger, trigger, RPC grants và smoke Auth. Cấu hình gateway bỏ kiểm JWT chung cho route này vì Edge thực hiện xác thực và chỉ cho token đã xóa nhận lại xác nhận cùng yêu cầu còn hạn. Không đưa service role vào client. Kiểm audit log của dịch vụ theo cấu hình hosted. Khi rollback thì gỡ route trước, rồi áp migration nối tiếp sau review. Dữ liệu đã xóa không thể khôi phục bằng rollback code.
