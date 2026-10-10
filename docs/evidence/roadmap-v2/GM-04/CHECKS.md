# GM-04 — kiểm lại theo review PR #62 revision f5a8304

2026-10-10 • Owner Vinh • Reviewer Trí • Review Pending.
Yêu cầu: [comment mới](https://github.com/ThanhTris/IE307/pull/62#issuecomment-6098430905).
Chủ dự án xác nhận trong chat: chạy/test đạt trên Mac và ghi rõ môi trường/lệnh
là đủ cho GM-04; Windows-only không chặn merge, xử lý tương thích riêng khi cần.
Không phải approval code/AC hoặc quyền tự merge/Done.

## Revision, version và môi trường

Source đã kiểm và revision trong [summary](review-fix-summary.json), SHA256 từng
file code tại feature commit `8f90af5555daad7506d16f59957d6e653c22b603`; follow-up chỉ cập nhật docs.
file code; [manifest](../../../../tests/fixtures/food-v1/artifact-manifest.json)
pin generated artifacts/cases. Main0cf1dc0, GM-01 Approved theo [REVIEW](../GM-01/REVIEW.md).
Contract proposal **GM-04.2**, food shape **1.1.0**, core **1.1.0** thêm consent
operation; publish semantic rules sửa lỗi binding lịch. Legacy food1.0.0/dataset0.2.0
và snapshot UUID/bytes không đổi. Không tự nhận đây là contract đã Approved.

Mac runtime: bundled Python **3.12.14**, pandas/lxml và IANA tzdata hiện có;
`/Users/hoangvinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
Contract runner dùng stdlib/zoneinfo. Không cài package, gọi AI/crawl hoặc đổi app lockfile.
Clock cases2026-10-10T00:00:00Z, audit2026-10-10T03:00:00Z; không ngày máy.

```sh
python3 -X utf8 scripts/build_field_contracts.py --check
python3 -X utf8 scripts/validate_field_contracts.py --food supabase/seed/templates/food-v1.template.json --core supabase/seed/templates/core-v1.template.json --as-of 2026-10-10T00:00:00Z
python3 -X utf8 scripts/validate_field_contracts.py --cases --report /tmp/gm04-cases.json
python3 -X utf8 -m unittest discover -s tests -p 'test_field_contracts.py'
python3 -X utf8 -m unittest discover -s tests -p 'test_*.py'
python3 -X utf8 data-preparation/scripts/validate_data_preparation.py --report-dir /tmp/gm04-audit
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-04 --gate merge --base-ref origin/main
git diff --check
```

Chọn Python có pandas/lxml cho full regression; thiếu package/skips không tính
là full435 Pass. [Platform guide](../../../../data-preparation/docs/PLATFORMS.md)
chốt POSIX lock/Linux/macOS/WSL; native Windows/WSL thực **Not run**.

## Input → expected → actual và các counterexample

[166 actual case results](review-fix-case-results.json) chứa input edits/template,
validationAt, expected, actual/code/path và assertion từng ca. Expected được viết
độc lập, không sinh từ validator. 20 cases operation kiểm cả null hợp lệ và lỗi
VERSION của8 room mutations;11 cases published venue kiểm toàn nhóm lịch/source.
`simulationOnly=true, fixtureOnlyOverride=false` là bản sao trong RAM để kiểm
publish guard riêng; không export/import/publish. Case fixture-publish-blocked vẫn giữ.

| Kiểm | Input / expected | Actual / assertion | Kết quả |
| --- | --- | --- | --- |
| Join/accept trước membership | expectedVersion=null, không đoán room version | operation-join-room-null-version / operation-accept-room-invite-null-version errors=[] | Pass |
| Room mutation |8 operation required version, null phải VERSION tại idempotency[0].expectedVersion | Toàn bộ8 case negative đúng code/path | Pass |
| Consent/social/device/history | Enum consent và existing RPC mapping, null version ngoài room | update_history_consent và các operation ngoài room valid | Pass |
| Published venue child | Draft/unknown/missing/stale/exact-expiry/second draft row/expired nguồn/quyền unknown | REVIEW hoặc SCHEDULE tại venues[0].scheduleId; lịch/nguồn current hợp lệ errors=[] | Pass |
| Coverage use case |20 use cases → fields/schema/template/examples/case IDs → GM-06/07 và consumer sau | Tất cả pointers resolve, case IDs tồn tại; builder không mất nội dung | Pass |
| Generated integrity | UTF-8/LF, explicit I/O; builder --check | consistent=true, drift=[]; repeat report cùng byte | Pass |
| Portability guards | autocrlf checkout, CSV BOM/CRLF, UTF-8 dưới locale giả cp1252, Windows relative paths, khóa unsupported | Giữ byte JSON/CSV; nested manifest path POSIX; không run không khóa | Pass unit mô phỏng trên Mac, không claim Windows runtime |
| Cases / field examples |166 cases,596 valid +596 invalid field assertions |166/166 Pass,183 field tests OK | Pass Mac |
| Full regression | Tất cả Python tests, không skip |435 tests OK,0 skipped | Pass Mac Python3.12.14 |
| Legacy audit |9 nhóm, metadata/CSV/JSON/source/mapping/fixture replay |9/9 Pass, validStructure=true, readyForPublish=false | Pass structure |
| Legacy preservation |114 file pinned từ revision trước |109 byte-identical,5 runtime portability patches kê riêng; snapshots/config/forms/fixtures/evidence giữ byte | Pass [inventory](review-fix-preservation.json) |
| Repository / index / diff | Metadata/link/index/whitespace |Pass | Tooling, không approval |

Schema runner là vocabulary đóng đã audit, không JSON Schema library tổng quát.
SQL/RLS/API/import/query eligibility, transaction/retry, native/push và verified
menu/source/artwork review: **Not run — task sau**, không dùng fixture thay bằng chứng.
Native Windows/WSL chưa chạy; theo owner không chặn GM-04 khi Mac evidence đủ.

## Reviewer / bàn giao

Đã xử lý bốn nhóm comment; consumer GM-06 nhận DB fields/FK/unique, GM-07 nhận
null/privacy/operation mapping để chốt DTO, task sau nhận artifact/version trong
coverage. Catalogue39 vẫn draft, không tăng quota60–80 hoặc artwork để đóng task.
Còn Trí review revision/contract/AC; không tự tick task Approved/Done hoặc auto-merge.
[HANDOFF](HANDOFF.md), [patch plan](PATCH_TEST_PLAN.md).

Kết quả c6e857e trước sửa vẫn giữ ở [summary cũ](validation-summary.json),
[135 cases cũ](contract-case-results.json), [inventory cũ](legacy-preservation.json);
đó là evidence revision cũ, không thay kết quả166 cases hiện hành.
