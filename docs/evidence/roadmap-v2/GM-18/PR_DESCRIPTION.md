## Task và phạm vi

Task Markdown / owner / reviewer: tasks/backlog/GM-18.md; Tâm (@HoaiTam) / Trí (@ThanhTris).
Mã hiện hành roadmap-v2 GM-18; mã cũ GM-11; issue #79, PR #108.
Assignment accepted: Tâm yêu cầu tiếp tục tích hợp sau GM-17; baseline food-v1.
Spec API_CONTRACT / FOOD_DATA_SPEC; supplement docs/architecture/GM18_DISCOVERY_API.md;
ADR-011/013/014/015. Policy10km/7days do Tâm chọn; chờ Trí review revision.
Branch codex/gm-18-catalogue-eligibility → main, không stacked/PR cha.
Scope: SQL/TS eligibility + ba RPC discovery/preview/result, JWT/member/expiry,
private rate-limit/policy, safe DTO + typed consumer, real bundle/HTTP tests.
Ngoài scope: room/vote/history producers, Android screens/native wiring,
production verified publish; không thêm package/provider/lockfile.

## Start gate — trước viết phần độc lập

- [x] Đã chạy task_readiness GM-18; GM-06/07 Done, input/HANDOFF đúng version (integration/start-gate.txt).
- [ ] Trí review plan/patch revision; không tự ghi approval. Tâm đã giao việc, không thêm package/provider.
- Contract: GM-07.1/GM-18.1/food1.1.0/schema0.2.0; source/fixture hashes trong integration/PATCH_MANIFEST.json. Nullable/unknown giữ đúng contract; errors/status theo supplement.
- Ownership: GM-18 chỉ thêm0005/API-private objects/adapter discovery/tests/evidence; frozen0001–0004/0018 và client GM-07 nguyên trạng. Migration README trở về đúng upstream; phần GM18 ở tài liệu riêng.
- Phần kernel trước đây dùng fixture; hiện HTTP JWT/network/client thật + query bundle thật được kiểm riêng. Không còn chờ GM-17/verified dataset theo ADR014.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Dependency | Task/PR upstream | Project Done / thời điểm checker | Merge/squash commit thực tế | Artifact/version trên target khớp? |
| --- | --- | --- | --- | --- |
| GM-06 | PR102 | Done / 2026-10-13T13:22:49Z | 7060b8825ad72ee9442d8890719f82451d473c33 | Có; migrations/dictionary/HANDOFF |
| GM-07 | PR104 + PR105 | Done / cùng checker | 07117821e41465ead868031516fd89baf9fde8d9 + 9f71bba64b21c2b0795e1a80edbd93cb91a8f0ed | Có; contracts/client/guards GM-07.1 |
| GM-08 | PR103 + ADR014 | Done / cùng checker | 3076c3deb2937223a007b82211a61a2d61b63c84; ADR014 4bb928e | Có; actual0.4.1, manifest0/null accepted test scope |
| GM-17 | PR111 | Done / cùng checker | 4a38588f515c6121a38c605bf50e209d570b90bd | Có; 0004 GM-17.1/schema0.2.0 |

- [x] Target fetched main4a38588; branch đã rebase, HEAD19aacc4 + working-tree patch.
- [x] Checker merge --base-ref origin/main đạt READY_FOR_MERGE_REVIEW; integration/merge-gate.txt.
- [ ] Người merge kiểm upstream merge commits/artifact thật lần cuối cho PR revision mới; không suy từ Done/evidence.
- [x] Diff chỉ GM18, real integration đã chạy lại sau rebase.
- Target SHA/thời điểm/giới hạn: 4a38588f515c6121a38c605bf50e209d570b90bd; checker2026-10-13T13:22:49Z. Checker không tự chứng minh code execution/merge approval.
- Migration mới0005 gọi frozen0018 runtime; authenticated-only fixed-path wrappers, private policy/window. Rollback0005.down không CASCADE, giữ kernel/GM17/food/core; test đã chạy. GM19/20/24/25/27 nhận additive fields, không đổi GM07 scaffold.

## AC và verification

| AC | Result | Evidence / version / environment | Mock hay thật / giới hạn |
| --- | --- | --- | --- |
| Coverage/radius/origin, lịch/exception/DST/overnight/lastOrder/freshness/stock | Pass | integration/sql-results.json; 147 assertions/60 cases; PG17.11 | SQL thật, expected fixture sets độc lập |
| Card/profile/price/unit/null/<=8 unique/soft ranking/determinism | Pass | Complete TS/SQL parity + domain237 tests | Pure/SQL synthetic fixtures |
| Actual bundle query + empty reason/version | Pass | Actual0.4.1/hash/counts/HTTP version0.4.1+OUT_OF_COVERAGE | Dữ liệu thật trong DB test, không publish |
| Auth/member/expiry/private fields/rate/error mapping | Pass | integration/http-results.json; 31 cases; GoTrue/PostgREST + real GM07/18 client | JWT/network/server thật; positive rows synthetic riêng |
| Refetch đúng winner / sold-out empty / no decision writes | Pass | HTTP host/member two venues, hash unchanged; rank-nine kernel case | Persisted synthetic decision, không reroll |
| Upstream access + rollback | Pass | GM17/93 assertions; own API rollback; local deployment match fresh | PG thật; GM17 optional concurrentCleanup skipped |
| Consumer/device coverage handoff | Pass documentation; device Not run | HANDOFF + MOBILE_API_TEST_MATRIX | GM24/25/27 kiểm app→API→UI riêng, không dependency ngược |

- [x] python scripts/validate_repository.py
- [x] python -m unittest discover -s tests -p "test_*.py" — 550/550
- [x] python scripts/task_readiness.py --check-docs
- [x] git diff --check
- Typecheck/lint/unit/architecture: mobile382/382, 4 baseline warnings,0errors; domain237/237. SQL147/60; real HTTP31; GM17/93. Android/a11y/offline UI không thuộc server producer này, không claim Pass.
- Food data: actual SHA0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02; 21quán/18món/190offerings/154lịch/27sources. Draft/null/unknown/manifest0 giữ nguyên. Positive rights/reviewer/published-state chỉ mô phỏng trong disposable DB. Không thêm artwork không có quyền.
- Artifact tested HEAD19aacc4 + patch, hashes trong integration/. CI remote Not run trước push; Trí review Pending. Consumer cases handed off GM19/20/24/25/27, không block ngược.

## Review cuối — Trí

- [ ] Trí kiểm AC, cả hai gate và evidence cho revision hiện tại; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done trên Project và lưu review revision/evidence. Thay code sau review phải review lại.

READY_FOR_MERGE_REVIEW không là quyền tự merge. Checker đọc live Project và
artifact/version, không tự fetch/duyệt. Mock/CI/docs không thay SQL/JWT/data/device thật.

## Artifact bàn giao roadmap-v2

Track BE / implementation; API/SQL/network/client thật, không UI mock.

| Input task | Artifact/version/commit | Có trên target/nhánh? | Smoke |
| --- | --- | --- | --- |
| GM06 | 0001..3/schema0.1.0; PR1027060b882 | Có | Typed load/query/parity |
| GM07 | contracts/client/guards GM07.1; PR104/105 | Có | Real client DTO/error |
| GM08 | actual0.4.1 + importer + manifest0; PR1033076c3d | Có | Actual load/query/empty reasons |
| GM17 | 0004/schema0.2.0; PR1114a38588 | Có | ACL93 + member/auth HTTP |

Output: 0005_discovery_rpc / frozen0018 / TS eligibility / discovery typed adapter /
HTTP+SQL runners / rollback. Versions and expected commands in HANDOFF/CHECKS;
GM19/20 receive immutable snapshot/winner semantics; GM24/25/27 receive API fields/errors/device setup.
HANDOFF.md: docs/evidence/roadmap-v2/GM-18/HANDOFF.md.

- [ ] UI mock nghiệm thu riêng tại task UI; N/A ở server producer, không claim native từ fixture.
- [x] Đầu vào đủ, không tạo lại scaffold/contract hoặc bỏ prerequisite.

## Output chạy được — UI / BE / Data

Theo TASK_OUTPUT_REQUIREMENTS/CHECKLIST. CHECKS.md:
docs/evidence/roadmap-v2/GM-18/CHECKS.md; tested19aacc4+patch/main4a38588,
macOS/Node26/PG17.11/Python3.12.14–3.13.3.

| Endpoint/field | Request/lệnh | Input | Expected + assertion | Actual/evidence | Loại/result |
| --- | --- | --- | --- | --- | --- |
| discovery | node scripts/gm18_http_check.mjs; GM18.http | Guest JWT, area/anchor UUID | Typed arrays/serverTime; filters/FK/unknown | actual empty + synthetic1anchor/1area | HTTP thật / Pass |
| preview | same runner / GM18.http | anchor/radius/ISO/service/meal/prefs/budget | <=8unique, reason/seed/policy/refs; bad bounds400 | Valid pool1/syntheticrefs2, real0/version0.4.1; errors400 | HTTP thật / Pass |
| result offerings | same runner / GM18.http | member/room/result | Same winner venues; outsider403/expiry410/sold-out[] | 2venues, unchanged decision hash | HTTP thật / Pass |
| auth/rate | same runner | missing/forged/expired and concurrent61 | 401,60success+1HTTP429; client RATE_LIMITED | Actual JWT verifier/control/client mapping | HTTP/race thật / Pass |
| rollback/parity | python scripts/gm18_eligibility_check.py --report /tmp/gm18.json | fixture + unchanged actual bundle | TS/SQL complete equality, protected data/ACL/rollback | 147assertions/60cases | SQL thật / Pass |

- [ ] UI Expo/screens N/A ở GM18; Android consumer cases vẫn Not run tại đây.
- [x] API có runner + request examples + body/error/version assertions, không đòi API task sau.
- [x] Ma trận mobile tách server/unit/device; HANDOFF có adb reverse54321 setup/cleanup hoặc trusted HTTPS, không LAN HTTP/TLS bypass; GM24/25/27 kiểm Android riêng.
- [x] Data/schema/FK/unit/null/privacy/version nhận đúng input; actual query thật tách fixture.
- [x] Evidence không chứa JWT/keys/raw ballots/private GPS; Trí review/CI remote vẫn Pending, không tự Done/merge.
