# GM-32 — QA: regression API, data, quyền và race (2026-11-09)

Date: 2026-11-09. Baseline: `origin/main` at `bc5a0629c0d1050ef3256ec9fa73bd669019fb84` (gồm PR #161, #159, #127, #158).

| Nhóm kiểm thử | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|
| **Full Python Repository Suite** | Không có hồi quy, chạy toàn bộ test trong `tests/` | 665 run, 2 skipped, 0 failures (`Ran 665 tests in 176s`) | **Pass** |
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
