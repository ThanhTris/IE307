# GM-09 — phạm vi triển khai

## PNG reference repair — 2026-11-02

User supplied local exports to correct the unverified visual implementation.
Read foundations/components and every supplied group/scenario overview; split
the screen strips for inspection, reuse local assets, correct brand/entry,
separate join states, rebuild the tutorial scenes and rerun regression/export.
See [executed patch plan, mapping and limits](figma-update/PNG_REFERENCE_REPAIR.md).
No new task/API/domain/producer ownership is inferred from scenario screenshots.
Native visual acceptance and the missing GM-10/live-preview artifacts remain open.

## Remaining steps received and committed locally — 2026-11-01

The user's current instruction makes Figma a visual reference and authorizes
small required UI additions plus a local commit per step, no push/Figma writes.
Steps3–6 source: `fea0696`, `fde3757`, `1b86133`, `a4dbdec`; step7 records handoff.
See [final scope and acceptance matrix](figma-update/FINAL_HANDOFF.md) and
[gap report](figma-update/REMAINING_GAPS.md). UI-only work remains separate from
GM-10 setup/GM-07 preview/GM-25 integration and GM-31 persistence. No unsupported
producer was rebuilt or silently substituted; real legacy routes remain pinned.
Required native checks/unreceived integrations remain open, not GM-09 approval.

## GM-09.2 step 2 — 2026-11-01

Base `8172241`, branch `codex/gm-09-figma-update`; owner Tuấn/reviewer Trí.
Start gate checked live at 2026-11-01T15:10:54Z: READY_TO_CLAIM. After account
reconnection, received full Figma context/screenshots from the authorized Draft
for Home `33:3`, continue `277:2140` and guest expiry `277:2190`, using the existing
GM-09 Figma session. Use existing GM-05 UI/Inter and GM-07.1 repository contracts.

Patch: align Home asset slots, spacing and CTA geometry; separate friends states
from session availability; verify a saved room receipt using the existing member
snapshot read before offering continuation; add native continue/expiry screens;
move Home QA controls into a development route with explicit fixed fixtures.
Real active-room discovery/durable cache remain GM-25/31 producer seams, not a new
storage or API implementation. Preserve guards/callbacks, source data/privacy and
legacy regression. No setup/join/tutorial rewrite, dependency or migration change.

Tests: loading/error/empty friends independently of create/join, session guards,
room verification/retry/terminal/non-member/wrong-room/stale-response behavior,
read-only continue/expiry actions and full-button press/navigation. Run focused
Jest, typecheck/lint/architecture, Expo compatibility/export and repository checks.
Record Android visual/a11y/device checks as Not run until actually exercised.

## GM-09.2 step 1 — 2026-10-31

User requests only welcome/guest entry from the received Figma copy. Current branch `codex/gm-09-figma-update`, base `621accc` + working tree; owner Tuấn/reviewer Trí unchanged. Live start gate `READY_TO_CLAIM`; receive existing GM-05 and GM-07 artifacts. Patch plan: native welcome → explicit name confirmation → existing Home; preserve GM-25 auth/recovery guards, use separate in-memory mock entry state, reuse local logo/shared buttons/forms and export individual Figma decorations. No new dependency, auth engine, persistent cache, setup/lobby/QR/tutorial implementation or wire/migration change.

Tests target validation, Unicode, duplicate/pending/ACK, late responses, Back, recovery/reset, zero mock auth/room mutations and existing routes/shared consumers. [Step 1 changes, results and reproduction](figma-update/STEP1.md); [visual reference/gaps](FIGMA_PARITY.md). Earlier plans/results below remain historical; their HTML/GM-39 instructions do not define this supplement. No commit/push or approval is performed.

## Chuẩn bị bàn giao review theo yêu cầu hiện tại — 2026-10-15

Người dùng xác nhận GM-09 kiểm thành công và hoạt động, yêu cầu cập nhật Markdown rồi hướng dẫn tự commit/push để Trí review/merge. Chỉ dẫn hiện tại không yêu cầu ảnh/video UI; ghi [biên bản văn bản](MANUAL_DEVICE_CHECK.md), giữ thông số/ca chi tiết chưa báo ở trạng thái chưa xác nhận, không tạo dữ liệu đo hoặc approval.

Lượt này chỉ cập nhật CHECKS/HANDOFF/PLAN, báo cáo hiện hành, phần báo cáo trong task và body PR; bổ sung manifest hashes source/test đã kiểm. Không sửa source/test, task metadata, Project hoặc quyền quyết định của Trí. Start gate live `2026-10-15T12:56:34.670228+00:00`: `READY_TO_CLAIM`; nhánh/PR remote cùng tên chưa có tại thời điểm đọc. Chạy validator, Python regression, check-docs, diff và kiểm manifest; không lặp mobile tests khi source/test không đổi. Chỉ Trí được merge và chuyển Done. Agent không commit/push/tạo PR trong lượt hướng dẫn này.

## Sửa tiếp sau phản hồi thiết bị: hai CTA mất phản hồi — 2026-10-15

Người dùng kiểm Expo Go sau patch box-only và báo cả hai CTA không bấm được. Patch trước không đạt trên thiết bị; không giữ giả định Jest Pass là native Pass. Gate Project live trước code `2026-10-15T12:37:55.766142+00:00`: `READY_TO_CLAIM`; owner Tuấn, reviewer Trí, GM-09.1/GM-05.1 không đổi.

Plan thay thế trong AppButton: bỏ pointerEvents override; giữ Pressable mặc định và một onPress duy nhất. Chuyển padding ngang từ khung sang nhãn, cho nhãn stretch toàn chiều ngang và cao tối thiểu 46dp (khung 48dp gồm border 1dp mỗi cạnh), căn chữ giữa. Phần chữ đã nhận chạm trên thiết bị ở bản ban đầu nay có native layout phủ lòng nút; không dùng hitSlop, thêm nút lồng, hoặc bỏ guard disabled/loading. Không đổi palette, kích thước tối thiểu hoặc API props.

Kiểm hành vi bấm nhãn/khung chỉ gọi callback một lần, disabled/loading không gọi; chạy mobile check/export Android và các kiểm repo/regression bắt buộc. Kiểm trái/giữa/phải trên Expo Go vẫn cần kết quả thật từ thiết bị. Scope bổ sung chỉ shared AppButton, shared component tests và evidence GM-09; giữ mọi sửa local trước đó.

## Sửa vùng nhận chạm nút theo báo lỗi Expo Go — 2026-10-15

Người dùng báo hai CTA tạo phòng/nhập mã chỉ phản hồi khi chạm chữ, yêu cầu cả khoảng trống hai bên trong nút nhận chạm. Owner Tuấn, reviewer Trí; contract GM-09.1 giữ nguyên. Gate Project live lúc `2026-10-15T12:17:52.191954+00:00`: `READY_TO_CLAIM`, upstream GM-05/07 đủ đầu vào.

Patch nhỏ được yêu cầu hiện tại cho phép sửa `mobile/src/shared/ui/components.tsx` (producer GM-05): AppButton chỉ chứa nhãn, đặt `pointerEvents="box-only"` trên Pressable để toàn bộ khung nút là đích chạm duy nhất. Giữ layout/tokens, handler, accessibility label, disabled/loading; không thêm wrapper/nút lồng hoặc mở hitSlop ra ngoài nút. Thay đổi dùng chung áp dụng cho các AppButton hiện có, cần reviewer đối chiếu consumers trong mobile check.

Kiểm typecheck/lint/Jest/architecture bằng `npm run check`, repo validator/Python regression/check-docs/diff. Không thêm test chỉ lặp prop hoặc coi Jest là kiểm native hit testing. Kiểm trực tiếp Expo Go: bấm trái/giữa/phải trong nền của cả hai CTA phải mở đúng form; vùng ngoài nút không kích hoạt, disabled không điều hướng, kéo cuộn không kích hoạt nút. Chưa có thiết bị để tái hiện; ghi Not run cho xác minh native đến khi người dùng kiểm lại. Kết quả bổ sung ở CHECKS/HANDOFF; evidence lượt hoàn thiện trước được giữ nguyên.

## Hoàn thiện theo yêu cầu hiện tại — 2026-10-15

Người dùng yêu cầu kiểm lại GM-09, downstream và các UI đã Done rồi hoàn thiện. [Audit và patch/test plan bổ sung](COMPLETION_REVIEW_2026-10-15.md) ghi trạng thái Project live, UI GM-02/05/12 và scope code trước khi sửa. Không thay owner/reviewer/contract hoặc nghiệm thu các task sau. Các plan bên dưới là lịch sử.

Issue [#70](https://github.com/ThanhTris/IE307/issues/70); owner Tuấn (`mtuan2491`), reviewer Trí. Người dùng yêu cầu triển khai qua `prompt.txt`; issue có `assignment:accepted` ngày kiểm 2026-10-12. Không đổi task/Project hoặc tự nghiệm thu. Contract `food-v1/roadmap-v2/GM-09.1`.

Start gate đọc Project lúc `2026-10-12T16:42:58Z`: `READY_TO_CLAIM`; local còn proposed, GitHub đã accepted. GM-05/07 Done và output/HANDOFF có trên base `9e9f5ba67899ea162b79b5c6ac17cd5479c505da`. Nhận GM-05.1 qua PR #109 và GM-07.1 qua PR #104/#105; không dùng snapshot `.agents` làm nguồn hiện hành.

| Paths | Phạm vi / producer / consumers | Phân loại |
| --- | --- | --- |
| `mobile/src/features/home/screens/HomeScreen.tsx` | UI-01; GM-09 → GM-25 | SAFE |
| `mobile/src/features/rooms/{screens,components,hooks,services}/` | UI-02/03, form/receipt/error mapping, interface camera; GM-09 → GM-10/11/25/30 | SAFE |
| `mobile/src/bootstrap/roomPreview.tsx` | Chọn mock tường minh và fixture in-memory; không thêm provider | SAFE |
| `mobile/src/app/{index,create-room,join-room,room-preview,shell}.tsx` | Route/composition của màn task; giữ shell GM-02 tại `/shell`; không đổi layout/package | SAFE trong yêu cầu triển khai GM-09 |
| `mobile/tests/{component,integration,unit}/` | Assertions validation, request/response, loading/errors, navigation/back | SAFE |
| `docs/evidence/roadmap-v2/GM-09/`, `GM-09-report.md` | Plan/checks/handoff/output của task | SAFE |
| `.agents/` | Đã xóa toàn bộ thư mục tự tạo theo yêu cầu hiện tại ngày 2026-10-13; không dùng làm nguồn rules/skills | Đã thực hiện theo ủy quyền |
| shared UI/tokens, API contracts/mock/client, package/config/lock, backend, màn task khác | Chỉ dùng upstream; không thay interface hoặc dựng task khác | OUT_OF_SCOPE cho patch này |

## Patch/test plan

- Home guest/avatar preview, CTA và active receipt; create dùng `displayName` theo DTO (không tự thêm room title), anchor công cộng/radius/giờ/buổi/budget tối thiểu, host xác nhận; join chuẩn hóa mã 6 ký tự theo charset GM-07 và xác nhận trước request.
- Screens nhận interface repository/callback; composition dùng GM-07 mock. Success hiển thị receipt và seam sang preferences/lobby, không triển khai GM-10/11. Camera chỉ action interface/placeholder + manual fallback; không xin quyền thật.
- Fixture success/loading/empty/network/full/locked/expired/lost-session/outside/quota/stale; thao tác đổi fixture không cập nhật server. Giữ draft, không sinh winner/ready/offline room.
- Kiểm validation/null/timezone, double-submit, retry giữ requestId/payload, loading/error/receipt, route/back và dark/accessibility qua tests. Chạy mobile check, Android bundle, repo validator/regression/index/diff. Expo Go Android/font200/TalkBack cần thiết bị thật; ghi Not run nếu không có.
- Trí review revision working tree và nghiệm thu Expo Go sau triển khai. Plan này ghi quyết định implementation theo scope người dùng đã giao, không ghi approval của Trí.

## Làm lại UI ngày 2026-10-13

Yêu cầu hiện tại: kiểm issue UI đã Done và tài liệu/mẫu trong project trước khi sửa Home/Create/Join; xóa `.agents/` tự tạo. Nguồn hiện hành là `AGENTS.md`, workflow/DoD, task/AC, `UI_SPEC.md`, `UI_DESIGN_SPECIFICATION.md`, `COMPONENT_MAP.md` và prototype chính. Không tạo rules/skills thay thế.

Readiness live lúc `2026-10-13T07:38:01.320761+00:00`: `READY_TO_CLAIM`. Project #2: GM-02 #63, GM-05 #66, GM-07 #68 Done; GM-09 #70 Todo, assignee `mtuan2491`, nhãn `assignment:accepted`, reviewer Trí. Issue nền #63/66/68 không có comments bổ sung khi đọc. PR #109/#104/#105 đã merge; cả ba merge commit là ancestor của HEAD.

Phạm vi patch: ba screen GM-09, presentation trong `RoomEntryFrame.tsx`, tests interaction/routes liên quan và evidence GM-09. Dùng lại shared UI/tokens và API/mock đã bàn giao; không sửa chúng. Home nhận hero/CTA/avatar theo mẫu; Create nhóm buổi/giờ, điểm ăn, ngân sách; Join trình bày mã chữ/số và khung camera minh họa. Thu gọn fixture/tooling dưới nút Công cụ kiểm thử; giữ validation, xác nhận, retry và các callbacks hiện có.

GM-39 #107 đang In Progress; `UI_REFINEMENT_BRIEF.md` là brief prototype chờ duyệt, không là mẫu app mới đã nghiệm thu. `design/DESIGN_SYSTEM.md` v0.1 có palette khác bản đặc tả chi tiết; patch dùng palette của GM-05 hiện hành khớp `UI_DESIGN_SPECIFICATION.md`, không thay token upstream.

Kiểm: mobile check, Android export, repo validator/regression/check-docs/diff và kiểm các path ngoài scope bất biến. Expo Go Android, screenshot, font200/TalkBack/keyboard cần thiết bị; không lấy test/bundle làm bằng chứng native.
