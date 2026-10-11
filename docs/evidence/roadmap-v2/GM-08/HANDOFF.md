# GM-08 — Handoff

Cập nhật hiện hành: [fresh pilot0.4.1](../../../../supabase/seed/draft/gm08-survey-v0.4.1/README.md), 21branches/18dishes/190offerings; 508/508 tests macOS, 0 skipped. Candidate vẫn draft, policy/quyền/review Pending; publish/query Not run. Các mục trước phần “Cập nhật dùng lại crawler” bên dưới giữ evidence lịch sử.

Owner HoaiTam/Tâm đã nhận việc ngày2026-10-11 theo user; ThanhTris/Trí review cuối
(Issue#69). In progress, không Approved/Done. Branch codex/gm-08-verified-data-import;
input origin/main7060b8825ad72ee9442d8890719f82451d473c33, PR#62 GM-04/PR#102 GM-06.
Head hiện hành đã commit/push `1021560ce336db84509c1e05f7507937d7cc5a69`,
[PR #103](https://github.com/ThanhTris/IE307/pull/103) Open, không Draft; chưa Approved/merge.
Bản sửa encoding đã lên CI12/12 SUCCESS; follow-up mới chỉ docs/evidence local chưa commit/push.
Tested hashes trong verification.json và SQL local/CI; record thực thi gốc ở
[verification1021560](verification-1021560-original.json). [Evidence baseline đầu](baseline-1d247fe/manifest.json) và
[b59d610](baseline-b59d610/manifest.json) giữ nguyên bytes/kết quả local, ghi rõ CI Fail sau đó.

Contract food-v1/roadmap-v2/GM-08.1; food1.1.0/schema0.1.0. GM-04/06 Done trên
Project#2, gate live đã đạt; Markdown upstream chậm không tự là blocker theo ADR-011.
Các output upstream/mapping/schema/HANDOFF đã có và khớp main. CA máy Python thiếu:
chạy checker với SSL_CERT_FILE=/etc/ssl/cert.pem, giữ verify TLS, không bypass gate.

## Output

| File | Cách dùng / expected | Người nhận |
| --- | --- | --- |
| [Importer](../../../../supabase/seed/import_food_data.py) / [README](../../../../supabase/seed/README.md) | validate/stage offline; trusted-local publish/query/rollback sau review/hash/expiry guards | Trí/GM-18 và BE |
| [Journal0002](../../../../supabase/migrations/0002_food_import_receipts.sql) | Supabase migration up --local sau review; private RLS/revoke, no client policy/RPC/login | Trí/GM-06/17 |
| [Draft adapter](../../../../scripts/gm08_prepare_draft.py) | copy frozen draft thành1.1.0, source SHA/counts/reject audit; không verify | Vinh/Tâm |
| [Manifest](../../../../supabase/seed/verified/manifest.json) | state awaiting verification, actual verified counts0 | GM-18/19 không dùng draft làm seed |
| [Dataset handoff](../../../data/DATASET_HANDOFF.md) | nguồn/coverage/version/giới hạn và trách nhiệm tiếp theo | Data/BE |
| [CHECKS](CHECKS.md) / [SQL actual](sql-results.json) |28 unit/31 SQL assertions sau review fix, synthetic approval/data; real PostgreSQL | Trí tái lập |
| [CI workflow](../../../../.github/workflows/gm08-import.yml) | Linux cp1252 unit + real disposable SQL, artifact gm08-sql-results-linux; run head1021560 Pass;31/31 SQL, source hashes khớp | Trí kiểm độc lập trên đúng commit |
| [PR description](PR_DESCRIPTION.md) | bản mô tả phản ánh PR Open, kết quả local/CI1021560 Pass và dữ liệu còn thiếu | HoaiTam cập nhật sau push |

Reproduce theo CHECKS/README từ clone sạch. Python stdlib, không package/provider
mới. Real SQL runner tạo/xóa DB riêng, giữ unrelated sentinel; không reset DB đang
có dữ liệu, không mount Docker socket vào container khác hoặc remote deploy.

## Rollback / điều kiện tiếp nhận

Rows mới delete và existing rows phục hồi nội dung/version tăng, exact after-state
+latest-active guard/FK; không CASCADE hoặc sửa locked core snapshot. Một receipt
cũ có thể lệch row versions sau rollback bản mới nên query/reimport cũ sẽ bị chặn;
review một version mới để republish. Không âm thầm delete rows/ca thiếu trong input.
Migration0001 frozen;0002 chỉ receipt journal, không thay food wire/schema version.

Dữ liệu thật chưa đủ:39 draft dishes/247 quan sát giá/21 branch names không là
verified venues/offerings/hours/coverage/rights. Artworknull; valid structure không
là nghiệm thu. Tâm chủ động thu thập/chuẩn bị bundle/evidence thật, nhận Vinh hỗ trợ nếu có; người khác
review đúng hash trước publish. AC pilot và query verified thật vẫn Not run.
Không nghiệm thu phần thiếu bằng synthetic suite hoặc CI; chưa được đóng task.

## Sửa review PR #103

Theo [comment của ThanhTris](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6101624086):
reason thiếu quota bắt buộc chuỗi có nội dung, không stringify null/sai kiểu;
CLI cấu hình stdout/stderr UTF-8/LF trước parse/DB; flush output để lỗi output sau DB
được báo trạng thái chưa xác định và kiểm receipt. Regression decode bytes/parse JSON,
success/reject/query tiếng Việt, template null và lỗi output sau simulated commit.
Query encoding test mock riêng DB boundary; 31 ca SQL dùng PostgreSQL thật riêng.
Không có bộ dữ liệu thật mới được bàn giao; verified counts vẫn0, publish/query thật
Not run. Merge riêng phần công cụ cần chủ dự án chấp nhận phạm vi partial delivery;
chưa có quyết định đó, GM-08 vẫn In Progress.

## Sửa CI ASCII locale

CI b59d610 lỗi4 ca encoding và job validate do tên file/probe Unicode trong LC_ALL=C,
khác macOS filesystem UTF-8. Tái lập Linux thật:28 tests/4 errors trước sửa,28/28 Pass
sau sửa dưới filesystem ASCII/stdout cp1252/UTF-8 mode0. Dùng path ASCII và Python
Unicode escape cho probe; tên món và nội dung lỗi JSON vẫn tiếng Việt, không bỏ kiểm.
CLI/import SQL không đổi; workflow giữ LC_ALL=C và in metadata runtime để tái kiểm.
Head1021560 có12 checks SUCCESS; CI failed của b59d610 là lịch sử được giữ nguyên.
[CI checks](ci-1021560-checks.json) và [SQL artifact nguyên bản](ci-1021560-sql-results.json)
kiểm đúng commit/source hashes.

## Follow-up bàn giao dữ liệu

[Comment mới](https://github.com/ThanhTris/IE307/pull/103#issuecomment-6104616256) còn yêu cầu
dataset thật và review độc lập. [Intake guide](../../../data/GM08_DATASET_INTAKE.md) hướng dẫn
field/FK/null/unknown, nguồn/rights/freshness, lịch7 ngày/overnight/lastOrder và coverage.
[Audit hiện tại](data-intake-followup.json) ghi286 blockers, draft hash giữ nguyên,
review Pending, verified counts0; publish/query thật vẫn Not run. Exceptions/overrides
có thể0; không điền reviewer/TTL hoặc tạo dữ liệu để đủ quota.
Local follow-up chưa commit/push, chưa có CI mới và không đổi trạng thái Project.


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
