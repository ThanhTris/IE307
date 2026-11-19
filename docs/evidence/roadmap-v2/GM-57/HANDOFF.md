# GM-57 — Bàn giao

Script E2E hai client `scripts/e2e/two_client_flow.mjs`, bộ request `supabase/tests/http/GM-57.http` và danh sách ca backend còn thiếu ([AUTOMATION_GAPS_BACKEND](../../../testing/AUTOMATION_GAPS_BACKEND.md)). Kết quả: [CHECKS](CHECKS.md).

## Dùng script

```bash
npm run qa:start -- --run-id <run-id> --api-port <port> --db-port <port>
node scripts/e2e/two_client_flow.mjs --qa-manifest .work/qa/<run-id>/manifest.json
npm run qa:stop -- --run-id <run-id>
```

Với staging (GM-52, GM-58): thêm `--base-url https://<project>.supabase.co --publishable-key <key> --allow-remote` thay cho manifest. Script tạo hai khách và một phòng thật trên project đó; khóa chỉ truyền qua tham số, không ghi ra log hay file. Báo cáo ngắn ghi vào `.work/e2e/` (thư mục bị ignore).

Script cũng dùng được để chuẩn bị cho người review store: họ cần ít nhất hai người mới bắt đầu được phòng, nên có thể dùng hai tài khoản khách do script tạo hoặc làm theo các bước của nó.

## Bàn giao tiếp

- Chạy bộ SQL/HTTP có sẵn và `GM-57.http` bằng Bruno trên QA hoặc staging rồi ghi kết quả vào `docs/testing/results/`.
- Khi GM-49 xong, thêm test cho TC-SEC-010; khi GM-48 xong, thêm test chuyển vòng bằng pg_cron trên staging.
- Phụ thuộc merge: GM-55 phải Done vì PR sinh lại các file thuộc GM-55.
