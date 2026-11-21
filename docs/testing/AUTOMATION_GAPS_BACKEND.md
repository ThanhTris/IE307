# GM-57 — Test SQL/HTTP và E2E hai client cho các ca còn thiếu

Tài liệu ghi những gì GM-57 thêm cho phía backend và những ca backend còn thiếu. Test nối vào ca bằng tag `TC-XXX-NNN` trong chú thích, không sửa file case của GM-55. Kết quả chạy xem [CHECKS](../evidence/roadmap-v2/GM-57/CHECKS.md).

## Đã thêm

| Tệp | Ca được nối | Cách chạy |
| --- | --- | --- |
| `scripts/e2e/two_client_flow.mjs` | TC-RES-003, TC-ROOM-001, TC-ROOM-005, TC-SEC-001, TC-VOTE1-010 | `node scripts/e2e/two_client_flow.mjs --qa-manifest .work/qa/<run-id>/manifest.json` (QA cô lập) hoặc `--base-url ... --publishable-key ... --allow-remote` (staging, tạo hai khách và một phòng thật) |
| `supabase/tests/http/GM-57.http` | TC-RES-003, TC-SEC-001 | Bruno/REST client với token của người chơi, người ngoài và `roomId` của phòng đã kết thúc |

## Script E2E hai client

Script chạy hai khách độc lập qua REST: tạo phòng 10 món bữa trưa, vào bằng mã, lưu khẩu vị, bắt đầu, nộp phiếu WANT hai bên, vào phòng chờ, kiểm kết quả `DECIDED/UNANIMOUS_WANT` ở vòng 1, hai bên đọc cùng một kết quả và người ngoài bị từ chối. Không in token, khóa hay phiếu. Dùng được cho staging (GM-52, GM-58) và để chuẩn bị tài khoản cho người review store (cần ít nhất hai người mới bắt đầu được phòng).

## Ca backend còn thiếu

| Ca | Tầng | Lý do | Task lấp |
| --- | --- | --- | --- |
| TC-AUTH-010 Liên kết khách thành tài khoản giữ nguyên UUID | api | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-57 sau khi tính năng merge |
| TC-SEC-010 Tài khoản đã xóa không đọc được dữ liệu cũ | api | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-49 |

## Chưa chạy

- Bộ SQL và HTTP có sẵn (`supabase/tests/**`, runner GM-20/21/23/40) chưa được chạy lại trong lượt này; chỉ chạy script E2E mới.
- Ca `staging` (pg_cron, quota Places, review store) chờ GM-48 và GM-52.
