# GM-52 · Bàn giao Supabase hosted

Trí thực hiện, Trí review. Contract `release-v1/2026-11-20/GM-52.1`. Không đổi schema, API hay migration; số 0066 thuộc GM-35, 0067 thuộc GM-54. Quy trình đầy đủ ở [runbook](../../../ops/SUPABASE_HOSTED_RUNBOOK.md).

## Điền sau khi tạo project

| Mục | Staging | Production |
| --- | --- | --- |
| Tên project | `gcd-staging` | `gcd-production` |
| Project ref | `cijknqhnmzdsturkzyiz` | `ijkuoizconywuddokdhh` |
| Tổ chức, region | `Gì cũng được app` (free), `ap-southeast-1` | cùng tổ chức, `ap-southeast-1` |
| URL | `https://cijknqhnmzdsturkzyiz.supabase.co` | `https://ijkuoizconywuddokdhh.supabase.co` |
| Commit đã triển khai | `2ef58d3e` | `2ef58d3e` (trùng staging) |
| Parity `Pass` ngày | 2026-11-24 | 2026-11-24 |
| Smoke `Pass` ngày | _chưa_ | _chưa_ |
| Publishable key | Đặt trong EAS và GitHub secrets, không ghi ở đây | như trái |

## Đầu vào cho task khác

| Task | Nhận gì từ GM-52 |
| --- | --- |
| GM-47, GM-51 | URL gốc ảnh `https://<ref>.supabase.co/storage/v1/object/public/dish-images/<dish-uuid>.webp` (WebP, tối đa 1 MiB) để gắn `url` ảnh |
| GM-54 | Bảng ánh xạ `preview` → staging, `production` → production và ba biến EAS; `eas.json` do GM-54 viết |
| GM-58, GM-63 | APK `preview` nối staging; staging đã nạp catalogue và bật `allow_new_sessions` |
| GM-59 | Production đã qua cùng commit; `scripts/gm52_bundle_scan.mjs` chạy trên AAB và APK trước khi nộp |
| GM-62 | Tên biến EAS `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` và cách xoay khóa |

## Lệnh

```powershell
node --test tests/gm52-hosted.test.mjs
python -m unittest tests.test_gm52_hosted_parity
python scripts/gm52_hosted_parity.py --qa-manifest .work/qa/<run>/manifest.json --project-ref <ref>
node scripts/gm52_hosted_smoke.mjs --base-url https://<ref>.supabase.co --project-ref <ref> --publishable-key <key> --allow-remote --target-env staging
node scripts/gm52_storage_bucket.mjs --base-url https://<ref>.supabase.co --project-ref <ref> --publishable-key <key>
node scripts/gm52_bundle_scan.mjs <file.apk|file.aab> --expect-env staging --staging-ref <ref> --production-ref <ref>
```

Parity chỉ đọc cả hai phía. Smoke tạo khách ẩn danh rồi xóa chúng bằng `delete-account`; `scripts/e2e/two_client_flow.mjs` có thêm cờ `--delete-guests` cho việc này. Bucket cần `SUPABASE_SERVICE_ROLE_KEY` trong phiên shell, không bao giờ trong file.

## Rollback

Theo mục Rollback của runbook: gỡ route Edge trước, `supabase/rollback/*.down.sql` đúng project, tắt `allow_new_sessions` khi cần. Workflow keepalive và backup tắt bằng Disable workflow, không ảnh hưởng dữ liệu.

## Chưa làm, chờ

Trí tạo hai project và đặt secrets; GM-51 Done để nạp catalogue; GM-54 có APK để quét gói. Merge chỉ khi cả bảng AC hosted trong [CHECKS](CHECKS.md) không còn `Not run`. AI không tự chuyển Done hay ghi approval.
