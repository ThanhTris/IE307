# GM-55 — Bàn giao bộ test case

Task GM-55 bàn giao bộ test case, truy vết yêu cầu và công cụ xuất báo cáo cho release v1. Phạm vi và lý do xem [RELEASE_V1_SCOPE](../../../project/RELEASE_V1_SCOPE.md); kết quả kiểm tra của chính task này xem [CHECKS](CHECKS.md). Chưa có Done hay approval: Trí nghiệm thu.

## Đã bàn giao

| Mục | Vị trí |
| --- | --- |
| Kế hoạch kiểm thử | [TEST_PLAN](../../../testing/TEST_PLAN.md) |
| Baseline yêu cầu (63 yêu cầu hiện hành, 5 yêu cầu cũ Superseded) | [REQUIREMENTS](../../../testing/REQUIREMENTS.md) |
| 194 test case, 15 module | `docs/testing/cases/*.json` → [TEST_CASES](../../../testing/TEST_CASES.md) |
| Truy vết yêu cầu → ca → test | [TRACEABILITY](../../../testing/TRACEABILITY.md) |
| Báo cáo kết quả và danh sách ca chưa có test tự động | [TEST_REPORT](../../../testing/TEST_REPORT.md) |
| Công cụ: kiểm, sinh Markdown, xuất Excel, nhập kết quả tự động | `scripts/test_cases.py` |
| Test của công cụ | `tests/test_test_cases.py` (chạy trong CI cùng `unittest discover`) |

## Cách dùng

```bash
python scripts/test_cases.py --check          # kiểm schema, REQ, liên kết test, ID
python scripts/test_cases.py --write          # sinh lại TEST_CASES, TRACEABILITY, TEST_REPORT
python scripts/test_cases.py --check-docs     # báo lỗi khi file sinh ra đã cũ
python scripts/test_cases.py --xlsx report.xlsx
```

Excel gồm bốn sheet: Test cases, Traceability, Summary, Defects. File chỉ dùng thư viện chuẩn Python, mở được bằng Excel và LibreOffice.

Thêm test case: sửa file module trong `docs/testing/cases/` (thêm ID kế tiếp), chạy `--check` rồi `--write`. Test tự động có thể tự nối vào ca bằng cách ghi tag `TC-<MODULE>-NNN` trong tên hoặc chú thích của test; không cần sửa file case.

Ghi kết quả tự động:

```bash
cd mobile && npm test -- --json --outputFile=../jest.json && cd ..
python scripts/test_cases.py --import-jest jest.json --run-id automated-YYYYMMDD --commit <sha>
python -m unittest discover -s tests -p "test_*.py" -v > unittest.log 2>&1
python scripts/test_cases.py --import-unittest unittest.log --run-id automated-py-YYYYMMDD --commit <sha>
```

Kết quả thiết bị và staging ghi tay vào `docs/testing/results/<run-id>.json`, mỗi dòng gồm `case`, `env`, `status` (`Pass`, `Fail`, `Blocked`, `N/A`), `actual`, `evidence`, `device`, `tester`, `defect`. Mẫu và quy trình xem mục 5 của [TEST_PLAN](../../../testing/TEST_PLAN.md).

## Giới hạn và bàn giao tiếp

- **Trạng thái ca lấy từ kết quả thật.** Có liên kết test tự động chỉ là truy vết; ca không có kết quả hiển thị `Not run`. Lượt chạy tự động đã nhập nằm trong `docs/testing/results/`.
- Các ca ở nhóm tính năng chưa merge (GM-35, GM-46, GM-48, GM-49, GM-51, GM-53, GM-54) chưa có test tự động; danh sách và lý do nằm trong mục "Ca chưa có test tự động" của TEST_REPORT. GM-56 và GM-57 lấp phần làm được; phần phụ thuộc task chưa xong chờ task đó.
- Các ca e2e (30 ca chạy tay) cần thiết bị thật, iPhone và staging: do GM-58 thực hiện trên release candidate. Bộ ca iOS chưa được chạy lần nào.
- Số ca (194) thấp hơn ước tính ban đầu (khoảng 280) vì mỗi ca được viết đủ bước và kết quả mong đợi thay vì tách nhỏ; có thể thêm ca khi GM-56/57/58 phát hiện khoảng trống.
- Nhập kết quả tự động chỉ áp dụng cho ca có môi trường `ci` mà toàn bộ liên kết là Jest hoặc unittest. Test chạy bằng `node --test` (engine) và suite SQL/HTTP chưa được nhập tự động.
- Liên kết tới cả file `.sql` hoặc `.http` mang tính chủ đề: người chạy cần xác nhận suite thực sự bao phủ ca, nếu không ghi Fail hoặc bổ sung test ở GM-57.
- Yêu cầu cũ (8 người, lọc theo quán/GPS, cap R2 cũ, không có ready) đã được đánh dấu Superseded để không mâu thuẫn với tài liệu `FUNCTIONAL_REQUIREMENTS.md`; tài liệu đó giữ nguyên làm lịch sử.
