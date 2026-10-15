# GM-09 — phạm vi triển khai

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
