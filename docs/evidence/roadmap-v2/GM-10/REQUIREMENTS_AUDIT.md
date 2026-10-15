# GM-10 — rà soát yêu cầu và bàn giao downstream

**Cập nhật sau audit:** người dùng đã giao sửa phần GM-10. [SCOPE_FIX](SCOPE_FIX.md) ghi phân loại và sửa A1..A5; A6 thuộc shared GM-05/Trí, A7/A8 thuộc điểm nối GM-24/25. Nội dung/7 diagnostics Fail bên dưới là kết quả **trước sửa**, dùng [manifest trước sửa](AUDIT_PATCH_MANIFEST.json); kết quả source mới theo SCOPE_FIX/CHECKS, không kế thừa nguyên kết luận lỗi của revision cũ.

Ngày 2026-10-15. Branch `codex/gm-10-context-and-preferences`, HEAD/base `30ecb5675104f13c64580018cad118647fb3d601` + working tree chưa commit. Contract GM-10.1. **Kết luận: chưa thỏa mãn toàn bộ yêu cầu; chưa đủ điều kiện nghiệm thu.** Lượt này chỉ thay tài liệu kiểm tra; source sản phẩm giữ nguyên để tái lập. Không commit/push/merge hoặc đổi Project/Done/approval.

## Nguồn đã đối chiếu

- Đọc lại toàn bộ [issue GM-10/#71](https://github.com/ThanhTris/IE307/issues/71), task local, input/output/AC/test plan/gate. Đọc issue body và mọi comment của các issue có nhắc GM-10 hoặc hai screen: #70, #71, #75, #79, #80, #85, #86, #107. Ba downstream trực tiếp là GM-24/#85, GM-25/#86, GM-39/#107; cả ba và #71 chưa có comment bổ sung tại lượt đọc. #75 có comment Trí về scope mock/đúng contract/Expo; đây không phải yêu cầu inbox áp vào GM-10. #79/#80 chỉ nhắc quan hệ song song, không phải đầu vào GM-10 mới.
- [UI_SPEC](../../../specs/UI_SPEC.md), toàn bộ [UI_DESIGN_SPECIFICATION](../../../specs/UI_DESIGN_SPECIFICATION.md), [CATALOG_PREFERENCES_SPEC](../../../specs/CATALOG_PREFERENCES_SPEC.md), [CONTEXT_HISTORY_SPEC](../../../specs/CONTEXT_HISTORY_SPEC.md), [ROOM_SPEC](../../../specs/ROOM_SPEC.md), [FOOD_DATA_SPEC](../../../specs/FOOD_DATA_SPEC.md), API contract/supplement GM-18, NFR/FR/PRD/tổng quan và traceability liên quan.
- AGENTS, workflow/DoD, UI_IMPLEMENTATION_PLAN, TASK_OUTPUT_REQUIREMENTS/CHECKLIST, TASK_HANDOFFS, IMPLEMENTATION_ROADMAP, task-id-map/project-gate, TASK_RENUMBERING. Dùng roadmap-v2; previous_ids và evidence roadmap-v1 chỉ lịch sử. Các câu reviewer độc lập/local Approved/lịch 4 tuần trong issue cũ không ghi đè ADR-011/013 và Project hiện hành.
- [COMPONENT_MAP](../../../design/COMPONENT_MAP.md), tokens/components/HANDOFF GM-05, contracts/mock/HANDOFF GM-07, HANDOFF GM-09/18/19, toàn bộ PLAN/CHECKS/HANDOFF/BUG_REVIEW và manifests GM-10. UI_REFINEMENT_BRIEF/GM-39 chỉ yêu cầu đọc app để chỉnh HTML, không tự duyệt palette mới hoặc sửa app từ bản thiết kế chưa bàn giao. Design system v0.1 không thay bộ tokens GM-05 đang nhận.
- Chỉ dẫn hiện tại của người dùng: giờ chip 07:00/12:00/19:00 và Ăn nhẹ giữ giờ; bằng chứng UI được ghi bằng văn bản, không bắt ảnh/video. Không suy từ đó rằng được miễn kiểm thực tế.

Gate live `2026-10-15T15:01:42.562186+00:00`: [READY_TO_CLAIM](AUDIT_GATE.txt). GM-05/07 đủ gate đầu vào; đây không phải approval GM-10 hoặc xác nhận mọi AC đạt. Không chạy merge gate/fetch/merge trong lượt audit này.

## Phát hiện cần xử lý

### A1 — không có đường chỉnh lại bối cảnh sau khi đã lưu

[ContextScreen.tsx](../../../../mobile/src/features/context/screens/ContextScreen.tsx#L51) khóa mọi field bằng writer.locked; ACK làm intent accepted và không có nút chỉnh lại/refetch để tạo intent mới. Lưu bối cảnh → sang Khẩu vị → quay lại vẫn giữ ContextForm cũ đã khóa. Không thể đổi điểm/buổi/giờ/avoidRecent ở phòng mẫu đó mà không rời route group/đổi fixture. Spec room/context yêu cầu host có thể sửa bối cảnh trước start và reset ready; reset fixture không thay phép kiểm sửa cùng phòng.

Repro: save context rồi kiểm field giờ hoặc nút chỉnh lại. Actual field editable=false, không có action chỉnh lại. **Cần sửa trong GM-10:** thêm hành động tường minh refetch snapshot/version mới rồi mở draft mới; giữ khóa của intent cũ để không double-write. Regression phải bao gồm quay lại từ preferences, sửa lần hai trên cùng room và reset ready.

### A2 — thao tác lưu làm mất đường tải lại sau stale preview

[ContextScreen.tsx](../../../../mobile/src/features/context/screens/ContextScreen.tsx#L90) thay lỗi VERSION_CONFLICT bằng thông báo validation khi chưa có pool. Nút [Tải lại bối cảnh](../../../../mobile/src/features/context/screens/ContextScreen.tsx#L163) phụ thuộc chuỗi lỗi trước đó nên biến mất.

Repro: fixture Dữ liệu cũ → xác nhận → xem món → thấy Tải lại bối cảnh → bấm Lưu bối cảnh mẫu. Actual nút tải lại mất. **Cần sửa trong GM-10:** lưu error code/read state riêng với validation text, hoặc khóa save khi cần reload; không để một nút validation xóa nguyên nhân/refetch action. Liên quan AC stale UI rõ và phục hồi được.

### A3 — biên nhận sai sau Bỏ qua → timeout → thử lại

[PreferencesScreen.tsx](../../../../mobile/src/features/preferences/screens/PreferencesScreen.tsx#L66) chỉ xóa draft khi lần gọi hiện tại có skip=true. Sau timeout, nút retry gọi save(false), dù intent được gửi lại vẫn là skip đã khóa. Snapshot trả đúng categoryIds rỗng nhưng nhãn biên nhận dùng biến [any từ draft cũ](../../../../mobile/src/features/preferences/screens/PreferencesScreen.tsx#L76), nên báo đã lưu sở thích mềm.

Repro: fixture Mất phản hồi sau lưu → chọn Cơm → Bỏ qua sở thích mềm → Thử lại cùng yêu cầu lưu khẩu vị. Actual API snapshot không có category, UI không hiện Gì cũng được. RequestId/payload/idempotency vẫn đúng; lỗi nằm ở biên nhận. **Cần sửa trong GM-10:** tính summary/any từ ownPreferences của snapshot đã đọc, hoặc đồng bộ draft từ snapshot; test skip retry riêng.

### A4 — thiếu khoảng cách trong preview UI-15

[ContextScreen.tsx](../../../../mobile/src/features/context/screens/ContextScreen.tsx#L151) không đọc/render PoolDish.distanceM dù mock đã có 650m. [UI_SPEC UI-15](../../../specs/UI_SPEC.md#L21) yêu cầu khoảng cách đường chim bay tới anchor; FOOD_DATA_SPEC phân biệt anchor với vị trí GPS/đường đi.

Actual preview có quán/địa chỉ nhưng không có khoảng cách. **Cần bổ sung UI trong GM-10:** hiển thị distanceM có đơn vị và ghi rõ đường chim bay từ điểm ăn chung; null/unknown không tự gán 0 hoặc tính từ GPS. Tính khoảng cách thật/độ đúng backend vẫn thuộc GM-18/24/25.

### A5 — nút nhãn Về trang chủ đang thực hiện Quay lại

[SetupFrame.tsx](../../../../mobile/src/features/context/components/SetupFrame.tsx#L14) truyền onBack cho onPressBrand. AppHeader cố định accessibilityLabel=Về trang chủ. Từ Khẩu vị bấm brand thực tế trở về `/gm10/context`, không phải `/`. Repro qua route modules thật xác nhận Expected `/`, Received `/gm10/context`.

[UI_DESIGN_SPECIFICATION phần Global App Bar](../../../specs/UI_DESIGN_SPECIFICATION.md#L57) yêu cầu brand về Home. **Cần sửa wiring GM-10:** tách callback Home và Back; vẫn chặn navigation khi pending/possible delivery và không gọi leave/cancel thật ngoài scope.

### A6 — contrast nút primary kế thừa từ GM-05 chưa đạt NFR-06

[Tokens](../../../../mobile/src/shared/theme/tokens.ts#L40) dùng chữ trắng trên primary. Tính luminance sRGB/contrast từ chính token đang render (chưa xét opacity disabled): light `#FFFFFF/#FF5A36` = **3.103:1**, dark `#FFFFFF/#FF6F4E` = **2.750:1**. NFR-06 yêu cầu text thường >=4.5:1; chữ nút bodyBold15sp không được xem là large text. Có Dark mode không đồng nghĩa đạt contrast.

[Kết quả và script tái lập](AUDIT_CONTRAST.txt). **Vấn đề chung upstream GM-05 / Trí cần chốt:** sửa semantic màu chữ/nền theo ownership rồi kiểm mọi consumer. Không tự đổi shared palette/package hoặc ghi override ngoại lệ để cho audit Pass. Kiểm TalkBack/font200/native vẫn riêng.

## Điểm cần làm rõ khi bàn giao GM-24/25

### A7 — success empty của GM-18 có reasonCodes, UI hiện bỏ qua

[GM18_DISCOVERY_API](../../../architecture/GM18_DISCOVERY_API.md) và `mobile/src/data/discovery/index.ts` bàn giao `{ok:true,data:{pool:[],reasonCodes:[OUT_OF_COVERAGE|AVAILABILITY_UNKNOWN|NO_ELIGIBLE_FOOD],...}}`. Đây không nhất thiết là `{ok:false,error}`. ContextScreen dùng kiểu GM-07 cơ bản, chỉ setPreview(data) rồi luôn hiển thị thông báo thiếu món theo buổi khi pool rỗng. Hai repro dùng response success hợp lệ cho outside/unknown đều không hiện lý do tương ứng; vẫn chặn lưu, không tự nới vùng/giờ.

Đây là **khoảng thiếu ở điểm nối GM-24/25**, không yêu cầu GM-10 chạy eligibility/API thật. Consumer cần adapter/view model giữ và dịch reasonCodes đã được GM-18 kiểm; thêm fixture success-empty để kiểm UI đúng lý do, không đổi DTO upstream tùy tiện. Không ghi handoff rằng chỉ thay một repository GM-07 cơ bản là tự xử lý đủ supplement GM-18.

### A8 — copy/mock banner chưa được inject cho production

[SetupFrame](../../../../mobile/src/features/context/components/SetupFrame.tsx#L19) luôn ghi Mô phỏng GM-10; hai screens hardcode Lưu...mẫu/Nơi bán mẫu và dùng request ID preview mặc định nếu caller không inject. Không có import/fallback mock trong screens, vì vậy **AC mock hiện tại vẫn đúng**. Tuy nhiên GM-25 muốn dùng lại màn với real repository thì vẫn cần điểm cấu hình copy/mode và ID factory; hiện chỉ thay adapter chưa loại được nhãn mô phỏng. Các props chưa có onHome riêng như A5.

Đây là giới hạn bàn giao, không phải yêu cầu bật production/API trong GM-10. Trước tích hợp cần chốt presentation mode/copy từ composition root, inject durable request IDs và navigation, giữ production không fallback fixture. Không coi typed props nhận repository là bằng chứng Android–API đã nghiệm thu.

## Ma trận AC GM-10

| Yêu cầu | Kết quả audit | Căn cứ |
| --- | --- | --- |
| Cuisine/origin khác nơi bán; temperature khác cay; soft không NO | Đạt trong các ca tự động hiện có | UI riêng, DTO UserPreferences không votes/origin; nhiều category/hero/consent đúng |
| Host xác nhận điểm/buổi/giờ; manual/denied/outside/empty/stale | Đạt happy path và error fixtures cơ bản, **chưa đủ** | A1/A2/A4/A5; success-empty supplement cần A7 |
| Unknown price Chưa có giá; empty sửa context/reset ready, không auto widen | Giá/empty/no-widen/reset khi save đầu đạt; **sửa tiếp cùng phòng chưa đủ** | Price null/0/group đúng; A1 chặn vòng chỉnh lại, không thể thay bằng reset fixture |
| avoidRecent/history consent qua interface, không GPS/history thật | Đạt scope mock ở ca đã kiểm | Host context, own preferences/consent, explicit readiness; A3 sai copy sau retry skip |
| HANDOFF/CHECKS/version/route tái lập | Có artifact và manifest, **bàn giao chưa hoàn tất** | Chưa commit/review, A1..A8 và native sau sửa còn thiếu; report này sửa kết luận quá rộng của lượt trước |

Giờ bấm sáng/trưa/tối 07:00/12:00/19:00 lần tới, Ăn nhẹ giữ giờ, custom không buffer và ăn ngay +15 phút đang đúng yêu cầu người dùng. Không cần thêm origin vào UserPreferences, allergy profile, GPS thật, history API thật, lobby giả, native modules hoặc package mới để hoàn thành scope mock.

## Ma trận consumers trực tiếp

| Consumer | Yêu cầu input từ GM-10 | Tình trạng |
| --- | --- | --- |
| [GM-24/#85](https://github.com/ThanhTris/IE307/issues/85), contract issue GM-24.2 | ContextScreen + version/commit/HANDOFF trước nghiệm thu/merge; dùng lại màn, location/discovery adapter, public anchor/manual/deny/server time | File/interface SuggestAnchor/repository có; chưa có commit reviewed; A1/A2/A4/A5/A7/A8 cần xử lý/đối chiếu khi nối. GPS/native/API là AC của GM-24, không phải bằng chứng đã đạt ở GM-10 |
| [GM-25/#86](https://github.com/ThanhTris/IE307/issues/86), contract issue GM-25.2 | ContextScreen trước start; dùng lại preferences theo luồng, giữ layout; repository/auth/version/consent/history/avoidRecent, nhiều máy, navigation tới lobby | Hai screens và callbacks đã có local; vẫn chưa là input được nghiệm thu/merge. A1/A3/A5/A7/A8 ảnh hưởng reuse; GM-09/GM-10 providers độc lập và thiếu lobby wiring là giới hạn đúng stage, không tạo dependency ngược |
| [GM-39/#107](https://github.com/ThanhTris/IE307/issues/107), GM-39.2 | Cả ContextScreen/PreferencesScreen + revision/HANDOFF để đọc, so HTML/spec; không sửa mobile trong GM-39 | File và entry có để đọc ở local revision này; cần commit/version/review để bàn giao chính thức. Phát hiện UI A1..A6 là input audit, không là quyền GM-39 tự sửa app hoặc thay review Trí |

Issue versions GM-24.2/GM-25.2 ghi theo body live; metadata local có thể còn .1. Không tự chỉnh task khác hay đổi contract GM-10 theo mã phiên bản consumer. GM-11 không có input dependency trực tiếp GM-10 trong task map; lobby tích hợp qua GM-25. GM-18/19 và GM-14 là quan hệ song song/thành phần luồng, không phải lý do bắt GM-10 triển khai API của chúng.

## Phép kiểm thực tế trong lượt audit

- Tại thời điểm audit trước sửa, SHA256 **16/16 source/test files khớp manifest**, source sản phẩm không đổi trong lượt audit. Hashes đó được giữ tại [AUDIT_PATCH_MANIFEST](AUDIT_PATCH_MANIFEST.json); manifest chính hiện đã được cập nhật sau sửa A1..A5. Các kết quả 522 mobile/550 Python/bundle trước audit chỉ chứng minh ca đã có trên bytes lúc đó, không bao phủ phát hiện mới.
- Chạy lại 3 suite hiện có liên quan GM-10/routes: **72/72 Pass**, 14.841s; [log](AUDIT_EXISTING_TESTS.txt).
- Chạy 7 diagnostic assertions mới: **7/7 Fail đúng các hành vi thiếu** ở A1..A5 và hai response A7; [log](AUDIT_REPRO.txt), [source tái lập](AUDIT_REPRO.test.tsx.txt). Lượt đầu có cold-render timeout ở A1 nên đã chạy lại; kết quả cuối không dùng timeout làm bằng chứng lỗi, A1 fail vì field editable=false. Không thêm tests cố ý fail vào default suite hoặc bỏ assertions của suite hiện có để che lỗi.
- Static contrast: **2/2 Fail** ngưỡng4.5, A6. A8 kiểm source, không phải native measurement. [Script](AUDIT_CONTRAST.mjs.txt).
- Native Expo Go sau sửa: **Not run**; người dùng mới báo bugs.md, chưa xác nhận lại dark/light/font200/TalkBack/keyboard/Back/vùng bấm. Không thay bằng Jest/export và không bắt ảnh/video trái chỉ dẫn người dùng.

Tái lập diagnostics tại root (PowerShell, đã có node_modules theo lockfile):

```powershell
New-Item -ItemType Directory -Force mobile/.work | Out-Null
Copy-Item docs/evidence/roadmap-v2/GM-10/AUDIT_REPRO.test.tsx.txt mobile/.work/gm10Audit.test.tsx
Push-Location mobile
npm.cmd test -- --runTestsByPath .work/gm10Audit.test.tsx --testMatch '**/.work/gm10Audit.test.tsx'
Pop-Location
Get-Content docs/evidence/roadmap-v2/GM-10/AUDIT_CONTRAST.mjs.txt -Raw | node --input-type=module
```

Diagnostic exit1 hiện là kết quả audit thất bại đã ghi, không phải acceptance Pass. Trí quyết định review/merge/Done sau xử lý lỗi và kiểm scope thật.
