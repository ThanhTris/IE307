# Hướng dẫn AI coding agent — Gì Cũng Được

## Bối cảnh

Dự án Android-first React Native giúp nhóm chọn món. Source hiện có shell/component Expo GM-02/05, field contract/schema/import GM-04/06/08, client/mock GM-07, engine GM-15, auth GM-16, RLS/retention GM-17, eligibility GM-18 và lifecycle phòng GM-19. Màn sản phẩm và tích hợp Android còn theo các task sau; không coi mock/HTTP server test là app đã hoàn thiện. Status/assignee/Deadline hiện hành đọc trực tiếp trên Project #2; mô tả artifact không tự ghi approval.

Git pull không tự đồng bộ database đang chạy. Kiểm migration ledger và definitions/RPC thực tế trước dùng endpoint; health GoTrue hoặc schema registry không chứng minh deployed code khớp main. Có draft objects ngoài ledger thì cần kế hoạch reconcile/backup được chủ dự án duyệt, không reset hoặc sửa migration đã merge để vượt kiểm tra. GM-08 đã nghiệm thu bundle thật trên DB test theo ADR-014, không đồng nghĩa đã publish dataset production.

Nguồn yêu cầu: chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan → prototype/research. [Migration plan](docs/project/MIGRATION_PLAN.md) ghi giả định chờ review. Không dùng commit đề tài cũ làm yêu cầu active.

## AIDD

**Phạm vi Trí làm rõ ngày 2026-10-25 — ưu tiên hơn phần phân việc UI bên dưới:** đợt hiện tại chỉ cập nhật yêu cầu và giao phần bổ sung **BE/Data**. Báo cáo UI/Figma là đầu vào để xác định contract, projection và hành vi server; không là lệnh triển khai hoặc giao lại FE. Giữ code, task nền, assignee, Deadline và trạng thái FE trước đợt supplement này; thu hồi supplement Figma/contract B và cờ Follow-up do đợt này thêm vào GM-02/05/09..14/24..31/33/34/39. Chờ Trí chốt Figma và giao kế hoạch làm lại FE riêng. GM-07 chỉ làm contract/schema/DTO phục vụ BE/Data trong đợt này, chưa sửa mobile client/mock. GM-03 vẫn có phần runner QA Auth+REST và bàn giao version/hash; không nhận nghiệm thu UI/Android. Đọc [phạm vi và phân công BE/Data](docs/project/BE_DATA_ONLY_SCOPE_2026-10-25.md). Các dòng giao FE trong matrix/review plan đời trước chỉ là tham chiếu hoãn, không phải task active của đợt này.

**Cập nhật của Trí ngày 2026-10-25:** đồng bộ yêu cầu/contract/AC BE–Data–UI với Figma và các làm rõ mới nhất; chưa code runtime hoặc sửa app trong cập nhật tài liệu này. Mọi repo operation giữ `main`, không tạo/chuyển branch. Đọc [audit](docs/project/BE_DATA_AUDIT_2026-10-24.md), [gói việc](docs/project/BE_DATA_FOLLOWUPS_2026-10-24.md), [Figma–BE–Data–UI matrix](docs/project/FIGMA_BE_UI_DATA_ALIGNMENT_2026-10-24.md), [review plan](docs/project/UI_MAIN_SYNC_REVIEW_PLAN_2026-10-24.md), [GM-07.B](docs/architecture/DISH_SESSION_API_CONTRACT_B.md) và [ADR-020](docs/architecture/decisions/ADR-020-public-top-three-result.md). Vòng 1 kiểm winner trước; nếu chưa có winner, lấy survivors từ pool khóa trừ hợp NO của mọi ballot R1 hoàn chỉnh đã ACK. N=0 kết thúc `NO_CONSENSUS/EMPTY_INTERSECTION` tại R1; N>=1 luôn mở R2 thật, kể cả N=1. R2 là lượt quyết định REMOVE hoặc không REMOVE; với mọi N=1..20, cap cố định `max(1,floor(0.30*N))`, không auto-finalize, không tự ghi KEEP cho người chưa gửi; hết candidates thì `NO_CONSENSUS/ALL_REMOVED`, còn candidates thì chốt theo điểm R1. Không bù món, không mở R3; phiên v2/v3 đã pin giữ nguyên qua policy/migration version mới. Mốc 60 giây bắt đầu khi người đầu tiên hoàn tất lượt và vào waiting sau ACK. Top3 theo ADR-020. Places + Google Map hiển thị trong màn kết quả cho món thắng; mở Google Maps là hỗ trợ, không thay Places/map trong app. Dark của supplement này hoãn; giữ nguyên AC accessibility và capability hiện có.

Theo ADR-019 và các làm rõ ngày 2026-10-25: tối đa 20 người; host chọn chính xác 10–20 món ban đầu; bỏ ready; chờ 60 giây từ người đầu tiên hoàn tất lượt và vào phòng chờ kết quả mỗi vòng; host có Chốt ngay; chọn pool không phụ thuộc vị trí/quán. Sau khi kiểm winner R1, N=0 kết thúc `EMPTY_INTERSECTION`; N>=1 luôn mở R2, kể cả một món. Trong R2 người chơi tự quyết REMOVE hoặc không; cap `max(1,floor(0.30*N))` áp dụng cả N=1. Không auto-finalize, không tự sinh KEEP cho người chưa gửi; REMOVE hết thì `ALL_REMOVED`, còn món thì chốt theo điểm R1. Không bù món hoặc mở R3. Cap cũ `min(3,floor((N-1)/2))` và chính sách N=1 bỏ REMOVE là lịch sử, không dùng cho policy mới. Legacy v2/v3 giữ nguyên đến migration/version mới. Places + Google Map thuộc màn kết quả cho winner; Google Maps link không thay Places/map trong app. Dark của supplement hoãn; kiểm thiết bị vẫn Not run đến khi chạy thật.

Trí (`ThanhTris`) review tất cả task, bao gồm task Trí trực tiếp làm; không yêu cầu review chéo hoặc người kiểm độc lập theo ADR-013. Không tự thay reviewer hoặc ghi approval thay Trí.

Trước code: task có owner, reviewer Trí (ThanhTris) kể cả khi Trí là owner theo [ADR-013](docs/architecture/decisions/ADR-013-project-owner-final-review.md), scope, AC, spec, patch/test plan và contract version. Theo ADR-011 được chủ dự án cập nhật ngày 2026-10-24, `start_dependencies` chấp nhận `Done` hoặc `Needs Update` trên GitHub Project #2 làm xác nhận nghiệm thu baseline; Needs Update không nghiệm thu phần supplement. Không bắt đồng bộ Done/Approved trong Markdown để mở task. Được viết phần độc lập dù `merge_dependencies` chưa xong. Trước tích hợp/merge cần cả hai loại dependency ở Done hoặc Needs Update trên Project, đủ output/HANDOFF, đúng contract/manifest/artifact trên nhánh đích, kiểm PR/commit và test thật. GM-00 là baseline lịch sử, vẫn kiểm approval local. Theo ADR-009, parallel_with không có quan hệ start trước/sau. GM-01 roadmap-v2 đã được chủ dự án xác nhận duyệt ngày 2026-10-10, xem docs/evidence/roadmap-v2/GM-01/REVIEW.md; không thay approval của task sau. Chạy `python scripts/task_readiness.py --task GM-XX` trước code; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref. Checker chỉ đọc Project, không tự fetch/merge, duyệt hoặc đổi trạng thái.

Theo chủ dự án ngày 2026-10-13/[ADR-014](docs/architecture/decisions/ADR-014-test-data-and-baseline-project-card.md), baseline GM-01 dùng Done của card GM-00/#37 trên Project (alias pin trong tasks/project-gate.json), không tìm card GM-01/#100. Scope/artifact GM-01 vẫn riêng; GM-00 lịch sử kiểm local. GM-08 nghiệm thu bundle thật trên DB test: không bắt verified publish/review độc lập/coverage/anchor đầy đủ hoặc bổ sung lịch từng món/serviceMode chưa biết. BE nhận bundle test/query/version/hash ngay; thiếu đầu vào lọc trả unknown/empty, không bịa hoặc bỏ luật địa điểm/giờ. Manifest verified0 và production publish guards giữ nguyên; hồ sơ Pending đời trước không mở lại task.

Đọc [workflow](docs/project/TEAM_WORKFLOW.md), [DoD](docs/project/DEFINITION_OF_DONE.md). AI không tự duyệt hoặc ghi Done. Thay phạm vi/kiến trúc/quyền riêng tư phải ghi ADR và hỏi owner khi chưa có ủy quyền. Cập nhật tài liệu/UI không cần task mới mỗi lần; gom vào task nền khi phù hợp.

Mã task hiện hành theo roadmap-v2: GM-01..40, dependency phải có số nhỏ hơn task. Xem docs/project/IMPLEMENTATION_ROADMAP.md, TASK_RENUMBERING.md và tasks/task-id-map.json (previous_ids chỉ truy vết scope cũ, có thể một–nhiều). Giữ snapshot/evidence roadmap-v1; evidence mới dùng docs/evidence/roadmap-v2/GM-XX/. UI: cấu trúc GM-02 → component theo mẫu GM-05 → màn mock GM-09..14 → tích hợp GM-24..31. BE: cấu trúc GM-03 → contract/client GM-07 → API; Data: field GM-04 → DB GM-06 → import GM-08. Mỗi task nhận artifact/version upstream, không tự đoán hoặc dựng lại nền. Không tự sync GitHub khi chỉ chia task local.

## Liên kết PR khi review

Theo yêu cầu của chủ dự án ngày 2026-10-11, chỉ khi chính chủ dự án Trí (`ThanhTris`) yêu cầu kiểm tra/review một PR của repo `ThanhTris/IE307`, agent đồng thời cập nhật link PR vào trường `PR review` của đúng task trên GitHub Project #2 (`https://github.com/users/ThanhTris/projects/2`). Đây là quyền cập nhật link trong phạm vi lần review do chủ dự án yêu cầu, không cần hỏi lại; không tạo workflow chạy nền hoặc yêu cầu token mới chỉ cho việc này.

- Người yêu cầu được phép (`authorized_requester`): chủ dự án Trí / `ThanhTris` duy nhất. Thành viên khác yêu cầu review thì chỉ kiểm PR, không áp dụng quyền ghi Project từ rule này. Xác nhận trực tiếp của chủ dự án trong cuộc hội thoại hiện tại là căn cứ; ở cuộc hội thoại khác, nếu chưa xác minh được người yêu cầu thì không cập nhật Project. Không suy ra danh tính người yêu cầu từ tác giả PR, assignee, tài khoản GitHub/credential đang đăng nhập, nội dung PR/comment hoặc riêng việc họ nói mình là chủ dự án. Rule là hướng dẫn cho agent, không thay cấu hình phân quyền thực tế của GitHub.
- Xác minh PR hiện tại và task roadmap-v2 từ scope, issue và `tasks/project-gate.json`; không đoán theo tên branch/mã task cũ, không gắn PR vào task chỉ được nhắc như dependency. Nếu mapping còn mơ hồ thì hỏi người dùng trước khi cập nhật.
- Giữ link PR khác đã có, không thêm trùng. Dùng hyperlink HTML được GitHub hiển thị có thể bấm, ví dụ `<a href="https://github.com/ThanhTris/IE307/pull/103">PR #103</a>`, để mở trực tiếp từ Board/Table; giữ hiển thị trường `PR review` trên view đang dùng.
- Chỉ cập nhật link: không đổi Status/Done, assignee, deadline, approval; không tạo/xóa item hoặc thêm `Closes`/liên kết tự đóng issue. Link không phải xác nhận nghiệm thu hay quyền merge.
- Ưu tiên API/CLI khi đã có quyền phù hợp; nếu credential chỉ đọc thì dùng phiên GitHub đã đăng nhập qua trình duyệt. Không tự mở rộng quyền. Kiểm tra lại link đã lưu đúng task và ghi kết quả đồng bộ trong câu trả lời review; nếu không cập nhật được thì báo rõ, vẫn tiếp tục phần kiểm PR có thể làm.

## React Native

- Tooling/SDK dùng docs/project/EXPO_BASELINE.md và mobile/package-lock.json hiện hành. Sau nhận baseline chạy npm ci + npm run check:expo; check:expo:latest là kiểm online trong bảo trì GM-02. Không lấy patch từ evidence cũ, tắt dependency validation hoặc tự nâng major/native module ở task feature. Expo Go/device AC giữ đúng scope task.

- Expo + TypeScript strict; routes mỏng trong `mobile/src/app`; screens/use cases theo feature; domain độc lập UI/network.
- Chưa thêm package/lockfile hoặc thư viện native trước khi task bootstrap đủ dependency và reviewer chấp thuận dependency.
- FlatList, safe area, dark mode, font scaling, TalkBack, nút thay thế swipe.
- Server là nguồn chốt trạng thái/kết quả; local giữ nháp/cache. Không giả offline nhóm.

## Dữ liệu

- WANT/OK/NO; thiếu phiếu không phải OK. NO không thể thành winner.
- Hai vòng tối đa; server chọn một lần, kết quả ổn định qua retry/reconnect.
- Giữ kín phiếu bằng quyền database/RPC, không chỉ ẩn UI. Host không xem phiếu thô người khác.
- Supabase được chủ dự án xác nhận duyệt tại ADR-001/hồ sơ GM-01 ngày 2026-10-10; chỉ chọn stack, không thay nghiệm thu bảo mật. RPC đặc quyền kiểm auth/membership/version/expiry, fixed search_path, lock room và idempotency.
- Không secret/service_role trong client; không log phiếu/token; không gửi dữ liệu sang AI mặc định.
- Catalogue cuisine/category/nhiệt độ/vị phải có offering quán–món trong coverage và lịch quán/lịch món phù hợp trước tạo pool; source/freshness/unknown/overnight theo FOOD_DATA_SPEC. GPS chỉ gợi điểm ăn công cộng, không tự share GPS host.
- OCR/AI/weather/mood/fairness qua nhiều bữa là mở rộng, không chặn MVP. Ảnh cần quyền sử dụng; không tuyên bố an toàn dị ứng từ tên món.

## Chuẩn bị dữ liệu legacy GM-03 → roadmap-v2 GM-04

[Handoff hiện hành](docs/evidence/roadmap-v2/GM-04/HANDOFF.md) đối chiếu nhánh data cũ với roadmap-v2. GM-03 hiện tại là BE structure của Trí; không thay task đó bằng metadata dữ liệu. GM-03 roadmap-v1 nhận scope tại GM-04/GM-07; verified import là GM-08; food eligibility là GM-18. [Đồng bộ v1 lịch sử](docs/evidence/roadmap-v1/GM-03/MAIN_SYNC.md) và evidence đời trước giữ nguyên, mã cũ không là task hiện tại.

Đọc [handoff dữ liệu](data-preparation/docs/HANDOFF.md), [taxonomy](data-preparation/docs/TAXONOMY.md), [dictionary](data-preparation/docs/DATA_DICTIONARY.md) và [forms](data-preparation/templates/README.md) cho nguồn/ID/nullable/CSV/JSON/validator. [Catalogue](data-preparation/docs/EDITORIAL_CATALOGUE.md) có 39 món draft, giá theo menu; artwork chưa review giữ null. Giữ snapshot/cache/pilot nguyên trạng, mặc định offline, không gọi lại AI hoặc dùng làm verified seed. Contract v2 đề xuất ở [dictionary food/core](docs/data/FOOD_DATA_DICTIONARY.md), [field coverage](docs/data/FIELD_COVERAGE.md), schema/template trong supabase/seed/templates và [cases GM-04](tests/fixtures/food-v1/README.md). Chạy `python scripts/validate_field_contracts.py --cases` và `python scripts/build_field_contracts.py --check`; food adapter 1.1.0 không đổi snapshot 1.0.0. [Checks GM-04](docs/evidence/roadmap-v2/GM-04/CHECKS.md) là contract assertions, chưa SQL/RPC/eligibility hoặc approval.

[Fixtures food](tests/fixtures/food-data-v1/README.md) mô phỏng cho eligibility GM-18, fixtureOnly=true, clock cố định; verified/reviewer/license chỉ mô phỏng, không nghiệm thu parity. [Review package lịch sử](docs/evidence/GM-03/REVIEW_PACKAGE.md) cho Tâm; chạy `python data-preparation/scripts/validate_data_preparation.py` để audit chỉ đọc. validStructure không là approval/publish/freshness hiện tại.

## Engine legacy GM-06 → roadmap-v2 GM-15

[Contract engine](mobile/src/domain/decision/README.md) và [handoff hiện hành](docs/evidence/roadmap-v2/GM-15/HANDOFF.md) hướng dẫn decision-v2 draft: roster/pool khóa, hai vòng, veto/score/tier. evaluateDecision giữ candidate-only; theo owner chốt ngày 2026-10-11, decideWithSeed/selector bổ sung winner thuần với seed8 hex, xem [ADR-012](docs/architecture/decisions/ADR-012-seeded-domain-selection.md). Không đổi luật phiếu hoặc tự approve. [Fixtures](tests/fixtures/decision-v2/README.md) mô phỏng; chạy `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` với Node24. [CHECKS](docs/evidence/roadmap-v2/GM-15/CHECKS.md) ghi tsc/lint/Jest/CI riêng; type stripping không thay typecheck. GM-07 đã nhận từ main3076c3d; [mapping](docs/evidence/roadmap-v2/GM-15/CONTRACT_MAPPING.md) kiểm row→choice→winner row, canonical result vocabulary. GM-07 supplement/seed contract chờ review. Chưa SQL parity/persist/retry/secure entropy backend (GM-20); không public matrices/tie sets hoặc dùng draft KEEP làm submission. Không sửa GM-02 package/config/runner; GM-06 hiện tại là schema của Tâm. Gate dùng GitHub Project theo ADR-011; thiếu quyền đọc Project không là dependency chưa bàn giao.

## Bàn giao

Đầu ra theo docs/project/TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md: UI mở Expo thấy/tương tác các mục task; BE có Postman/curl/runner input-response-assertions thật (nền/contract/domain kiểm đúng stage); Data đủ field/schema/template/fixture/version để BE làm song song. Mỗi task có CHECKS.md + HANDOFF.md; API task có request suite supabase/tests/http/GM-XX.http. Not run/Fail của AC bắt buộc chặn Done; placeholder/docs CI không thay output thật. Shell Expo Go không bị native module crash; tính năng không hỗ trợ Expo Go cần development/native build evidence riêng. Plan cấu trúc đã được chủ dự án xác nhận tại docs/project/FOUNDATION_IMPLEMENTATION_PLAN.md, không thay approval baseline/package.

GM-39 là ngoại lệ theo scope prototype HTML do chủ dự án chốt ngày 2026-10-12: Trang đọc docs/design/UI_REFINEMENT_BRIEF.md và spec trước đề xuất, chỉnh design/prototypes/gi-cung-duoc.html để Trí duyệt, chưa sửa mobile/backend. Kiểm browser responsive/theme/zoom/focus/luồng mô phỏng và ảnh trước–sau, không đòi hoặc báo Expo/API/native Pass từ HTML. Áp dụng vào app chờ Trí giao phạm vi riêng; không miễn đầu ra app của task khác.

Chạy `python scripts/validate_repository.py`, regression `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`, kiểm diff và evidence. Sau đổi metadata task sinh lại indexes bằng `--write-docs`. Project Done nghiệm thu toàn scope; Needs Update giữ baseline nghiệm thu và cho mở dependency trong khi supplement còn chờ. AI không tự chuyển Done. Nếu chuyển task Markdown vào tasks/done thì vẫn phải có Decision Approved, reviewer Trí/ngày và Review-evidence thật, không tự tạo để khớp board. Validator/indexes là offline, không mở task. `--approval-source local` chỉ chẩn đoán lịch sử, không là cách vượt gate Project. Thiếu credential/quyền read:project/mạng hoặc item không xác minh được phải chặn, không dùng Issue Closed hay cache thay Done/Needs Update. Xem docs/project/PROJECT_READINESS.md. HTML phải ghi rõ mô phỏng; native build có evidence riêng. Không sinh tài liệu đề tài cũ để vượt kiểm tra. Sinh Word mới khi có yêu cầu/template chốt.

Không tự commit/push nếu chưa được yêu cầu. Validator không thay review thực tế của Trí.

## GM-20 — submit/finalize patch

Đọc [handoff](docs/evidence/roadmap-v2/GM-20/HANDOFF.md) và [storage supplement](docs/evidence/roadmap-v2/GM-20/CONTRACT_STORAGE.md) cho GM-20.3/schema0.5.0, request/intent replay, wire IDs, private seed, scoped consent writer và event/inbox. Chạy `node scripts/gm20_http_check.mjs` trên Supabase local: owned disposable DB/JWT thật; `--bruno` giữ fixture và `scripts/gm20_http_stop.mjs` cleanup. Runtime private luôn ignore; không log votes/token hoặc reset DB ứng dụng. SQL/domain/HTTP evidence không thay Android GM-26/27/31 hoặc review Trí. Không gọi helper0021/GM-23 chưa merge, không tự Done/Approved.

## GM-40 — Catalogue món độc lập và QA import

Theo [issue #125](https://github.com/ThanhTris/IE307/issues/125), GM-40 là Data P0 bổ sung;
GM-34 giữ baseline food-v1, không thêm dependency ngược. Menu/quán vẫn là nguồn nghiên
cứu; profile mới không yêu cầu entity nơi bán. Legacy FOOD_DATA_SPEC/GM-08/18 giữ nguyên.
Đọc [dictionary catalogue](docs/data/DISH_CATALOGUE_DICTIONARY.md),
[patch plan](docs/evidence/roadmap-v2/GM-40/PLAN.md) và
[handoff](docs/evidence/roadmap-v2/GM-40/HANDOFF.md). Chạy
`python3 data-preparation/scripts/dish_catalogue.py --check` để đối chiếu 39 món,
18 ID dùng chung GM-08, mapping 216/2/1 và 247 giá quan sát. Không gọi lại AI/network.
[ADR-018](docs/architecture/decisions/ADR-018-dish-catalogue-profile.md) **Proposed**;
issue yêu cầu Trí duyệt trước sửa schema/API. Supplement ngày2026-10-23 dùng storage0026/schema0.8.0 và dish_session đã merge, không đổi schema/API hoặc tạo runtime thứ hai.
Dataset1.1.0 giữ39 UUID, supplement meal có nguồn riêng; chạy `python3 scripts/gm40_catalogue_check.py` để validate/stage/import/readback và SQL/JWT HTTP trên owned QA DB/REST, worker verify rồi cleanup. CLI `supabase/seed/import_dish_catalogue.py` từ chối app DB, pin hash/version, atomic activation/restore; không migrate/reset app DB. Bundle vẫn draft/test_demo, không seed production/approval. ADR SQL ban đầu chưa duyệt; Android/FE/Places chưa kiểm.
