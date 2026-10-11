# GM-08 — Output checks

Cập nhật hiện hành: [DB test với bundle thật 0.4.1](real-db/README.md) đã Pass 44 cases; SQL hồi quy 31 cases và Python 514 tests Pass / 0 skip. Nạp/query/reimport/rollback giữ draft/null/unknown; verified publish chưa chạy. Các mục bên dưới là evidence lịch sử của từng revision.

2026-10-11 (UTC+7). In progress; tooling đã kiểm, dataset thật còn blocker.
Owner HoaiTam/Tâm, reviewer ThanhTris/Trí; chưa Approved/Done.
Branch codex/gm-08-verified-data-import; main input7060b8825ad72ee9442d8890719f82451d473c33.
Head hiện hành đã commit/push `1021560ce336db84509c1e05f7507937d7cc5a69`, [PR #103](https://github.com/ThanhTris/IE307/pull/103) Open, không Draft.
Bản sửa encoding đã lên CI:12/12 checks SUCCESS. Follow-up mới chỉ docs/evidence local;
chưa commit/push. Giữ record thực thi gốc tại [verification1021560](verification-1021560-original.json).
Exact source hashes tại sql-results.json/verification.json. Evidence gốc được giữ nguyên
ở [baseline đầu](baseline-1d247fe/manifest.json) và [baseline b59d610](baseline-b59d610/manifest.json);
không thay lịch sử bằng kết quả mới. CI b59d610 thực tế Fail dù các kiểm local macOS đã Pass.
ContractGM-08.1, food1.1.0, schema0.1.0; draft dataset0.2.0, verified dataset chưa có.
Runtime macOS/Python3.13.3/Node26; real local Supabase PostgreSQL17 (version trong report).
Unit encoding còn kiểm Linux aarch64/Python3.13.3 bằng image python:3.13.3-slim,
filesystem ASCII/stdout cp1252/UTF-8 mode0, không network, repo mount chỉ đọc.

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
| CLI encoding | filesystem ASCII/stdout cp1252, UTF-8 mode tắt; success/reject/query/error phải decode UTF-8 + parse JSON | [macOS unit](unit-results.txt), [Linux cp1252](cp1252-unit-results.txt); tên Cơm gà — Việt giữ nguyên, không traceback/CR | Pass trên Linux thật qua Docker; query boundary mock |
| Linux test harness | path/probe truyền qua argv phải ASCII; nội dung dữ liệu/reject vẫn tiếng Việt | [trước sửa](baseline-b59d610/linux-ascii-before.txt):28 tests/4 errors; sau sửa:28/28 Pass, không đổi LC_ALL=C để né lỗi | Pass; không thay contract UTF-8 của CLI |
| Linux validate parent | parent locale mặc định UTF-8, subprocess LC_ALL=C như job validate | [actual](linux-default-unit-results.txt):28/28 Pass | Pass Linux; full regression494 được kiểm trên macOS |
| Lỗi output sau DB | report write/stdout failure không tuyên bố rollback | JSON stderr UTF-8, publicationPerformed=null, yêu cầu kiểm receipt | Pass mô phỏng committed response; SQL riêng kiểm transaction thật |
| Hours/intersection | weekly7 ngày, overnight lastOrder01:30, actual-day closed exception, disjoint/unknown reject | unit intervals: overnight[0,90), closed[]; schedule audit từng offering | Pass tooling; GM-18 vẫn thực thi eligibility |
| Staging/review | immutable bytes/hash, Pending/tamper/mismatch/evidence traversal reject | staged bundle preserved, strict review hash; draft không được promote chỉ bằng JSON approval | Pass tooling; không chứng minh provenance thật |
| Atomic SQL/idempotency | badFK không partial rows; concurrent same bundle một receipt, reimport không tăng version |31 SQL cases tại [actual](sql-results.json) | Pass real SQL/synthetic data |
| Version/rollback | content thiếu version reject, latest rollback restores content/version tăng, drift/later-import/FK reject | source/name/count/state assertions thật, SQL-looking name được lưu literal | Pass real SQL |
| Privacy/client/core | anon/authenticated/publisher không đọc journal; locked room/result/history không đổi | permission42501, core row fingerprints bằng nhau; sentinel/auth data assertions | Pass real SQL/synthetic users |
| Pilot20–30/15–20 có offering | dữ liệu thật và coverage/giờ/source/reviewer độc lập | survey draft0.3.0:21 venues/247 offerings/154 lịch chi nhánh,39 món; coverage/anchors=0 | Not run verified: Tâm bổ sung khảo sát/rights/freshness/giờ món và review độc lập |
| Verified publish/query/manifest | reviewed real bundle, counts/hash/coverage/timezone, query offering thật | verifiedRowCounts=0; [manifest trạng thái](../../../../supabase/seed/verified/manifest.json), [draft audit](draft-audit.json) | Not run; chưa publish dataset thật |

[Staging actual](staging-result.json) ghi draft source hash/counts, không verified.
SQL report ghi synthetic mode, tested hashes, version, từng expected/actual và cleanup.
Lượt SQL đầu chồng thời điểm Supabase startup/resource load gặp55P03 lock timeout;
database riêng đã cleanup. Sau backend:start hoàn tất và services healthy,31/31 đạt
với hashes hiện hành. Không đổi timeout/production code để bỏ qua lỗi.
Regression/repo/gate/backend results chốt ở verification.json và regression.txt.
Metadata/digest/giới hạn của Linux tại [linux-runtime](linux-runtime.json).
Windows chưa chạy bản sửa. Linux unit đã chạy qua Docker; không copy evidence GM-06 làm evidence task này.

## CI và revision review

Theo [comment review](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6101624086),
workflow [gm08-import.yml](../../../../.github/workflows/gm08-import.yml) chạy unit/encoding
cp1252 trên Linux và 31 case importer trong PostgreSQL disposable, upload artifact
`gm08-sql-results-linux`, cleanup local project luôn chạy. YAML đã parse local.
CI của bản sửa ASCII tại head1021560 đã Pass; không dùng job SQL GM-06 thay GM-08.
[Encoding CI b59d610](https://github.com/ThanhTris/IE307/actions/runs/38102929443/job/114362427281)
Fail:28 tests/4 errors; [validate CI b59d610](https://github.com/ThanhTris/IE307/actions/runs/38102929498/job/114362427294)
Fail:494 tests/3 failures/1 error/6 skipped. Nguyên nhân path/Unicode -c trong ASCII locale,
CLI chưa được chạy hoặc argv bị surrogateescape. Test dùng path ASCII và Unicode escape trong probe;
vẫn kiểm tiếng Việt JSON, publicationPerformed và recovery, không hạ assertions.
SQL GM-08 tại b59d610 [đã Pass](https://github.com/ThanhTris/IE307/actions/runs/38102929443/job/114362427310).
Head1021560: [encoding](https://github.com/ThanhTris/IE307/actions/runs/38104154725/job/114365984579),
[validate](https://github.com/ThanhTris/IE307/actions/runs/38104154702/job/114365984319),
[GM-08 SQL](https://github.com/ThanhTris/IE307/actions/runs/38104154725/job/114365984453) đều SUCCESS.
[Toàn bộ12 checks](ci-1021560-checks.json); [SQL artifact tải nguyên bản](ci-1021560-sql-results.json)
ghi31/31 Pass, source hashes khớp current source và database tự tạo đã cleanup.
Bản docs/evidence follow-up local chưa có CI; không gán CI1021560 cho commit tương lai.
Baseline [docs CI](https://github.com/ThanhTris/IE307/actions/runs/38073939317) và
[GM-06 CI](https://github.com/ThanhTris/IE307/actions/runs/38073939190) chỉ áp dụng head1d247fe.

## Follow-up comment mới: dữ liệu và null

[Review mới](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6104616256) xác nhận
code/encoding đã sửa,12 checks xanh. [Intake guide](../../../data/GM08_DATASET_INTAKE.md)
liệt kê đầu vào thiếu và cách nhập null/unknown theo contract1.1.0.
[Audit catalogue0.2.0 trước bổ sung khảo sát](data-intake-followup.json): candidate hash không đổi,39 draft dishes,
247 quan sát giá/21 chi nhánh; chưa có venue/offering/schedule/coverage/anchor.
286 publish blockers, review-template Pending; không đổi verified manifest hoặc TTL/reviewer.
[Contract cases](field-contract-case-results.json):166/166 Pass, fixtureOnly=true,
publicationPerformed=false; không nghiệm thu dữ liệu thật.
Follow-up docs/evidence: [regression](data-intake-regression.txt)494 tests:489 Pass/5 Skipped/0 Fail;
[validator](data-intake-repository-check.txt) và [docs freshness](data-intake-docs-freshness.txt) Pass.
[Start gate live](data-intake-start-gate.txt) IN_PROGRESS, checked2026-10-11T02:41:20UTC,
không cache/local fallback; không có merge hay đổi task/Project.

## Blocker / review

HoaiTam chịu trách nhiệm khảo sát/nguồn/quyền/ngày kiểm/lịch/dine_in/coverage/registries
và nhập GM-08; có thể nhận khảo sát Vinh nếu có. Người khác kiểm dataset, Trí nghiệm thu cuối. Không tự tick AC,
Decision Approved/Done hoặc đổi draft/fixture để đủ quota. Journal0002 và ownership
migration cần review trước merge. Follow-up docs/evidence chưa commit/push; không tự Approved/Done
hoặc đổi trạng thái Project. Chủ dự án chưa xác nhận merge riêng công cụ là partial delivery.
Mô tả PR cập nhật để copy/apply nằm tại [PR_DESCRIPTION](PR_DESCRIPTION.md).


## Chuẩn bị pilot theo phạm vi user chọn

User giữ phạm vi Thủ Đức cũ ngày2026-10-11. Phần dữ liệu thuộc GM-08 của Tâm,
không yêu cầu Vinh bàn giao trước mới làm được. Metadata tọa độ/lịch nền tảng đã
có trong menuOfferings snapshot gốc; trước đây chưa được adapter đưa vào food1.1.0.
[Draft0.3.0](../../../../supabase/seed/draft/gm08-survey-v0.3.0/README.md) có21 venues,
247 venueDishes và154 weeklySchedules draft,39 dishes; nguồn/giá/checksum/ngày giữ nguyên.
[Audit](../../../../supabase/seed/draft/gm08-survey-v0.3.0/audit.json) ghi2084 publish blockers,
1 unknown weekday,247 offering schedules chưa biết,coverage/anchor0; không verified/published.
[Survey adapter](../../../../scripts/gm08_prepare_survey.py) chỉ offline, không DB/network;
[7 regression cases](survey-unit-results.txt) kiểm lossless nguồn/giá/ID, không suy
service/giờ món/24h, thiếu ngày unknown, reject forged approval và snapshot giữ nguyên.
[Staging actual](survey-staging-result.json) là draft Pending, không approval/publish;
[review template](survey-review-template.json) reviewer/reviewedAt null.
CI12 xanh chỉ head1021560; helper/tests/dataset mới chưa commit/push/chạy CI.


Kết quả follow-up khảo sát: [regression](survey-regression.txt)501 tests,
496 Pass/5 Skipped/0 Fail; [7 Linux ASCII/cp1252 cases](survey-linux-unit-results.txt) Pass,
container chỉ đọc/tắt mạng/tự xóa, không DB. [Validator](survey-repository-check.txt),
[docs freshness](survey-docs-freshness.txt), YAML/diff/hash checks Pass.
Manifest trạng thái trỏ draft0.3.0, giữ catalogue0.2.0 ở catalogueDraft;
verified counts/datasetVersion/bundleSha256 vẫn0/null/null. Importer/migrations không đổi;
không rerun SQL để coi draft này đã publish. Runtime/source/artifact hashes trong verification.json.


## Cập nhật dùng lại crawler — 2026-10-11

User giữ phạm vi Thủ Đức cũ, yêu cầu dùng lại crawler và xác nhận chưa có quyền
nguồn/freshness policy được chốt; chuẩn bị hồ sơ để review. [fresh pilot0.4.1](../../../../supabase/seed/draft/gm08-survey-v0.4.1/README.md) là bản mới nhất.
27 public HTML nguồn được lấy mới,23 có menu,4 ShopeeFood cần render;694 raw/252
candidate/253 needs_review/189 excluded. Cả247 mục cũ khớp lại tên/chi nhánh/giá.
Pilot chọn18 UUID món cũ,190 offering,21 branches và154 venue schedule rows; quota
đạt. Dữ kiện này đều draft, không phải nghiệm thu physical venue hoặc giờ từng món.

Runner có --output-dir mới, không overwrite captures/snapshot cũ. Adapter kiểm
CSV/hash HTML/nguồn/ngày lấy, giữ item đổi tên/ID/mapping chưa rõ để review. Không
tự kéo ngày cào sang classification biên tập hoặc gán validUntil/license/reviewer.
Raw cache lưu riêng Git-ignored data-preparation/datasets/gm08-capture-20261011/.

Validate/stage fresh pilot: Pass; Pending review bị reject trước DB: Pass.
Hồ sơ source rights/freshness Proposed/Pending và worksheet21venues/190offerings/
18classifications/27source rights đã chuẩn bị, không gửi yêu cầu xác nhận ra ngoài.
Giờ Jollibee Võ Văn Ngân nguồn official khác platform, ghi conflict để kiểm.

Dataset verified/publish/query: Not run. Offering hours/serviceMode, physical
venue hours/admin IDs, coverage/anchors, quyền nguồn, policy và review độc lập
vẫn cần bằng chứng thật. Manifest verified counts0, GM-08 In Progress, reviewer
ThanhTris chưa Approved; không ghi Done/merge toàn bộ task từ CI hoặc quota.
Evidence mới: fresh-crawl.txt, fresh-start-gate.txt, fresh-staging-result.json,
fresh-review-template.json, fresh-publish-guard.json, fresh-regression.txt và
verification.json. Các phần0.3.0/501tests phía trên là lịch sử, không thay kiểm
revision mới. Không commit/push.


## Bước khảo sát/xác minh tiếp theo —2026-10-11

User yêu cầu lệnh commit và tiếp tục GM-08; xác nhận chưa có ghi nhận tại quán,
chọn tiếp tục đối chiếu nguồn công khai và chuẩn bị phiếu từng quán.
[21phiếu chi nhánh/190offering](completion-survey/README.md) gắn đúng staged hash
0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02.
Có lịch7ngày platform để đối chiếu, các cột physical hours/serviceMode/giờ món/
quyền nguồn/ngày kiểm/expiry/reviewer chưa điền. Đây là phiếu khảo sát, không
phải verified bundle. [Coverage worksheet](completion-survey/COVERAGE.md) Pending.

completion-public-comparison.json ghi6chênh lệch khoảng giờ từ nguồn công khai
và1nguồn đối chiếu địa chỉ Texas; search cache không thay survey hiện tại,
không áp giờ hoặc nhãn tiện ích vào bundle. OSMrelation7138136 thực tế là phường
hiện tại/lịch sử Bình Thọ, loại khỏi candidate ranh giới quận Thủ Đức cũ.
Không sinh polygon/anchor/stock/rights/review giả để đóng AC.

Script gm08_prepare_survey_packet.py chạy offline, kiểm candidate hash/FK/draft,
không overwrite phiếu; record190offering thuộc đúng21venue được kiểm thực tế.
Negative checks wrong-hash/unknown-venue/no-overwrite Pass trong
completion-packet-check.json. Candidate0.4.1/verified manifest không thay đổi.
Không commit/push trong lượt này. Source rights/policy và independent survey/review
still Pending; actual verified publish/query Not run.

Evidence tổng hợp của bước chuẩn bị: [completion-survey-preparation.json](completion-survey-preparation.json).
Full regression macOS: 508/508 Pass, 0 skip; CLI tạo phiếu thực tế trên Linux
C/cp1252: Pass. Native Windows chưa chạy. Đây là kiểm công cụ/hồ sơ,
không thay nghiệm thu dataset thật hoặc quyết định của reviewer độc lập.

## Thu thập bổ sung từ internet — 2026-10-11

[Hồ sơ nguồn theo 21 quán](public-intake/README.md) có190offering, dùng lại
cache beFood thật lấy hôm nay, thêm7Foody HTML trực tiếp và bảng chi nhánh
Jollibee official. Lịch platform/ngày nguồn/hash HTML và nhóm menu nằm trong JSON
đúngvenueId/offeringId; giữ riêng các confirmed fields chưa có bằng chứng.
Cơm Tấm49 có15 mục pilot trong nhóm ghi05:30–19:00 nhưng bao gồm cả món không
phải cơm, chưa rõ ngày trong tuần; không tự tạo lịch15món. Ánh Linh: HTTP Foody
hiện ghi Quán tạm nghỉ, không dùng giờ09:00–22:00 từ search cache làm giờ hiện tại.
Phở Lý Quốc Sư: listing00:01–23:59 không coi là24h. Jollibee255VõVănNgân:
official09:00–22:00 khác giờ platform08:30–22:00, giữ cả hai để review.
Trang điều khoản beFood hiện hành tải dynamic; thông báo2026 đã tìm thấy nhưng
chưa có quyền dùng nguồn cấp cho project. Nguồn Nem Hùng Việt Dĩ An không đủ xác
nhận118HoàngDiệu2; lỗiTLS/HTTP403 giữ đúng trong capture-manifest, không bỏTLS.
Không áp dữ kiện này vào bundle0.4.1/verified manifest hoặc điền approval thay
người review. GM-08 In Progress, actual verified publish/query Not run.

Kiểm tra bổ sung: [public-intake/validation.json](public-intake/validation.json),
508tests Pass/0skip; repo/docs/diff và21venue/190offering integrity Pass.
Chỉ nghiệm thu thu thập hồ sơ; dataset verified/publish/query vẫn Not run.

## Nghiệm thu bổ sung DB test với bundle thật —2026-10-11

Theo yêu cầu hiện hành, nạp chính bundle0.4.1 vào DB test trước xác minh publish.
[Handoff thực thi](real-db/README.md), [results 44 cases](real-db/results.json) và
[query/readback](real-db/readback.json) Pass: counts/typed fields/quán–món/giá/tọa
độ/null, reimport giữ nguyên, transaction rollback và committed-load rollback.
Migration0003 sửa11closed provenance constraints để nhận description đúng GM-04;
không sửa0001, không mở unknown keys/invalid UUID/dangling source FK. Giữ toàn bộ
450food/group rows draft/nonfixture,0publish receipts; verified manifest không đổi.
SQL production regression 31 cases và Python 514 tests đều Pass. Task vẫn In Progress,
review/merge decision chưa tự ghi Approved/Done; verified app publish chưa chạy.
