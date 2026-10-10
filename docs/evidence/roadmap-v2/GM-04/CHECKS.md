# GM-04 — field contract checks, bổ sung PR #62

2026-10-10 • Owner Vinh • Reviewer Trí • **Review Pending**.
Upstream main đã fetch: `0cf1dc0b247c717abce1bdd23fec8dba791835cc`.
GM-01 `food-v1/roadmap-v2/GM-01.1` Done/Approved theo [REVIEW](../GM-01/REVIEW.md)
có trên target; không phải approval output GM-04.

Tested base `77163db394b7053c475396a763a08097f9c655a9` + patch bổ sung working tree.
[Summary](validation-summary.json) ghi SHA256 code đã chạy;
[manifest](../../../../tests/fixtures/food-v1/artifact-manifest.json) ghi checksum
schema/template/dictionary/cases. Revision commit final sẽ được ghi trong PR;
reviewer đối chiếu hashes và chạy lại trên revision đó.
Contract đề xuất `food-v1/roadmap-v2/GM-04.1`; food **1.1.0**, core **1.0.0**;
fixture dataset0.1.0. Legacy contract1.0.0/editorial dataset0.2.0 giữ nguyên.

## Môi trường và cách kiểm

Python bundled **3.12.14** trên macOS, stdlib cho contract, pandas/lxml hiện có
cho regression legacy. `python3` hệ thống 3.14.7 cũng chạy 148 field tests nhưng
thiếu pandas nên không dùng làm evidence đầy đủ regression. Không cài package,
đổi lockfile, gọi AI/crawl/API dữ liệu hoặc mở Jupyter kernel.

```sh
python3 scripts/build_field_contracts.py --check
python3 scripts/validate_field_contracts.py --food supabase/seed/templates/food-v1.template.json --core supabase/seed/templates/core-v1.template.json --as-of 2026-10-10T00:00:00Z
python3 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 -m unittest discover -s tests -p 'test_field_contracts.py'
python3 -m unittest discover -s tests -p 'test_*.py'
python3 data-preparation/scripts/validate_data_preparation.py --report-dir /tmp/gm04-legacy-audit
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-04 --gate merge --base-ref origin/main
git diff --check
```

Dùng Python có pandas/lxml đã có để tái lập regression. Runtime đã dùng:
`/Users/hoangvinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
Các lệnh chạy từ root repo; contract clock cố định **2026-10-10T00:00:00Z**,
audit legacy **2026-10-10T03:00:00Z** và fixture legacy clock riêng. Không dùng
ngày máy để thay expected. Audit thời điểm lịch sử không xác nhận freshness hiện tại.

## Input → expected → actual

[135 case results](contract-case-results.json) chứa edits, validationAt, expected
và actual/error path **từng ca**. Input là hai committed templates đầy đủ;
expected được biên tập độc lập, không sinh bằng validator/eligibility. Invalid
case yêu cầu code/path tối thiểu; lỗi kéo theo được ghi, không giấu thành Pass.
Đọc [fixture README](../../../../tests/fixtures/food-v1/README.md).

| Phép kiểm / input | Expected/assertion | Actual | Trạng thái và phạm vi |
| --- | --- | --- | --- |
| Builder → schema/template/dictionary | Byte giống committed artifact | consistent=true, drift=[]; hai lần sinh offline cùng byte | Pass, không mạng |
| Food template / core template | Shape + FK/unique/time/profile hợp lệ | valid=true, errors=[] | Pass, 11 food / 18 core entity mô phỏng |
| Case runner 135 inputs | Valid/invalid và code/path từng expected | **135/135 Pass**, report repeat byte-identical | Pass contract; không runtime eligibility |
| Field coverage 596 paths | Mỗi field đủ metadata; valid được nhận, invalid bị chặn | **596 valid + 596 invalid example assertions** Pass | Pass shape; nested kế thừa privacy/source |
| Field regression | Schema/ref/type/null/adapter/isolation/privacy invariants | **148 tests OK** | Pass; no network/read-only |
| Full Python regression | Tất cả test trên nền main mới và data patch | **398 tests OK**, 0 skipped | Pass Python3.12.14 |
| Legacy audit | Không mất data/mapping/rights guard | **9/9** Pass, validStructure=true, readyForPublish=false | Pass structure; source/license/review thực chưa Approved |
| Bảo toàn legacy | Byte nguyên trạng dữ liệu/code/cache-config/evidence đã tracked | **114 files identical**, mapping216/2/1 và39 dishes không đổi | Pass [inventory](legacy-preservation.json); chỉ sửa link task lịch sử trong TAXONOMY.md |
| Repository validator / index / diff | Không broken link/metadata/index/whitespace | Pass | Tooling/docs, không reviewer approval |
| GM-04 start / merge dependency gate | GM-01 Approved đúng bản trên target | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW | Pass metadata; owner/reviewer/output review chưa thay bằng gate |
| Optional main BE runner tests | 8 tests | **7 Pass, 1 Fail**: Supabase CLI missing trước bước kiểm Docker | Giới hạn môi trường nền; hai file BE/tests nguyên byte origin/main, không sửa/install trong GM-04 |

## Checklist reviewer và AC

| Mục yêu cầu bổ sung của Trí | Đã có / kết quả | Còn chờ |
| --- | --- | --- |
| Rebase main, trạng thái GM-01 | Main0cf1dc0, Approved baseline được ghi đúng; nền UI/BE giữ nguyên | Trí review revision cuối |
| 8 artifact bắt buộc | Dictionary, food/core schema/template, coverage, cases và CHECKS đầy đủ | Không placeholder; contract proposal chưa Approved |
| Core fields cho GM-06/07 | Room/member/preferences/submission/vote/result/history/consent/friend/invitation/inbox/device/event/delivery/idempotency/version/expiry | SQL constraints/RLS và DTO wire do consumer review/triển khai |
| Type/required/null/default/enum/unit/FK/unique/privacy/version/source/examples | 596 paths, gồm structured children; examples được kiểm thật | Defaults không tự áp; TTL/radius cap/horizon cần server config review |
| Food/place/time/source | FK branch/offering/coverage/anchor, radius mét, IANA/overnight/lastOrder/closed exception/sold_out/freshness/unknown | GM-18 tính eligibility giao lịch và khoảng cách; GM-08 verified dữ liệu |
| Assertion/evidence/version | Input/expected/actual từng135 ca, commands/runtime/hashes/report | Chưa chạy third-party JSON Schema validator; runner kiểm vocabulary đang dùng, fail unsupported |
| Draft khác verified | fixtureOnly, example.invalid, quyền ảnh unknown/null, catalogue39 draft; publish guard được kiểm | Nguồn/quyền ảnh/giờ/coverage/independent review thật ở GM-08 |

Không triển khai SQL/import/RPC/API/RLS/transaction, query eligibility/ranking,
Android/native/push hoặc nghiệm thu seed thật. Không kiểm parity TypeScript/SQL
bằng fixture. Các phần này **Not run — task sau**, không phải AC runtime GM-04.
Catalogue 39 món không tăng để đủ60–80; artwork0, data real chưa verified.
GM-04 vẫn chờ review contract/patch/tests và acceptance bởi Trí; không tự tick
AC task, Approved/Done, publish hoặc dùng Closes #65.

[Handoff](HANDOFF.md) · [Patch/test plan](PATCH_TEST_PLAN.md).
