# GM-16 — Checks / food-v1 roadmap-v2

Status: In progress; API/SQL/rate-limit và harness code đã Pass ở mức static/unit, expiry/native AC còn Not run,
chưa Approved/Done.
Owner Trí / ThanhTris; reviewer Tâm / HoaiTam (chủ dự án chọn trực tiếp).
Ngày kiểm: 2026-10-11 UTC+7. Nhánh `codex/gm-16-guest-session`, target main.
Base `9188c736def7e125266f8cce2314b9f1f5c31b81`; implementation đang ở revision sau merge main.
Tested hashes cuối tại MANIFEST.json khi các phép kiểm kết thúc.
Contract GM-16.1; input GM-03.1 / GM-06.1 schema0.1.0 / GM-07.1.
Dataset N/A: auth không phụ thuộc verified catalogue; identities/tests synthetic.
Windows, Node24.15.0, npm11.12.1, Expo57.0.27, SecureStore57.0.4.
Python bundled3.12.14 có Asia/Ho_Chi_Minh; Python3.14 ban đầu thiếu tzdata.

## Setup / kiểm lại

```powershell
cd mobile
npm ci --no-audit --no-fund
npm run check
npm run check:expo
npm run bundle:android
cd ..
npm ci --no-audit --no-fund
npm run backend:start
node scripts/gm16_auth_check.mjs --sql --rate-limit
```

Backend cần Docker Linux engine đáp ứng và schema0001 hiện hành. Không reset hoặc
đổi project để vượt lỗi. Trước rate probe chạy
`powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gm16_rate_limit_setup.ps1`;
script chỉ thay Auth container local, giữ database volume và bật trusted
`X-Forwarded-For`. Probe dùng một chuỗi refresh token hợp lệ có rotation, tối đa
180 request paced, và phải nhận HTTP429. Runner không lưu token/response raw,
không dùng service_role; synthetic guest records còn trong Auth local sau
signout. SQL chạy transaction rollback với7 assertions thực.
HTTP collection tại supabase/tests/http/GM-16.http dùng environment placeholders.
Bruno collection tại supabase/tests/bruno/GM-16; chạy
`node scripts/gm16_bruno_setup.mjs`, Open Collection, chọn Local.private,
Run Collection tuần tự. Xem BRUNO_CHECK.md. Nếu DB local chưa có migration,
kiểm `migration list --local` rồi `migration up --local`; không reset DB.

## Kết quả thực tế

| Case/AC | Expected/assertions | Actual / artifact | Kết quả |
| --- | --- | --- | --- |
| Guest name/secure persist/restore | Invalid input không signup; persist trước publish; restore cùng caller qua server port | 69 authSession/authTransport tests Pass với synthetic port; MOBILE_CHECK.txt | Pass (adapter scope) |
| Refresh/expiry/concurrency | Serialized rotation, cùng user, stale/revoked reject, không blind retry token rotation | Adapter tests; expire/reject qua port tổng hợp, không GoTrue thật | Pass (adapter scope) |
| Failure/retry/rate limit | Timeout abort thật trong fetch test, max2 verify retry, Retry-After, safe errors | Adapter tests; HTTP429 fixture, không auth provider thật | Pass (adapter scope) |
| Logout/privacy/isolation | Clear storage/cache cả offline; cleanup lỗi block đổi identity; response cũ sau logout/auth loss reject | Adapter tests; required cleanup callback không no-op mặc định | Pass (adapter scope) |
| SecureStore boundary | Một encrypted entry/device-only option, corrupt reject, delete đúng key | SecureStore port mock, không thiết bị Android | Pass (adapter scope) |
| Guest/restore/refresh/logout/spoof HTTP | Status/body/assertions thật qua GoTrue local | HTTP_CHECK.txt:8 cases Pass; Bruno4.2.1:10/10 requests/tests Pass, BRUNO_CHECK.md | Pass |
| SQL auth.uid/default deny | 7 pgTAP assertions trên schema0.1.0 thật, rollback | HTTP_CHECK.txt: auth.sql7 assertions Pass sau migration up --local0001..0003 | Pass |
| Real HTTP429/expiry | GoTrue throttle và expiry thực | RATE_LIMIT_CHECK.txt/HTTP_CHECK.txt: bounded real HTTP429 Pass; JWT expiry thực chưa chờ | Pass (rate429; expiry Not run) |
| Native restart/lost session/backup | Android thật cùng identity sau restart, uninstall không recover guest, backup exclude secure entry | Chưa có device/adb execution evidence | Not run |
| Expo compatibility | SDK dependency check exit0; Android bundle exit0 | check:expo “Dependencies are up to date”; bundle 1245 modules, dist/android | Pass (bundle, không native smoke) |
| Internal Android harness route | Development flag only; guest/restore/refresh/check/private marker/logout actions; no token/raw response | `mobile/src/app/internal/gm16.tsx`, `mobile/src/features/auth/screens/Gm16InternalScreen.tsx`; Android device run chưa có | Pass (code/bundle; device Not run) |
| Full mobile checks | TypeScript/lint/Jest/architecture exit0 | `npm run typecheck`, `npm run lint`, `npm test`: 9 suites/357 tests Pass; Android bundle export Pass | Pass |
| Repo validator/indexes/diff | Offline checks exit0 | Validator/indexes/diff đạt; DOCS_CHECK.txt lưu lần cuối | Pass |
| Python regression | Runtime đủ timezone; không bỏ qua lỗi | PYTHON_REGRESSION.txt: 524 tests, 524 Pass, 0 failure/error; msvcrt locking và explicit cp1252 probe trên Windows | Pass |

API flow, SQL assertions và bounded rate429 probe đã chạy thật ngày2026-10-12.
AC tổng thể còn expiry/native Not run. Không đánh dấu checkbox AC tổng thể hoặc
Done.

## Blocker / giới hạn

- Docker blocker trước đây đã giải quyết: engine29.4.3 phản hồi,4 container
  Supabase của project local chạy, Auth health200. Migrations0001..0003 áp dụng
  local; không reset hoặc xóa volume. Backend được để chạy để owner test Bruno.
- Chưa chạy Android device secure-storage/restart. Expo Go hỗ trợ package cần
  được kiểm trên SDK57 thật; backup/native config cần development build phù hợp.
- Private cache port là contract bắt buộc cho GM-25/31; SQLite chưa triển khai.
  Signout revoke refresh không bảo đảm access JWT đã phát vô hiệu ngay.
- Shared config/client/spec có bổ sung GM-16, reviewer phải đối chiếu với upstream
  producer/handoff trước merge. Gate merge không thay review nội dung thay đổi đó.
- Python regression Windows đã Pass toàn bộ sau khi dùng `msvcrt` cho khóa file
  taxonomy và decode byte trực tiếp trong cp1252 probe. Report trước sửa giữ
  riêng để truy vết tại PYTHON_REGRESSION_BEFORE_FIXTURE.txt.

## Review

Tâm kiểm revision/hashes/output thực; Trí nghiệm thu cuối sau đủ AC. Chưa có
independent review hoặc approval được ghi. Không tự sync Project Status/Done.
