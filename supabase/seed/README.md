# GM-08 — Import dữ liệu local

Importer stdlib Python3.12+, food1.1.0/schema0.1.0, contractGM-08.1.
Owner HoaiTam/Tâm; Trí review code, reviewer dữ liệu khác người nhập.
Không có dữ liệu verified đã publish trong repo này. [Handoff](../../docs/data/DATASET_HANDOFF.md).

Nhận khảo sát theo [hướng dẫn GM-08](../../docs/data/GM08_DATASET_INTAKE.md):
required key khác nullable value; giữ unknown/null đúng schema ở draft, nhận nguồn/
quyền/freshness/giờ/coverage thật trước review/publish.

## Offline: validate → stage → người khác review

```sh
python3 supabase/seed/import_food_data.py validate --input /path/food.json --report /tmp/preflight.json
python3 supabase/seed/import_food_data.py stage --input /path/food.json --output /path/new-stage
```

Input là JSON envelope GM-04 food1.1.0; duplicate keys/NaN/extra fields/FK đều
reject. `--as-of <UTC Z>` chỉ cho validate/stage tái lập; publish dùng clock thật.
`validate` là dry-run, không gọi DB/network và không đổi trạng thái. Fixture luôn
reject qua CLI. Draft hợp lệ có thể staging; không thể publish nếu chưa verified.

Stage mới giữ `bundle.json`, SHA256, row counts, schema/dataset versions, coverage,
timezones, preflight và `review-template.json` có Decision Pending. Không overwrite.
Sau sửa bundle/row reviewer/status/version phải tạo stage mới và review lại hash.

Người kiểm độc lập tự kiểm từng nguồn/quyền dùng, ngày/hạn, địa chỉ/tọa độ/coverage,
giờ quán∩giờ món, exceptions/overnight/last order, price units, image rights và
không GPS cá nhân. Row.reviewedBy phải khớp reviewer khác enteredBy (trim/casefold).
Input được nghiệm thu ghi verified; importer chỉ promote verified→published.
Không có lệnh tự approve. Reviewer lưu review JSON theo template và biên bản thật
với mỗi `{path,sha256}` trong `evidence`, đường dẫn tương đối dưới thư mục review.
Các checks phải true; reviewedAt UTC Z sau stage, không tương lai. `bundleSha256`
phải đúng staged bytes. Thiếu quota phải ghi `coverageShortfallAccepted=true` và
`coverageShortfallReason` phải là chuỗi có nội dung sau khi bỏ khoảng trắng;
thiếu/null/boolean/number/list/object đều bị từ chối. Số thực giữ nguyên. Đây là hồ sơ của workflow admin
trusted, không là chữ ký mật mã hoặc quyền auth của client.

## Local publish / query / rollback

Sau review migration0002/code, dùng Node22.13+ và Docker local qua tooling GM-03:

```sh
npm ci
npm run backend:start
./node_modules/.bin/supabase migration up --local
python3 supabase/seed/import_food_data.py publish --stage /path/stage --review /path/review.json --confirm-local --report /tmp/import.json
python3 supabase/seed/import_food_data.py query --bundle-sha256 <64-hex> --report /tmp/query.json
python3 supabase/seed/import_food_data.py rollback --bundle-sha256 <64-hex> --confirm-local --report /tmp/rollback.json
npm run backend:stop
```

Không reset DB để import. Runner chỉ đúng container/project/ports PostgreSQL17 của
repo, Docker unix/npipe local; không URL/remote DB/token/service key, không client
role hoặc migration tự sinh từ input. Postgres admin do Docker exec; không grant
login vào gm06_publisher. Migration0002 giữ journal private/RLS/revoke anon,
authenticated,gm06_publisher; không thay frozen0001/business contract0.1.0.

Publish atomic: khóa importer và 12 food/group tables trong TX; merge exact typed
rows, tạo schedule groups, flush constraints, kiểm freshness trước commit, lưu
before/after cùng receipt. Giữ TX ngắn. Retry cả TX tối đa3 lần khi40001/40P01.
Nạp lại hash+review giống nhau chỉ thành công khi rows vẫn khớp receipt. Cùng
version khác hash/content reject; row đổi phải tăng version. Source/dataset/report
hash độc lập. dataset_versions.checksum là **exact reviewed INPUT bytes**, không
hash tự tham chiếu của representation đã bổ sung metadata publish.

Bundle là tập upsert tự đủ references; không tự delete row vắng mặt hoặc đoán ca
nghỉ. Mỗi nhóm lịch verified có explicit7 ngày (unknown chặn publish); nhiều ca
mỗi ngày được phép. Thay tập ca phải bàn giao ID/schedule mới hoặc rollback bản
cũ khi không còn refs; importer không âm thầm xóa ca hoặc remap stable ID.

Rollback chỉ receipt mới nhất còn active, exact after-state; external drift,
version mới hơn, room/pool/FK còn dùng row đều chặn toàn bộ. Row mới được xóa;
row tồn tại trước đó phục hồi nội dung với version tăng (không quay ngược version).
Không sửa room/result/history đã khóa, không CASCADE. Receipt/history retained.
Không tự activate một receipt cũ: version tăng khi phục hồi có thể khiến receipt
cũ không còn khớp; cần một version mới đã review để publish lại. Query chặn drift
và hết hạn; query chỉ admin kiểm join của receipt, không endpoint/eligibility/live
stock cho app. Override hết hạn giữ trạng thái lịch sử và báo trong preflight,
không tuyên bố hiện còn/hết món.

CLI JSON stdout/stderr và `--report` ghi UTF-8/LF cho success và reject
(code/path/index; array index0), kể cả locale cp1252 với UTF-8 mode tắt.
DB lỗi chỉ SQLSTATE/GM08 code, không in SQL/payload/credential. Mất process sau
commit thì receipt trong DB là authority để query/retry; lỗi ghi report không có
nghĩa transaction đã rollback. Không gọi schema down để rollback dataset.

## Draft khảo sát GM-08

[Dataset Thủ Đức cũ0.3.0](draft/gm08-survey-v0.3.0/README.md) chép quan sát thật từ
menuOfferings snapshot gốc:21 chi nhánh/247 mục menu/154 lịch chi nhánh draft.
Giữ tọa độ/giờ/giá/ngày nguồn, UUID món; không suy giờ món/service/dine_in/coverage,
TTL hoặc quyền dùng. Tâm chịu trách nhiệm phần dữ liệu trong GM-08, nhận Vinh hỗ trợ nếu có.

```sh
python3 scripts/gm08_prepare_survey.py --output-dir /tmp/gm08-survey-new
python3 supabase/seed/import_food_data.py stage --input /tmp/gm08-survey-new/bundle.json --output /tmp/gm08-survey-stage-new
python3 -m unittest discover -s tests -p 'test_gm08_survey.py' -v
```

Stage vẫn Pending. Review metadata lịch nền tảng khác giờ phục vụ thật tại quán;
thiếu1 ngày nguồn giữ unknown, lastOrder null,23:59 không suy thành24h.
Chọn/review pilot15–20 món trước publish hoặc reviewer chấp nhận số thực/lý do;
bản draft giữ đủ39 món/quan sát, không chọn theo quota bằng dữ liệu giả.

## Draft GM-04 và test

```sh
python3 scripts/gm08_prepare_draft.py --output /tmp/new-candidate.json --report /tmp/draft-audit.json
python3 supabase/seed/import_food_data.py stage --input /tmp/new-candidate.json --output /tmp/new-draft-stage
python3 -m unittest discover -s tests -p 'test_food_import.py'
python3 scripts/gm08_import_check.py --report /tmp/gm08-sql.json
```

Draft adapter copy39 món,27 sources,18 taxonomy và1 dataset từ snapshot, không
sửa legacy bytes/IDs hoặc bịa venue/coverage/giờ. Giá247/21 chi nhánh là quan sát
menu delivery, không verified/dine_in. Không dùng draft hoặc test JSON review như
approval thật. SQL runner chỉ DB `gm08_check_<random>` tự tạo/xóa; real auth.users
DDL không user rows. Positive SQL data/review đều synthetic; không verified seed.

Workflow `.github/workflows/gm08-import.yml` chạy unit/encoding với stdout cp1252,
UTF-8 mode tắt và SQL importer trên PostgreSQL disposable ở Linux. Artifact
`gm08-sql-results-linux` chứa assertions/hash/cleanup; kiểm run của đúng commit
trước nghiệm thu. CI tooling xanh không thay dataset thật/review độc lập.

Encoding tests giữ filesystem ASCII (`LC_ALL=C`) và dùng path/argv probe ASCII;
tiếng Việt được giữ trong UTF-8 JSON hoặc Python Unicode escape. Điều này tránh
lỗi trong subprocess launcher trước khi CLI chạy, vẫn kiểm output JSON tiếng Việt.


### Fresh survey candidate0.4.1

[Hồ sơ review](draft/gm08-survey-v0.4.1/README.md) dùng crawler hiện có với capture
riêng;21branches/18dishes/190offerings/154venue schedule rows, quota đạt. Validate
và stage hợp lệ; tất cả draft, source rights/freshness policy và review Pending.
Không publish candidate này. Manifest verified counts vẫn0, actual offering query
Not run. Bản0.3.0/catalogue0.2.0 là lịch sử; policy đề xuất không tự tạo validUntil.


## Kiểm bundle thật draft trên DB test — không publish

Có thể nạp bundle0.4.1 nguyên trạng để kiểm storage trước khi xác minh publish.
Runner giữ null/unknown/draft/fixtureOnly=false, không tạo reviewer hoặc receipt
publish. Nó tạo DB gm08_check_<random> trên đúng Supabase local PostgreSQL17,
copy auth.users DDL thật, áp0001/0002/0003, nạp/query/reimport/rollback rồi drop
đúng DB đó. Input bundle và verified manifest giữ nguyên.

```sh
npm run backend:start
python3 scripts/gm08_real_bundle_check.py \
  --input supabase/seed/draft/gm08-survey-v0.4.1/bundle.json \
  --report /tmp/gm08-real-bundle-results.json \
  --readback /tmp/gm08-real-bundle-readback.json
```

Expected: result=Pass, publicationPerformed=false, counts21venues/18dishes/
190venueDishes/154weeklySchedules/27dataSources/18taxonomy/1datasetVersions và
21scheduleGroups. readback giữ tất cả typed rows, null counts, query joins thực.
Nạp lại không đổi rows/counts/versions; rollback giữ sentinel và auth baseline.
Schedule group version là storage-derived: GM-06 tăng mỗi lần chèn interval;
không thay version input của154weekly rows.

Migration0003 sửa closed provenance vocabulary cho khớp fieldSources.description
trong GM-04, không bỏ additionalProperties/UUID/FK checks hoặc mở quyền client.
[Evidence](../../docs/evidence/roadmap-v2/GM-08/real-db/README.md).


## GM-40 dataset1.1.0 / owned QA

39 món giữ ID; supplement `data-preparation/config/meal_slot_evidence_v1.json` bổ sung
meal evidence có version/URL/checksum, không sửa snapshots. Builder mặc định offline.
Importer `supabase/seed/import_dish_catalogue.py` validate/stage/import/readback dùng
storage0026 đã có, chỉ DB QA có ownership marker; không production publish hoặc đổi API.
Chạy `python3 scripts/gm40_catalogue_check.py` từ root để tạo/kiểm/dọn QA DB+REST riêng.
Xem [GM-40 HANDOFF](../../docs/evidence/roadmap-v2/GM-40/HANDOFF.md) cho contract, nguồn, thiếu nhãn, lệnh và restore.
