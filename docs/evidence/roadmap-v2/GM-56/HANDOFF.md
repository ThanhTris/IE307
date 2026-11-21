# GM-56 — Bàn giao

Ba test component mới nằm trong `mobile/tests/component/appEntryEdgeCases.test.tsx`, nối vào bộ test case bằng tag `TC-ENTRY-006`, `TC-UI-004`, `TC-PREF-010` trong tên test. Danh sách ca còn thiếu và task sẽ lấp: [AUTOMATION_GAPS_APP](../../../testing/AUTOMATION_GAPS_APP.md). Kết quả: [CHECKS](CHECKS.md).

- Thêm test cho ca mới: viết test Jest có tag `TC-<MODULE>-NNN` trong tên rồi chạy `python scripts/test_cases.py --check` và `--write`. Ghi kết quả bằng `--import-jest`; tool nhận cả test có tag.
- GM-56 chưa đầy đủ: các ca của GM-35, GM-53 và GM-54 cần làm tiếp khi các tính năng đó merge. Việc này nằm trong cùng task nhưng sẽ là lượt cập nhật sau.
- Phụ thuộc merge: GM-55 phải Done vì PR sinh lại các file thuộc GM-55.
