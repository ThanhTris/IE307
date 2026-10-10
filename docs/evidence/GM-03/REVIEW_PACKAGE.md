# GM-03 — gói bàn giao dữ liệu cho Tâm

Ngày chuẩn bị: 2026-10-10. Owner: Vinh; reviewer **đề xuất**: Tâm (@HoaiTam). **Decision: Pending**. Đây là evidence/tooling draft theo yêu cầu owner, chưa phải quyết định của reviewer. [Task GM-03](../../../tasks/backlog/GM-03.md) vẫn backlog, assignment proposed và BLOCKED bởi review GM-28. Không đánh dấu các AC hoặc dependency Approved/Done.

## Version và commit

Branch `codex/gm-03-taxonomy-data-contract`; không push/PR. Owner yêu cầu commit phần 5 sau khi nhận bàn giao. Trạng thái working tree trong log/plan phản ánh thời điểm kiểm trước yêu cầu commit, không phải quyết định review.

| Phần | Commit / version | Nội dung |
|---|---|---|
| 1 | `3c70b99` | Taxonomy, 39 món gốc, mapping 219 tên |
| 2 | `c45a6a0` / contract `1.0.0` | Dictionary, registry, CSV/JSON, validator |
| 3 | `2e61a5712a07fe4834e92f907a278cb0740c7174` / dataset `0.2.0` | Catalogue 39 món v2, nguồn từng trường, giá và ứng viên ảnh |
| 4 | `27854223b2670a8b73ed61f32c0a82501456cccd` / `food-fixtures-v1` | 42 ca mô phỏng, 27 dataset, expected cho GM-30 |
| 5 | Commit message `feat(data): add GM-03 validation and reviewer handoff` / audit `1.0.0` | Audit offline, notebook, test dữ liệu hỏng, gói review này; hash tra Git history |

[Patch/test plan](VALIDATION_PLAN.md) đang chờ Tâm chốt. [Báo cáo máy](validation/REPORT.md), [JSON báo cáo](validation/report.json), [hai lượt notebook offline](validation/offline.json) và [log lệnh kiểm](validation/checks.json) ghi kết quả thực chạy. `inputFiles` trong JSON có 86 input và SHA-256/byte size; không chứa .env/raw/API cache.

Kết quả ngày 2026-10-10: **201 regression tests đạt** (17 audit mới); 9/9 nhóm audit đạt, 0 lỗi và 9 cảnh báo. Repository validator, task index và diff check đạt. Hai lần notebook offline 5/5 cells cho report cùng byte/checksum, 86 input không đổi; snapshots/config/forms/fixtures nguyên trạng so với commit phần 4. Readiness trả exit 1 với BLOCKED bởi GM-28, là gate chưa đạt. Python 3.12.14 runner; chưa kiểm Jupyter kernel, native, SQL, engine GM-30 hoặc review độc lập.

## Đầu ra để đối chiếu

| Đầu ra | Đọc / kiểm |
|---|---|
| Taxonomy, unknown, alias/variant | [TAXONOMY](../../../data-preparation/docs/TAXONOMY.md), [config](../../../data-preparation/config/taxonomy_v1.json), [registry UUID](../../../data-preparation/config/taxonomy_registry_v1.json) |
| Dictionary / 11 entity / ID / version | [DATA_DICTIONARY](../../../data-preparation/docs/DATA_DICTIONARY.md), [contract](../../../data-preparation/config/data_contract_v1.json) |
| Forms CSV và JSON | [README](../../../data-preparation/templates/README.md), [empty](../../../data-preparation/templates/empty/dataset.json), [ví dụ mô phỏng](../../../data-preparation/templates/examples/dataset.json); CSV tương đương cùng thư mục |
| Catalogue thật khảo sát, vẫn draft | [catalogue.json](../../../data-preparation/snapshots/editorial-v0.2.0/catalogue.json), [CSV món](../../../data-preparation/snapshots/editorial-v0.2.0/csv/dishes.csv), [quality](../../../data-preparation/snapshots/editorial-v0.2.0/QUALITY_REPORT.md) |
| Nguồn từng trường | [field_evidence.csv](../../../data-preparation/snapshots/editorial-v0.2.0/field_evidence.csv), entity dataSources trong catalogue, [editorial evidence](../../../data-preparation/config/editorial_source_evidence_v1.json) |
| Giá quan sát | [price_references.csv](../../../data-preparation/snapshots/editorial-v0.2.0/price_references.csv): 247 mục, 21 chi nhánh, không gộp thành giá món hoặc giá/người |
| Ảnh / license / ghi công / lý do loại | [image_references.csv](../../../data-preparation/snapshots/editorial-v0.2.0/image_references.csv), [metadata ứng viên](../../../data-preparation/config/editorial_image_candidates_v1.json); 0 artwork, chưa tải assets |
| Mapping / nguồn gốc không mất metadata | [mapping](../../../data-preparation/snapshots/source_to_base_mapping.csv), [snapshot nguồn](../../../data-preparation/snapshots/thu_duc_dishes_taxonomy.csv), [39 món gốc](../../../data-preparation/snapshots/thu_duc_base_dishes.csv) |
| Fixtures / expected / clock / seed | [README](../../../tests/fixtures/food-data-v1/README.md), [cases](../../../tests/fixtures/food-data-v1/cases.json), [datasets](../../../tests/fixtures/food-data-v1/datasets.json); base JSON và 11 CSV riêng |
| Cách chạy / giới hạn | [HANDOFF](../../../data-preparation/docs/HANDOFF.md), [notebook audit](../../../data-preparation/notebooks/validate_data_preparation.ipynb), [script audit](../../../data-preparation/scripts/validate_data_preparation.py) |

## Đối chiếu từng acceptance criterion

Trạng thái dưới đây là **đánh giá của người chuẩn bị evidence**; Tâm cần quyết định Pass/Fail/Not run độc lập. Không suy máy kiểm đạt thành reviewer Approved.

| AC theo task | Bằng chứng máy / artifact | Review nội dung và giới hạn |
|---|---|---|
| 1. Source/license ảnh và giá kiểm được; không ảnh tùy ý hoặc giá giả | Audit giá khớp toàn bộ metadata từng menu item/chi nhánh/URL/date/unit; 247/247 giá có nguồn snapshot. Toàn bộ artwork=null; 28 ứng viên giữ license/link/tác giả/revision/ghi công và status riêng. | **Chưa đủ phần ảnh.** 23 ứng viên needs_visual_review, 5 rejected; Wikimedia 403/429 cản kiểm nội dung. Giá là lịch sử, menu rights unknown; unit menu_item_unspecified, khẩu phần/expiry chưa rõ. Tâm kiểm nguồn/quyền và cách biểu diễn; không xác nhận giá hiện tại. |
| 2. Fixture pool <=8 không trùng, category xung đột; thuật toán thuộc GM-30 | `pool-ten/eight/three/empty`, `preferences-conflict/skipped`, `identity-multilabel/alias/variants/two-venues`; kiểm bounds <=8, FK, identity dishId+variant, đa nhãn không nhân bản. | Fixtures chuẩn bị xong; **engine Not run**. 10 món input để thử cap8, không phải pool10. Expected không chọn sẵn tám món thắng, không áp đặt thứ tự rank. Tâm kiểm expected phù hợp spec; GM-30 thực thi. |
| 3. Meal/budget unknown/seed/context boundary có fixture; không claim allergen | `meal-unknown`, `price-missing/over-budget/budget-null/group-unit`, `profile-unknown/no-merge`, `context-scheduled/now-buffer/past`, `determinism-repeat/reordered`. Ingredient/allergen không suy từ tên; ingredientTags=null. | Kiểm cấu trúc/expected đạt; hành vi GM-30/TypeScript–SQL chưa chạy. Tâm rà unknown, budget ưu tiên mềm, buffer một lần và kết quả ổn định theo seed. |
| 4. Cuisine/origin tách nơi bán, nhiệt độ tách cay; đa nhãn/unknown, alias/variant, mealSlots định nghĩa | Taxonomy/registry/dictionary có giá trị chuẩn; `geography-origin`, `profile-no-merge`, `identity-*` minh họa. 39 category có source từng trường; GPT vẫn provenance draft, không tự coi xác minh. | Cấu trúc đạt; nội dung **Pending**. 34 description, 5 cuisine, 2 meal, 2 temperature, 1 origin, 1 alias; flavor/ingredients unknown. Tâm kiểm mapping/nguồn và xác nhận phạm vi món gốc. |
| 5. Dictionary/CSV/JSON có source/license/unit/checkedAt/validUntil/reviewer; fixture overnight/unknown/outside tách seed | 11 entity, forms empty/examples, catalogue CSV–JSON tương đương, UUID/FK/unit/timezone/review/publish guard. `night-*`, `schedule-*`, `geography-outside-area/radius`, `freshness-*`, `availability-*`; fixtureOnly=true và example.invalid. | Tooling/data mẫu đạt kiểm máy, reviewer/freshness của dữ liệu thật vẫn null/draft. verified/reviewer/quyền trong fixture chỉ mô phỏng. Không seed/publish; Tâm cần chốt plan/contract và provenance. |

**Mục tiêu catalogue 60–80 chưa đạt: hiện 39.** Owner đã chọn hoàn thiện 39 trước; chưa có reviewer chấp thuận thay mục tiêu task. Không thêm biến thể thành món mới để đạt số lượng. 216 mapped, 2 needs_review (“Cơm viên chua ngọt”, “Phở thập cẩm”), 1 excluded (“Phở bò gà”) giữ nguyên; nguồn không bị xóa.

## Nguồn, license và freshness

Phạm vi mẫu menu Thủ Đức cũ: không phủ toàn bộ khu vực, menu delivery không chứng minh dine_in. Catalogue có 27 dataSources: 24 usageRights=unknown; 3 nguồn văn bản tham khảo ghi licensed. Những license văn bản đó **không cấp quyền ảnh menu hoặc ảnh Commons ứng viên**. Inventory URL/license/ngày kiểm ở report JSON; chi tiết ảnh ở bảng riêng. Không suy license từ URL, không tự thêm TTL hoặc tên reviewer. Mọi validUntil/reviewedBy của catalogue vẫn null.

Audit catalogue/forms dùng clock lịch sử `2026-10-10T03:00:00Z` để tái lập; đó là tham số, không phải ngày thực review, ngày hôm nay hay bằng chứng nguồn đang còn hạn. Fixtures kiểm contract tại validationAt `2026-10-08T00:00:00Z`, có evaluatedAt riêng. Hết hạn/unknown không được che bởi dataset version; GM-30 kiểm hành vi sau này.

Checksum chính: catalogue `cfaff47b0c65833983fe8de748428f25d26d7e1d49c539a5d1045676a08b9e90`; nguồn 219 tên `e441ecfca93846da6596284f969149d2fef3e53f3397daa537cd8ba24dbcff37`; cases `04e7cd78166dc80c417fb21969c9ab8baf86385f6e06b21304a424caa8b0d676`. Manifest ở từng snapshot/suite kiểm toàn bộ file và byte size. Audit không cập nhật checksum để hợp thức hóa drift.

## Reviewer cần quyết định

1. Xác nhận phân công, GM-28 scope/version và patch/test plan; không coi các commit là tự mở gate.
2. Rà 39 nhóm món, 216 mapping và 2 mục cần xem lại; chốt xử lý mục tiêu 60–80.
3. Rà nguồn mô tả/alias/taxonomy, phần missing/unknown và đơn vị giá theo quán. Chưa biết thì giữ null/unknown.
4. Chỉ chọn artwork sau kiểm đúng món, trang file/license/ghi công và quyền dùng; đợt này chưa có ảnh đủ bằng chứng.
5. Đối chiếu từng expected với FOOD_DATA_SPEC và AC; fixture engine chưa chạy. Ghi kết quả độc lập bằng [review template](../../../tasks/templates/REVIEW_TEMPLATE.md), không sửa Decision ở đây thành Approved khi chưa review.

## Task sau, sử dụng và rollback

- **GM-04:** đọc contract/forms/registry để xây import/SQL transaction/validation. Chưa có migration, không báo SQL đã qua test; rollback hiện tại là giữ lại snapshot gốc và catalogue 0.2.0 riêng thư mục, không ghi đè nguồn.
- **GM-27:** xác minh quán–món, vị trí/coverage, service mode, giờ/ngoại lệ, giá/khẩu phần, nguồn/quyền/freshness và reviewer. Catalogue có venue/offering/lịch/coverage arrays rỗng, chưa đủ gợi ý thực tế.
- **GM-30:** nhận fixture JSON đầy đủ và expected; thực thi eligibility/pool/ranking rồi kiểm seed, boundaries và parity. Reason labels là nhãn thử nghiệm, chưa là enum API.

Mặc định chạy audit chỉ đọc. `--report-dir` chỉ ghi báo cáo vào vùng riêng; input checksum sau hai lần chạy không đổi. Không gọi thêm API, cài package, tải ảnh vào assets, deploy, publish seed hoặc gửi thông báo cho reviewer. Native/SQL/Jupyter kernel/human review chưa kiểm; notebook chỉ chạy qua Python runner.
