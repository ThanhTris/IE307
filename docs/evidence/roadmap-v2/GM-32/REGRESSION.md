# GM-32 — QA: regression API, data, quyền và race (2026-11-09)

Hồ sơ bàn giao và báo cáo hồi quy toàn diện cho task GM-32 sau khi hợp nhất chuỗi UI–API (GM-27..31) trên `main` (`bc5a062`).

## 1. Đầu vào & Snapshot tích hợp

- **Snapshot cơ sở:** `origin/main` tại commit `bc5a0629c0d1050ef3256ec9fa73bd669019fb84`.
- **Các PR đã hợp nhất trong chuỗi:**
  - PR #161 (GM-02 Native Baseline): `expo-notifications@~58.1.8`, `expo-sqlite@~58.0.15`.
  - PR #159 (GM-30 Native QR & Places): Native QR, Places/map, anti-spoof deep links.
  - PR #127 (GM-29 Push & Settings): Push lifecycle, notification settings, session restoration.
  - PR #158 (GM-31 Private Outbox): Durable SQLite/SecureStore outbox, offline restore.
- **Contract & Schema Authority:**
  - Contract: `dish-session-v4/roadmap-v2/GM-07.B`.
  - Policy: `dish-decision-v4/ADR-019-30PCT-MIN1`.
  - Database schema: `0.11.1` (gồm migrations `0027`..`0035`).

## 2. Quy trình Tái lập & Kiểm chứng (Reproduce)

1. **Kiểm tra tính toàn vẹn tài liệu & cấu trúc repository:**
   ```powershell
   python scripts/validate_repository.py
   python scripts/task_readiness.py --check-docs
   git diff --check
   ```
2. **Chạy toàn bộ 665 bài test hồi quy trong hệ thống Python:**
   ```powershell
   python -m unittest discover -s tests -p "test_*.py"
   ```
3. **Kiểm tra 3 ca lỗi GM-19 (Settings Stability & Concurrency):**
   ```powershell
   python -m unittest tests/test_gm07b_contract.py
   ```
   - Ca 1: Member gọi `updateSettings` $\rightarrow$ Trả về `NOT_HOST`, không biến đổi phòng.
   - Ca 2: Host gửi settings y hệt hoặc chỉ đổi `desiredAt` $\rightarrow$ Giữ nguyên `poolVersion` và danh sách món.
   - Ca 3: Host đổi `dishCount` / `mealSlot` $\rightarrow$ Tăng `poolVersion` chuẩn xác.
   - Concurrency: `test_concurrency_range_rule_and_error_codes` kiểm tra xung đột phiên bản `VERSION_CONFLICT` và trạng thái `INVALID_ROOM_STATE`.

## 3. Kết quả Kiểm thử Thực tế

- **Repository Validation:** Đạt 100% không lỗi.
- **Python Unittest Suite:** `Ran 665 tests in 176s: OK (skipped=2)`. Đạt 100% tỷ lệ thành công (khắc phục 21 failure cũ).
- **Chặng 3A AVD Evidence:** Đầy đủ 22 ảnh chụp màn hình thực tế trên máy ảo AVD `Medium_Phone_API_37.0` cho GM-29, GM-30, GM-31 (responsive 360dp/320dp, font-scaling 200%, offline banners, permission dialogs, viewfinder).
- **Chặng 3B (Thiết bị Android thật qua USB):** Bàn giao nguyên vẹn cho GM-33 (QA Android) và GM-34 (Release APK).
