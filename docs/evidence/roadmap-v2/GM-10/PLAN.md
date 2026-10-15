# GM-10 — context và preferences, kế hoạch triển khai

## Phản hồi bugs.md về ngày/giờ, ngân sách và xác nhận

Người dùng thay bugs.md bằng ba yêu cầu UI mới: tách ngày/giờ và chọn ngày gọn đẹp, budget một card riêng, confirmation có checkbox xanh. Gate live `2026-10-15T16:04:45.696281+00:00` READY_TO_CLAIM. Rà soát Markdown/task/UI_SPEC/UI_DESIGN_SPECIFICATION/CONTEXT_HISTORY_SPEC/FOOD_DATA_SPEC/COMPONENT_MAP và docs/evidence: không xung đột ba thay đổi presentation này. Giữ tokens/components GM-05, không thêm thư viện native/package, không áp palette/prototype GM-39 chưa giao vào app.

Thêm bộ chọn ngày inline: Hôm nay/Ngày mai theo server clock khi bấm, danh sách7 ngày mỗi trang có nút trước/sau và nhập YYYY-MM-DD cho ngày khác; mọi hàng chọn đủ48dp, text có thể wrap, không dùng lưới7 cột nhỏ vi phạm vùng bấm ở màn320dp. Giờ HH:mm riêng, nội bộ vẫn ghép thành UTC+7 desiredAt đúng contract; ăn ngay/buổi/retry giữ semantics đã bàn giao. Calendar chọn ngày chỉ sửa draft, không tự confirm/save; đổi date/time/budget bỏ confirm/preview. Confirmation whole-row Pressable role=checkbox, checked/disabled, ô xanh+dấu✓+text cho TalkBack/không chỉ dựa màu. Giữ khóa pending/stale/ACK/member và no double-write.

Kiểm regression custom date/time/leap/boundary/meal presets, day picker chọn/hủy/qua trang và server-day rollover, reset confirmation sau chỉnh ngày/giờ/budget, accessible checked/disabled, route/retry/reset-ready. Cập nhật HANDOFF/CHECKS/manifest và chạy mobile check/Android export/repo/Python theo scope; native sau UI mới vẫn cần người dùng thử, không ghi Pass từ Jest.

Kiểm cuối theo yêu cầu người dùng loại A6/A7/A8 khỏi scope GM-10: [FINAL_REVIEW](FINAL_REVIEW.md) đối chiếu AC/checklist/chuẩn output và UI chung, ghi logs FINAL chạy lại trên source không đổi. Không lấy các phần được giao GM khác làm lỗi riêng GM-10; native chưa xác nhận và check Expo online cần đối chiếu vẫn ghi kết quả thực, không tự nâng package hoặc approval.

Lượt rà soát theo yêu cầu người dùng sau sửa bugs.md: [REQUIREMENTS_AUDIT](REQUIREMENTS_AUDIT.md) đối chiếu lại issue GM-10/các consumers và UI/evidence, phát hiện A1..A8. Chưa sửa source trong lượt audit; cần xử lý và kiểm lại trước nghiệm thu, không suy từ test cũ Pass.

## Phân loại và sửa trong phạm vi GM-10 sau audit

Người dùng yêu cầu sửa phần thuộc GM-10. Gate đọc lại live `2026-10-15T15:15:15.102435+00:00`: READY_TO_CLAIM. Sửa A1..A5: action Chỉnh lại bối cảnh sau ACK/snapshot reload đúng room/version rồi tạo draft/intent mới; stale code độc lập validation text, khóa save tới reload; receipt dựa ownPreferences snapshot sau skip/retry; hiển thị distanceM có đơn vị/nhãn đường chim bay và unknown không giả0; tách callback Home khỏi Back và khóa cả hai khi pending/possible delivery. Thêm regression vào suite thật, giữ assertions khóa gửi trùng và reset-ready.

A6 là semantic palette/shared UI kế thừa GM-05, Trí chốt; không sửa shared tokens. A7 là mapping supplement reasonCodes từ API GM-18 trong adapter GM-24/25, A8 là presentation mode/copy và durable IDs của composition production GM-25; không tích hợp API/production hoặc thêm package ở lượt GM-10 này. Bàn giao nêu rõ việc consumer còn làm, không miễn AC của consumer. Chạy mobile check/Android bundle và checks repo/regression bắt buộc, cập nhật manifest/evidence. Expo Go sau sửa vẫn cần kiểm thực tế.

## Cập nhật base trước bàn giao

Lượt fetch cuối phát hiện Trí đã merge GM-09/#121 và GM-23/#118 vào main `30ecb5675104f13c64580018cad118647fb3d601`. Vì nhánh GM-10 chưa có commit riêng, đã backup toàn bộ thay đổi vào `.work/gm10-before-main-update`, fast-forward ref base lên main đã merge rồi áp lại working tree, không tạo commit/merge commit/push. Hai xung đột index và route tests được đối chiếu giữ Home/Create/Join/GM12/GM16 và thêm GM-10. Entry hiện ở Home → Công cụ kiểm thử → Chọn điểm ăn và khẩu vị; `/shell` cũng có entry. Hai provider GM-09/GM-10 độc lập, chưa giả là cùng phòng tích hợp GM-25. Các thông tin ce7b87a/PR121 chưa merge bên dưới là bối cảnh lúc bắt đầu; source/test hashes và checks cuối dùng base30ecb56.

Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`), contract `food-v1/roadmap-v2/GM-10.1`. Người dùng giao triển khai GM-10 ngày 2026-10-15; issue #71 có assignee Tuấn, nhãn assignment:accepted và không có comment bổ sung. Start gate live `2026-10-15T13:38:44.813080+00:00`: READY_TO_CLAIM; GM-05/07 Done và đủ HANDOFF/artifacts.

## Đầu vào đã đọc và lựa chọn base

- AGENTS, TEAM_WORKFLOW, DEFINITION_OF_DONE, FOUNDATION_IMPLEMENTATION_PLAN, TASK_OUTPUT_REQUIREMENTS; task/issue #71; UI_SPEC, UI_DESIGN_SPECIFICATION, ROOM_SPEC, CONTEXT_HISTORY_SPEC, FOOD_DATA_SPEC, COMPONENT_MAP và prototype phần preferences.
- Issue upstream #66/GM-05, #68/GM-07, #65/GM-04 và consumers #85/GM-24, #86/GM-25: đọc AC và mọi comment (đều chưa có comment). Nhận tokens/components GM-05.1 qua merge 9e9f5ba; DTO/client/mock GM-07.1 qua 0711782/9f71bba. Dictionary/taxonomy phân biệt cuisine/origin/nơi bán và temperature/flavor.
- Nội dung issue còn câu lịch sử bắt reviewer độc lập/local Approved; áp dụng ADR-011/013 và AGENTS hiện hành: Project Done là gate, Trí review cuối mọi task. Không sửa GitHub, deadline hoặc tự tạo approval.
- Không có nhánh GM-10 local/remote. Tạo `codex/gm-10-context-and-preferences` từ `origin/main` ce7b87a sau fetch. GM-09/PR121 đang chờ Trí, không là dependency GM-10; không nhập code/commit GM-09 hoặc thay nhánh đó. File example.md không còn trong workspace lúc bắt đầu; working tree sạch.

## Phạm vi và contract

ContextScreen nhận repository Pick<ApiClient>, roomId/userId, callbacks và GPS-action chỉ trả public anchor/status; không lat/lng cá nhân. Host chọn coverage/anchor/radius/giờ/buổi/budget/avoidRecent, xác nhận, preview pool rồi mới lưu context; member xem bối cảnh nhưng không sửa. Empty/outside/unknown/stale chặn tiếp tục và yêu cầu sửa/refetch, không nới radius/giờ hoặc tự ready. Giờ UTC+7, ăn ngay serverTime+15 phút một lần, custom không cộng; kiểm boundary/invalid/past và timeHint late_night chỉ với dinner.

PreferencesScreen nhận snapshot riêng caller và catalogue options inject được; hero Gì cũng được mặc định, cuisine/category/temperature/flavor là ưu tiên mềm, không phiếu NO. GM-07 không có origin trong UserPreferences nên chỉ giải thích/hiển thị origin từ PoolDish tách venue; không bịa field origin khi submit. Bootstrap dùng IDs cuisine/category thực có trong mock GM-07, không tự thêm taxonomy chưa bàn giao. History consent mặc định false nếu chưa lưu; đổi consent/preferences reset own ready; avoidRecent là bối cảnh chung do host sửa, giảm ưu tiên mềm và không thay luật phiếu.

Giữ nguyên DTO, shared components/tokens, package/lockfile và backend. Unknown price hiện Chưa có giá, giá có đơn vị/source nơi bán; artwork không tải từ nguồn ngoài trong preview. Writes giữ requestId/payload khi timeout/network chưa biết kết quả, khóa pending/ACK, refetch sau ACK; stale yêu cầu reload. Reads bỏ phản hồi cũ/unmount. Không import fixtures/factory vào screens.

## File ownership và cách mở

- Thêm features/context/{screens,components,hooks,services}, features/preferences/screens; thin routes `/gm10/context`, `/gm10/preferences` và route layout/provider mock trong bootstrap.
- Thêm callback/nút mở context vào AppShellScreen và wiring index, giữ các đường foundation/components/GM12/GM16. Hai route dùng chung mock session trong route group; controls đổi fixture tường minh và reset mẫu.
- Bootstrap mock-only chọn success/loading/empty/discovery-empty/denied/outside/stale/network/unknown-price/ready/member/timeout. Dùng GM-07 mock API cho snapshot/update/ready; ready fixture chỉ dựng tình huống kiểm reset, không ready sản phẩm tự động. GM-24/25 thay location/repository/auth/navigation ở composition sau khi được giao.

## Patch/test plan và bàn giao

### Sửa sau phản hồi Expo Go trong bugs.md — 2026-10-15

Start gate đọc lại live `2026-10-15T14:41:08.573208+00:00`: READY_TO_CLAIM. Đối chiếu yêu cầu UI/context/history/catalogue và task GM-11/25: phân cấp khu vực → điểm công cộng → bán kính; đặt switch cùng hàng với nhãn, nhãn dài được xuống dòng; thống nhất tên control chống lặp giữa hai màn. Theo yêu cầu mới của người dùng, chọn sáng/trưa/tối gợi ý lần kế tiếp lúc 07:00/12:00/19:00 UTC+7 theo server clock; Ăn nhẹ giữ giờ, custom vẫn sửa được và không cộng buffer. Đây là gợi ý UI khi người dùng bấm buổi, không thay luật eligibility hoặc tự chuyển giờ khi lỗi/rỗng.

Sau lưu/bỏ qua khẩu vị và đọc snapshot thành công, hiện biên nhận hoàn tất ở đầu màn thay form đã khóa; có chỉnh lại/quay lại và callback phòng chờ nếu caller cung cấp. Route mẫu GM-10 chưa có LobbyScreen GM-11/GM-25, phải nói rõ điểm kết thúc, không tạo lobby giả. Thêm assertion giờ trước/đúng/sau mốc, qua tháng/năm, giữ giờ Ăn nhẹ/custom, nhiều category, avoidRecent→preferences, save/skip receipt/retry read và route. Chạy lại mobile check/bundle và các kiểm repo bắt buộc; ghi kết quả thực, native sau sửa vẫn chờ người dùng kiểm.

Kiểm unit thời gian UTC+7/boundary/budget/unknown price, component context/preferences validation/soft-vs-vote/consent/reset-ready/member guard, pending/unknown/ACK/stale và route từ shell → context → preferences → Back. Chạy npm run check, check:expo, Android export, repo validator, full Python regression, check-docs/diff; không thêm dependency. CHECKS/HANDOFF ghi source version, lệnh mở, fixtures, callbacks và giới hạn.

Expo Go Android/light-dark/font200/TalkBack/keyboard/Back cần phép kiểm thực tế mới của GM-10, không kế thừa xác nhận GM-09. Theo chỉ dẫn hiện tại của người dùng, ghi biên bản bằng văn bản, không bắt ảnh/video UI. Không commit/push/merge, không đổi Project hoặc Done/Approved.
