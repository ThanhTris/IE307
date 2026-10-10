# GM-04 — Food/core field contract, bổ sung PR #62

2026-10-10 • Owner Vinh • Reviewer Trí theo comment PR #62 • Review Pending.
Không Approved/Done và không Closes #65. Issue hiện hành
[#65](https://github.com/ThanhTris/IE307/issues/65); task metadata local chưa tự
chuyển accepted/Done từ assignee GitHub.

## Input, revision và mapping

Main đã fetch `0cf1dc0b247c717abce1bdd23fec8dba791835cc`; GM-01
`food-v1/roadmap-v2/GM-01.1` **Done/Approved** theo
[REVIEW](../GM-01/REVIEW.md). Hồ sơ ghi xác nhận chủ dự án cho baseline/stack;
không duyệt dữ liệu/code GM-04. UI GM-02 và BE GM-03 đang review trên main mới.
Nhánh dữ liệu `codex/gm-03-taxonomy-data-contract` rebase từ `feb2810a` lên main;
6 commit replay, head trước patch bổ sung `77163db394b7053c475396a763a08097f9c655a9`.
Conflict README và repository tests được giữ cả nền main và phần dữ liệu.

Legacy roadmap-v1 GM-03 → roadmap-v2 GM-04 field contract và GM-07 consumer DTO;
verified import là GM-08 sau schema GM-06, eligibility GM-18. Không ghi metadata
vào task GM-03 BE hiện tại. [Evidence lịch sử](../../roadmap-v1/GM-03/MAIN_SYNC.md)
và [review package cũ](../../GM-03/REVIEW_PACKAGE.md) giữ nguyên nội dung.

## Artifacts sử dụng ngay

| Artifact | Vai trò / version |
| --- | --- |
| [Dictionary](../../../data/FOOD_DATA_DICTIONARY.md) | Food/core fields, null/default/enum/unit/privacy/source và consumer |
| [Field coverage](../../../data/FIELD_COVERAGE.md) / [machine](../../../data/field-coverage.json) | 596 field paths kể cả nested; type/required/null/default/enum/unit/timezone/FK/unique/privacy/version/source, valid/invalid/unknown |
| [Food schema](../../../../supabase/seed/templates/food-v1.schema.json) / [template](../../../../supabase/seed/templates/food-v1.template.json) | Food field interchange 1.1.0; 11 entities, có mô phỏng đầy đủ |
| [Core schema](../../../../supabase/seed/templates/core-v1.schema.json) / [template](../../../../supabase/seed/templates/core-v1.template.json) | Core 1.0.0; 18 entities, roster/pool/submission/result/history/social/inbox/ACK có liên kết |
| [Contract cases](../../../../tests/fixtures/food-v1/contract-cases.json) / [README](../../../../tests/fixtures/food-v1/README.md) | 135 expected được biên tập độc lập, clock cố định |
| [Model](../../../../scripts/gm04_contract_model.py) / [builder](../../../../scripts/build_field_contracts.py) / [validator](../../../../scripts/validate_field_contracts.py) | Offline, stdlib; schema và semantic rules; không SQL/import/API |
| [Manifest](../../../../tests/fixtures/food-v1/artifact-manifest.json) | SHA256 artifact mới và cases, độc lập version |
| [CHECKS](CHECKS.md) / [actual](contract-case-results.json) | Input → expected → actual/error path, commands, giới hạn |

Contract chung đề xuất `food-v1/roadmap-v2/GM-04.1` cần Trí review. Food 1.1.0
bổ sung binding `venues.scheduleId` và `lastOrder`/`lastOrderDayOffset` cho lịch
quán/món; `dateExceptions.lastOrderDayOffset` rõ ngày qua đêm. Adapter copy legacy
1.0.0, không sửa snapshot. Known lastOrder cũ cần người review offset trước adapter.
GM-06/07 nhận field proposal này; JSON Schema không thay SQL constraints hoặc RPC DTO.

## Chạy từ clone sạch

Python 3.12+ stdlib (zoneinfo cần IANA tzdata của hệ điều hành), không cần .env,
package mới, notebook kernel hoặc mạng cho contract runner:

```sh
python3 scripts/build_field_contracts.py --check
python3 scripts/validate_field_contracts.py --food supabase/seed/templates/food-v1.template.json --core supabase/seed/templates/core-v1.template.json --as-of 2026-10-10T00:00:00Z
python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 -m unittest discover -s tests -p 'test_field_contracts.py'
```

Expected: artifacts consistent, templates valid=true, 135/135 cases Pass. Runner
không áp default, không dùng clock máy. Schema Draft 2020-12 dùng vocabulary đóng;
stdlib runner kiểm toàn bộ keywords đang dùng và fail với keyword chưa hỗ trợ.
Chưa chạy validator JSON Schema của thư viện bên thứ ba. FK/unique/date/timezone/
source/consent cần semantic runner bên cạnh shape schema.

## Catalogue và dữ liệu thật

[Taxonomy legacy](../../../../data-preparation/docs/TAXONOMY.md),
[dictionary/forms legacy](../../../../data-preparation/docs/DATA_DICTIONARY.md),
[catalogue](../../../../data-preparation/docs/EDITORIAL_CATALOGUE.md): **39 món draft**,
219 tên menu → 216 mapped/2 needs_review/1 excluded; 247 quan sát giá tại 21 chi nhánh,
artwork=null. Snapshot contract **1.0.0**, dataset **0.2.0**, ID/checksum giữ nguyên.
Không cần tăng lên 60–80 để nghiệm thu field contract GM-04. Chưa phải verified
menu/hours/coverage/rights hoặc seed app; các entity nơi bán trong catalogue rỗng
vẫn là draft. Khảo sát có thể tái dùng cho GM-08 sau schema/review/nguồn còn hạn.

Templates và cases mới luôn fixtureOnly=true, IDs riêng, example.invalid. Simulated
review/license không là bằng chứng thật; fixture bị chặn publish. Fixtures eligibility
[food-data-v1](../../../../tests/fixtures/food-data-v1/README.md) nguyên trạng dành
GM-18, không là test query/RPC. Thông tin giá/ảnh thực chưa được review lại.

## Review và downstream

Trí đối chiếu [CHECKS](CHECKS.md) theo từng mục của
[comment](https://github.com/ThanhTris/IE307/pull/62#issuecomment-6096995245).
GM-06 nhận dictionary/schema để viết DB; GM-07 nhận fields/null/privacy để chốt DTO;
GM-08 nhận draft khảo sát sau schema; GM-18/19 thực hiện eligibility và khóa context.
Nhánh engine legacy GM-06 thuộc GM-15, PR #101 stacked trên nhánh này; không nằm
trong diff dữ liệu PR #62.

Start và merge dependency GM-01 đã được nhận trên origin/main đúng revision.
READY_FOR_MERGE_REVIEW chỉ là gate metadata, không quyền auto-merge. Còn chờ
review revision/contract bởi Trí, SQL/RLS/RPC/import/query/native và verified dữ liệu
ở task sau; không tự nghiệm thu các phần đó bằng mock/CI.
