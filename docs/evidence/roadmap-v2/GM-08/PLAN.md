# GM-08 — Import plan

Cập nhật hiện hành: [fresh pilot0.4.1](../../../../supabase/seed/draft/gm08-survey-v0.4.1/README.md), 21branches/18dishes/190offerings; 508/508 tests macOS, 0 skipped. Candidate vẫn draft, policy/quyền/review Pending; publish/query Not run. Các mục trước phần “Cập nhật dùng lại crawler” bên dưới giữ evidence lịch sử.

2026-10-11 (UTC+7). Owner HoaiTam/Tâm nhận việc theo yêu cầu trực tiếp của user;
reviewer ThanhTris/Trí theo Issue #69. Branch codex/gm-08-verified-data-import.
Scope food-v1/roadmap-v2/GM-08.1; food interchange1.1.0, schema0.1.0.
Input main7060b8825ad72ee9442d8890719f82451d473c33, PR#62 GM-04 và PR#102 GM-06.
Gate live READY_TO_CLAIM; nguồn Project#2, không fallback local/cache.
Python máy thiếu CA; SSL_CERT_FILE=/etc/ssl/cert.pem giữ kiểm TLS đầy đủ.

## Patch và ownership

- Importer stdlib supabase/seed/import_food_data.py: validate/dry-run, immutable
  staging, kiểm review độc lập + hash evidence, atomic local admin publish, query,
  idempotency và rollback có guard. Không remote endpoint/credential/client write.
- Reuse validator GM-04/mapping GM-06, không sửa frozen0001 hoặc legacy snapshots.
- Migration0002 chỉ journal vận hành private để giữ before/after trong cùng TX,
  không thêm field/schema business; RLS/revoke client, không RPC/publisher login.
  Receipt giúp xử lý crash sau commit, rollback không sửa core snapshots/room.
- Manifest verified ghi trạng thái chưa có dataset được nghiệm thu; không chuyển
  catalogue39 draft, fixture hoặc dữ liệu giá delivery thành verified/dine_in.
- Chuẩn bị audit draft/provenance/coverage thiếu, hướng dẫn người nhập và reviewer.

## Test plan

- Missing/duplicate keys, FK, stale/fixture/license/reviewer, reviewed content hash,
  timezone/coverage polygon, giờ quán giao giờ món/overnight/date exception/unknown.
- Real isolated PostgreSQL17: atomic partial failure, idempotent reimport,
  version/content conflict, rollback, external drift/later-version/refs refuse,
  schedule group binding, unrelated sentinel/core untouched, client deny.
- UTF-8/LF file/subprocess, root regression, validator, indexes/diff và merge gate.
- Mọi positive fixture/simulated review chỉ test tooling, không verified evidence.

## Giới hạn dữ liệu thật

GM-04 bàn giao39 món draft,247 giá ở21 chi nhánh; venue/offering/schedule/coverage
arrays rỗng. Menu usage rights/freshness/dine_in/lịch và review độc lập chưa có.
Dataset thật thuộc scope GM-08: Tâm chủ động chuẩn bị/thu thập hoặc nhận handoff
Vinh nếu có; không coi chờ Vinh là điều kiện bắt đầu. Publish/query thật cần source
rights/freshness/coverage/giờ món và review độc lập; không tự Approve/Done hoặc hạ AC.
Draft khảo sát0.3.0 đã chép metadata nguồn từ snapshot gốc thành21 quán/247 offering/
154 lịch chi nhánh; [cách kiểm](../../../../supabase/seed/draft/gm08-survey-v0.3.0/README.md).
Reuse GM-04 contract, không sửa snapshot/GM-06 schema, không crawl/GPT hoặc đoán dữ liệu thiếu.

## Bản sửa review PR #103 — 2026-10-11

Baseline commit `1d247fe387ee9461277eb0141517a298675f6419`; PR Open, không Draft.
Theo comment ThanhTris: strict string reason khi thiếu quota; UTF-8/LF stdout/stderr
trước parse/DB, kiểm bytes JSON dưới cp1252 và lỗi output sau DB; thêm workflow GM-08
unit encoding và real disposable SQL/report. Không sửa frozen0001/contract/dataset thật.
Giữ evidence cũ tại baseline-1d247fe, chạy lại unit/SQL/regression và ghi source hashes.
Bản sửa này chưa commit/push; không tự Approve/Done hoặc chấp nhận merge partial.

## Sửa Linux CI locale — baseline b59d610

Không đổi production importer/schema. Test harness giữ LC_ALL=C, dùng path ASCII
và escape Unicode trong Python -c; nội dung JSON/reject/query vẫn tiếng Việt.
Workflow in Python/filesystem/stdout/UTF8-mode. Tái lập trước/sau trên Linux Docker
filesystem ASCII + cp1252 + UTF8 mode0; chạy lại root regression/SQL/hash/gate.
Giữ evidence b59d610 và link CI Fail, không dùng local macOS Pass thay Linux CI.


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
