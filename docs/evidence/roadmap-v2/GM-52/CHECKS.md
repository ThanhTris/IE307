# GM-52 · Kiểm thử và điều kiện review

Owner Trí, reviewer Trí. Contract `release-v1/2026-11-20/GM-52.1`. Ngày 2026-11-23 `python scripts/task_readiness.py --task GM-52` trả `BLOCKED`: GM-03, GM-48 và GM-49 đã Done, GM-51 đang In Progress trên Project #2. Phần độc lập (script, workflow, runbook, test) làm trước; phần chạy trên project hosted chờ GM-51 Done và hai project Supabase do Trí tạo. Hồ sơ này chưa có kết quả hosted nào. Ô `Not run` chặn Done cho tới khi có kết quả thật.

## Kiểm cục bộ (không cần project hosted)

| Ca | Lệnh | Kết quả |
| --- | --- | --- |
| Quét gói build: bắt service_role JWT, secret key, chuỗi kết nối DB, PEM, token Sentry; đúng một project theo môi trường; từ chối file không phải zip | `node --test tests/gm52-hosted.test.mjs` | Pass (7 ca, 2026-11-23) |
| Smoke chỉ nhận project https khớp ref, bắt buộc `--allow-remote`, từ chối service_role và secret key | `node --test tests/gm52-hosted.test.mjs` | Pass |
| Parity: phát hiện migration thiếu hoặc thừa, hàm đổi hash, hàm nháp ngoài ledger, schema version, job cron; URL DB phải thuộc ref | `python -m unittest tests.test_gm52_hosted_parity` | Pass (7 ca) |
| Cú pháp script và workflow | `node --check scripts/gm52_*.mjs`, `python -m py_compile scripts/gm52_hosted_parity.py` | Pass |
| Parity chạy thật QA với QA (kỳ vọng khớp) rồi sửa tay một hàm (kỳ vọng Fail) | Xem HANDOFF | Not run |
| Smoke chạy trên QA local `--base-url http://127.0.0.1` | Không áp dụng: script từ chối non-https, chỉ chạy hosted | Not applicable |

## Kết quả đã có trên hosted (2026-11-24, commit `2ef58d3e`)

Áp migration bằng `supabase db push`, deploy `delete-account --no-verify-jwt` và đặt bốn GitHub secret của keepalive (URL và publishable key, đều công khai). Staging `cijknqhnmzdsturkzyiz` do Trí chạy, production `ijkuoizconywuddokdhh` chạy cùng commit sau khi staging đạt.

| Kiểm | Staging | Production |
| --- | --- | --- |
| Ledger so với `main` (`gm52_hosted_parity.py`, stack QA dựng từ cùng commit) | Pass: 51 và 51, không thiếu, không thừa | Pass: 51 và 51 |
| 236 hàm (định danh, owner, security definer, search_path, ACL, hash định nghĩa) | Pass, không hàm nháp | Pass |
| `schema_versions` mới nhất | 0.31.8 | 0.31.8 |
| Job `ie307-gm48-tick` (2 giây) và `ie307-gm48-prune` (`17 * * * *`), quyền `postgres`, active | Pass; 200 lần chạy tick, lần cuối `succeeded` | Pass (job đã tạo, chưa đo lần chạy) |
| Edge Function `delete-account` ACTIVE, `verify_jwt=false` | Pass | Pass |
| Catalogue, `allow_new_sessions` | 0 món, cờ tắt (chờ GM-51) | 0 món, cờ tắt |

Kiểm trực tiếp trên **staging** ngày 2026-11-24 (chỉ staging; production chưa kiểm phần này):

| Kiểm | Kết quả |
| --- | --- |
| Bucket `dish-images`: công khai, giới hạn 1 MiB, chỉ WebP/JPEG/PNG, tạo bằng SQL `storage.buckets` (không cần secret key) | Pass. Không có policy ghi trên `storage.objects`; upload bằng publishable key bị từ chối (HTTP 400) |
| Đăng nhập ẩn danh (`POST /auth/v1/signup`) | Pass (HTTP 200) |
| `delete-account` trên khách vừa tạo: xóa, replay cùng `requestId`, token cũ | Pass: 200 `deleted:true`, replay 200 cùng ACK, token cũ 403 |
| Smoke hai client, Realtime, cron đóng vòng | Not run: staging còn 0 món và `allow_new_sessions` tắt, chờ GM-51 |

Lần đầu so hash, bốn schema lệch. Tách riêng thì ACL và metadata khớp, chỉ chữ định nghĩa lệch vài ký tự mỗi hàm, đúng bằng số ký tự `
` (QA giữ `
` của checkout Windows). Bỏ `
` trước khi băm thì cả 17 schema khớp; script đã chuẩn hóa như vậy. Báo cáo JSON ở `.work/gm52/parity-staging.json` và `parity-production.json` (không commit).

## Acceptance criteria trên hosted## Acceptance criteria trên hosted

| AC | Bằng chứng cần có | Kết quả |
| --- | --- | --- |
| `db push` lên staging; ledger và định nghĩa hàm khớp `main` | JSON của `gm52_hosted_parity.py` | Pass (staging và production, xem trên) |
| Cấu hình dashboard: anonymous, email + SMTP, Realtime, rate limit, `allow_new_sessions` | Ảnh chụp dashboard hoặc người xác nhận, kèm bước Realtime của smoke | Not run |
| Lịch tick GM-48 chạy; catalogue GM-51 đã nạp; Edge xóa tài khoản deploy | Parity (job cron), readback GM-51, bước xóa của smoke | Tick và Edge: Pass; catalogue: Not run (chờ GM-51) |
| Smoke HTTP: khách, tạo phòng, vào, hai vòng, kết quả, xóa tài khoản | `.work/gm52/smoke-staging-*.json` | Not run |
| Không có `service_role` hay secret trong repo hoặc app; publishable key qua EAS | `gm52_bundle_scan.mjs` trên APK `preview`; quét repo | Not run (chờ GM-54 có APK) |
| Production chỉ nhận bản đã qua staging | Cùng commit SHA ở staging và production trong HANDOFF | Not run |
| Mỗi profile EAS nối đúng một project | Bảng ánh xạ trong [runbook](../../../ops/SUPABASE_HOSTED_RUNBOOK.md) và biến EAS thật | Bảng đã viết; biến EAS Not run |
| Giải nén APK/AAB: chỉ URL và publishable key | `gm52_bundle_scan.mjs` | Not run (chờ GM-54) |
| Runbook ghi biến EAS của Sentry và cách xoay khóa | [Runbook](../../../ops/SUPABASE_HOSTED_RUNBOOK.md), mục bí mật và đổi khóa | Pass (tài liệu) |
| Bucket ảnh công khai ở staging và production, quy tắc đặt tên | Bucket + thử upload | Staging: Pass (xem trên). Production: Not run |
| Keepalive và backup chạy, backup giải mã được | `workflow_dispatch` một lần, tải artifact, giải mã thử | Not run |

Hồ sơ này không ghi khóa, token, chuỗi kết nối hay phiếu thật.
