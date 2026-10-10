# GM-08 — Output checks

2026-10-11 (UTC+7). In progress; tooling đã kiểm, dataset thật còn blocker.
Owner HoaiTam/Tâm, reviewer ThanhTris/Trí; chưa Approved/Done.
Branch codex/gm-08-verified-data-import; main input7060b8825ad72ee9442d8890719f82451d473c33.
Tested working tree chưa commit; exact source hashes tại sql-results.json/verification.json.
ContractGM-08.1, food1.1.0, schema0.1.0; draft dataset0.2.0, verified dataset chưa có.
Runtime macOS/Python3.13.3/Node26; real local Supabase PostgreSQL17 (version trong report).

## Cách chạy lại

```sh
npm ci
npm run backend:start
python3 -m unittest discover -s tests -p 'test_food_import.py'
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
| Preflight/reject | missing/FK/duplicate/nonfinite/stale/fixture/rights/self-review/coverage/unknown hours |20 Python checks, reject report UTF-8/LF; fixture CLI exit1 không DB | Pass tooling, synthetic |
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
Windows/Linux riêng chưa chạy cho GM-08; không copy evidence GM-06 làm evidence task này.

## Blocker / review

Vinh bàn giao khảo sát/nguồn/quyền/ngày kiểm/lịch/dine_in/coverage/registries;
HoaiTam nhập; người khác kiểm dataset, Trí nghiệm thu cuối. Không tự tick AC,
Decision Approved/Done hoặc đổi draft/fixture để đủ quota. Journal0002 và ownership
migration cần review trước merge; chưa commit/push/sync GitHub.
