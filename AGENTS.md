# Hướng dẫn AI coding agent — Gì Cũng Được

## Bối cảnh

Dự án Android-first React Native giúp nhóm chọn món. Source hiện có shell/component Expo GM-02/05, field contract/schema/import GM-04/06/08, client/mock GM-07, engine GM-15, auth GM-16, RLS/retention GM-17, eligibility GM-18 và lifecycle phòng GM-19. Màn sản phẩm và tích hợp Android còn theo các task sau; không coi mock/HTTP server test là app đã hoàn thiện. Status/assignee/Deadline hiện hành đọc trực tiếp trên Project #2; mô tả artifact không tự ghi approval.

Git pull không tự đồng bộ database đang chạy. Kiểm migration ledger và definitions/RPC thực tế trước dùng endpoint; health GoTrue hoặc schema registry không chứng minh deployed code khớp main. Có draft objects ngoài ledger thì cần kế hoạch reconcile/backup được chủ dự án duyệt, không reset hoặc sửa migration đã merge để vượt kiểm tra. GM-08 đã nghiệm thu bundle thật trên DB test theo ADR-014, không đồng nghĩa đã publish dataset production.

Nguồn yêu cầu: chỉ dẫn hiện tại của chủ dự án → task/AC → spec/ADR → PRD/plan → prototype/research. [Migration plan](docs/project/MIGRATION_PLAN.md) ghi giả định chờ review. Không dùng commit đề tài cũ làm yêu cầu active.

## AIDD

**Hiện trạng ưu tiên — rà main ngày2026-10-28:** đọc [báo cáo hiện hành](docs/project/MAIN_FIGMA_READINESS_2026-10-28.md) trước các audit lịch sử. Main `1bf28d8` có runtime v4 trong0027–0031 (Top3, waiting, consent); `dish_v4_private` vẫn là authority. Migration0032/schema0.10.0/PR136 chỉ thêm storage độc lập, GM-20/21 nhận phần adapter/writer-reader tiếp theo. DB đang chạy cần kiểm ledger/definitions riêng. Mobile còn nhiều màn/client legacy, chỉ nền Inter/SDK58 và một phần component/Home đã cập nhật; không coi PR merge là toàn bộ Figma đã nghiệm thu. Cả20taskUI có node đầu vào,66node đã kiểm tồn tại. Thay/xóa UI cũ trong task sở hữu sau khi chuyển route/import/tests và kiểm màn mới; giữ migration/API/engine phiên cũ và regression. GM-19 có lỗi member sửa settings và no-op/đổi giờ làm reroll pool đã tái hiện, đưa về Needs Update; xem AC bổ sung.

**Gate Trí xác nhận ngày2026-10-28:** chỉ dependency **Done** trên Project #2 mới mở task phụ thuộc. **Needs Update không mở gate**; status này giữ lịch sử baseline nhưng supplement chưa được nghiệm thu. Đồng bộ với checker và ADR-011; không dùng mô tả Done-or-Needs-Update đời trước để bỏ qua gate.

**UI Figma đã chốt, BE/Data đồng bộ tiếp theo — 2026-10-25:** Trí xác nhận bộ UI hiện hành đã hoàn chỉnh để làm căn cứ rà BE/Data; đọc [scope đã chốt](docs/design/UI_SCOPE_CONFIRMED_2026-10-25.md), [final handoff](docs/design/UI_FINAL_HANDOFF_2026-10-25.md), [kế hoạch UI](docs/design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md) và [map máy đọc](docs/design/UI_FIGMA_TASK_MAP.json). G01–G05 đã có frame thật; không giao vẽ lại hoặc giữ trạng thái chờ thiết kế. Chỉ phần bổ sung cần làm lại mới đổi Done sang Needs Update; Todo/Review/In Progress giữ cột, và không suy lịch sử từ Needs Update. Đợt hiện tại đồng bộ task/spec/AC và GitHub Issues/Project; chưa sửa app, API, migration hay runtime. GM-02/05/09..14/24..31/33/34/35/39 vẫn giữ scope UI đã giao, reviewer Trí, assignee/Deadline/priority live. BE/Data producer sở hữu schema, contract, policy và projection; consumer tích hợp theo artifact/version/HANDOFF đã bàn giao. GM-03 vẫn là runner QA Auth+REST/worker. P1/P2 và Dark redesign giữ nguyên phạm vi đã chốt.

**Đồng bộ BE/Data theo UI Figma — 2026-10-25:** xem [handoff UI–BE–Data hiện hành](docs/project/UI_BE_DATA_SYNC_HANDOFF_2026-10-25.md), [ma trận kiểm runtime trước đó](docs/project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md), [task UI đã chốt](docs/design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md), [GM-07.B](docs/architecture/DISH_SESSION_API_CONTRACT_B.md) và [ADR-020](docs/architecture/decisions/ADR-020-public-top-three-result.md). Bình chọn, ACK/retry, hai vòng, cap, waiting, Top 3/history và bảo mật phiếu giữ đúng luật đã chốt dưới đây. Các quy tắc là yêu cầu cho version/policy mới, không chứng minh runtime đã triển khai; contract B đã có runtime v4 trên main, nhưng chỉ coi từng phần đã đạt khi có artifact/version/HANDOFF và kiểm đúng AC; audit lịch sử bên dưới không là hiện trạng runtime.

Khẩu vị được lưu mặc định theo tài khoản và chụp riêng cho từng phòng; chỉ chính người đó xem lựa chọn thô. Preference ranking là nâng cao, không chặn luồng chính; khi làm ranking, mọi thành viên ngang trọng số, không ưu tiên host và tách khỏi WANT/OK. Giá hiển thị lấy observation mới nhất theo timestamp hợp lệ; amount/currency/unit/source có thể null, amount null hoặc timestamp trùng thì ẩn giá, không fallback cũ. Google Places gọi trực tiếp từ app chỉ sau khi có winner; dùng config/key restrictions, attribution và quota theo task, không thêm proxy BE. Không đổi giá thành giá/người, không bịa món/nhãn/giá/ảnh và không lọc pool theo quán/GPS/giờ bán.

Vòng 1 kiểm winner trước; nếu chưa có winner, lấy survivors từ pool khóa trừ hợp NO của mọi ballot R1 hoàn chỉnh đã ACK. N=0 kết thúc `NO_CONSENSUS/EMPTY_INTERSECTION` tại R1; N>=1 luôn mở R2 thật, kể cả N=1. R2 là lượt quyết định REMOVE hoặc không REMOVE; với mọi N=1..20, cap cố định `max(1,floor(0.30*N))`, không auto-finalize, không tự ghi KEEP cho người chưa gửi; hết candidates thì `NO_CONSENSUS/ALL_REMOVED`, còn candidates thì chốt theo điểm R1. Không bù món, không mở R3; phiên v2/v3 đã pin giữ nguyên qua policy/migration version mới. Mốc 60 giây bắt đầu khi người đầu tiên hoàn tất lượt và vào waiting sau ACK. Top3 theo ADR-020. Places + Google Map hiển thị trong màn kết quả cho món thắng; mở Google Maps là hỗ trợ, không thay Places/map trong app. Dark của supplement này hoãn; giữ nguyên AC accessibility và capability hiện có.

**Làm rõ của Trí về kết thúc chờ — 2026-10-25:** Host chỉ kết thúc sớm thời gian chờ của vòng hiện tại khi số thành viên có ballot hoàn chỉnh đã ACK lớn hơn một nửa roster đã khóa: A_r > M/2, tương đương A_r >= floor(M/2)+1. Host không chọn hoặc ép món thắng; server tự tính chuyển vòng/kết quả. Đồng hồ riêng mỗi vòng bắt đầu tại lần vào waiting hợp lệ đầu tiên sau ACK, deadline = waitingStartedAt + 60s. Người khác vẫn gửi trước deadline. Hết 60s, server xử lý các ballot hợp lệ đã nhận theo quorum timeout tối thiểu 1, không áp ngưỡng quá nửa của thao tác host cho timeout. Mất mạng/reconnect không giảm M hoặc gia hạn deadline. Đây là yêu cầu policy mới, không đổi semantics phiên v2/v3 đã pin. GM-19 cung cấp admission helper dùng chung; GM-22 nhận helper đó để xử lý lời mời, không tạo dependency GM-19 → GM-22.

### Trạng thái triển khai và evidence theo phiên bản

- `0026_dish_session_policy.sql` giữ v3 cho phiên cũ. `0027_dish_session_v4.sql` cùng0028–0031 đã triển khai v4/GM-07.B, Top3, waiting và account consent; các ghi chú “main chỉ có v3/chưa có v4” trong audit25/10 là lịch sử. GM-07 vẫn cần khép schema/examples/semantic checker và handoff; không coi runtime hiện có là đủ mọi AC.
- Runtime v4 result/history dùng `dish_v4_private`. `0032_canonical_result_storage.sql`/schema0.10.0/GM06.3 là model độc lập; không tự chuyển reader hoặc double-write vì thấy bảng mới. GM-20/21 xử lý authority/ID/FK/adapter trong supplement đã giao.
- Catalogue GM-40 gồm39món draft/test_demo, không đại diện production hoặc đủ mọi bữa. Projection taxonomy/ảnh/giá và nullable theo handoff, không bịa để đủ pool.
- UI node đã chốt và được gắn trong20task; màn/adapter cũ vẫn còn trên main. GM-02 nền fonts/router đã nhận quaPR137; GM-05/09 chỉ nhận partial, các task UI còn lại kiểm lại theo Figma và version producer thật.
- Báo cáo ngày28/10 đã tái hiện lỗi GM-19 trên QA riêng;27 HTTP compatibility hiện có vẫn đạt nhưng không bao phủ các ca mới. Evidence đó không thay kiểm Android/visual hoặc nghiệm thu supplement.

Theo ADR-019 và các làm rõ ngày 2026-10-25: tối đa 20 người; host chọn chính xác 10–20 món ban đầu; bỏ ready; chờ 60 giây từ người đầu tiên hoàn tất lượt và vào phòng chờ kết quả mỗi vòng; host có Chốt ngay; chọn pool không phụ thuộc vị trí/quán. Sau khi kiểm winner R1, N=0 kết thúc `EMPTY_INTERSECTION`; N>=1 luôn mở R2, kể cả một món. Trong R2 người chơi tự quyết REMOVE hoặc không; cap `max(1,floor(0.30*N))` áp dụng cả N=1. Không auto-finalize, không tự sinh KEEP cho người chưa gửi; REMOVE hết thì `ALL_REMOVED`, còn món thì chốt theo điểm R1. Không bù món hoặc mở R3. Cap cũ `min(3,floor((N-1)/2))` và chính sách N=1 bỏ REMOVE là lịch sử, không dùng cho policy mới. Legacy v2/v3 giữ nguyên đến migration/version mới. Places + Google Map thuộc màn kết quả cho winner; Google Maps link không thay Places/map trong app. Dark của supplement hoãn; kiểm thiết bị vẫn Not run đến khi chạy thật.

Trí (`ThanhTris`) review tất cả task, bao gồm task Trí trực tiếp làm; không yêu cầu review chéo hoặc người kiểm độc lập theo ADR-013. Không tự thay reviewer hoặc ghi approval thay Trí.

Trước code: task có owner, reviewer Trí (ThanhTris) kể cả khi Trí là owner theo [ADR-013](docs/architecture/decisions/ADR-013-project-owner-final-review.md), scope, AC, spec, patch/test plan và contract version. Theo ADR-011 và xác nhận của Trí ngày2026-10-28, `start_dependencies` chỉ chấp nhận `Done` trên GitHub Project #2; Needs Update không mở dependency. Không bắt đồng bộ Done/Approved trong Markdown để mở task. Được viết phần độc lập dù `merge_dependencies` chưa xong. Trước tích hợp/merge cần cả hai loại dependency ở Done trên Project, đủ output/HANDOFF, đúng contract/manifest/artifact trên nhánh đích, kiểm PR/commit và test thật. GM-00 là baseline lịch sử, vẫn kiểm approval local. Theo ADR-009, parallel_with không có quan hệ start trước/sau. GM-01 roadmap-v2 đã được chủ dự án xác nhận duyệt ngày 2026-10-10, xem docs/evidence/roadmap-v2/GM-01/REVIEW.md; không thay approval của task sau. Chạy `python scripts/task_readiness.py --task GM-XX` trước code; trước merge thêm `--gate merge --base-ref origin/main` sau cập nhật ref. Checker chỉ đọc Project, không tự fetch/merge, duyệt hoặc đổi trạng thái.

Theo chủ dự án ngày 2026-10-13/[ADR-014](docs/architecture/decisions/ADR-014-test-data-and-baseline-project-card.md), baseline GM-01 dùng Done của card GM-00/#37 trên Project (alias pin trong tasks/project-gate.json), không tìm card GM-01/#100. Scope/artifact GM-01 vẫn riêng; GM-00 lịch sử kiểm local. GM-08 nghiệm thu bundle thật trên DB test: không bắt verified publish/review độc lập/coverage/anchor đầy đủ hoặc bổ sung lịch từng món/serviceMode chưa biết. BE nhận bundle test/query/version/hash ngay; thiếu đầu vào lọc trả unknown/empty, không bịa. Luật địa điểm/giờ chỉ giữ cho legacy eligibility, không đưa lại vào pool dish-only mới. Manifest verified0 và production publish guards giữ nguyên; hồ sơ Pending đời trước không mở lại task.

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
- Với luồng legacy food eligibility, offering/coverage/lịch theo FOOD_DATA_SPEC vẫn là yêu cầu của flow đó. Với policy chọn món mới theo ADR-019, tạo pool **độc lập quán, offering, coverage, giờ bán và GPS**; dùng catalogue món, host chọn chính xác 10–20 món, áp dụng ưu tiên mềm đã chốt trong contract. Thiếu thông tin là unknown, không suy diễn hoặc bịa để đủ pool. Places/map là chức năng sau khi có winner, không lọc pool.
- OCR/AI/weather/mood/fairness qua nhiều bữa là mở rộng, không chặn MVP. Ảnh cần quyền sử dụng; không tuyên bố an toàn dị ứng từ tên món.

## Chuẩn bị dữ liệu legacy GM-03 → roadmap-v2 GM-04

[Handoff hiện hành](docs/evidence/roadmap-v2/GM-04/HANDOFF.md) đối chiếu nhánh data cũ với roadmap-v2. GM-03 hiện tại là BE structure của Trí; không thay task đó bằng metadata dữ liệu. GM-03 roadmap-v1 nhận scope tại GM-04/GM-07; verified import là GM-08; food eligibility là GM-18. Các quy tắc offering/coverage ở tài liệu legacy chỉ áp dụng flow cũ; policy chọn pool dish-only theo ADR-019 không phụ thuộc địa điểm/quán/giờ bán. [Đồng bộ v1 lịch sử](docs/evidence/roadmap-v1/GM-03/MAIN_SYNC.md) và evidence đời trước giữ nguyên, mã cũ không là task hiện tại.

Đọc [handoff dữ liệu](data-preparation/docs/HANDOFF.md), [taxonomy](data-preparation/docs/TAXONOMY.md), [dictionary](data-preparation/docs/DATA_DICTIONARY.md) và [forms](data-preparation/templates/README.md) cho nguồn/ID/nullable/CSV/JSON/validator. [Catalogue](data-preparation/docs/EDITORIAL_CATALOGUE.md) có 39 món draft, giá theo menu; artwork chưa review giữ null. Giữ snapshot/cache/pilot nguyên trạng, mặc định offline, không gọi lại AI hoặc dùng làm verified seed. Contract v2 đề xuất ở [dictionary food/core](docs/data/FOOD_DATA_DICTIONARY.md), [field coverage](docs/data/FIELD_COVERAGE.md), schema/template trong supabase/seed/templates và [cases GM-04](tests/fixtures/food-v1/README.md). Chạy `python scripts/validate_field_contracts.py --cases` và `python scripts/build_field_contracts.py --check`; food adapter 1.1.0 không đổi snapshot 1.0.0. [Checks GM-04](docs/evidence/roadmap-v2/GM-04/CHECKS.md) là contract assertions, chưa SQL/RPC/eligibility hoặc approval.

[Fixtures food](tests/fixtures/food-data-v1/README.md) mô phỏng cho eligibility GM-18, fixtureOnly=true, clock cố định; verified/reviewer/license chỉ mô phỏng, không nghiệm thu parity. [Review package lịch sử](docs/evidence/GM-03/REVIEW_PACKAGE.md) cho Tâm; chạy `python data-preparation/scripts/validate_data_preparation.py` để audit chỉ đọc. validStructure không là approval/publish/freshness hiện tại.

## Engine legacy GM-06 → roadmap-v2 GM-15

[Contract engine](mobile/src/domain/decision/README.md) và [handoff hiện hành](docs/evidence/roadmap-v2/GM-15/HANDOFF.md) mô tả baseline decision-v2/v3; chúng không thay yêu cầu mới đã nêu ở AIDD. Domain fixture/version legacy và runtime SQL v4 phải được phân biệt; fixture/test baseline Pass không tự chứng minh toàn bộ policy/Top3 supplement và SQL-domain parity đã đạt. Bổ sung GM-15 phải giữ vote WANT/OK/NO, điểm R1 `2*WANT+OK`, winner ổn định và implement policy mới có version; R2 chỉ REMOVE hoặc không REMOVE, không cộng điểm. Persist/ACK/retry/secure seed và SQL parity thuộc GM-20. Giữ nguyên phiên bản v2/v3 đã pin; không sửa GM-02 package/config/runner hoặc tự approve. [Fixtures](tests/fixtures/decision-v2/README.md) là bằng chứng đúng phiên bản được ghi trong [CHECKS](docs/evidence/roadmap-v2/GM-15/CHECKS.md); chạy `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` với Node24 khi task yêu cầu. GM-06 hiện tại là schema của Tâm. Gate dùng GitHub Project theo ADR-011; thiếu quyền đọc Project không là dependency chưa bàn giao.

## Bàn giao

Đầu ra theo docs/project/TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md: UI mở Expo thấy/tương tác các mục task; BE có Postman/curl/runner input-response-assertions thật (nền/contract/domain kiểm đúng stage); Data đủ field/schema/template/fixture/version để BE làm song song. Mỗi task có CHECKS.md + HANDOFF.md; API task có request suite supabase/tests/http/GM-XX.http. Not run/Fail của AC bắt buộc chặn Done; placeholder/docs CI không thay output thật. Shell Expo Go không bị native module crash; tính năng không hỗ trợ Expo Go cần development/native build evidence riêng. Plan cấu trúc đã được chủ dự án xác nhận tại docs/project/FOUNDATION_IMPLEMENTATION_PLAN.md, không thay approval baseline/package.

GM-39 hiện là handoff Figma/kiểm thiết kế bổ sung theo final handoff 2026-10-25; HTML cũ giữ tham chiếu, không ép sửa HTML để mở task app. Kiểm node/link/component/state, screenshot và gap log bằng Figma MCP, không báo Expo/API/native Pass từ tài liệu thiết kế. Không thêm dependency GM-39 vào task số nhỏ. G01–G05 đã có frame; GM-14/35 dùng node hiện có và chỉ bổ sung variant mới khi có gap cụ thể, GM-39 hỗ trợ consistency; Trí review. Các quy tắc HTML cũ chỉ áp dụng evidence baseline tương ứng.

Chạy `python scripts/validate_repository.py`, regression `python -m unittest discover -s tests -p "test_*.py"`, `python scripts/task_readiness.py --check-docs`, kiểm diff và evidence. Sau đổi metadata task sinh lại indexes bằng `--write-docs`. Project Done nghiệm thu toàn scope; Needs Update giữ lịch sử baseline nhưng không mở dependency khi supplement còn chờ. AI không tự chuyển Done. Nếu chuyển task Markdown vào tasks/done thì vẫn phải có Decision Approved, reviewer Trí/ngày và Review-evidence thật, không tự tạo để khớp board. Validator/indexes là offline, không mở task. `--approval-source local` chỉ chẩn đoán lịch sử, không là cách vượt gate Project. Thiếu credential/quyền read:project/mạng hoặc item không xác minh được phải chặn, không dùng Issue Closed hay cache thay Done/Needs Update. Xem docs/project/PROJECT_READINESS.md. HTML phải ghi rõ mô phỏng; native build có evidence riêng. Không sinh tài liệu đề tài cũ để vượt kiểm tra. Sinh Word mới khi có yêu cầu/template chốt.

Không tự commit/push nếu chưa được yêu cầu. Validator không thay review thực tế của Trí.

## GM-20 — submit/finalize patch

Đọc [handoff](docs/evidence/roadmap-v2/GM-20/HANDOFF.md) và [storage supplement](docs/evidence/roadmap-v2/GM-20/CONTRACT_STORAGE.md) cho baseline GM-20.3/schema0.5.0, request/intent replay, wire IDs, private seed, scoped consent writer và event/inbox. Đây chưa phải bằng chứng runtime đã đáp ứng policy v4, Top 3/history hoặc luật R2 mới; đối chiếu báo cáo audit và contract version trước khi tích hợp. Chạy `node scripts/gm20_http_check.mjs` trên Supabase local: owned disposable DB/JWT thật; `--bruno` giữ fixture và `scripts/gm20_http_stop.mjs` cleanup. Runtime private luôn ignore; không log votes/token hoặc reset DB ứng dụng. SQL/domain/HTTP evidence không thay Android GM-26/27/31 hoặc review Trí. Trước gọi helper history/event, kiểm đúng definition/version đã có trên target và DB; không suy implementation từ số migration hoặc ghi Done/Approved.

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


## GM15.3 — v4 pure domain

Read [current v4 handoff](docs/evidence/roadmap-v2/GM-15/v4/HANDOFF.md) before receiving
new decision vectors. `dishPolicyV4.ts` is opt-in; v2/v3 unchanged. Test with
`node --test mobile/tests/dishPolicyV4.test.mjs` and export synthetic input/expected/actual
using `node mobile/scripts/check-dish-v4.mjs --report /tmp/dish-v4.json`. The evaluator
receives only complete ACKed ballots after GM20 authorizes evaluation. Its private
candidate sets/seed/cohort are not a public snapshot; SQL/transaction/quorum/clock/
secure entropy/persisted retry remain GM20 scope. No automatic Done or API rollout.
