## Task và phạm vi

Task `tasks/backlog/GM-36.md`; owner Tâm (@HoaiTam), reviewer Trí (@ThanhTris).
Roadmap-v2 GM-36 / mã cũ GM-29 / issue #97. Tâm giao phần độc lập ngày2026-10-16.
Baseline food-v1; GM04.2/food1.1.0/GM07.1, EXTENSIONS_SPEC/FOOD_DATA_SPEC/ADR009.
Branch `codex/gm-36-menu-ocr` → main; draft phần độc lập, không stacked.

Scope: Web handler/provider port, image/source/consent validation, normalization
confidence/null/price, Auth/operator/quota/timeouts, standalone draft schema/tests.
Không scope: actual recognizer/native/cloud provider, bật app/Edge deployment,
menu accuracy/pilot, reviewed source/publish, integration sau GM34. Không đổi luật
địa điểm/giờ/NO, core DTO/config/packages/migrations/dataset. Không chọn provider.

## Start gate — trước viết phần độc lập

- [x] `python scripts/task_readiness.py --task GM-36 --base-ref origin/main` đạt READY_TO_CLAIM; GM04/07 Done, đủ output/HANDOFF.
- [ ] Trí review plan/contract/revision; owner đã giao việc. Không package/provider mới được cài hoặc gọi.
- Input/version: dictionary/schema/validator food1.1.0, GM07.1 envelope/null/PriceUnit trên target daa9174; output riêng GM36.1, API supplement/schema/fixtures đi cùng.
- File ownership: mới functions/menu-ocr, scripts/tests/request suite/evidence GM36; shared producer inputs giữ nguyên.
- Phần làm trước: real Web HTTP/Auth với recognizer test double. Chờ GM34 và actual recognizer/provider/native/license/quota/privacy/pilot review trước tích hợp/bật tính năng.

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task/PR upstream | Project Done / checker | Merge/squash commit thực tế | Artifact/version trên target khớp? |
| --- | --- | --- | --- | --- |
| GM04 | PR62/food1.1.0 | Done / start-gate.txt |d9e83d9 | Có; field/schema/validator/HANDOFF |
| GM07 | PR104/105, GM07.1 | Done / start-gate.txt |07117821 /9f71bba6 | Có; client/contracts/HANDOFF |
| GM08 | PR103/importer | Done |3076c3d | Có; unchanged preflight rejects direct draft |
| GM34 | Release core | Todo / merge-gate.txt | Chưa có release bàn giao | Chưa; merge blocker |

- [x] Target fetched `origin/main=daa917461e68353f6ba015f2f746e805ec19710e`; branch bắt đầu từ đó.
- [ ] Merge gate đạt — hiện BLOCKED GM34, không bypass.
- [ ] Người merge kiểm lại upstream commit/artifact/version thật và target tại revision merge.
- [ ] Cập nhật branch + chạy actual recognizer/Edge/integration khi đủ output/review; unit/stub không thay bằng chứng đó.
- Published PR head:858ef00d506435d59c5a5dfa87f5a8a2a103d6da. Tested:858ef00 + uncommitted review fix; hashes PATCH_MANIFEST.json. Fetched review target4a8cd64; original branch base daa9174.
- Contract: thêm draft-only API supplement, không thay core. No DB migration; rollback giữ flags off và bỏ module độc lập, không xóa dữ liệu. Recognizer/quota production phải review trước bật.

## AC và verification

| AC | Pass/Fail/Not run | Evidence/output/version/môi trường | Mock hay thật / giới hạn |
| --- | --- | --- | --- |
| Confidence/null/errors không thành verified | Pass phần độc lập | Node48 + Python8 + actual HTTP draft | Recognizer simulated; schema/handler thật |
| Auth/source/size/timeout/quota/privacy | Pass phần độc lập | HTTP14 + Node48, macOS/Node26/GoTrue | JWT/Auth/network thật; quota local-only |
| Không auto import/publish hoặc bypass giờ/vùng | Pass boundary | Actual output + unchanged GM08 preflight reject | Offline, không DB/publish |
| Provider/license/quota/cost/privacy/ảnh thật được review | Not run/Pending | PROVIDER_REVIEW.md | Chưa chốt actual provider/native; không ghi approval |
| Real OCR Vietnamese accuracy/Edge/native integration | Not run | Chờ GM34 và plan/provider approved | Mandatory full-task work còn lại |
| Bàn giao/no current Android consumer | Đã ghi scope | HANDOFF + MOBILE_API_TEST_MATRIX | Không camera/UI/device Pass từ stub |

- [x] `python scripts/validate_repository.py`
- [x] `python -m unittest discover -s tests -p "test_*.py"` —558 tests,5 existing skips.
- [x] `python scripts/task_readiness.py --check-docs` (không đổi metadata task).
- [x] `git diff --check`
- Strict TypeScript OCR Pass;48 Node tests,8 Python feature tests,14 HTTP groups.
- Native/typecheck app/lint app/SQL/RLS/Android/a11y/offline app N/A trong phần độc lập không sửa app/schema. Actual Deno/Edge/provider Not run, không coi N/A để nghiệm thu full task.
- Food source/license/coverage/menu-hours/freshness/unknown: giữ null/không suy diễn; synthetic fixtures tách thật, chưa publish.
- Artifact/version/lệnh/task nhận tại HANDOFF; Trí review Pending; GM34 và actual recognizer là blocker đầy đủ task.
- Evidence mới `docs/evidence/roadmap-v2/GM-36/`; không sửa evidence mã cũ.

## Review cuối — Trí

- [ ] Reviewer kiểm AC, cả hai gate và evidence của revision hiện tại; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done sau khi đủ task; lưu review revision/evidence, thay code phải review lại.

Đây là draft independent delivery. BLOCKED merge không được đổi thành Done từ CI,
HTTP200 hoặc fixture. Checker không chứng minh merged code/actual provider/native;
không tự merge hoặc ghi approval thay Trí.

## Artifact bàn giao roadmap-v2

Track EXTENSION / phần độc lập của GM36 / API Web handler + schema, recognizer stub.

| Input task | Artifact + version/commit | Có trên target/nhánh? | Smoke đã kiểm |
| --- | --- | --- | --- |
| GM04 | FOOD_DATA_DICTIONARY + food1.1.0 schema/validator | Có / daa9174 | Cross-language draft semantic mapping |
| GM07 | contracts.ts/GM07.1 envelope+unit/null | Có / daa9174 | Core unchanged |
| GM08 | import_food_data.py/preflight | Có / daa9174 | Actual HTTP draft rejected as importable/publish-ready bundle |
| GM34 | RELEASE/CHECKS/HANDOFF | Chưa | Not run |

Output `supabase/functions/menu-ocr/index.ts` + modules/draft.schema.json; GM-36.http;
runners/tests/fixtures; GM36_MENU_OCR_API.md. Contract GM36.1, food mapping1.1.0.
Commands/expected/errors/limits: `docs/evidence/roadmap-v2/GM-36/HANDOFF.md`.

- [ ] UI/native mock N/A ở independent pipeline; không suy full OCR/Edge/native Pass từ fixture.
- [x] Start inputs đủ, không tạo lại core scaffold/contract hoặc bỏ prerequisite.

## Output chạy được — UI / BE / Data

CHECKS.md `docs/evidence/roadmap-v2/GM-36/CHECKS.md`, tested daa9174 + source hashes,
macOS/Node26/TypeScript6.0.3/Python3.13, GoTrue real local; no actual Edge deployment.

| Endpoint/field | Request/lệnh | Input | Expected + assertion | Actual + evidence | Mock/thật / Result |
| --- | --- | --- | --- | --- | --- |
| menu-ocr handler | gm36_http_check.mjs | Real JWT/operator + synthetic PNG |200 exact3-row draft + ambiguous-range regressions; unknown fields null | http/results.json + actual-draft.json | HTTP/Auth thật; recognizer stub / Pass độc lập |
| Error/permission/deadline/quota | same + Node tests | Forged JWT/outsider/image/body/provider failure/concurrency |401/403/400/413/422/429/502/503/504, no raw diagnostic | HTTP14 + unit48 | Boundary thật / Pass |
| Schema/import rejection | gm36_contract_check.py --draft actual-draft.json | Actual response.data | Valid draft; original GM08 refuses direct import | http/contract-results.json | Offline reuse / Pass |
| Real Edge/on-device recognizer | Chưa bật | Real permitted menu/approved native/provider | Measured accuracy/privacy and actual runtime | Not run | Full-task blocker |

- [ ] Expo/mobile UI không thuộc independent pipeline, chưa có consumer Android được giao.
- [x] HTTP runner/request suite/status/body/error assertions, auth/provider mock tách rõ.
- [x] Matrix server/unit/device và future consumer boundary ghi HANDOFF; không thêm dependency ngược.
- [x] Draft/schema/source/null/unit/privacy mapping và actual preflight đủ phần độc lập; không ép unknown thành verified.
- [x] Evidence không secret/GPS/phiếu/photo thật; missing actual provider/runtime/review vẫn blocker, không dùng CI/docs thay nghiệm thu.

## Sửa comment PR123 trên revision858ef00

-35-45k /35-45.000 đ và dạng tương đương không còn trở thành35..45000 VND.
Giữ toàn bộ price/currency/unit/source giá null và thêm PRICE_UNKNOWN_OR_AMBIGUOUS,
kể cả confidence0.99. Không tự nhân1000.
-35k-45k /35000-45000 đ vẫn35000..45000.48 Node tests,14 HTTP groups, schema/GM08
import rejection và strict TypeScript đã chạy lại. Xem review-fix-2026-10-16.
- CI published858ef00 xanh; CI của bản sửa chưa commit/push chưa chạy. Trí cần review
revision mới sau push; GM34 và provider/native/pilot vẫn Pending, không đề nghị Done.
