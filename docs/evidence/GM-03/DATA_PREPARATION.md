# GM-03 — Evidence chuẩn bị dữ liệu draft

Ngày chạy 2026-10-10. Chủ dự án yêu cầu triển khai kế hoạch khảo sát/taxonomy/forms và commit; chưa là approval GM-28/GM-03. Owner/reviewer task vẫn proposed; không sửa trạng thái task. Gate checker GM-03 exit 1: BLOCKED, WAIT GM-28 review. Không seed/app/backend/SQL/import/publish triển khai trong thay đổi này.

## Đầu ra

[Handoff](../../../data-preparation/docs/HANDOFF.md), [taxonomy](../../../data-preparation/docs/TAXONOMY.md), [dictionary](../../../data-preparation/docs/DATA_DICTIONARY.md), [forms](../../../data-preparation/templates/README.md).

Snapshot nguồn giữ nguyên 219 dòng/52 cột, SHA-256 e441ecfca93846da6596284f969149d2fef3e53f3397daa537cd8ba24dbcff37. Mapping 219 dòng: 216 mapped →39 món gốc, 2 needs_review, 1 excluded. Metadata offering bảo toàn từng giá trị; các nhãn GPT giữ theo ngữ cảnh nguồn, không biến thành thuộc tính chung đã xác minh. [Manifest](../../../data-preparation/snapshots/manifest.json) lưu checksum/bytes của ba CSV, không chứa secret/raw API cache.

Part 1 commit 3c70b99 trên codex/gm-03-taxonomy-data-contract. Part 2 gồm 11 entity, registry taxonomy, dictionary và forms CSV/JSON; fixture 14 bản ghi có ca qua đêm/ngày đóng/unknown, fixtureOnly=true, không dữ liệu thật. Không thêm package, không gọi API mới; legacy codebook/cache giữ nguyên.

## Kiểm tra đã chạy

Runtime bundled Python 3.12.14/pandas 2.2.3/lxml 6.1.1. System python3 chạy validator/forms stdlib; regression dùng bundled Python.

```text
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
<bundled-python> -m unittest discover -s tests -p 'test_*.py'
<bundled-python> data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_base_catalogue.ipynb --offline
<bundled-python> data-preparation/scripts/run_notebook.py data-preparation/notebooks/inspect_data_contract.ipynb --offline
python3 data-preparation/scripts/data_contract.py data-preparation/templates/examples/dataset.json
python3 data-preparation/scripts/data_contract.py data-preparation/templates/examples
git diff --check
```

138 regression tests đạt: 80 trước đó, 9 gộp món, 49 contract. Kiểm ID/version registry ổn định khi đổi nhãn; mapping đầy đủ; metadata nguyên trạng; gộp chay/bò/gà; vị unknown/có vị chưa rõ mức; khuya không thành snack; UTF-8 BOM và deterministic export. Kiểm CSV/JSON bằng nhau, null không thành 0/false; FK/type/enum/giá/tọa độ/UTC/timezone; lịch nhiều ca/24h/qua đêm/ngoại lệ đóng; trùng ca/offering; nguồn/quyền ảnh/reviewer/freshness; fixture không publish. Có case hợp lệ verified/published trong test để bảo đảm validator không luôn từ chối; không thực hiện publish.

Hai lượt notebook món gốc 7/7 code cells, SHA-256 giống nhau, 0 API calls. Notebook dictionary 5/5 cells, JSON/CSV tương đương, output bản sao vào datasets Git-ignored; Python exec có báo cáo executed cục bộ, chưa kiểm trực tiếp Jupyter kernel. Tests không thực thi thuật toán eligibility của GM-30; ngoại lệ ngày đóng chặn ca qua đêm được mô tả bằng fixture, phần áp dụng còn thuộc GM-30.

## Giới hạn và review còn lại

Không chứng minh menu đang bán, dine_in, còn hàng, phủ toàn vùng, quyền ảnh hoặc kết quả AI đúng. Quy tắc owner gộp món không thay reviewer độc lập. validUntil chưa có policy chốt để tự điền. Chưa có fixtures đầy đủ pool/budget/context/native/SQL; GM-03 chưa đủ Done. GM-04/27/30 tiếp nhận theo gate chính thức khi GM-28 được Approved. Không push/PR hoặc đổi GitHub issue.

## Phần 3 — catalogue có nguồn, 2026-10-10

Owner yêu cầu giữ 39 món đã chốt, chỉ điền có nguồn và tìm ảnh Commons. [Hướng dẫn](../../../data-preparation/docs/EDITORIAL_CATALOGUE.md), [quality report](../../../data-preparation/snapshots/editorial-v0.2.0/QUALITY_REPORT.md) và [manifest](../../../data-preparation/snapshots/editorial-v0.2.0/manifest.json) bàn giao dataset 0.2.0/contract 1.0.0. 39 UUID giữ nguyên, version món tăng lên 2; không sửa snapshot phần 1/codebook/cache GPT. Mapping vẫn 216 mapped / 2 needs_review / 1 excluded. Chưa đạt 60–80 món.

34 mô tả, 39 category family, 5 món có cuisine (vi 5, zh 1 đa nhãn), 2 mealSlots, 2 temperature, 1 origin, 1 món có alias. 247/247 giá quan sát có nguồn từ 21 chi nhánh, giữ nguyên giá/đơn vị/URL/ngày snapshot, không tính giá/người hay giá chung. field_evidence có 123 dòng tham chiếu từng trường. Tất cả draft/needs_review, validUntil/reviewedBy=null; ingredientTags/flavor chưa có bằng chứng chung giữ null. Các entity nơi bán/lịch/coverage chưa xác minh để rỗng.

Commons API 10/39 lượt lấy metadata, 29 lỗi 429; API bài tham khảo 0/20 thành công (429). Collector khảo sát ban đầu dùng 3 worker và tiếp tục sau lỗi; module refresh đã thay bằng tuần tự, dừng 403/429, không tự retry. Web tool đọc được bài tham khảo và một số trang file; browser kiểm trang/ảnh bị 403/429. Lưu 28 ứng viên (23 cần kiểm hình ảnh, 5 bị loại), **0 artwork được chọn**. Metadata/license không thay kiểm nội dung ảnh. Raw captures/checksum trong datasets Git-ignored; evidence trích xuất và bảng ghi công được Git theo dõi, clone không cần tải web để replay. Không gọi API phân loại mới, tải ảnh vào assets hoặc cài package.

```text
<bundled-python> data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_editorial_catalogue.ipynb --offline
<bundled-python> -m unittest discover -s tests -p 'test_*.py'
python3 data-preparation/scripts/data_contract.py data-preparation/snapshots/editorial-v0.2.0/catalogue.json
python3 data-preparation/scripts/data_contract.py data-preparation/snapshots/editorial-v0.2.0/csv
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
git diff --check
```

Hai lượt notebook offline cuối cùng đạt 7/7 code cells; 19 artifact giống checksum (kể cả manifest), 0 network/API calls trong replay. Catalogue SHA-256: cfaff47b0c65833983fe8de748428f25d26d7e1d49c539a5d1045676a08b9e90. JSON và 11 CSV entity tương đương; bảng giá CSV đọc lại khớp từng ô nguồn, UTF-8 BOM. 158 regression tests đạt, gồm 20 tests editorial mới: nguồn theo trường, không promote GPT/ảnh menu, không lẫn giá chi nhánh, reject cache drift, clone offline, output deterministic, refresh lưu bytes/checksum và dừng 429, draft không vượt publish guard. Refresh tests dùng mock response, không gọi mạng. Kiểm bằng Python runner, chưa Jupyter kernel hay reviewer độc lập. Không commit/push/PR phần 3 trong lượt này.

## Phần 4 — fixtures, 2026-10-10

Theo yêu cầu mới của owner, đã kiểm 158 tests/repository/task index/diff và commit riêng phần 3 **2e61a5712a07fe4834e92f907a278cb0740c7174** trước khi viết phần 4; giữ branch codex/gm-03-taxonomy-data-contract, không push/PR. Stage check phát hiện khoảng trắng cuối dòng trong metadata Commons; đã chuẩn hóa chuỗi hiển thị metadata, cập nhật checksum và chạy regression trước commit. Raw capture và snapshot khảo sát gốc không đổi. Trạng thái GM-03 vẫn BLOCKED bởi review GM-28, không sửa assignment/Approved/Done.

[Bộ fixtures](../../../tests/fixtures/food-data-v1/README.md) có 42 ca, 27 dataset tình huống, 13 nhóm và 36 assertions. Cơ sở 10 món/61 bản ghi thuộc 11 entity để kiểm cắt pool về 8, số món ít hơn giữ thực; ID/registry riêng không trùng catalogue thật. Các ca có meal/budget/trait unknown, ưu tiên nướng/lẩu, alias/variant/đa nhãn, giao lịch/qua đêm/ranh giới/ngày đóng, nguồn hết hạn/coverage/radius, availability và seed/context/buffer. Tập nhận/loại/cần xác nhận partition offering; expected viết rõ từ spec, không được tính bằng eligibility. Thứ tự rank/tám món thắng chưa chốt; comparison cùng input/seed/version và nguồn đảo thứ tự phải cho cùng ordered pool của thuật toán tương lai.

fixtureOnly=true, mọi nguồn/example.invalid/quán/giá/coverage/reviewer/quyền đều mô phỏng; artwork và ingredientTags=null. verified là trạng thái giả lập, không thay review thật. Export từ chối ghi vào seed/snapshot thật. Structural validationAt cố định 2026-10-08T00:00:00Z; evaluatedAt của từng ca 2026-10-09/10, không dùng giờ máy hiện tại để đánh giá ca hết hạn. CSV cơ sở và JSON tương đương, bundle tình huống đầy đủ không cần sửa tay. Không API/package mới hoặc triển khai GM-30/SQL/TypeScript.

```text
<bundled-python> data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_food_fixtures.ipynb --offline
python3 data-preparation/scripts/food_fixtures.py --check
<bundled-python> -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
git diff --check
```

184 tests đạt: 158 trước đó + 26 fixture integrity tests. Kiểm thời gian/expected đã viết rõ, ID/FK, fixtureOnly/source/alias/variant/giá/profile, chống publish, raw GPS, sửa seed hoặc đổi dữ liệu trong cặp chỉ đảo thứ tự, unknown/expiry, CSV roundtrip/determinism và chống export vào snapshot/seed thật. Không báo những kiểm này là thuật toán eligibility/TypeScript–SQL parity đã đạt. Validator fixtures/repository/task index/diff đạt; kiểm whitespace cả file mới chưa stage.

Hai lượt notebook fixtures cuối cùng đạt 7/7 cells, 19 artifact cùng byte/checksum, 0 network/API calls; cases.json SHA-256 **04e7cd78166dc80c417fb21969c9ab8baf86385f6e06b21304a424caa8b0d676**. Có output executed thật trong datasets/food-fixtures/reports Git-ignored, chưa chạy trực tiếp Jupyter kernel. Snapshot/config dữ liệu thật không đổi so với commit phần 3. Phần 4 để working tree, chưa commit; GM-30 nhận input/expected khi đạt gate để chạy thuật toán/parity. GM-03 còn review độc lập, ảnh và thông tin món chưa đủ nguồn, mục tiêu 60–80 chưa đạt và dataset nơi bán thật thuộc GM-27.

## Phần 5 — audit và gói review, 2026-10-10

Phần 4 đã commit **27854223b2670a8b73ed61f32c0a82501456cccd** theo yêu cầu owner trước khi làm phần 5; các ghi chú “chưa commit” trong phần 4 ở trên là trạng thái của lượt trước. Không push/PR. Branch và mọi snapshot/config/fixture thật giữ nguyên.

[Review package](REVIEW_PACKAGE.md) dẫn đầu ra/từng AC, [patch/test plan](VALIDATION_PLAN.md) Pending Tâm và [report máy](validation/REPORT.md)/[JSON](validation/report.json)/[log lệnh](validation/checks.json). Audit chỉ đọc tái dùng mapping/contract/editorial/fixtures; bổ sung manifest completeness/byte/hash, registry consistency, source/price lossless replay, CSV–JSON và artifact inventory 86 input. Catalogue/forms dùng clock lịch sử 2026-10-10T03:00:00Z; fixture giữ validationAt 2026-10-08T00:00:00Z và evaluatedAt riêng. Editorial build thêm tham số as_of tùy chọn để audit không phụ thuộc clock máy, không đổi nội dung đầu ra hoặc GPT pipeline.

9/9 nhóm kiểm đạt, 0 lỗi, 9 cảnh báo cần xử lý/review; validStructure=true, readyForPublish=false, Decision Pending. 39 món chưa đạt 60–80, artwork=0, nguồn/quyền menu/freshness/reviewer và nơi bán thật còn thiếu; báo rõ từng AC trong package, không dùng null để tuyên bố task hoàn tất.

17 tests audit mới kiểm input hỏng: ID trùng, taxonomy FK, thiếu source ở verified mô phỏng, giá âm/đơn vị sai, lịch qua đêm/ngày đóng sai, fixture publish, CSV drift, manifest size/hash/missing/unlisted/path escape, registry drift và diagnostic isolation. Null/unknown hợp lệ ở draft vẫn được giữ. Không triển khai eligibility để kiểm expected.

Toàn bộ 201 regression tests đạt; repository validator, task index và diff check đạt. Readiness GM-03 trả exit 1/BLOCKED vì GM-28 còn review; ghi riêng, không tính dependency đã qua. Lệnh/output thật ở validation/checks.json, evidence hai lượt và checksum report ở validation/offline.json.

Notebook audit có 5 cells; hai lượt offline đạt 5/5 và report cùng byte/checksum, input không đổi. Python runner sử dụng runtime sẵn có, không network/API/cài package; chưa Jupyter kernel/native/SQL/TypeScript–SQL parity hoặc review độc lập. Phần 5 giữ working tree; nguồn 219/52, mapping 216/2/1, catalogue 39/247 và fixtures 42/27 không đổi so với commit phần 4. Kết quả regression/repository/index/diff và readiness BLOCKED được lưu trong log lệnh, không coi blocker review là test dữ liệu fail.
