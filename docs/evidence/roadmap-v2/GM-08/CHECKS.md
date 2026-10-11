# GM-08 — Output checks

2026-10-11 (UTC+7). In progress; tooling đã kiểm, dataset thật còn blocker.
Owner HoaiTam/Tâm, reviewer ThanhTris/Trí; chưa Approved/Done.
Branch codex/gm-08-verified-data-import; main input7060b8825ad72ee9442d8890719f82451d473c33.
Baseline đã commit/push `1d247fe387ee9461277eb0141517a298675f6419`, [PR #103](https://github.com/ThanhTris/IE307/pull/103) Open, không Draft.
Bản sửa review kiểm trên working tree của baseline đó; chưa commit/push bản sửa.
Exact source hashes tại sql-results.json/verification.json. Evidence gốc được giữ nguyên
ở [baseline manifest](baseline-1d247fe/manifest.json); không thay lịch sử bằng kết quả mới.
ContractGM-08.1, food1.1.0, schema0.1.0; draft dataset0.2.0, verified dataset chưa có.
Runtime macOS/Python3.13.3/Node26; real local Supabase PostgreSQL17 (version trong report).

## Cách chạy lại

```sh
npm ci
npm run backend:start
python3 -m unittest discover -s tests -p 'test_food_import.py'
PYTHONIOENCODING=cp1252 PYTHONUTF8=0 PYTHONCOERCECLOCALE=0 LC_ALL=C python3 -m unittest discover -s tests -p 'test_food_import.py' -v
python3 scripts/gm08_import_check.py --report /tmp/gm08-sql.json
python3 scripts/gm08_prepare_draft.py --output /tmp/new-candidate.json --report /tmp/new-draft-audit.json --as-of 2026-10-11T00:00:00Z
python3 supabase/seed/import_food_data.py stage --input /tmp/new-candidate.json --output /tmp/new-stage --as-of 2026-10-11T00:00:00Z
python3 scripts/validate_repository.py
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/task_readiness.py --check-docs
git diff --check
npm run backend:stop
```

Stage paths phải mới; không overwrite. SQL runner chỉ database tự tạo với tên ngẫu
nhiên, copy auth.users DDL không user rows, tự cleanup. Không reset/đổi data của DB
postgres hiện hữu. Fixture/simulated approval positive chỉ ở tmp và DB disposable.
Lệnh publish thật cần independent review theo [README](../../../../supabase/seed/README.md).

## Kết quả / AC

| Case/AC | Input và expected | Actual/evidence | Kết quả và giới hạn |
| --- | --- | --- | --- |
| Preflight/reject | missing/FK/duplicate/nonfinite/stale/fixture/rights/self-review/coverage/unknown hours |28 Python checks, reject report UTF-8/LF; fixture CLI exit1 không DB | Pass tooling, synthetic |
| Quota reason | thiếu/null/empty/whitespace/boolean/number/list/object reject; chuỗi có nội dung giữ nguyên số thật | 12 invalid subcases; template null không vượt gate; positive counts 1 venue/1 dish | Pass tooling; bundle/review chỉ synthetic |
| CLI encoding | stdout cp1252, UTF-8 mode tắt; success/reject/query/error phải decode UTF-8 + parse JSON | [unit log](unit-results.txt), [cp1252 log](cp1252-unit-results.txt); tên Cơm gà — Việt giữ nguyên, không traceback/CR | Pass mô phỏng locale trên macOS; query boundary mock |
| Lỗi output sau DB | report write/stdout failure không tuyên bố rollback | JSON stderr UTF-8, publicationPerformed=null, yêu cầu kiểm receipt | Pass mô phỏng committed response; SQL riêng kiểm transaction thật |
| Hours/intersection | weekly7 ngày, overnight lastOrder01:30, actual-day closed exception, disjoint/unknown reject | unit intervals: overnight[0,90), closed[]; schedule audit từng offering | Pass tooling; GM-18 vẫn thực thi eligibility |
| Staging/review | immutable bytes/hash, Pending/tamper/mismatch/evidence traversal reject | staged bundle preserved, strict review hash; draft không được promote chỉ bằng JSON approval | Pass tooling; không chứng minh provenance thật |
| Atomic SQL/idempotency | badFK không partial rows; concurrent same bundle một receipt, reimport không tăng version |31 SQL cases tại [actual](sql-results.json) | Pass real SQL/synthetic data |
| Version/rollback | content thiếu version reject, latest rollback restores content/version tăng, drift/later-import/FK reject | source/name/count/state assertions thật, SQL-looking name được lưu literal | Pass real SQL |
| Privacy/client/core | anon/authenticated/publisher không đọc journal; locked room/result/history không đổi | permission42501, core row fingerprints bằng nhau; sentinel/auth data assertions | Pass real SQL/synthetic users |
| Pilot20–30/15–20 có offering | dữ liệu thật và coverage/giờ/source/reviewer độc lập | draft39 món/27 sources/18 taxonomy, venue/offering/schedule/coverage/anchors=0 | Not run: chờ Vinh/Trí bàn giao/xác minh |
| Verified publish/query/manifest | reviewed real bundle, counts/hash/coverage/timezone, query offering thật | verifiedRowCounts=0; [manifest trạng thái](../../../../supabase/seed/verified/manifest.json), [draft audit](draft-audit.json) | Not run; chưa publish dataset thật |

[Staging actual](staging-result.json) ghi draft source hash/counts, không verified.
SQL report ghi synthetic mode, tested hashes, version, từng expected/actual và cleanup.
Regression/repo/gate/backend results chốt ở verification.json và regression.txt.
Windows/Linux riêng chưa chạy bản sửa trên máy tác giả; không copy evidence GM-06 làm evidence task này.

## CI và revision review

Theo [comment review](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6101624086),
workflow [gm08-import.yml](../../../../.github/workflows/gm08-import.yml) chạy unit/encoding
cp1252 trên Linux và 31 case importer trong PostgreSQL disposable, upload artifact
`gm08-sql-results-linux`, cleanup local project luôn chạy. YAML đã parse local.
CI của bản sửa còn Pending vì chưa push; không dùng job SQL GM-06 thay GM-08.
[Workflow runs](https://github.com/ThanhTris/IE307/actions/workflows/gm08-import.yml) sẽ có
run/report sau push; reviewer đối chiếu SHA của commit và artifactHashes.
Baseline [docs CI](https://github.com/ThanhTris/IE307/actions/runs/38073939317) và
[GM-06 CI](https://github.com/ThanhTris/IE307/actions/runs/38073939190) chỉ áp dụng head1d247fe.

## Blocker / review

Vinh bàn giao khảo sát/nguồn/quyền/ngày kiểm/lịch/dine_in/coverage/registries;
HoaiTam nhập; người khác kiểm dataset, Trí nghiệm thu cuối. Không tự tick AC,
Decision Approved/Done hoặc đổi draft/fixture để đủ quota. Journal0002 và ownership
migration cần review trước merge. Bản sửa review chưa commit/push; không tự Approved/Done
hoặc đổi trạng thái Project. Chủ dự án chưa xác nhận merge riêng công cụ là partial delivery.
Mô tả PR cập nhật để copy/apply nằm tại [PR_DESCRIPTION](PR_DESCRIPTION.md).
