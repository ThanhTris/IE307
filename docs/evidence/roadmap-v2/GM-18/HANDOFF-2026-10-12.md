# GM-18 — Bàn giao phần độc lập

Owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris), review Pending.
Nhánh `codex/gm-18-catalogue-eligibility`, base `9188c736def7e125266f8cce2314b9f1f5c31b81`
và working-tree patch; source hashes trong sql-results.json/PATCH_MANIFEST.json.
Contract `food-v1/roadmap-v2/GM-18.1`, eligibility `gm18-eligibility-1.0.0`, food 1.1.0,
schema 0.1.0. Start gate live đạt; không tự Done/Approved, commit/push hoặc deploy.

Đã kiểm: 139 SQL assertions / 60 cases, 68 eligibility tests (237 domain regression),
288 mobile và 544 Python tests Pass. Chi tiết và limits tại CHECKS.md.

## Artifact và chạy lại

- [TypeScript kernel](../../../../mobile/src/domain/eligibility/index.ts) / [README](../../../../mobile/src/domain/eligibility/README.md):
  evaluateEligibility và refetchWinner; không network/React/native SDK.
- [Migration 0018](../../../../supabase/migrations/0018_food_eligibility.sql):
  private invoker evaluate/snapshot/preview/discovery/refetch_winner cùng helper.
  Không sửa 0001–0003, grants/RLS hoặc tạo public RPC/security-definer bypass.
- [SQL assertions](../../../../supabase/tests/food_eligibility.sql),
  [runner](../../../../scripts/gm18_eligibility_check.py) và [domain tests](../../../../mobile/tests/eligibility.test.mjs):
  expected offering sets độc lập từ fixture gốc, complete TS/SQL output parity,
  typed DB snapshot/query và bundle draft thật được kiểm riêng.
- [HTTP examples](../../../../supabase/tests/http/GM-18.http): case bàn giao chưa chạy,
  không chứa token thật và không phải bằng chứng public RPC đã có.
- [CHECKS](CHECKS.md): assertion/result/environment và các mục chưa chạy.

Từ repo root, Node >=24 và Python >=3.11, Docker local của GM-03:

```sh
npm ci
npm run backend:start
node --test mobile/tests/eligibility.test.mjs
python3 scripts/gm18_eligibility_check.py --report /tmp/gm18-sql-results.json
cd mobile
npm ci --no-audit --no-fund
npm run check
```

Runner xác nhận project/container/ports/PostgreSQL 17 của importer, dùng namespace
`gm08_check_<16hex>` đã allowlist để tạo DB riêng, không mở rộng guard. Copy auth.users
DDL, không copy user/credential. Không reset DB project. Cleanup đúng DB vừa tạo;
fixture và actual draft load được xóa theo exact keys trước cleanup. Chạy backend:stop
sau kiểm nếu chính lượt đó đã khởi động project; giữ volumes và container khác.

## Input/output và policy

Input là trusted snapshot/context, evaluatedAt từ server, seed, preferences riêng
và recentDishIds đã lọc consent bởi caller có quyền. Radius/horizon phải là policy
hữu hạn được reviewer chốt; kernel không dùng default production. Giá trị 10000 m /
604800 s trong runner là fixture policy, không là phê duyệt vận hành.

Coverage/radius và giao lịch quán–món trước ranking. Unknown/stale không vào pool;
stock unknown có lịch đủ điều kiện chỉ là scheduled, không thành confirmed. Card
lấy profile/giá từ một offering, không ghép thông tin của nhiều quán. Rank theo
sở thích (category/cuisine/temperature/flavor), budget có đơn vị so sánh được,
recent penalty, distance, seeded hash và offering ID. Category representation rồi
fill tối đa 8 dish/variant unique. Budget/recent/sở thích không thành hard veto.

Kernel diagnostics/reasons/offering metadata là nội bộ. Không trả snapshot nguồn,
preferences hoặc recent history cho client. Public DTO là GM-07; review projection
và reason/seed metadata với upstream trước public RPC. Preview roundDishId/choiceId
là key nội bộ dish/variant; GM-19 phải gán UUID lưu trữ, không insert preview key
vào round_dishes. Snapshot helper đọc các typed rows hiện tại trong một SQL
statement; không tái dựng catalogue lịch sử chỉ từ chuỗi datasetVersion. GM-19
khóa room/pool/snapshot và đối chiếu active manifest/receipt/revision trước start.

## Phần tiếp theo và người nhận

- GM-17: bàn giao access policies/RPC auth, rate limit và role/grants; GM-18 tiếp
  tục tích hợp public get_discovery_context/preview_food_pool/get_result_offerings
  theo hợp đồng, kiểm quyền outsider/member/host thật trước merge.
- GM-19/20: wrapper đọc persisted winner/context có membership, không tin winner
  từ client. Refetch chỉ đúng dish/variant, lọc trước top-8 để không làm mất winner
  từng xếp thứ 9; không ghi result hoặc reroll khi không còn offering.
- GM-24/25/27: ma trận Android–API trong docs/testing/MOBILE_API_TEST_MATRIX.md.
  Dùng endpoint LAN/TLS phù hợp mà điện thoại truy cập được, public key/test token
  từ runtime. Không coi localhost máy tính là endpoint trên điện thoại. Cases:
  manual/coverage/radius/desiredAt/timezone/empty/unknown/result refresh, thực hiện
  app → request/status → UI/server assertion; ghi build/device/runtime/commit.
- GM-08: manifest verified hiện 0. Actual draft 0.4.1 giữ nguyên, không tự điền
  coverage/anchor/service mode/giờ món hoặc đổi reviewStatus để tạo pool dương.
  Query draft kiểm rejection, không thay query catalogue verified theo AC GM-18.

Trước tích hợp/merge: fetch main, chạy merge gate GM-18, nhận GM-17 đúng version,
chốt policy/projection, chạy public HTTP và device cases, reviewer Trí kiểm AC.
Không tự chuyển Done hoặc ghi nghiệm thu từ các phép kiểm phần độc lập.
