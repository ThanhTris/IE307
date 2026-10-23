# GM-40 — Checks Data/BE và lịch sử offline


## Lượt hiện hành — review follow-up 2026-10-23

Main target0d571b7; patch từ head9e7a45b. macOS26.1, Python3.12.14, PostgreSQL17.11,
PostgREST image sẵn có của Supabase local; không cài package. Không thay schema/API.
Schema/profile1.0.0, dataset1.1.0, runtime schema0.8.0/dish-session-v3/ADR-019.

- [QA results](qa-results.json): runner DB/API thật với bundle draft39 món, migration
  path/hash/definitions, source SHA và expected–actual từng ca; marker cleanup.
- [Current results](current-results.json): regression/offline/repository/index/diff/gate.
  [Patch manifest](PATCH_MANIFEST.json) pin working-tree content; testedHeadBeforePatchCommit
  là HEAD lúc chạy, không giả là commit đã chứa sửa đổi chưa commit.
- [Runtime regression](runtime-regression.json): 108 assertions từ upstream runner,
  synthetic fixtures tách thật, worker/HTTP/ACL/SQL-domain seeded winner/retention;
  không gọi đây là kiểm trên production hoặc Android.
- 39 ID không đổi,18 GM08 shared, mapping216/2/1,247 giá nguyên nguồn. Supplement
 5 nguồn/44 quan sát bổ sung30 món; meal14/23/7/1,9 unknown. Trưa đủ20 không kèm
 filter khác; tối/snack thiếu cho10, các thiếu hụt20 báo đúng trong quality report.
- Importer validate/stage/import/readback projection đúng, no-op/conflict, fault sau
 activation rollback toàn tx, switch/restore giữ locked snapshot/result. HTTP tạo
10/20 trưa và retry giữ pool, thiếu món trả INSUFFICIENT_DISHES; auth/outsider/ACL;
real cards qua round2/finalize/reconnect; legacy fixture IDs/FK/results không đổi.
- App DB chỉ đọc introspection, chưa có0026; runner không migrate/reset app DB,
 không publish draft. JWT ký hợp lệ cho auth.users QA mô phỏng; **không kiểm đăng
 nhập GoTrue/Android**, Expo/FE/Places vẫn Not run. Không tự Approved/Done.

Tái lập:

```sh
python3 scripts/gm40_catalogue_check.py
python3 scripts/dish_policy_sql_check.py
python3 -m unittest discover -s tests -p 'test_dish_catalogue*.py' -v
python3 -m unittest discover -s tests -p 'test_*.py'
python3 data-preparation/scripts/dish_catalogue.py --check
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
python3 scripts/task_readiness.py --task GM-40 --gate merge --base-ref origin/main
git diff --check
```

Runner QA đầu của ca mới đã phát hiện assertion so thứ tự pool giữa hai vòng chưa
đúng contract: runtime sort theo ID ở round2. Sửa assertion so map ID→nội dung,
không sửa runtime hoặc relax tập món. Kết quả cuối trong JSON là lượt chạy lại.
ADR-018 Proposed; supplement đối chiếu dùng storage0026 hiện hữu, thiết kế SQL/API
ban đầu không áp dụng/chưa duyệt. Chỉ Trí quyết định nghiệm thu.

### Kết quả cuối trên patch hiện hành

47/47 real-bundle SQL/JWT HTTP assertions,108 runtime regression assertions;
39 catalogue/importer unit tests trong591 Python regression,169 engine domain tests,
architecture/build/repository/index/diff đạt. Live merge gate READY_FOR_MERGE_REVIEW,
chỉ dependency/artifact, không approval. Chi tiết/hash trong JSON liên kết ở trên.

Mobile typecheck/lint/Jest đã **chạy nhưng Fail_environment**: node_modules local cũ
thiếu expo-location~57.0.21 đã khai báo trên main. Tạm reuse dependency cache checkout
chính bằng symlink ignored; lock cache khác nhánh, không cài package hoặc sửa lock/source
mobile để vượt kiểm. npm ls xác nhận missing dependency; Jest23 suites/638 tests đạt,
3 suites không load được module. Lint1 error +4 upstream warnings; tsc TS2307. Mobile
source/lock của PR không đổi so origin/main. Không tuyên bố clean-install CI/Android
Pass từ lượt cache này; các check chưa đạt vẫn chặn Done tới khi được kiểm môi trường
đúng và Trí nghiệm thu. Symlink tạm được dọn sau kiểm, dependency checkout chính giữ nguyên.

## Lịch sử — các kết quả dưới đây thuộc dataset1.0.0/mốc A

Các dòng SQL/API Not run phía dưới mô tả thời điểm cũ; trạng thái hiện hành xem QA
và kết quả bên trên. Hash/revision lịch sử giữ riêng, không dùng thay bundle1.1.0.

Date: 2026-10-21. Owner Vinh; reviewer Trí. **Chưa Approved/Done**.
Base `afb1dca13b91bef30062aca018e5457908d244bc`, feature branch
`codex/gm-40-dish-catalogue`; không coi base là commit đã chứa patch này.
macOS 26.1 (25B78), Python 3.12.14 bundled runtime cho regression; stdlib, không thêm package hoặc gọi AI.
Contract suite cũng đạt trên system Python 3.9.6; toàn bộ regression cần Python >=3.11 do code upstream dùng tomllib.

## Kết quả mốc A ban đầu — 2026-10-21

| Kiểm | Expected | Actual/status |
| --- | --- | --- |
| Start readiness + origin/main | GM-04/06/07/08 Done live, artifact khớp | Pass: READY_TO_START, Project read lúc 2026-10-21T02:28:13Z, không fallback |
| Frozen inputs/identity | 39 IDs, 18 GM-08 shared, 219 mapping (216/2/1) | Pass: builder và assertions độc lập |
| Giá/nguồn | 247 observations giữ amount/unit/source/snapshot | Pass: đối chiếu từng mục CSV nguồn |
| Offline schema/template/bundle | No venue dependency; null/unknown, typed values/FK/evidence/rights | Pass: 21/21 contract tests |
| Two offline builds | Identical bytes/hash, không network hoặc duplicate | Pass: builder gọi hai lần; --check đối chiếu artifacts |
| Python regression/repository/index/diff | Không regression | Pass: 573/573 Python regression; repository validator, task indexes và diff check đạt |
| SQL import/readback/reimport/rollback | DB test thật, atomic/idempotent | **Not run**: chờ Trí duyệt ADR-018 trước schema/importer |
| HTTP auth/read/preview/DTO | JWT thật, không cần quán | **Not run**: RPC/DTO chưa triển khai, chờ ADR |
| Room snapshot/transition/finalize/ACL | Legacy và catalogue đúng model | **Not run**: migration/adapter chưa triển khai, chờ ADR |
| Mobile tooling/domain/SQL integration | Kiểm đúng source runtime thay đổi | **Not run** ở mốc A: chưa sửa mobile/schema/API |

## Lệnh

```sh
python3 data-preparation/scripts/dish_catalogue.py --check
python3 data-preparation/scripts/dish_catalogue.py --input supabase/seed/catalogue/dishes.json
python3 -m unittest discover -s tests -p test_dish_catalogue.py -v
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/validate_repository.py
python3 scripts/task_readiness.py --check-docs
git diff --check
```

Schema: dish-catalogue-v1 1.0.0; dataset1.0.0/test_demo/draft/fixtureOnly=false.
Bundle/schema/input hashes trong [manifest](../../../../supabase/seed/catalogue/manifest.json).
[UPSTREAM](UPSTREAM.json) pin received commits/hashes. validStructure không phải
approval, current freshness, publish, DB/API hoặc Android pass. Not run của các AC
bắt buộc ở trên vẫn chặn Done; [ADR-018](../../../architecture/decisions/ADR-018-dish-catalogue-profile.md)
Proposed, chưa được Trí duyệt.

## Kết quả kiểm ở mốc A

- Python 3.12.14: `python3 -m unittest discover -s tests -p 'test_*.py'`: **573 tests, OK**.
- Contract GM-40: **21 tests, OK**, gồm dữ liệu thực, fixture mô phỏng và các ca từ chối.
- `--check`: 5 generated artifacts, stale=[]; `--input`: valid=true, errors=[].
- Repository validator: OK; task indexes: match; `git diff --check`: không có output.
- Lượt đầu system Python 3.9.6 không phù hợp toàn bộ upstream (`tomllib`, Path.write_text newline);
  không đổi code upstream để né lỗi, chuyển runtime sẵn có 3.12.14 và chạy lại đạt.
  Một số lỗi link ở lượt đầu do CHECKS/HANDOFF đang được tạo, đã kiểm lại sau khi đủ tài liệu.
- stdout `Cell 1: ERROR` trong regression là expected failure fixture của notebook runner;
  suite vẫn OK, không phải báo notebook nghiên cứu đã được chạy.
- Mọi kết quả kiểm trên nội dung patch; manifest pin source hashes, commit chứa patch được tạo khi chuẩn bị PR.

Runtime dùng để tái lập toàn bộ regression trên máy này:
`/Users/hoangvinh/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3`.
Clone khác dùng Python >=3.11 (khuyến nghị 3.12), stdlib; không bắt đường dẫn máy này.

[Offline results](offline-results.json) ghi kết quả lần cuối; [patch manifest](PATCH_MANIFEST.json) pin hash file working tree đã kiểm.

## Chuẩn bị PR — 2026-10-21

Đã fetch main và kiểm GitHub: `afb1dca13b91bef30062aca018e5457908d244bc`; base khớp, không cần rebase.
Live merge gate đọc Project lúc 07:15:11Z trả READY_FOR_MERGE_REVIEW (chỉ dependency/artifact).
SQL/API AC và ADR approval vẫn pending; không tự merge hoặc đóng issue. Xem [PR preparation](PR_PREPARATION.json).

## Review fix — 2026-10-22

Rebase main `d8245a02c85d5b3bc4888a826589e99c1dc58a6d`, tiếp nhận ADR-019 về
phạm vi consumer; không triển khai luật phòng trong GM-40. Live Project gate lúc
09:20:45Z trả READY_FOR_MERGE_REVIEW; không thay ADR-018 approval hoặc AC mốc B.
[Review fix](REVIEW_FIX.md) và [negative/control cases](review-fix-cases.json) ghi
input–expected–actual: code taxonomy sai type/namespace bị chặn; price natural key
trùng/sai UUIDv5 bị chặn; khác snapshot/menu hợp lệ và nullable vẫn Pass.

Contract suite mới: **31 tests, OK**. Build/check vẫn 5 artifacts stale=[]; không đổi
bundle/schema/manifest dữ liệu, registry hoặc snapshot legacy. Lượt full regression
đầu có 7 lỗi link do chạy trong lúc REVIEW_FIX.md đang được tạo; validator đã đạt
sau khi có đủ file, chạy lại full suite trên patch hoàn chỉnh để xác nhận kết quả cuối.
Báo cáo review-fix-results.json được ghi sau lượt chạy này. SQL/API/Android vẫn Not run.

Kết quả cuối sau nhận main PR131: **583 tests, OK; 31 contract tests, OK**.
Repository/index/diff đạt, build 5 artifacts stale=[]; dữ liệu/schema/manifest giữ byte cũ.
[Review results](review-fix-results.json) pin source/hash/tested target và
[gate mới](readiness-review-fix.txt) đọc Project trên target 0d571b7. Kết quả cũ bên
trên là lịch sử theo revision, không dùng base d8245a0 thay target cuối này.
