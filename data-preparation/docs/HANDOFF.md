# Bàn giao chuẩn bị dữ liệu GM-03

## Đọc theo thứ tự

1. [Tổng quan nguồn](../DATASET_OVERVIEW.md): phạm vi, danh sách quán, 35 cột khảo sát.
2. [Vilao full](../VILAO_CATALOGUE.md): 17 cột thêm, prompt/cache/usage và giới hạn.
3. [Taxonomy](TAXONOMY.md): giá trị chuẩn, món gốc, alias/variant và quy tắc owner.
4. [Data dictionary](DATA_DICTIONARY.md) và [forms](../templates/README.md): 11 entity, CSV/JSON, ID/version/unknown, kiểm FK/giá/lịch/source/review.
5. [Catalogue biên tập](EDITORIAL_CATALOGUE.md): 39 UUID version 2, nguồn từng trường, bảng giá/ảnh, notebook offline và báo cáo 0.2.0.
6. [Fixtures phần 4](../../tests/fixtures/food-data-v1/README.md): input/expected cho pool/giá/lịch/coverage/unknown, clocks cố định, tách dữ liệu thật.
7. [Review package phần 5](../../docs/evidence/GM-03/REVIEW_PACKAGE.md): từng AC cho Tâm, patch/test plan Pending, audit/report/log kiểm, nguồn/license và phần còn thiếu.

## Bản dữ liệu đóng băng

Snapshots Git có CSV 219 dòng/52 cột, CSV 39 món gốc, CSV mapping 219 dòng và manifest SHA-256. Bản nguồn 219 dòng giữ nguyên byte; pipeline gốc/raw/API cache trong datasets Git-ignored. Sau clone có thể chạy notebook gộp món offline; chạy crawl/GPT lại cần nguồn/cache hoặc opt-in mạng/API theo README.

27 URL khảo sát Thủ Đức cũ: 23 beFood đọc được menu, 4 ShopeeFood cần render. 692 menu items; 250 mục tạo 219 tên ứng viên từ 21 chi nhánh. Mapping rộng còn 253 cần rà và 189 excluded. Đây là mẫu có chọn lọc, chưa phủ toàn bộ khu vực; delivery menu chưa chứng minh dine_in.

219/219 GPT schema-valid draft, 32 request mới và 9 món tái dùng pilot. Full provider usage 152690 tokens, pilot riêng 7061. 19 batch vượt max_tokens gửi, không coi tham số này là trần phí. Nhiều thuộc tính unknown; schema valid không chứng minh đúng nội dung.

## Trạng thái và phần còn lại

Owner đã xác nhận gộp 216 tên vào 39 món, 2 needs_review, 1 excluded. Không mất offering, không ghép giá/đặc tính giữa quán, không suy quyền ảnh từ URL. GM-03 vẫn BLOCKED bởi GM-28 và phân công còn proposed. Không sửa Approved/Done hoặc publish seed.

Còn review độc lập, nguồn/quyền ảnh và giá/đơn vị, biên tập taxonomy/meal unknown và kiểm freshness/lịch/offering thật. Fixtures pool/budget/context đã có ở phần 4; GM-30 còn thực thi thuật toán và parity. GM-04 làm SQL/import transaction; GM-27 xác minh dataset quán. Không sử dụng dataset này như danh sách quán đang mở/còn hàng.

Kiểm bằng Python runner, chưa Jupyter kernel/native/SQL. Không cài package, không gọi API thêm khi gộp món. Task readiness BLOCKED là kết quả dự kiến, không phải bằng chứng test thất bại hay gate mở.

## Kiểm chứng phần 1 — 2026-10-10

89 regression tests đạt; repository validator, task index check và diff check đạt. Notebook gộp món chạy 2 lần offline, 7/7 code cells đạt, 0 API calls, các CSV cùng SHA-256 theo snapshots/manifest.json. CSV nguồn có SHA-256 e441ecfca93846da6596284f969149d2fef3e53f3397daa537cd8ba24dbcff37. Các kiểm chứng này không thay review nội dung hoặc approval GM-28.

## Bàn giao phần 2

Dictionary/contract/forms có 11 entity và 14 bản ghi fixture tổng hợp. Notebook inspect_data_contract chạy 5/5 cells offline; JSON/CSV đọc lại tương đương. 138 tests đạt (49 contract mới); evidence và các giới hạn tại [DATA_PREPARATION](../../docs/evidence/GM-03/DATA_PREPARATION.md). Không chuyển snapshot nghiên cứu thành dữ liệu verified/published. Validator chỉ kiểm contract, không import hay cấp approval.

## Bàn giao phần 3

Catalogue mới [editorial-v0.2.0](../snapshots/editorial-v0.2.0/catalogue.json) gồm 39 món/UUID giữ nguyên, món version 2; contract 1.0.0. 34 mô tả có nguồn, 39 category, 5 cuisine, 2 mealSlots, 2 temperature, 1 origin và 1 món có alias; các trường còn thiếu giữ unknown/null/array rỗng. Mapping 216/2/1 và snapshot trước nguyên trạng. Không đạt mục tiêu 60–80, không thêm biến thể để đủ số.

247 giá quan sát từ 21 chi nhánh có source/đơn vị/ngày snapshot; không giá chung hoặc giá/người. 28 ứng viên ảnh có metadata nhưng chưa xem được nội dung vì Wikimedia 403/429, 0 artwork được chọn. Bảng ảnh phân biệt bị loại/cần rà/chưa có ứng viên. Venue/offering/lịch/coverage arrays rỗng, chưa dùng cho gợi ý thực tế. [Báo cáo](../snapshots/editorial-v0.2.0/QUALITY_REPORT.md), [manifest](../snapshots/editorial-v0.2.0/manifest.json) và field_evidence.csv cung cấp bằng chứng chi tiết; raw web cache Git-ignored, clone chạy offline từ evidence trích xuất.

158 tests đạt (20 editorial mới), repository validator/task index/diff check đạt. Hai lần notebook offline 7/7 cells, 19 artifact cùng checksum, JSON/CSV tương đương. Kiểm Python runner; chưa Jupyter kernel hoặc reviewer Approved. Phần 3 đã commit 2e61a5712a07fe4834e92f907a278cb0740c7174 trước phần 4 theo yêu cầu owner; không push.

## Bàn giao phần 4

42 ca/27 dataset/36 assertions, 13 nhóm; dataset cơ sở 10 món mô phỏng để kiểm cắt pool về 8, 61 bản ghi thuộc 11 entity. Có CSV/JSON tương đương, registry UUID fixture riêng, cases và comparison cùng seed/input/đảo thứ tự nguồn. expected nhận/loại/cần xác nhận viết rõ, không tính từ eligibility; ca >8 không chốt tám món thắng hay thứ tự rank. Các variant là candidate theo dishId/variant, alias không thêm candidate.

Nguồn/giá/quán/coverage/reviewer/quyền đều mô phỏng; fixtureOnly=true, không publish/seed/ảnh thật. validationAt cố định khác evaluatedAt, không dùng ngày máy để che ca hết hạn. Notebook prepare_food_fixtures có 7 khối, chạy offline và lưu executed trong datasets Git-ignored. Phần 4 đã commit 27854223b2670a8b73ed61f32c0a82501456cccd trước phần 5; giữ nguyên branch và snapshot thật. GM-30 tiếp nhận dữ liệu/expected và thực thi thuật toán/TypeScript–SQL parity sau gate chính thức, GM-03 chưa Approved/Done.

184 regression tests đạt (26 fixtures mới), validator fixtures/repository/task index/diff đạt. Hai lượt notebook offline 7/7 cells, 19 artifact cùng checksum, JSON/CSV cơ sở tương đương; 0 network/API calls. Kiểm Python runner, chưa Jupyter kernel hoặc eligibility engine. Evidence chi tiết ở DATA_PREPARATION.md; không báo những kiểm này thay review nội dung/approval.

## Bàn giao phần 5

`python data-preparation/scripts/validate_data_preparation.py` là audit chỉ đọc: 9 nhóm kiểm manifest/byte/hash, mapping và metadata lossless, taxonomy registry, forms, catalogue/giá/nguồn và fixture/expected. Catalogue/forms kiểm với clock lịch sử 2026-10-10T03:00:00Z; fixtures dùng validationAt riêng. Lỗi có file/entity/dòng/trường; null/unknown hợp lệ ở draft được báo giới hạn, không nâng thành verified. Thêm `--report-dir data-preparation/datasets/data-validation/reports` khi cần lưu, thư mục tự tạo; không ghi vào snapshot/fixture.

Notebook validate_data_preparation có 5 khối, xem nguồn/thiếu thông tin, minh họa lỗi trong bộ nhớ và kiểm hai lần audit ổn định. [Evidence tổng hợp](../../docs/evidence/GM-03/REVIEW_PACKAGE.md) dẫn taxonomy/dictionary/catalogue/forms/fixtures, từng AC, nguồn/license, checksum và log lệnh kiểm. Owner đã yêu cầu commit phần 5 với message `feat(data): add GM-03 validation and reviewer handoff`; hash tra trong Git history. Reviewer Tâm còn proposed/Pending; 39/60–80, artwork=0, quyền menu/freshness/review và dữ liệu nơi bán thật còn thiếu. Không SQL/eligibility/publish hoặc đổi trạng thái task.

201 regression tests đạt (17 audit mới); 9/9 nhóm audit đạt, 0 lỗi, 9 cảnh báo. Repository validator/task index/diff đạt; readiness vẫn BLOCKED. Hai lượt notebook offline 5/5 cells cho report cùng checksum và 86 input không đổi; mọi snapshot/config/form/fixture giữ nguyên so với commit phần 4. Kiểm Python runner, chưa Jupyter kernel hoặc reviewer chấp thuận.
