# GM-32 — QA: regression API, data, quyền và race (2026-11-10)

Xem [kiểm thử runtime theo manifest](manifest-regression/CHECKS.md) và [hướng dẫn tái lập](HANDOFF.md). Kết quả chạy trên PR #163 tại `991fd8d` gồm bộ test settings của PR và regression QA của GM-32.

Ngày 2026-11-10. Baseline `origin/main` tại `30aa524258fec54c351e26d23741abba340db896`, gồm GM-40 PR #164.

| Nhóm kiểm thử | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|
| **Full Python Repository Suite** | Không có hồi quy, chạy toàn bộ test trong `tests/` | 679 test được thu thập, 6 skipped, 0 failures | **Pass** |
| **Mobile Jest** | Chạy lại độc lập trên worktree GM-32 | 81 suites đạt, 1.513 test đạt. Suite outbox live chạy riêng theo manifest | **Pass** |
| **Project merge gate** | Đọc GitHub Project #2 và kiểm dependency cùng output trên target | `READY_FOR_MERGE_REVIEW` trên `30aa524` lúc 14:09 ICT ngày 2026-11-10 | **Pass** |
| **Repo Validation & Docs Traceability** | Cấu trúc doc, liên kết, json, manifest và task indexes hợp lệ | `validate_repository.py` exit 0, `task_readiness.py --check-docs` exit 0 | **Pass** |
| **Git Diff Format Hygiene** | Không có trailing whitespace hoặc CRLF conflict | `git diff --check` clean | **Pass** |
| **GM-19 Settings Stability (Ca 1)** | Member gọi `updateSettings` bị từ chối `NOT_HOST`, không mutate phòng/version | `test_update_settings_not_host_wire_error_envelope` (19/19 in `test_gm07b_contract.py`) | **Pass** |
| **GM-19 Settings Stability (Ca 2)** | Host gửi settings y hệt hoặc chỉ đổi `desiredAt` giữ nguyên `poolVersion` | `test_update_settings_host_pool_version_preservation_and_advancement` (Pass) | **Pass** |
| **GM-19 Settings Stability (Ca 3)** | Host đổi `dishCount` / `mealSlot` tăng `poolVersion` | `test_update_settings_host_pool_version_preservation_and_advancement` (Pass) | **Pass** |
| **Concurrency Race & Version Conflict** | Loại trừ xung đột submit đồng thời, trả về `VERSION_CONFLICT` / `INVALID_ROOM_STATE` | `test_concurrency_range_rule_and_error_codes` (Pass) | **Pass** |
| **GM-20/21 Canonical Writer & Consent** | Khớp DTO B, writer độc lập, lưu podium Top 3 chuẩn | `test_dish_v4_schema.py` & `test_gm07b_contract.py` (Pass) | **Pass** |
| **GM-29 Push Lifecycle & Settings (Chặng 3A)** | Permissions, push driver, khôi phục phiên từ push, test trên AVD | Đã merge commit `06af83f` (PR #127), 9 ảnh AVD artifact | **Pass** |
| **GM-30 Native QR & Places Result (Chặng 3A)** | Viewfinder, fallback nhập tay, anti-spoof links, test trên AVD | Đã merge commit `638574a` (PR #159), 5 ảnh AVD artifact | **Pass** |
| **GM-31 Durable Outbox & Offline Recovery (Chặng 3A)** | SQLite/SecureStore outbox, offline restore, banner cảnh báo, test trên AVD | Đã merge commit `bc5a062` (PR #158), 8 ảnh AVD artifact | **Pass** |
| **Chặng 3B (Điện thoại Android thật qua USB)** | Camera QR thật, FCM push thật, chạy release APK trên điện thoại | Bàn giao thực hiện trong GM-33 & GM-34 | **Reserved for Stage 3B** |

## G04-G05 reviewer disposition

**Pending — Trí cần quyết định chấp nhận dời G04/G05 sang GM-35 hoặc yêu cầu
evidence sau khi consumer live được bàn giao.** [Review trên PR #163](https://github.com/ThanhTris/IE307/pull/163#issuecomment-6758158151)

| Case | Input và expected theo GM-35 | Actual tại revision kiểm |
| --- | --- | --- |
| G04 lưu hồ sơ | Sửa các trường hồ sơ rồi gây lỗi mạng hoặc server khi lưu. Giữ nội dung đang sửa và cho retry. Chỉ báo thành công sau ACK. | **Not run.** Route hồ sơ hiện dùng màn khách mẫu, chưa có luồng lưu live để kiểm. |
| G05 đổi mật khẩu | Điền ba trường rồi gây lỗi mạng hoặc server. Xóa toàn bộ trường mật khẩu, giữ thông báo và lối retry. Không lưu hoặc log giá trị. | **Not run.** Route cài đặt hiện dùng màn khách mẫu, chưa có form và luồng đổi mật khẩu live để kiểm. |

GM-35 vẫn `Todo` trên Project #2. Các expected trên lấy từ
[yêu cầu GM-35](../../../../tasks/backlog/GM-35.md). Kết quả gate xác nhận
dependency và output. Disposition của reviewer vẫn đang chờ.
