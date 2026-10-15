# GM-09 — đối chiếu guideline và làm lại UI

2026-10-13. Owner Tuấn (`mtuan2491`), reviewer Trí. Scope là màn mock Home/Create/Join GM-09; code ở HEAD `9e9f5ba` + working tree chưa commit. Yêu cầu hiện tại cho phép sửa UI và xóa `.agents/` tự tạo. Không tạo rules/skills mới, không chuyển Done hoặc ghi approval.

## Kiểm GitHub trước patch

Đã đọc Project #2 live bằng credential hiện có; không dùng Issue Closed hoặc cache làm bằng chứng Done. Đã đọc issue nền và comments; #63/#66/#68 không có comments bổ sung. GM-09 #70 có assignee `mtuan2491` và nhãn `assignment:accepted`; reviewer theo AGENTS/ADR-013 là Trí.

| Task / issue | Status trên Project | Input được dùng |
| --- | --- | --- |
| [GM-02 #63](https://github.com/ThanhTris/IE307/issues/63) | Done | Expo shell/routes/config/runner hiện có |
| [GM-05 #66](https://github.com/ThanhTris/IE307/issues/66) | Done | Tokens, shared components, component map/HANDOFF |
| [GM-07 #68](https://github.com/ThanhTris/IE307/issues/68) | Done | API DTO/client/mock đúng contract, HANDOFF |
| [GM-09 #70](https://github.com/ThanhTris/IE307/issues/70) | Todo | Task đang sửa; không tự đổi status |
| [GM-39 #107](https://github.com/ThanhTris/IE307/issues/107) | In Progress | Brief cải thiện HTML; chưa là design app mới được duyệt |

Readiness trước code: `READY_TO_CLAIM`, checked at `2026-10-13T07:38:01.320761+00:00`. Đã xác minh PR #109 merge `9e9f5ba`, #104 merge `0711782`, #105 merge `9f71bba`: trạng thái MERGED, các commit là ancestor HEAD. GM-05.1/GM-07.1 có code và HANDOFF trên nhánh hiện tại.

## Mẫu và hướng dẫn tìm được trong project

| Nguồn | Cách áp dụng |
| --- | --- |
| [AGENTS.md](../../../../AGENTS.md), [workflow](../../../project/TEAM_WORKFLOW.md), [DoD](../../../project/DEFINITION_OF_DONE.md) | Scope/task/dependency/ownership, không tự nghiệm thu |
| [UI_SPEC](../../../specs/UI_SPEC.md) | Hành vi, manual fallback, validation, accessibility, mock rõ nhãn |
| [UI_DESIGN_SPECIFICATION](../../../specs/UI_DESIGN_SPECIFICATION.md) | Header, cam ấm, hero, CTA/avatar, buổi/giờ và join hai chế độ |
| [Prototype chính](../../../../design/prototypes/gi-cung-duoc.html) | Home hero bát món ăn, copy “Đói rồi, mình ăn gì đây?”, CTA; form và ô xem mã |
| [COMPONENT_MAP](../../../design/COMPONENT_MAP.md), [HANDOFF GM-05](../GM-05/HANDOFF.md) | Dùng lại AppHeader/Button/FormField/Chip/AvatarRow/Notice/SheetDialog và tokens |
| [DESIGN_SYSTEM v0.1](../../../../design/DESIGN_SYSTEM.md) | Tài liệu nền; palette khác bản spec chi tiết và GM-05, không thay token hiện hành bằng palette này |
| [UI_IMPLEMENTATION_PLAN](../../../project/UI_IMPLEMENTATION_PLAN.md), [notes chuyển RN](../../../../design/prototypes/UI-IMPLEMENTATION-NOTES.md) | Component trước màn mock; không copy DOM/CSS hoặc tự nối native/API |
| [UI_REFINEMENT_BRIEF](../../../design/UI_REFINEMENT_BRIEF.md) | Brief GM-39 đang chờ duyệt, chỉ tham khảo ràng buộc sản phẩm; không sửa HTML/app theo design mới chưa bàn giao |

## Thay đổi so với bản GM-09 đã lưu

| Phần | Trước | Sau |
| --- | --- | --- |
| Home | Greeting/CTA nối tiếp nhiều notices; thiếu hero theo mẫu | Hero nền warm với bát món ăn, greeting/headline và hai CTA, card avatar; privacy copy ngắn |
| Create | Một danh sách dài field/chip và hướng dẫn kỹ thuật | Heading “Hẹn nhau bữa nào?”, card buổi/giờ, điểm ăn/bán kính, ngân sách; confirm/validation/CTA rõ |
| Join | Form thuần và notice QR | Hai chế độ nhập/quét; card mã với sáu ô xem trước và TextInput thật theo charset chữ/số; khung camera minh họa có nhãn |
| Review tools | Fixture và cấu trúc luôn hiện | Disclosure Công cụ kiểm thử, mặc định đóng; state expanded/disabled cho accessibility, giữ các fixture lỗi |
| `.agents/` | Thư mục rules/skills tự tạo, untracked | Đã xóa toàn bộ khỏi workspace; manifest không còn agentRules |

Presentation mới đặt trong feature `RoomEntryFrame.tsx`, dùng tokens/component upstream. Screen giữ repository/callback hiện có. Đã giữ nguyên logic validation/timezone/context confirmation/idempotent retry/receipt; join luôn xác nhận trước gửi. Không suy online từ Friend.status, không xin GPS/camera, không tạo QR giả có thể dùng để vào phòng.

Paths sửa trong lượt này: HomeScreen, CreateRoomScreen, JoinRoomScreen, RoomEntryFrame, tests component/routes và evidence/report GM-09. Shared UI/theme, API contracts/mock/client, package/config/lockfile, backend, HTML/spec và tasks không đổi. `npm ci` chỉ đồng bộ dependencies đã chốt, không thêm package. Routes/hooks/services/receipt đã có trước được giữ nguyên nội dung.

## Chạy và kiểm

Từ root:

```powershell
cd mobile
npm start
```

Expo Go Android SDK57 cùng LAN. Home → Tạo kèo ăn → nhập tên/chọn điểm ăn/xác nhận → tạo; hoặc Tôi có mã phòng → tên/mã GCD234 → Vào phòng → xác nhận. Back về Home và resume receipt. Mở Công cụ kiểm thử để đổi fixture; đổi scenario remount màn nên mở lại disclosure để đổi tiếp. Create có thử GPS-denied và cập nhật giờ mẫu trong disclosure. QR chỉ minh họa và manual fallback.

Typecheck/lint/architecture, 10 suites/343 tests và Android Hermes export Pass. Validator/index/diff/hash/scope kiểm ở [output cuối](UI_REWORK_DOCS_AND_DIFF.txt). Python regression Fail 1 failure/5 errors Windows. Expo Go Android thực tế, ảnh/video, dark/font200/TalkBack/keyboard/hardware Back **Not run** vì không có device hoặc kết quả kiểm mới. Các target font scaling/touch/dark trong source chưa là bằng chứng visual native. Xem [CHECKS](CHECKS.md), [HANDOFF](HANDOFF.md), [manifest](PATCH_MANIFEST.json).
