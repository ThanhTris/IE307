# GM-55 — Kiểm tra bộ test case

Ngày chạy: 2026-11-20. Nguồn: `main` `08f3bc3` (đã có #196) cộng các file của GM-55 chưa commit tại thời điểm chạy; máy Windows 11, Python 3.14, Node 24. Đây là kết quả của chính bộ công cụ và dữ liệu test case; kết quả chạy thiết bị và staging thuộc GM-58 và chưa có.

## Kiểm tra công cụ và dữ liệu

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| Schema, ID, yêu cầu, liên kết test | `python scripts/test_cases.py --check` | Đạt: 194 ca, 68 yêu cầu (63 hiện hành, 5 Superseded), 146 ca có test tự động, 48 ca chưa có |
| Mọi yêu cầu P0 hiện hành có ca | trong `--check` | Đạt |
| File sinh ra khớp bản commit | `python scripts/test_cases.py --check-docs` | Đạt |
| Test của công cụ | `python -m unittest tests.test_test_cases` | Đạt 25/25: validate repo, từng loại lỗi dữ liệu (trùng ID, REQ lạ, đường dẫn test sai, thiếu gap, enum sai, tag lạ), trạng thái theo môi trường, nhập Jest/unittest, cấu trúc file Excel |
| Xuất Excel | `python scripts/test_cases.py --xlsx <file>` | Tạo file 4 sheet (Test cases 195 dòng gồm tiêu đề, Traceability, Summary, Defects); cấu trúc zip và XML được kiểm bằng test. Chưa mở bằng Excel thật trong lượt này |

## Lượt chạy tự động đã ghi vào `docs/testing/results/`

| Lượt | Phạm vi | Kết quả | Ca được ghi |
| --- | --- | --- | --- |
| `automated-python-20261120` | `python -m unittest discover -s tests -p "test_*.py" -v` (715 test) | Các test liên quan tới ca: đạt | 7 ca (TC-DATA-001, 002, 005, 006, 007, 008, 009) Pass |
| `automated-jest-20261120` | `npx jest --runInBand` trong `mobile/` (1.501 test) | 1.499 đạt, 1 bỏ qua, 1 lỗi | 82 ca Pass, 1 ca Fail (TC-RES-001) |
| `automated-jest-20261120-rerun` | Chạy lại hai suite `liveDishResultScreen` và `dishResultPodium` | 38/38 đạt | TC-RES-001, 012, 013 Pass; kết quả này thay kết quả Fail của lượt trước |

Giải thích lỗi Jest: test `renders DECIDED result with Top 3 podium, winner and price` vượt thời hạn 5 giây khi Jest và bộ Python chạy song song trên cùng máy; chạy lại hai suite liên quan trên máy rảnh đạt hết, nên đây là lỗi thời gian chạy dưới tải, không phải lỗi hành vi. Kết quả Fail của lượt đầu vẫn được giữ trong `results/automated-jest-20261120.json` để truy vết.

## Toàn bộ bộ Python

Lượt chạy tự động ghi 715 test: các test không liên quan tới bộ test case có hai nhóm không đạt, đã xử lý như sau.

- `test_foreign_checkout_and_symlink_rejected` (GM-40): cần quyền tạo symlink trên Windows; CI Linux chạy được. Lỗi môi trường đã biết, không thuộc task này.
- Một số test của `test_repository_validator` và `test_project_gate` báo `broken link: GM-55/HANDOFF.md -> CHECKS.md` vì lượt chạy diễn ra khi file này chưa tồn tại. Sau khi thêm file này, hai module được chạy lại: xem bảng dưới.

| Kiểm tra sau khi đủ file | Lệnh | Kết quả |
| --- | --- | --- |
| Validator và Project gate | `python -m unittest tests.test_repository_validator tests.test_test_cases` và `python -m unittest discover -s tests -p "test_project_gate.py"` | Đạt: 69 test validator, 25 test bộ test case, 38 test Project gate |

## Giới hạn

- Chưa chạy bộ SQL, HTTP và các runner QA (cần Docker và Supabase local); các ca `qa-local` và `staging` còn `Not run`.
- Chưa chạy ca nào trên thiết bị, iPhone hay staging: thuộc GM-58.
- Test `node --test` (engine) và bộ SQL/HTTP chưa được nhập tự động vào kết quả.
- Không có kết quả nào trong tài liệu này thay cho nghiệm thu của Trí.
