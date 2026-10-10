# GM-03 — Báo cáo bản nháp taxonomy/hợp đồng dataset

Soạn ngày 2026-10-08; cập nhật bàn giao ngày 2026-10-10. Branch `sanbox`, base commit `36132e9`. Chủ dự án xác nhận giữ mẫu JSON hiện tại, test xong và yêu cầu commit/push GM-03 lên `sanbox` trước khi tiếp tục GM-04. Đây là xác nhận test của chủ dự án, chưa thay review độc lập. GM-01 còn review; readiness GM-03 BLOCKED. Vinh/Tâm vẫn là owner/reviewer đề xuất; không tự Approved/Done hoặc mở gate downstream. [Kế hoạch trước code](IMPLEMENTATION_PLAN.md).

## Đã thực hiện

- Contract dự thảo `food-v1.gm03-draft.1`, DTO và enum TypeScript strict, validator thuần trong `mobile/src/domain/catalogue`; không UI/SDK/network/dependency mới.
- Tách cuisine/origin/category/mealSlots; temperature khác spicy, unknown khác none, null không tự thành giá 0 hoặc an toàn dị ứng. Alias chuẩn hóa Unicode/case/spacing để phát hiện trùng.
- Dataset/template shapes cho món, chi nhánh, offering/variant, giá/đơn vị, nguồn/rights/reviewer, lịch quán và món, date exception, availability override, coverage/anchor/version.
- Validator trả JSON path/code/message; kiểm shape/ref/unique/giờ/ca/dates/timezone/metadata/freshness. Preflight publish chặn fixture, nguồn/child stale, thiếu review/rights và tập rỗng; chưa gọi importer/database.
- [Dictionary](../../../data/FOOD_DATA_DICTIONARY.md), [template nhập liệu](../../../../supabase/seed/templates/food-v1.template.json) và [fixtures riêng](../../../../tests/fixtures/food-v1/README.md). 4 món, 2 chi nhánh, 5 offering, 7 schedule, 2 coverage/anchor; tất cả tổng hợp, không data quán/ảnh thật.
- 12 context/expected pool cases: category xung đột, seed replay, meal/budget/unit, origin khác nơi bán, overnight/end-exclusive/ngày đóng cửa, ngoài vùng/radius, giờ unknown và sold_out. Expected do người soạn đặt, chưa là output eligibility/ranking.
- [Phần test cho chủ dự án](USER_TEST.md); không cần Expo Go/SDK. README/cấu trúc/task cập nhật rõ code FE/domain/template và phạm vi BE chưa có.

## Kiểm thực tế

`npm.cmd run check` exit 0: typecheck, lint, 6 suites/150 tests (97 test mới GM-03 và 53 regression GM-02), architecture boundary đạt. [Output](AUTOMATED_CHECKS.txt). Thực hiện ngoài Windows restricted sandbox do lỗi Jest temp realpath đã xác định ở GM-02; không cài package hoặc đổi runner. Lần cuối có test field tên trùng Object prototype và validator không sửa snapshot đầu vào.

Repository validator đạt; regression Python 69 tests đạt (14,642 giây), task indexes khớp và `git diff --check` đạt. Metadata task không đổi nên không cần sinh lại indexes. [Manifest SHA-256](SOURCE_MANIFEST.json) ghi 8 file code/test/JSON đầu vào tại revision chưa commit để reviewer đối chiếu; không bao gồm tài liệu/evidence. Không có Android/SQL/database/network call hoặc publish; không coi fixture là proof nguồn/quyền ngoài đời. Contract validator cũng không chứng minh RLS/auth/transaction/idempotency.

## Đối chiếu AC và bàn giao

| AC | Bằng chứng và giới hạn |
| --- | --- |
| Source/license ảnh và giá kiểm được | DTO/sourceRefs/rights/license/units/checkedAt/validUntil/reviewer + negative tests; không thêm ảnh mạng hoặc giá thật thiếu nguồn. Ảnh null. Chưa có independent verification dữ liệu thực tế |
| Pool <=8 không trùng, category xung đột | Fixture validator và cases/test refs/unique/limit; expected snapshots do người soạn đặt. Selector/SQL parity thuộc GM-11 |
| Meal/budget unknown/seed/context boundary, không allergen claim | Cases/negative tests và dictionary. Seed replay là expected input/output, không chứng minh generator. Không có allergy guarantee field |
| Cuisine/origin tách nơi bán, temperature tách flavor, đa nhãn/unknown/alias/variant/mealSlots | DTO/enums/dictionary và 4 món mẫu; chưa là catalogue 60–80 món đầy đủ |
| Dictionary/JSON source/license/unit/time/reviewer, overnight/unknown/outside riêng seed | Template ở seed/templates; fixture ở tests/fixtures/food-v1, publish guard từ chối fixture. Không import/publish hay SQL constraints thật |

GM-05 review mapping nested JSON → SQL, constraints/GIS/runner/transaction; GM-08 nguồn/quyền ảnh/menu/giá thật và người kiểm độc lập; GM-11 eligibility/time/rank/giá card đồng thời và SQL parity; GM-12 room snapshot/start/revalidate. Template, field types và assumptions cần Vinh/Tâm review trước dùng chung. Supabase vẫn Proposed, task này không chọn provider.

Giới hạn kỹ thuật: validator không kiểm nguồn thật/license hợp pháp, polygon self-intersection/anchor containment, khoảng cách, ca hôm trước giao exception ngày sau, effective lastOrder/override hay thời hạn policy cố định. Những phần này được ghi rõ trong dictionary và chuyển đúng task; không có UI/DB mới để test trên điện thoại ở GM-03.
