# GM-16 — Bruno execution

Ngày 2026-10-12 (UTC+7). Bruno desktop4.2.1, Docker engine29.4.3,
Supabase CLI2.120.0; project `gi-cung-duoc-local`, loopback54321.
Collection: `supabase/tests/bruno/GM-16`, environment `Local.private` (gitignored).

Quan sát trực tiếp trong Runner bằng Computer Use: **All10 / Passed10 /
Failed0 / Skipped0**. Chạy tuần tự,1 iteration, không parallel; không click raw
response hoặc download report có credentials. Đây là bản chép summary quan sát,
không phải raw export của Bruno.

| Request | HTTP thực tế | Test thực tế |
| --- | --- | --- |
| 00 Health | 200 | GoTrue name/version Pass |
| 01 Create guest | 200 | Anonymous server identity/tokens, không nhận spoofed userId Pass |
| 02 Restore caller | 200 | Cùng server caller, không metadata spoof Pass |
| 03 Missing token | 401 | Missing JWT rejected Pass |
| 04 Forged token | 403 | Forged JWT rejected Pass |
| 05 Refresh session | 200 | Cùng caller và session credentials Pass |
| 06 Verify refreshed token | 200 | Access token mới xác minh cùng caller Pass |
| 07 Invalid refresh | 400 | Invalid token rejected, không access_token Pass |
| 08 Logout | 204 | Logout succeeds Pass |
| 09 Refresh after logout | 400 | Refresh đã revoke bị reject Pass |

Trước lần đạt có hai lần collection lỗi pre-request (URL chưa interpolate;
đọc environment bằng getVar). Sửa bằng `bru.interpolate(req.getUrl())` và
`bru.getEnvVar('publicKey')`, không nới local guard. Lần lỗi chưa gọi signup.

Runner adapter HTTP thật cũng phát hiện response GoTrue dùng numeric `code`
và string `error_code`, gồm `validation_failed` khi refresh sai định dạng.
Adapter đã đọc error_code, giữ fallback code cũ và ánh xạ các rejection của
refresh thành AUTH_REQUIRED; bổ sung5 regression cases. Full mobile9 suites/
356 tests Pass,68 auth tests. HTTP_CHECK.txt có8 HTTP cases,7 SQL assertions và
bounded real HTTP429 probe Pass. Trước probe cần chạy
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gm16_rate_limit_setup.ps1`
để GoTrue nhận trusted `X-Forwarded-For` từ Kong.

Database local ban đầu thiếu public.profiles và chưa có migrations trong
history. Đã dùng `migration up --local` áp dụng0001/0002/0003 có sẵn từ main,
không sửa migration hoặc reset dữ liệu. SQL suite chạy transaction rollback.
Synthetic guests vẫn còn trong Auth local; session của lần Bruno đạt đã logout.

Giới hạn: chưa real expiry/native SecureStore/restart. Không xác nhận
Done/Approved. Backend và Bruno Runner được để mở cho chủ dự án thử lại.
