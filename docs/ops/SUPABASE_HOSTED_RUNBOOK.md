# Runbook Supabase hosted: staging và production

Task [GM-52](../../tasks/backlog/GM-52.md), contract `release-v1/2026-11-20/GM-52.1`. Trí vận hành, Trí review. Tài liệu này chỉ mô tả quy trình; kết quả chạy thật nằm ở [CHECKS](../evidence/roadmap-v2/GM-52/CHECKS.md). Số liệu về gói miễn phí, tên mục trên dashboard và lệnh Supabase CLI có thể đổi, nên đối chiếu với trang Supabase hiện hành khi làm.

## Nguyên tắc

- Hai project riêng: `gcd-staging` và `gcd-production`. Mọi thay đổi đi qua staging trước; production chỉ nhận **đúng commit** đã qua staging và đã có báo cáo parity.
- Không `db reset`, không sửa migration đã áp, không chèn migration có số nhỏ hơn bản đã áp. Số migration tăng theo thứ tự merge (xem [RELEASE_V1_SCOPE](../project/RELEASE_V1_SCOPE.md), mục tương thích ngược).
- `supabase/config.toml` chỉ áp dụng cho QA local. Mọi cấu hình trong mục "Dashboard" bên dưới phải đặt tay trên từng project hosted.
- Không có `service_role`, secret key, mật khẩu DB hay chuỗi kết nối trong repo, app, log hay file `.env` đã commit. App chỉ nhận URL và publishable key.
- Health của GoTrue hoặc REST không chứng minh code đang chạy khớp `main`. Dùng `scripts/gm52_hosted_parity.py`.

## Bảng ánh xạ môi trường

| Profile EAS | Project Supabase | `EXPO_PUBLIC_APP_ENV` | Dùng cho |
| --- | --- | --- | --- |
| `preview` | staging | `staging` | APK để Vinh và Trí chạy bộ test case (GM-58, GM-63) |
| `production` | production | `production` | AAB nộp cho thầy (GM-59) |

Mỗi profile đặt ba biến qua EAS (không viết vào `eas.json` hay commit): `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. App đọc hai biến Supabase ở `mobile/src/bootstrap/RoomRepositoryProvider.tsx` và `mobile/src/data/api/client.ts`. Không dùng `NODE_ENV` để phân biệt môi trường. File `eas.json` thuộc [GM-54](../../tasks/backlog/GM-54.md); GM-52 chỉ ghi bảng này.

## Bí mật nằm ở đâu

| Bí mật | Nơi giữ | Ai dùng |
| --- | --- | --- |
| Publishable key (công khai, nhúng trong app) | EAS env của từng profile; GitHub secret cho keepalive | App, keepalive, smoke |
| Secret/service key | Chỉ dashboard Supabase và phiên shell của Trí khi chạy `gm52_storage_bucket.mjs` hoặc `gm49_admin_delete.mjs` | Trí |
| Mật khẩu DB, chuỗi kết nối pooler | GitHub secret `STAGING_DB_URL`, `PROD_DB_URL` | Workflow backup, parity (phiên shell) |
| `BACKUP_PASSPHRASE` | GitHub secret, và bản giữ riêng của Trí ngoài GitHub (mất passphrase là mất khả năng giải mã backup) | Workflow backup |
| `STAGING_SUPABASE_URL`, `STAGING_SUPABASE_PUBLISHABLE_KEY`, `PROD_…` | GitHub secrets | Keepalive |
| `SENTRY_ORG`, `SENTRY_PROJECT` (plain), `SENTRY_AUTH_TOKEN` (Sensitive) | EAS env, theo [GM-62](../../tasks/backlog/GM-62.md) | Bản build |
| SMTP | Dashboard Supabase của từng project | Auth |

Dùng chuỗi kết nối **session pooler** (IPv4) cho workflow và parity, vì kết nối trực tiếp `db.<ref>.supabase.co` chỉ có IPv6 và runner GitHub không tới được.

## Tạo project (Trí làm trên dashboard)

1. Tạo `gcd-staging` rồi `gcd-production` ở cùng một region gần người dùng, gói miễn phí. Ghi project ref, URL `https://<ref>.supabase.co` và publishable key.
2. Đặt GitHub secrets ở bảng trên. Tạo `BACKUP_PASSPHRASE` ngẫu nhiên dài và cất bản thứ hai ở nơi an toàn khác.
3. Điền ref vào [HANDOFF](../evidence/roadmap-v2/GM-52/HANDOFF.md) (ref là thông tin công khai, key thì không).

## Cấu hình dashboard (mỗi project)

| Mục | Giá trị | Lý do |
| --- | --- | --- |
| Authentication > Providers > Anonymous sign-ins | Bật | Khách vào phòng không cần tài khoản (`config.toml` local bật `enable_anonymous_sign_ins`) |
| Email + SMTP | Bật email; dùng SMTP riêng vì SMTP mặc định giới hạn rất thấp | Đăng ký, khôi phục mật khẩu (GM-35) |
| Realtime | Bật | Hộp thư nhận dòng mới qua Realtime (migration 0053, ADR-026) |
| Rate limits | `anonymous_users` 30, `token_refresh` 150 mỗi giờ theo IP, đối chiếu `[auth.rate_limit]` trong `config.toml` | Cùng mức đã kiểm ở QA |
| Site URL, redirect | URL trang hỗ trợ của GM-50 và scheme `gi-cung-duoc://` | Liên kết email |
| Database > Extensions > pg_cron | Bật **trước** khi chạy migration 0065 | Lịch tick GM-48 |
| `allow_new_sessions` | Bật bằng SQL ở bước 6 bên dưới, sau khi parity và catalogue đạt | Cờ tạo phòng v4, mặc định tắt |

## Thứ tự triển khai (làm trên staging, rồi lặp lại cho production với đúng commit)

Chạy từ checkout sạch của `main` (hoặc commit đã chốt). Ghi commit SHA vào CHECKS.

1. **Bật Cron**, rồi `npx supabase link --project-ref <ref>` và `npx supabase db push` (áp migration theo ledger). Nếu ledger đã ghi 0065 lúc Cron còn tắt, bật Cron rồi chạy lại đúng SQL của 0065 dưới quyền postgres, theo [GM-48 HANDOFF](../evidence/roadmap-v2/GM-48/HANDOFF.md).
2. **Parity với `main`:**
   ```powershell
   npm run qa:start -- --run-id gm52-ref --api-port 55581 --db-port 55582
   python scripts/gm52_hosted_parity.py --qa-manifest .work/qa/gm52-ref/manifest.json --project-ref <ref> --json .work/gm52/parity-<môi trường>.json
   npm run qa:stop -- --run-id gm52-ref
   ```
   Mặc định script đọc project hosted qua `supabase db query --linked` (cần đã `npx supabase login`, không cần mật khẩu DB hay `psql`). Nếu đặt `SUPABASE_DB_URL` (chuỗi session pooler) trong phiên shell thì nó dùng `psql` (hoặc image `postgres:17-alpine` khi thiếu `psql`). Hash định nghĩa hàm được lấy sau khi bỏ ký tự ``, vì checkout Windows để lại `` trong thân hàm và hai bên không nhất quán; đó không phải khác biệt hành vi. Kết quả phải là `Pass`: ledger, hàm, `schemaVersion` khớp, hai job `ie307-gm48-tick` và `ie307-gm48-prune` đang chạy. Có chênh lệch (kể cả hàm nháp ngoài ledger) thì dừng và lập kế hoạch reconcile hoặc backup được Trí duyệt; không reset DB.
3. **Deploy Edge Function xóa tài khoản:** `npx supabase functions deploy delete-account --project-ref <ref> --no-verify-jwt` (khớp `[functions.delete-account] verify_jwt = false`; hàm tự xác thực). Không deploy `push-sender` vì push từ xa đã hoãn. Áp migration trước khi deploy hàm.
4. **Bucket ảnh món:**
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY = '<chỉ trong phiên này>'
   node scripts/gm52_storage_bucket.mjs --base-url https://<ref>.supabase.co --project-ref <ref> --publishable-key <publishable>
   Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY
   ```
   Bucket `dish-images` công khai: ai cũng đọc, chỉ người giữ secret key ghi. URL ảnh theo quy tắc `https://<ref>.supabase.co/storage/v1/object/public/dish-images/<dish-uuid>.webp` (tên file là UUID món, WebP, tối đa 1 MiB). GM-47 và GM-51 gắn `url` ảnh theo quy tắc này (mục 9 của [RELEASE_V1_CATALOGUE_SPEC](../data/RELEASE_V1_CATALOGUE_SPEC.md)).
5. **Nạp catalogue** bằng importer chế độ hosted của [GM-51](../../tasks/backlog/GM-51.md) (dry-run trước), rồi đọc lại hash và số món. Chỉ làm khi GM-51 Done.
6. **Bật tạo phòng:** `update gm20_canonical_private.configuration set allow_new_sessions = true where singleton;` bằng SQL editor dưới quyền postgres, sau khi bước 2 và 5 đạt. Chạy lại parity (cờ này được ghi trong báo cáo).
7. **Smoke:**
   ```powershell
   node scripts/gm52_hosted_smoke.mjs --base-url https://<ref>.supabase.co --project-ref <ref> --publishable-key <publishable> --allow-remote --target-env staging
   ```
   Smoke chạy luồng hai client, kiểm Realtime, để cron tự đóng một vòng đang chờ sau 60 giây (không có worker), xóa mọi khách đã tạo qua `delete-account` và kiểm token hết hiệu lực. Mất khoảng 3 phút. Request thủ công tương đương nằm ở [GM-52.http](../../supabase/tests/http/GM-52.http).
8. **Workflow định kỳ:** chạy tay `Supabase keepalive` và `Supabase backup` một lần (`workflow_dispatch`), tải artifact backup, giải mã thử (xem dưới) và ghi vào CHECKS.

## Promote lên production

1. Staging đã qua đủ bước trên với commit `X`, CHECKS ghi parity và smoke `Pass`.
2. Checkout đúng commit `X`, lặp lại bước 1 đến 8 cho project production (bước 5 dùng cùng bundle đã qua staging).
3. Smoke production chạy một lần với `--target-env production`; nó chỉ tạo vài khách tạm và xóa lại.
4. Ghi commit `X`, ngày và hai file parity vào HANDOFF. Production không nhận migration chưa qua staging.

## Kiểm gói build (APK/AAB)

Sau khi GM-54 có bản `preview` (và khi GM-59 build `production`):

```powershell
node scripts/gm52_bundle_scan.mjs <file.apk|file.aab> --expect-env staging --staging-ref <ref-staging> --production-ref <ref-production>
```

Kết quả `Pass` nghĩa là không có service_role, secret key, chuỗi kết nối DB, khóa PEM hay token Sentry, chỉ có đúng một URL Supabase và đó là project của profile. Gói vẫn có thể bị dịch ngược, nên chỉ URL và publishable key được phép nằm trong đó.

## Keepalive và backup

- **Keepalive** (`.github/workflows/supabase-keepalive.yml`): mỗi 2 ngày đọc một dòng từ bảng `dishes` của từng project để chạm Postgres. Lỗi khi trả khác 200 (project bị tạm dừng hoặc khóa bị xoay).
- GitHub tắt workflow theo lịch sau khoảng 60 ngày repo không có hoạt động. Mỗi tháng mở tab Actions kiểm hai workflow vẫn chạy; nếu bị tắt thì bật lại (Enable workflow) hoặc chạy tay.
- **Backup** (`.github/workflows/supabase-backup.yml`): mỗi tuần dump các schema ứng dụng (`public`, `gm*_private`, `dish*_private`, `supabase_migrations`) cộng dữ liệu `auth.users`, mã hóa AES-256 bằng `BACKUP_PASSPHRASE`, tải lên artifact giữ 14 ngày. Repo công khai nên **không bao giờ** upload file chưa mã hóa. Hash SHA-256 nằm trong summary của lần chạy.
- Giải mã để kiểm hoặc khôi phục:
  ```powershell
  gpg --decrypt --output backup.sql staging-<thời điểm>.sql.gpg
  ```
  Khôi phục vào project trống dùng `psql <db-url> -f backup.sql`; không khôi phục đè lên project đang có dữ liệu khi chưa có kế hoạch được Trí duyệt.

## Rollback

- Migration: dùng đúng file trong `supabase/rollback/` (ví dụ `0065_gm48_hosted_tick_schedule.down.sql`) trên đúng project, dưới quyền postgres. Nếu dừng cron trên hosted, cần có phương án khôi phục tick trước khi nhận phòng mới.
- Edge Function: gỡ route (`npx supabase functions delete delete-account --project-ref <ref>`) **trước**, rồi mới áp migration nối tiếp sau review. Dữ liệu đã xóa bằng `delete-account` không khôi phục bằng rollback code; chỉ khôi phục được từ backup.
- Sự cố sau khi app đã lên store: không sửa migration đã áp; thêm migration mới tương thích ngược, hoặc dùng cổng phiên bản tối thiểu của GM-54.
- Tắt tạo phòng khẩn cấp: `update gm20_canonical_private.configuration set allow_new_sessions = false where singleton;`. Phòng đang chơi vẫn chạy tiếp theo phiên đã ghim.

## Đổi khóa khi bị lộ

| Khóa | Cách xử lý |
| --- | --- |
| Secret/service key | Xoay trên dashboard ngay, cập nhật nơi đang dùng (phiên shell của Trí), kiểm log truy cập |
| Publishable key | Tạo khóa mới, cập nhật EAS env và GitHub secrets, build lại app; app cũ dùng khóa cũ nên chỉ thu hồi khóa cũ sau khi người dùng đã cập nhật (xem cổng phiên bản GM-54) |
| Mật khẩu DB | Đặt lại trên dashboard, cập nhật `STAGING_DB_URL` / `PROD_DB_URL` |
| `BACKUP_PASSPHRASE` | Đặt passphrase mới; backup cũ vẫn cần passphrase cũ để giải mã nên cất cả hai |
| `SENTRY_AUTH_TOKEN` | Thu hồi trên Sentry, tạo token mới, cập nhật EAS env (Sensitive) |
| SMTP | Đổi trên nhà cung cấp rồi cập nhật dashboard |

Nếu một khóa bí mật lọt vào lịch sử git, coi như đã lộ: xoay khóa trước, rồi mới xử lý lịch sử.
