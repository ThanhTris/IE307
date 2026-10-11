# GM-08 — Nạp và kiểm chính bundle thật trên DB test

Ngày 2026-10-11. Tested base commit eaa96d7, kèm working-tree patch theo source hashes
trong results.json. Food contract 1.1.0/schema 0.1.0, dataset 0.4.1, PostgreSQL 17.11.
Input là chính bundle draft có thật, fixtureOnly=false, SHA256
0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02; không viết lại
input, thay ngày nguồn, bổ sung lịch/phục vụ/quyền/reviewer hoặc đổi status.

## Kết quả

[44 SQL assertions](results.json): Pass. [Typed readback + query joins](readback.json)
lấy trực tiếp từ DB, gồm tất cả rows/cột map, null counts và query SQL tái lập.
21 venues, 18 dishes, 190 venueDishes, 154 weeklySchedules, 27 dataSources, 18 taxonomy,
1 datasetVersions, 21 scheduleGroups. coverageAreas/publicAnchors/dateExceptions/
availabilityOverrides đều 0 theo input.

- Tái hiện lỗi 23514 trên 0001/0002 vì fieldSources.description; toàn load lỗi rollback.
- Áp 0003 mới, 11 ràng buộc khớp vocabulary contract; sentinel đang có được giữ nguyên.
- Nạp thành công, query và so sánh mọi typed field với input đã normalize bằng PostgreSQL.
- Join đủ 190 offering tới đúng dish/venue; kiểm tên menu/giá/tọa độ/null bằng exact roundtrip.
- Cả 190 service_mode/schedule_id/valid_until/reviewed_by vẫn null; không bịa lịch/hạn/người kiểm.
- Tất cả 450 food/group rows vẫn draft và nonfixture; 0 publish receipts.
- Nạp lần 2 giữ nguyên dữ liệu, counts, keys và version; không trùng.
- ROLLBACK transaction sau successful load: Pass. Rollback sau committed load và retry: Pass.
- Xóa đúng keys đã nạp, giữ sentinel không liên quan và auth baseline; drop đúng DB test vừa tạo.
- Invalid/null/unknown description provenance và dangling source FK vẫn bị reject.
- Bundle, verified manifest và migration 0001 byte-identical với HEAD trước patch.

Schedule group version là storage-derived: GM-06 tăng 1 mỗi inserted weekly interval.
Expected group version là 1 + count(intervals), không đổi version của row trong bundle.

[SQL synthetic regression 31 cases](synthetic-regression.json): Pass sau 0003;
kiểm riêng production publish/receipt/concurrency/drift rollback guards bằng fixture.
Không dùng fixture này thay kết quả44 cases của actual bundle.
[Python full 514 tests](python-regression.txt): Pass / 0 skip (bundled Python 3.13.3 macOS).
[Linux locale C / cp1252: 6 guard tests](linux-encoding.txt) Pass.
CI mới có step actual bundle dưới Linux locale C, chờ push để có kết quả CI revision này.

## Tái lập từ repo root

```sh
npm run backend:start
python3 scripts/gm08_real_bundle_check.py \
  --input supabase/seed/draft/gm08-survey-v0.4.1/bundle.json \
  --report /tmp/gm08-real-bundle-results.json \
  --readback /tmp/gm08-real-bundle-readback.json
python3 scripts/gm08_import_check.py --report /tmp/gm08-synthetic-regression.json
```

Runner chỉ nhận đúng local Supabase project/container/ports và tạo gm08_check_<random>.
Không nhận remote URL hoặc DB có sẵn để ghi; chỉ copy real auth.users DDL, không copy users.
Kết thúc luôn drop đúng DB của runner; không reset project hoặc DB khác.

## Phân biệt nghiệm thu storage và publish

Nạp DB test có thể chạy trước verified review, không cần thu thập thêm cho phép kiểm này.
Runner dùng records/sql_prelude/gm08_put cùng importer nhưng không gọi publish_sql/reviewed,
không tạo approval hoặc receipt publish. Rollback committed test load xóa exact loaded keys
trên baseline trống; production receipt rollback được kiểm trong 31 synthetic cases riêng.
Chưa publish/query verified catalogue cho app; verified counts vẫn 0. Không tự chuyển Done.
