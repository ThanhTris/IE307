# GM-57 — Kiểm tra E2E hai client và bộ HTTP bổ sung

Ngày chạy: 2026-11-20, Windows 11, Node 24, Docker Desktop. Nền: nhánh GM-56 (PR #198, draft) trên GM-55 (PR #197). Chạy trên stack QA riêng do runner GM-03 dựng (`gm03qa-gm57-e2e`, cổng 54381 và 54382), không đụng các stack QA khác đang chạy trên máy.

| Kiểm tra | Cách chạy | Kết quả |
| --- | --- | --- |
| Dựng stack QA cô lập | `npm run qa:start -- --run-id gm57-e2e --api-port 54381 --db-port 54382` | Đạt: manifest được niêm phong, worker có heartbeat |
| E2E hai client | `node scripts/e2e/two_client_flow.mjs --qa-manifest .work/qa/gm57-e2e/manifest.json` | Đạt 8/8 bước: hai khách độc lập, tạo phòng 10 món, vào bằng mã và lưu khẩu vị, bắt đầu, nộp phiếu WANT hai bên, vào phòng chờ, server quyết một lần `DECIDED` ở vòng 1 với `UNANIMOUS_WANT`, hai bên đọc cùng kết quả, người ngoài bị từ chối kết quả (403 `NOT_MEMBER`) và snapshot |
| Chặn nhầm mục tiêu | chạy script với `--base-url` thiếu `--allow-remote`, và không có manifest | Cả hai đều bị từ chối trước khi gọi mạng |
| Dọn tài nguyên | `npm run qa:stop -- --run-id gm57-e2e` | Đã dọn worker, Supabase và network; không còn container hay volume `gm57` |
| Ghi kết quả vào bộ test case | `docs/testing/results/qa-local-e2e-20261120.json` | 1 ca Pass trên môi trường `qa-local`: TC-VOTE1-010 |
| Bộ test case | `python scripts/test_cases.py --check` và `--check-docs` | Đạt: 194 ca, 149 ca có test tự động, 45 chưa có |
| Bộ HTTP `GM-57.http` | chưa chạy bằng Bruno | Not run: các request dùng token và `roomId` do người chạy điền. Hai hành vi của nó (đọc kết quả của người ngoài, snapshot của người ngoài) đã được script E2E kiểm trực tiếp |

## Giới hạn

- Chỉ ghi Pass cho TC-VOTE1-010. Script cũng chạm tới TC-ROOM-001, TC-ROOM-005, TC-RES-003 và TC-SEC-001 nhưng không kiểm hết các bước của những ca đó (ví dụ không kiểm bước xem trước khi vào phòng, tải lại sau force-stop, hay mọi truy vấn của người ngoài), nên chúng chưa được ghi Pass.
- Bộ SQL, HTTP và runner có sẵn (GM-20/21/23/40) không được chạy lại trong lượt này.
- Ca cần staging (pg_cron, quota Places) chờ GM-48 và GM-52.
- Regenerate `TEST_CASES.md`, `TRACEABILITY.md`, `TEST_REPORT.md` sửa file thuộc GM-55: PR chỉ merge được sau khi GM-55 Done.
